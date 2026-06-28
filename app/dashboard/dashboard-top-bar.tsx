"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

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
      <div className="flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-heading text-[22px] font-bold leading-none text-primary">{title}</h1>
            <p className="mt-1 text-[11px] text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {backLink ? (
            <Link href={backLink.href} transitionTypes={backLink.transitionTypes} className="text-sm font-medium text-on-surface-variant hover:text-primary">
              {backLink.label}
            </Link>
          ) : null}
          {rightSlot ?? <SignOutButton />}
        </div>
      </div>
    </header>
  );
}
