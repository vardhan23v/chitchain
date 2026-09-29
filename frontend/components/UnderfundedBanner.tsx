"use client";

import { Droplets } from "lucide-react";
import { InfoBanner } from "@/components/InfoBanner";
import { FAUCET_URL } from "@/lib/chain";
import { formatMst, shortAddr } from "@/lib/format";
import type { UnderfundedWallet } from "@/lib/types";

/** Coerces the tolerant /health and 409 shapes (strings or objects) into wallet rows. */
export function toUnderfunded(list: unknown): UnderfundedWallet[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((w): UnderfundedWallet | null => {
      if (typeof w === "string") return /^0x[0-9a-fA-F]{40}$/.test(w) ? { address: w } : { address: "", label: w };
      if (w && typeof w === "object") {
        const o = w as Record<string, unknown>;
        const address = String(o.address ?? o.wallet ?? "");
        return { address, label: o.label ? String(o.label) : undefined, balance: o.balance ? String(o.balance) : undefined, required: o.required ? String(o.required) : o.needed ? String(o.needed) : undefined, shortfall: o.shortfall ? String(o.shortfall) : undefined };
      }
      return null;
    })
    .filter((w): w is UnderfundedWallet => !!w && (!!w.address || !!w.label));
}

/** Demo wallets that cannot cover their next join or contribution, with the faucet link (health-driven demo banner). */
export function UnderfundedBanner({ wallets, title = "Some demo wallets are underfunded." }: { wallets: UnderfundedWallet[]; title?: string }) {
  if (!wallets.length) return null;
  return (
    <InfoBanner Icon={Droplets} tone="warning" role="status">
      <span className="font-semibold text-foreground">{title}</span> Top them up from the{" "}
      <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">MST faucet</a> or use Fund demo wallets.
      <ul className="mt-1.5 space-y-0.5 font-mono text-[12px]">
        {wallets.map((w) => (
          <li key={`${w.label ?? ""}-${w.address}`}>
            {w.label ? `Member ${w.label}` : ""}{w.label && w.address ? " " : ""}{w.address ? shortAddr(w.address, 8, 6) : ""}
            {w.balance !== undefined && <> · {formatMst(w.balance, 4)} MST</>}
            {w.required !== undefined && <> of {formatMst(w.required, 4)} needed</>}
            {w.shortfall !== undefined && w.required === undefined && <> · short {formatMst(w.shortfall, 4)} MST</>}
          </li>
        ))}
      </ul>
    </InfoBanner>
  );
}
