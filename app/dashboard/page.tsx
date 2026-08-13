import { redirect } from "next/navigation";

// The live incident map was retired as a standalone view. Keep /dashboard as a
// permanent redirect to Inspecciones so old links and magic-link flows land
// somewhere valid.
export default function DashboardPage() {
  redirect("/history");
}
