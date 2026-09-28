/**
 * DB smoke test against a real PostgreSQL. Requires DATABASE_URL (loaded via src/config → ../.env or backend/.env)
 * and the schema already applied (`npm run prisma:push`). Run: `npm run db:smoke`.
 * Inserts 2 events twice (proves idempotency), lists them, upserts a mandate, sets/gets meta, then cleans up.
 */
import assert from "node:assert/strict";
import {
  closeDb, countDistinctTx, findEvent, getMandate, getMeta, initDb, insertEvents, listEvents, prisma, setMeta, upsertMandate, type NewEvent,
} from "../src/db";

async function main(): Promise<void> {
  await initDb();
  console.log("[smoke] connected");

  const tx = `0xsmoke${Date.now().toString(16)}`;
  const circleId = 999_999;
  const ts = Math.floor(Date.now() / 1000);
  const rows: NewEvent[] = [
    { circleId, round: 1, name: "CircleCreated", args: { circleId, creator: "0xAbC" }, txHash: tx, logIndex: 0, block: 1, ts },
    { circleId, round: 1, name: "BidPlaced", args: { circleId, bidder: "0xAbC", discount: "1000000000000000000" }, txHash: tx, logIndex: 1, block: 1, ts },
  ];
  try {
    assert.equal(await insertEvents(rows), 2, "first insert should add 2 rows");
    assert.equal(await insertEvents(rows), 0, "second insert should be a no-op (UNIQUE tx_hash+log_index)");
    console.log("[smoke] idempotent insert OK");

    const listed = await listEvents({ circleId, limit: 10 });
    assert.equal(listed.length, 2);
    assert.deepEqual(listed.map((e) => e.name), ["CircleCreated", "BidPlaced"]);
    assert.equal(JSON.parse(listed[1].args_json).discount, "1000000000000000000", "bigint-as-string preserved");
    const found = await findEvent("CircleCreated", tx);
    assert.ok(found && found.log_index === 0);
    assert.ok((await countDistinctTx()) >= 1);
    console.log(`[smoke] listEvents/findEvent OK (${listed.length} rows)`);

    const member = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";
    const m = await upsertMandate(circleId, member, "win by round 3", 12.5);
    assert.equal(m.active, 1);
    const m2 = await upsertMandate(circleId, member, "wait for dividends", null);
    assert.equal(m2.goal, "wait for dividends");
    assert.equal(m2.max_discount_pct, null);
    const got = await getMandate(circleId, member.toLowerCase());
    assert.ok(got && got.goal === "wait for dividends", "case-insensitive mandate lookup");
    console.log("[smoke] mandate upsert/get OK");

    await setMeta("smoke_key", "1");
    await setMeta("smoke_key", "2");
    assert.equal(await getMeta("smoke_key"), "2");
    console.log("[smoke] meta set/get OK");
    console.log("OK");
  } finally {
    await prisma.event.deleteMany({ where: { txHash: tx } });
    await prisma.mandate.deleteMany({ where: { circleId } });
    await prisma.meta.deleteMany({ where: { key: "smoke_key" } });
    await closeDb();
  }
}

main().catch((e) => { console.error("[smoke] FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
