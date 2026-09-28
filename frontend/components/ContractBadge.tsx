import { Lock } from "lucide-react";
import { CHAIN_NAME, CONTRACT_ADDRESS, HAS_CONTRACT } from "@/lib/chain";
import { addrUrl, shortAddr } from "@/lib/format";

/** DESIGN §13: persistent bottom-left badge. */
export function ContractBadge() {
  const text = HAS_CONTRACT ? `All money held by contract ${shortAddr(CONTRACT_ADDRESS, 4, 2)} · ${CHAIN_NAME}` : `Contract not deployed yet · ${CHAIN_NAME}`;
  const inner = (
    <>
      <Lock className="h-3 w-3 text-chain" aria-hidden />
      <span className="font-mono">{text}</span>
    </>
  );
  const cls = "fixed bottom-16 left-3 z-30 hidden items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur sm:flex md:bottom-3";
  return HAS_CONTRACT ? (
    <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
