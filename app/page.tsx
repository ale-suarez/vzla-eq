"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Eye,
  Globe,
  HardHat,
  Info,
  Images,
  Loader2,
  Maximize2,
  Phone,
  PhoneCall,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VerdictLevel = "SEGURO" | "PRECAUCION" | "PELIGRO";
type AppView = "home" | "upload";

interface PhotoResult {
  index: number;
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  escalated: boolean;
}

interface AnalysisResult {
  verdict: VerdictLevel;
  confidence: number;
  finding: string;
  perPhoto: PhotoResult[];
  showAuthorities: boolean;
}

const VERDICT_CONFIG = {
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
} as const;

const EMERGENCY_NUMBERS = [
  { label: "171", sub: "Cantv" },
  { label: "*1", sub: "Movilnet" },
  { label: "112", sub: "Digitel" },
  { label: "911", sub: "Movistar" },
];

const CIVIL_CONTACTS = [
  { name: "Protección Civil", numbers: ["0800-5588427", "0800-2668446"], tels: ["08005588427", "08002668446"] },
  { name: "Defensa Civil", numbers: ["0800-28326", "0212-483.98.05"], tels: ["080028326", "02124839805"] },
  { name: "Aeroambulancias", numbers: ["0212-993.25.41"], tels: ["02129932541"] },
  { name: "Rescarven", numbers: ["0212-993.69.11"], tels: ["02129936911"] },
  { name: "Amb. Metropolitana", numbers: ["0212-545.45.45"], tels: ["02125454545"] },
];

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_MB = 10;
const RING_CIRCUMFERENCE = 251.2;

const HOW_IT_WORKS = [
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

const PHOTO_TIPS = [
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

const RECOMMENDED_ACTIONS = {
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
} satisfies Record<VerdictLevel, Array<{ title: string; text: string; icon: typeof Camera; iconClass: string }>>;

const OVERALL_RESULT_COPY = {
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

function verdictShortLabel(verdict: VerdictLevel) {
  if (verdict === "SEGURO") return "Bajo";
  if (verdict === "PRECAUCION") return "Medio";
  return "Alto";
}

function verdictBadgeClass(verdict: VerdictLevel) {
  if (verdict === "SEGURO") return "bg-secondary text-white";
  if (verdict === "PRECAUCION") return "bg-tertiary text-white";
  return "bg-destructive text-white";
}

function ConfidenceRing({ value, className }: { value: number; className: string }) {
  const offset = RING_CIRCUMFERENCE - (Math.min(100, Math.max(0, value)) / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative h-24 w-24">
      <svg className="h-full w-full -rotate-90">
        <circle className="text-surface-container" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
        <circle
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", className)}
          cx="48"
          cy="48"
          fill="transparent"
          r="40"
          stroke="currentColor"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-lg font-semibold text-on-surface">{value}%</span>
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-heading text-[15px] font-bold leading-none tracking-tight text-primary">Evaluación Estructural</h1>
            <p className="mt-1 text-[11px] text-on-surface-variant">Venezuela · Respuesta al sismo</p>
          </div>
        </div>
        <div aria-hidden="true" className="h-9 w-9" />
      </div>
    </header>
  );
}

function LoadingView() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="relative flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center overflow-hidden px-5 py-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-80px] top-1/4 h-64 w-64 rounded-full bg-primary-fixed opacity-70 blur-[100px]" />
        <div className="absolute bottom-1/4 right-[-100px] h-72 w-72 rounded-full bg-secondary-container opacity-40 blur-[110px]" />
      </div>

      <div className="relative z-10 mb-10 flex h-72 w-72 items-center justify-center">
        <div className="pulse-ring absolute h-full w-full rounded-full bg-primary" />
        <div className="pulse-ring-delayed absolute h-full w-full rounded-full bg-primary" />
        <div className="glass-card relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.08)]">
          <div className="absolute top-[58%] h-1 w-full -translate-y-1/2 animate-bounce bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex flex-col items-center gap-4 text-primary">
            <Loader2 className="h-12 w-12 animate-spin" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Analizando…</span>
          </div>
        </div>
      </div>

      <div className="z-10 flex w-full max-w-md flex-col gap-4">
        <p className="text-center font-heading text-lg font-semibold text-on-surface">Analizando…</p>
        <div className="h-3 w-full overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container">
          <div className="progress-animate h-full rounded-full bg-primary shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    const newPreviews: string[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return;
      valid.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });
    setActiveView("upload");
    setFotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_PHOTOS));
  }, []);

  const removePhoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fotos.length === 0) { setError("Por favor suba al menos una foto."); return; }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      fotos.forEach((f) => formData.append("fotos", f));
      const res = await fetch("/api/analizar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al analizar. Intente de nuevo."); return; }
      setSelectedPhotoIndex(0);
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Error de conexión. Verifique su internet e intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null); setError(null); setFotos([]); setPreviews([]); setActiveView("upload");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  const handleShare = async () => {
    const shareData = {
      title: "Evaluación Estructural",
      text: result ? `${VERDICT_CONFIG[result.verdict].label}: ${result.finding}` : "Evaluación Estructural",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
    } catch {
      setError("No se pudo compartir el resultado. Intente de nuevo.");
    }
  };

  const cfg = result ? VERDICT_CONFIG[result.verdict] : null;
  const selectedPhoto = result?.perPhoto[selectedPhotoIndex] ?? result?.perPhoto[0] ?? null;
  const selectedPhotoPreview = selectedPhoto ? previews[selectedPhoto.index] : undefined;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <AppHeader />

      <main className={cn("mx-auto w-full pt-14", activeView === "home" && !result ? "max-w-7xl" : "max-w-2xl")}>
        <AnimatePresence mode="wait">
          {loading && <LoadingView />}

          {!loading && !result && activeView === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="pb-10"
            >
              <section className="relative overflow-hidden px-5 pb-8 pt-10">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-fixed opacity-60 blur-[100px]" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
                    <Sparkles className="h-3.5 w-3.5" />
                    ANÁLISIS CON IA
                  </div>
                  <h2 className="max-w-md font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[30px] md:leading-[38px]">
                    ¿Es segura su casa?
                  </h2>
                  <p className="max-w-lg text-base leading-6 text-on-surface-variant">
                    Evalúe al instante la integridad estructural de su propiedad mediante visión artificial de grado profesional y protocolos de seguridad expertos.
                  </p>
                  <div className="flex flex-col gap-4 pt-4">
                    <Button
                      type="button"
                      onClick={openCamera}
                      className="h-14 w-full rounded-[18px] bg-primary-container text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] hover:bg-primary"
                    >
                      <Camera className="h-4 w-4" />
                      Tomar Foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openGallery}
                      className="h-14 w-full rounded-[18px] border-outline-variant bg-surface-container-lowest text-base font-semibold text-on-surface hover:bg-surface-container"
                    >
                      <Upload className="h-4 w-4" />
                      Subir Imagen
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-6 px-5 py-8">
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-semibold text-on-surface">Cómo funciona</h3>
                  <p className="text-sm leading-5 text-on-surface-variant">Tres pasos simples para su tranquilidad.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {HOW_IT_WORKS.map(({ title, text, icon: Icon, iconClass }) => (
                    <div key={title} className="soft-card flex flex-col items-start gap-4 rounded-[18px] p-6">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", iconClass)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-heading text-lg font-semibold text-on-surface">{title}</h4>
                        <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="px-5 py-8">
                <div className="flex gap-4 rounded-[18px] border-2 border-outline-variant/30 bg-surface-container-low p-6">
                  <Info className="mt-0.5 h-6 w-6 shrink-0 text-on-surface-variant" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">AVISO LEGAL IMPORTANTE</h4>
                    <p className="text-sm leading-5 text-on-surface-variant">
                      Este análisis es orientativo y se basa únicamente en la información proporcionada por el usuario. Puede ayudar a identificar posibles daños, fallas constructivas o condiciones que afecten la habitabilidad de una edificación, pero no constituye una inspección estructural formal ni sustituye la evaluación presencial de un ingeniero estructural o civil calificado. Cualquier decisión sobre ocupación, reparación o intervención del inmueble deberá ser confirmada por profesionales competentes y, cuando corresponda, por las autoridades correspondientes.
                    </p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {!loading && result && cfg && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6 px-5 py-6"
            >
              {result.perPhoto.length > 1 ? (
                <>
                  <section className={cn("relative flex items-center justify-between overflow-hidden rounded-[24px] border p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]", cfg.statusBg, cfg.statusBorder)}>
                    <div className="relative z-10 flex-1 pr-4">
                      <span className={cn("text-xs font-semibold uppercase tracking-[0.12em]", OVERALL_RESULT_COPY[result.verdict].textClass)}>
                        Nivel de Riesgo General
                      </span>
                      <h2 className={cn("mt-1 font-heading text-[26px] font-bold leading-8", cfg.labelColor)}>
                        {OVERALL_RESULT_COPY[result.verdict].level}
                      </h2>
                      <p className={cn("mt-2 max-w-[220px] text-sm leading-5", OVERALL_RESULT_COPY[result.verdict].textClass)}>
                        {OVERALL_RESULT_COPY[result.verdict].text}
                      </p>
                    </div>
                    <div className="relative z-10 flex shrink-0 flex-col items-center">
                      <ConfidenceRing value={result.confidence} className={cfg.ringColor} />
                      <span className={cn("mt-2 max-w-20 text-center text-xs font-semibold uppercase tracking-[0.12em] leading-tight", OVERALL_RESULT_COPY[result.verdict].textClass)}>
                        Confianza Agregada
                      </span>
                    </div>
                    <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-current opacity-10 blur-3xl" />
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-lg font-semibold text-on-surface">Fotos Analizadas</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">
                        {result.perPhoto.length} Elementos
                      </span>
                    </div>
                    <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {result.perPhoto.map((photo, index) => {
                        const isSelected = index === selectedPhotoIndex;
                        const thumbSrc = previews[photo.index];
                        return (
                          <button
                            key={photo.index}
                            type="button"
                            onClick={() => setSelectedPhotoIndex(index)}
                            className="group flex shrink-0 snap-start flex-col items-center gap-2"
                          >
                            <div
                              className={cn(
                                "relative h-20 w-20 overflow-hidden rounded-[12px] border border-outline-variant bg-surface-container",
                                isSelected && "outline-3 outline-offset-2 outline-primary"
                              )}
                            >
                              {thumbSrc ? (
                                <Image src={thumbSrc} alt={`Foto ${photo.index + 1}`} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                                  <Camera className="h-5 w-5" />
                                </div>
                              )}
                              <div className={cn("absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold", verdictBadgeClass(photo.verdict))}>
                                {verdictShortLabel(photo.verdict)}
                              </div>
                            </div>
                            <span className={cn("text-xs font-semibold uppercase tracking-[0.08em]", isSelected ? "text-primary" : "text-outline")}>
                              {photo.confidence}% Conf.
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {selectedPhoto && (
                    <section className="soft-card space-y-6 rounded-[24px] border border-outline-variant p-6 transition-all">
                      <div className="flex flex-col gap-6 md:flex-row">
                        <div className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-surface-container md:w-1/2">
                          {selectedPhotoPreview ? (
                            <Image src={selectedPhotoPreview} alt={`Foto ${selectedPhoto.index + 1}`} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                              <Camera className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="w-full space-y-4 md:w-1/2">
                          <div className="flex items-center gap-2">
                            <Search className={cn("h-5 w-5", VERDICT_CONFIG[selectedPhoto.verdict].ringColor)} />
                            <h4 className="font-heading text-lg font-semibold text-on-surface">
                              Resultado del Análisis de IA
                            </h4>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Daño Observado</p>
                            <p className="text-sm leading-5 text-on-surface-variant">{selectedPhoto.finding}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Confianza del modelo en el análisis</p>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container">
                                <div className="h-full bg-primary" style={{ width: `${selectedPhoto.confidence}%` }} />
                              </div>
                              <span className="text-sm font-bold text-primary">{selectedPhoto.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  <section className={cn("relative overflow-hidden rounded-[24px] border p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]", cfg.statusBg, cfg.statusBorder)}>
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", cfg.iconBg)}>
                        <cfg.Icon className={cn("h-5 w-5", cfg.iconColor)} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Resultado del análisis</p>
                        <h2 className={cn("font-heading text-[22px] font-semibold leading-7", cfg.labelColor)}>{cfg.label}</h2>
                        <p className={cn("text-base leading-6 font-medium", cfg.findingColor)}>{result.finding}</p>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-current opacity-10" />
                  </section>

                  <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="soft-card flex flex-col items-center justify-center rounded-[24px] p-6 text-center">
                      <ConfidenceRing value={result.confidence} className={cfg.ringColor} />
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-outline">Confianza del modelo {result.confidence}%</p>
                    </div>
                    <div className="soft-card rounded-[24px] p-6">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Análisis de IA</h3>
                      </div>
                      <p className="text-sm leading-6 text-on-surface-variant">{result.finding}</p>
                    </div>
                  </section>
                </>
              )}

              <section className="space-y-4">
                <h3 className="px-1 font-heading text-lg font-semibold text-on-surface">Acciones Recomendadas</h3>
                <div className="space-y-2">
                  {RECOMMENDED_ACTIONS[result.verdict].map(({ title, text, icon: Icon, iconClass }, index, actions) => (
                    <div key={title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm", iconClass)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {index < actions.length - 1 && <div className="h-full w-0.5 bg-surface-container-highest" />}
                      </div>
                      <div className="pb-6 pt-2">
                        <h4 className="text-base font-bold text-on-surface">{title}</h4>
                        <p className="mt-1 text-sm leading-5 text-on-surface-variant">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {result.showAuthorities && (
                <section className="soft-card overflow-hidden rounded-[24px]">
                  <div className="flex items-center gap-2 px-6 py-5">
                    <Phone className="h-4 w-4 text-on-surface-variant" />
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Contactos de emergencia</h3>
                  </div>
                  <div className="border-t border-surface-container px-6 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-outline">Líneas de emergencia</p>
                    <div className="grid grid-cols-4 gap-2">
                      {EMERGENCY_NUMBERS.map(({ label, sub }) => (
                        <a
                          key={label}
                          href={`tel:${label}`}
                          className="flex min-h-16 flex-col items-center justify-center rounded-[18px] border border-outline-variant bg-surface-container-lowest transition-colors hover:bg-surface-container"
                        >
                          <span className="text-base font-bold leading-none text-on-surface">{label}</span>
                          <span className="mt-1 text-[10px] text-on-surface-variant">{sub}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-surface-container border-t border-surface-container">
                    {CIVIL_CONTACTS.map(({ name, numbers, tels }) => (
                      <div key={name} className="flex items-center justify-between gap-3 px-6 py-3">
                        <span className="shrink-0 text-sm text-on-surface-variant">{name}</span>
                        <div className="flex flex-wrap justify-end gap-2">
                          {numbers.map((n, i) => (
                            <a key={n} href={`tel:${tels[i]}`} className="whitespace-nowrap text-xs font-semibold text-primary hover:underline">
                              {n}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-3 border-t border-surface-container px-6 py-4">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
                    <div className="flex flex-col gap-1">
                      <a href="https://venezuelareporta.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                        venezuelareporta.org <ChevronRight className="h-3 w-3" />
                      </a>
                      <a href="https://venezuelatebusca.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
                        venezuelatebusca.com <ChevronRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </section>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3 rounded-[18px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 pb-6">
                <Button onClick={resetForm} className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white hover:bg-primary-container">
                  <Camera className="h-4 w-4" />
                  Analizar otra estructura
                </Button>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShare}
                    className="h-14 rounded-[18px] border-outline-variant bg-surface-container-lowest text-base font-semibold text-on-surface hover:bg-surface-container"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {!loading && !result && activeView === "upload" && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onSubmit={handleSubmit}
              className="min-h-[calc(100dvh-56px)] pb-32"
            >
              <div className="space-y-6 px-5 py-6">
                <section className="space-y-1">
                  <h2 className="font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface">Nueva Evaluación</h2>
                  <p className="text-sm leading-5 text-on-surface-variant">Toma una foto clara del área estructural que deseas analizar.</p>
                </section>

                <section
                  className={cn(
                    "upload-dashed flex w-full flex-col items-center justify-center bg-surface-container-lowest px-6 py-10 transition-colors",
                    previews.length > 0 && "bg-primary-fixed/50"
                  )}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="mb-6 space-y-2 text-center">
                    <p className="font-heading text-lg font-semibold text-on-surface">Comenzar Escaneo</p>
                    <p className="text-sm leading-5 text-on-surface-variant">Toca para usar la cámara o sube desde tu galería</p>
                    <p className="text-xs font-medium text-on-surface-variant">{fotos.length}/{MAX_PHOTOS} · Máx. {MAX_FILE_SIZE_MB} MB por foto</p>
                  </div>

                  <AnimatePresence>
                    {previews.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 grid w-full grid-cols-2 gap-3 sm:grid-cols-3"
                      >
                        {previews.map((src, i) => (
                          <motion.div
                            key={src}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94 }}
                            className="relative aspect-square overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-lowest"
                          >
                            <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-white/85 text-on-surface shadow-sm backdrop-blur-sm"
                              disabled={loading}
                              aria-label={`Eliminar foto ${i + 1}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {fotos.length < MAX_PHOTOS && (
                    <div className="flex w-full flex-col gap-3">
                      <Button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] hover:bg-primary-container"
                        disabled={loading}
                      >
                        <Camera className="h-4 w-4" />
                        Tomar Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => galleryInputRef.current?.click()}
                        className="h-14 w-full rounded-[18px] border-outline-variant bg-surface-container text-base font-semibold text-on-surface hover:bg-surface-container-high"
                        disabled={loading}
                      >
                        <Images className="h-4 w-4" />
                        Elegir de la Galería
                      </Button>
                    </div>
                  )}

                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-secondary" />
                    <h3 className="font-heading text-lg font-semibold text-on-surface">Consejos para la Foto</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {PHOTO_TIPS.map(({ title, text, icon: Icon }) => (
                      <div key={title} className="soft-card flex items-start gap-4 rounded-[18px] p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-heading text-base font-semibold text-on-surface">{title}</p>
                          <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-3 rounded-[18px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <section className="pb-2">
                  <div className="flex gap-4 rounded-[18px] border-2 border-outline-variant/30 bg-surface-container-low p-6">
                    <Info className="mt-0.5 h-6 w-6 shrink-0 text-on-surface-variant" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">AVISO LEGAL IMPORTANTE</h4>
                      <p className="text-sm leading-5 text-on-surface-variant">
                        Este análisis es orientativo y se basa únicamente en la información proporcionada por el usuario. Puede ayudar a identificar posibles daños, fallas constructivas o condiciones que afecten la habitabilidad de una edificación, pero no constituye una inspección estructural formal ni sustituye la evaluación presencial de un ingeniero estructural o civil calificado. Cualquier decisión sobre ocupación, reparación o intervención del inmueble deberá ser confirmada por profesionales competentes y, cuando corresponda, por las autoridades correspondientes.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="pointer-events-none fixed bottom-0 left-0 z-40 w-full bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-6 pt-10">
                <div className="pointer-events-auto mx-auto max-w-2xl">
                  <Button
                    type="submit"
                    disabled={loading || fotos.length === 0}
                    className={cn(
                      "h-14 w-full rounded-[18px] text-base font-bold transition-all",
                      fotos.length > 0
                        ? "bg-primary text-white shadow-[0px_4px_20px_rgba(37,99,235,0.24)] hover:bg-primary-container"
                        : "bg-outline text-on-primary-fixed-variant opacity-50"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Analizar estructura
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
