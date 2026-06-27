"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewIncidentForm() {
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

      form.reset();
      setMessage("Incidente creado.");
      router.refresh();
    });
  };

  return (
    <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold text-on-surface">Nuevo incidente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField label="Contacto" name="contact" placeholder="Nombre o teléfono" />
          <InputField label="Uso del edificio" name="building_use" placeholder="Residencial, comercial..." />
          <InputField label="Año de construcción" name="build_year" type="number" />
          <InputField label="Niveles" name="levels" type="number" />
          <InputField label="Sótanos" name="basements" type="number" />
          <InputField label="Material" name="material" placeholder="Hormigón, acero..." />
          <InputField label="Tipo de terreno" name="terrain_type" placeholder="Roca, relleno..." />
          <InputField label="Latitud" name="latitude" type="number" step="any" />
          <InputField label="Longitud" name="longitude" type="number" step="any" />
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
