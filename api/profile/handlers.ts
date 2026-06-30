import type { Context } from "hono";

import { getSessionContext, hasBackofficeAccess } from "@/api/lib/auth";
import { createSupabaseAdminClient } from "@/api/lib/supabase";
import type { Database } from "@/lib/database.types";
import { profileUpdateSchema, type Profile } from "@/api/profile/schemas";

type EngineerUpdate = Database["public"]["Tables"]["engineers"]["Update"];

const ENGINEER_COLUMNS =
  "id, user_id, email, full_name, document_number, license_number, specialty, phone, city, is_certified";

// Resolve the signed-in engineer's row by user_id, falling back to email
// (mirrors the link logic in getSessionContext / proxy).
async function findEngineer(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  email: string | null,
) {
  const byUserId = await supabase.from("engineers").select(ENGINEER_COLUMNS).eq("user_id", userId).maybeSingle();
  if (byUserId.data) return byUserId.data;
  if (email) {
    const byEmail = await supabase.from("engineers").select(ENGINEER_COLUMNS).eq("email", email.toLowerCase()).maybeSingle();
    if (byEmail.data) return byEmail.data;
  }
  return null;
}

export async function profileGet(c: Context) {
  const { role, user } = await getSessionContext();
  if (!hasBackofficeAccess(role) || !user) {
    return c.json({ error: "No autorizado." }, 403);
  }

  const supabase = createSupabaseAdminClient();
  const eng = await findEngineer(supabase, user.id, user.email ?? null);

  const profile: Profile = {
    fullName: eng?.full_name ?? null,
    email: eng?.email ?? user.email ?? null,
    documentNumber: eng?.document_number ?? null,
    licenseNumber: eng?.license_number ?? null,
    specialty: eng?.specialty ?? null,
    phone: eng?.phone ?? null,
    city: eng?.city ?? null,
    isCertified: eng?.is_certified ?? false,
    role: role === "admin" ? "admin" : "engineer",
  };

  return c.json({ data: profile });
}

export async function profilePatch(c: Context) {
  const { role, user } = await getSessionContext();
  if (!hasBackofficeAccess(role) || !user) {
    return c.json({ error: "No autorizado." }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Datos de perfil inválidos.", details: parsed.error.flatten() }, 400);
  }

  const supabase = createSupabaseAdminClient();
  const eng = await findEngineer(supabase, user.id, user.email ?? null);
  if (!eng) {
    return c.json({ error: "Perfil de ingeniero no encontrado." }, 404);
  }

  const u = parsed.data;
  const update: EngineerUpdate = {};
  if (u.fullName !== undefined) update.full_name = u.fullName;
  if (u.documentNumber !== undefined) update.document_number = u.documentNumber;
  if (u.licenseNumber !== undefined) update.license_number = u.licenseNumber;
  if (u.specialty !== undefined) update.specialty = u.specialty;
  if (u.phone !== undefined) update.phone = u.phone;
  if (u.city !== undefined) update.city = u.city;
  // Ensure the row is linked to this auth user going forward.
  if (!eng.user_id) update.user_id = user.id;

  const { error } = await supabase.from("engineers").update(update).eq("id", eng.id);
  if (error) {
    return c.json({ error: error.message }, 400);
  }

  return c.json({ data: { ok: true } });
}
