/**
 * Demo wallet funding checks (chain reads + deployer top-up). Pure maths lives in ./params.
 * Used by POST /demo/new-circle (pre-check before creating the circle), GET /demo/state and GET /health.
 */
import { formatEther, parseEther } from "ethers";
import { cachedRead, DEFAULT_BPS, deployer, demoWallets, errorMessage, provider } from "../chain";
import { auditSystem } from "../auth/audit";
import { deployerCanCover, FAUCET_URL, fundingPlan, GAS_RESERVE, unassessedJoinCollateral, type WalletShortfall } from "./params";

/** What a demo wallet needs to join a default demo circle (0.1 MST contribution at the High multiplier + gas). */
export const DEFAULT_DEMO_REQUIRED = unassessedJoinCollateral(parseEther("0.1"), DEFAULT_BPS.highBps) + GAS_RESERVE;

export interface UnderfundedReport {
  code: "DEMO_UNDERFUNDED";
  required: string;
  wallets: WalletShortfall[];
  deployer: { address: string | null; balance: string; shortfall: string } | null;
  faucet: string;
  checkedAt: number;
}
let lastUnderfunded: UnderfundedReport | null = null;
/** Last failed pre-check (cleared by the next successful one). Shown in GET /demo/state as `underfunded`. */
export function underfundedReport(): UnderfundedReport | null { return lastUnderfunded; }

async function balances(): Promise<{ label: string; address: string; balance: bigint }[]> {
  return Promise.all(demoWallets.map(async (w) => ({ label: w.label, address: w.address, balance: await cachedRead(`bal:${w.address}`, () => provider.getBalance(w.address)) })));
}

/**
 * Ensures every demo wallet holds `collateral + GAS_RESERVE`. Tops up short wallets from the deployer first; when the
 * deployer cannot cover the whole shortfall (keeping its own gas reserve) nothing is sent and the report is returned.
 * Returns null when everything is funded (possibly after top-ups).
 */
export async function ensureDemoFunding(collateral: bigint): Promise<UnderfundedReport | null> {
  const plan = fundingPlan(await balances(), collateral);
  if (plan.short.length === 0) { lastUnderfunded = null; return null; }
  const deployerBal = deployer ? await provider.getBalance(deployer.address) : 0n;
  const report = (): UnderfundedReport => ({
    code: "DEMO_UNDERFUNDED", required: plan.required.toString(), wallets: plan.short,
    deployer: { address: deployer?.address ?? null, balance: deployerBal.toString(), shortfall: (plan.totalShortfall + GAS_RESERVE > deployerBal ? plan.totalShortfall + GAS_RESERVE - deployerBal : 0n).toString() },
    faucet: FAUCET_URL, checkedAt: Math.floor(Date.now() / 1000),
  });
  if (!deployer || !deployerCanCover(deployerBal, plan.totalShortfall)) {
    lastUnderfunded = report();
    console.warn(`[demo] underfunded: ${plan.short.map((s) => `${s.label} short ${formatEther(BigInt(s.shortfall))}`).join(", ")}; deployer has ${formatEther(deployerBal)} MST — claim at ${FAUCET_URL}`);
    return lastUnderfunded;
  }
  for (const s of plan.short) {
    try {
      const tx = await deployer.sendTransaction({ to: s.address, value: BigInt(s.shortfall) });
      await tx.wait(1);
      console.log(`[demo] funded ${s.label} ${s.address} +${formatEther(BigInt(s.shortfall))} MST txHash ${tx.hash}`);
      auditSystem("AUTOPILOT", "autopilot.fund", s.address.toLowerCase(), "ok", tx.hash, { amount: s.shortfall, reason: "demo.new-circle precheck" });
    } catch (e) {
      auditSystem("AUTOPILOT", "autopilot.fund", s.address.toLowerCase(), "failed", null, { amount: s.shortfall, error: errorMessage(e) });
      lastUnderfunded = report();
      return lastUnderfunded;
    }
  }
  // Re-check after the top-ups (the cache was cleared when the tx mined — sendTransaction bypasses sendTx, so clear by re-reading).
  const after = fundingPlan(await Promise.all(demoWallets.map(async (w) => ({ label: w.label, address: w.address, balance: await provider.getBalance(w.address) }))), collateral);
  if (after.short.length > 0) { lastUnderfunded = { ...report(), wallets: after.short }; return lastUnderfunded; }
  lastUnderfunded = null;
  return null;
}

export interface DemoWalletHealth { label: string; address: string; balanceMst: string; ok: boolean }
/** /health: every demo wallet with its balance and whether it can join a default demo circle. Cached 5 s, never throws. */
export async function demoWalletHealth(): Promise<{ wallets: DemoWalletHealth[]; underfunded: boolean }> {
  const wallets = await Promise.all(demoWallets.map(async (w) => {
    let bal: bigint | null = null;
    try { bal = await cachedRead(`bal:${w.address}`, () => provider.getBalance(w.address), 5000); } catch { /* rpc down */ }
    return { label: w.label, address: w.address, balanceMst: bal === null ? "?" : formatEther(bal), ok: bal !== null && bal >= DEFAULT_DEMO_REQUIRED };
  }));
  return { wallets, underfunded: wallets.some((w) => !w.ok) };
}
