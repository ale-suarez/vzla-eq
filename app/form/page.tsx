"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPin, Phone, ShieldCheck, TriangleAlert } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/components/assessment-provider";
import { RouteTransition } from "@/components/assessment-visuals";
import LocationPicker from "@/components/location-picker";
import {
  EMPTY_FORM_ANSWERS,
  FORM_QUESTIONS,
  isFormComplete,
  parseMultiSelect,
  toggleMultiSelect,
  type FormQuestion,
} from "@/lib/assessment";
import { cn } from "@/lib/utils";

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

export default function FormPage() {
  const router = useRouter();
  const { form, hydrated, setFormField, setFormLocation, setFormQuestion } = useAssessment();

  // Until the client has rehydrated cached answers from sessionStorage, render
  // the empty form so the first paint matches the server HTML (no hydration
  // mismatch). After mount, `form` carries any restored answers.
  const displayForm = hydrated ? form : EMPTY_FORM_ANSWERS;
  const complete = isFormComplete(displayForm);

  const handleContinue = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!complete) {
      return;
    }
    router.push("/upload", { scroll: false, transitionTypes: ["nav-forward"] });
  };

  return (
    <RouteTransition>
      <header className="sticky top-0 z-30">
        <div
          aria-hidden
          className="h-[18px] w-full"
          style={{ background: "linear-gradient(to bottom, #FCD116 0 33.333%, #00247D 33.333% 66.666%, #CF142B 66.666% 100%)" }}
        />
        <div className="border-b border-outline-variant bg-surface/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
            <Link
              href="/"
              transitionTypes={["nav-back"]}
              className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-heading text-[22px] font-bold leading-none text-primary">Chequeo Estructural</h1>
                <p className="mt-1 text-[11px] text-on-surface-variant">Registro de incidencias</p>
              </div>
            </div>
            <div className="w-28" />
          </div>
        </div>
      </header>

      <motion.form
        key="form"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onSubmit={handleContinue}
        className="mx-auto w-full max-w-2xl px-5 pb-40 pt-6"
      >
        <section className="mb-8 text-center">
          <h2 className="font-heading text-[22px] font-semibold leading-7 text-on-surface">Cuéntanos un poco sobre el lugar</h2>
          <p className="mt-1 text-sm leading-5 text-on-surface-variant">Tus respuestas nos ayudan a darte una mejor recomendación.</p>
        </section>

        <div className="space-y-6">
          {/* Contacto y ubicación */}
          <div className="soft-card space-y-4 rounded-[18px] p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <p className="font-heading text-base font-semibold text-on-surface">Contacto y ubicación</p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-on-surface-variant">Teléfono</span>
              <div className="flex items-center gap-2 rounded-[12px] border border-outline-variant bg-surface-container-lowest px-3 focus-within:border-primary">
                <Phone className="h-4 w-4 text-on-surface-variant" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={displayForm.phone}
                  onChange={(e) => setFormField("phone", e.target.value)}
                  placeholder="0414 123 4567"
                  className="h-11 w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
                />
              </div>
            </label>

            <div className="block space-y-1.5">
              <span className="text-sm font-medium text-on-surface-variant">Ubicación</span>
              <LocationPicker
                value={{
                  latitude: displayForm.latitude,
                  longitude: displayForm.longitude,
                  address: displayForm.address,
                }}
                onChange={setFormLocation}
              />
            </div>
          </div>

          {/* Sección: sobre el edificio */}
          {FORM_QUESTIONS.slice(0, 3).map((q) => (
            <QuestionCard key={q.id} question={q} value={displayForm.questions[q.id]} onSelect={(v) => setFormQuestion(q.id, v)} />
          ))}

          {/* OJO warning */}
          <div className="flex gap-4 rounded-[18px] border border-error-container bg-[#FEF2F2] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold text-destructive">¡OJO!</h3>
              <p className="text-sm leading-snug text-on-error-container">
                Si el edificio está inclinado, tiene pisos aplastados o paredes caídas, <strong>no entres</strong>. Escríbenos de inmediato.
              </p>
            </div>
          </div>

          {FORM_QUESTIONS.slice(3).map((q) => (
            <QuestionCard key={q.id} question={q} value={displayForm.questions[q.id]} onSelect={(v) => setFormQuestion(q.id, v)} />
          ))}
        </div>
      </motion.form>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 z-40 w-full bg-surface px-5 pb-8 pt-4 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!complete}
            className={cn(
              "h-14 w-full rounded-[18px] text-base font-bold transition-all",
              complete
                ? "bg-primary text-white shadow-[0px_4px_20px_rgba(37,99,235,0.24)] hover:bg-primary-container"
                : "bg-outline text-on-primary-fixed-variant opacity-50"
            )}
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </RouteTransition>
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
