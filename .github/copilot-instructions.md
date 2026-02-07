- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements

- [x] Scaffold the Project

# Copilot instructions (opositAPP)

## Big picture
- Next.js App Router app: pages and APIs live under `app/` (routes in `app/api/**/route.ts`).
- Data layer is PostgreSQL via Prisma (`prisma/schema.prisma`, client in `src/lib/prisma.ts`).
- Auth is NextAuth Credentials (`src/lib/auth.ts`) and is enforced in `middleware.ts`.
- Key subsystems: monetization/Stripe, RAG/AI (Groq), document repository (Backblaze B2/Supabase).

## Local workflows
- Dev: `npm install` then `npm run dev`.
- Build/lint: `npm run lint`, `npm run build`.
- Useful VS Code tasks: `Run Development Server`, `Build (Production)`, plus “safe” DB ops in `.vscode/tasks.json`.

## Critical data convention: `Question.correctAnswer`
- Canonical storage is ALWAYS a single uppercase letter: `A|B|C|D`.
- Canonical `Question.options` storage is a JSON stringified array of 4 non-empty strings.
- When reading legacy data, parse with `safeParseOptions(...)` (`src/lib/answer-normalization.ts`).
- Before any DB write (API routes, scripts, imports), normalize via `normalizeCorrectAnswerToUpperLetter(correctAnswer, options)`.
- If options are invalid or correct answer can’t be inferred, fail fast with `400` (don’t persist mixed formats).

## Auth & access patterns
- API routes typically use `getServerSession(authOptions)`; see `app/api/ai/chat/route.ts`.
- “Allowed phones only” is enforced during registration and in the JWT callback; do not bypass it (`app/api/auth/register/route.ts`, `src/lib/auth.ts`).
- Admin checks use `String(session.user.role).toLowerCase() === 'admin'`.
- Repository editing uses `user.repoRole` (`READER|EDITOR`) in addition to admin; see `app/api/repository/upload/route.ts` and `src/lib/repository-security.ts`.

## Prisma/Postgres notes (Supabase/PgBouncer)
- Always import the shared Prisma instance from `src/lib/prisma.ts`.
- That wrapper forces PgBouncer-safe params (`statement_cache_size=0`) to avoid prepared-statement collisions.

## Storage: repository + temario
- Repository documents upload to Backblaze B2 if configured; otherwise fallback to Supabase Storage (`app/api/repository/upload/route.ts`).
- B2 S3 config helpers live in `src/lib/external-file.ts` and `src/lib/b2.ts`.

## AI/RAG
- RAG context search is keyword-based with optional embeddings (`src/lib/rag-system.ts`).
- Groq calls use fetch and require `GROQ_API_KEY` (`src/lib/groq.ts`).

## Security & observability
- `middleware.ts` sets CSP/security headers and implements API rate limiting.
- Central error logging writes to DB and can email admins (`src/lib/error-logger.ts`, endpoint `app/api/admin/log-error/route.ts`).

## Env configuration
- Use `.env.example` as the source of truth for required env vars.
- Email prefers Resend (`RESEND_API_KEY`, `EMAIL_FROM`) with SMTP/Gmail fallbacks (`src/lib/email.ts`).
- Email verification enforcement is gated by `ENFORCE_EMAIL_VERIFICATION` + `EMAIL_VERIFICATION_ENFORCE_AFTER`.