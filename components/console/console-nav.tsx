"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ChevronRight, ClipboardList, MapPin, ShieldCheck, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/inspeccion", label: "Nueva inspección", icon: Camera },
  { href: "/dashboard", label: "Mapa", icon: MapPin },
  { href: "/inspecciones", label: "Inspecciones", icon: ClipboardList },
  { href: "/perfil", label: "Perfil", icon: UserCircle },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The console left sidebar: brand → nav → user footer. */
export function ConsoleNav({
  user,
  inspectionCount,
}: {
  user?: { name: string; subtitle: string; initials: string } | null;
  inspectionCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-[#e4e6f0] bg-white">
      {/* Venezuela flag stripe */}
      <div
        aria-hidden
        className="h-[5px] w-full"
        style={{ background: "linear-gradient(to right,#FCD116 0 33.33%,#00247D 33.33% 66.66%,#CF142B 66.66% 100%)" }}
      />

      {/* Brand lockup */}
      <div className="flex items-center gap-3 px-[22px] pb-[18px] pt-[22px]">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-primary">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-[15px] font-extrabold leading-tight tracking-tight text-[#0f1115]">
            Chequeo Estructural
          </div>
          <div className="mt-px text-[11px] font-medium text-[#6b6f80]">Respuesta Sísmica · VE</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pb-1.5 pt-1">
        <div className="px-2.5 pb-2 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#9398a8]">
          Trabajo de campo
        </div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = item.href === "/inspecciones" && inspectionCount ? String(inspectionCount) : item.badge;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-[3px] flex h-[42px] items-center gap-3 rounded-[11px] px-3 text-[13.5px] transition-colors",
                active ? "bg-primary-fixed font-bold text-primary" : "font-medium text-[#444a5c] hover:bg-surface-container-low",
              )}
            >
              <Icon className="h-[19px] w-[19px]" />
              <span className="flex-1">{item.label}</span>
              {badge && (
                <span className="rounded-lg bg-[#eef0f6] px-2 py-px text-[11px] font-bold text-[#6b6f80]">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-auto border-t border-[#eef0f6] px-4 py-3.5">
        <Link href="/perfil" className="flex items-center gap-[11px] rounded-xl p-1.5 text-left hover:bg-surface-container-low">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[13px] font-bold text-[#003ea8]">
            {user?.initials ?? "··"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-on-surface">{user?.name ?? "Ingeniero"}</div>
            <div className="text-[11px] text-[#6b6f80]">{user?.subtitle ?? "Sesión activa"}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#9398a8]" />
        </Link>
      </div>
    </aside>
  );
}
