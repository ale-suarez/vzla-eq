"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { useRef, useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILDING_USE_OPTIONS } from "@/lib/assessment";
import { getCurrentGeoPoint } from "@/lib/geolocation";
import type { DbIncident } from "@/lib/incidents";

export function NewIncidentForm({
  onCreated,
}: {
  onCreated?: (incident: DbIncident) => void;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [locating, startLocating] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    startTransition(async () => {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string; data?: unknown };

      if (!response.ok) {
        setError(body.error ?? "No se pudo crear el incidente.");
        return;
      }

      if (body.data) {
        onCreated?.(body.data as DbIncident);
      }

      form.reset();
      setMessage("Incidente creado.");
    });
  };

  const handleLocateMe = () => {
    setError(null);
    setMessage(null);

    startLocating(async () => {
      try {
        const { latitude, longitude } = await getCurrentGeoPoint();
        const form = formRef.current;

        if (!form) {
          return;
        }

        const latInput = form.elements.namedItem("latitude");
        const lngInput = form.elements.namedItem("longitude");

        if (latInput instanceof HTMLInputElement) {
          latInput.value = String(latitude);
        }

        if (lngInput instanceof HTMLInputElement) {
          lngInput.value = String(longitude);
        }

        setMessage("Ubicación obtenida desde el dispositivo.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo obtener la ubicación.");
      }
    });
  };

  return (
    <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold text-on-surface">Nuevo incidente</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField label="Contacto" name="contact" placeholder="Nombre o teléfono" />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-on-surface">Uso del edificio</span>
            <select
              name="building_use"
              defaultValue=""
              className="h-11 w-full rounded-[16px] border border-outline-variant bg-surface px-4 text-sm outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              {BUILDING_USE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <InputField label="Año de construcción" name="build_year" type="number" />
          <InputField label="Niveles" name="levels" type="number" />
          <InputField label="Sótanos" name="basements" type="number" />
          <InputField label="Material" name="material" placeholder="Hormigón, acero..." />
          <InputField label="Tipo de terreno" name="terrain_type" placeholder="Roca, relleno..." />
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
              <InputField label="Latitud" name="latitude" type="number" step="any" />
              <InputField label="Longitud" name="longitude" type="number" step="any" />
            </div>
          </div>
          <div className="md:col-span-2">
            <InputField label="Feedback" name="feedback" placeholder="Observaciones del caso" />
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
              {pending ? "Creando..." : "Crear incidente"}
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
