# Gestión de Usuarios - Documentación

## Funcionalidades Implementadas

### 1. Desactivación Temporal de Usuarios

**Campo en base de datos:** `User.active` (Boolean, default: true)

**Comportamiento:**
- Usuarios desactivados (`active = false`) NO pueden iniciar sesión
- Al intentar login, reciben mensaje: "Tu cuenta ha sido desactivada. Contacta con el administrador."
- Sus datos permanecen en la base de datos
- Se puede reactivar en cualquier momento

**Cómo desactivar/activar:**
1. Ir a `/admin/users`
2. Seleccionar usuario
3. Clic en botón "🚫 Desactivar" o "✓ Activar"

### 2. Exportación de Historial Completo

**Endpoint:** `GET /api/admin/users/[id]/export`

**Contenido del JSON exportado:**
```json
{
  "exportedAt": "2025-12-26T...",
  "user": {
    "email": "usuario@example.com",
    "role": "user",
    "active": true,
    "createdAt": "...",
    ...
  },
  "statistics": {
    "totalAnswers": 150,
    "correctAnswers": 120,
    "successRate": 80.00,
    "questionnairesCompleted": 10,
    ...
  },
  "questionnaires": [...],  // Por cuestionario
  "answers": [...],          // Todas las respuestas detalladas
  "forumThreads": [...],     // Hilos creados
  "forumPosts": [...]        // Posts en foro
}
```

**Cómo exportar:**
1. Ir a `/admin/users`
2. Seleccionar usuario
3. Clic en botón "📥 Exportar"
4. Se descarga archivo JSON con nombre: `historial_usuario_email_2025-12-26.json`

### 3. Eliminación Permanente

**Endpoint:** `DELETE /api/admin/users/[id]`

**Comportamiento:**
- Eliminación en cascada (automática por Prisma)
- Se borran: respuestas, posts, threads, sesiones
- Solicita confirmación antes de ejecutar
- No se puede eliminar a sí mismo (protección)

**Cómo eliminar:**
1. Ir a `/admin/users`
2. Seleccionar usuario
3. Clic en botón "🗑️ Eliminar"
4. Confirmar en diálogo

## Indicadores Visuales

- 🚫 Desactivado - Badge rojo en usuarios desactivados
- ✓ Verificado - Email verificado
- 👑 Admin / 👤 Usuario - Rol del usuario

## Protecciones de Seguridad

1. ✅ Solo admins pueden acceder a gestión de usuarios
2. ✅ No se puede eliminar el propio usuario admin
3. ✅ Usuarios desactivados no pueden iniciar sesión
4. ✅ Confirmación antes de acciones destructivas
5. ✅ Logs en servidor de todas las acciones

## Recomendaciones de Uso

### Cuándo DESACTIVAR:
- Usuario inactivo temporalmente
- Suspensión por incumplimiento
- Necesitas mantener historial
- Posible reactivación futura

### Cuándo ELIMINAR:
- Usuario solicitó baja definitiva (GDPR)
- Cuenta spam/fraudulenta
- No necesitas conservar datos
- Limpieza de base de datos

### Cuándo EXPORTAR:
- Antes de eliminar (backup)
- Solicitud de datos por usuario (GDPR)
- Análisis de uso individual
- Auditoría de actividad
