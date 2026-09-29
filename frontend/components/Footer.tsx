import { MotionToggle } from "@/components/motion/MotionToggle";
import { HONEST_LIMITS, TESTNET_DISCLAIMER } from "@/lib/labels";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.08] pb-24 pt-8 text-center text-xs leading-relaxed text-muted-foreground md:pb-12">
      <div className="mx-auto max-w-2xl space-y-1 px-4">
        <p>{TESTNET_DISCLAIMER}</p>
        <p>{HONEST_LIMITS}</p>
        <p>Not a registered chit company under the Chit Funds Act, 1982.</p>
        <div className="pt-3"><MotionToggle variant="pill" /></div>
      </div>
    </footer>
  );
}
