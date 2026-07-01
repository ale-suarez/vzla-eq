import { Suspense } from "react";

import { HistoryClient } from "@/app/history/history-client";

export default function HistoryPage() {
  // HistoryClient reads ?nueva via useSearchParams, which requires a Suspense
  // boundary under the App Router.
  return (
    <Suspense>
      <HistoryClient />
    </Suspense>
  );
}
