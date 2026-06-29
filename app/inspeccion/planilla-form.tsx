"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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

const ETIQUETA_BG: Record<"verde" | "amarilla" | "roja", string> = {
  verde: "bg-[#1b8a4b] text-white",
  amarilla: "bg-[#e0a400] text-[#1b1300]",
  roja: "bg-[#630000] text-white",
};

let manualCounter = 0;

export function PlanillaForm({
  value,
  onChange,
  onSaved,
}: {
  value: PlanillaState;
  onChange: (next: PlanillaState) => void;
  onSaved: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        id: `manual-${++manualCounter}`,
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

  const save = async () => {
    setError(null);
    setSaving(true);
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
        submit: true,
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
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* §1/§2 datos generales */}
      <Section n="1 · 2" title="Datos generales y localización">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Planilla Nº" value={value.planillaNo} onChange={(v) => set("planillaNo", v)} />
          <NumField label="Nº Pisos" value={value.nivelPisos} onChange={(v) => set("nivelPisos", v)} />
          <NumField label="Semisótanos" value={value.semisotanos} onChange={(v) => set("semisotanos", v)} />
          <NumField label="Sótanos" value={value.sotanos} onChange={(v) => set("sotanos", v)} />
          <NumField label="Año constr." value={value.anioConstruccion} onChange={(v) => set("anioConstruccion", v)} />
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium text-on-surface-variant">Dirección (busque y fije el pin)</span>
          <LocationPicker
            value={{ latitude: value.latitude, longitude: value.longitude, address: value.address }}
            onChange={(loc) =>
              onChange({ ...value, address: loc.address, latitude: loc.latitude, longitude: loc.longitude })
            }
          />
        </div>
      </Section>

      {/* §2 external axes */}
      <Section n="2" title="Inspección externa — 5 ejes (a / b / c)">
        <div className="space-y-3">
          {EXTERNAL_AXES.map((axis) => {
            const aiFlag = value.externalAi[axis.id];
            const aiEvaluated = value.externalAiEvaluated[axis.id];
            const aiNote = value.externalNotes[axis.id];
            // The AI "couldn't evaluate" only applies to the 3 visual axes: it
            // produced a note/attempt but no a/b/c flag.
            const aiUnsure = !axis.measured && !aiFlag && (aiEvaluated === false || !!aiNote);
            return (
              <div key={axis.id} className="flex flex-wrap items-start gap-3">
                <span className="min-w-[220px] pt-1.5 text-sm font-medium text-on-surface">
                  {axis.label}
                  {axis.measured && <span className="ml-1 text-xs text-on-surface-variant">(medición)</span>}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1.5">
                    {ABC_AS_LETTER.map((l, idx) => (
                      <Chip
                        key={l}
                        active={value.externalFinal[axis.id] === l}
                        suggested={!axis.measured && aiFlag === l}
                        onClick={() => set("externalFinal", { ...value.externalFinal, [axis.id]: l })}
                      >
                        {axis.opts[idx]}
                      </Chip>
                    ))}
                  </div>
                  {!axis.measured && aiFlag && (
                    <span className="text-xs text-primary" title={aiNote ?? undefined}>
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      IA sugiere: {ABC_LABEL[aiFlag]}
                    </span>
                  )}
                  {aiUnsure && (
                    <span className="text-xs text-tertiary" title={aiNote ?? undefined}>
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      IA no pudo evaluar — verifique
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* §3 uso */}
      <Section n="3" title="Uso de la edificación">
        <ChipSelect options={USO_OPTIONS as readonly string[]} value={value.uso} onSelect={(v) => set("uso", v)} />
      </Section>

      {/* §4 tipo estructural */}
      <Section n="4" title="Tipo estructural" aiHint={value.tipoEstructuralAi ? aiLabel(value.tipoEstructuralAi) : null}>
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
      </Section>

      {/* §8 critical-floor elements */}
      <Section
        n="3 · 8"
        title="Elementos del piso crítico"
        right={
          <Button variant="outline" onClick={addElement} className="h-9 gap-1 text-sm">
            <Plus className="h-4 w-4" /> Agregar elemento
          </Button>
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

      {/* §10 non-structural */}
      <Section n="10" title="Daños no estructurales (a / b / c)">
        <div className="space-y-2">
          {NON_STRUCTURAL_COMPONENTS.map((c) => (
            <div key={c} className="flex flex-wrap items-center gap-3">
              <span className="min-w-[220px] text-sm font-medium text-on-surface">{c}</span>
              <div className="flex gap-1.5">
                {ABC_AS_LETTER.map((l) => (
                  <Chip
                    key={l}
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

      {/* §11 decisión final / etiqueta */}
      <Section n="11" title="Decisión final — Etiqueta">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <RiskRow label="5.1 Riesgo externo" value={RISK_LABELS[result.riesgoExterno]} />
            <RiskRow
              label="9.1 Riesgo estructura"
              value={RISK_LABELS[result.riesgoEstructura]}
              note={result.shortCircuited ? "cortocircuito §3 (severo/completo)" : undefined}
            />
            <RiskRow label="10.1 Riesgo no estructural" value={RISK_LABELS[result.riesgoNoEstructural]} />
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

      {/* §12 recomendaciones */}
      <Section n="12" title="Recomendaciones">
        <CheckList options={RECOMMENDATIONS as readonly string[]} selected={value.recommendations} onToggle={(i) => toggleList("recommendations", i)} />
      </Section>

      {/* §13 medidas de seguridad */}
      <Section n="13" title="Medidas de seguridad">
        <CheckList options={SECURITY_MEASURES as readonly string[]} selected={value.securityMeasures} onToggle={(i) => toggleList("securityMeasures", i)} />
      </Section>

      {/* §14 observaciones */}
      <Section n="14" title="Observaciones">
        <textarea
          value={value.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Observaciones, croquis, notas adicionales…"
        />
      </Section>

      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-outline-variant bg-white px-4 py-3 sm:-mx-5 sm:px-5 sm:py-4">
        <span className="hidden text-xs text-on-surface-variant sm:block">
          La etiqueta se calcula con las tablas del Boletín 61. Usted certifica cada campo.
        </span>
        <Button
          onClick={save}
          disabled={saving || !etiquetaReady}
          className="h-12 w-full gap-2 bg-primary text-white sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {saving ? "Guardando…" : "Certificar y guardar"}
        </Button>
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
    <section className="rounded-2xl border border-outline-variant bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded bg-primary-fixed/40 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
            §{n}
          </span>
          <h3 className="font-heading text-base font-semibold text-on-surface">{title}</h3>
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
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        isSuggested ? "border-primary/40 bg-primary-fixed/20" : "border-outline-variant bg-surface-container-low",
      )}
    >
      <div className="space-y-2">
        <input
          value={el.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Etiqueta (p.ej. Columna B-3)"
          className="h-9 w-full rounded-lg border border-outline-variant bg-white px-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <select
            value={el.elementTypeFinal ?? ""}
            onChange={(e) => onUpdate({ elementTypeFinal: (e.target.value || null) as ElementType | null })}
            className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-white px-2 text-sm"
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
            className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-white px-2 text-sm"
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
            <span className="text-xs text-on-surface-variant">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              IA: {el.gradeAi ? GRADE_LABEL[el.gradeAi] : "sin grado"}
              {el.photoQuality && el.photoQuality !== "ok" ? ` · foto ${el.photoQuality}` : ""}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {isSuggested ? (
              <Button onClick={onConfirm} className="h-9 gap-1 bg-primary text-xs text-white">
                <Check className="h-3.5 w-3.5" /> Confirmar
              </Button>
            ) : (
              <span className="rounded-full bg-secondary-container px-2 py-1 text-xs text-secondary">Confirmado</span>
            )}
            <button onClick={onRemove} aria-label="Quitar" className="rounded-lg p-1.5 text-on-surface-variant hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  suggested,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  suggested?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : suggested
            ? "border-primary/50 bg-primary-fixed/30 text-primary"
            : "border-outline-variant bg-white text-on-surface hover:border-primary",
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
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function RiskRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-1.5">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface">
        {value}
        {note && <span className="ml-2 text-xs text-tertiary">{note}</span>}
      </span>
    </div>
  );
}

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
      <span className="mb-1 block text-xs font-medium text-on-surface-variant">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-outline-variant bg-white px-2 text-sm outline-none focus:border-primary"
      />
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
      <span className="mb-1 block text-xs font-medium text-on-surface-variant">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-outline-variant bg-white px-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
