import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Ubicar y capturar", sub: "Fotos por sección" },
  { label: "Borrador IA", sub: "Pre-llenado" },
  { label: "Revisar y enviar", sub: "Certificar" },
];

/** 3-step progress header for the inspection flow. activeIndex: 0/1/2. */
export function CaptureStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.label} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-[13px] font-bold",
                  done && "border-primary bg-primary text-white",
                  active && "border-primary bg-primary-fixed text-primary",
                  !done && !active && "border-[#e2e5ef] bg-white text-[#9398a8]",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="hidden sm:block">
                <div className={cn("text-[13px] font-semibold leading-tight", active || done ? "text-on-surface" : "text-[#9398a8]")}>
                  {step.label}
                </div>
                <div className="text-[11px] text-[#9398a8]">{step.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn("mx-3.5 h-0.5 min-w-[34px] flex-1 rounded", done ? "bg-primary" : "bg-[#e2e5ef]")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
