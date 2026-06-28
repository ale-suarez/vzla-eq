import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/api/lib/supabase";

export type AppRole = "anonymous" | "engineer" | "reviewer" | "admin";

const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  if (!supabaseSecretKey) {
    return { user, role: "anonymous" };
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data: admin } = await adminSupabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (admin) {
    return { user, role: "admin" };
  }

  const { data: reviewer } = await adminSupabase
    .from("reviewer_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (reviewer) {
    return { user, role: "reviewer" };
  }

  const { data: engineerByUserId } = await adminSupabase
    .from("engineers")
    .select("is_certified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (engineerByUserId?.is_certified) {
    return { user, role: "engineer" };
  }

  let engineerByEmail: { id: string; is_certified: boolean; user_id: string | null } | null = null;
  if (user.email) {
    const { data } = await adminSupabase
      .from("engineers")
      .select("id, is_certified, user_id")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    engineerByEmail = data ?? null;

    if (engineerByEmail?.is_certified) {
      if (!engineerByEmail.user_id) {
        await adminSupabase.from("engineers").update({ user_id: user.id }).eq("id", engineerByEmail.id);
      }

      return { user, role: "engineer" };
    }
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
