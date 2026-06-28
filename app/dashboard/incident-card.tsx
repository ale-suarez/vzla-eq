"use client";

import Link from "next/link";
import { ChevronRight, User, UserX } from "lucide-react";

import { INCIDENT_STATE_LABELS, VERDICT_LABELS } from "@/lib/assessment";
import type { Incident } from "@/lib/incidents";
import { cn } from "@/lib/utils";

export function IncidentCard({
  incident,
  selected = false,
  showDetailsLink = true,
  className,
  eyebrow,
  onClick,
}: {
  incident: Incident;
  selected?: boolean;
  showDetailsLink?: boolean;
  className?: string;
  eyebrow?: string;
  onClick?: () => void;
}) {
  const Icon = incident.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[18px] border-l-4 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all",
        incident.accent,
        onClick ? "cursor-pointer" : "",
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : onClick ? "hover:scale-[1.01]" : "",
        className
      )}
    >
      {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{eyebrow}</p> : null}
      <div className="flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]", incident.iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-semibold leading-tight text-on-surface">{incident.title}</h3>
          <p className="text-xs text-on-surface-variant">
            ID: {incident.id} • {incident.meta}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]", verdictBadge(incident.verdict))}>
              {VERDICT_LABELS[incident.verdict]}
            </span>
            <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]", stateBadge(incident.state))}>
              {INCIDENT_STATE_LABELS[incident.state]}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          {incident.assignee ? <User className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
          {incident.assignee ?? "No asignado"}
        </p>
        {showDetailsLink ? (
          <Link
            href={`/dashboard/incidents/${incident.id}`}
            transitionTypes={["nav-forward"]}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.05em] text-primary"
          >
            Ver detalles <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function IncidentCardSkeleton({ eyebrow }: { eyebrow?: string }) {
  return (
    <div className="rounded-[18px] border-l-4 border-outline-variant bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      {eyebrow ? <div className="mb-2 h-3 w-24 animate-pulse rounded bg-surface-container-high" /> : null}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-[12px] bg-surface-container-high" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-14 animate-pulse rounded bg-surface-container-high" />
            <div className="h-5 w-16 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-container-high" />
        <div className="h-3 w-20 animate-pulse rounded bg-surface-container-high" />
      </div>
    </div>
  );
}

function verdictBadge(verdict: Incident["verdict"]) {
  switch (verdict) {
    case "low":
      return "bg-secondary-container text-on-secondary-container";
    case "moderate":
      return "bg-primary-fixed text-on-primary-fixed-variant";
    case "severe":
      return "bg-tertiary-fixed text-on-tertiary-fixed-variant";
    case "critical":
      return "bg-error-container text-on-error-container";
  }
}

function stateBadge(state: Incident["state"]) {
  return state === "in_review"
    ? "bg-secondary-container text-on-secondary-container"
    : "bg-surface-container-highest text-on-surface-variant";
}
