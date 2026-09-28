import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, isPasswordHash, safeEqualString, verifyPassword } from "./password";

test("hash → verify ok", () => {
  const h = hashPassword("correct horse battery staple");
  assert.match(h, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(isPasswordHash(h), true);
  assert.equal(verifyPassword("correct horse battery staple", h), true);
});

test("wrong password fails", () => {
  const h = hashPassword("s3cret-password");
  assert.equal(verifyPassword("s3cret-passwor", h), false);
  assert.equal(verifyPassword("", h), false);
  assert.equal(verifyPassword("S3CRET-PASSWORD", h), false);
});

test("same password, different salts → different hashes, both verify", () => {
  const a = hashPassword("pw");
  const b = hashPassword("pw");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("pw", a), true);
  assert.equal(verifyPassword("pw", b), true);
});

test("malformed hash fails (never throws)", () => {
  for (const bad of ["", "plain", "scrypt$zz$zz", "scrypt$abcd", "bcrypt$00$00", "scrypt$0011$" + "0".repeat(127), "scrypt$$" + "0".repeat(128)]) {
    assert.equal(isPasswordHash(bad), false, bad);
    assert.equal(verifyPassword("pw", bad), false, bad);
  }
});

test("safeEqualString", () => {
  assert.equal(safeEqualString("admin", "admin"), true);
  assert.equal(safeEqualString("admin", "admin2"), false);
  assert.equal(safeEqualString("admin", "Admin"), false);
  assert.equal(safeEqualString("", ""), true);
});
