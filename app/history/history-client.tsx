"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle } from "lucide-react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { cn } from "@/lib/utils";
import { fromDbIncident, type DbIncident, type Incident } from "@/lib/incidents";
import type { VerdictLevel } from "@/lib/assessment";

type HistFilter = "all" | "certificada" | "borrador";

// Map the damage verdict to a habitability etiqueta (left-border color + chip).
const ETIQUETA: Record<VerdictLevel, { text: string; accent: string; bg: string; color: string }> = {
  menor: { text: "Habitable", accent: "#16a34a", bg: "#dcfce0", color: "#006e2d" },
  moderado: { text: "Habitable", accent: "#16a34a", bg: "#dcfce0", color: "#006e2d" },
  severo: { text: "Uso restringido", accent: "#ea8a00", bg: "#ffe7c2", color: "#653e00" },
  completo: { text: "Insegura", accent: "#ba1a1a", bg: "#ffdad6", color: "#93000a" },
};

// An incident is "certificada" when an engineer has been assigned/reviewed it.
function isCertificada(i: Incident) {
  return i.state === "resolved" || !!i.assignee;
}

export function HistoryClient() {
  const user = useConsoleUser();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<HistFilter>("all");

  useEffect(() => {
    let active = true;
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((body: { data?: DbIncident[] }) => {
        if (active) setIncidents((body.data ?? []).map(fromDbIncident));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = incidents.length;
    const certificadas = incidents.filter(isCertificada).length;
    const now = new Date();
    const esteMes = incidents.filter((i) => {
      const d = new Date(i.meta);
      return !Number.isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, certificadas, esteMes };
  }, [incidents]);

  const visible = useMemo(() => {
    if (filter === "all") return incidents;
    return incidents.filter((i) => (filter === "certificada" ? isCertificada(i) : !isCertificada(i)));
  }, [incidents, filter]);

  return (
    <ConsoleShell title="Inspecciones" subtitle="Historial de evaluaciones realizadas" showNewButton user={user} inspectionCount={incidents.length}>
      <div className="mx-auto max-w-[920px] px-4 py-6 md:px-6">
        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-3 gap-3.5">
          <StatCard label="Realizadas" value={stats.total} />
          <StatCard label="Este mes" value={stats.esteMes} />
          <StatCard label="Certificadas" value={stats.certificadas} sub={`${stats.total - stats.certificadas} en borrador`} />
        </div>

        {/* Heading + filters */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-[#0f1115]">Mis inspecciones</h2>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "Todas"],
                ["certificada", "Certificadas"],
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
            const et = ETIQUETA[i.verdict];
            const cert = isCertificada(i);
            return (
              <Link
                key={i.id}
                href={`/dashboard/incidents/${i.id}`}
                className="flex items-center gap-4 rounded-[14px] border border-[#ebedf4] bg-white p-[15px] pl-[18px] shadow-[0_1px_3px_rgba(20,30,60,.04)] transition-colors hover:border-primary"
                style={{ borderLeft: `4px solid ${et.accent}` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-heading text-[14.5px] font-bold text-[#15171d]">{i.title}</h3>
                    <span
                      className="rounded-[7px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em]"
                      style={{ background: et.bg, color: et.color }}
                    >
                      {et.text}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#7a7f90]">{i.attribution ?? "Sin dirección registrada"}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[12.5px] font-medium text-[#434655]">{i.meta}</div>
                  <div
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[11px] font-bold",
                      cert ? "bg-[#e7f8ea] text-[#006e2d]" : "bg-[#f1f3f9] text-[#6b6f80]",
                    )}
                  >
                    {cert ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                    {cert ? "Certificada" : "Borrador"}
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
