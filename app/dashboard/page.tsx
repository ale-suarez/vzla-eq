import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { RouteTransition } from "@/components/assessment-visuals";

export default function DashboardPage() {
  return (
    <RouteTransition className="min-h-dvh">
      <DashboardClient />
    </RouteTransition>
  );
}
