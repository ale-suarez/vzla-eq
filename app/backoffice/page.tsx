"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Download,
  Home,
  List,
  Map as MapIcon,
  Plus,
  Search,
  User,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { INCIDENT_STATE_LABELS, VERDICT_LABELS, type IncidentState, type VerdictLevel } from "@/lib/assessment";
import { INCIDENTS, VERDICT_RISK, type Incident } from "@/lib/incidents";

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

function verdictBadge(verdict: VerdictLevel) {
  switch (verdict) {
    case "low":
      return "bg-secondary-container text-on-secondary-container";
    case "moderate":
      return "bg-primary-fixed text-on-primary-fixed-variant";
    case "severe":
      return "bg-tertiary-fixed text-on-tertiary-fixed-variant";
    case "critical":
      return "bg-error-container text-on-error-container";
  }
}

function stateBadge(state: IncidentState) {
  return state === "in_review"
    ? "bg-secondary-container text-on-secondary-container"
    : "bg-surface-container-highest text-on-surface-variant";
}

export default function BackofficePage() {
  const [filter, setFilter] = useState<VerdictLevel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Incident | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const counts = useMemo(() => {
    const c: Record<VerdictLevel, number> = { critical: 0, severe: 0, moderate: 0, low: 0 };
    for (const i of INCIDENTS) c[i.verdict] += 1;
    return c;
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? INCIDENTS : INCIDENTS.filter((i) => i.verdict === filter)),
    [filter]
  );

  const selected = useMemo(() => visible.find((i) => i.id === selectedId) ?? null, [visible, selectedId]);

  const handleSelect = (id: string) => setSelectedId((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      <div className="flex min-h-dvh flex-col">
        {/* Top bar — unchanged chrome */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-[22px] font-bold text-primary">Incidencias</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-sm transition-opacity hover:opacity-90 md:flex">
              <Plus className="h-4 w-4" />
              Crear Incidencia
            </button>
            <button className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-primary-fixed text-primary"
              aria-label="Volver al inicio"
            >
              <CircleUserRound className="h-6 w-6" />
            </Link>
          </div>
        </header>

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
                Todos ({INCIDENTS.length})
              </FilterChip>
              {SEVERITY_FILTERS.map((v) => (
                <FilterChip key={v} active={filter === v} onClick={() => setFilter(v)}>
                  {VERDICT_LABELS[v]} ({counts[v]})
                </FilterChip>
              ))}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              {visible.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  selected={incident.id === selectedId}
                  onSelect={() => handleSelect(incident.id)}
                  onDetails={() => setDetail(incident)}
                />
              ))}
              {visible.length === 0 && (
                <p className="pt-8 text-center text-sm text-on-surface-variant">No hay incidentes en esta categoría.</p>
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

            {/* Selected-zone panel (adapted to real fields) */}
            {selected && (
              <SelectedZonePanel
                incident={selected}
                onClose={() => setSelectedId(null)}
                onDetails={() => setDetail(selected)}
              />
            )}
          </section>
        </main>
      </div>

      {/* Bottom nav (mobile) — unchanged chrome */}
      <nav className="fixed bottom-0 z-40 flex h-[84px] w-full items-center justify-around border-t border-outline-variant bg-surface px-4 md:hidden">
        {[
          { label: "Home", icon: Home, active: false },
          { label: "Incidentes", icon: ClipboardList, active: true },
          { label: "Asignados", icon: UserCheck, active: false },
          { label: "Stats", icon: BarChart3, active: false },
        ].map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            className={cn("flex flex-col items-center justify-center gap-0.5", active ? "text-primary" : "text-on-surface-variant")}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{label}</span>
          </button>
        ))}
      </nav>

      {/* Detail modal — unchanged */}
      {detail && <IncidentModal incident={detail} onClose={() => setDetail(null)} />}
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

function IncidentCard({
  incident,
  selected,
  onSelect,
  onDetails,
}: {
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const Icon = incident.icon;
  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-[18px] border-l-4 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all",
        incident.accent,
        selected ? "ring-2 ring-primary" : "hover:scale-[1.01]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]", incident.iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold leading-tight text-on-surface">{incident.title}</h3>
          <p className="text-xs text-on-surface-variant">
            ID: {incident.id} • {incident.meta}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]", verdictBadge(incident.verdict))}>
              {VERDICT_LABELS[incident.verdict]}
            </span>
            <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]", stateBadge(incident.state))}>
              {INCIDENT_STATE_LABELS[incident.state]}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          {incident.assignee ? <User className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
          {incident.assignee ?? "No asignado"}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetails();
          }}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.05em] text-primary"
        >
          Ver detalles <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SelectedZonePanel({
  incident,
  onClose,
  onDetails,
}: {
  incident: Incident;
  onClose: () => void;
  onDetails: () => void;
}) {
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

      <button
        onClick={onDetails}
        className="w-full rounded-full bg-primary-container py-2.5 text-xs font-semibold uppercase tracking-[0.05em] text-white transition-opacity hover:opacity-90"
      >
        Ver detalles
      </button>
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

function IncidentModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-[18px] bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-outline-variant bg-surface px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-on-surface">Detalles de Incidencia</h2>
            <p className="text-sm text-on-surface-variant">ID: {incident.id}</p>
          </div>
          <button className="rounded-full p-2 transition-colors hover:bg-surface-container" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-primary">Evidencia fotográfica</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-square overflow-hidden rounded-[12px] bg-surface-container-highest" />
              <div className="aspect-square overflow-hidden rounded-[12px] bg-surface-container-highest" />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Uso de edificación" value="Residencial" />
            <Field label="Año de construcción" value="1985" />
            <Field label="Niveles / sótanos" value="12 / 2" />
            <Field label="Material" value="Concreto Armado" />
            <div className="col-span-2">
              <Field label="Tipo de terreno" value="Sedimentario (Relleno)" />
            </div>
            <Field label="Riesgo (IA)" value={VERDICT_LABELS[incident.verdict]} />
            <Field label="Estado" value={INCIDENT_STATE_LABELS[incident.state]} />
          </section>

          <div className="flex gap-3 border-t border-outline-variant pt-4">
            <button className="h-12 flex-1 rounded-full bg-primary text-xs font-semibold uppercase tracking-[0.05em] text-white">
              Iniciar evaluación
            </button>
            <button className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-outline text-xs font-semibold uppercase tracking-[0.05em] text-on-surface">
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">{label}</p>
      <p className="text-base text-on-surface">{value}</p>
    </div>
  );
}
