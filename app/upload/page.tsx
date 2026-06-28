"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, Info, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/components/assessment-provider";
import {
  MAX_SUPPLEMENTARY,
  SUPPLEMENTARY_OPTIONS,
  TRIAD_SLOTS,
  type GuideType,
  type ViewType,
} from "@/lib/assessment";
import { cn } from "@/lib/utils";
import { RouteTransition } from "@/components/assessment-visuals";

export default function EvaluatePage() {
  const router = useRouter();
  const {
    triad,
    supplementary,
    triadComplete,
    error,
    loading,
    setTriadPhoto,
    addSupplementary,
    removeSupplementary,
    setError,
  } = useAssessment();

  // One hidden input per triad slot, plus one for the active supplementary type.
  const triadInputs = useRef<Partial<Record<ViewType, HTMLInputElement | null>>>({});
  const supInputRef = useRef<HTMLInputElement>(null);
  const [supType, setSupType] = useState<GuideType>(SUPPLEMENTARY_OPTIONS[0].type);
  const [legalAccepted, setLegalAccepted] = useState(false);

  // Navigations into this page use `scroll: false`, so the previous route's
  // scroll position carries over. Reset to the top on mount.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!triadComplete) {
      setError("Sube las tres vistas requeridas antes de analizar.");
      return;
    }

    if (!legalAccepted) {
      setError("Debes aceptar el aviso legal antes de continuar.");
      return;
    }

    router.push("/analyzing", { scroll: false, transitionTypes: ["nav-forward"] });
  };

  const openSupplementaryPicker = (type: GuideType) => {
    setSupType(type);
    // Defer so the ref's intended type is read on change.
    requestAnimationFrame(() => supInputRef.current?.click());
  };

  return (
    <RouteTransition className="pt-14">
      <motion.form
        key="upload"
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
            <p className="text-sm leading-5 text-on-surface-variant">
              Documenta un solo daño con tres vistas: aléjate para el contexto, captura la pared completa y acércate a la grieta.
            </p>
          </section>

          {/* Required triad */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold text-on-surface">Las 3 vistas requeridas</h3>
            </div>

            <div className="space-y-3">
              {TRIAD_SLOTS.map((slot, i) => {
                const entry = triad[slot.type];
                return (
                  <div
                    key={slot.type}
                    className={cn(
                      "soft-card flex items-center gap-4 rounded-[18px] border p-3 transition-colors",
                      entry ? "border-secondary/30 bg-secondary-container/30" : "border-outline-variant"
                    )}
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border border-outline-variant bg-surface-container">
                      {entry ? (
                        <>
                          <Image src={entry.preview} alt={slot.title} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => setTriadPhoto(slot.type, null)}
                            disabled={loading}
                            aria-label={`Eliminar ${slot.title}`}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant bg-white/85 text-on-surface shadow-sm backdrop-blur-sm"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Example framing to guide the citizen's shot. */}
                          <Image src={slot.example} alt={`Ejemplo: ${slot.title}`} fill className="object-cover opacity-60" />
                          <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-on-surface/80 text-[11px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="absolute bottom-0 left-0 right-0 bg-on-surface/55 py-0.5 text-center text-[9px] font-semibold uppercase tracking-[0.06em] text-white">
                            Ejemplo
                          </span>
                        </>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-base font-semibold text-on-surface">{slot.title}</p>
                      <p className="text-xs text-on-surface-variant">{slot.sub}</p>
                    </div>

                    <Button
                      type="button"
                      variant={entry ? "outline" : "default"}
                      onClick={() => triadInputs.current[slot.type]?.click()}
                      disabled={loading}
                      className={cn(
                        "h-10 shrink-0 rounded-[14px] px-4 text-sm font-semibold",
                        entry
                          ? "border-outline-variant bg-surface-container-lowest text-on-surface"
                          : "bg-primary text-white"
                      )}
                    >
                      {entry ? "Cambiar" : "Tomar"}
                    </Button>

                    <input
                      ref={(el) => {
                        triadInputs.current[slot.type] = el;
                      }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        setTriadPhoto(slot.type, e.target.files?.[0] ?? null);
                        e.currentTarget.value = "";
                      }}
                      className="hidden"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Optional supplementary */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold text-on-surface">Fotos adicionales (opcional)</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">
                {supplementary.length}/{MAX_SUPPLEMENTARY}
              </span>
            </div>
            <p className="text-sm leading-5 text-on-surface-variant">
              Exterior, columnas o marcos de puertas/ventanas ayudan a la IA a corroborar el diagnóstico.
            </p>

            {supplementary.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {supplementary.map((entry, i) => (
                  <div
                    key={entry.preview}
                    className="relative aspect-square overflow-hidden rounded-[14px] border border-outline-variant bg-surface-container"
                  >
                    <Image src={entry.preview} alt={`Adicional ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSupplementary(i)}
                      disabled={loading}
                      aria-label={`Eliminar adicional ${i + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant bg-white/85 text-on-surface shadow-sm backdrop-blur-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {supplementary.length < MAX_SUPPLEMENTARY && (
              <div className="flex flex-wrap gap-2">
                {SUPPLEMENTARY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.type}
                    type="button"
                    variant="outline"
                    onClick={() => openSupplementaryPicker(opt.type)}
                    disabled={loading}
                    className="h-10 rounded-full border-outline-variant bg-surface-container px-4 text-sm font-medium text-on-surface hover:bg-surface-container-high"
                  >
                    <Plus className="h-4 w-4" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}

            <input
              ref={supInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                addSupplementary(supType, e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
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
                <label className="flex cursor-pointer items-start gap-3 pt-2 text-sm font-medium text-on-surface">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => {
                      setLegalAccepted(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    disabled={loading}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant accent-primary"
                  />
                  Acepto el aviso legal
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="pointer-events-none fixed bottom-0 left-0 z-40 w-full bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-6 pt-10">
          <div className="pointer-events-auto mx-auto w-full max-w-sm">
            {!triadComplete && (
              <p className="mb-2 text-center text-xs font-medium text-on-surface-variant">
                Completa las 3 vistas requeridas para continuar
              </p>
            )}
            {triadComplete && !legalAccepted && (
              <p className="mb-2 text-center text-xs font-medium text-on-surface-variant">
                Acepta el aviso legal para continuar
              </p>
            )}
            <Button
              type="submit"
              disabled={loading || !triadComplete || !legalAccepted}
              className={cn(
                "h-14 w-full rounded-[18px] text-base font-bold transition-all",
                triadComplete && legalAccepted
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
    </RouteTransition>
  );
}
