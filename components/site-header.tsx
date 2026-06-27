"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SessionData = {
  authenticated: boolean;
  role: "anonymous" | "engineer" | "admin";
  backoffice?: boolean;
};

export function SiteHeader() {
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

  const backoffice = Boolean(session?.backoffice);

  return (
    <header style={{ viewTransitionName: "site-header" }} className="fixed left-0 right-0 top-0 z-50 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5">
        <Link href="/" transitionTypes={["nav-back"]} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-heading text-[15px] font-bold leading-none tracking-tight text-primary">Evaluación Estructural</h1>
            <p className="mt-1 text-[11px] text-on-surface-variant">Venezuela · Respuesta al sismo</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className={cn(
              "hidden h-9 items-center rounded-full border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:inline-flex"
            )}
          >
            Inicio
          </Link>
          <Link
            href={backoffice ? "/dashboard" : "/evaluar"}
            transitionTypes={["nav-forward"]}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-container"
          >
            {backoffice ? "Panel" : "Evaluar"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

