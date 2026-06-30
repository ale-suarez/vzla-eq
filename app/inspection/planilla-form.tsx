"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Plus, Sparkles, Trash2 } from "lucide-react";

import LocationPicker from "@/components/location-picker";
import { cn } from "@/lib/utils";
import {
  ABC_AS_LETTER,
  ABC_LABEL,
  EXTERNAL_AXES,
  NON_STRUCTURAL_COMPONENTS,
  RECOMMENDATIONS,
  SECURITY_MEASURES,
  TIPO_ESTRUCTURAL_OPTIONS,
  USO_OPTIONS,
  computePlanillaEtiqueta,
  type Abc,
  type PlanillaElement,
  type PlanillaState,
} from "@/lib/planilla";
import { DAMAGE_GRADE_LABELS, ETIQUETA_LABELS, RISK_LABELS, type ElementType } from "@/lib/rubric";
import type { DamageGradeDb } from "@/lib/assessment";

const GRADES: DamageGradeDb[] = ["sin_dano", "menor", "moderado", "severo", "completo"];
const GRADE_LABEL: Record<DamageGradeDb, string> = { sin_dano: "Sin daño", ...DAMAGE_GRADE_LABELS };

// Short display labels for §7 chips (the stored value keeps the full string).
const RECOMMENDATION_LABELS: Record<string, string> = {
  "Inspección especializada: Estructura": "Estructura",
  "Inspección especializada: Geotecnia": "Geología / geotecnia",
  "Inspección especializada: Servicios Públicos": "Instalaciones",
  "Intervención: PC o Bomberos": "PC / Bomberos",
  "Intervención: Policía / Ejército": "Policía / Ejército",
  "Intervención: Autoridades Municipales": "Autoridades municipales",
};
const SECURITY_LABELS: Record<string, string> = {
  "Restringir paso peatonal": "Acordonar",
  "Restringir tráfico vehicular": "Cerrar calles",
  "Manejo de sustancias peligrosas": "Sustancias peligrosas",
  "Desconectar agua": "Desconectar agua",
  "Desconectar energía": "Desconectar electricidad",
  "Desconectar gas": "Desconectar gas",
  Apuntalar: "Apuntalar",
  "Demoler elementos a colapsar": "Demoler a colapsar",
  "Evaluar / evacuar edificio vecino": "Evacuar vecino",
};

const ETIQUETA_BG: Record<"verde" | "amarilla" | "roja", string> = {
  verde: "bg-[#16a34a] text-white",
  amarilla: "bg-[#eab308] text-[#1b1300]",
  roja: "bg-[#ba1a1a] text-white",
};

const newElementId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? `manual-${crypto.randomUUID()}` : `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function PlanillaForm({
  value,
  onChange,
  onSaved,
  onBackToPhotos,
}: {
  value: PlanillaState;
  onChange: (next: PlanillaState) => void;
  onSaved: (id: string) => void;
  /** Return to the capture phase (shown when a draft exists). */
  onBackToPhotos?: () => void;
}) {
  const [savingMode, setSavingMode] = useState<"submit" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = savingMode !== null;

  const set = <K extends keyof PlanillaState>(key: K, v: PlanillaState[K]) => onChange({ ...value, [key]: v });

  // Anti-rubber-stamp: the etiqueta only computes once every AI-suggested element
  // is confirmed/edited (gradeFinal set). Unconfirmed AI elements block it.
  const pendingElements = value.elements.filter((e) => e.source === "ai_drafted" && !e.confirmed).length;
  const result = useMemo(() => computePlanillaEtiqueta(value), [value]);
  const etiquetaReady = pendingElements === 0 && value.elements.length > 0;

  const updateElement = (id: string, patch: Partial<PlanillaElement>) =>
    set(
      "elements",
      value.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );

  const confirmElement = (id: string) => {
    const el = value.elements.find((e) => e.id === id);
    if (!el) return;
    // Confirming with no explicit final grade accepts the AI's proposal.
    updateElement(id, { confirmed: true, gradeFinal: el.gradeFinal ?? el.gradeAi ?? "sin_dano" });
  };

  const addElement = () =>
    set("elements", [
      ...value.elements,
      {
        id: newElementId(),
        label: "",
        elementTypeAi: null,
        elementTypeFinal: value.tipoEstructuralFinal,
        gradeAi: null,
        gradeFinal: "sin_dano",
        source: "inspector_added",
        confirmed: true,
        photoQuality: null,
      },
    ]);

  const toggleList = (key: "recommendations" | "securityMeasures", item: string) => {
    const cur = value[key];
    set(key, cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]);
  };

  const save = async (submit: boolean) => {
    setError(null);
    setSavingMode(submit ? "submit" : "draft");
    try {
      const payload = {
        planillaNo: value.planillaNo || undefined,
        address: value.address || undefined,
        latitude: value.latitude,
        longitude: value.longitude,
        nivelPisos: value.nivelPisos,
        semisotanos: value.semisotanos,
        sotanos: value.sotanos,
        anioConstruccion: value.anioConstruccion,
        uso: value.uso || undefined,
        tipoEstructuralAi: value.tipoEstructuralAi,
        tipoEstructuralFinal: value.tipoEstructuralFinal,
        extColapsoAi: value.externalAi.colapso,
        extColapsoFinal: value.externalFinal.colapso,
        extAledanosAi: value.externalAi.aledanos,
        extAledanosFinal: value.externalFinal.aledanos,
        extGeologicoAi: value.externalAi.geologico,
        extGeologicoFinal: value.externalFinal.geologico,
        extAsentamientoFinal: value.externalFinal.asentamiento,
        extInclinacionFinal: value.externalFinal.inclinacion,
        nonStructuralLetters: NON_STRUCTURAL_COMPONENTS.map((c) => value.nonStructural[c]).filter(Boolean),
        inspectedStructuralCount: value.inspectedStructuralCount,
        croquisRef: undefined,
        observaciones:
          [value.observaciones, value.recommendations.join("; "), value.securityMeasures.join("; ")]
            .filter(Boolean)
            .join(" | ") || undefined,
        etiquetaOverride: value.etiquetaOverride,
        overrideReason: value.overrideReason || undefined,
        submit,
        elements: value.elements.map((e) => ({
          elementLabel: e.label || undefined,
          source: e.source,
          elementTypeAi: e.elementTypeAi,
          elementTypeFinal: e.elementTypeFinal ?? "concreto_armado",
          gradeAi: e.gradeAi,
          gradeFinal: e.gradeFinal,
          confirmed: e.confirmed,
          photoQuality: e.photoQuality,
        })),
      };
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { data?: { id: string }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error ?? "No se pudo guardar la inspección.");
      onSaved(body.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setSavingMode(null);
    }
  };

  const hasAiDraft = value.elements.some((e) => e.source === "ai_drafted");

  return (
    <div className="space-y-4">
      {/* Manual-entry back link (the draft banner carries its own when an AI draft exists) */}
      {!hasAiDraft && onBackToPhotos && (
        <button
          onClick={onBackToPhotos}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a fotos
        </button>
      )}

      {/* AI-draft banner */}
      {hasAiDraft && (
        <div className="flex items-center gap-3 rounded-[13px] border border-[#d3e0ff] bg-[#eef4ff] px-4 py-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-[13px] leading-snug text-[#1f2a44]">
            <b className="font-bold">Borrador generado.</b> Cada campo marcado{" "}
            <span className="font-bold text-primary">IA</span> es una sugerencia — revísela y
            confírmela antes de etiquetar.
          </div>
          {onBackToPhotos && (
            <button
              onClick={onBackToPhotos}
              className="shrink-0 rounded-[9px] border border-[#c3d2f5] bg-white px-3 py-[7px] text-xs font-semibold text-primary hover:bg-primary-fixed/40"
            >
              Volver a fotos
            </button>
          )}
        </div>
      )}

      {/* The planilla — one card, numbered sections */}
      <div className="rounded-[18px] border border-[#e8eaf2] bg-white p-5 shadow-[0_2px_10px_rgba(20,30,60,.03)] sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0f1f7] pb-4">
          <div>
            <h2 className="font-heading text-[18px] font-bold text-[#15171d]">
              Evaluación rápida de daños en edificaciones
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#7a7f90]">
              Planilla Nº {value.planillaNo || "—"} · ANIH Boletín 61
            </p>
          </div>
          {(() => {
            const tone =
              value.elements.length === 0
                ? { box: "border-[#e2e5ef] bg-[#f3f4f9] text-[#6b6f80]", dot: "bg-[#9398a8]", text: "Sin elementos registrados" }
                : etiquetaReady
                  ? { box: "border-[#c5eccd] bg-[#e7f8ea] text-[#006e2d]", dot: "bg-[#16a34a]", text: "Listo para etiquetar" }
                  : { box: "border-[#f3e0b8] bg-[#fff7e8] text-[#653e00]", dot: "bg-[#ea8a00]", text: `${pendingElements} sugerencia(s) por confirmar` };
            return (
              <div className={cn("flex items-center gap-2 rounded-[9px] border px-3 py-1.5 text-[11.5px] font-semibold", tone.box)}>
                <span className={cn("h-[7px] w-[7px] rounded-full", tone.dot)} />
                {tone.text}
              </div>
            );
          })()}
        </div>

        <div className="space-y-6 pt-5">
      {/* §1/§2 datos generales */}
      <Section n="1" title="Información general">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Planilla Nº" value={value.planillaNo} onChange={(v) => set("planillaNo", v)} />
          <NumField label="Nº Pisos" value={value.nivelPisos} onChange={(v) => set("nivelPisos", v)} />
          <NumField label="Semisótanos" value={value.semisotanos} onChange={(v) => set("semisotanos", v)} />
          <NumField label="Sótanos" value={value.sotanos} onChange={(v) => set("sotanos", v)} />
          <NumField label="Año constr." value={value.anioConstruccion} onChange={(v) => set("anioConstruccion", v)} />
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]">
            Dirección (busque y fije el pin)
          </span>
          <LocationPicker
            value={{ latitude: value.latitude, longitude: value.longitude, address: value.address }}
            onChange={(loc) =>
              onChange({ ...value, address: loc.address, latitude: loc.latitude, longitude: loc.longitude })
            }
          />
        </div>
        <div className="mt-3.5">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]">
            Uso predominante de la edificación
          </span>
          <ChipSelect options={USO_OPTIONS as readonly string[]} value={value.uso} onSelect={(v) => set("uso", v)} />
        </div>
        <div className="mt-3.5">
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]">
            Material / tipo estructural predominante
            {value.tipoEstructuralAi && (
              <span className="ml-2 normal-case text-primary">
                <Sparkles className="mr-0.5 inline h-3 w-3" />
                IA: {aiLabel(value.tipoEstructuralAi)}
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {TIPO_ESTRUCTURAL_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={value.tipoEstructuralFinal === o.value}
                suggested={value.tipoEstructuralAi === o.value}
                onClick={() => set("tipoEstructuralFinal", o.value)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      {/* §2 external axes */}
      <Section n="2" title="Inspección externa">
        <p className="-mt-1 mb-3 text-xs text-[#9398a8]">
          Calificar sin ingresar a la edificación · a) Bajo · b) Medio · c) Alto
        </p>
        <div className="space-y-2.5">
          {EXTERNAL_AXES.map((axis) => {
            const aiFlag = value.externalAi[axis.id];
            const aiEvaluated = value.externalAiEvaluated[axis.id];
            const aiNote = value.externalNotes[axis.id];
            // The AI "couldn't evaluate" only applies to the 3 visual axes: it
            // produced a note/attempt but no a/b/c flag.
            const aiUnsure = !axis.measured && !aiFlag && (aiEvaluated === false || !!aiNote);
            return (
              <div key={axis.id} className="rounded-[12px] border border-[#ebedf4] p-3">
                <div className="mb-2.5 flex items-center justify-between gap-2.5">
                  <span className="text-[13px] font-semibold text-[#1f2330]">
                    {axis.label}
                    {axis.measured && <span className="ml-1 text-xs font-normal text-[#9398a8]">(medición)</span>}
                  </span>
                  {!axis.measured && aiFlag && (
                    <span className="whitespace-nowrap text-[11px] font-semibold text-primary" title={aiNote ?? undefined}>
                      <Sparkles className="mr-0.5 inline h-3 w-3" />
                      IA: {ABC_LABEL[aiFlag]}
                    </span>
                  )}
                  {aiUnsure && (
                    <span className="whitespace-nowrap text-[11px] font-semibold text-tertiary" title={aiNote ?? undefined}>
                      <AlertTriangle className="mr-0.5 inline h-3 w-3" />
                      verifique
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {ABC_AS_LETTER.map((l, idx) => (
                    <Chip
                      key={l}
                      fill
                      tone={l}
                      active={value.externalFinal[axis.id] === l}
                      suggested={!axis.measured && aiFlag === l}
                      onClick={() => set("externalFinal", { ...value.externalFinal, [axis.id]: l })}
                    >
                      {axis.opts[idx]}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[11px] border border-[#eceef6] bg-[#f7f8fc] px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8a8fa0]">Riesgo externo (Tabla 1)</span>
          <span
            className={cn(
              "rounded-lg px-3 py-1 text-[13px] font-extrabold",
              result.riesgoExterno === "bajo" && "bg-[#dcfce0] text-[#006e2d]",
              result.riesgoExterno === "medio" && "bg-[#ffe7c2] text-[#653e00]",
              result.riesgoExterno === "alto" && "bg-[#ffdad6] text-[#93000a]",
            )}
          >
            {RISK_LABELS[result.riesgoExterno]}
          </span>
        </div>
      </Section>


      {/* §3 critical-floor elements */}
      <Section
        n="3"
        title="Piso crítico — elementos estructurales"
        right={
          <button
            onClick={addElement}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#d4d8e4] bg-white px-3 text-[12.5px] font-semibold text-[#434655] hover:border-primary"
          >
            <Plus className="h-4 w-4" /> Agregar elemento
          </button>
        }
      >
        {pendingElements > 0 && (
          <p className="mb-3 rounded-lg bg-[#fff7e6] px-3 py-2 text-xs font-medium text-[#653e00]">
            {pendingElements} elemento(s) sugerido(s) por IA sin confirmar. La etiqueta se calcula al confirmarlos.
          </p>
        )}
        <div className="space-y-2">
          {value.elements.length === 0 && (
            <p className="text-sm text-on-surface-variant">Sin elementos. Agregue al menos uno o capture fotos.</p>
          )}
          {value.elements.map((el) => (
            <ElementRow
              key={el.id}
              el={el}
              onUpdate={(patch) => updateElement(el.id, patch)}
              onConfirm={() => confirmElement(el.id)}
              onRemove={() => set("elements", value.elements.filter((x) => x.id !== el.id))}
            />
          ))}
        </div>
        <div className="mt-3 max-w-xs">
          <NumField
            label="Total elementos inspeccionados (denominador Tabla 2)"
            value={value.inspectedStructuralCount}
            onChange={(v) => set("inspectedStructuralCount", v)}
          />
        </div>
      </Section>

      {/* §5 non-structural */}
      <Section n="5" title="Otros componentes no estructurales">
        <div className="space-y-2">
          {NON_STRUCTURAL_COMPONENTS.map((c) => (
            <div key={c} className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#ebedf4] p-3">
              <span className="min-w-[200px] flex-1 text-[13px] font-semibold text-[#1f2330]">{c}</span>
              <div className="flex gap-1.5">
                {ABC_AS_LETTER.map((l) => (
                  <Chip
                    key={l}
                    tone={l}
                    active={value.nonStructural[c] === l}
                    onClick={() => set("nonStructural", { ...value.nonStructural, [c]: l as Abc })}
                  >
                    {ABC_LABEL[l]}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* §6 decisión final / etiqueta */}
      <Section n="6" title="Riesgo asociado al daño — Etiqueta">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <RiskRow label="Riesgo externo (Tabla 1)" value={RISK_LABELS[result.riesgoExterno]} />
            <RiskRow
              label="Riesgo estructural"
              value={RISK_LABELS[result.riesgoEstructura]}
              note={result.shortCircuited ? "cortocircuito §3 (severo/completo)" : undefined}
            />
            <RiskRow label="Riesgo no estructural" value={RISK_LABELS[result.riesgoNoEstructural]} />
          </div>
          <div>
            {etiquetaReady ? (
              <div className={cn("rounded-xl p-5", ETIQUETA_BG[result.etiqueta])}>
                <p className="text-xs uppercase tracking-wide opacity-90">Etiqueta calculada</p>
                <p className="font-heading text-2xl font-bold">{ETIQUETA_LABELS[result.etiqueta].title}</p>
                <p className="text-sm opacity-95">{ETIQUETA_LABELS[result.etiqueta].access}</p>
                {value.etiquetaOverride && value.etiquetaOverride !== result.computedEtiqueta && (
                  <p className="mt-2 text-xs opacity-90">
                    (cálculo: {ETIQUETA_LABELS[result.computedEtiqueta].title}; sobrescrita por el inspector)
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant p-5 text-sm text-on-surface-variant">
                Confirme los elementos sugeridos para calcular la etiqueta.
              </div>
            )}
            <div className="mt-3">
              <span className="text-xs font-medium text-on-surface-variant">Sobrescribir etiqueta (con razón):</span>
              <div className="mt-1 flex gap-1.5">
                {(["verde", "amarilla", "roja"] as const).map((e) => (
                  <Chip key={e} active={value.etiquetaOverride === e} onClick={() => set("etiquetaOverride", value.etiquetaOverride === e ? null : e)}>
                    {ETIQUETA_LABELS[e].title}
                  </Chip>
                ))}
              </div>
              {value.etiquetaOverride && (
                <Field
                  className="mt-2"
                  label="Razón de la sobrescritura"
                  value={value.overrideReason}
                  onChange={(v) => set("overrideReason", v)}
                />
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* §7 acciones recomendadas */}
      <Section n="7" title="Acciones recomendadas">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]">
              Inspección detallada
            </div>
            <CheckList options={RECOMMENDATIONS as readonly string[]} selected={value.recommendations} onToggle={(i) => toggleList("recommendations", i)} labels={RECOMMENDATION_LABELS} />
          </div>
          <div>
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]">
              Medidas de prevención
            </div>
            <CheckList options={SECURITY_MEASURES as readonly string[]} selected={value.securityMeasures} onToggle={(i) => toggleList("securityMeasures", i)} labels={SECURITY_LABELS} />
          </div>
        </div>
      </Section>

      {/* observaciones */}
      <Section n="·" title="Observaciones">
        <textarea
          value={value.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          rows={3}
          className="w-full rounded-[10px] border border-[#d4d8e4] bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Observaciones, croquis, notas adicionales…"
        />
      </Section>

          {error && (
            <p className="mt-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>
          )}

          {/* Actions — at the END of the form (no sticky overlay); the inspector
              must scroll through the whole planilla to reach them. */}
          <div className="mt-6 flex flex-col gap-2.5 border-t border-[#f0f1f7] pt-5 sm:flex-row">
            <button
              onClick={() => save(true)}
              disabled={saving || !etiquetaReady}
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[13px] bg-primary text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {savingMode === "submit" ? "Enviando…" : "Firmar, etiquetar y enviar"}
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex h-[50px] items-center justify-center rounded-[13px] border border-[#d4d8e4] bg-white px-5 text-[14px] font-semibold text-[#434655] transition-colors hover:border-primary disabled:opacity-50"
            >
              {savingMode === "draft" ? "Guardando…" : "Guardar borrador"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function aiLabel(t: ElementType) {
  return TIPO_ESTRUCTURAL_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

// ── presentational helpers ────────────────────────────────────────────────────

function Section({
  n,
  title,
  children,
  right,
  aiHint,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  aiHint?: string | null;
}) {
  return (
    <section className="border-t border-[#f0f1f7] pt-6 first:border-t-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-lg bg-primary-fixed px-1.5 font-heading text-xs font-extrabold text-primary">
            {n}
          </span>
          <h3 className="font-heading text-[15px] font-bold text-[#15171d]">{title}</h3>
          {aiHint && (
            <span className="text-xs text-primary">
              <Sparkles className="mr-1 inline h-3 w-3" />
              IA: {aiHint}
            </span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function ElementRow({
  el,
  onUpdate,
  onConfirm,
  onRemove,
}: {
  el: PlanillaElement;
  onUpdate: (patch: Partial<PlanillaElement>) => void;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const isSuggested = el.source === "ai_drafted" && !el.confirmed;
  const selectClass =
    "h-10 min-w-0 flex-1 appearance-none rounded-[10px] border border-[#d4d8e4] bg-white bg-[length:14px] bg-[right_10px_center] bg-no-repeat px-2.5 pr-8 text-[13px] text-[#191b23] outline-none focus:border-primary";
  const chevron =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%239398a8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  return (
    <div
      className={cn(
        "rounded-[12px] border p-3",
        isSuggested ? "border-[#c3d2f5] bg-[#f4f7ff]" : "border-[#ebedf4] bg-white",
      )}
    >
      <div className="space-y-2">
        <input
          value={el.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Etiqueta (p.ej. Columna B-3)"
          className="h-10 w-full rounded-[10px] border border-[#d4d8e4] bg-white px-2.5 text-[13px] text-[#191b23] outline-none placeholder:text-[#9398a8] focus:border-primary"
        />
        <div className="flex gap-2">
          <select
            value={el.elementTypeFinal ?? ""}
            onChange={(e) => onUpdate({ elementTypeFinal: (e.target.value || null) as ElementType | null })}
            className={selectClass}
            style={{ backgroundImage: chevron }}
          >
            <option value="">Tipo…</option>
            {TIPO_ESTRUCTURAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={el.gradeFinal ?? ""}
            onChange={(e) => onUpdate({ gradeFinal: (e.target.value || null) as DamageGradeDb | null, confirmed: el.confirmed })}
            className={selectClass}
            style={{ backgroundImage: chevron }}
          >
            <option value="">Grado…</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          {el.source === "ai_drafted" ? (
            <span className="text-[11.5px] text-[#7a7f90]">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              IA: {GRADE_LABEL[el.gradeAi ?? "sin_dano"]}
              {el.photoQuality && el.photoQuality !== "ok" ? ` · foto ${el.photoQuality}` : ""}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {isSuggested ? (
              <button
                onClick={onConfirm}
                className="flex h-9 items-center gap-1.5 rounded-[9px] bg-primary px-3 text-[12px] font-semibold text-white hover:opacity-90"
              >
                <Check className="h-3.5 w-3.5" /> Confirmar
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-[8px] bg-[#e7f8ea] px-2 py-1 text-[11px] font-semibold text-[#006e2d]">
                <Check className="h-3 w-3" /> Confirmado
              </span>
            )}
            <button
              onClick={onRemove}
              aria-label="Quitar"
              className="rounded-[8px] p-1.5 text-[#9398a8] hover:bg-[#fdecef] hover:text-[#ba1a1a]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Severity tones for a/b/c segmented controls (traffic light).
const ABC_TONE: Record<"a" | "b" | "c", { active: string }> = {
  a: { active: "border-[#16a34a] bg-[#dcfce0] text-[#006e2d]" },
  b: { active: "border-[#ea8a00] bg-[#ffe7c2] text-[#653e00]" },
  c: { active: "border-[#ba1a1a] bg-[#ffdad6] text-[#93000a]" },
};

function Chip({
  children,
  active,
  suggested,
  tone,
  fill,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  suggested?: boolean;
  /** Severity tone for a/b/c controls; colors the active state. */
  tone?: "a" | "b" | "c";
  /** Stretch to fill (segmented-control usage). */
  fill?: boolean;
  onClick?: () => void;
}) {
  const activeClass = active
    ? tone
      ? ABC_TONE[tone].active + " font-semibold"
      : "border-primary bg-primary text-white"
    : suggested
      ? "border-primary/50 bg-primary-fixed/40 text-primary"
      : "border-[#d4d8e4] bg-white text-[#434655] hover:border-primary";
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-[9px] border px-3 py-[7px] text-[12px] leading-tight transition-colors",
        fill && "flex-1",
        activeClass,
      )}
    >
      {children}
    </button>
  );
}

function ChipSelect({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onSelect(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function CheckList({
  options,
  selected,
  onToggle,
  labels,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
  /** Short display label per option value (the value stays the full string). */
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={cn(
              "flex items-center gap-2 rounded-[10px] border px-3 py-[9px] text-[12.5px] transition-colors",
              on ? "border-primary bg-primary-fixed/40 font-semibold text-primary" : "border-[#d4d8e4] bg-white text-[#434655] hover:border-primary",
            )}
          >
            <span
              className={cn(
                "flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border-[1.6px]",
                on ? "border-primary bg-primary text-white" : "border-[#c3c6d7] bg-white",
              )}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

function RiskRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f0f1f7] pb-1.5">
      <span className="text-[#7a7f90]">{label}</span>
      <span className="font-semibold text-[#15171d]">
        {value}
        {note && <span className="ml-2 text-xs text-tertiary">{note}</span>}
      </span>
    </div>
  );
}

const INPUT_CLASS =
  "mt-1.5 h-10 w-full rounded-[10px] border border-[#d4d8e4] bg-white px-2.5 text-[13px] text-[#191b23] outline-none focus:border-primary";
const FIELD_LABEL_CLASS = "block text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#8a8fa0]";

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}
