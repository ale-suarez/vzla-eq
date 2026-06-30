"use client";

import { useEffect, useState } from "react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

interface MeData {
  email?: string;
  role?: string;
}

export function PerfilClient() {
  const user = useConsoleUser();
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { data?: MeData }) => active && setMe(body.data ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const roleLabel = me?.role === "admin" ? "Administrador" : "Ingeniero estructural";

  return (
    <ConsoleShell title="Perfil" subtitle="Datos del ingeniero y cuenta" showNewButton user={user}>
      <div className="mx-auto max-w-[760px] px-4 py-6 md:px-6">
        {/* Header card */}
        <div className="flex items-center gap-[18px] rounded-[18px] border border-[#e8eaf2] bg-white p-[22px] shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-primary-fixed font-heading text-[26px] font-extrabold text-[#003ea8]">
            {user?.initials ?? "··"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-[20px] font-bold text-[#15171d]">{user?.name ?? "Ingeniero"}</div>
            <div className="mt-0.5 text-[13px] text-[#6b6f80]">{roleLabel}</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="rounded-[7px] bg-[#dcfce0] px-2.5 py-1 text-[11px] font-bold text-[#006e2d]">Verificada</span>
              <span className="rounded-[7px] bg-[#f1f3f9] px-2.5 py-1 text-[11px] font-semibold text-[#434655]">Cuenta activa</span>
            </div>
          </div>
        </div>

        {/* Engineer data card */}
        <div className="mt-4 rounded-[18px] border border-[#e8eaf2] bg-white p-6 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9398a8]">Datos del ingeniero</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileField label="Nombre completo" value={user?.name ?? ""} />
            <ProfileField label="Correo" value={me?.email ?? ""} />
            <ProfileField label="Rol" value={roleLabel} />
            <ProfileField label="Cédula" placeholder="—" />
            <ProfileField label="N° CIV" placeholder="—" />
            <ProfileField label="Especialidad" placeholder="Ingeniería estructural" />
          </div>
          <p className="mt-4 text-xs text-on-surface-variant">
            La edición de datos del perfil estará disponible próximamente.
          </p>
        </div>

        {/* Sign out row */}
        <div className="mt-4 flex items-center justify-between rounded-[18px] border border-[#e8eaf2] bg-white p-[18px] px-[22px] shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <div>
            <div className="text-[14px] font-semibold text-[#15171d]">Cerrar sesión</div>
            <div className="mt-0.5 text-xs text-[#7a7f90]">Saldrá de su cuenta en este dispositivo.</div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </ConsoleShell>
  );
}

function ProfileField({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#8a8fa0]">{label}</span>
      <input
        defaultValue={value}
        placeholder={placeholder}
        readOnly
        className="mt-1.5 h-11 w-full rounded-[11px] border border-[#d4d8e4] bg-[#f7f8fc] px-3 text-[14px] text-[#191b23] outline-none"
      />
    </label>
  );
}
