# Architecture

## Overview

This project is split into two hard layers:

- `app/` is frontend only.
- `api/` is backend only, served through Hono from `app/api/[...route]/route.ts`.

The goal is to keep presentation, server orchestration, and data access separate.

## Frontend Model

The frontend lives in `app/` and should only contain:

- route pages
- client components
- styling and local UI state

Frontend code does not talk to Supabase directly for protected data. Instead it calls the Hono API with `fetch()`.

Examples:

- the dashboard loads session state from `GET /api/auth/me`
- the dashboard loads incident lists from `GET /api/incidents`
- incident detail pages load a single record from `GET /api/incidents/:id`
- create/update forms send JSON to `POST /api/incidents` and `PUT /api/incidents/:id`

## API Model

The API is composed in `api/app.ts`.

There is one Hono application, and feature folders register routes into it:

- `api/auth/routes.ts`
- `api/incidents/routes.ts`
- `api/analysis/routes.ts`

This avoids creating many isolated Hono apps while still keeping the code organized by domain.

### API composition flow

1. `app/api/[...route]/route.ts` forwards all API requests into the Hono app.
2. `api/app.ts` calls the feature registration functions.
3. Each feature folder exports handlers and route registration helpers.
4. Shared auth and Supabase helpers live in `api/lib/`.

## Authentication

Authentication is Supabase auth using magic links.

Flow:

1. An engineer opens `/login`.
2. The frontend posts the email to `POST /api/auth/magic-link`.
3. Supabase sends a login email with a callback link.
4. The callback hits `GET /api/auth/callback`.
5. The callback exchanges the code for a session and writes cookies.
6. The user lands on `/dashboard`.

Additional endpoints:

- `GET /api/auth/me` returns the current session summary for the UI.
- `POST /api/auth/signout` clears the Supabase session.

## RBAC

The role model has three tiers:

- `anonymous`
- `engineer`
- `admin`

Role resolution happens in backend code through `api/lib/auth.ts`.

Current rules:

- anonymous users can use the public assessment flow
- engineers must be present in `engineers` with `is_certified = true`
- admins must be present in `admin_users`

The API uses those roles to guard backoffice endpoints.

### Why both API checks and database policies exist

The API checks are for application-level authorization.
The Supabase policies are for defense in depth.

That means:

- the API refuses unauthorized requests early
- the database still blocks direct access if a bypass happens

## Supabase Schema

### `engineers`

Profile table for certified engineers.

- `id uuid primary key references auth.users(id)`
- `full_name text`
- `license_number text`
- `is_certified boolean not null default false`
- `created_at timestamptz not null default now()`

Use:

- gates backoffice access for engineer users

### `admin_users`

Admin identity table.

- `id uuid primary key references auth.users(id)`
- `created_at timestamptz not null default now()`

Use:

- grants unrestricted backoffice permissions

### `incidents`

Core evaluation record.

Important columns:

- `id uuid primary key`
- `analysis_status analysis_status`
- `ai_verdict verdict_level`
- `confidence int4`
- `finding text`
- `severity verdict_level`
- `state incident_state`
- `assigned_to uuid references engineers(id)`
- `feedback text`
- `latitude float8`
- `longitude float8`
- `contact text`
- `building_use text`
- `build_year int4`
- `levels int4`
- `basements int4`
- `material text`
- `terrain_type text`
- `created_at timestamptz`
- `updated_at timestamptz`

Use:

- citizen submissions
- AI analysis results
- engineer review and resolution

### `incident_photos`

Per-photo record linked to an incident.

Important columns:

- `id uuid primary key`
- `incident_id uuid references incidents(id)`
- `storage_path text`
- `position int4`
- `quality text`
- `verdict verdict_level`
- `confidence int4`
- `finding text`
- `escalated boolean`
- `created_at timestamptz`

Use:

- photo-level analysis results
- storage metadata for private bucket objects

## Enums

- `verdict_level`: `low`, `moderate`, `severe`, `critical`
- `incident_state`: `pending`, `in_review`, `resolved`, `archived`
- `analysis_status`: `pending`, `complete`, `failed`

## API Endpoint Map

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

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

## Practical Rules

- Do not add backend code to `app/`.
- Do not instantiate new Hono apps for each feature.
- Add new backend work under `api/<feature>/`.
- Keep route registration centralized in `api/app.ts`.
- Keep Supabase access helpers in `api/lib/`.
