import { InspeccionesClient } from "@/app/inspecciones/inspecciones-client";
import { RouteTransition } from "@/components/assessment-visuals";

export default function InspeccionesPage() {
  return (
    <RouteTransition className="min-h-dvh">
      <InspeccionesClient />
    </RouteTransition>
  );
}
