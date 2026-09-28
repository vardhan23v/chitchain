import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Page not found" };

/** Glass 404: same EmptyState anatomy as every other empty state, one primary action back to the circles. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-10 md:py-16">
      <EmptyState
        Icon={Compass}
        title="This page doesn't exist."
        text="The link may be old, or the circle id may be wrong. The contract still holds every pot, nothing is lost."
        action={<Button asChild><Link href="/">Browse circles</Link></Button>}
      />
    </div>
  );
}
