import { Suspense } from "react";
import PlaygroundLayoutClient from "./PlaygroundLayoutClient";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-deep text-text-primary">
          Loading Playground…
        </div>
      }
    >
      <PlaygroundLayoutClient>{children}</PlaygroundLayoutClient>
    </Suspense>
  );
}
