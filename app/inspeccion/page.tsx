"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardTopBar } from "@/app/dashboard/dashboard-top-bar";
import { PlanillaForm } from "@/app/inspeccion/planilla-form";
import {
  NON_STRUCTURAL_COMPONENTS,
  emptyPlanilla,
  type PlanillaElement,
  type PlanillaState,
} from "@/lib/planilla";
import type { ElementType } from "@/lib/rubric";
import type { DamageGradeDb } from "@/lib/assessment";

type Phase = "capture" | "drafting" | "review";

type PhotoCategory = "exteriores" | "estructurales" | "otros";

const CATEGORIES: { id: PhotoCategory; title: string; hint: string }[] = [
  { id: "exteriores", title: "Exteriores", hint: "Vista amplia: colapso, edificios aledaños, terreno (§2)" },
  { id: "estructurales", title: "Piso crítico — elementos estructurales", hint: "Columnas, vigas, muros, nodos (§3/§4/§8)" },
  { id: "otros", title: "Otros (no estructurales)", hint: "Paredes, escaleras, fachada, tanques (§10)" },
];

interface CapturedPhoto {
  file: File;
  preview: string;
  category: PhotoCategory;
}

interface DraftElement {
  label: string | null;
  elementTypeAi: ElementType | null;
  gradeAi: string | null;
  photoQuality: string | null;
}
interface DraftNonStructural {
  component: string;
  letter: "a" | "b" | "c";
}
interface DraftResponse {
  tipoEstructuralAi: ElementType | null;
  externalFlags: { colapso: "a" | "b" | "c" | null; aledanos: "a" | "b" | "c" | null; geologico: "a" | "b" | "c" | null };
  externalNotes: { colapso: string | null; aledanos: string | null; geologico: string | null };
  elements: DraftElement[];
  nonStructural: DraftNonStructural[];
}

let elementCounter = 0;
const nextId = () => `el-${++elementCounter}`;

export default function InspeccionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<PlanillaState>(emptyPlanilla);

  const addFiles = useCallback((list: FileList | null, category: PhotoCategory) => {
    if (!list) return;
    const arr = Array.from(list).map((file) => ({ file, preview: URL.createObjectURL(file), category }));
    setPhotos((cur) => [...cur, ...arr]);
  }, []);

  const removePhoto = (preview: string) => {
    setPhotos((cur) => cur.filter((p) => p.preview !== preview));
  };

  const runDraft = useCallback(async () => {
    setError(null);
    setPhase("drafting");
    try {
      const fd = new FormData();
      for (const p of photos) fd.append("fotos", p.file);
      fd.append("categories", JSON.stringify(photos.map((p) => p.category)));
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
      // Map AI-detected non-structural components onto the §10 component rows
      // by best-effort name match; these seed the inspector's a/b/c selection.
      const nonStructural: Partial<Record<string, "a" | "b" | "c">> = {};
      for (const ns of draft.nonStructural ?? []) {
        const match = NON_STRUCTURAL_COMPONENTS.find((c) =>
          c.toLowerCase().includes(ns.component.toLowerCase().split(" ")[0] ?? ""),
        );
        if (match) nonStructural[match] = ns.letter;
      }
      setPlanilla((cur) => ({
        ...cur,
        tipoEstructuralAi: draft.tipoEstructuralAi,
        tipoEstructuralFinal: draft.tipoEstructuralAi,
        externalAi: {
          colapso: draft.externalFlags.colapso ?? undefined,
          aledanos: draft.externalFlags.aledanos ?? undefined,
          geologico: draft.externalFlags.geologico ?? undefined,
        },
        externalAiEvaluated: {
          colapso: draft.externalFlags.colapso !== null,
          aledanos: draft.externalFlags.aledanos !== null,
          geologico: draft.externalFlags.geologico !== null,
        },
        externalNotes: {
          colapso: draft.externalNotes?.colapso ?? null,
          aledanos: draft.externalNotes?.aledanos ?? null,
          geologico: draft.externalNotes?.geologico ?? null,
        },
        nonStructural,
        elements,
      }));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setPhase("capture");
    }
  }, [photos]);

  const startManual = () => {
    setPlanilla(emptyPlanilla());
    setPhase("review");
  };

  const topBar = useMemo(
    () => (
      <DashboardTopBar
        title="Nueva Inspección"
        subtitle="Evaluación Rápida de Daños · Boletín 61"
        backLink={{ href: "/dashboard", label: "Dashboard" }}
      />
    ),
    [],
  );

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      {topBar}
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-5 sm:py-8">

        {phase === "capture" && (
          <section className="rounded-2xl border border-outline-variant bg-white p-6">
            <h2 className="font-heading text-xl font-bold text-on-surface">Capture las fotos del edificio</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Organice las fotos por sección: así la IA evalúa cada foto según corresponde y pre-llena la
              planilla con mayor precisión. Usted revisa y certifica. La calidad de la foto determina la
              calidad del borrador.
            </p>

            <div className="mt-5 space-y-4">
              {CATEGORIES.map((cat) => {
                const catPhotos = photos.filter((p) => p.category === cat.id);
                return (
                  <div key={cat.id} className="rounded-xl border border-outline-variant p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-on-surface">{cat.title}</h3>
                        <p className="text-xs text-on-surface-variant">{cat.hint}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant">{catPhotos.length} foto(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex aspect-square w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low text-center hover:border-primary">
                        <Camera className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-medium text-on-surface-variant">Agregar</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => addFiles(e.target.files, cat.id)}
                        />
                      </label>
                      {catPhotos.map((p) => (
                        <div key={p.preview} className="relative aspect-square w-20 overflow-hidden rounded-lg border border-outline-variant">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.preview} alt="foto" className="h-full w-full object-cover" />
                          <button
                            onClick={() => removePhoto(p.preview)}
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                            aria-label="Quitar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="mt-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={runDraft} disabled={photos.length === 0} className="h-12 gap-2 bg-primary text-white">
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
