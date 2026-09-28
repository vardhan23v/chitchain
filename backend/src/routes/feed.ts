import { Router } from "express";
import { listEvents } from "../db";
import { eventRowToFeed } from "./feedShape";
import { optionalInt, wrap } from "./util";

export const feed = Router();

/** GET /feed?circleId=&since=&limit= — ascending by id; `since` = last seen id; global max 100. */
feed.get("/feed", wrap(async (req, res) => {
  const circleId = optionalInt(req.query.circleId);
  const since = optionalInt(req.query.since);
  const limit = Math.min(optionalInt(req.query.limit) ?? 100, circleId === undefined ? 100 : 500);
  const rows = listEvents({ circleId, since, limit });
  res.json({ events: rows.map(eventRowToFeed) });
}));
