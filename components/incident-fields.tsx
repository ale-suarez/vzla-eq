"use client";

import { MapPin, Phone } from "lucide-react";

import LocationPicker, { type PickedLocation } from "@/components/location-picker";
import {
  FORM_QUESTIONS,
  parseMultiSelect,
  toggleMultiSelect,
  type FormAnswers,
  type FormQuestion,
} from "@/lib/assessment";
import { cn } from "@/lib/utils";

// Controlled, fields-body-only incident capture: phone, a pinned location, the
// building questionnaire chips, and free-text comments. Both the citizen /form
// and the dashboard "crear incidencia" render this so they stay coherent and
// persist the same (latitude, longitude, address) triple. Page chrome (header,
// footer, submit, storage) stays with each caller.
export default function IncidentFields({
  value,
  onFieldChange,
  onLocationChange,
  onQuestionChange,
}: {
  value: FormAnswers;
  onFieldChange: (field: "phone" | "feedback", value: string) => void;
  onLocationChange: (location: PickedLocation) => void;
  onQuestionChange: (questionId: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Contacto y ubicación */}
      <div className="soft-card space-y-4 rounded-[18px] p-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-0.5">
            <p className="font-heading text-base font-semibold text-on-surface">Contacto y ubicación</p>
            <p className="text-xs leading-snug text-on-surface-variant">
              Tu número de teléfono no se comparte públicamente. Lo usamos solo internamente para conectarte con un ingeniero certificado.
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">Teléfono</span>
          <div className="flex items-center gap-2 rounded-[12px] border border-outline-variant bg-surface-container-lowest px-3 focus-within:border-primary">
            <Phone className="h-4 w-4 text-on-surface-variant" />
            <input
              type="tel"
              inputMode="tel"
              value={value.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              placeholder="0414 123 4567"
              className="h-11 w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
            />
          </div>
        </label>

        <div className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">Ubicación</span>
          <LocationPicker
            value={{
              latitude: value.latitude,
              longitude: value.longitude,
              address: value.address,
            }}
            onChange={onLocationChange}
          />
        </div>
      </div>

      {/* Building questionnaire chips */}
      {FORM_QUESTIONS.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          value={value.questions[q.id]}
          onSelect={(v) => onQuestionChange(q.id, v)}
        />
      ))}

      {/* Comentarios -> incidents.feedback */}
      <div className="soft-card rounded-[18px] p-4">
        <label className="block space-y-1.5">
          <span className="font-heading text-base font-semibold text-on-surface">Comentarios</span>
          <textarea
            value={value.feedback}
            onChange={(e) => onFieldChange("feedback", e.target.value)}
            placeholder="Observaciones adicionales sobre el lugar o el daño."
            rows={4}
            className="w-full rounded-[12px] border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
          />
        </label>
      </div>
    </div>
  );
}

function OptionChip({
  selected,
  variant,
  children,
  onClick,
}: {
  selected: boolean;
  variant: FormQuestion["variant"];
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer border text-sm transition-all active:scale-95",
        variant === "compact"
          ? "flex h-10 min-w-10 items-center justify-center rounded-full px-3"
          : variant === "stacked"
            ? "w-full rounded-[12px] px-4 py-3 text-left"
            : "rounded-full px-4 py-2",
        selected
          ? "border-primary-container bg-primary-container text-white"
          : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
      )}
    >
      {children}
    </button>
  );
}

function QuestionCard({
  question,
  value,
  onSelect,
}: {
  question: FormQuestion;
  value: string | undefined;
  onSelect: (value: string) => void;
}) {
  const selectedOptions = question.multiSelect ? parseMultiSelect(value) : value ? [value] : [];

  const handleSelect = (option: string) => {
    if (question.multiSelect) {
      onSelect(toggleMultiSelect(value, option, question.exclusiveOptions));
    } else {
      onSelect(option);
    }
  };

  return (
    <div className="soft-card rounded-[18px] p-4">
      <p className="mb-3 font-heading text-base font-semibold text-on-surface">{question.question}</p>
      {question.multiSelect ? (
        <p className="mb-3 -mt-2 text-xs text-on-surface-variant">Puedes elegir varias opciones.</p>
      ) : null}
      <div className={cn(question.variant === "stacked" ? "flex flex-col gap-2" : "flex flex-wrap gap-2")}>
        {question.options.map((option) => (
          <OptionChip
            key={option}
            selected={selectedOptions.includes(option)}
            variant={question.variant}
            onClick={() => handleSelect(option)}
          >
            {option}
          </OptionChip>
        ))}
      </div>
    </div>
  );
}
