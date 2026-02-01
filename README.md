# opositAPP

A professional web application for interactive questionnaires on Spanish Social Security oppositions.

## Features

- User authentication with login/password
- Admin panel for uploading theory and practical case questionnaires
- User dashboard for selecting and taking quizzes
- Scoring system with explanations for incorrect answers
- Victory animations and confetti for full scores

## Monetization (Ko-fi + Ads)

- Donations: In the admin panel, open Monetización → activate Donaciones and paste your Ko-fi page URL (for example https://ko-fi.com/tu_nombre). Ko-fi and Patreon buttons render in the user dashboard and at the end of tests when Donaciones está activado.
- Ads: In Monetización, enable Publicidad and set your AdSense client ID (formato ca-pub-XXXXXXXXXXXXXXX) to replace the default fallback.
- Afiliados/Patrocinio: Optional; fill IDs/URLs in the same screen when you want them live.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Access

For security, admin credentials are not stored in this README. Use the existing scripts under `scripts/` to manage or reset admin access.

Example (reset admin password):

```bash
NEW_ADMIN_PASSWORD='REPLACE_ME' node scripts/reset-admin-password.mjs
```

## Temario Storage (Private)

In production, large temario files are served from private storage (Backblaze B2 S3-compatible). The app expects object keys in the format:

`<categoria>/<fileName>` (e.g. `general/tema1_constitucion.txt`, `especifico/TEMA 1.pdf`).

Recommended: use a dedicated bucket for temario (separate from other assets) via env vars:

- `B2_TEMARIO_S3_BUCKET` (or `B2_TEMARIO_BUCKET`)
- Reuse endpoint/region/credentials from `B2_S3_*` unless you want to override them with `B2_TEMARIO_S3_*`.

To check what is missing in B2 and optionally upload from a local folder:

```bash
# Report missing objects
node scripts/b2-temario-sync.mjs --dry-run --env prod

# Upload missing (source folder can contain general/ and especifico/ subfolders)
node scripts/b2-temario-sync.mjs --apply --source /PATH/TO/TEMARIO
```

## Technologies

- Next.js
- TypeScript
- Tailwind CSS
- ESLint
# Test Preview Deployment