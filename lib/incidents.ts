import {
  ClipboardCheck,
  Info,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { DamageGradeDb, IncidentState, VerdictLevel } from "@/lib/assessment";

// A DB damage_grade as it arrives off the wire, narrowed to the four graded
// levels for presentation. Anything else — `sin_dano`, null, or a legacy value
// from a row not yet migrated (low/moderate/severe/critical) — falls back to
// "menor" so presentation lookups never miss. (Defensive: the DB enum migration
// may not yet have run against this environment.)
const NATIONAL_GRADES: VerdictLevel[] = ["menor", "moderado", "severo", "completo"];
function toVerdict(grade: DamageGradeDb | string | null): VerdictLevel {
  return grade && (NATIONAL_GRADES as string[]).includes(grade) ? (grade as VerdictLevel) : "menor";
}

export type Incident = {
  id: string;
  title: string;
  meta: string;
  verdict: VerdictLevel;
  state: IncidentState;
  assignee: string | null;
  icon: LucideIcon;
  accent: string; // left border accent for list cards
  iconWrap: string; // icon chip styles for list cards
  lat: number;
  lng: number;
  attribution: string | null; // source credit line (CC BY etc.); null for native rows
};

// Map centered on Caracas. Used as the default view + fallback for incidents
// that have no coordinates yet.
export const CARACAS_CENTER = { lng: -66.8792, lat: 10.4806 };

// Per-verdict list-card presentation (icon + accent + icon-chip styles). The DB
// row carries no presentation info, so the console derives it from the verdict.
const VERDICT_PRESENTATION: Record<
  VerdictLevel,
  { icon: LucideIcon; accent: string; iconWrap: string }
> = {
  completo: { icon: ShieldAlert, accent: "border-l-destructive", iconWrap: "bg-error-container text-destructive" },
  severo: { icon: TriangleAlert, accent: "border-l-tertiary", iconWrap: "bg-tertiary-fixed text-tertiary" },
  moderado: { icon: Info, accent: "border-l-primary", iconWrap: "bg-primary-fixed text-primary" },
  menor: { icon: ClipboardCheck, accent: "border-l-secondary", iconWrap: "bg-secondary-container text-secondary" },
};

// Subset of an incidents row the console list/map needs. Mirrors the columns
// returned by `GET /api/incidents` (see api/incidents/handlers.ts).
export type DbIncident = {
  id: string;
  building_use: string | null;
  address: string | null;
  contact: string | null;
  finding: string | null;
  severity: DamageGradeDb | null;
  ai_verdict: DamageGradeDb | null;
  analysis_status: string | null;
  confidence: number | null;
  state: IncidentState | null;
  assigned_to: string | null;
  build_year: number | null;
  levels: number | null;
  basements: number | null;
  material: string | null;
  terrain_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  // Embedded source feed (see api/incidents handlers' source:sources(...) join).
  // Optional: not every query embeds it. null/absent for native rows.
  source?: { attribution: string | null } | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "Fecha desconocida";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Fecha desconocida";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `Reportado hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Reportado hace ${hrs}h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "Reportado ayer" : `Hace ${days} días`;
}

// Adapts a DB incidents row into the presentation `Incident` the console
// renders. Verdict falls back severity -> ai_verdict -> "moderado"; rows
// without coordinates are placed at the Caracas center so they still list.
export function fromDbIncident(row: DbIncident): Incident {
  const verdict: VerdictLevel = toVerdict(row.severity ?? row.ai_verdict);
  const presentation = VERDICT_PRESENTATION[verdict];

  return {
    id: row.id,
    title: row.building_use?.trim() || "Incidente sin ubicación",
    meta: relativeTime(row.created_at),
    verdict,
    state: row.state ?? "pending",
    assignee: row.assigned_to,
    icon: presentation.icon,
    accent: presentation.accent,
    iconWrap: presentation.iconWrap,
    lat: row.latitude ?? CARACAS_CENTER.lat,
    lng: row.longitude ?? CARACAS_CENTER.lng,
    attribution: row.source?.attribution ?? null,
  };
}

// Marker styling per verdict (circle bg, ring icon color, legend dot).
export const VERDICT_MARKER: Record<
  VerdictLevel,
  { dot: string; circle: string; icon: LucideIcon }
> = {
  completo: { dot: "bg-error", circle: "bg-error", icon: ShieldAlert },
  severo: { dot: "bg-tertiary", circle: "bg-tertiary", icon: TriangleAlert },
  moderado: { dot: "bg-primary", circle: "bg-primary", icon: Info },
  menor: { dot: "bg-secondary", circle: "bg-secondary", icon: ClipboardCheck },
};

// Risk bar fill per verdict (used in the selected-zone panel).
export const VERDICT_RISK: Record<VerdictLevel, { pct: number; bar: string; text: string }> = {
  completo: { pct: 92, bar: "bg-error", text: "text-error" },
  severo: { pct: 74, bar: "bg-tertiary", text: "text-tertiary" },
  moderado: { pct: 52, bar: "bg-primary", text: "text-primary" },
  menor: { pct: 24, bar: "bg-secondary", text: "text-secondary" },
};
