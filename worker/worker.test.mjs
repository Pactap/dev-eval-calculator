import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

const KEY = "test-passkey";
const mkEnv = () => ({
  PASSKEY: KEY,
  CONFIG: { store: {}, async get(k) { return this.store[k] ?? null; }, async put(k, v) { this.store[k] = v; } },
});
const req = (method, body, key) => new Request("https://x/config", {
  method, body,
  headers: key ? { "X-Passkey": key } : {},
});
const reqTo = (path, method, body, key) => new Request(`https://x${path}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body),
  headers: key ? { "X-Passkey": key } : {},
});

test("GET returns null before anything is stored", async () => {
  const r = await worker.fetch(req("GET"), mkEnv());
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "null");
});

test("PUT with wrong key is rejected, config untouched", async () => {
  const env = mkEnv();
  const r = await worker.fetch(req("PUT", '{"weights":{}}', "nope"), env);
  assert.equal(r.status, 401);
  assert.equal(env.CONFIG.store.scoring, undefined);
});

test("PUT with correct key persists; GET returns it", async () => {
  const env = mkEnv();
  const put = await worker.fetch(req("PUT", '{"weights":{"ph":0.4}}', KEY), env);
  assert.equal(put.status, 200);
  assert.deepEqual(await put.json(), { ok: true });
  const get = await worker.fetch(req("GET"), env);
  assert.equal(await get.text(), '{"weights":{"ph":0.4}}');
});

test("PUT with correct key but invalid JSON is 400", async () => {
  const r = await worker.fetch(req("PUT", "not json", KEY), mkEnv());
  assert.equal(r.status, 400);
});

test("OPTIONS preflight carries CORS headers", async () => {
  const r = await worker.fetch(req("OPTIONS"), mkEnv());
  assert.equal(r.headers.get("Access-Control-Allow-Methods"), "GET, PUT, POST, OPTIONS");
});

/* ---- restricted-holiday quota ledger ---- */

test("GET /rh returns an empty ledger before anything is claimed", async () => {
  const r = await worker.fetch(reqTo("/rh", "GET"), mkEnv());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, ledger: {} });
});

test("POST /rh/claim without the passkey is rejected", async () => {
  const env = mkEnv();
  const r = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06" } }), env);
  assert.equal(r.status, 401);
  assert.equal(env.CONFIG.store.rhLedger, undefined);
});

test("POST /rh/claim with the passkey records the entry", async () => {
  const env = mkEnv();
  const r = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06", label: "Holi" } }, KEY), env);
  assert.equal(r.status, 200);
  const { ledger } = await r.json();
  assert.equal(ledger.a1["2026"].date, "2026-03-06");
});

test("server enforces one per dev per year: a different date is 409, same date is idempotent", async () => {
  const env = mkEnv();
  await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06" } }, KEY), env);
  const dup = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-06-05" } }, KEY), env);
  assert.equal(dup.status, 409);
  assert.equal(env.CONFIG.store.rhLedger && JSON.parse(env.CONFIG.store.rhLedger).a1["2026"].date, "2026-03-06"); // unchanged
  const same = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06" } }, KEY), env);
  assert.equal(same.status, 200);
});

test("different year and different dev each get their own quota", async () => {
  const env = mkEnv();
  await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06" } }, KEY), env);
  const nextYear = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2027", entry: { date: "2027-03-06" } }, KEY), env);
  const otherDev = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a2", year: "2026", entry: { date: "2026-03-06" } }, KEY), env);
  assert.equal(nextYear.status, 200);
  assert.equal(otherDev.status, 200);
});

test("release frees the slot so a new date can be claimed", async () => {
  const env = mkEnv();
  await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-03-06" } }, KEY), env);
  const rel = await worker.fetch(reqTo("/rh/release", "POST", { devKey: "a1", year: "2026" }, KEY), env);
  assert.equal(rel.status, 200);
  const reclaim = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2026-06-05" } }, KEY), env);
  assert.equal(reclaim.status, 200);
});

test("claim rejects a malformed year/date with 400", async () => {
  const env = mkEnv();
  const badYear = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "26", entry: { date: "2026-03-06" } }, KEY), env);
  assert.equal(badYear.status, 400);
  const badDate = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "March 6" } }, KEY), env);
  assert.equal(badDate.status, 400);
  const yearMismatch = await worker.fetch(reqTo("/rh/claim", "POST", { devKey: "a1", year: "2026", entry: { date: "2027-03-06" } }, KEY), env);
  assert.equal(yearMismatch.status, 400);
});
