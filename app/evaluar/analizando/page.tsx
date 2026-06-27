"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingView, RouteTransition } from "@/components/assessment-visuals";
import { useAssessment } from "@/components/assessment-provider";

export default function AnalyzingPage() {
  const router = useRouter();
  const { photos, loading, result, error, runAnalysis, clearEvaluation } = useAssessment();

  useEffect(() => {
    if (photos.length === 0) {
      router.replace("/evaluar", { scroll: false, transitionTypes: ["nav-back"] });
      return;
    }

    if (result) {
      router.replace("/resultado", { scroll: false, transitionTypes: ["nav-forward"] });
      return;
    }

    if (!loading) {
      void runAnalysis();
    }
  }, [loading, photos.length, result, router, runAnalysis]);

  return (
    <RouteTransition className="pt-14">
      <div className="mx-auto w-full max-w-2xl px-5 py-6">
        <LoadingView />

        {error && (
          <div className="-mt-2 flex flex-col items-center gap-3 rounded-[24px] border border-destructive/20 bg-error-container px-5 py-4 text-center text-sm text-on-error-container shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="h-12 flex-1 rounded-[18px] bg-primary text-white hover:bg-primary-container"
                onClick={() => router.replace("/evaluar", { scroll: false, transitionTypes: ["nav-back"] })}
              >
                <Camera className="h-4 w-4" />
                Volver a subir fotos
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-[18px] border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                onClick={() => {
                  clearEvaluation();
                  router.replace("/evaluar", { scroll: false, transitionTypes: ["nav-back"] });
                }}
              >
                Intentar de nuevo
              </Button>
            </div>
          </div>
        )}
      </div>
    </RouteTransition>
  );
}
