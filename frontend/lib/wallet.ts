import { BrowserProvider } from "ethers";
import { CHAIN_ID, CHAIN_ID_HEX, CHAIN_NAME, CURRENCY, EXPLORER_URL, RPC_URL } from "@/lib/chain";

/** Minimal EIP-1193 surface we rely on. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
  isBridgeKey?: boolean;
}

export function getInjected(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  // VERIFY: BridgeKey injects an EIP-1193 provider as window.ethereum
  const eth = (window as any).ethereum as Eip1193Provider | undefined;
  return eth ?? null;
}

export function getBrowserProvider(): BrowserProvider | null {
  const eth = getInjected();
  return eth ? new BrowserProvider(eth as never) : null;
}

function parseChainId(v: unknown): number | null {
  if (typeof v === "string") return v.startsWith("0x") ? parseInt(v, 16) : Number(v);
  if (typeof v === "number") return v;
  return null;
}

export async function readAccounts(): Promise<string[]> {
  const eth = getInjected();
  if (!eth) return [];
  const acc = (await eth.request({ method: "eth_accounts" })) as string[];
  return acc ?? [];
}

export async function readChainId(): Promise<number | null> {
  const eth = getInjected();
  if (!eth) return null;
  return parseChainId(await eth.request({ method: "eth_chainId" }));
}

export async function requestAccounts(): Promise<string[]> {
  const eth = getInjected();
  if (!eth) throw new Error("No wallet found");
  return (await eth.request({ method: "eth_requestAccounts" })) as string[];
}

/** Switches to MST Testnet; if the wallet does not know the chain, adds it first. */
export async function switchToMst(): Promise<void> {
  const eth = getInjected();
  if (!eth) throw new Error("No wallet found");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e) {
    const code = (e as { code?: number })?.code;
    // 4902 = unrecognised chain (MetaMask convention); some wallets throw -32603 instead.
    if (code === 4902 || code === -32603 || String((e as Error)?.message ?? "").includes("Unrecognized")) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN_NAME,
            nativeCurrency: { ...CURRENCY },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
      return;
    }
    throw e;
  }
}

export function isCorrectChain(chainId: number | null): boolean {
  return chainId === CHAIN_ID;
}

export function subscribe(handlers: { onAccounts: (a: string[]) => void; onChain: (id: number | null) => void }): () => void {
  const eth = getInjected();
  if (!eth?.on) return () => {};
  const accountsHandler = (...args: unknown[]) => handlers.onAccounts((args[0] as string[]) ?? []);
  const chainHandler = (...args: unknown[]) => handlers.onChain(parseChainId(args[0]));
  eth.on("accountsChanged", accountsHandler);
  eth.on("chainChanged", chainHandler);
  return () => {
    eth.removeListener?.("accountsChanged", accountsHandler);
    eth.removeListener?.("chainChanged", chainHandler);
  };
}

/** Signs a plain message with the connected account (EIP-191 personal_sign). Used for wallet login. */
export async function signMessage(message: string): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error("No wallet found");
  const signer = await provider.getSigner();
  return signer.signMessage(message);
}

/** Gas reserve kept back on every pre-send check (audit 1.8). */
export const GAS_RESERVE_WEI = 10n ** 16n; // 0.01 MST

export interface BalanceCheck {
  ok: boolean;
  /** Native MST balance of the connected account (wei). */
  balance: bigint;
  /** value + GAS_RESERVE_WEI (wei). */
  required: bigint;
  /** required - balance when short, else 0n. */
  shortfall: bigint;
}

/**
 * Pre-send balance check: reads the connected account's balance via the injected provider and compares it with
 * `value` plus a 0.01 MST gas reserve. Throws only when no wallet/account is available.
 */
export async function hasEnough(value: bigint, account?: string | null): Promise<BalanceCheck> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error("No wallet found");
  const addr = account ?? (await readAccounts())[0];
  if (!addr) throw new Error("No account connected");
  const balance = await provider.getBalance(addr);
  const required = value + GAS_RESERVE_WEI;
  const shortfall = balance >= required ? 0n : required - balance;
  return { ok: shortfall === 0n, balance, required, shortfall };
}
