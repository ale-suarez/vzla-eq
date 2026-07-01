"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import type { Tables } from "@/lib/database.types";
import { DAMAGE_GRADE_LABELS, RISK_LABELS } from "@/lib/rubric/taxonomy";
import type { DamageGrade, Etiqueta, RiskLevel } from "@/lib/rubric";

type InspectionDetail = Tables<"inspections"> & { elements: Tables<"inspection_elements">[] };

const ETIQUETA: Record<Etiqueta, { text: string; bg: string; color: string }> = {
  verde: { text: "Habitable", bg: "#dcfce0", color: "#006e2d" },
  amarilla: { text: "Uso restringido", bg: "#ffe7c2", color: "#653e00" },
  roja: { text: "Insegura", bg: "#ffdad6", color: "#93000a" },
};

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  concreto_armado: "Concreto armado",
  muro_concreto: "Muro de concreto",
  mamposteria: "Mampostería",
  acero: "Acero",
};

function gradeLabel(g: DamageGrade | "sin_dano" | null): string {
  if (!g || g === "sin_dano") return "Sin daño";
  return DAMAGE_GRADE_LABELS[g] ?? g;
}

function riskLabel(r: RiskLevel | null): string {
  return r ? RISK_LABELS[r] ?? r : "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-VE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function InspectionDetailClient({ id }: { id: string }) {
  const user = useConsoleUser();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/inspections/${id}`)
      .then((r) => r.json().then((body: { data?: InspectionDetail; error?: string }) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) {
          setError(body.error ?? "No se pudo cargar la inspección.");
        } else {
          setInspection(body.data ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar la inspección.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const et = inspection?.etiqueta ? ETIQUETA[inspection.etiqueta] : null;

  return (
    <ConsoleShell title="Inspección" subtitle="Detalle de la evaluación" user={user}>
      <div className="mx-auto max-w-[920px] px-4 py-6 md:px-6">
        <Link href="/history" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Volver al historial
        </Link>

        {loading && <p className="py-8 text-center text-sm text-on-surface-variant">Cargando…</p>}
        {error && !loading && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}

        {inspection && !loading && (
          <div className="flex flex-col gap-4">
            {/* Header */}
            <section className="rounded-[16px] border border-[#e8eaf2] bg-white p-5 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold text-[#15171d]">
                    {inspection.address || [inspection.municipio, inspection.estado].filter(Boolean).join(", ") || "Inspección sin dirección"}
                  </h2>
                  <p className="mt-1 text-xs text-[#7a7f90]">
                    {inspection.planilla_no ? `Planilla ${inspection.planilla_no} · ` : ""}
                    {inspection.submitted_at ? `Enviada ${formatDate(inspection.submitted_at)}` : "Borrador"}
                  </p>
                </div>
                {et && (
                  <span
                    className="rounded-[8px] px-3 py-1 text-xs font-bold uppercase tracking-[0.04em]"
                    style={{ background: et.bg, color: et.color }}
                  >
                    {et.text}
                    {inspection.etiqueta_overridden ? " (ajustada)" : ""}
                  </span>
                )}
              </div>
            </section>

            {/* Section risks */}
            <section className="grid grid-cols-3 gap-3.5">
              <RiskCard label="Riesgo externo" value={riskLabel(inspection.riesgo_externo)} />
              <RiskCard label="Riesgo estructura" value={riskLabel(inspection.riesgo_estructura)} />
              <RiskCard label="Riesgo no estructural" value={riskLabel(inspection.riesgo_no_estructural)} />
            </section>

            {/* Building data */}
            <Section title="Datos de la edificación">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:grid-cols-3">
                <Field label="Uso" value={inspection.uso} />
                <Field label="Tipo estructural" value={inspection.tipo_estructural_final ? ELEMENT_TYPE_LABELS[inspection.tipo_estructural_final] : null} />
                <Field label="Año construcción" value={inspection.anio_construccion?.toString()} />
                <Field label="Niveles" value={inspection.nivel_pisos?.toString()} />
                <Field label="Semisótanos" value={inspection.semisotanos?.toString()} />
                <Field label="Sótanos" value={inspection.sotanos?.toString()} />
              </dl>
            </Section>

            {/* Elements */}
            <Section title={`Elementos evaluados (${inspection.elements.length})`}>
              {inspection.elements.length === 0 ? (
                <p className="text-sm text-[#7a7f90]">Sin elementos registrados.</p>
              ) : (
                <div className="flex flex-col divide-y divide-[#eef0f6]">
                  {inspection.elements.map((el) => (
                    <div key={el.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#15171d]">{el.element_label || "Elemento sin nombre"}</div>
                        <div className="text-xs text-[#7a7f90]">
                          {el.element_type_final ? ELEMENT_TYPE_LABELS[el.element_type_final] : "—"}
                          {el.source === "ai_drafted" ? " · IA" : ""}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-[6px] bg-[#f1f3f9] px-2 py-1 text-xs font-bold text-[#434655]">
                        {gradeLabel(el.grade_final)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {inspection.observaciones && (
              <Section title="Observaciones">
                <p className="whitespace-pre-wrap text-sm text-[#434655]">{inspection.observaciones}</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[#e8eaf2] bg-white p-5 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
      <h3 className="mb-3 font-heading text-sm font-bold text-[#0f1115]">{title}</h3>
      {children}
    </section>
  );
}

function RiskCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[#e8eaf2] bg-white p-4 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8a8fa0]">{label}</div>
      <div className="mt-1.5 font-heading text-base font-bold text-[#0f1115]">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8a8fa0]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#15171d]">{value || "—"}</dd>
    </div>
  );
}
