"use client";
import { Button, EmptyState } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      description="Please try loading this page again."
    >
      <Button onClick={reset}>Try again</Button>
    </EmptyState>
  );
}
