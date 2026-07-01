"use client";

import { useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import LocationPicker, { type PickedLocation } from "@/components/location-picker";
import { cn } from "@/lib/utils";

type Specialty = "Ingeniería Civil" | "Ingeniería Estructural" | "Arquitectura" | "Otra";

type ApplicationDraft = {
  email: string;
  full_name: string;
  cedula: string;
  colegiado: string;
  specialty: Specialty | "";
  latitude: number | null;
  longitude: number | null;
  address: string;
  years_experience: string;
  camera_affiliation: string;
  motivation: string;
  profile_url: string;
};

type ValidationErrors = Partial<Record<keyof ApplicationDraft | "location", string>>;

const INITIAL_DRAFT: ApplicationDraft = {
  email: "",
  full_name: "",
  cedula: "",
  colegiado: "",
  specialty: "",
  latitude: null,
  longitude: null,
  address: "",
  years_experience: "",
  camera_affiliation: "Cámara de Ingenieros Civiles de Venezuela",
  motivation: "",
  profile_url: "",
};

const SPECIALTY_OPTIONS: Specialty[] = ["Ingeniería Civil", "Ingeniería Estructural", "Arquitectura", "Otra"];

export function RegistrationForm({ inviteToken, inviteName }: { inviteToken?: string; inviteName?: string } = {}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<ApplicationDraft>(INITIAL_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const progress = step === 1 ? 50 : 100;

  const setField = <K extends keyof ApplicationDraft>(key: K, value: ApplicationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const setLocation = (location: PickedLocation) => {
    setDraft((current) => ({ ...current, ...location }));
    setFieldErrors((current) => ({ ...current, location: undefined }));
  };

  const validateDraft = () => {
    const errors: ValidationErrors = {};
    const email = draft.email.trim();
    const fullName = draft.full_name.trim();
    const specialty = draft.specialty;
    const cedula = normalizeLicenseNumber(draft.cedula);
    const colegiado = normalizeLicenseNumber(draft.colegiado);
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

    if (!cedula) {
      errors.cedula = "Ingresa tu cédula.";
    } else if (!/^V-\d+$/i.test(cedula)) {
      errors.cedula = "La cédula debe comenzar con V-.";
    }

    if (colegiado && !/^CVI-\d+$/i.test(colegiado)) {
      errors.colegiado = "El colegiado debe comenzar con CVI-.";
    }

    if (!specialty) {
      errors.specialty = "Selecciona una especialidad.";
    }

    // A pin is required so we can later match engineers to nearby incidents; the
    // geocoded address label is best-effort (mirrors the citizen incident form).
    if (draft.latitude === null || draft.longitude === null) {
      errors.location = "Marca tu ubicación en el mapa.";
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

    const payload = buildFormData(draft);
    if (inviteToken) payload.append("invite_token", inviteToken);

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
                <h1 className="font-heading text-[22px] font-bold leading-none text-primary">Chequeo Estructural</h1>
                <p className="mt-1 text-[11px] text-on-surface-variant">Registro de ingenieros voluntarios</p>
              </div>
            </div>
            <div className="w-28" />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="space-y-6">
          {inviteName && (
            <div className="flex items-center gap-3 rounded-[14px] border border-[#c5eccd] bg-[#e7f8ea] px-4 py-3">
              <BadgeCheck className="h-5 w-5 shrink-0 text-[#006e2d]" />
              <p className="text-sm text-[#006e2d]">
                <b className="font-semibold">Te invitó {inviteName}.</b> Completa tu solicitud — un
                administrador la revisará antes de darte acceso.
              </p>
            </div>
          )}
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
                      label="Cédula *"
                      icon={BadgeCheck}
                      value={draft.cedula}
                      onChange={(value) => setField("cedula", value)}
                      placeholder="V-12345678"
                      error={fieldErrors.cedula}
                    />
                    <Field
                      label="N° de colegiado (CVI)"
                      icon={BadgeCheck}
                      value={draft.colegiado}
                      onChange={(value) => setField("colegiado", value)}
                      placeholder="CVI-12345"
                      error={fieldErrors.colegiado}
                    />
                    <SelectField
                      label="Especialidad *"
                      value={draft.specialty}
                      onChange={(value) => setField("specialty", value as Specialty)}
                      options={SPECIALTY_OPTIONS}
                      error={fieldErrors.specialty}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-on-surface-variant">Ubicación *</span>
                    <p className="text-xs leading-5 text-on-surface-variant">
                      Marca el punto desde donde participas. Lo usamos para conectarte con incidencias cercanas.
                    </p>
                    <LocationPicker
                      value={{ latitude: draft.latitude, longitude: draft.longitude, address: draft.address }}
                      onChange={setLocation}
                    />
                    {fieldErrors.location ? <p className="text-xs text-error">{fieldErrors.location}</p> : null}
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
                    <SummaryRow label="Cédula" value={summaryValue(draft.cedula)} />
                    <SummaryRow label="N° de colegiado" value={summaryValue(draft.colegiado)} />
                    <SummaryRow label="Especialidad" value={draft.specialty || "No indicado"} />
                    <SummaryRow
                      label="Ubicación"
                      value={
                        draft.address.trim()
                          ? draft.address.trim()
                          : draft.latitude !== null && draft.longitude !== null
                            ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}`
                            : "No indicado"
                      }
                    />
                    <SummaryRow label="Años de experiencia" value={summaryNumber(draft.years_experience)} />
                    <SummaryRow label="Cámara / afiliación" value={summaryValue(draft.camera_affiliation)} />
                    <SummaryRow label="Motivación" value={summaryValue(draft.motivation)} />
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

function buildFormData(draft: ApplicationDraft) {
  const formData = new FormData();
  formData.append("email", draft.email.trim());
  formData.append("full_name", draft.full_name.trim());

  const cedula = normalizeLicenseNumber(draft.cedula);
  if (cedula) {
    formData.append("cedula", cedula);
  }

  const colegiado = normalizeLicenseNumber(draft.colegiado);
  if (colegiado) {
    formData.append("colegiado", colegiado);
  }

  if (draft.specialty) {
    formData.append("specialty", draft.specialty);
  }

  if (draft.latitude !== null) {
    formData.append("latitude", String(draft.latitude));
  }

  if (draft.longitude !== null) {
    formData.append("longitude", String(draft.longitude));
  }

  if (draft.address.trim()) {
    formData.append("address", draft.address.trim());
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

  return formData;
}

function normalizeLicenseNumber(value: string) {
  return value.trim().toUpperCase();
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

// /register — plain (un-attributed) registration entry point.
export default function VolunteerEngineerRegistrationPage() {
  return <RegistrationForm />;
}
