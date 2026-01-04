# Sistema de Aulas Virtuales - opositAPPSS

## 📋 Descripción

Sistema completo de aulas virtuales integrado con **Jitsi Meet** para ofrecer clases en línea con todas las herramientas necesarias.

## 🎯 Características

### Para Administradores
- ✅ Crear y gestionar aulas virtuales
- ✅ Añadir/eliminar participantes
- ✅ Asignar roles (Moderador/Estudiante)
- ✅ Programar sesiones de clase
- ✅ Enviar invitaciones automáticas por email
- ✅ Configurar contraseñas de acceso
- ✅ Limitar número de participantes
- ✅ Activar/desactivar aulas

### Para Usuarios
- ✅ Ver aulas asignadas
- ✅ Acceder a clases programadas
- ✅ Recibir invitaciones por email
- ✅ Unirse con un clic

### Sala Virtual (Jitsi Meet)
- ✅ Video y audio en tiempo real
- ✅ Compartir pantalla
- ✅ Chat en vivo
- ✅ Levantar la mano
- ✅ Grabación de sesiones (moderadores)
- ✅ Fondos virtuales
- ✅ Subtítulos automáticos
- ✅ Estadísticas de conexión

## 🏗️ Arquitectura

### Modelos de Base de Datos

#### VirtualClassroom
```typescript
{
  id: string
  name: string
  description: string?
  roomId: string (único) // Formato: opositappss-{uuid}
  password: string?
  maxParticipants: number (default: 50)
  active: boolean (default: true)
  createdById: string
  participants: ClassroomParticipant[]
  sessions: ClassSession[]
}
```

#### ClassroomParticipant
```typescript
{
  id: string
  classroomId: string
  userId: string
  role: "moderator" | "student"
  canSpeak: boolean (default: true)
  canShareScreen: boolean (default: false)
  isBanned: boolean (default: false)
  joinedAt: DateTime
}
```

#### ClassSession
```typescript
{
  id: string
  classroomId: string
  title: string
  description: string?
  scheduledAt: DateTime
  duration: number (minutos)
  status: "scheduled" | "live" | "ended" | "cancelled"
  startedAt: DateTime?
  endedAt: DateTime?
  recordingUrl: string?
}
```

### APIs Disponibles

#### Administrador

**GET /api/admin/classrooms**
- Lista todas las aulas con estadísticas
- Devuelve: participantes, sesiones, creator

**POST /api/admin/classrooms**
- Crea nueva aula
- Body: `{ name, description?, password?, maxParticipants? }`

**GET /api/admin/classrooms/[id]**
- Obtiene detalles de aula específica

**PUT /api/admin/classrooms/[id]**
- Actualiza configuración de aula

**DELETE /api/admin/classrooms/[id]**
- Elimina aula (cascada a participantes y sesiones)

**POST /api/admin/classrooms/[id]/participants**
- Añade participantes
- Body: `{ userIds: string[], role: "moderator" | "student" }`

**DELETE /api/admin/classrooms/[id]/participants?userId=xxx**
- Elimina participante

**POST /api/admin/classrooms/[id]/sessions**
- Crea sesión programada
- Body: `{ title, description?, scheduledAt, duration, sendInvitations? }`
- Si `sendInvitations=true`, envía emails automáticamente

**GET /api/admin/classrooms/[id]/sessions**
- Lista sesiones de aula

#### Usuario

**GET /api/classrooms**
- Lista aulas asignadas al usuario
- Incluye: próximas 3 sesiones, rol, permisos

### Páginas Frontend

#### Admin
- `/admin/classrooms` - Lista de aulas con stats
- `/admin/classrooms/[id]` - Gestión completa de aula
  - Tab Participantes: añadir/eliminar usuarios
  - Tab Sesiones: programar clases, ver calendario
  - Tab Configuración: editar aula, eliminar

#### Usuario
- `/dashboard/classrooms` - Mis aulas asignadas
- `/classroom/[id]` - Sala virtual Jitsi

## 🚀 Guía de Uso

### Como Administrador

1. **Crear Aula**
   - Ve a Panel Admin → Gestión de Aulas Virtuales
   - Clic en "Crear Nueva Aula"
   - Completa:
     - Nombre (requerido)
     - Descripción (opcional)
     - Contraseña (opcional, para mayor seguridad)
     - Máx. participantes (default: 50)

2. **Añadir Participantes**
   - Entra a la gestión del aula
   - Tab "Participantes"
   - Selecciona usuario y rol:
     - **Moderador**: Control total (mute, kick, screen share)
     - **Estudiante**: Permisos limitados
   - Clic en "Añadir"

3. **Programar Sesión**
   - Tab "Sesiones"
   - Clic en "Programar Nueva Sesión"
   - Completa:
     - Título
     - Descripción (opcional)
     - Fecha y hora
     - Duración (minutos)
     - ✅ Enviar invitaciones (recomendado)
   - Los participantes reciben email con:
     - Detalles de la sesión
     - Link directo al aula
     - Contraseña (si existe)

4. **Entrar al Aula**
   - Desde la lista de aulas: botón "Entrar"
   - Desde la gestión de aula: botón "Entrar al Aula"
   - Como moderador tienes controles especiales

### Como Usuario/Estudiante

1. **Ver Mis Aulas**
   - Dashboard → "Ver Mis Aulas"
   - Se muestran todas las aulas asignadas
   - Próximas sesiones programadas

2. **Entrar a Clase**
   - Clic en "Entrar al Aula"
   - Si tiene contraseña, introducirla
   - Permitir acceso a cámara/micrófono
   - Clic en "Entrar al Aula Virtual"

3. **Durante la Clase**
   - Controles básicos disponibles:
     - ✅ Activar/desactivar cámara
     - ✅ Activar/desactivar micrófono
     - ✅ Levantar la mano
     - ✅ Chat
   - Si tienes permisos:
     - 🖥️ Compartir pantalla
   - El moderador controla:
     - Silenciar a todos
     - Expulsar participantes
     - Aprobar compartir pantalla

## 🔧 Configuración

### Variables de Entorno

```env
# Email (para invitaciones)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-app

# Next Auth URL
NEXTAUTH_URL=http://localhost:3000

# Base de Datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/opositappss
```

### Jitsi Meet

Por defecto usa el servidor público `meet.jit.si` (gratis, sin límites).

**Opción: Servidor Propio**

Para mayor control y privacidad, puedes instalar Jitsi en tu servidor:

1. Servidor con Ubuntu 20.04+
2. Dominio apuntando a tu IP
3. Certificado SSL (Let's Encrypt)
4. Instalación:
   ```bash
   wget https://download.jitsi.org/jitsi-key.gpg.key
   sudo apt-key add jitsi-key.gpg.key
   sudo sh -c "echo 'deb https://download.jitsi.org stable/' > /etc/apt/sources.list.d/jitsi-stable.list"
   sudo apt update
   sudo apt install jitsi-meet
   ```
5. Cambiar en `app/classroom/[id]/page.tsx`:
   ```typescript
   domain="meet.jit.si"  // Cambiar por "tu-dominio.com"
   ```

## 📧 Sistema de Invitaciones

Las invitaciones por email incluyen:

- **Título de la sesión**
- **Nombre del aula**
- **Descripción** (si existe)
- **Fecha y hora** (formato español)
- **Duración** en minutos
- **Link directo** al aula
- **Contraseña** (si tiene)
- **Botón CTA** para unirse fácilmente

### Plantilla de Email

```html
<div style="font-family: Arial, sans-serif;">
  <h2>📚 Invitación a Clase Virtual</h2>
  <p>Hola {nombre},</p>
  
  <div style="background: #f3f4f6; padding: 20px;">
    <h3>{título sesión}</h3>
    <p><strong>Aula:</strong> {nombre aula}</p>
    <p><strong>Fecha:</strong> {fecha hora}</p>
    <p><strong>Duración:</strong> {minutos}</p>
    {contraseña si existe}
  </div>
  
  <a href="{link}" style="button-style">
    Unirse a la Clase
  </a>
</div>
```

## 🎓 Roles y Permisos

### Moderador
- ✅ Acceso completo a todos los controles
- ✅ Compartir pantalla por defecto
- ✅ Silenciar a otros participantes
- ✅ Expulsar participantes
- ✅ Grabar sesión
- ✅ Controlar configuración de sala
- ✅ Ver estadísticas de conexión

### Estudiante
- ✅ Activar/desactivar su cámara
- ✅ Activar/desactivar su micrófono
- ✅ Usar el chat
- ✅ Levantar la mano
- ⚠️ Compartir pantalla (solo si el admin lo permite)
- ⚠️ Cambiar fondos virtuales

### Bloqueado (isBanned)
- ❌ No puede acceder al aula
- ❌ No aparece en lista de participantes

## 📊 Estadísticas y Monitoreo

El sistema registra:

- **Participantes por aula**
- **Sesiones programadas**
- **Estado de sesiones** (scheduled/live/ended/cancelled)
- **Hora de inicio y fin** de cada sesión
- **URLs de grabaciones** (si se activa grabación)

## 🔐 Seguridad

- ✅ Autenticación con NextAuth
- ✅ Verificación de roles (admin/user)
- ✅ Contraseñas opcionales para aulas
- ✅ Límite de participantes configurable
- ✅ Sistema de bans por aula
- ✅ Permisos granulares (canSpeak, canShareScreen)
- ✅ Conexión segura con Jitsi (WebRTC)

## 🐛 Troubleshooting

### No puedo acceder a la cámara/micrófono
- Verificar permisos del navegador
- Usar HTTPS (o localhost)
- Revisar que no haya otra app usando los dispositivos

### No recibo invitaciones por email
- Verificar EMAIL_USER y EMAIL_PASS en .env
- Para Gmail: usar "Contraseña de aplicación"
- Revisar carpeta de spam

### Error "Aula no encontrada"
- Verificar que estás en la lista de participantes
- Consultar con el administrador

### La sala Jitsi no carga
- Verificar conexión a internet
- Comprobar que meet.jit.si está accesible
- Revisar consola del navegador para errores

## 🚀 Mejoras Futuras

- [ ] Grabación automática de sesiones
- [ ] Calendario integrado de sesiones
- [ ] Notificaciones push antes de clase
- [ ] Estadísticas de asistencia
- [ ] Pizarra virtual colaborativa
- [ ] Breakout rooms (salas pequeñas)
- [ ] Encuestas en vivo
- [ ] Sistema de preguntas y respuestas
- [ ] Integración con YouTube Live
- [ ] Chat persistente por aula

## 📝 Notas Técnicas

- **Jitsi SDK**: @jitsi/react-sdk
- **UUID**: Genera roomIds únicos
- **Prisma**: Gestión de base de datos
- **Nodemailer**: Envío de emails
- **Next.js 16**: Framework frontend/backend
- **Turbopack**: Build tool optimizado

## 📞 Soporte

Para dudas o problemas:
1. Revisar esta documentación
2. Consultar consola del navegador
3. Revisar logs del servidor
4. Contactar con el administrador del sistema

---

**opositAPPSS** - Sistema de preparación de oposiciones con aulas virtuales integradas
