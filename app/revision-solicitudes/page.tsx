"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileBadge2, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SupportingDocument = {
  name: string;
  type: string;
  size: number;
  storage_path: string;
};

type ApplicationRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  document_number: string | null;
  specialty: string | null;
  collegiate_status: string | null;
  license_number: string | null;
  city: string | null;
  country: string | null;
  years_experience: number | null;
  organization: string | null;
  linkedin_url: string | null;
  motivation: string | null;
  supporting_documents: SupportingDocument[] | null;
  application_status: "pending" | "approved" | "rejected";
  is_certified: boolean;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function statusStyles(status: ApplicationRecord["application_status"]) {
  switch (status) {
    case "approved":
      return "bg-secondary-container text-on-secondary-container";
    case "rejected":
      return "bg-error-container text-on-error-container";
    default:
      return "bg-tertiary-fixed text-[#653e00]";
  }
}

function statusLabel(status: ApplicationRecord["application_status"]) {
  switch (status) {
    case "approved":
      return "Aprobada";
    case "rejected":
      return "Rechazada";
    default:
      return "Pendiente";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ReviewApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ingenieros/solicitudes", { cache: "no-store" });
      const body = (await response.json()) as { data?: ApplicationRecord[]; error?: string };

      if (!response.ok) {
        setError(body.error ?? "No pudimos cargar las solicitudes.");
        return;
      }

      const nextApplications = body.data ?? [];
      setApplications(nextApplications);
      setNotes(Object.fromEntries(nextApplications.map((application) => [application.id, application.review_notes ?? ""])));
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadApplications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredApplications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return applications;
    }

    return applications.filter((application) => {
      return [application.email, application.full_name, application.specialty, application.city, application.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [applications, query]);

  const counts = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((item) => item.application_status === "pending").length,
      approved: applications.filter((item) => item.application_status === "approved").length,
      rejected: applications.filter((item) => item.application_status === "rejected").length,
    }),
    [applications]
  );

  const updateStatus = async (id: string, application_status: "approved" | "rejected") => {
    setSavingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/ingenieros/solicitudes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_status,
          review_notes: notes[id] ?? "",
        }),
      });

      const body = (await response.json()) as { data?: ApplicationRecord; error?: string };

      if (!response.ok) {
        setError(body.error ?? "No pudimos guardar la revisión.");
        return;
      }

      setApplications((current) => current.map((item) => (item.id === id ? (body.data ?? item) : item)));
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_40%),linear-gradient(180deg,#faf8ff_0%,#f8fafc_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
            <ShieldCheck className="h-3.5 w-3.5" />
            Revisión de solicitudes
          </div>
        </header>

        <Card className="overflow-hidden rounded-[28px] border border-outline-variant/40 bg-surface-container-lowest shadow-[0px_24px_90px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-3 border-b border-outline-variant/30 bg-surface-container-low px-6 py-6 sm:px-8">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                Total: {counts.total}
              </span>
              <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#653e00]">
                Pendientes: {counts.pending}
              </span>
              <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-secondary-container">
                Aprobadas: {counts.approved}
              </span>
              <span className="rounded-full bg-error-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-error-container">
                Rechazadas: {counts.rejected}
              </span>
            </div>
            <div className="max-w-3xl space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-primary">
                <FileBadge2 className="h-4 w-4" />
                Cámara de Ingenieros Civiles de Venezuela
              </p>
              <CardTitle className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-[36px]">
                Bandeja de solicitudes
              </CardTitle>
              <CardDescription className="text-base leading-7 text-on-surface-variant">
                Revisa cada postulación, verifica los respaldos y decide si la solicitud queda aprobada o rechazada.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex h-12 w-full max-w-xl items-center gap-2 rounded-[16px] border border-outline-variant bg-surface px-4">
                <Search className="h-4 w-4 text-on-surface-variant" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre, correo, ciudad o especialidad"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-on-surface-variant"
                />
              </label>
              <Button type="button" variant="outline" className="h-12 rounded-[16px] px-5" onClick={() => void loadApplications()}>
                <RefreshCw className="h-4 w-4" />
                Recargar
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-6 sm:p-8">
            {loading ? (
              <div className="rounded-[20px] border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
                Cargando solicitudes...
              </div>
            ) : error ? (
              <div className="rounded-[20px] border border-error/20 bg-error-container p-6 text-sm text-on-error-container">
                {error}
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-[20px] border border-outline-variant/40 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
                No hay solicitudes para mostrar con ese filtro.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredApplications.map((application) => {
                  const documentCount = application.supporting_documents?.length ?? 0;
                  return (
                    <div key={application.id} className="rounded-[24px] border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]", statusStyles(application.application_status))}>
                              {statusLabel(application.application_status)}
                            </span>
                            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                              {application.is_certified ? "Certificada" : "Pendiente de certificación"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h2 className="font-heading text-2xl font-semibold text-on-surface">
                              {application.full_name ?? "Solicitud sin nombre"}
                            </h2>
                            <p className="text-sm leading-6 text-on-surface-variant">
                              {application.email ?? "Correo no indicado"} · {application.specialty ?? "Especialidad no indicada"}
                            </p>
                          </div>
                          <div className="grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2 xl:grid-cols-3">
                            <p>
                              <span className="font-semibold text-on-surface">Documento:</span> {application.document_number ?? "No indicado"}
                            </p>
                            <p>
                              <span className="font-semibold text-on-surface">Colegiatura:</span> {application.collegiate_status ?? "No indicado"}
                            </p>
                            <p>
                              <span className="font-semibold text-on-surface">Ciudad:</span> {application.city ?? "No indicada"}
                            </p>
                            <p>
                              <span className="font-semibold text-on-surface">País:</span> {application.country ?? "No indicado"}
                            </p>
                            <p>
                              <span className="font-semibold text-on-surface">Experiencia:</span>{" "}
                              {application.years_experience !== null ? `${application.years_experience} años` : "No indicada"}
                            </p>
                            <p>
                              <span className="font-semibold text-on-surface">Número de colegiado:</span>{" "}
                              {application.license_number ?? "No indicado"}
                            </p>
                          </div>
                          {application.motivation ? (
                            <div className="rounded-[18px] border border-outline-variant/40 bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant">
                              {application.motivation}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(application.created_at)}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                              {documentCount} documento{documentCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          {documentCount > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-on-surface">Respaldo documental</p>
                              <div className="flex flex-wrap gap-2">
                                {application.supporting_documents?.map((document) => (
                                  <span
                                    key={document.storage_path}
                                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs text-on-surface-variant"
                                  >
                                    <FileBadge2 className="h-3.5 w-3.5" />
                                    {document.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="w-full max-w-xl space-y-3 rounded-[22px] border border-outline-variant/40 bg-surface-container-low p-4">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-on-surface-variant">Nota de revisión</span>
                            <textarea
                              rows={5}
                              value={notes[application.id] ?? ""}
                              onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                              placeholder="Escribe cualquier observación para el expediente interno."
                              className="w-full rounded-[16px] border border-outline-variant bg-surface px-4 py-3 text-sm outline-none placeholder:text-on-surface-variant"
                            />
                          </label>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              type="button"
                              className="h-12 flex-1 rounded-[16px]"
                              disabled={savingId === application.id}
                              onClick={() => void updateStatus(application.id, "approved")}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Aprobar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-12 flex-1 rounded-[16px]"
                              disabled={savingId === application.id}
                              onClick={() => void updateStatus(application.id, "rejected")}
                            >
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
