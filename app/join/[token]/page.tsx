import Link from "next/link";

import { RegistrationForm } from "@/app/register/page";

// Public invite-link entry point. Resolves the token server-side and renders the
// registration form attributed to the inviting source. Invalid/inactive tokens
// fall back to a friendly message + the plain /register link.
async function resolveInvite(token: string): Promise<{ valid: boolean; name: string | null }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/invites/resolve/${encodeURIComponent(token)}`, { cache: "no-store" });
    const body = (await res.json()) as { data?: { valid: boolean; name: string | null } };
    return body.data ?? { valid: false, name: null };
  } catch {
    return { valid: false, name: null };
  }
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await resolveInvite(token);

  if (!invite.valid) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="font-heading text-2xl font-bold text-on-surface">Enlace de invitación no válido</h1>
        <p className="max-w-md text-sm text-on-surface-variant">
          Este enlace ha expirado o fue desactivado. Aún puedes postularte como ingeniero desde el
          registro general.
        </p>
        <Link
          href="/register"
          className="inline-flex h-11 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Ir al registro
        </Link>
      </div>
    );
  }

  return <RegistrationForm inviteToken={token} inviteName={invite.name ?? undefined} />;
}
