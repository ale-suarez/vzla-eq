"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IncidentFields from "@/components/incident-fields";
import type { PickedLocation } from "@/components/location-picker";
import {
  EMPTY_FORM_ANSWERS,
  formToIncidentFields,
  VERDICT_LABELS,
  type FormAnswers,
  type VerdictLevel,
} from "@/lib/assessment";
import type { DbIncident } from "@/lib/incidents";
import { cn } from "@/lib/utils";

// Engineer-graded severity scale, ordered least to most serious.
const SEVERITY_OPTIONS: VerdictLevel[] = ["menor", "moderado", "severo", "completo"];

export function NewIncidentForm({
  onCreated,
}: {
  onCreated?: (incident: DbIncident) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Same controlled answers shape as the citizen /form, so both write the
  // identical (latitude, longitude, address) triple and questionnaire columns.
  const [answers, setAnswers] = useState<FormAnswers>(EMPTY_FORM_ANSWERS);
  // Unlike the citizen flow (graded by AI), the engineer determines severity.
  const [severity, setSeverity] = useState<VerdictLevel | null>(null);

  const setField = (field: "phone" | "feedback", value: string) => {
    setAnswers((current) => ({ ...current, [field]: value }));
  };

  const setLocation = (location: PickedLocation) => {
    setAnswers((current) => ({ ...current, ...location }));
  };

  const setQuestion = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, questions: { ...current.questions, [questionId]: value } }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    // A pinned location is required (it drives the dashboard map); the rest of
    // the questionnaire is optional for reviewer-created incidents.
    if (answers.latitude === null || answers.longitude === null) {
      setError("Marca la ubicación del incidente en el mapa.");
      return;
    }

    // The engineer grades severity directly (no AI analysis on this path).
    if (severity === null) {
      setError("Selecciona la severidad del incidente.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formToIncidentFields(answers), severity }),
      });

      const body = (await response.json()) as { error?: string; data?: unknown };

      if (!response.ok) {
        setError(body.error ?? "No se pudo crear el incidente.");
        return;
      }

      if (body.data) {
        onCreated?.(body.data as DbIncident);
      }

      setAnswers(EMPTY_FORM_ANSWERS);
      setSeverity(null);
      setMessage("Incidente creado.");
    });
  };

  return (
    <Card className="rounded-[24px] border border-outline-variant/70 bg-surface-container-low">
      <CardHeader>
        <CardTitle className="font-heading text-lg font-semibold text-on-surface">Nuevo incidente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <IncidentFields
            value={answers}
            onFieldChange={setField}
            onLocationChange={setLocation}
            onQuestionChange={setQuestion}
          />

          <div className="soft-card rounded-[18px] p-4">
            <p className="mb-1 font-heading text-base font-semibold text-on-surface">Severidad</p>
            <p className="mb-3 text-xs text-on-surface-variant">
              Como ingeniero, determina la severidad del incidente.
            </p>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2 text-sm transition-all active:scale-95",
                    severity === level
                      ? "border-primary-container bg-primary-container text-white"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                  )}
                >
                  {VERDICT_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-[16px] border border-destructive/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-[16px] border border-secondary/20 bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              {message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="h-11 rounded-[16px] px-5">
            {pending ? "Creando..." : "Crear incidente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
