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
    <Button type="button" variant="outline" className="h-11 rounded-[16px]" onClick={onClick} disabled={pending}>
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}

