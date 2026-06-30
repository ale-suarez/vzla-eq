import { PerfilClient } from "@/app/perfil/perfil-client";
import { RouteTransition } from "@/components/assessment-visuals";

export default function PerfilPage() {
  return (
    <RouteTransition className="min-h-dvh">
      <PerfilClient />
    </RouteTransition>
  );
}
