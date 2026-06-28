"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserCircle2 } from "lucide-react";

// Routes that render their own bespoke header (the questionnaire, volunteer
// registration and the engineer/reviewer consoles). The shared citizen header
// is hidden on these.
// Home (`/`) renders this same header, so it is intentionally not headerless.
// `/dashboard` (and its nested incident routes) ship their own top bar.
const HEADERLESS_PREFIXES = ["/form", "/dashboard", "/registro-ingenieros-voluntarios", "/revision-solicitudes"];

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "reviewer" | "admin";
  backoffice?: boolean;
  reviewer?: boolean;
};

export function SiteHeader() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch("/api/auth/me");
      const body = (await response.json()) as { data?: SessionData };
      if (active) {
        setSession(body.data ?? { authenticated: false, role: "anonymous" });
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (HEADERLESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  const role = session?.role ?? "anonymous";
  const professionalHref =
    role === "admin" || role === "engineer"
      ? "/dashboard"
      : role === "reviewer"
        ? "/revision-solicitudes"
        : "/login";

  return (
    <header style={{ viewTransitionName: "site-header" }} className="fixed left-0 right-0 top-0 z-50 bg-surface/90 backdrop-blur-md">
      {/* Venezuelan flag stripe across the viewport: yellow / blue / red,
          three equal horizontal bands matching the flag's band order. */}
      <div
        aria-hidden
        className="h-[18px] w-full"
        style={{ background: "linear-gradient(to bottom, #FCD116 0 33.333%, #00247D 33.333% 66.666%, #CF142B 66.666% 100%)" }}
      />
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5">
        <Link href="/" transitionTypes={["nav-back"]} className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-primary">Chequeo Estructural</h1>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={professionalHref}
            transitionTypes={["nav-forward"]}
            className="text-on-surface-variant transition-opacity hover:opacity-80"
            aria-label={role === "anonymous" ? "Acceso profesional" : "Panel profesional"}
          >
            <UserCircle2 className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
