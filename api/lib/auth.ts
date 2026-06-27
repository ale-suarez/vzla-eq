import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/api/lib/supabase";

export type AppRole = "anonymous" | "engineer" | "admin";

export interface SessionContext {
  user: User | null;
  role: AppRole;
}

export async function getSessionContext(): Promise<SessionContext> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return { user: null, role: "anonymous" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: "anonymous" };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (admin) {
    return { user, role: "admin" };
  }

  const { data: engineer } = await supabase
    .from("engineers")
    .select("is_certified")
    .eq("id", user.id)
    .maybeSingle();

  if (engineer?.is_certified) {
    return { user, role: "engineer" };
  }

  return { user, role: "anonymous" };
}

export function hasBackofficeAccess(role: AppRole) {
  return role === "engineer" || role === "admin";
}

export function hasAdminAccess(role: AppRole) {
  return role === "admin";
}
