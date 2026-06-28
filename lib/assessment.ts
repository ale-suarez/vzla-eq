import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  Building2,
  Camera,
  CheckCircle2,
  DoorOpen,
  Eye,
  HardHat,
  Maximize2,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Sun,
  UserX,
  XCircle,
} from "lucide-react";

// Canonical keys match the DB `verdict_level` enum (see supabase/migrations).
// Shared 4-level scale used for both ai_verdict and severity.
export type VerdictLevel = "low" | "moderate" | "severe" | "critical";

// Spanish display labels for the verdict scale.
export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  low: "Leve",
  moderate: "Moderado",
  severe: "Grave",
  critical: "Severo",
};

// DB `incident_state` enum -> Spanish labels (used in the backoffice).
export type IncidentState = "pending" | "in_review" | "resolved" | "archived";

export const INCIDENT_STATE_LABELS: Record<IncidentState, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelto",
  archived: "Archivado",
};

// ---------------------------------------------------------------------------
// Typed photo evidence. A submission describes ONE defect, evidenced by a
// required triad (general / intermedia / acercamiento) plus optional
// supplementary photos. See docs/ai-analysis-flow.md.
// ---------------------------------------------------------------------------

export type PhotoTier = "triad" | "supplementary";

/** The three required views of the defect (the triad). */
export type ViewType = "general" | "intermedia" | "acercamiento";

/** Supplementary photo categories (optional extra evidence). */
export type GuideType = "exterior" | "columna" | "puerta-ventana" | "viga" | "escaleras" | "otro";

export type PhotoType = ViewType | GuideType;

/** Per-photo descriptor sent alongside each uploaded file (index-aligned). */
export interface PhotoMeta {
  tier: PhotoTier;
  type: PhotoType;
}

/** Why a photo was rejected or flagged. `null` when the photo is usable. */
export type PhotoIssue = "blurry" | "dark" | "wrong_distance" | "irrelevant" | "inappropriate" | null;

/** Per-photo gating outcome returned by the analysis call. */
export interface PhotoGating {
  index: number;
  tier: PhotoTier;
  viewType: PhotoType;
  /** False => dropped (irrelevant/inappropriate) or unusable evidence. */
  usable: boolean;
  issue: PhotoIssue;
}

/** What the model saw in one valid view; feeds the verdict (not a verdict). */
export interface Observation {
  viewType: PhotoType;
  seen: string;
}

export interface AnalysisResult {
  /** Null when no view was valid enough to issue a verdict (retake needed). */
  verdict: VerdictLevel | null;
  confidence: number;
  finding: string;
  /** Cross-view descriptions backing the verdict. */
  observations: Observation[];
  /** Close-up judgment: crack through the substrate vs. paint layer only. */
  paintingVsStructural: string | null;
  /** Per-photo quality/relevance gating. */
  photos: PhotoGating[];
  /** Count of valid TRIAD views (drives the confidence cap, 0-3). */
  validTriadViews: number;
  showAuthorities: boolean;
}

export interface PhotoTip {
  title: string;
  text: string;
  icon: LucideIcon;
}

// ---------------------------------------------------------------------------
// Citizen questionnaire (the /form step). Single-select chip answers plus
// free-text contact fields. Stored in the AssessmentProvider.
// ---------------------------------------------------------------------------

export interface FormQuestion {
  id: string;
  question: string;
  options: string[];
  /** Render style for the option chips. */
  variant: "pill" | "compact" | "stacked";
  /**
   * When true, several options can be picked; the stored value is the selected
   * options joined with ", ". Options listed in `exclusiveOptions` cannot be
   * combined (selecting one clears the rest, and vice versa).
   */
  multiSelect?: boolean;
  /** Options that must stand alone when `multiSelect` is enabled (e.g. "No lo sé"). */
  exclusiveOptions?: string[];
}

export const FORM_QUESTIONS: FormQuestion[] = [
  { id: "uso", question: "¿Cuál es el uso del edificio?", options: ["Residencial", "Comercial", "Mixto"], variant: "pill" },
  { id: "pisos", question: "¿Cuántos pisos tiene?", options: ["1", "2", "3", "4", "5 o más"], variant: "compact" },
  {
    id: "sotano",
    question: "¿Tiene sótano o garaje subterráneo?",
    options: ["No", "Sí: 1 nivel", "Sí: 2 o más niveles"],
    variant: "pill",
  },
  {
    id: "primerPiso",
    question: "¿El primer piso tiene columnas sin paredes, local comercial o estacionamiento?",
    options: ["Sí", "No", "No sé"],
    variant: "pill",
  },
  {
    id: "material",
    question: "¿De qué está construido?",
    options: ["Concreto", "Ladrillo", "Bloque", "Madera", "Acero", "No lo sé"],
    variant: "pill",
    multiSelect: true,
    exclusiveOptions: ["No lo sé"],
  },
  {
    id: "anio",
    question: "¿Año aproximado de construcción?",
    options: ["Antes de 1970", "1970–2000", "Después del 2000"],
    variant: "stacked",
  },
  { id: "terreno", question: "¿El terreno es plano o en pendiente?", options: ["Plano", "Pendiente", "No sé"], variant: "pill" },
  {
    id: "danos",
    question: "¿Tenía daños o grietas antes del sismo?",
    options: ["No", "Sí: menores", "Sí: significativos"],
    variant: "stacked",
  },
  {
    id: "personas",
    question: "¿Cuántas personas viven o trabajan en el edificio?",
    options: ["1–5", "6–20", "Más de 20"],
    variant: "pill",
  },
];

export const BUILDING_USE_OPTIONS = ["Residencial", "Comercial", "Mixto", "Otro"] as const;

/** Stored multi-select values are option strings joined with this separator. */
const MULTI_SELECT_SEPARATOR = ", ";

/** Splits a stored multi-select answer back into its individual options. */
export function parseMultiSelect(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

/**
 * Toggles `option` within a multi-select answer and returns the new stored
 * value (options joined with ", "). Options in `exclusiveOptions` stand alone:
 * selecting one clears every other selection, and selecting any non-exclusive
 * option clears a currently-selected exclusive one.
 */
export function toggleMultiSelect(
  current: string | undefined,
  option: string,
  exclusiveOptions: string[] = []
): string {
  const selected = parseMultiSelect(current);
  const isExclusive = exclusiveOptions.includes(option);

  // Toggling an exclusive option: select it alone, or clear it.
  if (isExclusive) {
    return selected.includes(option) ? "" : option;
  }

  let next: string[];
  if (selected.includes(option)) {
    next = selected.filter((value) => value !== option);
  } else {
    // Adding a normal option clears any exclusive selection, preserving order.
    next = [...selected.filter((value) => !exclusiveOptions.includes(value)), option];
  }

  return next.join(MULTI_SELECT_SEPARATOR);
}

export interface FormAnswers {
  phone: string;
  /** Geocoded human-readable label for the pinned location (reference only). */
  address: string;
  /** Authoritative location: set once the citizen places a pin. */
  latitude: number | null;
  longitude: number | null;
  /** Keyed by FormQuestion.id; value is the selected option string. */
  questions: Record<string, string>;
  /** Free-text observations from the reporter (incidents.feedback column). */
  feedback: string;
}

export const EMPTY_FORM_ANSWERS: FormAnswers = {
  phone: "",
  address: "",
  latitude: null,
  longitude: null,
  questions: {},
  feedback: "",
};

/**
 * True when the form is ready to submit: a phone to coordinate the visit, a
 * pinned location (lat/lng drive the dashboard map), and every question
 * answered. The address label is derived from the pin, so it is not gated on.
 */
export function isFormComplete(answers: FormAnswers): boolean {
  if (answers.phone.trim() === "") {
    return false;
  }
  if (answers.latitude === null || answers.longitude === null) {
    return false;
  }
  return FORM_QUESTIONS.every((q) => Boolean(answers.questions[q.id]));
}

// ---------------------------------------------------------------------------
// Form answers -> incidents table mapping. The questionnaire collects
// human-friendly option strings ("5 o más", "1970–2000"); the DB wants typed
// columns. This converts one into the other for the POST /api/incidents body.
// ---------------------------------------------------------------------------

/** Subset of incidents columns derivable from the citizen questionnaire. */
export interface IncidentFields {
  contact?: string;
  building_use?: string;
  build_year?: number;
  levels?: number;
  basements?: number;
  material?: string;
  terrain_type?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  feedback?: string;
}

// Representative year per construction-era bucket (FORM_QUESTIONS id "anio").
const BUILD_YEAR_BY_ERA: Record<string, number> = {
  "Antes de 1970": 1965,
  "1970–2000": 1985,
  "Después del 2000": 2010,
};

// Basement count per option (FORM_QUESTIONS id "sotano").
const BASEMENTS_BY_OPTION: Record<string, number> = {
  No: 0,
  "Sí: 1 nivel": 1,
  "Sí: 2 o más niveles": 2,
};

function parseLevels(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // "5 o más" -> 5; "3" -> 3.
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

/**
 * Maps the citizen questionnaire answers onto incidents-table columns. Only
 * answered fields are included, so the result is safe to spread into the
 * incident create payload. The location picker resolves the address to a
 * pinned latitude/longitude, so those carry straight through.
 */
export function formToIncidentFields(answers: FormAnswers): IncidentFields {
  const q = answers.questions;
  const fields: IncidentFields = {};

  const contact = answers.phone.trim();
  if (contact) fields.contact = contact;

  const feedback = answers.feedback.trim();
  if (feedback) fields.feedback = feedback;

  if (answers.latitude !== null) fields.latitude = answers.latitude;
  if (answers.longitude !== null) fields.longitude = answers.longitude;

  const address = answers.address.trim();
  if (address) fields.address = address;

  if (q.uso) fields.building_use = q.uso;
  if (q.material) fields.material = q.material;
  if (q.terreno) fields.terrain_type = q.terreno;

  if (q.anio && BUILD_YEAR_BY_ERA[q.anio] !== undefined) {
    fields.build_year = BUILD_YEAR_BY_ERA[q.anio];
  }

  const levels = parseLevels(q.pisos);
  if (levels !== undefined) fields.levels = levels;

  if (q.sotano && BASEMENTS_BY_OPTION[q.sotano] !== undefined) {
    fields.basements = BASEMENTS_BY_OPTION[q.sotano];
  }

  return fields;
}

export interface ActionStep {
  title: string;
  text: string;
  icon: LucideIcon;
  iconClass: string;
}

export interface VerdictConfig {
  statusBg: string;
  statusBorder: string;
  iconBg: string;
  iconColor: string;
  ringColor: string;
  label: string;
  labelColor: string;
  findingColor: string;
  badgeClass: string;
  Icon: LucideIcon;
}

export const MAX_PHOTOS = 10;
export const MAX_FILE_SIZE_MB = 10;

// ---------------------------------------------------------------------------
// Photo evidence model (see docs/ai-analysis-flow.md).
// The triad is required; supplementary photos fill the rest up to MAX_PHOTOS.
// ---------------------------------------------------------------------------

/** The three required defect views, in capture order. */
export interface TriadSlot {
  type: ViewType;
  title: string;
  /** Parenthetical hint shown under the title. */
  sub: string;
  /** Example photo shown in the empty slot to guide the citizen's framing. */
  example: string;
}

export const TRIAD_SLOTS: TriadSlot[] = [
  { type: "general", title: "Vista general", sub: "(elemento completo)", example: "/examples/vista-general.png" },
  { type: "intermedia", title: "Vista intermedia", sub: "(zona del daño)", example: "/examples/vista-intermedia.png" },
  { type: "acercamiento", title: "Acercamiento", sub: "(con referencia de tamaño)", example: "/examples/acercamiento.png" },
];

export interface SupplementaryOption {
  type: GuideType;
  label: string;
}

export const SUPPLEMENTARY_OPTIONS: SupplementaryOption[] = [
  { type: "exterior", label: "Exterior del edificio" },
  { type: "columna", label: "Columna" },
  { type: "puerta-ventana", label: "Puerta o ventana" },
  { type: "viga", label: "Viga" },
  { type: "escaleras", label: "Escaleras" },
  { type: "otro", label: "Otro" },
];

/** Max supplementary photos: the overall ceiling minus the three triad slots. */
export const MAX_SUPPLEMENTARY = MAX_PHOTOS - TRIAD_SLOTS.length;

const VIEW_TYPE_SET = new Set<string>(TRIAD_SLOTS.map((s) => s.type));

export function isViewType(type: string): type is ViewType {
  return VIEW_TYPE_SET.has(type);
}

/** Spanish label for any photo type (triad or supplementary). */
export function photoTypeLabel(type: PhotoType): string {
  const triad = TRIAD_SLOTS.find((s) => s.type === type);
  if (triad) return `${triad.title} ${triad.sub}`;
  const sup = SUPPLEMENTARY_OPTIONS.find((o) => o.type === type);
  return sup ? sup.label : type;
}

/**
 * Confidence ceiling by the number of valid TRIAD views. A verdict from a
 * single view can't be confident; only a complete triad lifts the cap.
 * Supplementary photos strengthen confidence WITHIN this cap but never raise it.
 */
export function confidenceCapForTriadViews(validTriadViews: number): number {
  if (validTriadViews >= 3) return 100;
  if (validTriadViews === 2) return 75;
  if (validTriadViews === 1) return 50;
  return 0;
}
export const RING_CIRCUMFERENCE = 251.2;
export const ASSESSMENT_STORAGE_KEY = "vzla-eq-assessment";

export const VERDICT_CONFIG: Record<VerdictLevel, VerdictConfig> = {
  low: {
    statusBg: "bg-secondary-container",
    statusBorder: "border-secondary/10",
    iconBg: "bg-secondary",
    iconColor: "text-white",
    ringColor: "text-secondary",
    label: "Leve",
    labelColor: "text-on-secondary-container",
    findingColor: "text-on-secondary-container",
    badgeClass: "bg-secondary/10 text-secondary",
    Icon: ShieldCheck,
  },
  moderate: {
    statusBg: "bg-tertiary-fixed",
    statusBorder: "border-tertiary/10",
    iconBg: "bg-tertiary",
    iconColor: "text-white",
    ringColor: "text-tertiary",
    label: "Moderado",
    labelColor: "text-[#653e00]",
    findingColor: "text-[#653e00]",
    badgeClass: "bg-tertiary-fixed text-[#653e00]",
    Icon: AlertTriangle,
  },
  severe: {
    statusBg: "bg-error-container",
    statusBorder: "border-destructive/10",
    iconBg: "bg-[#630000]",
    iconColor: "text-white",
    ringColor: "text-[#630000]",
    label: "Grave",
    labelColor: "text-[#630000]",
    findingColor: "text-[#410002]",
    badgeClass: "bg-error-container text-[#630000]",
    Icon: AlertTriangle,
  },
  critical: {
    statusBg: "bg-error-container",
    statusBorder: "border-destructive/10",
    iconBg: "bg-destructive",
    iconColor: "text-white",
    ringColor: "text-destructive",
    label: "Severo",
    labelColor: "text-on-error-container",
    findingColor: "text-on-error-container",
    badgeClass: "bg-error-container text-on-error-container",
    Icon: XCircle,
  },
};

export const EMERGENCY_NUMBERS = [
  { label: "171", sub: "Cantv" },
  { label: "*1", sub: "Movilnet" },
  { label: "112", sub: "Digitel" },
  { label: "911", sub: "Movistar" },
];

export const CIVIL_CONTACTS = [
  { name: "Protección Civil", numbers: ["0800-5588427", "0800-2668446"], tels: ["08005588427", "08002668446"] },
  { name: "Defensa Civil", numbers: ["0800-28326", "0212-483.98.05"], tels: ["080028326", "02124839805"] },
  { name: "Aeroambulancias", numbers: ["0212-993.25.41"], tels: ["02129932541"] },
  { name: "Rescarven", numbers: ["0212-993.69.11"], tels: ["02129936911"] },
  { name: "Amb. Metropolitana", numbers: ["0212-545.45.45"], tels: ["02125454545"] },
];

export const HOW_IT_WORKS = [
  {
    title: "1. Tome una foto",
    text: "Capture grietas visibles, manchas de humedad o descuadres en sus paredes o techos.",
    icon: Camera,
    iconClass: "bg-primary-fixed text-primary",
  },
  {
    title: "2. La IA analiza",
    text: "Nuestra red neuronal identifica patrones y realiza una Evaluación de Daños para determinar el Riesgo Bajo, Medio o Alto.",
    icon: Sparkles,
    iconClass: "bg-secondary-container text-secondary",
  },
  {
    title: "3. Obtenga su reporte",
    text: "Reciba un desglose detallado y los pasos recomendados para reparaciones o inspección formal.",
    icon: CheckCircle2,
    iconClass: "bg-tertiary-fixed text-tertiary",
  },
];

export const PHOTO_TIPS: PhotoTip[] = [
  {
    title: "Buena Iluminación",
    text: "Asegúrate de que el área esté bien iluminada. Evita sombras pesadas o reflejos para un análisis preciso.",
    icon: Sun,
  },
  {
    title: "Captura el Área Completa",
    text: "Da un paso atrás para capturar el contexto. Nuestra IA necesita ver las estructuras circundantes.",
    icon: Maximize2,
  },
  {
    title: "Incluye Paredes y Techos",
    text: "Incluye las uniones donde las paredes se encuentran con los techos o pisos para detectar cambios estructurales.",
    icon: Building2,
  },
];

export const RECOMMENDED_ACTIONS: Record<VerdictLevel, ActionStep[]> = {
  low: [
    {
      title: "Entrar con cuidado",
      text: "Proceda con precaución y reporte cualquier novedad de inmediato.",
      icon: DoorOpen,
      iconClass: "bg-secondary",
    },
    {
      title: "Monitoreo continuo",
      text: "Observe si las marcas existentes se ensanchan o si aparecen nuevas grietas.",
      icon: Eye,
      iconClass: "bg-primary",
    },
    {
      title: "Documentar cambios",
      text: "Tome fotos periódicas para llevar un registro de la evolución de la estructura.",
      icon: Camera,
      iconClass: "bg-on-surface",
    },
  ],
  moderate: [
    {
      title: "Limitar ocupación",
      text: "Evite permanecer mucho tiempo en las zonas afectadas.",
      icon: UserX,
      iconClass: "bg-tertiary",
    },
    {
      title: "Solicitar inspección",
      text: "Contacte a un ingeniero civil colegiado para una evaluación formal.",
      icon: HardHat,
      iconClass: "bg-primary",
    },
    {
      title: "Monitorear réplicas",
      text: "Reevalúe el área inmediatamente después de cualquier actividad sísmica adicional.",
      icon: AlertTriangle,
      iconClass: "bg-on-surface",
    },
  ],
  severe: [
    {
      title: "Evacúe la edificación",
      text: "Los daños en elementos estructurales primarios obligan a desocupar el inmueble hasta su reparación.",
      icon: UserX,
      iconClass: "bg-[#630000]",
    },
    {
      title: "Solicite evaluación certificada",
      text: "No reocupe hasta que un ingeniero estructural certifique las reparaciones necesarias.",
      icon: HardHat,
      iconClass: "bg-primary",
    },
    {
      title: "Acordone la zona afectada",
      text: "Impida el paso bajo aleros, balcones o muros con desprendimiento de concreto.",
      icon: AlertTriangle,
      iconClass: "bg-on-surface",
    },
  ],
  critical: [
    {
      title: "No entre",
      text: "La estructura está inestable. Evite acercarse a menos de 5 metros de la fachada.",
      icon: Ban,
      iconClass: "bg-destructive",
    },
    {
      title: "Trasládese a un lugar seguro",
      text: "Asegúrese de que todos los ocupantes se encuentren en una zona de seguridad designada al aire libre.",
      icon: ShieldCheck,
      iconClass: "bg-primary",
    },
    {
      title: "Contacte a los servicios de emergencia",
      text: "Llame a ingenieros estructurales o rescatistas para asegurar el área.",
      icon: PhoneCall,
      iconClass: "bg-on-surface",
    },
  ],
};

export const OVERALL_RESULT_COPY: Record<VerdictLevel, { level: string; text: string; textClass: string }> = {
  low: {
    level: "Riesgo Leve",
    text: "No se detectaron indicadores estructurales severos en las fotos analizadas.",
    textClass: "text-on-secondary-container",
  },
  moderate: {
    level: "Riesgo Moderado",
    text: "Se detectaron problemas estructurales en algunas fotos analizadas. Se recomienda consulta profesional.",
    textClass: "text-[#653e00]",
  },
  severe: {
    level: "Riesgo Grave",
    text: "Daños significativos en elementos estructurales primarios. El edificio debe ser evacuado hasta su reparación certificada.",
    textClass: "text-[#630000]",
  },
  critical: {
    level: "Riesgo Severo",
    text: "Colapso parcial o inminente. Prohibida toda entrada: la estructura representa un peligro inmediato para la vida.",
    textClass: "text-on-error-container",
  },
} as const;

export function verdictShortLabel(verdict: VerdictLevel) {
  return VERDICT_LABELS[verdict];
}

export function verdictBadgeClass(verdict: VerdictLevel) {
  if (verdict === "low") return "bg-secondary text-white";
  if (verdict === "moderate") return "bg-tertiary text-white";
  if (verdict === "severe") return "bg-[#630000] text-white";
  return "bg-destructive text-white";
}
