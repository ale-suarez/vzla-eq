<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## App/API Split

- `app/` is UI only.
- All backend/API logic must live behind Hono in `app/api/[...route]/route.ts`.
- Prefer feature folders like `api/auth`, `api/incidents`, and `api/analysis`.
- In each feature folder, export route-registration functions such as `registerAuthRoutes(app)` instead of instantiating new Hono apps in every file.
