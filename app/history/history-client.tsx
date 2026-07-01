"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Circle } from "lucide-react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { cn } from "@/lib/utils";

type HistFilter = "all" | "enviada" | "borrador";

type Etiqueta = "verde" | "amarilla" | "roja";

// One inspection row as returned by GET /api/inspections?mine=1.
type InspectionRow = {
  id: string;
  planilla_no: string | null;
  address: string | null;
  estado: string | null;
  municipio: string | null;
  etiqueta: Etiqueta | null;
  submitted_at: string | null;
  created_at: string;
};

// Traffic-light etiqueta presentation (verde/amarilla/roja), faithful to the
// Boletín 61 label. Mirrors the planilla-form chips.
const ETIQUETA: Record<Etiqueta, { text: string; accent: string; bg: string; color: string }> = {
  verde: { text: "Habitable", accent: "#16a34a", bg: "#dcfce0", color: "#006e2d" },
  amarilla: { text: "Uso restringido", accent: "#ea8a00", bg: "#ffe7c2", color: "#653e00" },
  roja: { text: "Insegura", accent: "#ba1a1a", bg: "#ffdad6", color: "#93000a" },
};
// A draft may have no computed etiqueta yet — show a neutral pending style.
const ETIQUETA_PENDING = { text: "Sin etiqueta", accent: "#c2c6d4", bg: "#f1f3f9", color: "#6b6f80" };

function isSubmitted(i: InspectionRow) {
  return !!i.submitted_at;
}

function rowTitle(i: InspectionRow) {
  if (i.address) return i.address;
  const place = [i.municipio, i.estado].filter(Boolean).join(", ");
  if (place) return place;
  if (i.planilla_no) return `Planilla ${i.planilla_no}`;
  return "Inspección sin dirección";
}

function rowSubtitle(i: InspectionRow) {
  const parts = [i.planilla_no ? `Planilla ${i.planilla_no}` : null, i.municipio, i.estado].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Sin ubicación registrada";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

// Draft rows resume the planilla form; submitted rows open the read-only detail.
function rowHref(i: InspectionRow) {
  return isSubmitted(i) ? `/inspection/${i.id}` : `/inspection?id=${i.id}`;
}

export function HistoryClient() {
  const user = useConsoleUser();
  const searchParams = useSearchParams();
  const nuevaId = searchParams.get("nueva");
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [filter, setFilter] = useState<HistFilter>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/inspections?mine=1")
      .then((r) => r.json())
      .then((body: { data?: InspectionRow[] }) => {
        if (active) setInspections(body.data ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = inspections.length;
    const enviadas = inspections.filter(isSubmitted).length;
    const now = new Date();
    const esteMes = inspections.filter((i) => {
      const d = new Date(i.created_at);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, enviadas, esteMes };
  }, [inspections]);

  const visible = useMemo(() => {
    if (filter === "all") return inspections;
    return inspections.filter((i) => (filter === "enviada" ? isSubmitted(i) : !isSubmitted(i)));
  }, [inspections, filter]);

  return (
    <ConsoleShell title="Inspecciones" subtitle="Historial de evaluaciones realizadas" showNewButton user={user} inspectionCount={inspections.length}>
      <div className="mx-auto max-w-[920px] px-4 py-6 md:px-6">
        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-3 gap-3.5">
          <StatCard label="Realizadas" value={stats.total} />
          <StatCard label="Este mes" value={stats.esteMes} />
          <StatCard label="Enviadas" value={stats.enviadas} sub={`${stats.total - stats.enviadas} en borrador`} />
        </div>

        {/* Heading + filters */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-[#0f1115]">Mis inspecciones</h2>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "Todas"],
                ["enviada", "Enviadas"],
                ["borrador", "Borradores"],
              ] as [HistFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "whitespace-nowrap rounded-[9px] border px-3 py-1.5 text-xs font-semibold",
                  filter === key ? "border-primary bg-primary-fixed/40 text-primary" : "border-[#e2e5ef] bg-white text-[#6b6f80] hover:border-primary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-2.5">
          {visible.length === 0 && <p className="py-8 text-center text-sm text-on-surface-variant">Sin inspecciones que mostrar.</p>}
          {visible.map((i) => {
            const et = i.etiqueta ? ETIQUETA[i.etiqueta] : ETIQUETA_PENDING;
            const submitted = isSubmitted(i);
            const isNueva = i.id === nuevaId;
            return (
              <Link
                key={i.id}
                href={rowHref(i)}
                className={cn(
                  "flex items-center gap-4 rounded-[14px] border bg-white p-[15px] pl-[18px] shadow-[0_1px_3px_rgba(20,30,60,.04)] transition-colors hover:border-primary",
                  isNueva ? "border-primary ring-2 ring-primary/30" : "border-[#ebedf4]",
                )}
                style={{ borderLeft: `4px solid ${et.accent}` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-heading text-[14.5px] font-bold text-[#15171d]">{rowTitle(i)}</h3>
                    <span
                      className="rounded-[7px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em]"
                      style={{ background: et.bg, color: et.color }}
                    >
                      {et.text}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#7a7f90]">{rowSubtitle(i)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[12.5px] font-medium text-[#434655]">{formatDate(i.created_at)}</div>
                  <div
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[11px] font-bold",
                      submitted ? "bg-[#e7f8ea] text-[#006e2d]" : "bg-[#f1f3f9] text-[#6b6f80]",
                    )}
                  >
                    {submitted ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                    {submitted ? "Enviada" : "Borrador"}
                  </div>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#c2c6d4]" />
              </Link>
            );
          })}
        </div>
      </div>
    </ConsoleShell>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-[#e8eaf2] bg-white p-4 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[#8a8fa0]">{label}</div>
      <div className="mt-1.5 font-heading text-[26px] font-extrabold leading-none text-[#0f1115]">{value}</div>
      {sub && <div className="mt-1.5 text-xs font-medium text-[#7a7f90]">{sub}</div>}
    </div>
  );
}
