"use client";

import { ConsoleShell } from "@/components/console/console-shell";

// Slice 1 placeholder — fleshed out in Slice 5 (history list + stat cards).
export function InspeccionesClient() {
  return (
    <ConsoleShell title="Inspecciones" subtitle="Mis inspecciones realizadas" showNewButton>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <p className="text-sm text-on-surface-variant">Historial de inspecciones (próximamente).</p>
      </div>
    </ConsoleShell>
  );
}
