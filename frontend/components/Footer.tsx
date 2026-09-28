import { TestnetBadge } from "@/components/TestnetBadge";
import { HONEST_LIMITS, TESTNET_DISCLAIMER } from "@/lib/labels";

export function Footer() {
  return (
    <footer className="mt-16 space-y-2 border-t pb-24 pt-6 text-center text-xs text-muted-foreground md:pb-10">
      <p className="flex flex-wrap items-center justify-center gap-2">
        <TestnetBadge size="xs" />
        {TESTNET_DISCLAIMER}
      </p>
      <p>{HONEST_LIMITS}</p>
      <p>Prototype on MST Testnet · Not a registered chit company · Chit Funds Act, 1982</p>
    </footer>
  );
}
