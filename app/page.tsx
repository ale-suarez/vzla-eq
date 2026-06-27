"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  DoorOpen,
  Info,
  Layers,
  Rocket,
  Ruler,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { HOW_IT_WORKS } from "@/lib/assessment";
import { cn } from "@/lib/utils";
import { RouteTransition } from "@/components/assessment-visuals";
import { useAssessment } from "@/components/assessment-provider";

const HOME_COPY = {
  badge: "ANÁLISIS CON IA",
  title: "¿Tu casa tiene fallas estructurales?",
  description:
    "Conoce el estado estructural de tu vivienda o edificio mediante una evaluación preliminar asistida por inteligencia artificial y confirmada por un ingeniero.",
};

type PhotoGuide = { title: string; text: string; icon: LucideIcon; iconClass: string };

const PHOTO_GUIDE: PhotoGuide[] = [
  {
    title: "Paredes",
    text: "Toma una foto completa de suelo a techo antes del acercamiento. El contexto es vital para entender la magnitud.",
    icon: Layers,
    iconClass: "bg-primary-fixed/50 text-primary",
  },
  {
    title: "Columnas",
    text: "Captura la columna completa (base, centro y tope). La ubicación exacta del daño es clave para el diagnóstico.",
    icon: Building2,
    iconClass: "bg-secondary-container/50 text-secondary",
  },
  {
    title: "Grietas",
    text: "Usa una moneda o bolígrafo como referencia de tamaño junto a la grieta para determinar su gravedad real.",
    icon: Ruler,
    iconClass: "bg-tertiary-fixed/50 text-tertiary",
  },
  {
    title: "Puertas y ventanas",
    text: "Toma fotos del marco completo. Esto nos ayuda a detectar deformaciones estructurales sutiles.",
    icon: DoorOpen,
    iconClass: "bg-primary-fixed/50 text-primary",
  },
  {
    title: "Exterior",
    text: "Incluye una toma del edificio completo (techo, paredes y base) para que podamos detectar posibles inclinaciones.",
    icon: ShieldCheck,
    iconClass: "bg-secondary-container/50 text-secondary",
  },
  {
    title: "Iluminación",
    text: "Asegúrate de que la luz ilumine el objeto y no esté detrás de él para evitar sombras o fotos oscuras.",
    icon: Sun,
    iconClass: "bg-tertiary-fixed/50 text-tertiary",
  },
];

const IDEAL_SEQUENCE = [
  { n: 1, title: "Vista general", sub: "(elemento completo)" },
  { n: 2, title: "Vista intermedia", sub: "(zona del daño)" },
  { n: 3, title: "Acercamiento", sub: "(con referencia de tamaño)" },
];

export default function HomePage() {
  const { clearEvaluation } = useAssessment();

  return (
    <RouteTransition className="pt-14">
      {/* Header is rendered globally via SiteHeader (app/layout.tsx). */}
      <main className="mx-auto w-full max-w-7xl pb-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden px-5 pb-8 pt-10"
        >
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-fixed opacity-40 blur-[100px]" />
          <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
              <Rocket className="h-3.5 w-3.5" />
              {HOME_COPY.badge}
            </div>
            <h2 className="max-w-md font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[30px] md:leading-[38px]">
              {HOME_COPY.title}
            </h2>
            <p className="max-w-lg text-base leading-6 text-on-surface-variant">{HOME_COPY.description}</p>
            <div className="flex w-full max-w-sm flex-col gap-4 pt-4">
              <Link
                href="/form"
                transitionTypes={["nav-forward"]}
                // Starting a new evaluation discards any cached answers from a
                // prior assessment so the form opens blank. A mid-flow refresh
                // still restores answers (this only fires on an explicit start).
                onClick={() => clearEvaluation()}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary-container text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] transition-colors hover:bg-primary"
              >
                <Rocket className="h-4 w-4" />
                Empezar
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Photo guide */}
        <section className="space-y-6 bg-surface-container-low px-5 py-8">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-on-surface">¿Cómo tomar las mejores fotos para tu evaluación?</h3>
            <p className="text-sm leading-5 text-on-surface-variant">Sigue estos consejos para obtener un análisis más preciso y confiable.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PHOTO_GUIDE.map(({ title, text, icon: Icon, iconClass }) => (
              <div
                key={title}
                className="flex gap-4 rounded-[18px] border border-outline-variant/20 bg-surface-container-lowest p-4"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]", iconClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-on-surface">{title}</h4>
                  <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ideal sequence */}
          <div className="space-y-4 rounded-[18px] bg-primary-container p-6 text-white">
            <h4 className="font-heading text-base font-bold">Secuencia ideal por elemento:</h4>
            <div className="flex flex-col gap-4">
              {IDEAL_SEQUENCE.map(({ n, title, sub }) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-bold">{n}</div>
                  <p className="text-base font-semibold">
                    {title} <span className="font-normal opacity-90">{sub}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="px-4 pt-2 text-center text-sm italic text-on-surface-variant">
            &ldquo;Fotografía también lo que no está dañado; el contexto de lo que está intacto es tan importante como el daño mismo.&rdquo;
          </p>
        </section>

        {/* Cómo funciona */}
        <section className="space-y-6 px-5 py-8">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-on-surface">Cómo funciona</h3>
            <p className="text-sm leading-5 text-on-surface-variant">Tres pasos simples para su tranquilidad.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ title, text, icon: Icon, iconClass }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="soft-card flex flex-col items-start gap-4 rounded-[18px] p-6"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", iconClass)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-heading text-lg font-semibold text-on-surface">{title}</h4>
                  <p className="text-sm leading-5 text-on-surface-variant">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="px-5 py-8">
          <div className="flex gap-4 rounded-[18px] border-2 border-outline-variant/30 bg-surface-container-low p-6">
            <Info className="mt-0.5 h-6 w-6 shrink-0 text-on-surface-variant" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">AVISO LEGAL IMPORTANTE</h4>
              <p className="text-sm leading-5 text-on-surface-variant">
                SafeStructure proporciona una evaluación preliminar únicamente con fines informativos. No sustituye una inspección
                profesional de ingeniería estructural. Si sospecha un peligro inmediato, evacúe y contacte a los servicios de emergencia.
              </p>
            </div>
          </div>
        </section>
      </main>
    </RouteTransition>
  );
}
