import { Lock } from "lucide-react";
import { CHAIN_NAME, CONTRACT_ADDRESS, HAS_CONTRACT } from "@/lib/chain";
import { addrUrl, shortAddr } from "@/lib/format";

/** DESIGN §13: persistent, unobtrusive bottom-left badge linking to the contract on MSTScan. */
export function ContractBadge() {
  const text = HAS_CONTRACT ? `All money held by contract ${shortAddr(CONTRACT_ADDRESS, 6, 4)} · ${CHAIN_NAME}` : `Contract not deployed yet · ${CHAIN_NAME}`;
  const inner = (
    <>
      <Lock className="h-3 w-3 text-chain" aria-hidden />
      <span className="font-mono text-[11px]">{text}</span>
    </>
  );
  const cls = "fixed bottom-3 left-3 z-30 hidden items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground md:flex";
  return HAS_CONTRACT ? (
    <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`Contract ${CONTRACT_ADDRESS} on MSTScan`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
