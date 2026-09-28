import { Router } from "express";
import {
  contractAddress, getCircle, getCircleCount, getMember, getMembers, getRequiredCollateral, getRound, isConfigured, labelOf, provider, toJson,
  type CircleView,
} from "../chain";
import { activeMandates, countDistinctTx, countEventsForCircle } from "../db";
import { settleNow } from "../keeper";
import { mandateToApi } from "./feedShape";
import { ApiError, parseId, wrap } from "./util";

export const circles = Router();

function requireContract(): void { if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT"); }

export function circleSummary(id: number, c: CircleView): unknown { return toJson({ id, ...c }); }

async function allCircles(): Promise<{ id: number; c: CircleView }[]> {
  const count = await getCircleCount();
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const views = await Promise.all(ids.map((id) => getCircle(id)));
  return ids.map((id, i) => ({ id, c: views[i] }));
}

circles.get("/circles", wrap(async (_req, res) => {
  requireContract();
  const list = await allCircles();
  res.json({ circles: list.reverse().map(({ id, c }) => circleSummary(id, c)) });
}));

circles.get("/circles/:id", wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  const count = await getCircleCount();
  if (id > count) throw new ApiError(404, "circle not found", "NOT_FOUND");
  const [c, round, addrs] = await Promise.all([getCircle(id), getRound(id), getMembers(id)]);
  const [members, txCount, mandates] = await Promise.all([
    Promise.all(addrs.map(async (address) => {
      const [m, required] = await Promise.all([getMember(id, address), getRequiredCollateral(address, id)]);
      return toJson({ address, label: labelOf(address), ...m, requiredCollateral: required });
    })),
    countEventsForCircle(id),
    activeMandates(id),
  ]);
  res.json({ circle: circleSummary(id, c), round: toJson(round), members, txCount, mandates: mandates.map(mandateToApi) });
}));

circles.post("/circles/:id/settle", wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  const c = await getCircle(id);
  if (c.status !== 1) throw new ApiError(409, "circle is not active", "NotActive");
  if (Math.floor(Date.now() / 1000) <= c.roundDeadline) throw new ApiError(409, "round deadline has not passed", "RoundNotOver");
  const txHash = await settleNow(id, "api settle");
  res.json({ txHash });
}));

circles.get("/stats", wrap(async (_req, res) => {
  if (!isConfigured()) { res.json({ circlesLive: 0, circlesTotal: 0, mstcInContract: "0", txCount: 0 }); return; }
  const [list, balance, txCount] = await Promise.all([allCircles(), provider.getBalance(contractAddress!), countDistinctTx()]);
  res.json({
    circlesLive: list.filter(({ c }) => c.status === 0 || c.status === 1).length,
    circlesTotal: list.length,
    mstcInContract: balance.toString(),
    txCount,
  });
}));
