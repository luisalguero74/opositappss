# Despliegue demo en NAS Asustor

## Requisitos
- Docker-CE (ya instalado en el NAS) y docker compose
- Cuenta/registro de contenedores accesible desde el NAS (Docker Hub o privado)

## 1. Construir y publicar imagen multi-arquitectura
En tu máquina de desarrollo:

```bash
./scripts/build-demo-image.sh <registro>/<nombre>:demo
```

- El script crea buildx si falta, compila para amd64 y arm64 y hace push.
- Si la build fallara por credenciales, haz login previo: `docker login <registro>`.

## 2. Preparar entorno en el NAS
- Crea una carpeta (ej. `/volume1/opositapp-demo`) y coloca dentro:
  - `docker-compose.demo.yml`
  - `.env` (copia de `.env.demo.example`, con valores rellenados)

Configura en `.env` al menos:
- `DATABASE_URL=postgresql://opositapp:<tu_pass>@db:5432/opositapp_demo?schema=public`
- `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` con la URL del NAS (ej. `http://<IP-NAS>:3000`)
- Secretos: `NEXTAUTH_SECRET`, claves de Stripe si aplican, y API keys de IA/email que uses.

Opcional en `.env`:
- `APP_IMAGE=<registro>/<nombre>:demo` para fijar la imagen a usar en compose.
- `APP_PORT=3000` si quieres exponer otro puerto.

## 3. Levantar los servicios
En la carpeta del NAS donde pusiste los archivos:

```bash
docker compose -f docker-compose.demo.yml up -d
```

Esto levanta `web` y `db`, con el volumen `dbdata` para persistir PostgreSQL.

## 4. Aplicar migraciones
Una vez los contenedores estén arriba:

```bash
docker compose -f docker-compose.demo.yml exec web npx prisma migrate deploy
```

## 5. Probar acceso
Abre `http://<IP-NAS>:APP_PORT` en tu navegador (por defecto 3000). Si no responde:

```bash
docker compose -f docker-compose.demo.yml logs web
```

## 6. Actualizar la demo
Cuando publiques una nueva imagen `:demo`:

```bash
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d
```

## 7. Parar o limpiar
- Parar: `docker compose -f docker-compose.demo.yml down`
- Parar y borrar datos: `docker compose -f docker-compose.demo.yml down -v` (elimina la BD demo)

## Notas
- No se instala Node en el NAS; todo corre en contenedores.
- La base demo es independiente de tu entorno principal.
- El servicio `db` se llama `db`; si cambias el nombre en compose, ajusta `DATABASE_URL`.
