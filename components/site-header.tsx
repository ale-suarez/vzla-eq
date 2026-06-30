"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";

// Routes that render their own bespoke header (the questionnaire, volunteer
// registration and the engineer/reviewer consoles). The shared citizen header
// is hidden on these.
// Home (`/`) renders this same header, so it is intentionally not headerless.
// `/dashboard` (and its nested incident routes) ship their own top bar.
const HEADERLESS_PREFIXES = [
  "/form",
  "/dashboard",
  "/inspection",
  "/history",
  "/profile",
  "/register",
  "/revision-solicitudes",
];

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "reviewer" | "admin";
  backoffice?: boolean;
  reviewer?: boolean;
};

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [signingOut, startSignOut] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes. Tracking the rendered
  // pathname (rather than a route-change effect) avoids a setState-in-effect.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

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

  const authenticated = session?.authenticated === true;

  const handleSignOut = () => {
    startSignOut(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    });
  };

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
        {/* Inline nav on >= sm; collapses to a hamburger on mobile. */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Points to the public live map on the home page. */}
          <Link
            href="/#incidentes"
            className="whitespace-nowrap text-sm font-medium text-on-surface-variant transition-opacity hover:opacity-80"
          >
            Incidentes Reportados
          </Link>
          {authenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="whitespace-nowrap rounded-full border border-outline px-3 py-1.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
            >
              {signingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          ) : (
            <Link
              href="/login"
              transitionTypes={["nav-forward"]}
              className="whitespace-nowrap rounded-full border border-outline px-3 py-1.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            >
              Acceso voluntarios
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container sm:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-outline-variant bg-surface px-5 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/#incidentes"
              onClick={() => setMenuOpen(false)}
              className="rounded-[12px] px-3 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Incidentes Reportados
            </Link>
            {authenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-[12px] px-3 py-3 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                {signingOut ? "Saliendo..." : "Cerrar sesión"}
              </button>
            ) : (
              <Link
                href="/login"
                transitionTypes={["nav-forward"]}
                onClick={() => setMenuOpen(false)}
                className="rounded-[12px] px-3 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                Acceso voluntarios
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
