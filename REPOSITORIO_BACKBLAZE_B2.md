# Repositorio de Documentos + Backblaze B2 (Diseño Resumido)

Este documento describe cómo se integra el repositorio de documentos de OPOSITAPP con Backblaze B2, sin cambiar el comportamiento visible actual.

## 1. Modelos en BD

Prisma define estos modelos en `prisma/schema.prisma`:

- `RepoFolder`: carpetas lógicas (secciones) del repositorio.
- `RepoDocument`:
  - `title`: título visible.
  - `fileName`: nombre del fichero original.
  - `storagePath`: **clave en Backblaze B2** (key S3) que usaremos para localizar el PDF.
  - `storageBucket`: reservado para nombre de bucket (por ahora se usa el bucket B2 principal).
  - `allowDownload`: controla si la UI permite descarga.
- `RepoDocumentAccessLog`: registro de accesos (`view`, `preview`, `download`) con usuario, IP y user-agent.

## 2. Variables de entorno Backblaze B2

En Vercel (entorno Production) deben existir:

- `B2_BUCKET_NAME`: nombre real del bucket B2.
- `B2_KEY_ID`: keyID de la Application Key limitada al bucket.
- `B2_APPLICATION_KEY`: applicationKey secreta correspondiente.
- `B2_S3_ENDPOINT`: endpoint S3 de la región B2, por ejemplo `https://s3.eu-central-003.backblazeb2.com`.

## 3. Helper interno B2

En `src/lib/b2.ts`:

- `getB2Client()`: crea un `S3Client` apuntando a Backblaze B2 usando las variables `B2_*`.
- `listB2BucketObjects(prefix?)`: lista objetos del bucket (para diagnósticos internos).
- `getB2DownloadUrl({ key, expiresInSeconds })`: genera una **URL firmada temporal** para descargar un objeto B2 usando la key (storagePath).

## 4. Ruta de descarga protegida

En `app/api/repository/download/[id]/route.ts`:

- Requiere usuario autenticado (usa `getServerSession(authOptions)`).
- Busca `RepoDocument` por `id`.
- Verifica:
  - `isActive === true`.
  - `allowDownload === true`.
  - que `storagePath` no esté vacío.
- Llama a `getB2DownloadUrl({ key: document.storagePath })`.
- Registra el acceso en `RepoDocumentAccessLog` con acción `download`.
- Responde con un `redirect` HTTP a la URL firmada de Backblaze B2.

## 5. Convención de `storagePath` (propuesta)

`storagePath` se guarda tal cual en BD y se usa directamente como **key** en B2. Propuesta de estructura:

- `temario/general/tema-01-constitucion.pdf`
- `temario/general/tema-02-organizacion-estado.pdf`
- `temario/especifico/tema-01-seguridad-social.pdf`
- `legislacion/baremo/rd-16-2025.pdf`

Regla general:

- Prefijos lógicos: `temario/general/`, `temario/especifico/`, `legislacion/`, `otros/`.
- Slugs en minúsculas, sin espacios (usar `-`).
- El nombre de fichero (`fileName`) puede coincidir con la última parte del `storagePath`.

Ejemplo:

- `fileName = "tema-01-constitucion.pdf"`
- `storagePath = "temario/general/tema-01-constitucion.pdf"`

## 6. Qué falta por activar

- Aplicar el esquema de Prisma (RepoFolder, RepoDocument, RepoDocumentAccessLog) en una BD segura (staging primero).
- Poblar algunos `RepoFolder` y `RepoDocument` de prueba, subiendo los PDFs a Backblaze B2 con las keys acordadas.
- Cambiar en el futuro los botones de descarga de `/repositorio` para que apunten a `/api/repository/download/[id]` cuando el repositorio use datos reales.

Mientras estos pasos no se completen, la UI sigue usando datos estáticos y las rutas nuevas permanecen sin uso en producción.
