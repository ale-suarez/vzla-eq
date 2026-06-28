import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { generateCookie, getCookie } from "hono/cookie";
import type { Context } from "hono";

import { getSessionContext, hasBackofficeAccess, hasReviewAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalizeNextPath(next: string | null | undefined, fallback: string) {
  const value = String(next ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export async function authCallbackGet(c: Context) {
  const requestUrl = new URL(c.req.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"), "/dashboard");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (!supabaseUrl || !supabasePublishableKey || !code) {
    return c.redirect("/login?reason=auth");
  }

  const headers = new Headers();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookie(c)).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headersToSet) {
        for (const [name, value] of Object.entries(headersToSet)) {
          headers.set(name, value);
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("Set-Cookie", generateCookie(name, value, options as never));
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return c.redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = safeNext;
  if (user && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    const adminSupabase = createSupabaseAdminClient();

    const { data: admin } = await adminSupabase.from("admin_users").select("id").eq("id", user.id).maybeSingle();
    const { data: reviewer } = await adminSupabase.from("reviewer_users").select("id").eq("id", user.id).maybeSingle();
    const { data: engineerByUserId } = await adminSupabase
      .from("engineers")
      .select("id, is_certified, user_id, email")
      .eq("user_id", user.id)
      .maybeSingle();
    const engineerByEmail =
      !engineerByUserId && user.email
        ? (
            await adminSupabase
              .from("engineers")
              .select("id, is_certified, user_id, email")
              .eq("email", user.email.toLowerCase())
              .maybeSingle()
          ).data
        : null;
    const engineer = engineerByUserId ?? engineerByEmail;

    if (admin) {
      destination = "/dashboard";
    } else if (reviewer) {
      destination = "/revision-solicitudes";
    } else if (engineer?.is_certified) {
      if (engineer.email && !engineer.user_id) {
        await adminSupabase.from("engineers").update({ user_id: user.id }).eq("id", engineer.id);
      }

      destination = "/dashboard";
    }
  }

  headers.set("Location", new URL(destination, requestUrl.origin).toString());
  return new Response(null, { status: 302, headers });
}

export async function authMagicLinkPost(c: Context) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  let body: { email?: string; next?: string };
  try {
    body = (await c.req.json()) as { email?: string; next?: string };
  } catch {
    return c.json({ error: "Cuerpo inválido." }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const next = normalizeNextPath(body.next, "/dashboard");
  if (!email) {
    return c.json({ error: "Ingresa un correo válido." }, 400);
  }

  const origin = c.req.header("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ message: "Te enviamos un enlace de acceso. Revisa tu correo." });
}

export async function authSessionPost(c: Context) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  let body: { access_token?: string; refresh_token?: string; next?: string };
  try {
    body = (await c.req.json()) as { access_token?: string; refresh_token?: string; next?: string };
  } catch {
    return c.json({ error: "Cuerpo inválido." }, 400);
  }

  const accessToken = String(body.access_token ?? "").trim();
  const refreshToken = String(body.refresh_token ?? "").trim();
  const next = normalizeNextPath(body.next, "/dashboard");

  if (!accessToken || !refreshToken) {
    return c.json({ error: "Sesión inválida." }, 400);
  }

  const headers = new Headers();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookie(c)).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headersToSet) {
        for (const [name, value] of Object.entries(headersToSet)) {
          headers.set(name, value);
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("Set-Cookie", generateCookie(name, value, options as never));
        });
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data: { authenticated: true, next } }, 200, Object.fromEntries(headers.entries()));
}

export async function authMeGet(c: Context) {
  const { user, role } = await getSessionContext();

  if (!user) {
    return c.json({ data: { authenticated: false, role: "anonymous" } }, 401);
  }

  return c.json({
    data: {
      authenticated: true,
      role,
      email: user.email,
      id: user.id,
      backoffice: hasBackofficeAccess(role),
      reviewer: hasReviewAccess(role),
    },
  });
}

export async function authSignOutPost(c: Context) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  const headers = new Headers();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookie(c)).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headersToSet) {
        for (const [name, value] of Object.entries(headersToSet)) {
          headers.set(name, value);
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("Set-Cookie", generateCookie(name, value, options as never));
        });
      },
    },
  });

  await supabase.auth.signOut();
  headers.set("Location", new URL("/", c.req.url).toString());
  return new Response(null, { status: 302, headers });
}
