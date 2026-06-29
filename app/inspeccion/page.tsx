"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardTopBar } from "@/app/dashboard/dashboard-top-bar";
import { PlanillaForm } from "@/app/inspeccion/planilla-form";
import {
  emptyPlanilla,
  type PlanillaElement,
  type PlanillaState,
} from "@/lib/planilla";
import type { ElementType } from "@/lib/rubric";
import type { DamageGradeDb } from "@/lib/assessment";

type Phase = "capture" | "drafting" | "review";

interface DraftElement {
  label: string | null;
  elementTypeAi: ElementType | null;
  gradeAi: string | null;
  photoQuality: string | null;
}
interface DraftResponse {
  tipoEstructuralAi: ElementType | null;
  externalFlags: { colapso: "a" | "b" | "c" | null; aledanos: "a" | "b" | "c" | null; geologico: "a" | "b" | "c" | null };
  elements: DraftElement[];
}

let elementCounter = 0;
const nextId = () => `el-${++elementCounter}`;

export default function InspeccionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("capture");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<PlanillaState>(emptyPlanilla);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((cur) => [...cur, ...arr]);
    setPreviews((cur) => [...cur, ...arr.map((f) => URL.createObjectURL(f))]);
  }, []);

  const removeFile = (i: number) => {
    setFiles((cur) => cur.filter((_, idx) => idx !== i));
    setPreviews((cur) => cur.filter((_, idx) => idx !== i));
  };

  const runDraft = useCallback(async () => {
    setError(null);
    setPhase("drafting");
    try {
      const fd = new FormData();
      for (const f of files) fd.append("fotos", f);
      const res = await fetch("/api/inspections/draft", { method: "POST", body: fd });
      const body = (await res.json()) as { data?: DraftResponse; error?: string };
      if (!res.ok || !body.data) {
        throw new Error(body.error ?? "No se pudo generar el borrador.");
      }
      const draft = body.data;
      // Seed the planilla from the AI draft — every AI field is a SUGGESTION the
      // inspector confirms; gradeFinal starts null so the etiqueta won't compute
      // until each element is confirmed/edited (anti-rubber-stamp, ADR §D4).
      const elements: PlanillaElement[] = draft.elements.map((e) => ({
        id: nextId(),
        label: e.label ?? "",
        elementTypeAi: e.elementTypeAi,
        elementTypeFinal: e.elementTypeAi,
        gradeAi: (e.gradeAi as DamageGradeDb | null) ?? null,
        gradeFinal: null,
        source: "ai_drafted",
        confirmed: false,
        photoQuality: e.photoQuality,
      }));
      setPlanilla((cur) => ({
        ...cur,
        tipoEstructuralAi: draft.tipoEstructuralAi,
        tipoEstructuralFinal: draft.tipoEstructuralAi,
        externalAi: {
          colapso: draft.externalFlags.colapso ?? undefined,
          aledanos: draft.externalFlags.aledanos ?? undefined,
          geologico: draft.externalFlags.geologico ?? undefined,
        },
        elements,
      }));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setPhase("capture");
    }
  }, [files]);

  const startManual = () => {
    setPlanilla(emptyPlanilla());
    setPhase("review");
  };

  const topBar = useMemo(
    () => <DashboardTopBar title="Nueva Inspección" subtitle="Evaluación Rápida de Daños · Boletín 61" />,
    [],
  );

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      {topBar}
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        {phase === "capture" && (
          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="font-heading text-xl font-bold text-on-surface">Capture las fotos del edificio</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Una vista externa amplia y fotos de los elementos del piso crítico. La IA pre-llenará la
              planilla; usted revisa y certifica. La calidad de la foto determina la calidad del borrador.
            </p>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low py-10 text-center hover:border-primary">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-sm font-semibold text-on-surface">Tomar / subir fotos</span>
              <span className="text-xs text-on-surface-variant">JPG/PNG · múltiples</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      aria-label="Quitar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={runDraft} disabled={files.length === 0} className="h-12 gap-2 bg-primary text-white">
                <Sparkles className="h-4 w-4" />
                Generar borrador con IA
              </Button>
              <Button variant="outline" onClick={startManual} className="h-12">
                Llenar planilla manualmente
              </Button>
            </div>
          </section>
        )}

        {phase === "drafting" && (
          <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-white py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-on-surface">Analizando fotos y pre-llenando la planilla…</p>
          </section>
        )}

        {phase === "review" && (
          <PlanillaForm
            value={planilla}
            onChange={setPlanilla}
            onSaved={(id) => router.push(`/dashboard?inspeccion=${id}`)}
          />
        )}
      </main>
    </div>
  );
}
