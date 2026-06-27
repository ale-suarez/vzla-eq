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

export type VerdictLevel = "SEGURO" | "PRECAUCION" | "PELIGRO";

export interface PhotoResult {
  index: number;
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  escalated: boolean;
}

export interface AnalysisResult {
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  perPhoto: PhotoResult[];
  showAuthorities: boolean;
}

export interface PhotoTip {
  title: string;
  text: string;
  icon: LucideIcon;
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
export const RING_CIRCUMFERENCE = 251.2;
export const ASSESSMENT_STORAGE_KEY = "vzla-eq-assessment";

export const VERDICT_CONFIG: Record<VerdictLevel, VerdictConfig> = {
  SEGURO: {
    statusBg: "bg-secondary-container",
    statusBorder: "border-secondary/10",
    iconBg: "bg-secondary",
    iconColor: "text-white",
    ringColor: "text-secondary",
    label: "Sin daños detectados",
    labelColor: "text-on-secondary-container",
    findingColor: "text-on-secondary-container",
    badgeClass: "bg-secondary/10 text-secondary",
    Icon: ShieldCheck,
  },
  PRECAUCION: {
    statusBg: "bg-tertiary-fixed",
    statusBorder: "border-tertiary/10",
    iconBg: "bg-tertiary",
    iconColor: "text-white",
    ringColor: "text-tertiary",
    label: "Precaución",
    labelColor: "text-[#653e00]",
    findingColor: "text-[#653e00]",
    badgeClass: "bg-tertiary-fixed text-[#653e00]",
    Icon: AlertTriangle,
  },
  PELIGRO: {
    statusBg: "bg-error-container",
    statusBorder: "border-destructive/10",
    iconBg: "bg-destructive",
    iconColor: "text-white",
    ringColor: "text-destructive",
    label: "Daños estructurales",
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
  SEGURO: [
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
  PRECAUCION: [
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
  PELIGRO: [
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

export const OVERALL_RESULT_COPY = {
  SEGURO: {
    level: "Riesgo Bajo",
    text: "No se detectaron indicadores estructurales severos en las fotos analizadas.",
    textClass: "text-on-secondary-container",
  },
  PRECAUCION: {
    level: "Riesgo Medio",
    text: "Se detectaron problemas estructurales en algunas fotos analizadas. Se recomienda consulta profesional.",
    textClass: "text-[#653e00]",
  },
  PELIGRO: {
    level: "Alto Riesgo",
    text: "Se detectaron posibles daños estructurales severos. Evite entrar y contacte a servicios de emergencia.",
    textClass: "text-on-error-container",
  },
} as const;

export function verdictShortLabel(verdict: VerdictLevel) {
  if (verdict === "SEGURO") return "Bajo";
  if (verdict === "PRECAUCION") return "Medio";
  return "Alto";
}

export function verdictBadgeClass(verdict: VerdictLevel) {
  if (verdict === "SEGURO") return "bg-secondary text-white";
  if (verdict === "PRECAUCION") return "bg-tertiary text-white";
  return "bg-destructive text-white";
}
