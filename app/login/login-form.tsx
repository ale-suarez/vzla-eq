"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function normalizeNext(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export function LoginForm({ reason, next }: { reason?: string | null; next?: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const destination = normalizeNext(next);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: destination }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(payload.error ?? "No se pudo enviar el enlace.");
        return;
      }

      setMessage(payload.message ?? "Te enviamos un enlace de acceso. Revisa tu correo.");
    });
  };

  return (
    <Card className="w-full rounded-[24px] border border-outline-variant/70 bg-surface-container-low shadow-[0px_20px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-fixed-variant">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acceso de ingenieros
        </div>
        <CardTitle className="font-heading text-3xl font-bold tracking-tight text-on-surface">
          Iniciar sesión con enlace mágico
        </CardTitle>
        <CardDescription className="text-base leading-6 text-on-surface-variant">
          El acceso se envía por correo. Si ya fuiste aprobado, recibirás entrada al panel correspondiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-on-surface">Correo electrónico</span>
            <div className="flex h-12 items-center gap-2 rounded-[16px] border border-outline-variant bg-surface px-4 focus-within:border-primary">
              <Mail className="h-4 w-4 text-on-surface-variant" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nombre@dominio.org"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-full w-full border-0 bg-transparent text-sm outline-none placeholder:text-on-surface-variant"
              />
            </div>
          </label>

          {reason === "auth" && (
            <p className="rounded-[16px] border border-tertiary/20 bg-tertiary-fixed px-4 py-3 text-sm text-[#653e00]">
              Necesitas iniciar sesión para ver este contenido.
            </p>
          )}

          {error && (
            <div className="rounded-[18px] border border-error/20 bg-error-container px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-error-container">Error del API</p>
              <p className="mt-1 text-sm text-on-error-container">{error}</p>
            </div>
          )}

          {message && (
            <p className="rounded-[16px] border border-secondary/20 bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              {message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="h-12 w-full rounded-[16px] text-sm font-semibold">
            {pending ? "Enviando enlace..." : "Enviar enlace mágico"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-on-surface-variant">
          <span>¿Eres ingeniero voluntario?</span>
          <Link href="/registro-ingenieros-voluntarios" className="font-medium text-primary hover:underline">
            Completar solicitud
          </Link>
        </div>
        <div className="mt-3 text-sm text-on-surface-variant">
          <Link href="/" className="font-medium text-primary hover:underline">
            Volver al inicio
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
