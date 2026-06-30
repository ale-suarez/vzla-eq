"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Plus } from "lucide-react";

interface InviteSource {
  id: string;
  name: string;
  token: string;
  url: string;
  isActive: boolean;
  count: number;
  createdAt: string;
}

// Admin panel: create named invite links (/join/<token>) and see how many
// engineers registered through each. Admin-only endpoints (api/invites).
export function InvitePanel() {
  const [sources, setSources] = useState<InviteSource[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    fetch("/api/invites")
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return { data: [] };
        }
        return r.json();
      })
      .then((body: { data?: InviteSource[] }) => {
        setSources(body.data ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(load, []);

  const create = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo crear la invitación.");
      setName("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (s: InviteSource) => {
    await fetch(`/api/invites/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  };

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Hide entirely for non-admins (reviewers see only the solicitudes table).
  if (forbidden) return null;

  return (
    <div className="rounded-[18px] border border-outline-variant bg-white p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-on-surface">Invitaciones</h2>
      </div>
      <p className="mt-1 text-sm text-on-surface-variant">
        Crea un enlace por grupo (UNIMET, colegio, etc.) y comparte. Cada solicitud registra de
        qué enlace provino. La aprobación sigue siendo manual.
      </p>

      {/* Create */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nombre del grupo (p.ej. UNIMET)"
          className="h-10 flex-1 min-w-[200px] rounded-[10px] border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={create}
          disabled={creating || name.trim().length < 2}
          className="flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {creating ? "Creando…" : "Crear enlace"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      {/* List */}
      <div className="mt-4 space-y-2">
        {loaded && sources.length === 0 && (
          <p className="text-sm text-on-surface-variant">Aún no hay invitaciones.</p>
        )}
        {sources.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-[12px] border border-outline-variant px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface">{s.name}</span>
                {!s.isActive && (
                  <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                    Inactivo
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-on-surface-variant">{s.url}</div>
            </div>
            <span className="rounded-[8px] bg-primary-fixed/40 px-2.5 py-1 text-xs font-bold text-primary">
              {s.count} ingeniero(s)
            </span>
            <button
              onClick={() => copy(s.url, s.id)}
              className="flex h-9 items-center gap-1.5 rounded-[9px] border border-outline-variant bg-white px-3 text-xs font-semibold text-on-surface hover:border-primary"
            >
              {copied === s.id ? <Check className="h-3.5 w-3.5 text-secondary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === s.id ? "Copiado" : "Copiar"}
            </button>
            <button
              onClick={() => toggle(s)}
              className="h-9 rounded-[9px] border border-outline-variant bg-white px-3 text-xs font-semibold text-on-surface-variant hover:border-primary"
            >
              {s.isActive ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
