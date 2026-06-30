"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { X } from "lucide-react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { cn } from "@/lib/utils";
import { VERDICT_LABELS, type VerdictLevel } from "@/lib/assessment";
import { fromDbIncident, VERDICT_RISK, type DbIncident, type Incident } from "@/lib/incidents";

// MapLibre is browser-only WebGL — load the client map without SSR.
const IncidentMap = dynamic(() => import("@/components/backoffice/incident-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e9edf6] text-sm text-on-surface-variant">
      Cargando mapa…
    </div>
  ),
});

// Severity legend, worst → best (matches the map markers).
const LEGEND: { level: VerdictLevel; color: string }[] = [
  { level: "completo", color: "#ba1a1a" },
  { level: "severo", color: "#ea8a00" },
  { level: "moderado", color: "#2563eb" },
  { level: "menor", color: "#16a34a" },
];

export function DashboardClient() {
  const user = useConsoleUser();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((body: { data?: DbIncident[]; error?: string }) => {
        if (!active) return;
        if (body.error) {
          setError(body.error);
          return;
        }
        setIncidents((body.data ?? []).map(fromDbIncident));
      })
      .catch(() => active && setError("No se pudieron cargar los incidentes."));
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(() => incidents.find((i) => i.id === selectedId) ?? null, [incidents, selectedId]);

  return (
    <ConsoleShell title="Mapa" subtitle="Incidentes reportados en vivo" showLive showNewButton user={user}>
      <div className="h-full p-4 md:p-6">
        <section className="relative h-full overflow-hidden rounded-[16px] border border-[#e8eaf2] bg-[#e9edf6] shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <IncidentMap incidents={incidents} selectedId={selectedId} onSelect={(id) => setSelectedId((p) => (p === id ? null : id))} />

          {/* Severity legend (top-left glass) */}
          <div className="absolute left-3.5 top-3.5 rounded-[11px] border border-[#e6e8f1] bg-white/80 px-3 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,.06)] backdrop-blur">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a8fa0]">Severidad</div>
            <div className="flex flex-col gap-1.5">
              {LEGEND.map(({ level, color }) => (
                <div key={level} className="flex items-center gap-2 text-[11.5px] text-[#434655]">
                  <span className="h-[9px] w-[9px] rounded-full" style={{ background: color }} />
                  {VERDICT_LABELS[level]}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="absolute right-3.5 top-3.5 rounded-[10px] bg-error-container px-3 py-2 text-sm text-on-error-container">
              {error}
            </div>
          )}

          {/* Hint when nothing selected */}
          {!selected && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-[10px] bg-[#0f1423]/80 px-4 py-2.5 text-[12.5px] font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,.2)] backdrop-blur">
              Toque un punto del mapa para ver el detalle del incidente
            </div>
          )}

          {/* Detail panel (bottom-left) */}
          {selected && <DetailPanel incident={selected} onClose={() => setSelectedId(null)} />}
        </section>
      </div>
    </ConsoleShell>
  );
}

function DetailPanel({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const risk = VERDICT_RISK[incident.verdict];
  return (
    <div className="absolute bottom-4 left-4 w-[330px] max-w-[calc(100%-2rem)] rounded-[16px] border border-[#e6e8f1] bg-white p-[17px] shadow-[0_8px_30px_rgba(15,25,55,.16)]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="font-heading text-[15.5px] font-bold leading-tight text-[#15171d]">{incident.title}</div>
          <div className="mt-0.5 text-[11.5px] text-[#7a7f90]">
            ID {incident.id.slice(0, 8)} · {incident.meta}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f9] text-[#6b6f80] hover:bg-[#e6e8f1]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Risk bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="uppercase tracking-[0.05em] text-[#8a8fa0]">Riesgo</span>
          <span className={cn(risk.text)}>{VERDICT_LABELS[incident.verdict]}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef0f6]">
          <div className={cn("h-full rounded-full", risk.bar)} style={{ width: `${risk.pct}%` }} />
        </div>
      </div>

      <div className="mt-3 text-[12px] text-[#434655]">
        <span className="text-[#8a8fa0]">Inspeccionado por:</span> {incident.assignee ?? "—"}
      </div>

      <Link
        href={`/dashboard/incidents/${incident.id}`}
        className="mt-3.5 block w-full rounded-[10px] bg-primary py-2.5 text-center text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Ver planilla completa
      </Link>
    </div>
  );
}
