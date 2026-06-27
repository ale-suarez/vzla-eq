"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { NewIncidentForm } from "@/app/dashboard/new-incident-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import type { Tables } from "@/lib/database.types";

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "admin";
  email?: string;
  backoffice?: boolean;
};

type IncidentListItem = Pick<
  Tables<"incidents">,
  "id" | "state" | "severity" | "finding" | "contact" | "building_use"
>;

export function DashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const sessionResponse = await fetch("/api/auth/me");
      const sessionBody = (await sessionResponse.json()) as { data?: SessionData; error?: string };

      if (!active) {
        return;
      }

      if (!sessionResponse.ok || !sessionBody.data?.backoffice) {
        router.replace("/login?reason=auth");
        return;
      }

      setSession(sessionBody.data);

      const incidentsResponse = await fetch("/api/incidents");
      const incidentsBody = (await incidentsResponse.json()) as {
        data?: IncidentListItem[];
        error?: string;
      };

      if (!active) {
        return;
      }

      if (!incidentsResponse.ok) {
        setError(incidentsBody.error ?? "No se pudieron cargar los incidentes.");
        setLoading(false);
        return;
      }

      setIncidents(incidentsBody.data ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-20">
      <section className="flex flex-col gap-4 rounded-[28px] border border-outline-variant/70 bg-surface-container-low p-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            Panel de control
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-on-surface">
            {!session || session.role === "admin" ? "Administración total" : "Panel de ingenieros"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {session?.email ? (
              <>
                {session.email} {session.role === "admin" ? "tiene acceso administrativo" : "tiene acceso como ingeniero certificado"}.
              </>
            ) : (
              "Validando acceso..."
            )}
          </p>
        </div>

        <SignOutButton />
      </section>

      <NewIncidentForm />

      <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold text-on-surface">Incidentes recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-on-surface-variant">Cargando incidentes...</p>
          ) : error ? (
            <p className="rounded-[16px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
              {error}
            </p>
          ) : incidents.length > 0 ? (
            <div className="divide-y divide-outline-variant/40">
              {incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/dashboard/incidents/${incident.id}`}
                  className="flex items-center justify-between gap-4 px-1 py-4 transition-colors hover:text-primary"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-on-surface">
                      {incident.building_use || "Sin uso especificado"} · {incident.state}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {incident.finding || "Sin hallazgo"} · {incident.contact || "Sin contacto"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                    <span>{incident.severity || "sin severidad"}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Todavía no hay incidentes.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
