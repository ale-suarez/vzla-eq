"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, ChevronRight, Globe, HardHat, Phone, Search, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ConfidenceRing, RouteTransition } from "@/components/assessment-visuals";
import { useAssessment } from "@/components/assessment-provider";
import {
  CIVIL_CONTACTS,
  EMERGENCY_NUMBERS,
  OVERALL_RESULT_COPY,
  RECOMMENDED_ACTIONS,
  VERDICT_CONFIG,
  verdictBadgeClass,
  verdictShortLabel,
} from "@/lib/assessment";
import { cn } from "@/lib/utils";

export default function ResultPage() {
  const router = useRouter();
  const { result, previews, error, selectedPhotoIndex, setError, clearEvaluation, selectPhotoIndex } = useAssessment();
  const [inspectionRequested, setInspectionRequested] = useState(false);

  // TODO(backend): wire this to the DB once the inspection-request endpoint
  // exists. For now it only shows a client-side confirmation.
  const requestInspection = () => {
    setInspectionRequested(true);
  };

  useEffect(() => {
    if (!result) {
      router.replace("/upload", { scroll: false, transitionTypes: ["nav-back"] });
    }
  }, [result, router]);

  if (!result) {
    return null;
  }

  const cfg = VERDICT_CONFIG[result.verdict];
  const selectedPhoto = result.perPhoto[selectedPhotoIndex] ?? result.perPhoto[0] ?? null;
  const selectedPhotoPreview = selectedPhoto ? previews[selectedPhoto.index] : undefined;

  const handleShare = async () => {
    const shareData = {
      title: "Evaluación Estructural",
      text: `${VERDICT_CONFIG[result.verdict].label}: ${result.finding}`,
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
    router.push("/upload", { scroll: false, transitionTypes: ["nav-back"] });
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
                      onClick={() => selectPhotoIndex(index)}
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
                      <span className={cn("text-xs font-semibold uppercase tracking-[0.08em]", isSelected ? "text-primary" : "text-outline")}>{photo.confidence}% Conf.</span>
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
                      <h4 className="font-heading text-lg font-semibold text-on-surface">Resultado del Análisis de IA</h4>
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
                  <Search className="h-4 w-4 text-primary" />
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

        <div className="mx-auto flex w-full max-w-sm flex-col gap-3 pb-6">
          {inspectionRequested ? (
            <div className="flex items-start gap-3 rounded-[18px] border border-secondary/20 bg-secondary-container px-4 py-4 text-sm font-medium text-on-secondary-container">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              Solicitud recibida. Te contactaremos para coordinar la inspección.
            </div>
          ) : (
            <Button
              onClick={requestInspection}
              className="h-14 w-full rounded-[18px] bg-primary text-base font-bold text-white hover:bg-primary-container"
            >
              <HardHat className="h-4 w-4" />
              Solicitar Inspección
            </Button>
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
