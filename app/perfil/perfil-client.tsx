"use client";

import { ConsoleShell } from "@/components/console/console-shell";

// Slice 1 placeholder — fleshed out in Slice 5 (profile card + form + sign-out).
export function PerfilClient() {
  return (
    <ConsoleShell title="Perfil" subtitle="Datos del ingeniero" showNewButton>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <p className="text-sm text-on-surface-variant">Perfil del ingeniero (próximamente).</p>
      </div>
    </ConsoleShell>
  );
}
