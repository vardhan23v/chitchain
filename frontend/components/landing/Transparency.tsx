import { ExternalLink, Eye, Lock, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";
import { CHAIN_NAME, CONTRACT_ADDRESS, HAS_CONTRACT } from "@/lib/chain";
import { addrUrl } from "@/lib/format";

/** "Built for transparency": the contract card with its address, MSTScan link, network and the unaudited-testnet label. */
export function Transparency() {
  return (
    <section aria-label="Built for transparency" className="space-y-4">
      <SectionTitle Icon={Eye}>Built for transparency</SectionTitle>
      <Reveal>
        <Card className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <Lock className="h-4 w-4 text-primary" aria-hidden /> One contract holds every token
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Every contribution, bid, payout and penalty is a transaction you can open on MSTScan. No role on the website can move a member&apos;s money.
            </p>
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Contract</dt>
                <dd className="break-all font-mono text-foreground">{HAS_CONTRACT ? CONTRACT_ADDRESS : "Not deployed yet"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Network</dt>
                <dd className="text-foreground">{CHAIN_NAME}</dd>
              </div>
            </dl>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/15 px-2.5 py-0.5 text-[12px] font-medium text-warning">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Unaudited testnet contract
            </div>
          </div>
          {HAS_CONTRACT && (
            <a
              href={addrUrl(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.02] hover:bg-white/[0.1] active:scale-[0.98]"
            >
              View on MSTScan <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </Card>
      </Reveal>
    </section>
  );
}
