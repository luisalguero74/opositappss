# Punto de recuperación — 7 febrero 2026

Este documento es un **snapshot operativo** de lo hecho últimamente en el repo, con foco especial en:
- Cómo se generaron los **últimos JSON de preguntas**.
- Qué **normas/condiciones** se exigieron (validaciones/constraints).
- Cómo se **importan/normalizan** las preguntas en BD.

> Nota: Esto NO es un tag/commit de Git. Es una guía reproducible + inventario. Si quieres un “punto de recuperación” real (volver a este estado con 1 comando), al final hay un bloque con pasos para crear commit+tag.

---

## 1) Estado del repo (local)

- Rama actual: `staging-debug` (local por delante de `origin/staging-debug`).
- Hay **muchos cambios sin commitear** y **60 archivos nuevos (untracked)**.

### 1.1 Archivos nuevos (untracked) relevantes

**JSON de preguntas (salida de generación):**
- `TEMA  08_ESPECÍFICO_PRESTACIONES_ INCAPACIDAD_TEMPORAL.JSON`
- `TEMA 06_ESPECÍFICO_GESTIÓN RECAUDATORIA_3.JSON`
- `TEMA_06_ESPECÍFICO_RECAUDACIÓN_4.JSON`
- `TEMA 08_ESPECÍFICO_INCAPACIDAD_PERMANENTES_LESIONES_INCAPACITANTES.JSON`
- `TEMA 09_ESPECÍFICO_PRESTACIONES.JSON`
- `TEMA 09_ESPECÍFICO_PRESTACIONES FAMILIARES.JSON`
- `TEMA 10_ESPECÍFICO_JUBILACIÓN_PARCIAL.JSON`
- `TEMA 10_ESPECÍFICO_JUBILACIÓN_TIPOS.JSON`
- `TEMA 11_CUANTÍA PRESTACIONES.JSON`
- `TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_1.JSON`
- `TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_2.JSON`
- `TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_3.JSON`
- `TEMA 12_ESPECÍFICO PENSIÓN Y PRESTACIÓN DE JUBILACIÓN.JSON`
- `TEMA 12_ESPECÍFICO_Prestaciones no contributivas y asistenciales El ingreso mínimo vital.JSON`
- `tema 13_ESPECÍFICO_Recursos generales...El patrimonio único...JSON`

**Scripts de generación/validación (fuente de las reglas):**
- `scripts/generate-tema08-it-40.mjs`
- `scripts/generate-tema08-ip-lpni-40.mjs`
- `scripts/generate-tema08-incapacidades-mixto-40.mjs`
- `scripts/generate-tema09-prestaciones-40.mjs`
- `scripts/generate-tema09-prestaciones-40.v2.mjs`
- `scripts/generate-tema09-prestaciones-familiares-35.mjs`
- `scripts/generate-tema10-jubilacion-parcial-40.mjs`
- `scripts/generate-tema10-jubilacion-tipos-40.mjs`
- `scripts/generate-tema11-cuantia-prestaciones-40.mjs`
- `scripts/generate-tema11-muerte-supervivencia-1-40.mjs`
- `scripts/generate-tema11-muerte-supervivencia-2-40.mjs`
- `scripts/generate-tema11-muerte-supervivencia-3-40.mjs`
- `scripts/generate-tema12-imv-100.mjs`
- `scripts/generate-tema12-jubilacion-prestacion-40.mjs`
- `scripts/generate-tema13-patrimonio-ss-80.mjs`
- `scripts/verify-question-bank.mjs`

**BOE monitor (nuevo):**
- `src/lib/boe-datosabiertos.ts`
- `src/lib/boe-ss-detector.ts`
- `src/lib/boe-monitor.ts`
- `src/lib/boe-db.ts`
- `app/api/cron/boe/route.ts`
- `app/api/admin/boe/*`
- `app/admin/actualizaciones-boe/page.tsx`
- `prisma/migrations/20260206093000_boe_monitor/migration.sql`

**Repositorios (visor PDF) (nuevo):**
- `app/repositorio/visor/[id]/visor-client.tsx`

---

## 2) Normas/condiciones exigidas en los JSON “TEMA … .JSON”

Los JSON recientes no se generaron “a ojo”: **los propios scripts aplican validación dura** (si no se cumple, el script falla).

### 2.1 Estructura mínima de cada pregunta (común)

En general (ver `scripts/generate-tema09-prestaciones-40.v2.mjs` como referencia), cada pregunta exige:
- `question`: string no vacío.
- `options`: array de **4** strings no vacíos.
- Opciones **sin duplicados** (`new Set(options).size === 4`).
- `correctAnswer`: **letra** `A|B|C|D` (mayúscula).
- `explanation`: string no vacío.
- `difficulty`: suele fijarse a `hard` en el `push()`.

### 2.2 Reglas de “calidad legal” de la explicación (muy importante)

En varios scripts se exige explícitamente:
- La explicación debe **citar artículo** (contiene `"art."`).
- La explicación debe incluir un **fragmento literal entre comillas** (`"..."`).

Ejemplo de validación (conceptual):
- `explanation.includes("art.")`.
- `explanation.includes('"')`.

Variantes: en algunos temas también acepta “disposición/disp.” como cita válida.

### 2.3 Reglas sobre distribución de respuestas (para evitar patrones)

Hay **dos familias** de scripts:

**A) Clave de respuestas balanceada y “anti-patrón”** (p.ej. `generate-tema09-prestaciones-40.v2.mjs`):
- Total fijo (normalmente 40).
- Distribución A/B/C/D casi perfecta: diferencia máx. entre letras `<= 1`.
- Máximo de respuestas iguales consecutivas: `<= 2`.
- Detecta secuencias periódicas/predictibles y las rechaza.

**B) Patrón determinista A-B-C-D repetido** (p.ej. `generate-tema08-it-40.mjs`):
- Usa `expect(n, letter)` para forzar que Q1 sea A, Q2 sea B, etc.
- Si se rompe el patrón, el script lanza error.

### 2.4 Total de preguntas esperado

Según el tema/script:
- 35, 40, 80, 100… (cada script valida el total exacto).

---

## 3) Cómo se importan y normalizan los JSON en BD

Hay dos piezas clave:

### 3.1 Importación por script (fichero local → BD)

Script: `scripts/import-tema-json.ts`

Normas/condiciones que aplica:
- Acepta múltiples raíces JSON: `root.data[]`, array plano, o un objeto (lo envuelve).
- Exige que exista al menos un bloque y que `questions[]` no esté vacío.
- Admite enunciado como `text` o `question`.
- `options` puede venir como:
  - array de strings, o
  - string que contiene un JSON serializado.
- `correctAnswer` puede venir como:
  - letra `A|B|C|D`, o
  - texto de la opción (lo busca dentro de las 4 opciones y convierte a letra).
- Si falta `text/question`, `options` inválidas (≠ 4), o no se infiere respuesta → **se salta la pregunta**.
- Sanitiza `\u0000` (Postgres no admite bytes nulos en textos).
- Crea o actualiza `Questionnaire` (publicado) y deduplica preguntas por clave `text + correctAnswer`.
- Mapea dificultad a `facil|media|dificil`.
- Intenta inferir `temaCodigo` oficial (E##/G##) a partir de `temaNumero/temaParte`.

Cómo ejecutarlo:
- `npx tsx scripts/import-tema-json.ts <ruta-al-json>` (o importar llamando a `importTemaFromJson(...)` desde otro runner).

### 3.2 Normalización central (convención crítica)

Helpers: `src/lib/answer-normalization.ts`

Reglas (convención de datos):
- `Question.correctAnswer` **canónico**: letra **mayúscula** `A|B|C|D`.
- `Question.options` **canónico**: string JSON de array con **4** strings no vacíos.

Funciones relevantes:
- `safeParseOptions(...)`: repara datos legacy (p.ej. opciones pegadas por comas/pipes/newlines).
- `normalizeCorrectAnswerToUpperLetter(correctAnswer, options)`: infiere A/B/C/D desde letra, índice numérico o texto.

---

## 4) Generación de preguntas vía API (admin)

Ruta: `app/api/ai/generate-questions/route.ts`

Condiciones principales:
- Sólo admin.
- “Chunking” del contenido antes de llamar al generador.
- Antes de guardar:
  - Normaliza `options` con `safeParseOptions(...)`.
  - Normaliza `correctAnswer` con `normalizeCorrectAnswerToUpperLetter(...)`.
  - Guarda `options` como `JSON.stringify(options)`.

Esto es coherente con la convención del punto 3.2.

---

## 5) Cambios recientes fuera de preguntas (para completar el recovery)

### 5.1 BOE monitor
- Cron diario en `vercel.json` (endpoint `app/api/cron/boe/route.ts`).
- Panel admin en `app/admin/actualizaciones-boe/page.tsx`.
- Persistencia: migración `prisma/migrations/20260206093000_boe_monitor/migration.sql`.

### 5.2 Visor PDF repositorio
- Visor: `app/repositorio/visor/[id]/page.tsx` (server) + `visor-client.tsx` (client) para garantizar que el `id` siempre llega.
- Descarga/preview: `app/api/repository/download/[id]/route.ts`.
- CSP: `middleware.ts` (incluye allowlist para `vercel.live` y `frame-src` para B2/Supabase).

---

## 6) “Punto de recuperación” real (opcional, recomendado)

Si quieres congelar este estado para poder volver exactamente a él:

1) Revisa cambios: `git status`
2) Añade todo: `git add -A`
3) Commit: `git commit -m "Recovery point 2026-02-07"`
4) Tag: `git tag recovery-2026-02-07`

Con eso podrás volver con: `git checkout recovery-2026-02-07` (o `git switch -d recovery-2026-02-07`).
