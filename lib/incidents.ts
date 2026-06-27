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

// Map centered on Caracas. Mocked data — coords are placed near real landmarks.
export const CARACAS_CENTER = { lng: -66.8792, lat: 10.4806 };

// Hardcoded sample incidents (no backend). Verdict/state use the shared enums.
export const INCIDENTS: Incident[] = [
  {
    id: "#SG-2024-089",
    title: "Edificio Libertador, Caracas",
    meta: "Reportado hace 2h",
    verdict: "critical",
    state: "pending",
    assignee: null,
    icon: ShieldAlert,
    accent: "border-l-destructive",
    iconWrap: "bg-error-container text-destructive",
    lat: 10.5061,
    lng: -66.9146,
  },
  {
    id: "#SG-2024-075",
    title: "Residencias El Ávila, Sector A",
    meta: "Reportado ayer",
    verdict: "severe",
    state: "in_review",
    assignee: "Ing. Carlos Pérez",
    icon: TriangleAlert,
    accent: "border-l-tertiary",
    iconWrap: "bg-tertiary-fixed text-tertiary",
    lat: 10.5089,
    lng: -66.8534,
  },
  {
    id: "#SG-2024-102",
    title: "Puente Los Ruices (Pilastra Norte)",
    meta: "Reportado hace 6h",
    verdict: "moderate",
    state: "pending",
    assignee: null,
    icon: Info,
    accent: "border-l-primary",
    iconWrap: "bg-primary-fixed text-primary",
    lat: 10.4934,
    lng: -66.8267,
  },
  {
    id: "#SG-2024-044",
    title: "Centro Comercial El Recreo",
    meta: "Hace 3 días",
    verdict: "low",
    state: "in_review",
    assignee: "Ing. Carlos Pérez",
    icon: ClipboardCheck,
    accent: "border-l-secondary",
    iconWrap: "bg-secondary-container text-secondary",
    lat: 10.4942,
    lng: -66.8786,
  },
];

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
