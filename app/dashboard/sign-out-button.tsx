"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      aria-label="Cerrar sesión"
      className="h-10 rounded-[16px] px-3 sm:h-11 sm:px-4"
      onClick={onClick}
      disabled={pending}
    >
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">{pending ? "Saliendo..." : "Cerrar sesión"}</span>
    </Button>
  );
}

