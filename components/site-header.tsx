"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShieldCheck, UserCircle2 } from "lucide-react";

// Routes that render their own bespoke header (the questionnaire and the
// engineer backoffice). The shared citizen header is hidden on these.
// Home (`/`) renders this same header, so it is intentionally not headerless.
const HEADERLESS_ROUTES = ["/form", "/backoffice"];

export function SiteHeader() {
  const pathname = usePathname();

  if (HEADERLESS_ROUTES.includes(pathname)) {
    return null;
  }

  return (
    <header style={{ viewTransitionName: "site-header" }} className="fixed left-0 right-0 top-0 z-50 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5">
        <Link href="/" transitionTypes={["nav-back"]} className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-primary">SafeStructure</h1>
        </Link>
        <div className="flex items-center gap-3">
          {/* TODO: wire to a notifications surface when one exists. */}
          <button className="text-on-surface-variant transition-opacity hover:opacity-80" aria-label="Notificaciones">
            <Bell className="h-6 w-6" />
          </button>
          <Link
            href="/backoffice"
            transitionTypes={["nav-forward"]}
            className="text-on-surface-variant transition-opacity hover:opacity-80"
            aria-label="Acceso profesional"
          >
            <UserCircle2 className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
