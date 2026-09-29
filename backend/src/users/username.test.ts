import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUsername, usernameKey, validateUsername } from "./username";

test("normalization treats case consistently", () => {
  assert.equal(normalizeUsername("  Rahul "), "rahul");
  assert.equal(normalizeUsername("RAHUL"), normalizeUsername("rahul"));
});

test("valid usernames pass", () => {
  for (const u of ["rahul", "priya_k", "arjun2026", "abc"]) assert.equal(validateUsername(u), null, u);
});

test("length, characters, start and underscores are enforced", () => {
  assert.equal(validateUsername(""), "REQUIRED");
  assert.equal(validateUsername("ab"), "TOO_SHORT");
  assert.equal(validateUsername("a".repeat(21)), "TOO_LONG");
  assert.equal(validateUsername("rahul!"), "BAD_CHARS");
  assert.equal(validateUsername("rahul k"), "BAD_CHARS");
  assert.equal(validateUsername("2rahul"), "MUST_START_WITH_LETTER");
  assert.equal(validateUsername("_rahul"), "MUST_START_WITH_LETTER");
  assert.equal(validateUsername("ra__hul"), "BAD_UNDERSCORE");
  assert.equal(validateUsername("rahul_"), "BAD_UNDERSCORE");
});

test("reserved names, platform prefixes and addresses are rejected", () => {
  for (const u of ["admin", "support", "treasury", "demo_a", "demowallet", "adm1n", "mst_team", "chitchain_help", "0xabc123", "0x"]) {
    assert.notEqual(validateUsername(u), null, u);
  }
  assert.equal(validateUsername("0xab12"), "LOOKS_LIKE_ADDRESS");
});

test("lookalike key collapses confusable spellings", () => {
  assert.equal(usernameKey("rahul"), usernameKey("rahu1"));
  assert.equal(usernameKey("priya_k"), usernameKey("priyak"));
  assert.equal(usernameKey("s0nu"), usernameKey("sonu"));
  assert.notEqual(usernameKey("rahul"), usernameKey("rahil"));
});
