import { BRIDGEKEY_URL, CHAIN_NAME, EXPLORER_URL, FAUCET_URL } from "@/lib/chain";

const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Wallet connection",
    a: (
      <>
        Install <A href={BRIDGEKEY_URL}>BridgeKey</A> (Chrome or Android), then click <em>Connect BridgeKey</em>. If the network pill says wrong network, click <em>Switch to {CHAIN_NAME}</em> — BridgeKey adds the chain if it doesn&apos;t know it. Signing in only asks for a signature: no gas, no funds move.
      </>
    ),
  },
  {
    q: "MST testnet & faucet",
    a: (
      <>
        Every amount in ChitChain is an MST testnet coin with no monetary value. Get test MST from the <A href={FAUCET_URL}>faucet</A> — 10 MST per wallet every 24 hours. You need a little MST for gas plus your contribution and collateral.
      </>
    ),
  },
  {
    q: "Transactions & MSTScan",
    a: (
      <>
        Every action (join, contribute, bid, settle, withdraw) is a real transaction on {CHAIN_NAME}. Each toast and feed item links to <A href={EXPLORER_URL}>MSTScan</A>, where you can verify the amount, the sender and the contract. Stages: waiting for wallet → signing → submitted → confirming → confirmed.
      </>
    ),
  },
  {
    q: "Roles: member, organizer, admin, contract",
    a: (
      <>
        A <strong>member</strong> joins, contributes, bids and withdraws. A <strong>circle organizer</strong> names their circle, invites wallets and reads analytics. A <strong>platform admin</strong> manages users, the audit log and support. The <strong>smart contract</strong> controls the funds — no role can move a member&apos;s money; payouts are pull-only.
      </>
    ),
  },
  {
    q: "Defaults & collateral",
    a: (
      <>
        Collateral is locked when you join, sized by your risk tier. If you miss a contribution, the contract covers it from your collateral (and the reserve if needed) and records a default. Shortfalls are shown, never hidden. Remaining collateral and holdback are released when the circle completes.
      </>
    ),
  },
];

export function Faq() {
  return (
    <div className="space-y-2">
      {FAQ.map((f) => (
        <details key={f.q} className="group rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer list-none font-semibold marker:content-none">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>{f.q}
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
