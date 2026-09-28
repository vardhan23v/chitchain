import { test } from "node:test";
import assert from "node:assert/strict";
import { Wallet, verifyMessage } from "ethers";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test"; // config.ts requires it; nothing connects in this test
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildLoginMessage } = require("./message") as typeof import("./message");

const fields = { address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", nonce: "00112233445566778899aabbccddeeff", issuedAt: 1_700_000_000, expiresAt: 1_700_000_300 };

test("exact message text (snapshot, API.md v3)", () => {
  const msg = buildLoginMessage("app.chitchain.example", fields, 91562037);
  assert.equal(msg, [
    "ChitChain wants you to sign in with your MST wallet.",
    "",
    "Domain: app.chitchain.example",
    "Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "Chain ID: 91562037",
    "Nonce: 00112233445566778899aabbccddeeff",
    "Issued At: 2023-11-14T22:13:20.000Z",
    "Expires: 2023-11-14T22:18:20.000Z",
    "",
    "ChitChain never asks for your seed phrase or private key.",
  ].join("\n"));
});

test("a random wallet's signature over the message recovers when the server rebuilds it", async () => {
  const w = Wallet.createRandom();
  const f = { ...fields, address: w.address.toLowerCase() };
  const sig = await w.signMessage(buildLoginMessage("localhost:3000", f, 31337));
  const rebuilt = buildLoginMessage("localhost:3000", f, 31337); // same fields, independent of the client string
  assert.equal(verifyMessage(rebuilt, sig).toLowerCase(), w.address.toLowerCase());
  // tampered nonce / expiry / domain / chain → different address
  assert.notEqual(verifyMessage(buildLoginMessage("localhost:3000", { ...f, nonce: "ff112233445566778899aabbccddeeff" }, 31337), sig).toLowerCase(), w.address.toLowerCase());
  assert.notEqual(verifyMessage(buildLoginMessage("localhost:3000", { ...f, expiresAt: f.expiresAt + 1 }, 31337), sig).toLowerCase(), w.address.toLowerCase());
  assert.notEqual(verifyMessage(buildLoginMessage("evil.example", f, 31337), sig).toLowerCase(), w.address.toLowerCase());
  assert.notEqual(verifyMessage(buildLoginMessage("localhost:3000", f, 1), sig).toLowerCase(), w.address.toLowerCase());
});
