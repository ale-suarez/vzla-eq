import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/api/lib/supabase";

export type AppRole = "anonymous" | "engineer" | "reviewer" | "admin";

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

  const { data: reviewer } = await supabase
    .from("reviewer_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (reviewer) {
    return { user, role: "reviewer" };
  }

  const { data: engineerByUserId } = await supabase
    .from("engineers")
    .select("is_certified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (engineerByUserId?.is_certified) {
    return { user, role: "engineer" };
  }

  let engineerByEmail = null as { is_certified: boolean } | null;
  if (user.email) {
    const { data } = await supabase
      .from("engineers")
      .select("is_certified")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    engineerByEmail = data ?? null;
  }

  if (engineerByEmail?.is_certified) {
    return { user, role: "engineer" };
  }

  return { user, role: "anonymous" };
}

export function hasBackofficeAccess(role: AppRole) {
  return role === "engineer" || role === "admin";
}

export function hasReviewAccess(role: AppRole) {
  return role === "reviewer" || role === "admin";
}

export function hasAdminAccess(role: AppRole) {
  return role === "admin";
}
