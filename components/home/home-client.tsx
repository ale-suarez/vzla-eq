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
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAssessment } from "@/components/assessment-provider";
import { RouteTransition } from "@/components/assessment-visuals";
import { HOW_IT_WORKS } from "@/lib/assessment";
import { cn } from "@/lib/utils";

const HOME_COPY = {
  badge: "ASISTIDO POR IA",
  title: "Más inspecciones en menos tiempo, para volver a estar de pie",
  description: "Rellena el formulario oficial desde tus fotos, con la ayuda de la inteligencia artificial.",
  attribution: "Basado en la Guía de Evaluación de Daños de la ANIH — Boletín 61.",
};

type PhotoGuide = { title: string; text: string; icon: LucideIcon; iconClass: string };

const PHOTO_GUIDE: PhotoGuide[] = [
  {
    title: "Paredes",
    text: "Foto completa de suelo a techo antes del acercamiento.",
    icon: Layers,
    iconClass: "bg-primary-fixed/50 text-primary",
  },
  {
    title: "Columnas",
    text: "Captura la columna completa para ubicar el daño.",
    icon: Building2,
    iconClass: "bg-secondary-container/50 text-secondary",
  },
  {
    title: "Grietas",
    text: "Incluye una referencia de tamaño junto a la fisura.",
    icon: Ruler,
    iconClass: "bg-tertiary-fixed/50 text-tertiary",
  },
  {
    title: "Puertas y ventanas",
    text: "Toma el marco completo para detectar deformaciones.",
    icon: DoorOpen,
    iconClass: "bg-primary-fixed/50 text-primary",
  },
  {
    title: "Exterior",
    text: "Muestra el edificio completo para ver inclinaciones.",
    icon: ShieldCheck,
    iconClass: "bg-secondary-container/50 text-secondary",
  },
  {
    title: "Iluminación",
    text: "Evita contraluz y sombras duras.",
    icon: Sun,
    iconClass: "bg-tertiary-fixed/50 text-tertiary",
  },
];

const IDEAL_SEQUENCE = [
  { n: 1, title: "Vista general", sub: "(elemento completo)" },
  { n: 2, title: "Vista intermedia", sub: "(zona del daño)" },
  { n: 3, title: "Acercamiento", sub: "(con referencia de tamaño)" },
];

const ACCESS_LINKS = [
  {
    title: "Nueva inspección",
    description: "Evaluación Rápida de Daños (Boletín 61).",
    href: "/inspection",
    icon: Rocket,
  },
  {
    title: "Panel profesional",
    description: "Acceso para ingenieros y admins.",
    href: "/dashboard",
    icon: ShieldCheck,
  },
  {
    title: "Revisión de solicitudes",
    description: "Estado de postulaciones.",
    href: "/revision-solicitudes",
    icon: Users,
  },
];

export default function HomeClient() {
  const { clearEvaluation } = useAssessment();

  return (
    <RouteTransition className="pt-14">
      <main className="mx-auto w-full max-w-7xl pb-10">
        <section className="relative overflow-hidden px-5 pb-8 pt-10">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-fixed opacity-40 blur-[100px]" />
          <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
              <Sparkles className="h-3.5 w-3.5" />
              {HOME_COPY.badge}
            </div>
            <h1 className="max-w-xl font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[32px] md:leading-[40px]">
              {HOME_COPY.title}
            </h1>
            <p className="max-w-lg text-base leading-6 text-on-surface-variant">{HOME_COPY.description}</p>
            <div className="flex w-full max-w-sm flex-col gap-3 pt-4">
              <Link
                href="/inspection"
                transitionTypes={["nav-forward"]}
                onClick={() => clearEvaluation()}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary-container text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] transition-colors hover:bg-primary"
              >
                <Rocket className="h-4 w-4" />
                Iniciar inspección
              </Link>
            </div>
            <p className="max-w-md pt-1 text-xs text-on-surface-variant">{HOME_COPY.attribution}</p>
          </div>
        </section>

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

        <section className="px-5 py-8">
          <div className="flex gap-4 rounded-[18px] border-2 border-outline-variant/30 bg-surface-container-low p-6">
            <Info className="mt-0.5 h-6 w-6 shrink-0 text-on-surface-variant" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">AVISO LEGAL IMPORTANTE</h4>
              <p className="text-sm leading-5 text-on-surface-variant">
                Chequeo Estructural proporciona una evaluación preliminar únicamente con fines informativos. No sustituye una inspección
                profesional de ingeniería estructural. Si sospecha un peligro inmediato, evacúe y contacte a los servicios de emergencia.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Accesos útiles</p>
              <h2 className="font-heading text-2xl font-bold text-on-surface">Enlaces rápidos</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ACCESS_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.title}
                  href={link.href}
                  transitionTypes={["nav-forward"]}
                  className="soft-card group rounded-[24px] p-5 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant opacity-60 group-hover:opacity-100">
                      Ir
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-on-surface">{link.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{link.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </RouteTransition>
  );
}
