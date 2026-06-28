import { IncidentDetailClient } from "@/app/dashboard/incidents/[id]/incident-detail-client";
import { RouteTransition } from "@/components/assessment-visuals";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return (
    <RouteTransition className="min-h-dvh">
      <IncidentDetailClient id={id} />
    </RouteTransition>
  );
}
