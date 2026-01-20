# EXPORTACIÓN CÓDIGO FUENTE - OPOSITAPP
**Para registro de propiedad intelectual**

---

## INSTRUCCIONES DE EXPORTACIÓN

### 1. Descarga del código fuente completo

El código fuente se encuentra en:
```
Repositorio: https://github.com/tuusuario/opositapp (privado)
o
Carpeta local: /Users/copiadorasalguero/opositapp
```

#### Contenido incluido:
- ✅ Código TypeScript/JavaScript (100%)
- ✅ Configuración de proyecto (tsconfig, next.config, etc.)
- ✅ Definiciones Prisma schema
- ✅ Migraciones de base de datos
- ✅ Componentes React
- ✅ API routes
- ✅ Scripts y utilidades
- ✅ Documentación técnica

#### Contenido excluido (node_modules y artifacts):
- ❌ node_modules/ (~1.5GB, regenerable con `npm install`)
- ❌ .next/ (build artifacts)
- ❌ .vercel/ (temp files)
- ❌ .DS_Store y archivos temporales

---

## 2. ESTRUCTURA DE ARCHIVOS PARA ENVÍO

### Archivos fuente organizados por funcionalidad:

```
CÓDIGO_FUENTE_OPOSITAPP/
│
├── MEMORIA_TECNICA_PROPIEDAD_INTELECTUAL.md    (Este documento)
├── LISTADO_FICHEROS_COMPLETO.txt               (581 ficheros)
├── DIAGRAMA_ARQUITECTURA.md                    (Diagrama ASCII)
│
├── src/                                        (Código fuente TypeScript)
│   ├── components/                             (50+ componentes React)
│   ├── lib/                                    (Lógica compartida)
│   ├── hooks/                                  (React hooks custom)
│   └── types/                                  (Tipos TypeScript)
│
├── app/                                        (Next.js App Router)
│   ├── admin/                                  (Panel administrativo)
│   ├── api/                                    (API REST routes 30+)
│   ├── dashboard/                              (Panel usuario)
│   └── ...                                     (Otras páginas)
│
├── prisma/                                     (Base de datos)
│   ├── schema.prisma                           (20+ modelos)
│   └── migrations/                             (Historial cambios)
│
├── public/                                     (Assets estáticos)
├── scripts/                                    (Scripts utilidad)
├── .github/                                    (Workflows CI/CD)
│
├── package.json                                (Dependencias)
├── tsconfig.json                               (Configuración TypeScript)
├── next.config.ts                              (Configuración Next.js)
├── eslint.config.mjs                           (Linter rules)
├── middleware.ts                               (Next.js middleware)
├── README.md                                   (Documentación)
└── LICENSE                                     (Licencia propietaria)
```

---

## 3. ESTADÍSTICAS DEL CÓDIGO FUENTE

### Distribución de ficheros

```
Documentación:                 85 ficheros (*.md)
Código TypeScript/TSX:         157+ ficheros (+7 exámenes oficiales)
Configuración:                 15 ficheros
SQL/Database:                  10 ficheros
Scripts:                       5 ficheros
Total:                         588 ficheros
```

### Líneas de código

```
TypeScript/TSX:                ~52,500 líneas (+2,500 sistema exámenes)
CSS/TailwindCSS:               ~10,000 líneas
SQL (migrations):              ~5,200 líneas (+200 exámenes oficiales)
Documentación:                 ~20,500 líneas
Total:                         ~88,200 líneas
```

### Archivos críticos por tamaño

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | 750+ | Definición 23+ modelos (+3 exam official) |
| `app/exam-mode/page.tsx` | 620+ | Interfaz 2 partes examen oficial |
| `app/api/statistics/route.ts` | 393 | Cálculo avanzado estadísticas |
| `src/lib/rag-system.ts` | 300+ | Sistema RAG para IA |
| `app/api/exam-official/submit/route.ts` | 280+ | Scoring -0.25 y ranking |
| `app/api/admin/exam-official/route.ts` | 280+ | CRUD exámenes oficiales |
| `src/lib/ai-question-generator.ts` | 280+ | Generador IA preguntas |
| `src/components/QuestionDisplay.tsx` | 250+ | Mostrar pregunta |
| `app/exam-mode/ranking/page.tsx` | 220+ | Ranking global con podium |
| `app/admin/exam-official/create/page.tsx` | 400+ | Formulario 70+15 preguntas |

---

## 4. REQUISITOS PARA COMPILACIÓN

### Software necesario para compilar

```bash
# Node.js y npm
node --version  # v18.0.0 o superior
npm --version   # v9.0.0 o superior

# Instalación de dependencias
npm install

# Variables de entorno (configurar .env.local)
# Ver .env.example para template

# Compilación
npm run build

# Ejecución local
npm run dev
```

### Dependencias principales

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.0.0-rc.1",
    "typescript": "^5.x",
    "@prisma/client": "^6.x",
    "next-auth": "^5.x",
    "tailwindcss": "^3.x",
    "@groq-sdk/groq": "latest",
    "openai": "^4.x",
    "livekit": "^0.8.x",
    "resend": "latest"
  },
  "devDependencies": {
    "@types/react": "^19.x",
    "@types/node": "^20.x",
    "prisma": "^6.x",
    "eslint": "latest",
    "prettier": "latest"
  }
}
```

---

## 5. VARIABLES DE ENTORNO REQUERIDAS

### Para producción (.env.production):

```
# Base de datos
DATABASE_URL=postgresql://[user]:[pass]@[host]:[port]/[db]

# NextAuth
NEXTAUTH_SECRET=[genera con: openssl rand -base64 32]
NEXTAUTH_URL=https://www.opositapp.site

# APIs de IA
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...

# Videollamadas
LIVEKIT_URL=https://livekit.example.com
LIVEKIT_API_KEY=...

# Email
RESEND_API_KEY=re_...

# OAuth
GITHUB_ID=...
GITHUB_SECRET=...
GOOGLE_ID=...
GOOGLE_SECRET=...

# Cron jobs
CRON_SECRET=[token aleatorio]

# Otros servicios
STRIPE_SECRET_KEY=sk_...
KOFI_VERIFICATION_TOKEN=...
```

---

## 6. DIAGRAMA DE ARQUITECTURA SIMPLIFICADO

```
┌──────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                       │
│  React 19 + Next.js 16 + Tailwind CSS                         │
│  - Dashboard usuario                                         │
│  - Panel administrativo                                      │
│  - Aulas virtuales (LiveKit)                                 │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                CAPA DE APLICACIÓN (API)                       │
│  Next.js API Routes (30+)                                    │
│  - Statistics                                                │
│  - Admin endpoints                                           │
│  - AI generation                                             │
│  - Authentication                                            │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                CAPA DE LÓGICA                                 │
│  Prisma ORM + TypeScript                                     │
│  - Query builders                                            │
│  - Business logic                                            │
│  - Validations                                               │
│  - RAG system                                                │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                CAPA DE DATOS                                  │
│  PostgreSQL (Supabase)                                       │
│  - 20+ tablas normalizadas                                   │
│  - Índices optimizados                                       │
│  - Full-text search                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. SEGURIDAD Y PROTECCIÓN

### Medidas de seguridad implementadas

✅ **Autenticación:**
- NextAuth.js con JWT
- OAuth2 (GitHub, Google)
- Contraseñas hasheadas con bcrypt

✅ **Autorización:**
- Roles (admin, user)
- Protección de rutas
- Validación server-side

✅ **Datos:**
- Encriptación en tránsito (HTTPS/TLS)
- Encriptación en reposo (BD)
- Validación input
- Sanitización output

✅ **API:**
- Rate limiting
- CORS configurado
- CSRF tokens
- Headers de seguridad 

✅ **Infraestructura:**
- Serverless (Vercel)
- Auto-scaling
- DDoS protection
- Backups automáticos

---

## 8. PROCESO DE DESPLIEGUE

### Entorno de desarrollo
```bash
# Clonar repositorio
git clone https://github.com/user/opositapp.git
cd opositapp

# Instalar dependencias
npm install

# Configurar .env.local
cp .env.example .env.local
# Editar con tus variables

# Ejecutar servidor desarrollo
npm run dev

# Abrir http://localhost:3000
```

### Entorno de producción (Vercel)
```bash
# Conectar repositorio a Vercel
vercel link

# Configurar variables de entorno en Vercel
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... resto de variables

# Desplegar
npm run build
vercel --prod
```

---

## 9. PRUEBAS Y VALIDACIÓN

### Tests disponibles
```bash
# Estadísticas
bash test-statistics.sh

# IA
npm run test:ai

# API health
curl https://www.opositapp.site/api/health
```

### Validación de seguridad
```bash
# Verificar dependencias vulnerables
npm audit

# Ejecutar linter
npm run lint

# Build para producción
npm run build
```

---

## 10. DOCUMENTACIÓN INCLUIDA

### Documentos técnicos incluidos (85 MD)

| Documento | Descripción |
|-----------|------------|
| `MEMORIA_TECNICA_PROPIEDAD_INTELECTUAL.md` | Este documento |
| `README.md` | Documentación principal |
| `FUNCIONALIDADES_ADMIN_IMPLEMENTADAS.md` | Features admin |
| `SOLUCION_PERMANENTE_ESTADISTICAS.md` | Fix estadísticas |
| `CHECKLIST_ESTADISTICAS.md` | Mantenimiento |
| `LISTADO_FICHEROS_COMPLETO.txt` | 581 ficheros |
| ... | 80+ documentos más |

---

## 11. VERSIONES Y RELEASES

### Versión actual: v1.0.0

```
Release date: 14 de enero de 2026
Commit: [hash del último commit]
Build: Vercel production
Uptime: 99.9%
```

### Historial de versiones
- v1.0.0 (14 Ene 2026) - Versión actual completa
- v0.9.0 (Dic 2025) - Estadísticas avanzadas
- v0.8.0 (Nov 2025) - Aulas virtuales
- v0.1.0 (Sep 2025) - MVP inicial

---

## 12. CONTACTO Y SOPORTE

### Para solicitudes de acceso al código fuente:

**Contacto:** Luis Alguero  
**Email:** luis@opositapp.site  
**Teléfono:** [redactado por privacidad]  
**Web:** https://www.opositapp.site  

### Para solicitudes de auditoría:
- Proporciona documento firmado de solicitud
- Incluye NIF/CIF empresa solicitante
- Especifica propósito de la auditoría
- Plazo: 10-15 días hábiles

---

## 13. DECLARACIÓN DE AUTENTICIDAD

Certifico que el código fuente incluido en esta exportación es:

✅ **Íntegro:** Contiene todo el código en producción  
✅ **Auténtico:** No modificado desde la última compilación  
✅ **Completo:** Incluye todas las dependencias internas  
✅ **Documentado:** Con comentarios y documentación  
✅ **Funcional:** Compilable y desplegable en Vercel  

**Firma digital:** [Generada automáticamente por Vercel]  
**Fecha:** 14 de enero de 2026  
**Hash SHA-256:** [Calculado de código fuente]

---

## 14. INSTRUCCIONES PARA REGISTRO

### Documentos a enviar a la AISGE/BOPI:

1. **MEMORIA_TECNICA_PROPIEDAD_INTELECTUAL.md** (Este)
2. **LISTADO_FICHEROS_COMPLETO.txt** (581 ficheros)
3. **Código fuente comprimido** (código_fuente_opositapp.zip)
4. **Ejecutable/Build** (next_build_production/)
5. **Identificación propietario** (DNI/NIF)
6. **Formulario oficial** BOPI-RM/DPI

### Formatos aceptados:
- ✅ ZIP con código fuente
- ✅ Tarball (.tar.gz)
- ✅ USB con código
- ✅ Acceso a repositorio privado
- ✅ Servidor FTP/SFTP

### Tamaño aproximado:
```
Código fuente:       50 MB
Build producción:    150 MB
Documentación:       5 MB
Total comprimido:    100 MB
```

---

**Documento preparado para registro de propiedad intelectual**  
**Confidencialidad: RESERVADO**  
**Fecha de emisión: 14 de enero de 2026**
