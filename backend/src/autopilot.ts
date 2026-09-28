import { parseEther } from "ethers";
import {
  contractAs, deployer, demoWallets, errorMessage, getCircle, getCircleCount, getMember, getMembers, getRequiredCollateral, isConfigured, preflight, provider, sendTx,
  type ManagedWallet,
} from "./chain";
import { addDemoCircle, demoCircleIds, getSkip } from "./db";
import { loop } from "./bus";

/**
 * Demo autopilot: for circles created via /demo/new-circle, contribute for every custodial demo wallet
 * ~5 s into each round unless the wallet is marked `skip`. One tx at a time per wallet.
 */
const CONTRIBUTE_DELAY_SEC = 5;
const busy = new Set<string>(); // wallet addresses with a tx in flight
const done = new Set<string>(); // `${circleId}:${round}:${addr}` already handled

export const MIN_BALANCE = parseEther("1");
export const TOP_UP_TO = parseEther("2");

/** Tops up a demo wallet from the deployer if below MIN_BALANCE. Returns the tx hash or null. */
export async function ensureFunded(address: string, min = MIN_BALANCE, target = TOP_UP_TO): Promise<string | null> {
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  const bal = await provider.getBalance(address);
  if (bal >= min) return null;
  const tx = await deployer.sendTransaction({ to: address, value: target - bal });
  console.log(`[demo] funding ${address} sent ${tx.hash}`);
  await tx.wait(1);
  console.log(`[demo] funded ${address} txHash ${tx.hash}`);
  return tx.hash;
}

async function withWallet<T>(wallet: ManagedWallet, fn: () => Promise<T>): Promise<T | null> {
  const key = wallet.address.toLowerCase();
  if (busy.has(key)) return null;
  busy.add(key);
  try { return await fn(); } finally { busy.delete(key); }
}

/** Joins every demo wallet (A–E) sequentially with its exact required collateral. Returns join tx hashes. */
export async function joinAll(circleId: number): Promise<string[]> {
  const hashes: string[] = [];
  for (const w of demoWallets) {
    const m = await getMember(circleId, w.address);
    if (m.joined) continue;
    await ensureFunded(w.address);
    const need = await getRequiredCollateral(w.address, circleId);
    // custodial demo wallet — join from the member's own key
    const rc = await withWallet(w.wallet, () =>
      sendTx(`demo join ${w.label} circle ${circleId}`, w.wallet, () => contractAs(w.wallet).join(circleId, { value: need })),
    );
    if (rc) hashes.push(rc.hash);
  }
  return hashes;
}

async function contributeFor(circleId: number, round: number, label: string, wallet: ManagedWallet, contribution: bigint): Promise<void> {
  const key = `${circleId}:${round}:${wallet.address.toLowerCase()}`;
  if (done.has(key)) return;
  await withWallet(wallet, async () => {
    const m = await getMember(circleId, wallet.address);
    if (!m.joined || m.removed || m.paidThisRound) { done.add(key); return; }
    if ((await provider.getBalance(wallet.address)) < contribution * 2n) await ensureFunded(wallet.address);
    const contract = contractAs(wallet);
    try {
      await preflight(contract, "contribute", [circleId], { value: contribution });
      // custodial demo wallet — contribute from the member's own key
      await sendTx(`autopilot ${label} circle ${circleId} round ${round}`, wallet, () => contract.contribute(circleId, { value: contribution }));
      done.add(key);
    } catch (e) {
      const msg = errorMessage(e);
      if (/AlreadyPaid|RoundClosed|NotActive|MemberRemoved/.test(msg)) done.add(key);
      console.error(`[autopilot] ${label} circle ${circleId} round ${round}: ${msg}`);
    }
  });
}

const creatorChecked = new Set<number>();
/** Demo circles = those recorded by /demo/new-circle, plus any circle created by the deployer wallet (survives a DB reset). */
async function discoverDemoCircles(): Promise<number[]> {
  if (deployer) {
    const count = await getCircleCount();
    for (let id = 1; id <= count; id++) {
      if (creatorChecked.has(id)) continue;
      try {
        const c = await getCircle(id);
        creatorChecked.add(id);
        if (c.creator.toLowerCase() === deployer.address.toLowerCase()) await addDemoCircle(id);
      } catch (e) { console.error(`[autopilot] circle ${id}: ${errorMessage(e)}`); }
    }
  }
  return await demoCircleIds();
}

async function autopilotTick(): Promise<void> {
  if (!isConfigured() || demoWallets.length === 0) return;
  const nowSec = Math.floor(Date.now() / 1000);
  for (const circleId of await discoverDemoCircles()) {
    let circle;
    try { circle = await getCircle(circleId); } catch (e) { console.error(`[autopilot] circle ${circleId}: ${errorMessage(e)}`); continue; }
    if (circle.status !== 1) continue;
    const roundStart = circle.roundDeadline - circle.roundDuration;
    if (nowSec < roundStart + CONTRIBUTE_DELAY_SEC || nowSec >= circle.roundDeadline - 2) continue;
    const members = new Set((await getMembers(circleId)).map((a) => a.toLowerCase()));
    for (const w of demoWallets) {
      if (!members.has(w.address.toLowerCase())) continue;
      if (await getSkip(w.address)) continue;
      await contributeFor(circleId, circle.round, w.label, w.wallet, circle.contribution);
    }
  }
}

export function startAutopilot(): void {
  console.log(`[autopilot] demo wallets: ${demoWallets.map((w) => `${w.label}=${w.address}`).join(", ") || "(none)"}`);
  loop("autopilot", 2000, autopilotTick);
}
