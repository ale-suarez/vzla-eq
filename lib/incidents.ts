import {
  ClipboardCheck,
  Info,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { IncidentState, VerdictLevel } from "@/lib/assessment";

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
  critical: { icon: ShieldAlert, accent: "border-l-destructive", iconWrap: "bg-error-container text-destructive" },
  severe: { icon: TriangleAlert, accent: "border-l-tertiary", iconWrap: "bg-tertiary-fixed text-tertiary" },
  moderate: { icon: Info, accent: "border-l-primary", iconWrap: "bg-primary-fixed text-primary" },
  low: { icon: ClipboardCheck, accent: "border-l-secondary", iconWrap: "bg-secondary-container text-secondary" },
};

// Subset of an incidents row the console list/map needs. Mirrors the columns
// returned by `GET /api/incidents` (see api/incidents/handlers.ts).
export type DbIncident = {
  id: string;
  building_use: string | null;
  address: string | null;
  contact: string | null;
  finding: string | null;
  severity: VerdictLevel | null;
  ai_verdict: VerdictLevel | null;
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
// renders. Verdict falls back severity -> ai_verdict -> "moderate"; rows
// without coordinates are placed at the Caracas center so they still list.
export function fromDbIncident(row: DbIncident): Incident {
  const verdict: VerdictLevel = row.severity ?? row.ai_verdict ?? "moderate";
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
  };
}

// Marker styling per verdict (circle bg, ring icon color, legend dot).
export const VERDICT_MARKER: Record<
  VerdictLevel,
  { dot: string; circle: string; icon: LucideIcon }
> = {
  critical: { dot: "bg-error", circle: "bg-error", icon: ShieldAlert },
  severe: { dot: "bg-tertiary", circle: "bg-tertiary", icon: TriangleAlert },
  moderate: { dot: "bg-primary", circle: "bg-primary", icon: Info },
  low: { dot: "bg-secondary", circle: "bg-secondary", icon: ClipboardCheck },
};

// Risk bar fill per verdict (used in the selected-zone panel).
export const VERDICT_RISK: Record<VerdictLevel, { pct: number; bar: string; text: string }> = {
  critical: { pct: 92, bar: "bg-error", text: "text-error" },
  severe: { pct: 74, bar: "bg-tertiary", text: "text-tertiary" },
  moderate: { pct: 52, bar: "bg-primary", text: "text-primary" },
  low: { pct: 24, bar: "bg-secondary", text: "text-secondary" },
};
