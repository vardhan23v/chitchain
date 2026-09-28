import { getAddress } from "ethers";
import { config } from "../config";

export interface LoginFields { address: string; nonce: string; issuedAt: number /* unix sec */; expiresAt: number /* unix sec */ }

const iso = (sec: number): string => new Date(sec * 1000).toISOString();

/** The exact text the wallet signs (API.md v3). The server rebuilds it from the stored nonce; the client never sends it back. */
export function buildLoginMessage(domain: string, f: LoginFields, chainId = config.MST_CHAIN_ID): string {
  return [
    "ChitChain wants you to sign in with your MST wallet.",
    "",
    `Domain: ${domain}`,
    `Address: ${getAddress(f.address)}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${iso(f.issuedAt)}`,
    `Expires: ${iso(f.expiresAt)}`,
    "",
    "ChitChain never asks for your seed phrase or private key.",
  ].join("\n");
}
