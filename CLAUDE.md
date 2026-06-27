@AGENTS.md

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses a nonstandard App Router setup. Read the relevant guide in `node_modules/next/dist/docs/` before changing routing or API code.
<!-- END:nextjs-agent-rules -->

## Repo Rules

- `app/` is frontend only.
- All backend/API logic lives under `api/` and is served through `app/api/[...route]/route.ts`.
- Use one Hono app in `api/app.ts` and register feature routers from folders such as `api/auth`, `api/incidents`, and `api/analysis`.
- Do not instantiate separate Hono apps per feature.
- Keep Supabase access helpers in `api/lib/`.
- Keep shared request/response DTO schemas in `api/lib/schemas.ts`.

## Frontend Rules

- Put pages, components, and UI state in `app/`.
- Frontend code should call the Hono API with `fetch()` instead of talking to protected Supabase tables directly.
- Keep authenticated dashboard logic in client components that read from `/api/auth/me` and domain endpoints.

## API Rules

- Add routes by feature folder, for example:
  - `api/auth/routes.ts`
  - `api/incidents/routes.ts`
  - `api/analysis/routes.ts`
- Use Zod schemas for request and response validation.
- Keep Swagger/OpenAPI output for development only.
- Do not expose public API docs in production.

## Auth And RBAC

- Use Supabase auth with magic-link login.
- Role order is `anonymous`, `engineer`, `admin`.
- Engineers are certified users stored in `engineers`.
- Admins are stored in `admin_users`.
- Use backend authorization checks plus Supabase RLS policies for defense in depth.

## Environment Variables

- Browser-safe:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- Server-only:
  - `SUPABASE_SECRET_KEY`
  - `OPENAI_API_KEY`

## Workflow

- Read `README.md` and `docs/architecture.md` before changing auth, API, or schema code.
- Keep docs aligned with implementation.
- Validate changes with `npm run lint` and `npm run build`.
