"use client";

import { useEffect, useState } from "react";

import { ConsoleShell } from "@/components/console/console-shell";
import { useConsoleUser } from "@/components/console/use-console-user";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

interface Profile {
  fullName: string | null;
  email: string | null;
  documentNumber: string | null;
  licenseNumber: string | null;
  specialty: string | null;
  phone: string | null;
  city: string | null;
  isCertified: boolean;
  role: "engineer" | "admin";
}

type EditableField = "fullName" | "documentNumber" | "licenseNumber" | "specialty" | "phone" | "city";

const FIELDS: { key: EditableField; label: string; full?: boolean }[] = [
  { key: "fullName", label: "Nombre completo" },
  { key: "documentNumber", label: "Cédula" },
  { key: "licenseNumber", label: "N° CIV" },
  { key: "specialty", label: "Especialidad" },
  { key: "phone", label: "Teléfono" },
  { key: "city", label: "Zona asignada", full: true },
];

const EMPTY_FORM: Record<EditableField, string> = {
  fullName: "",
  documentNumber: "",
  licenseNumber: "",
  specialty: "",
  phone: "",
  city: "",
};

export function ProfileClient() {
  const user = useConsoleUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Record<EditableField, string>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = () => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((body: { data?: Profile }) => {
        if (!body.data) return;
        setProfile(body.data);
        setForm({
          fullName: body.data.fullName ?? "",
          documentNumber: body.data.documentNumber ?? "",
          licenseNumber: body.data.licenseNumber ?? "",
          specialty: body.data.specialty ?? "",
          phone: body.data.phone ?? "",
          city: body.data.city ?? "",
        });
      })
      .catch(() => {});
  };

  useEffect(load, []);

  const setField = (key: EditableField, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar el perfil.");
      setMessage({ kind: "ok", text: "Perfil actualizado." });
      load();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Error inesperado." });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = profile?.role === "admin" ? "Administrador" : "Ingeniero estructural";

  return (
    <ConsoleShell title="Perfil" subtitle="Datos del ingeniero y cuenta" showNewButton user={user}>
      <div className="mx-auto max-w-[760px] px-4 py-6 md:px-6">
        {/* Header card */}
        <div className="flex items-center gap-[18px] rounded-[18px] border border-[#e8eaf2] bg-white p-[22px] shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-primary-fixed font-heading text-[26px] font-extrabold text-[#003ea8]">
            {user?.initials ?? "··"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-[20px] font-bold text-[#15171d]">{profile?.fullName || user?.name || "Ingeniero"}</div>
            <div className="mt-0.5 text-[13px] text-[#6b6f80]">
              {roleLabel}
              {profile?.licenseNumber ? ` · CIV ${profile.licenseNumber}` : ""}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profile?.isCertified && (
                <span className="rounded-[7px] bg-[#dcfce0] px-2.5 py-1 text-[11px] font-bold text-[#006e2d]">Verificada</span>
              )}
              {form.city && <span className="rounded-[7px] bg-[#f1f3f9] px-2.5 py-1 text-[11px] font-semibold text-[#434655]">Zona: {form.city}</span>}
            </div>
          </div>
        </div>

        {/* Editable data card */}
        <div className="mt-4 rounded-[18px] border border-[#e8eaf2] bg-white p-6 shadow-[0_2px_10px_rgba(20,30,60,.03)]">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9398a8]">Datos del ingeniero</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={f.full ? "block sm:col-span-2" : "block"}>
                <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#8a8fa0]">{f.label}</span>
                <input
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[11px] border border-[#d4d8e4] bg-white px-3 text-[14px] text-[#191b23] outline-none focus:border-primary"
                />
              </label>
            ))}
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#8a8fa0]">Correo</span>
              <input
                value={profile?.email ?? ""}
                readOnly
                className="mt-1.5 h-11 w-full rounded-[11px] border border-[#d4d8e4] bg-[#f7f8fc] px-3 text-[14px] text-[#7a7f90] outline-none"
              />
            </label>
          </div>

          {message && (
            <p className={`mt-4 text-[13px] font-medium ${message.kind === "ok" ? "text-[#006e2d]" : "text-[#ba1a1a]"}`}>{message.text}</p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex h-12 items-center rounded-[12px] bg-primary px-6 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              onClick={load}
              disabled={saving}
              className="flex h-12 items-center rounded-[12px] border border-[#d4d8e4] bg-white px-5 text-[14px] font-semibold text-[#434655] hover:border-primary disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
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
