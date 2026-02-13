# Recordatorio (para retomar mañana) — 9 feb 2026

## Cambios realizados hoy (9 feb 2026)
- Se ajustó la **intensidad de la marca al agua** del repositorio porque tapaba demasiado el texto:
  - Visor: overlay más ligero (menos opacidad/densidad y texto más pequeño).
  - Descarga/preview: watermark **incrustada en el PDF** más suave (menos opacidad y menos densidad).

- Se implementó **logout por inactividad (1 hora)** para reforzar seguridad:
  - Cliente: detecta interacción (mouse/teclado/scroll/touch) y hace `signOut()` tras 1h.
  - Middleware: refuerzo servidor con cookie httpOnly de “última actividad”; si vuelves tras >1h, fuerza login.

- Deploy prod realizado y aliasado a: https://www.opositapp.site

## Estado actual (resumen ejecutivo)
- Se implementó un **workflow de revisión de preguntas** en producción sin borrar histórico:
  - Campos `Question.origin` y `Question.reviewStatus` (PENDING/VALIDATED/QUARANTINED).
  - Panel admin para filtrar/paginar y acciones masivas (validar / cuarentena / reset) + borrado seguro (bloquea si hay dependencias).
  - “Corte suave” activo: **excluir `QUARANTINED`** en endpoints user-facing.
  - “Corte duro” preparado: variable `ENFORCE_ONLY_VALIDATED_QUESTIONS=true` para servir **solo `VALIDATED`**.

- Se corrigió un bug del panel de revisión: el filtro de “tema” solo mostraba 2–3 temas.
  - Ahora el API devuelve la lista completa de temas con `includeTemas=1`.

- Se implementó **marca de agua real dentro del PDF** para el repositorio (anti-bypass) y se desplegó a producción.
  - Para **no-admin**, `/api/repository/download/[id]` descarga bytes del PDF, estampa watermark (usuario + timestamp), y devuelve el PDF desde nuestro dominio.
  - Para **admin**, se mantiene comportamiento previo (redirect/proxy sin watermark).

- Cómo dar acceso al repositorio:
  - Usuario solicita desde “Mi cuenta” → bloque “Repositorio”.
  - Admin aprueba en `/admin/repositorio/access-requests`.

## Qué está desplegado en producción
- Último deploy prod OK y aliasado a: https://www.opositapp.site

## Watermarking PDFs (repositorio)
- Implementado con `pdf-lib`.
- Texto watermark (no-admin): `OPOSITAPP · solo para uso formativo · NO DISTRIBUIR · (email) · (teléfono) · (timestamp UTC)`.
- Aplica tanto a:
  - visor (preview): `/api/repository/download/:id?preview=1` (disposition inline)
  - descarga: `/api/repository/download/:id` (disposition attachment)

### Parámetros actuales (para no-admin)
- `opacity=0.14`, `fontSize=42`, `rotationDegrees=-28`, `tileStep=320`.

### Watermark en visor (overlay)
- Overlay visual encima del `iframe` (solo no-admin), con menor opacidad/densidad.

### Archivos relevantes
- `src/lib/pdf-watermark.ts` (helper de watermark)
- `app/api/repository/download/[id]/route.ts` (aplica watermark a no-admin; evita redirect)

## Revisión de preguntas (workflow)
### Conceptos
- `reviewStatus`:
  - `PENDING`: pendiente de revisar
  - `VALIDATED`: validada
  - `QUARANTINED`: despublicada/cuarentena

- `origin`:
  - `CRON`, `JSON`, `MANUAL`, `UNKNOWN`

### API / UI
- UI: `/admin/questions-review`
- API: `/api/admin/questions-review`
  - `GET` con filtros/paginación
  - `includeTemas=1` devuelve `temas` por `groupBy`
  - Acciones masivas validate/unpublish/reset
  - `DELETE` bloquea con 409 si hay dependencias históricas

### Gating por fases
- Helper: `src/lib/question-review-gating.ts`
- Flag: `ENFORCE_ONLY_VALIDATED_QUESTIONS`
  - `false`: excluir `QUARANTINED` (corte suave)
  - `true`: solo `VALIDATED` (corte duro)

### Endpoints con gating aplicado
- `/api/questions/random`
- `/api/exam-simulation`
- `/api/custom-test/create`
- `/api/custom-test/topics`
- Asistente IA fallback: `/api/help/ai-assistant` excluye `QUARANTINED` (sin forzar `VALIDATED`).

## Acceso al repositorio (permisos)
- En sesión: `session.user.repoRole` (`NONE|READER|EDITOR`).
- Usuario solicita vía API: `/api/repository/access-requests`.
- Admin gestiona/aprueba en:
  - UI: `/admin/repositorio/access-requests`
  - API: `/api/admin/repositorio/access-requests`

## Pendiente / decisiones para mañana
- Confirmar en producción si la lectura es cómoda en PDFs con mucho texto y, si aún molesta, retocar solo:
  - `opacity` (transparencia)
  - `tileStep` (densidad)
- Confirmar experiencia de usuario en visor (rendimiento) para PDFs grandes.
- (Opcional) Añadir endpoint/admin rápido para **asignar repoRole directamente** a un usuario (sin solicitud), si se quiere un atajo operativo.

## Sesión: logout por inactividad (1h)
- Cliente: `src/components/IdleLogout.tsx` (interacción real del usuario + `signOut()` tras 1h).
- Global: `src/components/providers.tsx` (inyecta el componente dentro del `SessionProvider`).
- Servidor: `middleware.ts` (cookie httpOnly `opositapp_last_activity`; si >1h, redirige a `/login` y limpia cookies NextAuth best-effort).

## Comandos útiles
- Build: `npm run build`
- Deploy prod: `npx vercel --prod`
