"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") ?? "/dashboard";
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/login?reason=auth&error=${encodeURIComponent(error)}`);
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = searchParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const finish = async () => {
      if (code) {
        window.location.replace(`/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
        return;
      }

      if (accessToken && refreshToken) {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            next,
          }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          router.replace(`/login?reason=auth&error=${encodeURIComponent(payload.error ?? "auth")}`);
          return;
        }

        router.replace(next);
        return;
      }

      router.replace("/login?reason=auth");
    };

    void finish();
  }, [router, searchParams]);

  return (
    <div className="rounded-[24px] border border-outline-variant bg-surface-container-low px-6 py-5 text-sm text-on-surface-variant">
      Procesando acceso...
    </div>
  );
}
