import { Suspense } from "react";

import { AuthCallbackClient } from "@/app/auth/callback/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-5 py-20">
      <Suspense fallback={<div className="rounded-[24px] border border-outline-variant bg-surface-container-low px-6 py-5 text-sm text-on-surface-variant">Procesando acceso...</div>}>
        <AuthCallbackClient />
      </Suspense>
    </main>
  );
}
