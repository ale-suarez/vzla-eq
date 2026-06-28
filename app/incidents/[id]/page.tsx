import { PublicIncidentDetailClient } from "@/components/public-incident-detail-client";

export default async function PublicIncidentDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return <PublicIncidentDetailClient id={id} />;
}
