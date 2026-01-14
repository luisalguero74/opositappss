# MEMORIA TÉCNICA - OPOSITAPP
**Software de preparación de oposiciones con asistencia de inteligencia artificial**

---

## 1. DESCRIPCIÓN BREVE DEL PROGRAMA

### Resumen ejecutivo
OpositAPP es una plataforma web completa de preparación para oposiciones públicas españolas que integra:
- **Banco de preguntas** dinámico (teoría y supuestos prácticos)
- **Generación automática de preguntas** mediante inteligencia artificial (Groq/OpenAI)
- **Exámenes oficiales** con sistema de puntuación negativa (-0.25) y ranking global
- **Aulas virtuales** con videoconferencia en tiempo real (LiveKit)
- **Seguimiento del progreso** con estadísticas detalladas
- **Sistema de monetización** (suscripción + anuncios + afiliados)
- **Simulacros de examen** completos
- **Repaso espaciado** (Spaced Repetition)
- **Panel administrativo avanzado** con analytics, auditoría y backups

### Objetivos del software
- Facilitar la preparación de oposiciones españolas (especialmente Administración del Estado)
- Automatizar la generación de contenido educativo mediante IA
- Proporcionar interacción en tiempo real con profesores
- Monetizar a través de múltiples canales
- Garantizar máxima privacidad y seguridad de datos

### Usuarios objetivo
- Opositores de oposiciones españolas (edad 18+)
- Profesores de preparación de oposiciones
- Administradores de instituciones educativas

---

## 2. ENTORNO OPERATIVO

### Requisitos de servidor
```
Framework: Next.js 16.1.1 (con Turbopack)
Runtime: Node.js 18+ (Vercel serverless)
Base de datos: PostgreSQL 13+
Cache: Redis (opcional, para sesiones)
Storage: S3-compatible (para backups)
```

### Hosting actual
- **Producción:** Vercel (serverless)
- **Base de datos:** Supabase PostgreSQL
- **Dominio:** www.opositapp.site
- **DNS:** Vercel managed
- **SSL:** Automatic (Vercel)

### Requisitos de cliente
- **Navegador:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Pantalla mínima:** 320px (responsive)
- **JavaScript:** Obligatorio
- **WebRTC:** Necesario para videollamadas (LiveKit)

### Dependencias críticas
```
Next.js 16.1.1          - Framework web
React 19.0              - Librería UI
Prisma 6.x              - ORM database
NextAuth 5.x            - Autenticación
TailwindCSS 3.x         - Estilos
Groq SDK                - IA para generación
OpenAI SDK              - IA alternativa
LiveKit SDK             - Videollamadas
Resend                  - Email transactional
PostgreSQL              - Base de datos
```

### Variables de entorno requeridas
```
DATABASE_URL            - PostgreSQL connection string
NEXTAUTH_SECRET         - Clave secreta sesiones
NEXTAUTH_URL            - URL de producción
GROQ_API_KEY            - Token Groq API
OPENAI_API_KEY          - Token OpenAI API
LIVEKIT_URL             - Servidor LiveKit
LIVEKIT_API_KEY         - Token LiveKit
RESEND_API_KEY          - Token servicio email
GITHUB_ID/SECRET        - OAuth (GitHub)
GOOGLE_ID/SECRET        - OAuth (Google)
CRON_SECRET             - Token para cron jobs
```

---

## 3. ARQUITECTURA DEL SISTEMA

### Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NAVEGADOR DEL USUARIO                              │
│                   (Chrome, Firefox, Safari, Edge)                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
           ┌────────▼─────────┐              ┌───────────▼────────┐
           │   VERCEL CDN     │              │  NEXT.JS RUNTIME   │
           │  (Static Assets) │              │   (Serverless)     │
           └────────┬─────────┘              └────────┬───────────┘
                    │                               │
                    │                ┌──────────────┴──────────────┐
                    │                │                             │
                    │       ┌────────▼──────────┐    ┌────────────▼────────┐
                    │       │   API Routes      │    │  Server Components  │
                    │       │   /api/*          │    │  & Page Rendering   │
                    │       │ - Statistics      │    └─────────────────────┘
                    │       │ - Auth            │
                    │       │ - Admin           │
                    │       │ - AI Generation   │
                    │       │ - LiveKit         │
                    │       └────────┬──────────┘
                    │               │
                    │               │ HTTPS/REST
                    │               │
    ┌───────────────┴───────────────┴──────────────────────────────┐
    │                                                              │
    │              POSTGRESQL DATABASE (SUPABASE)                 │
    │                                                              │
    │  ├─ Users                    ├─ Questions                   │
    │  ├─ Sessions                 ├─ Questionnaires            │
    │  ├─ UserAnswers              ├─ QuestionnaireAttempts     │
    │  ├─ ExamSimulations          ├─ VirtualClassrooms         │
    │  ├─ Subscriptions            ├─ LegalDocuments            │
    │  ├─ AuditLogs                ├─ AppSettings               │
    │  └─ SystemErrors             └─ ... (20+ tablas)          │
    │                                                              │
    └───────────────┬──────────────────────┬──────────────────────┘
                    │                      │
         ┌──────────▼────────┐   ┌────────▼──────────┐
         │  SERVICIOS EXTERNOS│   │   STORAGE        │
         │                   │   │                   │
         │ ├─ Groq API       │   │ ├─ S3/R2 Backups │
         │ ├─ OpenAI API     │   │ ├─ CDN Static    │
         │ ├─ LiveKit        │   │ └─ Vercel Logs   │
         │ ├─ Resend Email   │   │                   │
         │ ├─ OAuth Providers│   └───────────────────┘
         │ └─ Stripe/Ko-fi   │
         └───────────────────┘
```

### Flujos principales

#### 1. Flujo de autenticación
```
Usuario → Login Form → NextAuth → OAuth/Credentials → JWT Session → Rutas protegidas
```

#### 2. Flujo de estadísticas
```
Usuario responde → UserAnswer saved → GET /api/statistics → Cálculos agregados → Dashboard
```

#### 3. Flujo de generación IA
```
Admin sube PDF → OCR → Groq/OpenAI API → Genera preguntas → Almacena en DB → Publica
```

#### 4. Flujo de videollamada
```
Aula virtual → LiveKit SDK → WebRTC → P2P Stream → Participantes conectados
```

---

## 4. ESTRUCTURA DE FICHEROS

### Directorios principales

```
opositapp/
├── app/                              # Next.js App Router
│   ├── admin/                        # Panel administrativo
│   │   ├── page.tsx                 # Dashboard admin (5 cards/row)
│   │   ├── analytics/               # Analytics avanzado
│   │   ├── audit-logs/              # Registro de auditoría
│   │   ├── backups/                 # Gestión de backups
│   │   ├── quality-control/         # Control de calidad
│   │   ├── users/                   # Gestión de usuarios
│   │   ├── preview-forms/           # Vista previa formularios
│   │   ├── create-formulario/       # Crear formularios desde PDF
│   │   ├── statistics/              # Estadísticas básicas
│   │   ├── rooms/                   # Moderación aulas
│   │   ├── classrooms/              # Gestión aulas virtuales
│   │   ├── monetization/            # Config monetización
│   │   ├── exam-official/           # Gestión exámenes oficiales
│   │   │   ├── page.tsx            # Lista exámenes
│   │   │   └── create/page.tsx     # Formulario creación (70+15 preguntas)
│   │   └── test-email/              # Test de email
│   │
│   ├── api/                         # API REST routes
│   │   ├── auth/                    # NextAuth endpoints
│   │   ├── statistics/              # Cálculo de estadísticas
│   │   ├── submit-answers/          # Guardar respuestas
│   │   ├── exam-official/           # Sistema exámenes oficiales
│   │   │   ├── route.ts            # GET exam activo (sin respuestas)
│   │   │   ├── submit/route.ts     # POST submit con scoring -0.25
│   │   │   └── ranking/route.ts    # GET ranking global paginado
│   │   ├── admin/                   # APIs administrativas
│   │   │   ├── analytics/           # Analytics datos
│   │   │   ├── audit-logs/          # Audit logging
│   │   │   ├── backups/             # Backup/restore
│   │   │   ├── exam-official/       # CRUD exámenes oficiales
│   │   │   ├── quality-control/     # Validación de preguntas
│   │   │   └── users/               # Gestión usuarios
│   │   ├── health/                  # Health check
│   │   ├── ai/                      # IA endpoints
│   │   │   ├── generate-questions/  # Generación con IA
│   │   │   ├── batch-process/       # Procesamiento masivo
│   │   │   └── ...
│   │   ├── user/                    # APIs usuario
│   │   ├── livekit/                 # LiveKit integration
│   │   └── ...
│   │
│   ├── dashboard/                   # Panel usuario
│   │   ├── page.tsx
│   │   ├── theory/
│   │   ├── practical-cases/
│   │   ├── marked-questions/
│   │   └── temario/
│   │
│   ├── quiz/[id]/                   # Cuestionarios dinámicos
│   ├── exam-mode/                   # Exámenes oficiales (reescrito)
│   │   ├── page.tsx                # Interfaz 2 partes: 70 test + 15 supuesto
│   │   └── ranking/page.tsx        # Ranking global con podium
│   ├── statistics/                  # Estadísticas usuario
│   ├── forum/                       # Foro de discusión
│   ├── layout.tsx                   # Layout global
│   └── ...
│
├── src/
│   ├── components/                  # Componentes React reutilizables
│   │   ├── HelpModal.tsx            # Centro de ayuda usuario
│   │   ├── AdminHelpModal.tsx       # Centro de ayuda admin
│   │   ├── ExamCelebration.tsx      # Celebración 100%
│   │   ├── AdminHelpButton.tsx      # Botón flotante help
│   │   ├── VideoRoom.tsx            # Sala LiveKit
│   │   ├── QuestionDisplay.tsx      # Mostrar pregunta
│   │   ├── StatisticsChart.tsx      # Gráficos estadísticas
│   │   └── ... (50+ componentes)
│   │
│   ├── lib/
│   │   ├── auth.ts                  # Configuración NextAuth
│   │   ├── prisma.ts                # Cliente Prisma singleton
│   │   ├── utils.ts                 # Funciones utilidad
│   │   └── constants.ts             # Constantes globales
│   │
│   └── hooks/                       # React hooks custom
│       ├── useStatistics.ts
│       ├── useAuth.ts
│       └── ...
│
├── prisma/
│   ├── schema.prisma                # Definición modelos (20+ tablas)
│   ├── migrations/                  # Histórico de cambios BD
│   └── seed.ts                      # Script inicialización datos
│
├── public/
│   ├── images/                      # Assets estáticos
│   ├── fonts/                       # Fuentes custom
│   └── ...
│
├── scripts/
│   ├── get-db-url.mjs               # Extrae DB URL
│   ├── list-env-keys.mjs            # Lista variables env
│   └── ...
│
├── .github/
│   ├── copilot-instructions.md      # Instrucciones para Copilot
│   ├── workflows/                   # GitHub Actions
│   └── ...
│
├── .vscode/
│   └── tasks.json                   # Tareas VS Code
│
├── package.json                     # Dependencias npm
├── package-lock.json
├── tsconfig.json                    # Configuración TypeScript
├── next.config.ts                   # Configuración Next.js
├── eslint.config.mjs                # ESLint rules
├── middleware.ts                    # Next.js middleware
├── .env.example                     # Template variables
├── .env.local                       # Variables locales
├── .env.production                  # Variables producción
├── README.md                        # Documentación principal
├── LICENSE                          # Licencia software
└── ... (documentación adicional)
```

### Ficheros críticos por funcionalidad

#### Autenticación
- `src/lib/auth.ts` - Configuración NextAuth, OAuth
- `app/api/auth/[...nextauth]/route.ts` - Endpoints auth
- `middleware.ts` - Protección de rutas

#### Base de datos
- `prisma/schema.prisma` - 20+ modelos Prisma
- `src/lib/prisma.ts` - Cliente singleton
- `prisma/migrations/` - Histórico cambios

#### Estadísticas
- `app/api/statistics/route.ts` (393 líneas) - Cálculo avanzado
- `app/statistics/page.tsx` - Dashboard usuario
- `src/components/StatisticsChart.tsx` - Visualización

#### IA
- `app/api/ai/generate-questions/route.ts` - Generación preguntas
- `app/api/ai/batch-process/route.ts` - Procesamiento masivo
- `app/admin/create-formulario/page.tsx` - Upload PDF + OCR

#### Admin
- `app/admin/page.tsx` - Panel principal (12 tarjetas)
- `app/admin/analytics/page.tsx` - Dashboard avanzado
- `app/admin/audit-logs/page.tsx` - Registro auditoría
- `app/admin/backups/page.tsx` - Gestión backups
- `app/admin/quality-control/page.tsx` - Validación preguntas
- `app/api/admin/*/route.ts` - APIs administrativas

#### VideoConferencias
- `src/components/VideoRoom.tsx` - Interfaz sala
- `app/api/livekit/token/route.ts` - Generación tokens
- `app/room/[roomId]/page.tsx` - Sala dinámica

---

## 5. ESTADÍSTICAS DEL CÓDIGO

### Métricas
- **Archivos TypeScript/TSX:** ~150+
- **Líneas de código:** ~50,000+
- **Componentes React:** 50+
- **API routes:** 30+
- **Tablas Prisma:** 20+
- **Migración base de datos:** 25+

### Lenguajes
- **TypeScript:** 75%
- **JavaScript:** 15%
- **CSS/Tailwind:** 10%

### Funcionalidades principales
- ✅ Autenticación (NextAuth + OAuth)
- ✅ Banco de preguntas dinámico
- ✅ Generación IA (Groq + OpenAI)
- ✅ Exámenes oficiales con puntuación -0.25 y ranking global
- ✅ Estadísticas avanzadas
- ✅ Aulas virtuales (LiveKit)
- ✅ Simulacros de examen
- ✅ Monetización (suscripción + ads + afiliados)
- ✅ Panel administrativo completo
- ✅ Auditoría y logs
- ✅ Backups automáticos
- ✅ Control de calidad

---

## 6. SEGURIDAD Y PRIVACIDAD

### Medidas implementadas
- ✅ HTTPS/TLS en tránsito
- ✅ Contraseñas hasheadas (bcrypt)
- ✅ JWT seguro para sesiones
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Validación input servidor-side
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ CORS configurado
- ✅ Roles y permisos (admin/user)
- ✅ Encriptación datos sensibles
- ✅ GDPR compliance

### Certificaciones
- SSL/TLS: Let's Encrypt (Vercel automático)
- Auditoría de seguridad: Realizada
- Backups encriptados: Sí

---

## 7. RENDIMIENTO

### Optimizaciones
- ✅ Code splitting automático (Next.js)
- ✅ Image optimization (next/image)
- ✅ Caching estratégico
- ✅ Compression gzip/brotli
- ✅ Lazy loading componentes
- ✅ Database query optimization (Prisma)
- ✅ API response caching
- ✅ Serverless (sin servidor dedicado)

### Métrica típica
- **First Contentful Paint:** <1s
- **Largest Contentful Paint:** <2.5s
- **Cumulative Layout Shift:** <0.1
- **API response time:** <200ms promedio
- **Uptime:** 99.9% (Vercel SLA)

---

## 8. LICENCIA Y PROPIEDAD

### Licencia del software
- **Tipo:** Propietario (Confidencial)
- **Derechos:** Reservados todos los derechos
- **Uso:** Solo autorizado con licencia expresa

### Dependencias externas
- **Next.js, React, TypeScript:** MIT
- **Prisma:** Apache 2.0
- **TailwindCSS:** MIT
- **Groq SDK:** Apache 2.0
- **OpenAI SDK:** MIT
- **LiveKit SDK:** Apache 2.0
- Todas con conformidad: ✅

### Código fuente
- Repositorio privado
- Acceso restringido a desarrolladores
- Versionado con Git
- Backups diarios

---

## 9. HISTORIAL DE VERSIONES

### Versión actual: 1.0.0 (14 Enero 2026)

#### v0.9.0 (Diciembre 2025)
- Sistema de estadísticas
- Panel administrativo
- Generación IA básica

#### v0.8.0 (Noviembre 2025)
- Aulas virtuales
- Simulacros de examen
- Monetización

#### v0.1.0 (Septiembre 2025)
- MVP básico
- Autenticación
- Banco de preguntas inicial

---

## 10. CONTACTO Y SOPORTE

### Desarrollador/Propietario
- **Nombre:** Luis Alguero
- **Email:** luis@opositapp.site
- **Web:** https://www.opositapp.site

### Información técnica
- **Servidor:** Vercel (serverless)
- **Base de datos:** Supabase PostgreSQL
- **Dominio:** www.opositapp.site
- **Certificación:** SSL/TLS Vercel

---

**Documento generado:** 14 de enero de 2026  
**Para:** Registro de Propiedad Intelectual  
**Confidencialidad:** CONFIDENCIAL
