"use client";

import { useEffect, useState } from "react";

export interface ConsoleUser {
  name: string;
  subtitle: string;
  initials: string;
}

interface MeResponse {
  authenticated?: boolean;
  email?: string;
  role?: string;
}

function initialsFrom(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[.\-_]/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase() || "··";
}

/** Fetches /api/auth/me and shapes it for the console sidebar footer. */
export function useConsoleUser(): ConsoleUser | null {
  const [user, setUser] = useState<ConsoleUser | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { data?: MeResponse }) => {
        if (!active || !body.data?.email) return;
        const email = body.data.email;
        const role = body.data.role === "admin" ? "Admin" : "Ingeniero";
        setUser({ name: email.split("@")[0] ?? email, subtitle: role, initials: initialsFrom(email) });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return user;
}
