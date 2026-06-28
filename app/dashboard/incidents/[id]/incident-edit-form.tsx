"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILDING_USE_OPTIONS, VERDICT_LABELS, type VerdictLevel } from "@/lib/assessment";
import { getCurrentGeoPoint } from "@/lib/geolocation";
import type { Tables } from "@/lib/database.types";
import { IncidentLocationMap } from "@/app/dashboard/incidents/[id]/incident-location-map";

export function IncidentEditForm({
  id,
  incident,
}: {
  id: string;
  incident: Pick<
    Tables<"incidents">,
    | "state"
    | "severity"
    | "ai_verdict"
    | "confidence"
    | "finding"
    | "analysis_status"
    | "assigned_to"
    | "feedback"
    | "contact"
    | "building_use"
    | "build_year"
    | "levels"
    | "basements"
    | "material"
    | "terrain_type"
    | "latitude"
    | "longitude"
  >;
  }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, startLocating] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<string>(incident.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState<string>(incident.longitude?.toString() ?? "");

  const locationPoint = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { latitude: null, longitude: null };
    }

    return { latitude: lat, longitude: lng };
  }, [latitude, longitude]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    startTransition(async () => {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string; data?: unknown };

      if (!response.ok) {
        setError(body.error ?? "No se pudo guardar el incidente.");
        return;
      }

      setMessage("Incidente actualizado.");
      router.refresh();
    });
  };

  const handleLocateMe = () => {
    setError(null);
    setMessage(null);

    startLocating(async () => {
      try {
        const point = await getCurrentGeoPoint();
        setLatitude(String(point.latitude));
        setLongitude(String(point.longitude));
        setMessage("Ubicación obtenida desde el dispositivo.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo obtener la ubicación.");
      }
    });
  };

  return (
    <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold text-on-surface">Editar incidente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField label="Estado" name="state" defaultValue={incident.state ?? ""} />
          <SelectField label="Severidad" name="severity" defaultValue={incident.severity ?? ""} />
          <InputField label="Veredicto IA" name="ai_verdict" defaultValue={incident.ai_verdict ?? ""} />
          <InputField label="Confianza" name="confidence" type="number" defaultValue={incident.confidence ?? ""} />
          <InputField label="Hallazgo" name="finding" defaultValue={incident.finding ?? ""} />
          <InputField label="Estado análisis" name="analysis_status" defaultValue={incident.analysis_status ?? ""} />
          <InputField label="Asignado a" name="assigned_to" defaultValue={incident.assigned_to ?? ""} />
          <InputField label="Contacto" name="contact" defaultValue={incident.contact ?? ""} />
          <SelectField label="Uso del edificio" name="building_use" defaultValue={incident.building_use ?? ""}>
            {BUILDING_USE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <InputField label="Año de construcción" name="build_year" type="number" defaultValue={incident.build_year ?? ""} />
          <InputField label="Niveles" name="levels" type="number" defaultValue={incident.levels ?? ""} />
          <InputField label="Sótanos" name="basements" type="number" defaultValue={incident.basements ?? ""} />
          <InputField label="Material" name="material" defaultValue={incident.material ?? ""} />
          <InputField label="Tipo de terreno" name="terrain_type" defaultValue={incident.terrain_type ?? ""} />
          <div className="md:col-span-2 rounded-[20px] border border-outline-variant/70 bg-surface-container-low p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-on-surface">Localización</span>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-60"
                aria-label="Localízame"
                title="Localízame"
              >
                <LocateFixed className="h-4 w-4 text-on-surface-variant" />
                <span>Localízame</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="Latitud"
                name="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
              <InputField
                label="Longitud"
                name="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </div>
            <div className="mt-4">
              <IncidentLocationMap latitude={locationPoint.latitude} longitude={locationPoint.longitude} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-on-surface">Feedback</span>
              <textarea
                name="feedback"
                defaultValue={incident.feedback ?? ""}
                rows={4}
                className="w-full rounded-[16px] border border-outline-variant bg-surface px-4 py-3 text-sm outline-none placeholder:text-on-surface-variant focus:border-primary"
              />
            </label>
          </div>

          {error && (
            <p className="md:col-span-2 rounded-[16px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
              {error}
            </p>
          )}

          {message && (
            <p className="md:col-span-2 rounded-[16px] border border-secondary/20 bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              {message}
            </p>
          )}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending} className="h-11 rounded-[16px] px-5">
              {pending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InputField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-[16px] border border-outline-variant bg-surface px-4 text-sm outline-none placeholder:text-on-surface-variant focus:border-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  defaultValue,
  children,
  ...props
}: Omit<InputHTMLAttributes<HTMLSelectElement>, "defaultValue"> & {
  label: string;
  defaultValue?: string;
  children?: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      <select
        {...props}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-[16px] border border-outline-variant bg-surface px-4 text-sm outline-none focus:border-primary"
      >
        <option value="" disabled>
          Selecciona una opción
        </option>
        {children ?? (Object.keys(VERDICT_LABELS) as VerdictLevel[]).map((verdict) => (
          <option key={verdict} value={verdict}>
            {VERDICT_LABELS[verdict]}
          </option>
        ))}
      </select>
    </label>
  );
}
