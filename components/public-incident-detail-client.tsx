"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ExternalLink, MapPinned, Share2, ShieldCheck } from "lucide-react";

import { IncidentCard } from "@/app/dashboard/incident-card";
import { IncidentLocationMap } from "@/app/dashboard/incidents/[id]/incident-location-map";
import { RouteTransition } from "@/components/assessment-visuals";
import { INCIDENT_STATE_LABELS, VERDICT_LABELS } from "@/lib/assessment";
import { fromDbIncident, type DbIncident } from "@/lib/incidents";
import { cn } from "@/lib/utils";

export function PublicIncidentDetailClient({ id }: { id: string }) {
  const [incident, setIncident] = useState<DbIncident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch(`/api/incidents/${id}`);
      const body = (await response.json()) as { data?: DbIncident; error?: string };

      if (!active) return;

      if (!response.ok) {
        setError(body.error ?? "No se pudo cargar el incidente.");
        setLoading(false);
        return;
      }

      setIncident(body.data ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const derived = useMemo(() => (incident ? fromDbIncident(incident) : null), [incident]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Chequeo Estructural",
          text: "Detalle público del incidente.",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      setShareState("idle");
    }
  };

  return (
    <RouteTransition className="min-h-dvh pt-14">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-8">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-[28px] bg-surface-container-low" />
              <div className="h-80 animate-pulse rounded-[28px] bg-surface-container-low" />
            </div>
            <div className="h-[520px] animate-pulse rounded-[28px] bg-surface-container-low" />
          </div>
        ) : error || !incident || !derived ? (
          <div className="soft-card rounded-[28px] p-6">
            <p className="text-sm text-on-surface-variant">{error ?? "Incidente no encontrado."}</p>
            <Link href="/" transitionTypes={["nav-forward"]} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPinned className="h-4 w-4" />
              Volver al mapa público
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <IncidentCard incident={derived} showDetailsLink={false} showAssignee={false} eyebrow="Reporte público" />

              <section className="soft-card rounded-[28px] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Detalle público</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold text-on-surface">{derived.title}</h2>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]", verdictPill(derived.verdict))}>
                    {VERDICT_LABELS[derived.verdict]}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <Detail label="Estado" value={INCIDENT_STATE_LABELS[derived.state]} />
                  <Detail label="ID público" value={derived.id} />
                  <Detail label="Tiempo" value={derived.meta} />
                  <Detail label="Ubicación" value={incident.address ?? "Sin dirección"} />
                  <Detail label="Uso" value={incident.building_use ?? "No definido"} />
                  <Detail label="Análisis" value={incident.analysis_status ?? "pendiente"} />
                </dl>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <Detail label="Confianza" value={incident.confidence !== null ? `${Math.round(incident.confidence)}%` : "n/d"} />
                  <Detail label="Altura" value={formatHeight(incident.levels, incident.basements, incident.build_year)} />
                  <Detail label="Material" value={incident.material ?? "n/d"} />
                  <Detail label="Terreno" value={incident.terrain_type ?? "n/d"} />
                </div>

                {incident.finding ? (
                  <div className="mt-5 rounded-[22px] border border-outline-variant bg-surface-container-lowest p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Observación pública</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">{incident.finding}</p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-primary px-4 text-sm font-semibold text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    {shareState === "copied" ? "Enlace copiado" : "Compartir"}
                  </button>
                  <Link
                    href="/form"
                    transitionTypes={["nav-forward"]}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-outline-variant bg-surface px-4 text-sm font-semibold text-on-surface"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Reportar otro edificio
                  </Link>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="soft-card rounded-[28px] p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Ubicación</p>
                  <h2 className="font-heading text-xl font-bold text-on-surface">Mapa del reporte</h2>
                </div>
                <IncidentLocationMap latitude={incident.latitude} longitude={incident.longitude} />
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  La ubicación se muestra con las coordenadas públicas disponibles. Los campos privados permanecen restringidos al backoffice.
                </p>
              </section>

              <section className="soft-card rounded-[28px] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Acciones</p>
                <div className="mt-4 grid gap-3">
                  <Link href="/" transitionTypes={["nav-back"]} className="inline-flex items-center justify-between rounded-[18px] border border-outline-variant bg-surface px-4 py-3 text-sm font-medium text-on-surface">
                    Volver al mapa público <ExternalLink className="h-4 w-4" />
                  </Link>
                  <Link href="/dashboard" transitionTypes={["nav-forward"]} className="inline-flex items-center justify-between rounded-[18px] border border-outline-variant bg-surface px-4 py-3 text-sm font-medium text-on-surface">
                    Ir al panel profesional <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </RouteTransition>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-on-surface">{value}</dd>
    </div>
  );
}

function verdictPill(verdict: string) {
  switch (verdict) {
    case "completo":
      return "bg-error-container text-on-error-container";
    case "severo":
      return "bg-tertiary-fixed text-tertiary";
    case "moderado":
      return "bg-primary-fixed text-on-primary-fixed-variant";
    default:
      return "bg-secondary-container text-on-secondary-container";
  }
}

function formatHeight(levels: number | null, basements: number | null, buildYear: number | null) {
  const parts = [];
  if (levels !== null) parts.push(`${levels} niveles`);
  if (basements !== null && basements > 0) parts.push(`${basements} sótanos`);
  if (buildYear !== null) parts.push(`≈ ${buildYear}`);
  return parts.length > 0 ? parts.join(" · ") : "n/d";
}
