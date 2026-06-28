"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  List,
  Map as MapIcon,
  Plus,
  User,
  UserX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { NewIncidentForm } from "@/app/dashboard/new-incident-form";
import { IncidentCard } from "@/app/dashboard/incident-card";
import { DashboardTopBar } from "@/app/dashboard/dashboard-top-bar";
import { cn } from "@/lib/utils";
import { INCIDENT_STATE_LABELS, VERDICT_LABELS, type VerdictLevel } from "@/lib/assessment";
import { fromDbIncident, VERDICT_RISK, type DbIncident, type Incident } from "@/lib/incidents";

// MapLibre is browser-only WebGL — load the client map without SSR.
const IncidentMap = dynamic(() => import("@/components/backoffice/incident-map"), {
  ssr: false,
  loading: () => (
    <div className="map-grid flex h-full w-full items-center justify-center bg-surface-container-low text-sm text-on-surface-variant">
      Cargando mapa…
    </div>
  ),
});

// Severity filter order (mirrors the map legend). "Todos" handled separately.
const SEVERITY_FILTERS: VerdictLevel[] = ["critical", "severe", "moderate", "low"];

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "admin";
  email?: string;
  backoffice?: boolean;
};

export function DashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [filter, setFilter] = useState<VerdictLevel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const sessionResponse = await fetch("/api/auth/me");
      const sessionBody = (await sessionResponse.json()) as { data?: SessionData; error?: string };

      if (!active) {
        return;
      }

      if (!sessionResponse.ok || !sessionBody.data?.backoffice) {
        router.replace("/login?reason=auth");
        return;
      }

      setSession(sessionBody.data);

      const incidentsResponse = await fetch("/api/incidents");
      const incidentsBody = (await incidentsResponse.json()) as {
        data?: DbIncident[];
        error?: string;
      };

      if (!active) {
        return;
      }

      if (!incidentsResponse.ok) {
        setError(incidentsBody.error ?? "No se pudieron cargar los incidentes.");
        setLoading(false);
        return;
      }

      setIncidents((incidentsBody.data ?? []).map(fromDbIncident));
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  const counts = useMemo(() => {
    const c: Record<VerdictLevel, number> = { critical: 0, severe: 0, moderate: 0, low: 0 };
    for (const i of incidents) c[i.verdict] += 1;
    return c;
  }, [incidents]);

  const visible = useMemo(
    () => (filter === "all" ? incidents : incidents.filter((i) => i.verdict === filter)),
    [incidents, filter]
  );

  const selected = useMemo(() => visible.find((i) => i.id === selectedId) ?? null, [visible, selectedId]);

  const handleSelect = (id: string) => setSelectedId((prev) => (prev === id ? null : id));

  const handleIncidentCreated = (incident: DbIncident) => {
    const next = fromDbIncident(incident);

    setIncidents((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setFilter("all");
    setSelectedId(next.id);
  };

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      <div className="flex min-h-dvh flex-col">
        <DashboardTopBar
          title="Dashboard de Incidentes"
          subtitle={session?.email ? `${session.email} · ${session.role === "admin" ? "Admin" : "Ingeniero"}` : "Validando acceso..."}
          rightSlot={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm((v) => !v)}
                className="hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition-opacity hover:opacity-90 md:flex"
              >
                <Plus className="h-4 w-4" />
                Crear Incidencia
              </button>
            </div>
          }
        />

        {/* New-incident form (toggle) */}
        {showForm && (
          <div className="border-b border-outline-variant bg-surface px-5 py-4">
            <NewIncidentForm onCreated={handleIncidentCreated} />
          </div>
        )}

        {/* Mobile MAP / LIST toggle */}
        <div className="border-b border-outline-variant bg-surface px-5 py-3 md:hidden">
          <div className="flex w-full rounded-full border border-outline-variant bg-surface-container-low p-1">
            {(["map", "list"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setMobileView(view)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors",
                  mobileView === view ? "bg-primary text-white" : "text-on-surface-variant"
                )}
              >
                {view === "map" ? <MapIcon className="h-4 w-4" /> : <List className="h-4 w-4" />}
                {view === "map" ? "Mapa" : "Lista"}
              </button>
            ))}
          </div>
        </div>

        {/* Main: split on desktop, single view on mobile */}
        <main className="flex flex-1 overflow-hidden">
          {/* List column */}
          <section
            className={cn(
              "flex w-full flex-col border-r border-outline-variant bg-background md:w-1/2 md:min-w-[460px]",
              "h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)]",
              mobileView === "map" ? "hidden md:flex" : "flex"
            )}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-heading text-[22px] font-bold text-on-surface">Monitor de Incidentes</h2>
              <div className="flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
                  En vivo
                </span>
              </div>
            </div>

            {/* Severity filter chips */}
            <div className="flex gap-2 overflow-x-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                Todos ({incidents.length})
              </FilterChip>
              {SEVERITY_FILTERS.map((v) => (
                <FilterChip key={v} active={filter === v} onClick={() => setFilter(v)}>
                  {VERDICT_LABELS[v]} ({counts[v]})
                </FilterChip>
              ))}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-4 [scroll-padding-top:1rem]">
              {loading ? (
                <p className="pt-8 text-center text-sm text-on-surface-variant">Cargando incidentes…</p>
              ) : error ? (
                <p className="rounded-[16px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {error}
                </p>
              ) : (
                <>
                  {visible.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      selected={incident.id === selectedId}
                      onClick={() => handleSelect(incident.id)}
                    />
                  ))}
                  {visible.length === 0 && (
                    <p className="pt-8 text-center text-sm text-on-surface-variant">
                      {incidents.length === 0 ? "Todavía no hay incidentes." : "No hay incidentes en esta categoría."}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Map column */}
          <section
            className={cn(
              "relative flex-1",
              "h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)]",
              mobileView === "list" ? "hidden md:block" : "block"
            )}
          >
            <IncidentMap incidents={visible} selectedId={selectedId} onSelect={handleSelect} />

            {selected && (
              <SelectedZonePanel incident={selected} onClose={() => setSelectedId(null)} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] transition-colors",
        active ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant hover:bg-primary-fixed"
      )}
    >
      {children}
    </button>
  );
}

function SelectedZonePanel({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const risk = VERDICT_RISK[incident.verdict];
  return (
    <div className="absolute bottom-6 left-6 right-6 z-20 w-auto rounded-[18px] border border-outline-variant bg-surface p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.12)] md:right-auto md:w-80">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-on-surface">{incident.title}</h2>
          <p className="text-xs text-on-surface-variant">
            ID: {incident.id} • {incident.meta}
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">Nivel de riesgo</span>
          <span className={cn("text-sm font-bold uppercase", risk.text)}>{VERDICT_LABELS[incident.verdict]}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className={cn("h-full rounded-full", risk.bar)} style={{ width: `${risk.pct}%` }} />
        </div>
      </div>

      <div className="mb-5 space-y-3">
        <PanelRow icon={ClipboardList} label="Estado" value={INCIDENT_STATE_LABELS[incident.state]} />
        <PanelRow icon={incident.assignee ? User : UserX} label="Asignado" value={incident.assignee ?? "No asignado"} />
      </div>

      <Link
        href={`/dashboard/incidents/${incident.id}`}
        className="block w-full rounded-full bg-primary-container py-2.5 text-center text-xs font-semibold uppercase tracking-[0.05em] text-white transition-opacity hover:opacity-90"
      >
        Ver detalles
      </Link>
    </div>
  );
}

function PanelRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">{label}</p>
        <p className="text-sm text-on-surface">{value}</p>
      </div>
    </div>
  );
}
