"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { IncidentEditForm } from "@/app/dashboard/incidents/[id]/incident-edit-form";
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-20">
        <p className="text-sm text-on-surface-variant">Cargando incidente...</p>
      </main>
    );
  }

  if (error || !incident) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-20">
        <p className="text-sm text-on-surface-variant">{error ?? "Incidente no encontrado."}</p>
        <Link href="/dashboard" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
          <ChevronLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-20">
      <Link href="/dashboard" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
        <ChevronLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <section className="rounded-[28px] border border-outline-variant/70 bg-surface-container-low p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Incidente</p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-on-surface">
          {incident.building_use || "Incidente sin uso definido"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          ID: {incident.id}
        </p>
      </section>

      <IncidentEditForm id={incident.id} incident={incident} />
    </main>
  );
}
