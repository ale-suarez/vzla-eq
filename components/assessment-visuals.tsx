"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ViewTransition, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { RING_CIRCUMFERENCE } from "@/lib/assessment";
import { cn } from "@/lib/utils";

export function ConfidenceRing({ value, className }: { value: number; className: string }) {
  const offset = RING_CIRCUMFERENCE - (Math.min(100, Math.max(0, value)) / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative h-24 w-24">
      <svg className="h-full w-full -rotate-90">
        <circle className="text-surface-container" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
        <circle
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", className)}
          cx="48"
          cy="48"
          fill="transparent"
          r="40"
          stroke="currentColor"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-lg font-semibold text-on-surface">{value}%</span>
      </div>
    </div>
  );
}

export function LoadingView() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="relative flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center overflow-hidden px-5 py-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-80px] top-1/4 h-64 w-64 rounded-full bg-primary-fixed opacity-70 blur-[100px]" />
        <div className="absolute bottom-1/4 right-[-100px] h-72 w-72 rounded-full bg-secondary-container opacity-40 blur-[110px]" />
      </div>

      <div className="relative z-10 mb-10 flex h-72 w-72 items-center justify-center">
        <div className="pulse-ring absolute h-full w-full rounded-full bg-primary" />
        <div className="pulse-ring-delayed absolute h-full w-full rounded-full bg-primary" />
        <div className="glass-card relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.08)]">
          <div className="absolute top-[58%] h-1 w-full -translate-y-1/2 animate-bounce bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex flex-col items-center gap-4 text-primary">
            <Loader2 className="h-12 w-12 animate-spin" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Analizando...</span>
          </div>
        </div>
      </div>

      <div className="z-10 flex w-full max-w-md flex-col gap-4">
        <p className="text-center font-heading text-lg font-semibold text-on-surface">Analizando...</p>
        <div className="h-3 w-full overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container">
          <div className="progress-animate h-full rounded-full bg-primary shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
        </div>
      </div>
    </motion.div>
  );
}

// Hydration-safe "has the client mounted?" signal, via useSyncExternalStore so
// we avoid a setState-in-effect. The CLIENT snapshot must be `false` too (not
// just the server snapshot): React calls the client snapshot during hydration,
// so returning `true` there would render ViewTransition's <Suspense> on the
// first client paint while the server emitted a plain <div> — a hydration
// mismatch. We start `false` on both, then `subscribe` flips the store to
// `true` on the next microtask, re-rendering with ViewTransition after mount.
let hydratedSnapshot = false;
function subscribeHydrated(onStoreChange: () => void) {
  if (!hydratedSnapshot) {
    hydratedSnapshot = true;
    queueMicrotask(onStoreChange);
  }
  return () => {};
}
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydrated,
    () => hydratedSnapshot,
    () => false
  );
}

export function RouteTransition({ children, className }: { children: ReactNode; className?: string }) {
  const hydrated = useHydrated();

  // React's experimental ViewTransition renders a Suspense boundary on the
  // server but a plain wrapper on the client, which trips a hydration mismatch.
  // Render a matching plain <div> on the server and first client paint, then
  // swap in ViewTransition after mount so subsequent navigations animate.
  if (!hydrated) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      default="none"
    >
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
