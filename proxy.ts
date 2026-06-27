import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isBackofficePath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

async function resolveRole(request: NextRequest, response: NextResponse) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return { role: "anonymous" as const };
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
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
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: "anonymous" as const };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (admin) {
    return { role: "admin" as const };
  }

  const { data: engineer } = await supabase
    .from("engineers")
    .select("is_certified")
    .eq("id", user.id)
    .maybeSingle();

  if (engineer?.is_certified) {
    return { role: "engineer" as const };
  }

  return { role: "anonymous" as const };
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  const { role } = await resolveRole(request, response);

  if (pathname === "/login" && role !== "anonymous") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isBackofficePath(pathname) && role === "anonymous") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("reason", "auth");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
