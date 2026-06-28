"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ChevronRight, Globe, HardHat, Phone, Search, Share2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ConfidenceRing, RouteTransition } from "@/components/assessment-visuals";
import { useAssessment } from "@/components/assessment-provider";
import {
  CIVIL_CONTACTS,
  EMERGENCY_NUMBERS,
  OVERALL_RESULT_COPY,
  RECOMMENDED_ACTIONS,
  TRIAD_SLOTS,
  VERDICT_CONFIG,
  formToIncidentFields,
  photoTypeLabel,
  type PhotoIssue,
} from "@/lib/assessment";
import { cn } from "@/lib/utils";

// Spanish copy for each per-photo gating issue.
const ISSUE_LABELS: Record<NonNullable<PhotoIssue>, string> = {
  blurry: "Borrosa",
  dark: "Muy oscura",
  wrong_distance: "Distancia incorrecta",
  irrelevant: "No relevante (descartada)",
  inappropriate: "Inapropiada (descartada)",
};

export default function ResultPage() {
  const router = useRouter();
  const { result, form, allPhotos, error, setError, clearEvaluation } = useAssessment();
  const [saving, startSaving] = useTransition();
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    if (!result) {
      router.replace("/upload", { scroll: false, transitionTypes: ["nav-back"] });
    }
  }, [result, router]);

  if (!result) {
    return null;
  }

  // No usable evidence => no verdict. Show a retake prompt instead of a result.
  if (result.verdict === null) {
    return (
      <RouteTransition className="pt-14">
        <main className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
          <section className="soft-card space-y-4 rounded-[24px] border border-destructive/20 bg-error-container p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-on-error-container" />
              <h2 className="font-heading text-xl font-bold text-on-error-container">No se pudo analizar</h2>
            </div>
            <p className="text-sm leading-5 text-on-error-container">{result.finding}</p>
            {result.photos.some((p) => p.issue) && (
              <ul className="space-y-1 text-sm text-on-error-container">
                {result.photos
                  .filter((p) => p.issue)
                  .map((p) => (
                    <li key={p.index}>
                      • {photoTypeLabel(p.viewType)}: {ISSUE_LABELS[p.issue as NonNullable<PhotoIssue>]}
                    </li>
                  ))}
              </ul>
            )}
          </section>
          <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
            <Button
              type="button"
              onClick={() => {
                clearEvaluation();
                router.push("/upload", { scroll: false, transitionTypes: ["nav-back"] });
              }}
              className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white hover:bg-primary-container"
            >
              <Camera className="h-4 w-4" />
              Volver a tomar las fotos
            </Button>
          </div>
        </main>
      </RouteTransition>
    );
  }

  const cfg = VERDICT_CONFIG[result.verdict];
  const evidenceComplete = result.validTriadViews >= TRIAD_SLOTS.length;

  const handleShare = async () => {
    const shareData = {
      title: "Evaluación Estructural",
      text: `${VERDICT_CONFIG[result.verdict!].label}: ${result.finding}`,
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

  const resetForm = () => {
    clearEvaluation();
    setIncidentId(null);
    router.push("/upload", { scroll: false, transitionTypes: ["nav-back"] });
  };

  const saveIncident = () => {
    if (!result) {
      return;
    }

    setError(null);
    setIncidentId(null);

    startSaving(async () => {
      try {
        const response = await fetch("/api/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis: {
              verdict: result.verdict,
              confidence: result.confidence,
              finding: result.finding,
            },
            raw_ai: result,
            analysis_status: "complete",
            state: "pending",
            // Citizen questionnaire answers mapped onto incident columns.
            ...formToIncidentFields(form),
          }),
        });

        const body = (await response.json()) as { data?: { id?: string }; error?: string };

        if (!response.ok) {
          setError(body.error ?? "No se pudo registrar el incidente.");
          return;
        }

        setIncidentId(body.data?.id ?? null);
      } catch {
        setError("Error de conexión. No se pudo registrar el incidente.");
      }
    });
  };

  return (
    <RouteTransition className="pt-14">
      <motion.main
        key="result"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto w-full max-w-2xl space-y-6 px-5 py-6"
      >
        {/* Overall verdict */}
        <section className={cn("relative flex items-center justify-between overflow-hidden rounded-[24px] border p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]", cfg.statusBg, cfg.statusBorder)}>
          <div className="relative z-10 flex-1 pr-4">
            <span className={cn("text-xs font-semibold uppercase tracking-[0.12em]", OVERALL_RESULT_COPY[result.verdict].textClass)}>
              Nivel de Riesgo
            </span>
            <h2 className={cn("mt-1 font-heading text-[26px] font-bold leading-8", cfg.labelColor)}>
              {OVERALL_RESULT_COPY[result.verdict].level}
            </h2>
            <p className={cn("mt-2 max-w-[240px] text-sm leading-5", OVERALL_RESULT_COPY[result.verdict].textClass)}>
              {result.finding}
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col items-center">
            <ConfidenceRing value={result.confidence} className={cfg.ringColor} />
            <span className={cn("mt-2 max-w-20 text-center text-xs font-semibold uppercase tracking-[0.12em] leading-tight", OVERALL_RESULT_COPY[result.verdict].textClass)}>
              Confianza
            </span>
          </div>
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-current opacity-10 blur-3xl" />
        </section>

        {/* Provisional / evidence-completeness notice */}
        {!evidenceComplete && (
          <div className="flex items-start gap-3 rounded-[18px] border border-tertiary/30 bg-tertiary-fixed px-4 py-3 text-sm text-[#653e00]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Resultado provisional basado en {result.validTriadViews} de {TRIAD_SLOTS.length} vistas requeridas. La confianza
              está limitada hasta tener la tríada completa.
            </span>
          </div>
        )}

        {/* Painting vs structural — the SME's key judgment */}
        {result.paintingVsStructural && (
          <section className="soft-card rounded-[24px] border border-outline-variant p-6">
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Pintura vs. estructura (acercamiento)</h3>
            </div>
            <p className="text-sm leading-6 text-on-surface-variant">{result.paintingVsStructural}</p>
          </section>
        )}

        {/* Per-view observations */}
        {result.observations.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-heading text-lg font-semibold text-on-surface">Lo que vimos en cada vista</h3>
            <div className="space-y-2">
              {result.observations.map((obs, i) => (
                <div key={`${obs.viewType}-${i}`} className="soft-card rounded-[18px] border border-outline-variant p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-outline">{photoTypeLabel(obs.viewType)}</p>
                  <p className="mt-1 text-sm leading-5 text-on-surface-variant">{obs.seen}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Per-photo quality / relevance gating */}
        <section className="space-y-3">
          <h3 className="font-heading text-lg font-semibold text-on-surface">Fotos analizadas</h3>
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {result.photos.map((photo) => {
              const thumbSrc = allPhotos[photo.index]?.preview;
              return (
                <div key={photo.index} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "relative h-20 w-20 overflow-hidden rounded-[12px] border bg-surface-container",
                      photo.usable ? "border-outline-variant" : "border-destructive/60"
                    )}
                  >
                    {thumbSrc ? (
                      <Image src={thumbSrc} alt={photoTypeLabel(photo.viewType)} fill className={cn("object-cover", !photo.usable && "opacity-50")} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                        <Camera className="h-5 w-5" />
                      </div>
                    )}
                    {photo.usable ? (
                      <div className="absolute right-1 top-1 rounded-full bg-secondary p-0.5 text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-white">
                        <X className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-outline">
                    {photoTypeLabel(photo.viewType).split(" ")[0]}
                  </span>
                  {photo.issue && (
                    <span className="text-center text-[10px] leading-tight text-destructive">{ISSUE_LABELS[photo.issue]}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

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

        <div className="mx-auto flex w-full max-w-sm flex-col gap-3 pb-6">
          <Button
            type="button"
            onClick={saveIncident}
            disabled={saving || Boolean(incidentId)}
            className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white hover:bg-primary-container disabled:opacity-100"
          >
            {incidentId ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Incidente registrado
              </>
            ) : saving ? (
              "Guardando..."
            ) : (
              <>
                <HardHat className="h-4 w-4" />
                Registrar incidente
              </>
            )}
          </Button>
          {incidentId && (
            <p className="rounded-[16px] border border-secondary/20 bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              Tu reporte fue registrado. Un ingeniero podrá tomar el caso. Token:{" "}
              <span className="font-semibold">{incidentId}</span>
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="h-14 rounded-[18px] border-outline-variant bg-surface-container-lowest text-base font-semibold text-on-surface hover:bg-surface-container"
          >
            <Camera className="h-4 w-4" />
            Analizar otra estructura
          </Button>
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
      </motion.main>
    </RouteTransition>
  );
}
