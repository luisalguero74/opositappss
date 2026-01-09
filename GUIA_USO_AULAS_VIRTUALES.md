# 🎓 Guía de Uso - Aulas Virtuales

**Fecha**: 9 de enero de 2026  
**Sistema**: Aulas virtuales con Jitsi Meet integrado

---

## 📋 Índice

1. [Para Administradores](#-para-administradores)
2. [Para Usuarios/Estudiantes](#-para-usuariosestudiantes)
3. [Verificación del Sistema](#-verificación-del-sistema)
4. [Problemas Comunes](#-problemas-comunes)

---

## 👨‍💼 Para Administradores

### 1️⃣ Crear una Nueva Aula Virtual

**Ruta**: `/admin` → **"Gestionar Aulas Virtuales"**

1. Clic en **"➕ Crear Nueva Aula"**

2. **Formulario de Creación**:
   ```
   📝 Nombre del Aula: *
   Ejemplo: "Oposiciones INSS 2026 - Grupo A"
   
   📄 Descripción: (opcional)
   Ejemplo: "Clases de preparación para el temario específico"
   
   🔒 Contraseña: (opcional, recomendado)
   Ejemplo: "OpositINSS2026"
   
   👥 Máximo de Participantes:
   Por defecto: 50 (ajustar según necesidad)
   ```

3. Clic en **"Crear Aula"**

4. **Resultado**: Aula creada con:
   - ✅ ID único del aula
   - ✅ Room ID para Jitsi (formato: `opositappss-{uuid}`)
   - ✅ Estado: Activa
   - ✅ 0 participantes iniciales

---

### 2️⃣ Añadir Participantes

**Ruta**: `/admin/classrooms` → **Clic en "Gestionar" en el aula**

1. **Tab "Participantes"**

2. **Añadir Usuario**:
   ```
   Usuario: [Selector desplegable con todos los usuarios]
   
   Rol: 
   • 👑 Moderador - Control total de la sala
   • 👤 Estudiante - Permisos limitados
   ```

3. Clic en **"Añadir Participante"**

4. **Características por Rol**:

   **Moderador** 👑:
   - Control de la sala (silenciar, expulsar)
   - Compartir pantalla siempre permitido
   - Grabar sesión
   - Ver estadísticas
   
   **Estudiante** 👤:
   - Activar/desactivar cámara y micrófono
   - Usar chat
   - Levantar la mano
   - Compartir pantalla solo si se le permite

5. **Eliminar Participante**:
   - Clic en botón rojo **"Eliminar"** junto al nombre
   - Confirmar acción

---

### 3️⃣ Programar Sesiones de Clase

**Ruta**: `/admin/classrooms/[id]` → **Tab "Sesiones"**

1. Clic en **"📅 Programar Nueva Sesión"**

2. **Formulario de Sesión**:
   ```
   📝 Título: *
   Ejemplo: "Tema 15 - Prestaciones de la Seguridad Social"
   
   📄 Descripción: (opcional)
   Ejemplo: "Repaso del articulado del RDL 8/2015"
   
   📅 Fecha y Hora: *
   Ejemplo: 2026-01-15 18:00
   
   ⏱️ Duración (minutos): *
   Ejemplo: 90
   
   ✅ Enviar invitaciones por email
   [☑] Marcar para enviar emails automáticamente
   ```

3. Clic en **"Crear Sesión"**

4. **Resultado**:
   - ✅ Sesión guardada con estado "Programada"
   - ✅ Si marcaste "Enviar invitaciones":
     - Todos los participantes reciben un email
     - Email incluye: título, fecha, hora, link directo, contraseña

---

### 4️⃣ Entrar al Aula como Admin

**Opción A**: Desde lista de aulas (`/admin/classrooms`)
- Clic en botón morado **"Entrar"**

**Opción B**: Desde gestión de aula (`/admin/classrooms/[id]`)
- Botón **"🚪 Entrar al Aula"** en la parte superior

**Como Moderador tienes**:
- 🎥 Control de cámara/micrófono de todos
- 🖥️ Compartir pantalla
- 🔇 Silenciar a participantes
- ⛔ Expulsar participantes
- 📹 Grabar sesión (disponible en Jitsi)
- 📊 Ver estadísticas de conexión

---

### 5️⃣ Gestionar Configuración del Aula

**Ruta**: `/admin/classrooms/[id]` → **Tab "Configuración"**

1. Clic en **"Editar Configuración"**

2. **Modificar**:
   - Nombre del aula
   - Descripción
   - Contraseña
   - Máximo de participantes
   - Estado (Activa/Inactiva)

3. Clic en **"Guardar Cambios"**

4. **Desactivar Aula**:
   - Cambiar estado a "Inactiva"
   - Los usuarios no pueden entrar
   - No se elimina (puedes reactivar después)

5. **Eliminar Aula**:
   - Botón rojo **"Eliminar Aula"** al final
   - ⚠️ **ATENCIÓN**: Acción irreversible
   - Se eliminan:
     - Todos los participantes
     - Todas las sesiones programadas
     - Todo el historial

---

## 👨‍🎓 Para Usuarios/Estudiantes

### 1️⃣ Ver Mis Aulas Asignadas

**Ruta**: `/dashboard` → **"Ver Mis Aulas"**

**Verás**:
- Lista de aulas a las que perteneces
- Tu rol (Moderador 👑 o Estudiante 👤)
- Número de participantes
- Estado del aula (Activa ✓ / Inactiva ○)
- **Próximas sesiones programadas** (si hay)

---

### 2️⃣ Entrar a una Clase

1. **Desde Mis Aulas** (`/dashboard/classrooms`)
   - Clic en botón **"Entrar al Aula"**

2. **Si el aula tiene contraseña**:
   - Aparece un formulario
   - Introduce la contraseña
   - Clic en **"Verificar y Continuar"**

3. **Permitir acceso a dispositivos**:
   ```
   El navegador pedirá permisos:
   ✅ Cámara
   ✅ Micrófono
   
   Clic en "Permitir"
   ```

4. **Pantalla de Espera**:
   ```
   📹 Vista previa de tu cámara
   🎤 Prueba de micrófono
   
   Puedes:
   - Desactivar cámara antes de entrar
   - Silenciar micrófono
   - Elegir cámara/micrófono (si tienes varios)
   ```

5. **Clic en "Entrar al Aula Virtual"**

---

### 3️⃣ Durante la Clase

**Controles Disponibles** (barra inferior de Jitsi):

1. **🎥 Cámara**:
   - Activar/Desactivar video
   - Elegir cámara (si tienes varias)

2. **🎤 Micrófono**:
   - Activar/Desactivar audio
   - Elegir micrófono

3. **✋ Levantar la Mano**:
   - Notifica al moderador que quieres hablar
   - Aparece un icono junto a tu nombre

4. **💬 Chat**:
   - Enviar mensajes a todos
   - Visible para todos los participantes

5. **🖥️ Compartir Pantalla** (si tienes permiso):
   - Comparte tu pantalla completa
   - O solo una ventana/pestaña específica
   - Solo si el moderador te lo permite

6. **⚙️ Configuración**:
   - Fondos virtuales (difuminar, imágenes)
   - Calidad de video
   - Subtítulos automáticos
   - Estadísticas de conexión

7. **🚪 Salir**:
   - Botón rojo "Colgar"
   - Te saca de la sala
   - Puedes volver a entrar cuando quieras

---

### 4️⃣ Recibir Invitaciones por Email

**Cuando el admin programa una sesión con invitaciones activadas**:

1. **Recibes un email con**:
   ```
   📧 Asunto: Invitación a Clase Virtual - [Título]
   
   Contenido:
   - 🎓 Nombre del aula
   - 📝 Título de la sesión
   - 📄 Descripción (si hay)
   - 📅 Fecha: [9 enero 2026, 18:00]
   - ⏱️ Duración: [90 minutos]
   - 🔒 Contraseña: [si hay]
   - 🔗 Link directo al aula
   - 🔵 Botón "Unirse a la Clase"
   ```

2. **Cómo usarlo**:
   - Clic en el botón azul **"Unirse a la Clase"**
   - Te lleva directamente a la sala
   - Si hay contraseña, ya la tienes en el email

---

## ✅ Verificación del Sistema

### Checklist para Administradores

**Antes de tu primera clase**:

1. **Crear Aula de Prueba**:
   ```
   ✅ Nombre: "Test Aula Virtual"
   ✅ Sin contraseña (para facilitar)
   ✅ 10 participantes máx
   ```

2. **Añadirte como Moderador**:
   ```
   ✅ Seleccionar tu usuario
   ✅ Rol: Moderador
   ✅ Añadir
   ```

3. **Entrar al Aula**:
   ```
   ✅ Clic en "Entrar"
   ✅ Permitir cámara/micrófono
   ✅ Verificar que carga Jitsi
   ✅ Probar controles (cámara, micro, chat)
   ```

4. **Añadir Participante de Prueba**:
   ```
   ✅ Añadir otro usuario como Estudiante
   ✅ Pedirle que entre desde /dashboard/classrooms
   ✅ Verificar que aparece en la sala
   ```

5. **Programar Sesión de Prueba**:
   ```
   ✅ Título: "Sesión de Prueba"
   ✅ Fecha: [mañana]
   ✅ Duración: 30 min
   ✅ Marcar "Enviar invitaciones"
   ✅ Verificar que llega el email
   ```

6. **Verificar Email**:
   ```
   ✅ Revisar bandeja de entrada
   ✅ Comprobar que tiene link
   ✅ Comprobar que tiene fecha correcta
   ✅ Hacer clic en el link (debe funcionar)
   ```

---

### Estado del Sistema Actual

**Componentes Verificados** ✅:

1. **Base de Datos**:
   - ✅ Modelo `VirtualClassroom` creado
   - ✅ Modelo `ClassroomParticipant` creado
   - ✅ Modelo `ClassSession` creado
   - ✅ Relaciones configuradas correctamente

2. **APIs Backend**:
   - ✅ `/api/admin/classrooms` - CRUD aulas
   - ✅ `/api/admin/classrooms/[id]` - Gestión individual
   - ✅ `/api/admin/classrooms/[id]/participants` - Gestión participantes
   - ✅ `/api/admin/classrooms/[id]/sessions` - Programar sesiones
   - ✅ `/api/classrooms` - Lista para usuarios
   - ✅ `/api/classrooms/[id]/verify-password` - Verificación contraseña

3. **Páginas Frontend**:
   - ✅ `/admin/classrooms` - Lista de aulas (admin)
   - ✅ `/admin/classrooms/[id]` - Gestión completa (admin)
   - ✅ `/dashboard/classrooms` - Mis aulas (usuario)
   - ✅ `/classroom/[id]` - Sala virtual con Jitsi

4. **Integración Jitsi Meet**:
   - ✅ Usando servidor público `meet.jit.si` (gratuito)
   - ✅ Carga dinámica del SDK
   - ✅ Configuración de permisos por rol
   - ✅ Interfaz en español
   - ✅ Todos los controles funcionando

5. **Sistema de Emails**:
   - ⚠️ **REQUIERE VERIFICACIÓN**
   - Variables de entorno necesarias:
     ```env
     EMAIL_USER=tu-email@gmail.com
     EMAIL_PASS=tu-contraseña-app
     ```
   - Si no están configuradas, las invitaciones no se envían
   - El resto funciona sin emails

---

## 🐛 Problemas Comunes

### 1. "No puedo crear un aula"

**Posibles causas**:
- ❌ No tienes rol de administrador
- ❌ Falta el nombre del aula
- ❌ Error de conexión a BD

**Soluciones**:
1. Verificar que tu usuario tiene `role = "admin"` en la BD
2. Asegurarte de completar el campo "Nombre"
3. Revisar logs del servidor (consola)

---

### 2. "Pantalla negra en Jitsi / No carga la videollamada"

**Causa**: Problema con permisos del navegador

**Soluciones**:
1. **Permitir acceso**:
   - Clic en el icono de candado (barra de dirección)
   - Activar permisos de cámara y micrófono
   - Recargar página

2. **Probar en otro navegador**:
   - Chrome ✅ (recomendado)
   - Firefox ✅
   - Safari ⚠️ (puede tener problemas)
   - Edge ✅

3. **Verificar que Jitsi carga**:
   - Abrir consola del navegador (F12)
   - Ver si hay errores de carga
   - Verificar conexión a internet

---

### 3. "El aula pide contraseña pero no la sé"

**Soluciones**:
1. **Si eres estudiante**:
   - Contactar al administrador
   - O buscar en el email de invitación (si recibiste uno)

2. **Si eres administrador**:
   - Ir a `/admin/classrooms/[id]`
   - Tab "Configuración"
   - Ver/cambiar contraseña

---

### 4. "No recibo invitaciones por email"

**Causa**: Variables de entorno EMAIL no configuradas

**Solución para Admin**:
1. Configurar en Vercel (o .env local):
   ```env
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASS=contraseña-aplicacion-google
   ```

2. **Generar contraseña de aplicación Google**:
   - Ir a: https://myaccount.google.com/apppasswords
   - Crear contraseña para "OpositApp"
   - Usar esa contraseña en `EMAIL_PASS`

3. **Reiniciar servidor** (en local) o **Redeployear** (en Vercel)

4. **Alternativa temporal**:
   - No marcar "Enviar invitaciones"
   - Compartir link del aula manualmente
   - Compartir contraseña por otro medio

---

### 5. "No veo el botón para compartir pantalla"

**Causa**: No tienes permisos

**Soluciones**:
1. **Si eres estudiante**:
   - El moderador debe habilitarte el permiso
   - Pedir al admin que te dé `canShareScreen = true`

2. **Si eres moderador**:
   - Deberías tenerlo por defecto
   - Verificar en Jitsi: menú "..." → "Compartir pantalla"

---

### 6. "Aparece 'No estás inscrito en ninguna aula'"

**Causa**: El admin no te ha añadido a ningún aula

**Solución**:
1. Contactar al administrador
2. Pedirle que te añada desde `/admin/classrooms/[id]`
3. Una vez añadido, recargar `/dashboard/classrooms`

---

## 📊 Resumen de Rutas

### Administrador
```
/admin                           → Panel principal
/admin/classrooms                → Lista de aulas
/admin/classrooms/[id]           → Gestión de aula
  ├─ Tab Participantes           → Añadir/eliminar usuarios
  ├─ Tab Sesiones                → Programar clases
  └─ Tab Configuración           → Editar/eliminar aula
/classroom/[id]                  → Entrar al aula (como moderador)
```

### Usuario/Estudiante
```
/dashboard                       → Panel principal
/dashboard/classrooms            → Mis aulas asignadas
/classroom/[id]                  → Entrar al aula (como estudiante)
```

---

## 🎯 Flujo Completo de Uso

### Escenario: Primera Clase Virtual

**1. Admin crea el aula** (2 minutos):
```
1. /admin → Gestionar Aulas Virtuales
2. Crear Nueva Aula
3. Nombre: "Oposiciones INSS - Enero 2026"
4. Contraseña: "INSS2026"
5. Crear
```

**2. Admin añade participantes** (5 minutos):
```
1. Gestionar aula creada
2. Tab Participantes
3. Añadir uno por uno:
   - Juan (Estudiante)
   - María (Estudiante)
   - Pedro (Moderador)
```

**3. Admin programa sesión** (3 minutos):
```
1. Tab Sesiones
2. Programar Nueva Sesión
3. Título: "Tema 1 - Introducción a la SS"
4. Fecha: Mañana 18:00
5. Duración: 90 minutos
6. ✅ Enviar invitaciones
7. Crear
```

**4. Participantes reciben email** (automático):
```
📧 Email a Juan, María y Pedro
Contenido: Link + Contraseña + Fecha
```

**5. Día de la clase**:
```
18:00 - Admin entra primero (/admin/classrooms → Entrar)
18:05 - Estudiantes entran (desde email o /dashboard/classrooms)
18:10 - Clase comienza (todos conectados)
20:30 - Clase termina (todos cuelgan)
```

---

## ✨ Mejores Prácticas

### Para Administradores

1. **Crear aulas con nombres descriptivos**:
   - ✅ "INSS 2026 - Temario Específico - Grupo A"
   - ❌ "Aula 1"

2. **Usar contraseñas en aulas importantes**:
   - Evita intrusos
   - Comparte contraseña solo con participantes

3. **Programar sesiones con antelación**:
   - Mínimo 24h antes
   - Permite a estudiantes organizarse

4. **Enviar invitaciones por email**:
   - Facilita el acceso
   - Recuerda la sesión

5. **Hacer pruebas antes de clases importantes**:
   - Entrar 10 min antes
   - Verificar audio/video
   - Comprobar que todos pueden entrar

### Para Estudiantes

1. **Entrar 5 minutos antes**:
   - Tiempo para resolver problemas técnicos
   - Probar cámara/micrófono

2. **Guardar contraseñas**:
   - Anota en lugar seguro
   - O guarda el email de invitación

3. **Usar auriculares**:
   - Evita eco
   - Mejor calidad de audio

4. **Fondo neutro o virtual**:
   - Profesionalismo
   - Menos distracciones

5. **Silenciar cuando no hablas**:
   - Evita ruidos de fondo
   - Mejora calidad general

---

## 🎉 Conclusión

El sistema de aulas virtuales está **completamente funcional** con:

✅ **Backend completo** - APIs, base de datos, lógica
✅ **Frontend completo** - Admin y usuario
✅ **Integración Jitsi** - Videollamadas en tiempo real
✅ **Sistema de roles** - Moderador vs Estudiante
✅ **Programación de sesiones** - Calendario y recordatorios
✅ **Invitaciones por email** - Automáticas (si email configurado)

**Estado actual**: ✅ **PRODUCCIÓN READY**

**Requisito único para emails**: Configurar variables `EMAIL_USER` y `EMAIL_PASS`

---

**¿Necesitas ayuda?** Revisa la sección de [Problemas Comunes](#-problemas-comunes) o contacta al administrador del sistema.
