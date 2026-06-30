"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, Plus, X } from "lucide-react";

import { ConsoleNav } from "@/components/console/console-nav";

interface ConsoleShellProps {
  title: string;
  subtitle?: string;
  /** Show the green "En vivo" pulse pill (Mapa only). */
  showLive?: boolean;
  /** Show the primary "Nueva inspección" header button (every view except Nueva inspección). */
  showNewButton?: boolean;
  user?: { name: string; subtitle: string; initials: string } | null;
  inspectionCount?: number;
  children: ReactNode;
}

/**
 * Console app shell: fixed left sidebar (desktop) / drawer (mobile) + a header
 * with per-view title and right-cluster actions. Pages render their content as
 * children. Avoids a route-group layout so URLs and import paths are unchanged.
 */
export function ConsoleShell({
  title,
  subtitle,
  showLive,
  showNewButton,
  user,
  inspectionCount,
  children,
}: ConsoleShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f6f7fb]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <ConsoleNav user={user} inspectionCount={inspectionCount} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <ConsoleNav user={user} inspectionCount={inspectionCount} />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="absolute left-[256px] top-4 rounded-full bg-white p-2 shadow-md"
          >
            <X className="h-5 w-5 text-on-surface" />
          </button>
        </div>
      )}

      {/* Main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col bg-[#f6f7fb]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#e8eaf2] bg-white px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="-ml-1 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="truncate font-heading text-[17px] font-bold leading-tight tracking-tight text-[#0f1115] md:text-[19px]">
                {title}
              </div>
              {subtitle && <div className="mt-px hidden text-xs text-[#6b6f80] sm:block">{subtitle}</div>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {showLive && (
              <div className="hidden items-center gap-[7px] rounded-[9px] border border-[#c5eccd] bg-[#e7f8ea] px-[11px] py-[7px] sm:flex">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-[#16a34a] opacity-60" />
                  <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#006e2d]">En vivo</span>
              </div>
            )}
            {showNewButton && (
              <Link
                href="/inspeccion"
                className="flex h-[38px] items-center gap-2 rounded-[10px] bg-primary px-4 text-[12.5px] font-bold tracking-[0.03em] text-white shadow-[0_2px_8px_rgba(0,74,198,.25)] transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva inspección</span>
              </Link>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
