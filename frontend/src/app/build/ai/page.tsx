import { Suspense } from "react";
import AIBuildClient from "./AIBuildClient";

export default function AIBuildPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0B0F1D] text-[#A78BFA]">
          Loading AI Build Studio…
        </div>
      }
    >
      <AIBuildClient />
    </Suspense>
  );
}
