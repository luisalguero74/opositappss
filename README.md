# opositAPPSS

Plataforma profesional de preparación para oposiciones de Administrativo del Estado SS C1.

## ✨ Características Principales

### 📚 Sistema de Aprendizaje
- ✅ Cuestionarios de teoría y supuestos prácticos
- ✅ Simulacros de examen completos (70+15 preguntas, 120 minutos)
- ✅ Sistema de puntuación con explicaciones
- ✅ Animaciones de victoria y confetti

### 🎓 Aulas Virtuales (NUEVO)
- ✅ Clases en vivo con Jitsi Meet
- ✅ Gestión de participantes y roles
- ✅ Programación de sesiones
- ✅ Invitaciones automáticas por email
- ✅ Controles para moderadores y estudiantes
- 📖 Ver [documentación completa](AULAS_VIRTUALES.md)

### � Sistema de Ayuda Interactivo (NUEVO)
- ✅ Botón flotante siempre visible
- ✅ Búsqueda inteligente de dudas
- ✅ Tutoriales paso a paso visuales
- ✅ Categorización de temas
- ✅ Consejos y tips útiles
- 📖 Ver [documentación completa](SISTEMA_AYUDA.md)

### �👥 Gestión de Usuarios
- ✅ Autenticación con NextAuth
- ✅ Verificación de email
- ✅ Roles (Admin/Usuario)
- ✅ Panel de administración completo

### 💰 Sistema de Monetización
- ✅ Integración con Stripe
- ✅ Planes de suscripción
- ✅ Webhooks de pago

### 📊 Estadísticas y Análisis
- ✅ Progreso por usuario
- ✅ Análisis de errores
- ✅ Patrones de aprendizaje
- ✅ **Recomendaciones de Estudio con Fundamento Legal Mejorado (NUEVO)**
  - Búsqueda inteligente de referencias legales
  - Sistema multi-nivel de localización de artículos
  - 85-90% de precisión en fundamentos legales
  - 📖 Ver [documentación completa](RESUMEN_MEJORA_FUNDAMENTO_LEGAL.md)

### 🤖 Generación Automática de Preguntas (NUEVO)
- ✅ Generación automática de preguntas mediante cron
- ✅ Generación diaria de preguntas de temario general
- ✅ Generación semanal de preguntas de temario específico
- ✅ Generación mensual completa
- ✅ Logging completo y monitoreo en tiempo real
- ✅ Customizable (horarios, cantidad, temas)
- ✅ **Protección contra duplicados (manual y automático)**
  - Detección de duplicados exactos
  - Detección de preguntas similares (70%+ de palabras)
  - Filtrado automático y logging
- 📖 Ver [guía rápida](INICIO_RAPIDO_CRON.md) o [documentación completa](AUTOMATIZACION_GENERACION_CRON.md)
- 📖 Ver [protección de duplicados](PROTECCION_CONTRA_DUPLICADOS.md)

## 🚀 Inicio Rápido

First, install dependencies:

```bash
npm install
```

Then, set up the database:

```bash
npm run setup-db
```

Seed the database:

```bash
npm run db:seed
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Email Configuration

The application sends verification emails to new users using the account `luisalguero74@gmail.com`. To configure:

1. Use the Gmail account `luisalguero74@gmail.com` for sending.
2. Enable 2-factor authentication on the account.
3. Generate an app password in Google settings.
4. Update the `.env` file with the sender and app password:

```
EMAIL_USER=luisalguero74@gmail.com
EMAIL_PASS=your-generated-app-password
```

## Admin Access

Login: alguero2@yahoo.com
Password: $aC468eUi)n7

## Technologies

- Next.js
- TypeScript
- Tailwind CSS
- ESLint
- Prisma
- PostgreSQL
- NextAuth.js
- Nodemailer
- LiveKit (Video calling & real-time communication)

## 📖 Documentación Adicional

### Características del Sistema
- 📚 [Aulas Virtuales](AULAS_VIRTUALES.md) - Sistema de clases en vivo con Jitsi Meet
- 🆘 [Sistema de Ayuda](SISTEMA_AYUDA.md) - Asistente interactivo con IA
- 📊 [Simulacros de Examen](EXAM_SIMULATION_README.md) - Tests completos cronometrados
- 🤖 [Sistema IA de Preguntas](SISTEMA_IA_PREGUNTAS.md) - Generación automática de preguntas
- 💰 [Configuración Stripe](STRIPE_SETUP.md) - Sistema de monetización
- 📋 [Temario Oficial](TEMARIO_OFICIAL.md) - Estructura de temas
- 🖥️ [Demo en NAS Asustor](DEPLOY_NAS_DEMO.md) - Despliegue aislado con Docker

### Mejoras Recientes
- ✨ **[Fundamento Legal Mejorado](RESUMEN_MEJORA_FUNDAMENTO_LEGAL.md)** - Sistema de búsqueda inteligente
  - [Documentación Técnica](FUNDAMENTO_LEGAL_MEJORADO.md)
  - [Guía de Usuario](GUIA_FUNDAMENTO_LEGAL.md)
  - [Ejemplos de Uso](EJEMPLOS_FUNDAMENTO_LEGAL.md)

## Forum & Video Calls

The application includes a forum system where users can:
- Create discussion threads about practical cases
- Post and reply to questions
- Join video call rooms for each thread
- Chat in real-time with text messages

### Admin Moderation Panel

Administrators have access to a moderation panel (`/admin/rooms`) where they can:
- View all active video rooms
- See participant lists with audio/video status
- Mute participants' microphones
- Disable participants' cameras
- Kick participants from rooms
- Close entire rooms

### LiveKit Setup (For Production)

For development, the default configuration uses local LiveKit server:
```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

For production, you'll need to:
1. Sign up for LiveKit Cloud (https://livekit.io) or self-host a LiveKit server
2. Update the `.env` file with your production credentials:
```
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

To run a local LiveKit server for development:
```bash
# Using Docker
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev
```
