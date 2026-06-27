import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { generateCookie, getCookie } from "hono/cookie";
import type { Context } from "hono";

import { getSessionContext, hasBackofficeAccess } from "@/api/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function authCallbackGet(c: Context) {
  const requestUrl = new URL(c.req.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

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

  headers.set("Location", new URL(next, requestUrl.origin).toString());
  return new Response(null, { status: 302, headers });
}

export async function authMagicLinkPost(c: Context) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return c.json({ error: "Servicio no configurado correctamente." }, 500);
  }

  let body: { email?: string };
  try {
    body = (await c.req.json()) as { email?: string };
  } catch {
    return c.json({ error: "Cuerpo inválido." }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return c.json({ error: "Ingresa un correo válido." }, 400);
  }

  const origin = c.req.header("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ message: "Te enviamos un enlace de acceso. Revisa tu correo." });
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
