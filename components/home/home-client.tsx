"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  DoorOpen,
  Info,
  Layers,
  HeartHandshake,
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
import { IncidentCard, IncidentCardSkeleton } from "@/app/dashboard/incident-card";
import { fromDbIncident, type DbIncident } from "@/lib/incidents";
import type { MapBounds } from "@/components/backoffice/incident-map";
import { HOW_IT_WORKS } from "@/lib/assessment";
import { cn } from "@/lib/utils";

const IncidentMap = dynamic(() => import("@/components/backoffice/incident-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[320px] animate-pulse rounded-[28px] bg-surface-container-low" />,
});

const HOME_COPY = {
  badge: "ASISTIDO POR IA",
  title: "¿Tu casa tiene fallas estructurales?",
  description:
    "Conoce el estado estructural de tu vivienda o edificio mediante una evaluación preliminar asistida por inteligencia artificial y confirmada por un ingeniero.",
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
    href: "/inspeccion",
    icon: Rocket,
  },
  {
    title: "Panel profesional",
    description: "Acceso para ingenieros y admins.",
    href: "/dashboard",
    icon: ShieldCheck,
  },
  {
    title: "Unirse como ingeniero",
    description: "Registro de voluntarios.",
    href: "/register",
    icon: HeartHandshake,
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
  const [incidentRows, setIncidentRows] = useState<DbIncident[]>([]);
  const [incidentLoading, setIncidentLoading] = useState(true);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch("/api/incidents");
      const body = (await response.json()) as { data?: DbIncident[]; error?: string };

      if (!active) return;

      if (response.ok) {
        setIncidentRows(body.data ?? []);
        setIncidentError(null);
      } else {
        setIncidentRows([]);
        setIncidentError(body.error ?? "No se pudieron cargar los incidentes públicos.");
      }

      setIncidentLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const incidents = useMemo(() => incidentRows.map(fromDbIncident), [incidentRows]);

  // The list mirrors the map viewport: show only incidents within the current
  // bounds. Before the map reports bounds (initial load), show all.
  const visibleIncidents = useMemo(() => {
    if (!bounds) return incidents;
    return incidents.filter(
      (i) =>
        i.lng >= bounds.minLng &&
        i.lng <= bounds.maxLng &&
        i.lat >= bounds.minLat &&
        i.lat <= bounds.maxLat
    );
  }, [incidents, bounds]);

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
            <h1 className="max-w-md font-heading text-[26px] font-bold leading-8 tracking-tight text-on-surface md:text-[30px] md:leading-[38px]">
              {HOME_COPY.title}
            </h1>
            <p className="max-w-lg text-base leading-6 text-on-surface-variant">{HOME_COPY.description}</p>
            <div className="flex w-full max-w-sm flex-col gap-4 pt-4">
              <Link
                href="/inspeccion"
                transitionTypes={["nav-forward"]}
                onClick={() => clearEvaluation()}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary-container text-base font-bold text-white shadow-[0px_4px_20px_rgba(37,99,235,0.2)] transition-colors hover:bg-primary"
              >
                <Rocket className="h-4 w-4" />
                Empezar
              </Link>
              <Link
                href="/register"
                transitionTypes={["nav-forward"]}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-outline-variant/30 bg-surface-container-low text-base font-bold text-on-surface shadow-[0px_4px_20px_rgba(15,23,42,0.06)] transition-colors hover:bg-surface-container"
              >
                <HeartHandshake className="h-4 w-4" />
                Registro de voluntarios
              </Link>
            </div>
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

        <section id="incidentes" className="px-5 py-8">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold text-on-surface">Mapa en vivo</h3>
            <p className="text-sm leading-5 text-on-surface-variant">Los marcadores muestran prioridad y estado.</p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_0.85fr] lg:items-start">
            <div className="soft-card overflow-hidden rounded-[28px]">
              <div className="h-[560px] w-full">
                {incidentLoading ? (
                  <div className="h-full animate-pulse bg-surface-container-low" />
                ) : (
                  <IncidentMap
                    incidents={incidents}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onBoundsChange={setBounds}
                  />
                )}
              </div>
            </div>

            <div className="flex h-[560px] flex-col gap-4">
              <div className="soft-card flex h-full flex-col rounded-[28px] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Lista pública</p>
                    <h3 className="font-heading text-lg font-semibold text-on-surface">Reportes recientes</h3>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    {visibleIncidents.length} en vista
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {incidentLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <IncidentCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : incidentError ? (
                    <div className="rounded-[20px] border border-outline-variant bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                      {incidentError}
                    </div>
                  ) : visibleIncidents.length === 0 ? (
                    <div className="rounded-[20px] border border-outline-variant bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                      No hay reportes en esta zona del mapa. Aleja o mueve el mapa para ver más.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleIncidents.map((incident) => (
                        <IncidentCard
                          key={incident.id}
                          incident={incident}
                          selected={incident.id === selectedId}
                          showAssignee={false}
                          showId={false}
                          detailsHref={`/incidents/${incident.id}`}
                          detailsLabel="Ver detalles"
                          eyebrow="Reporte público"
                          onClick={() => setSelectedId(incident.id)}
                          className="p-3"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
