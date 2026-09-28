import { AlertTriangle } from "lucide-react";
import { HAS_CONTRACT } from "@/lib/chain";

export function ContractBanner() {
  if (HAS_CONTRACT) return null;
  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning" role="status">
      <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />
      Contract not deployed yet — set <code className="font-mono">NEXT_PUBLIC_CHITCHAIN_ADDRESS</code>
    </div>
  );
}
