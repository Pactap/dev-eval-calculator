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
  assert.equal(r.headers.get("Access-Control-Allow-Methods"), "GET, PUT, OPTIONS");
});
