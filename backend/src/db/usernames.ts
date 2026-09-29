import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { normalizeUsername, usernameKey, validateUsername, type UsernameError } from "../users/username";

export type Availability = { username: string; available: true } | { username: string; available: false; reason: UsernameError | "TAKEN" | "TOO_SIMILAR" };

/** Checks a raw username against the rules and the table (the wallet itself may keep or re-take its own name). */
export async function checkUsername(raw: string, forWallet?: string): Promise<Availability> {
  const username = normalizeUsername(raw);
  const bad = validateUsername(username);
  if (bad) return { username, available: false, reason: bad };
  const me = forWallet?.toLowerCase();
  const exact = await prisma.user.findUnique({ where: { username } });
  if (exact && exact.walletAddress !== me) return { username, available: false, reason: "TAKEN" };
  const similar = await prisma.user.findUnique({ where: { usernameKey: usernameKey(username) } });
  if (similar && similar.walletAddress !== me) return { username, available: false, reason: "TOO_SIMILAR" };
  return { username, available: true };
}

/** Saves the wallet → username mapping. Throws an Availability failure when the name is not allowed or not free. */
export async function setUsername(wallet: string, raw: string): Promise<string> {
  const a = await checkUsername(raw, wallet);
  if (!a.available) throw Object.assign(new Error(a.reason), { availability: a });
  try {
    await prisma.user.update({ where: { walletAddress: wallet.toLowerCase() }, data: { username: a.username, usernameKey: usernameKey(a.username) } });
  } catch (e) {
    // a concurrent claim won the unique index
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw Object.assign(new Error("TAKEN"), { availability: { username: a.username, available: false, reason: "TAKEN" } });
    }
    throw e;
  }
  namesCache.clear();
  return a.username;
}

const namesCache = new Map<string, { at: number; name: string | null }>();
const NAMES_TTL_MS = 10_000;
/** Lowercase address → username for the addresses that have one (cached 10 s). */
export async function namesFor(addresses: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const miss: string[] = [];
  for (const raw of addresses) {
    const a = raw.toLowerCase();
    const hit = namesCache.get(a);
    if (hit && now - hit.at < NAMES_TTL_MS) { if (hit.name) out.set(a, hit.name); } else miss.push(a);
  }
  if (miss.length) {
    const rows = await prisma.user.findMany({ where: { walletAddress: { in: [...new Set(miss)] } }, select: { walletAddress: true, username: true } });
    const found = new Map(rows.map((r) => [r.walletAddress, r.username]));
    for (const a of miss) {
      const name = found.get(a) ?? null;
      namesCache.set(a, { at: now, name });
      if (name) out.set(a, name);
    }
  }
  return out;
}
