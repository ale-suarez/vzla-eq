import type { Context } from "hono";
import { randomBytes } from "node:crypto";

import { getSessionContext, hasAdminAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";
import { inviteCreateSchema, inviteUpdateSchema, type InviteSource } from "@/api/invites/schemas";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function joinUrl(token: string) {
  return `${siteUrl()}/join/${token}`;
}

// Short, URL-safe, non-guessable token (base36 of random bytes).
function makeToken(): string {
  return randomBytes(6).toString("hex").slice(0, 8);
}

// POST /api/invites — create a named invite source (admin).
export async function invitesPost(c: Context) {
  const { role, user } = await getSessionContext();
  if (!hasAdminAccess(role)) return c.json({ error: "No autorizado." }, 403);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }
  const parsed = inviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Nombre inválido." }, 400);
  }

  const supabase = createSupabaseAdminClient();

  // Retry a few times on the (very unlikely) unique-token collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = makeToken();
    const { data, error } = await supabase
      .from("engineer_invite_sources")
      .insert({ name: parsed.data.name, token, created_by: user?.id ?? null })
      .select("id, name, token, is_active, created_at")
      .single();

    if (!error && data) {
      const out: InviteSource = {
        id: data.id,
        name: data.name,
        token: data.token,
        url: joinUrl(data.token),
        isActive: data.is_active,
        count: 0,
        createdAt: data.created_at,
      };
      return c.json({ data: out }, 201);
    }
    // 23505 = unique_violation → retry with a new token; otherwise fail.
    if (error && error.code !== "23505") {
      return c.json({ error: error.message }, 400);
    }
  }
  return c.json({ error: "No se pudo generar un token único." }, 500);
}

// GET /api/invites — list sources with their application counts (admin).
export async function invitesGet(c: Context) {
  const { role } = await getSessionContext();
  if (!hasAdminAccess(role)) return c.json({ error: "No autorizado." }, 403);

  const supabase = createSupabaseAdminClient();
  const { data: sources, error } = await supabase
    .from("engineer_invite_sources")
    .select("id, name, token, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);

  // Count engineers per source.
  const { data: engineers } = await supabase.from("engineers").select("invite_source_id");
  const counts = new Map<string, number>();
  for (const e of engineers ?? []) {
    if (e.invite_source_id) counts.set(e.invite_source_id, (counts.get(e.invite_source_id) ?? 0) + 1);
  }

  const out: InviteSource[] = (sources ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    token: s.token,
    url: joinUrl(s.token),
    isActive: s.is_active,
    count: counts.get(s.id) ?? 0,
    createdAt: s.created_at,
  }));
  return c.json({ data: out });
}

// PATCH /api/invites/:id — toggle is_active (admin).
export async function inviteByIdPatch(c: Context) {
  const { role } = await getSessionContext();
  if (!hasAdminAccess(role)) return c.json({ error: "No autorizado." }, 403);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing id." }, 400);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }
  const parsed = inviteUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Datos inválidos." }, 400);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("engineer_invite_sources")
    .update({ is_active: parsed.data.isActive })
    .eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ok: true } });
}

// GET /api/invites/resolve/:token — PUBLIC. For the /join page to show who
// invited and reject inactive/unknown links. Returns only { valid, name }.
export async function inviteResolveGet(c: Context) {
  const token = c.req.param("token");
  if (!token) return c.json({ data: { valid: false, name: null } });

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("engineer_invite_sources")
    .select("name, is_active")
    .eq("token", token)
    .maybeSingle();

  if (!data || !data.is_active) {
    return c.json({ data: { valid: false, name: null } });
  }
  return c.json({ data: { valid: true, name: data.name } });
}
