# Vzla EQ

Structural damage assessment platform for citizens, engineers, and admins.

## What this repo contains

- A public frontend for the citizen flow.
- A backoffice frontend for engineers and admins.
- A single Hono API entrypoint at `app/api/[...route]/route.ts`.
- Supabase auth, RBAC, and Postgres schema for incidents and engineer profiles.

## Architecture

- `app/` is frontend only.
- `api/` contains all backend logic, grouped by domain:
  - `api/auth`
  - `api/incidents`
  - `api/analysis`
- `api/app.ts` composes the feature routers.
- `proxy.ts` does optimistic redirects only.
- Supabase remains the source of truth for auth state and row-level access control.

See the full design notes in [docs/architecture.md](docs/architecture.md).

## Development

1. Install dependencies.
2. Create a `.env` file with the required Supabase and OpenAI variables.
3. Start the app:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Required environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## API surface

Auth:
- `POST /api/auth/magic-link`
- `GET /api/auth/callback`
- `GET /api/auth/me`
- `POST /api/auth/signout`

Analysis:
- `POST /api/analizar`

Incidents:
- `GET /api/incidents`
- `POST /api/incidents`
- `GET /api/incidents/:id`
- `PUT /api/incidents/:id`

## Roles

- Anonymous users can use the public assessment flow.
- Engineers can log in with a magic link and access the dashboard.
- Admins have access to all backoffice functionality.

## Supabase model

- `engineers` stores certified engineer profiles.
- `admin_users` stores admin identities.
- `incidents` stores citizen submissions and engineer-reviewed cases.
- `incident_photos` stores per-photo metadata and analysis output.

The constraints and policies are documented in [docs/architecture.md](docs/architecture.md).

## Working on the codebase

- Read [AGENTS.md](AGENTS.md) before editing backend or frontend code.
- Read [CLAUDE.md](CLAUDE.md) for the practical FE/API workflow.
- Keep UI changes in `app/`.
- Keep backend changes in `api/`.

## Validation

```bash
npm run lint
npm run build
```
