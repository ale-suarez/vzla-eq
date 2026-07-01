import { InspectionDetailClient } from "@/app/inspection/[id]/inspection-detail-client";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InspectionDetailClient id={id} />;
}
