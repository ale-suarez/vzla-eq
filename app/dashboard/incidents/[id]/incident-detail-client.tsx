"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { DashboardTopBar } from "@/app/dashboard/dashboard-top-bar";
import { IncidentCard, IncidentCardSkeleton } from "@/app/dashboard/incident-card";
import { IncidentEditForm } from "@/app/dashboard/incidents/[id]/incident-edit-form";
import { fromDbIncident } from "@/lib/incidents";
import type { Tables } from "@/lib/database.types";

type Incident = Tables<"incidents">;

export function IncidentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const sessionResponse = await fetch("/api/auth/me");
      if (!sessionResponse.ok) {
        router.replace("/login?reason=auth");
        return;
      }

      const response = await fetch(`/api/incidents/${id}`);
      const body = (await response.json()) as { data?: Incident; error?: string };

      if (!active) {
        return;
      }

      if (!response.ok) {
        setError(body.error ?? "No se pudo cargar el incidente.");
        setLoading(false);
        return;
      }

      setIncident(body.data ?? null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, router]);

  if (loading) {
    return (
      <>
        <DashboardTopBar title="Incidencia" subtitle="Cargando detalle..." />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-8">
          <IncidentCardSkeleton eyebrow="Incidente" />
          <div className="grid gap-3">
            <div className="h-6 w-40 animate-pulse rounded bg-surface-container-high" />
            <div className="h-64 animate-pulse rounded-[28px] border border-outline-variant/70 bg-surface-container-low" />
          </div>
        </main>
      </>
    );
  }

  if (error || !incident) {
    return (
      <>
        <DashboardTopBar title="Incidencia" subtitle="Detalle no disponible" />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-20">
          <p className="text-sm text-on-surface-variant">{error ?? "Incidente no encontrado."}</p>
          <Link href="/dashboard" transitionTypes={["nav-back"]} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
            <ChevronLeft className="h-4 w-4" />
            Volver al Dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardTopBar title="Incidencia" subtitle={`${incident.building_use || "Incidente sin uso definido"} · ID ${incident.id}`} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-8">
        <Link href="/dashboard" transitionTypes={["nav-back"]} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
          <ChevronLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        <IncidentCard incident={fromDbIncident(incident)} showDetailsLink={false} eyebrow="Incidente" />

        <IncidentEditForm id={incident.id} incident={incident} />
      </main>
    </>
  );
}
