"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";

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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold text-on-surface">Editar incidente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField label="Estado" name="state" defaultValue={incident.state ?? ""} />
          <InputField label="Severidad" name="severity" defaultValue={incident.severity ?? ""} />
          <InputField label="Veredicto IA" name="ai_verdict" defaultValue={incident.ai_verdict ?? ""} />
          <InputField label="Confianza" name="confidence" type="number" defaultValue={incident.confidence ?? ""} />
          <InputField label="Hallazgo" name="finding" defaultValue={incident.finding ?? ""} />
          <InputField label="Estado análisis" name="analysis_status" defaultValue={incident.analysis_status ?? ""} />
          <InputField label="Asignado a" name="assigned_to" defaultValue={incident.assigned_to ?? ""} />
          <InputField label="Contacto" name="contact" defaultValue={incident.contact ?? ""} />
          <InputField label="Uso del edificio" name="building_use" defaultValue={incident.building_use ?? ""} />
          <InputField label="Año de construcción" name="build_year" type="number" defaultValue={incident.build_year ?? ""} />
          <InputField label="Niveles" name="levels" type="number" defaultValue={incident.levels ?? ""} />
          <InputField label="Sótanos" name="basements" type="number" defaultValue={incident.basements ?? ""} />
          <InputField label="Material" name="material" defaultValue={incident.material ?? ""} />
          <InputField label="Tipo de terreno" name="terrain_type" defaultValue={incident.terrain_type ?? ""} />
          <InputField label="Latitud" name="latitude" type="number" step="any" defaultValue={incident.latitude ?? ""} />
          <InputField label="Longitud" name="longitude" type="number" step="any" defaultValue={incident.longitude ?? ""} />
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
