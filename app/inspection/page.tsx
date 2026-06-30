"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Crosshair, Image as ImageIcon, Loader2, MapPin, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { CaptureStepper } from "@/app/inspection/capture-stepper";
import { PlanillaForm } from "@/app/inspection/planilla-form";
import {
  NON_STRUCTURAL_COMPONENTS,
  RECOMMENDATIONS,
  SECURITY_MEASURES,
  USO_OPTIONS,
  emptyPlanilla,
  type PlanillaElement,
  type PlanillaState,
} from "@/lib/planilla";
import type { ElementType } from "@/lib/rubric";
import type { DamageGradeDb } from "@/lib/assessment";

// Match the AI's free-text building use to the closest Uso chip (substring match).
function matchUso(aiUso: string | null): string | null {
  if (!aiUso) return null;
  const lower = aiUso.toLowerCase();
  return (
    USO_OPTIONS.find((o) => o.toLowerCase() === lower) ??
    USO_OPTIONS.find((o) => lower.includes(o.toLowerCase().split(" ")[0] ?? "") || o.toLowerCase().includes(lower)) ??
    null
  );
}

type Phase = "capture" | "drafting" | "review";

type PhotoCategory = "exteriores" | "estructurales" | "otros";

const CATEGORIES: { id: PhotoCategory; title: string; hint: string }[] = [
  { id: "exteriores", title: "§2 · Inspección externa", hint: "Colapso, aledaños, peligro geológico, asentamiento, inclinación" },
  { id: "estructurales", title: "§3–§4 · Piso crítico — elementos estructurales", hint: "Columnas, uniones, vigas, muros" },
  { id: "otros", title: "§5 · Componentes no estructurales", hint: "Paredes de relleno, escaleras, fachada, cielos rasos, tanques" },
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
type Abc3 = "a" | "b" | "c" | null;
interface DraftResponse {
  tipoEstructuralAi: ElementType | null;
  uso: string | null;
  externalFlags: { colapso: Abc3; aledanos: Abc3; geologico: Abc3; asentamiento: Abc3; inclinacion: Abc3 };
  externalNotes: { colapso: string | null; aledanos: string | null; geologico: string | null; asentamiento: string | null; inclinacion: string | null };
  elements: DraftElement[];
  nonStructural: DraftNonStructural[];
  acciones: string[];
}

const nextId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? `el-${crypto.randomUUID()}` : `el-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function InspeccionPage() {
  const router = useRouter();
  const user = useConsoleUser();
  const [phase, setPhase] = useState<Phase>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<PlanillaState>(emptyPlanilla);

  const captureGps = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

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
      // Match the AI's free-text uso to the closest Uso chip.
      const uso = matchUso(draft.uso);
      // Split the suggested actions into the two planilla lists by exact string.
      const recommendations = (draft.acciones ?? []).filter((a) => RECOMMENDATIONS.includes(a as never));
      const securityMeasures = (draft.acciones ?? []).filter((a) => SECURITY_MEASURES.includes(a as never));
      setPlanilla((cur) => ({
        ...cur,
        latitude: coords?.lat ?? cur.latitude,
        longitude: coords?.lng ?? cur.longitude,
        uso: uso ?? cur.uso,
        usoAi: uso,
        tipoEstructuralAi: draft.tipoEstructuralAi,
        tipoEstructuralFinal: draft.tipoEstructuralAi,
        externalAi: {
          colapso: draft.externalFlags.colapso ?? undefined,
          aledanos: draft.externalFlags.aledanos ?? undefined,
          geologico: draft.externalFlags.geologico ?? undefined,
          asentamiento: draft.externalFlags.asentamiento ?? undefined,
          inclinacion: draft.externalFlags.inclinacion ?? undefined,
        },
        externalAiEvaluated: {
          colapso: draft.externalFlags.colapso !== null,
          aledanos: draft.externalFlags.aledanos !== null,
          geologico: draft.externalFlags.geologico !== null,
          asentamiento: draft.externalFlags.asentamiento !== null,
          inclinacion: draft.externalFlags.inclinacion !== null,
        },
        externalNotes: {
          colapso: draft.externalNotes?.colapso ?? null,
          aledanos: draft.externalNotes?.aledanos ?? null,
          geologico: draft.externalNotes?.geologico ?? null,
          asentamiento: draft.externalNotes?.asentamiento ?? null,
          inclinacion: draft.externalNotes?.inclinacion ?? null,
        },
        nonStructural,
        recommendations,
        securityMeasures,
        elements,
      }));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setPhase("capture");
    }
  }, [photos, coords]);

  const startManual = () => {
    setPlanilla({ ...emptyPlanilla(), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null });
    setPhase("review");
  };

  return (
    <ConsoleShell title="Nueva inspección" subtitle="Evaluación Rápida de Daños · Boletín 61" user={user}>
      <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6 sm:py-7">

        <CaptureStepper activeIndex={phase === "review" ? 2 : phase === "drafting" ? 1 : 0} />

        {phase === "capture" && (
          <section className="rounded-[18px] border border-[#e8eaf2] bg-white p-5 shadow-[0_2px_10px_rgba(20,30,60,.03)] sm:p-6">
            <h2 className="font-heading text-xl font-bold text-[#15171d]">Registre la inspección</h2>
            <p className="mt-1.5 max-w-[640px] text-[13.5px] leading-relaxed text-[#5b6070]">
              Ubique el edificio y capture las fotos por sección. La IA evalúa cada grupo y pre-llena la
              planilla — usted revisa y certifica. La calidad de la foto determina la calidad del borrador.
            </p>

            {/* GPS-only location card (name/dirección live in §1) */}
            <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-[13px] border border-[#eceef6] bg-[#f7f8fc] px-4 py-3.5">
              <div className="flex min-w-[230px] flex-1 items-center gap-2.5">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#dcfce0]">
                  <MapPin className="h-[18px] w-[18px] text-[#006e2d]" />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-[#15171d]">
                    {coords
                      ? `Ubicación capturada · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                      : "Ubicación no capturada"}
                  </div>
                  <div className="mt-px text-xs text-[#7a7f90]">
                    Completa coordenadas y dirección en §1 Información General
                  </div>
                </div>
              </div>
              <button
                onClick={captureGps}
                disabled={gpsBusy}
                className="flex h-10 items-center gap-1.5 rounded-[10px] border border-[#d4d8e4] bg-white px-3.5 text-[12.5px] font-semibold text-[#434655] hover:border-primary disabled:opacity-60"
              >
                <Crosshair className="h-[15px] w-[15px] text-primary" />
                {gpsBusy ? "Capturando…" : coords ? "Recapturar GPS" : "Capturar GPS"}
              </button>
            </div>

            <div className="mt-[18px] flex flex-col gap-3.5">
              {CATEGORIES.map((cat) => {
                const catPhotos = photos.filter((p) => p.category === cat.id);
                return (
                  <div key={cat.id} className="rounded-[14px] border border-[#e8eaf2] p-4">
                    <div className="mb-3 flex items-baseline justify-between gap-2.5">
                      <div>
                        <h3 className="text-[14px] font-bold text-[#15171d]">{cat.title}</h3>
                        <p className="mt-0.5 text-xs text-[#7a7f90]">{cat.hint}</p>
                      </div>
                      <span className="whitespace-nowrap rounded-[7px] bg-[#f1f3f9] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#7a7f90]">
                        {catPhotos.length} foto(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {/* Camera tile (capture="environment" opens the rear camera on mobile) */}
                      <label className="flex h-[78px] w-[78px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[11px] border-2 border-dashed border-[#c3c6d7] bg-[#f7f8fc] text-center text-primary hover:border-primary">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px] font-semibold text-[#7a7f90]">Cámara</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => addFiles(e.target.files, cat.id)}
                        />
                      </label>
                      {/* Gallery tile (multiple, no capture → opens the photo library) */}
                      <label className="flex h-[78px] w-[78px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[11px] border-2 border-dashed border-[#c3c6d7] bg-[#f7f8fc] text-center text-primary hover:border-primary">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-[10px] font-semibold text-[#7a7f90]">Galería</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => addFiles(e.target.files, cat.id)}
                        />
                      </label>
                      {catPhotos.map((p) => (
                        <div key={p.preview} className="relative h-[78px] w-[78px] overflow-hidden rounded-[11px] border border-[#e2e5ef]">
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
              <Button onClick={runDraft} disabled={photos.length === 0} className="h-[50px] gap-2 rounded-[13px] bg-primary px-5 text-[14px] font-bold text-white shadow-[0_3px_12px_rgba(0,74,198,.28)]">
                <Sparkles className="h-[18px] w-[18px]" />
                Generar borrador con IA
              </Button>
              <Button variant="outline" onClick={startManual} className="h-[50px] rounded-[13px] px-5 text-[14px] font-semibold">
                Llenar planilla manualmente
              </Button>
            </div>
          </section>
        )}

        {phase === "drafting" && (
          <section className="flex flex-col items-center justify-center gap-4 rounded-[18px] border border-[#e8eaf2] bg-white py-[70px] shadow-[0_2px_10px_rgba(20,30,60,.03)]">
            <Loader2 className="h-[46px] w-[46px] animate-spin text-primary" />
            <p className="text-[14.5px] font-semibold text-[#15171d]">Analizando fotos y pre-llenando la planilla…</p>
            <p className="text-[12.5px] text-[#8a8fa0]">Boletín 61 · Evaluación rápida de daños</p>
          </section>
        )}

        {phase === "review" && (
          <PlanillaForm
            value={planilla}
            onChange={setPlanilla}
            onSaved={(id) => router.push(`/history?nueva=${id}`)}
            onBackToPhotos={() => setPhase("capture")}
          />
        )}
      </div>
    </ConsoleShell>
  );
}
