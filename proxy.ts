import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

function isBackofficePath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isReviewPath(pathname: string) {
  return pathname === "/revision-solicitudes" || pathname.startsWith("/revision-solicitudes/");
}

async function resolveRole(request: NextRequest, response: NextResponse) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return { role: "anonymous" as const };
  }

  const sessionClient = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !supabaseSecretKey) {
    return { role: "anonymous" as const };
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey);

  const { data: admin } = await adminClient.from("admin_users").select("id").eq("id", user.id).maybeSingle();

  if (admin) {
    return { role: "admin" as const };
  }

  const { data: reviewer } = await adminClient.from("reviewer_users").select("id").eq("id", user.id).maybeSingle();

  if (reviewer) {
    return { role: "reviewer" as const };
  }

  const { data: engineerByUserId } = await adminClient
    .from("engineers")
    .select("is_certified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (engineerByUserId?.is_certified) {
    return { role: "engineer" as const };
  }

  if (user.email) {
    const { data: engineerByEmail } = await adminClient
      .from("engineers")
      .select("id, is_certified, user_id")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    if (engineerByEmail?.is_certified) {
      if (!engineerByEmail.user_id) {
        await adminClient.from("engineers").update({ user_id: user.id }).eq("id", engineerByEmail.id);
      }

      return { role: "engineer" as const };
    }
  }

  return { role: "anonymous" as const };
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const { role } = await resolveRole(request, response);

  if (pathname === "/login" && role !== "anonymous") {
    const destination = role === "reviewer" ? "/revision-solicitudes" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isBackofficePath(pathname) && role === "anonymous") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("reason", "auth");
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isReviewPath(pathname) && role === "anonymous") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("reason", "auth");
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isBackofficePath(pathname) && role === "reviewer") {
    return NextResponse.redirect(new URL("/revision-solicitudes", request.url));
  }

  if (isReviewPath(pathname) && role === "engineer") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/revision-solicitudes/:path*"],
};
