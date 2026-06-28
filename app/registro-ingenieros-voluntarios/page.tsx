"use client";

import { useMemo, useRef, useState, useTransition, type ComponentType, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Specialty = "Ingeniería Civil" | "Ingeniería Estructural" | "Arquitectura" | "Otra";

type ApplicationDraft = {
  email: string;
  full_name: string;
  license_number: string;
  specialty: Specialty | "";
  city: string;
  country: string;
  years_experience: string;
  camera_affiliation: string;
  motivation: string;
  profile_url: string;
};

type ValidationErrors = Partial<Record<keyof ApplicationDraft | "documents", string>>;

const INITIAL_DRAFT: ApplicationDraft = {
  email: "",
  full_name: "",
  license_number: "",
  specialty: "",
  city: "",
  country: "Venezuela",
  years_experience: "",
  camera_affiliation: "Cámara de Ingenieros Civiles de Venezuela",
  motivation: "",
  profile_url: "",
};

const SPECIALTY_OPTIONS: Specialty[] = ["Ingeniería Civil", "Ingeniería Estructural", "Arquitectura", "Otra"];
const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/msword",
]);

export default function VolunteerEngineerRegistrationPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<ApplicationDraft>(INITIAL_DRAFT);
  const [documents, setDocuments] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = step === 1 ? 50 : 100;

  const reviewDocuments = useMemo(
    () =>
      documents.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || inferMimeType(file.name),
      })),
    [documents]
  );

  const setField = <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const addDocuments = (files: FileList | File[] | null | undefined) => {
    if (!files || files.length === 0) {
      return;
    }

    const next = Array.from(files);
    const oversized = next.find((file) => file.size > MAX_DOCUMENT_FILE_SIZE);
    if (oversized) {
      setFieldErrors((current) => ({ ...current, documents: `El archivo "${oversized.name}" supera los 10 MB permitidos.` }));
      return;
    }

    const invalid = next.find((file) => !isAllowedDocumentFile(file));
    if (invalid) {
      setFieldErrors((current) => ({ ...current, documents: `El archivo "${invalid.name}" tiene un formato no permitido.` }));
      return;
    }

    setFieldErrors((current) => ({ ...current, documents: undefined }));
    setDocuments((current) => dedupeFiles([...current, ...next]));
  };

  const removeDocument = (index: number) => {
    setDocuments((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setFieldErrors((current) => ({ ...current, documents: undefined }));
  };

  const validateDraft = () => {
    const errors: ValidationErrors = {};
    const email = draft.email.trim();
    const fullName = draft.full_name.trim();
    const specialty = draft.specialty;
    const city = draft.city.trim();
    const licenseNumber = normalizeLicenseNumber(draft.license_number);
    const yearsExperience = draft.years_experience.trim();
    const profileUrl = draft.profile_url.trim();

    if (!email) {
      errors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Ingresa un correo electrónico válido.";
    }

    if (!fullName) {
      errors.full_name = "Ingresa tu nombre completo.";
    } else if (fullName.length < 2) {
      errors.full_name = "El nombre debe tener al menos 2 caracteres.";
    }

    if (licenseNumber && !/^(V|CVI)-\d+$/i.test(licenseNumber)) {
      errors.license_number = "La cédula o colegiado debe comenzar con V- o CVI-.";
    }

    if (!specialty) {
      errors.specialty = "Selecciona una especialidad.";
    }

    if (!city) {
      errors.city = "Indica la ciudad desde la que participas.";
    }

    if (yearsExperience) {
      const parsedYears = Number(yearsExperience);
      if (!Number.isInteger(parsedYears) || parsedYears < 0 || parsedYears > 80) {
        errors.years_experience = "Los años de experiencia deben estar entre 0 y 80.";
      }
    }

    if (profileUrl) {
      try {
        const url = new URL(profileUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.profile_url = "El perfil profesional debe usar http o https.";
        }
      } catch {
        errors.profile_url = "Ingresa una URL válida.";
      }
    }

    if (documents.length === 0) {
      errors.documents = "Adjunta al menos un archivo de respaldo.";
    } else {
      const oversized = documents.find((file) => file.size > MAX_DOCUMENT_FILE_SIZE);
      if (oversized) {
        errors.documents = `El archivo "${oversized.name}" supera los 10 MB permitidos.`;
      } else {
        const invalid = documents.find((file) => !isAllowedDocumentFile(file));
        if (invalid) {
          errors.documents = `El archivo "${invalid.name}" tiene un formato no permitido.`;
        }
      }
    }

    return errors;
  };

  const continueToReview = () => {
    setSubmitError(null);
    const errors = validateDraft();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setStep(2);
  };

  const submitApplication = () => {
    setSubmitError(null);
    const errors = validateDraft();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStep(1);
      return;
    }

    const payload = buildFormData(draft, documents);

    startTransition(async () => {
      try {
        const response = await fetch("/api/ingenieros/solicitudes", {
          method: "POST",
          body: payload,
        });

        const body = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          setSubmitError(body.error ?? "No se pudo enviar la solicitud.");
          return;
        }

        setSubmitted(true);
        setSubmitMessage(body.message ?? "Tu solicitud fue enviada para revisión.");
      } catch {
        setSubmitError("Error de conexión. No se pudo enviar la solicitud.");
      }
    });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30">
        <div
          aria-hidden
          className="h-[18px] w-full"
          style={{ background: "linear-gradient(to bottom, #FCD116 0 33.333%, #00247D 33.333% 66.666%, #CF142B 66.666% 100%)" }}
        />
        <div className="border-b border-outline-variant bg-surface/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-heading text-[22px] font-bold leading-none text-primary">Registro de ingenieros voluntarios</h1>
                <p className="mt-1 text-[11px] text-on-surface-variant">Cámara de Ingenieros Civiles de Venezuela</p>
              </div>
            </div>
            <div className="w-28" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="space-y-6">
          <div className="rounded-[18px] border border-outline-variant bg-white p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Paso {step} de 2</p>
                <h2 className="mt-1 font-heading text-2xl font-semibold text-on-surface">
                  {step === 1 ? "Completa tu solicitud" : "Revisa tu información"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  {step === 1
                    ? "No pedimos contraseña. Empezamos con tu correo y luego completamos el resto de tu perfil profesional."
                    : "Antes de enviar, confirma que la información está correcta. La revisión será manual."}
                </p>
              </div>
              <div className="w-full max-w-40">
                <div className="h-2 rounded-full bg-surface-container-high">
                  <div className="h-2 rounded-full bg-primary-container transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-right text-xs font-medium text-on-surface-variant">{progress}% completado</p>
              </div>
            </div>
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="rounded-[18px] border border-outline-variant bg-white p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]"
          >
            {!submitted ? (
              step === 1 ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueToReview();
                  }}
                  className="space-y-5"
                >
                  <SectionHeader
                    icon={UserRound}
                    title="Datos profesionales"
                    subtitle="Cuéntanos quién eres y en qué área quieres apoyar como voluntario."
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Correo electrónico *"
                      icon={Mail}
                      type="email"
                      value={draft.email}
                      onChange={(value) => setField("email", value)}
                      placeholder="tu@correo.com"
                      error={fieldErrors.email}
                    />
                    <Field
                      label="Nombre completo *"
                      icon={UserRound}
                      value={draft.full_name}
                      onChange={(value) => setField("full_name", value)}
                      placeholder="María Pérez"
                      error={fieldErrors.full_name}
                    />
                    <Field
                      label="Cédula / colegiado"
                      icon={BadgeCheck}
                      value={draft.license_number}
                      onChange={(value) => setField("license_number", value)}
                      placeholder="V-12345678 / CVI-12345"
                      error={fieldErrors.license_number}
                    />
                    <Field
                      label="Ciudad *"
                      icon={MapPin}
                      value={draft.city}
                      onChange={(value) => setField("city", value)}
                      placeholder="Caracas"
                      error={fieldErrors.city}
                    />
                    <Field
                      label="País"
                      icon={Building2}
                      value={draft.country}
                      onChange={(value) => setField("country", value)}
                      placeholder="Venezuela"
                    />
                    <SelectField
                      label="Especialidad *"
                      value={draft.specialty}
                      onChange={(value) => setField("specialty", value as Specialty)}
                      options={SPECIALTY_OPTIONS}
                      error={fieldErrors.specialty}
                    />
                  </div>

                  <div className="grid gap-4">
                    <Field
                      label="Años de experiencia"
                      icon={Building2}
                      value={draft.years_experience}
                      onChange={(value) => setField("years_experience", value)}
                      placeholder="8"
                      type="number"
                      min="0"
                      max="80"
                      error={fieldErrors.years_experience}
                    />
                    <Field
                      label="Cámara / afiliación"
                      icon={ShieldCheck}
                      value={draft.camera_affiliation}
                      onChange={(value) => setField("camera_affiliation", value)}
                      placeholder="Cámara de Ingenieros Civiles de Venezuela"
                    />
                    <Field
                      label="Perfil profesional"
                      icon={LinkIcon}
                      value={draft.profile_url}
                      onChange={(value) => setField("profile_url", value)}
                      placeholder="https://www.linkedin.com/in/..."
                      error={fieldErrors.profile_url}
                    />
                    <TextareaField
                      label="Motivación"
                      optional
                      value={draft.motivation}
                      onChange={(value) => setField("motivation", value)}
                      placeholder="Comparte por qué quieres participar y qué tipo de apoyo puedes aportar."
                    />
                    <FileUploadField
                      label="Documentos o respaldo *"
                      description="Adjunta uno o varios archivos en PDF, imágenes o documentos. Cada archivo debe pesar 10 MB o menos."
                      files={reviewDocuments}
                      error={fieldErrors.documents}
                      onBrowse={openFilePicker}
                      onDrop={(fileList) => addDocuments(fileList)}
                      onRemove={removeDocument}
                      dragActive={dragActive}
                      setDragActive={setDragActive}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="h-14 rounded-[18px] bg-primary text-base font-semibold text-white hover:bg-primary-container">
                      Continuar a revisión
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <SectionHeader
                    icon={CheckCircle2}
                    title="Revisión final"
                    subtitle="Esta es la versión que verá el equipo revisor antes de aprobar o rechazar tu aplicación."
                  />

                  <div className="soft-card space-y-3 rounded-[18px] p-4">
                    <SummaryRow label="Correo" value={draft.email} />
                    <SummaryRow label="Nombre" value={draft.full_name} />
                    <SummaryRow label="Cédula / colegiado" value={summaryValue(draft.license_number)} />
                    <SummaryRow label="Especialidad" value={draft.specialty || "No indicado"} />
                    <SummaryRow label="Ciudad" value={draft.city} />
                    <SummaryRow label="País" value={summaryValue(draft.country)} />
                    <SummaryRow label="Años de experiencia" value={summaryNumber(draft.years_experience)} />
                    <SummaryRow label="Cámara / afiliación" value={summaryValue(draft.camera_affiliation)} />
                    <SummaryRow label="Motivación" value={summaryValue(draft.motivation)} />
                    <SummaryRow
                      label="Documentos"
                      value={reviewDocuments.length > 0 ? reviewDocuments.map((file) => file.name).join(" · ") : "No indicado"}
                    />
                    <SummaryRow label="Perfil profesional" value={summaryValue(draft.profile_url)} />
                  </div>

                  <div className="rounded-[18px] border border-tertiary/20 bg-tertiary-fixed/40 p-4 text-sm leading-6 text-on-surface">
                    Al registrarte confirmas que la información es verídica, que participarás como voluntario sin remuneración y que tu
                    solicitud será revisada manualmente antes de activarte.
                  </div>

                  {submitError ? <p className="rounded-[16px] border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container">{submitError}</p> : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 rounded-[18px] border-outline-variant bg-white px-5 text-base font-semibold text-on-surface hover:bg-surface-container"
                      onClick={() => setStep(1)}
                      disabled={pending}
                    >
                      Volver al formulario
                    </Button>
                    <Button
                      type="button"
                      className="h-14 rounded-[18px] bg-primary text-base font-semibold text-white hover:bg-primary-container"
                      onClick={submitApplication}
                      disabled={pending}
                    >
                      {pending ? "Enviando solicitud..." : "Enviar solicitud"}
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-secondary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-semibold text-on-surface">Solicitud recibida</h2>
                  <p className="text-sm leading-6 text-on-surface-variant">
                    {submitMessage ?? "Tu solicitud quedó en cola de revisión. El equipo revisor la evaluará manualmente."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-[18px] border border-outline-variant bg-white text-sm font-semibold text-on-surface hover:bg-surface-container"
                  >
                    Volver al inicio
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-[18px] bg-primary text-sm font-semibold text-white hover:bg-primary-container"
                  >
                    Ir al acceso
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.odt,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text"
        onChange={(event) => {
          addDocuments(event.target.files);
          event.currentTarget.value = "";
        }}
        className="hidden"
      />
    </main>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-xl font-semibold text-on-surface">{title}</h3>
        <p className="text-sm leading-6 text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  error,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  min?: string;
  max?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-[16px] border bg-surface-container-lowest px-4 focus-within:border-primary",
          error ? "border-error" : "border-outline-variant"
        )}
      >
        <Icon className="h-4 w-4 text-on-surface-variant" />
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full border-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-12 w-full rounded-[16px] border bg-surface-container-lowest px-4 text-sm text-on-surface outline-none focus:border-primary",
          error ? "border-error" : "border-outline-variant"
        )}
      >
        <option value="">Seleccionar...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface-variant">
        {label}
        {optional ? <span className="ml-2 text-xs font-normal text-on-surface-variant">(opcional)</span> : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-[16px] border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
      />
    </label>
  );
}

function FileUploadField({
  label,
  description,
  files,
  error,
  onBrowse,
  onDrop,
  onRemove,
  dragActive,
  setDragActive,
}: {
  label: string;
  description: string;
  files: Array<{ key: string; name: string; size: string; type: string }>;
  error?: string;
  onBrowse: () => void;
  onDrop: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  dragActive: boolean;
  setDragActive: (value: boolean) => void;
}) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    onDrop(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <div
        className={cn(
          "upload-dashed rounded-[18px] bg-surface-container-lowest p-4 transition-colors",
          dragActive && "bg-primary-fixed/40"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-heading text-base font-semibold text-on-surface">Arrastra y suelta tus archivos</p>
            <p className="text-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-[18px] border-outline-variant bg-white px-5 text-sm font-semibold text-on-surface hover:bg-surface-container"
            onClick={onBrowse}
          >
            Elegir archivos
          </Button>
        </div>

        <AnimatePresence>
          {files.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2"
            >
              {files.map((file, index) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-outline-variant bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-on-surface">{file.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {file.type} · {file.size}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
                    aria-label={`Eliminar ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="text-xs leading-5 text-on-surface-variant">
        Formatos aceptados: PDF, PNG, JPG/JPEG, WEBP, DOC, DOCX y ODT. Cada archivo debe pesar 10 MB o menos.
      </p>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-outline-variant/50 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <span className="text-sm text-on-surface sm:max-w-[60%] sm:text-right">{value || "No indicado"}</span>
    </div>
  );
}

function summaryNumber(value: string) {
  return value.trim() ? value.trim() : "No indicado";
}

function summaryValue(value: string) {
  return value.trim() ? value.trim() : "No indicado";
}

function buildFormData(draft: ApplicationDraft, files: File[]) {
  const formData = new FormData();
  formData.append("email", draft.email.trim());
  formData.append("full_name", draft.full_name.trim());

  const licenseNumber = normalizeLicenseNumber(draft.license_number);
  if (licenseNumber) {
    formData.append("license_number", licenseNumber);
  }

  if (draft.specialty) {
    formData.append("specialty", draft.specialty);
  }

  formData.append("city", draft.city.trim());

  if (draft.country.trim()) {
    formData.append("country", draft.country.trim());
  }

  if (draft.years_experience.trim()) {
    formData.append("years_experience", draft.years_experience.trim());
  }

  if (draft.camera_affiliation.trim()) {
    formData.append("camera_affiliation", draft.camera_affiliation.trim());
  }

  if (draft.motivation.trim()) {
    formData.append("motivation", draft.motivation.trim());
  }

  if (draft.profile_url.trim()) {
    formData.append("profile_url", draft.profile_url.trim());
  }

  formData.append("documents_summary", files.map((file) => file.name).join(" · "));

  files.forEach((file) => {
    formData.append("documents", file, file.name);
  });

  return formData;
}

function dedupeFiles(files: File[]) {
  const seen = new Set<string>();
  const result: File[] = [];

  for (const file of files) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(file);
  }

  return result;
}

function isAllowedDocumentFile(file: File) {
  const mimeType = file.type || inferMimeType(file.name);
  return ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType);
}

function inferMimeType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "odt":
      return "application/vnd.oasis.opendocument.text";
    default:
      return "application/octet-stream";
  }
}

function normalizeLicenseNumber(value: string) {
  return value.trim().toUpperCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 1 0-5.657l2.343-2.343a4 4 0 0 1 5.657 5.657l-1.414 1.414"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 10a4 4 0 0 1 0 5.657l-2.343 2.343a4 4 0 1 1-5.657-5.657l1.414-1.414"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
