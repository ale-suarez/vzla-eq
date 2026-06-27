import { IncidentDetailClient } from "@/app/dashboard/incidents/[id]/incident-detail-client";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return <IncidentDetailClient id={id} />;
}

