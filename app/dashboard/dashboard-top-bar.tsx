"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function DashboardTopBar({
  title,
  subtitle,
  backLink,
  rightSlot,
}: {
  title: string;
  subtitle: string;
  backLink?: {
    href: string;
    label: string;
    transitionTypes?: Array<"nav-forward" | "nav-back">;
  };
  rightSlot?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30">
      <div
        aria-hidden
        className="h-[18px] w-full"
        style={{ background: "linear-gradient(to bottom, #FCD116 0 33.333%, #00247D 33.333% 66.666%, #CF142B 66.666% 100%)" }}
      />
      <div className="flex h-14 items-center justify-between border-b border-outline-variant bg-surface px-4 backdrop-blur-md sm:h-16 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {backLink ? (
            <Link
              href={backLink.href}
              transitionTypes={backLink.transitionTypes}
              aria-label={`Volver a ${backLink.label}`}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <BarChart3 className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          )}
          <div className="min-w-0">
            <h1 className="truncate font-heading text-base font-bold leading-tight text-primary sm:text-[22px] sm:leading-none">
              {title}
            </h1>
            <p className="mt-0.5 hidden text-[11px] text-on-surface-variant sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">{rightSlot ?? <SignOutButton />}</div>
      </div>
    </header>
  );
}
