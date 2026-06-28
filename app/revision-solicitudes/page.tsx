"use client";

import { Fragment, useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";

import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApplicationStatus = "pending" | "approved" | "rejected";
type StatusFilter = ApplicationStatus;

type EngineerDocument = {
  path: string;
  filename: string;
  signed_url: string | null;
};

type EngineerApplication = {
  id: string;
  email: string | null;
  full_name: string | null;
  license_number: string | null;
  specialty: string | null;
  city: string | null;
  country: string | null;
  years_experience: number | null;
  camera_affiliation: string | null;
  motivation: string | null;
  documents_summary: string | null;
  documents_storage_paths?: string[] | null;
  documents?: EngineerDocument[];
  profile_url: string | null;
  application_status: ApplicationStatus;
  is_certified: boolean;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "reviewer" | "admin";
  reviewer?: boolean;
};

type ApplicationsResponse = {
  data?: EngineerApplication[];
  meta?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  error?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const ALL_STATUSES: StatusFilter[] = ["pending", "approved", "rejected"];

type FilterState = {
  search: string;
  statuses: StatusFilter[];
};

const INITIAL_FILTERS: FilterState = {
  search: "",
  statuses: [...ALL_STATUSES],
};

export default function RevisionSolicitudesPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<EngineerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mutating, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const sessionResponse = await fetch("/api/auth/me");
        const sessionBody = (await sessionResponse.json()) as { data?: SessionData };

        if (!active) {
          return;
        }

        if (!sessionResponse.ok || (!sessionBody.data?.reviewer && sessionBody.data?.role !== "admin")) {
          router.replace("/login?reason=auth");
          return;
        }

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(DEFAULT_PAGE_SIZE));

        if (filters.search.trim()) {
          params.set("search", filters.search.trim());
        }

        if (filters.statuses.length > 0) {
          params.set("statuses", filters.statuses.join(","));
        }

        const applicationsResponse = await fetch(`/api/ingenieros/solicitudes?${params.toString()}`);
        const applicationsBody = (await applicationsResponse.json()) as ApplicationsResponse;

        if (!active) {
          return;
        }

        if (!applicationsResponse.ok) {
          setError(applicationsBody.error ?? "No se pudieron cargar las solicitudes.");
          setApplications([]);
          setPagination((current) => ({ ...current, total: 0, totalPages: 1 }));
          setLoading(false);
          return;
        }

        const nextApplications = applicationsBody.data ?? [];
        const nextPagination = applicationsBody.meta ?? {
          page,
          page_size: DEFAULT_PAGE_SIZE,
          total: nextApplications.length,
          total_pages: 1,
        };

        setApplications(nextApplications);
        const nextTotalPages = Math.max(1, nextPagination.total_pages);

        setPagination({
          page: nextPagination.page,
          pageSize: nextPagination.page_size,
          total: nextPagination.total,
          totalPages: nextTotalPages,
        });

        if (page > nextTotalPages) {
          setPage(nextTotalPages);
        }

        setLoading(false);
      } catch {
        if (!active) {
          return;
        }

        setError("No se pudieron cargar las solicitudes.");
        setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filters, page, refreshKey, router]);

  const counts = useMemo(
    () =>
      applications.reduce(
        (acc, app) => {
          acc[app.application_status] += 1;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 } as Record<ApplicationStatus, number>
      ),
    [applications]
  );

  const handleDecision = (id: string, decision: "approved" | "rejected") => {
    startTransition(async () => {
      setPendingId(id);
      setError(null);

      try {
        const response = await fetch(`/api/ingenieros/solicitudes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, review_notes: notes[id] }),
        });

        const body = (await response.json()) as { data?: EngineerApplication; error?: string };

        if (!response.ok) {
          setError(body.error ?? "No se pudo actualizar la solicitud.");
          setPendingId(null);
          return;
        }

        setApplications((current) => current.map((application) => (application.id === id ? (body.data as EngineerApplication) : application)));
        setPendingId(null);
        setRefreshKey((value) => value + 1);
      } catch {
        setError("Error de conexión. No se pudo actualizar la solicitud.");
        setPendingId(null);
      }
    });
  };

  const toggleStatus = (status: StatusFilter) => {
    setFilters((current) => ({
      ...current,
      statuses: current.statuses.includes(status)
        ? current.statuses.filter((item) => item !== status)
        : [...current.statuses, status],
    }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const totalResults = pagination.total;
  const startResult = totalResults === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endResult = Math.min(pagination.page * pagination.pageSize, totalResults);

  return (
    <main className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30">
        <div
          aria-hidden
          className="h-[18px] w-full"
          style={{ background: "linear-gradient(to bottom, #FCD116 0 33.333%, #00247D 33.333% 66.666%, #CF142B 66.666% 100%)" }}
        />
        <div className="border-b border-outline-variant bg-surface/95 backdrop-blur-md">
          <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5">
            <Link href="/" className="inline-flex items-center gap-2 justify-self-start text-sm font-medium text-on-surface-variant hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
            <div className="text-center">
              <h1 className="font-heading text-[22px] font-bold leading-none text-primary">Revisión de solicitudes</h1>
              <p className="mt-1 text-[11px] text-on-surface-variant">Equipo revisor de la Cámara de Ingenieros Civiles de Venezuela</p>
            </div>
            <div className="justify-self-end">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-6">
        <div className="space-y-6">
          <div className="rounded-[18px] border border-outline-variant bg-white p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Panel de revisión</p>
            <h2 className="mt-1 font-heading text-2xl font-semibold text-on-surface">Solicitudes de voluntarios</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Usa la búsqueda general, filtra por estado y revisa cada aplicación con sus documentos adjuntos.
            </p>
          </div>

          <div className="rounded-[18px] border border-outline-variant bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3">
                <FilterField
                  label="Búsqueda"
                  value={filters.search}
                  onChange={(value) => {
                    setFilters((current) => ({ ...current, search: value }));
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre, ciudad, colegiado o especialidad"
                  icon={Search}
                />
                <p className="text-xs text-on-surface-variant">
                  La búsqueda cruza nombre, ciudad, colegiado, especialidad y correo.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:w-[380px]">
                <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                  <Filter className="h-4 w-4" />
                  Estados
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        toggleStatus(status);
                        setPage(1);
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors",
                        filters.statuses.includes(status)
                          ? status === "approved"
                            ? "border-secondary/20 bg-secondary-container/60 text-on-surface"
                            : status === "rejected"
                              ? "border-error/20 bg-error-container/60 text-on-surface"
                              : "border-primary/15 bg-primary-fixed/60 text-on-surface"
                          : "border-outline-variant bg-white text-on-surface-variant"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {status === "pending" ? "Pendiente" : status === "approved" ? "Aprobado" : "Rechazado"}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-[16px] border-outline-variant bg-white text-sm font-semibold text-on-surface hover:bg-surface-container"
                    onClick={() => {
                      clearFilters();
                      setPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-outline-variant bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col gap-2 border-b border-outline-variant px-4 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <p>
                {loading ? "Cargando solicitudes…" : `${totalResults} resultados · ${startResult}-${endResult} en esta página`}
              </p>
              <p>Haz clic en una fila para ver documentos, notas y acciones.</p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-outline-variant px-4 py-3">
              <SummaryPill label="Pendientes" value={counts.pending} tone="pending" />
              <SummaryPill label="Aprobadas" value={counts.approved} tone="approved" />
              <SummaryPill label="Rechazadas" value={counts.rejected} tone="rejected" />
            </div>

            {error ? (
              <div className="m-4 rounded-[16px] border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando solicitudes…
              </div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-sm text-on-surface-variant">No hay solicitudes que coincidan con estos filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-separate border-spacing-0">
                  <thead className="bg-surface-container-low/70 text-left text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                    <tr>
                      <th className="sticky left-0 z-10 border-b border-outline-variant/70 bg-surface-container-low/70 px-4 py-3">Estado</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Nombre</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Ciudad</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Colegiado</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Especialidad</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Documentos</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3">Recibida</th>
                      <th className="border-b border-outline-variant/70 px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => {
                      const expanded = expandedId === application.id;
                      const note = notes[application.id] ?? application.review_notes ?? "";
                      const canAct = application.application_status === "pending";
                      const documents = application.documents ?? [];
                      const selectedPath = selectedDocuments[application.id] ?? documents[0]?.path ?? null;
                      const selectedDocument = documents.find((document) => document.path === selectedPath) ?? documents[0] ?? null;

                      return (
                        <Fragment key={application.id}>
                          <tr
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-surface-container-low/70",
                              expanded && "bg-surface-container-low/80"
                            )}
                            onClick={() => {
                              setExpandedId((current) => (current === application.id ? null : application.id));
                              if (!expanded && documents[0]) {
                                setSelectedDocuments((current) => ({ ...current, [application.id]: documents[0].path }));
                              }
                            }}
                          >
                            <td className="sticky left-0 z-10 border-b border-outline-variant/70 bg-inherit px-4 py-4">
                              <StatusBadge status={application.application_status} />
                            </td>
                            <td className="border-b border-outline-variant/70 px-4 py-4">
                              <div className="space-y-1">
                                <p className="font-medium text-on-surface">{application.full_name ?? "Solicitud sin nombre"}</p>
                                <p className="text-xs text-on-surface-variant">{application.email ?? "Sin correo"}</p>
                              </div>
                            </td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-sm text-on-surface">{application.city ?? "No indicado"}</td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-sm text-on-surface">
                              {application.license_number ?? "No indicado"}
                            </td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-sm text-on-surface">{application.specialty ?? "No indicado"}</td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-sm text-on-surface">
                              {documents.length > 0 ? `${documents.length} archivo(s)` : application.documents_summary ?? "No indicados"}
                            </td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-sm text-on-surface-variant">
                              {new Date(application.created_at).toLocaleString("es-VE")}
                            </td>
                            <td className="border-b border-outline-variant/70 px-4 py-4 text-right">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-outline-variant/70 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:bg-surface-container-low"
                              >
                                {expanded ? "Ocultar" : "Ver"}
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                              </button>
                            </td>
                          </tr>

                          {expanded ? (
                            <tr>
                              <td colSpan={8} className="border-b border-outline-variant/70 bg-surface-container-low/60 px-4 py-4">
                                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                                  <div className="space-y-4">
                                    <div className="grid gap-3 rounded-[18px] border border-outline-variant/70 bg-white p-4 text-sm text-on-surface sm:grid-cols-2">
                                      <Info label="País" value={application.country ?? "No indicado"} />
                                      <Info label="Experiencia" value={application.years_experience === null ? "No indicado" : `${application.years_experience} años`} />
                                      <Info label="Cámara" value={application.camera_affiliation ?? "No indicado"} />
                                      <Info label="Perfil" value={application.profile_url ?? "No indicado"} />
                                    </div>

                                    <div className="rounded-[18px] border border-outline-variant/70 bg-white p-4">
                                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Documentos adjuntos
                                      </div>

                                      {documents.length === 0 ? (
                                        <p className="text-sm text-on-surface-variant">No se adjuntaron documentos.</p>
                                      ) : (
                                        <div className="space-y-3">
                                          <div className="flex flex-wrap gap-2">
                                            {documents.map((document) => (
                                              <button
                                                key={document.path}
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  setSelectedDocuments((current) => ({ ...current, [application.id]: document.path }));
                                                }}
                                                className={cn(
                                                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                                                  selectedDocument?.path === document.path
                                                    ? "border-primary bg-primary-fixed text-on-primary-fixed-variant"
                                                    : "border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container"
                                                )}
                                              >
                                                <span className="max-w-[220px] truncate">{document.filename}</span>
                                              </button>
                                            ))}
                                          </div>

                                          {selectedDocument ? <DocumentPreview document={selectedDocument} /> : null}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="rounded-[18px] border border-outline-variant/70 bg-white p-4">
                                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface">
                                        <Eye className="h-4 w-4 text-primary" />
                                        Resumen
                                      </div>
                                      <div className="space-y-3 text-sm leading-6 text-on-surface">
                                        <p>
                                          <span className="font-medium text-on-surface-variant">Motivación: </span>
                                          {application.motivation ?? "No indicada"}
                                        </p>
                                        <p>
                                          <span className="font-medium text-on-surface-variant">Documentos: </span>
                                          {application.documents_summary ?? "No indicados"}
                                        </p>
                                      </div>
                                    </div>

                                    <label className="block space-y-2">
                                      <span className="text-sm font-medium text-on-surface-variant">Notas de revisión</span>
                                      <textarea
                                        value={note}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                                        rows={4}
                                        className="w-full rounded-[16px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
                                        placeholder="Observaciones para la decisión..."
                                      />
                                    </label>

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                      <Button
                                        type="button"
                                        className="h-11 flex-1 rounded-[18px] bg-secondary text-white hover:bg-secondary/90"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDecision(application.id, "approved");
                                        }}
                                        disabled={!canAct || mutating || pendingId === application.id}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Aprobar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 flex-1 rounded-[18px] border-outline-variant bg-white text-on-surface hover:bg-surface-container"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDecision(application.id, "rejected");
                                        }}
                                        disabled={!canAct || mutating || pendingId === application.id}
                                      >
                                        <XCircle className="h-4 w-4" />
                                        Rechazar
                                      </Button>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                      <Clock3 className="h-3.5 w-3.5" />
                                      <span>Recibida {new Date(application.created_at).toLocaleString("es-VE")}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-on-surface-variant">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[16px] border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface hover:bg-surface-container"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[16px] border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface hover:bg-surface-container"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon = Search,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-[16px] border border-outline-variant bg-surface-container-lowest px-4 focus-within:border-primary">
        <Icon className="h-4 w-4 text-on-surface-variant" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full border-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>
    </label>
  );
}

function DocumentPreview({ document }: { document: EngineerDocument }) {
  const isPdf = document.filename.toLowerCase().endsWith(".pdf");
  const isImage = /\.(png|jpe?g|webp)$/i.test(document.filename);

  if (!document.signed_url) {
    return (
      <div className="rounded-[18px] border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">
        No se pudo generar un enlace de vista previa para este archivo.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-low">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant bg-white px-4 py-3 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-on-surface">{document.filename}</p>
          <p className="text-xs text-on-surface-variant">
            {isPdf ? "PDF" : isImage ? "Imagen" : "Documento"} · vista previa temporal
          </p>
        </div>
        <a
          href={document.signed_url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant hover:bg-surface-container"
        >
          Abrir
          <ArrowLeft className="h-3 w-3 rotate-180" />
        </a>
      </div>

      {isPdf ? (
        <iframe title={document.filename} src={document.signed_url} className="h-[520px] w-full bg-white" />
      ) : isImage ? (
        <div className="bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={document.signed_url} alt={document.filename} className="max-h-[520px] w-full rounded-[14px] object-contain" />
        </div>
      ) : (
        <div className="space-y-3 p-4 text-sm text-on-surface-variant">
          <div className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Este formato no se incrusta de forma nativa, pero puedes abrirlo en una pestaña nueva o descargarlo desde el enlace de arriba.
            </p>
          </div>
          <div className="rounded-[16px] border border-outline-variant bg-white p-3">
            <p className="font-medium text-on-surface">{document.filename}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pending" | "approved" | "rejected";
}) {
  const className =
    tone === "approved"
      ? "border-secondary/20 bg-secondary-container/35 text-secondary"
      : tone === "rejected"
        ? "border-error/20 bg-error-container/35 text-error"
        : "border-primary/15 bg-primary-fixed/35 text-primary";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]", className)}>
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {label} {value}
    </span>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles =
    status === "approved"
      ? "border-secondary/20 bg-secondary-container/35 text-secondary"
      : status === "rejected"
        ? "border-error/20 bg-error-container/35 text-error"
        : "border-primary/20 bg-primary-fixed/35 text-primary";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]", styles)}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status === "pending" ? "Pendiente" : status === "approved" ? "Aprobado" : "Rechazado"}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface">{value}</p>
    </div>
  );
}
