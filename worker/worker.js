// Cloudflare Worker: authoritative shared state for the Performance Evaluation Centre.
//
//   GET  /config       -> current shared scoring config JSON (public read; "null" if unset)
//   PUT  /config       -> requires header X-Passkey; validates JSON and persists to KV.
//
//   GET  /rh           -> the restricted-holiday ledger { [devKey]: { [year]: entry } } (public read)
//   POST /rh/claim     -> requires X-Passkey; body { devKey, year, entry:{date,...} }.
//                         SERVER enforces one restricted holiday per developer per calendar
//                         year: a second, different date for the same dev+year returns 409.
//   POST /rh/release   -> requires X-Passkey; body { devKey, year }. Frees the slot.
//
// This makes the "one per year" quota authoritative across machines (not just per-browser).
// Bindings (see wrangler.toml): KV namespace CONFIG, secret PASSKEY.

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Passkey",
  "Access-Control-Max-Age": "86400",
});

// Constant-time compare so the endpoint doesn't leak the key length/prefix via timing.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const RH_KEY = "rhLedger";

async function readLedger(env) {
  try { return JSON.parse(await env.CONFIG.get(RH_KEY)) || {}; } catch { return {}; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { ...cors(request.headers.get("Origin")), "Content-Type": "application/json" };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers });
    const authed = () => Boolean(env.PASSKEY) && safeEqual(request.headers.get("X-Passkey") || "", env.PASSKEY);

    if (request.method === "OPTIONS") return new Response(null, { headers });

    /* ---- shared scoring config ---- */
    if (url.pathname === "/config") {
      if (request.method === "GET") {
        const cfg = await env.CONFIG.get("scoring");
        return new Response(cfg || "null", { headers });
      }
      if (request.method === "PUT") {
        if (!authed()) return json({ error: "Invalid passkey" }, 401);
        const body = await request.text();
        try { JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); }
        await env.CONFIG.put("scoring", body);
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    /* ---- restricted-holiday quota ledger ----
       ponytail: KV read-modify-write is not atomic; two simultaneous claims for the
       same dev+year could both pass. Fine for this low-volume internal tool; move to a
       Durable Object if real concurrency ever needs true atomicity. */
    if (url.pathname === "/rh") {
      // Read is passkey-gated too: the ledger holds employee IDs and their usage.
      if (request.method === "GET") {
        if (!authed()) return json({ error: "Invalid passkey" }, 401);
        return json({ ok: true, ledger: await readLedger(env) });
      }
      if (request.method === "PUT") {                // bulk replace (admin import) — passkey-gated
        if (!authed()) return json({ error: "Invalid passkey" }, 401);
        let body;
        try { body = JSON.parse(await request.text()); } catch { return json({ error: "Invalid JSON" }, 400); }
        if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Ledger must be an object" }, 400);
        // Validate every dev/year entry so a hand-crafted PUT can't store malformed data.
        for (const dev of Object.keys(body)) {
          const byYear = body[dev];
          if (!byYear || typeof byYear !== "object" || Array.isArray(byYear)) return json({ error: `Malformed ledger at "${dev}"` }, 400);
          for (const yr of Object.keys(byYear)) {
            const e = byYear[yr];
            if (!e || typeof e !== "object" || typeof e.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || e.date.slice(0, 4) !== yr) {
              return json({ error: `Malformed entry at ${dev}/${yr}` }, 400);
            }
          }
        }
        await env.CONFIG.put(RH_KEY, JSON.stringify(body));
        return json({ ok: true, ledger: body });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/rh/claim" || url.pathname === "/rh/release") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (!authed()) return json({ error: "Invalid passkey" }, 401);

      let b;
      try { b = JSON.parse(await request.text()); } catch { return json({ error: "Invalid JSON" }, 400); }
      const devKey = typeof b.devKey === "string" ? b.devKey.trim() : "";
      const year = typeof b.year === "string" ? b.year : "";
      if (!devKey || !/^\d{4}$/.test(year)) return json({ error: "devKey and 4-digit year required" }, 400);

      const ledger = await readLedger(env);
      const existing = (ledger[devKey] && ledger[devKey][year]) || null;

      if (url.pathname === "/rh/claim") {
        const entry = b.entry && typeof b.entry === "object" && !Array.isArray(b.entry) ? b.entry : null;
        if (!entry || typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
          return json({ error: "entry.date (YYYY-MM-DD) required" }, 400);
        }
        if (entry.date.slice(0, 4) !== year) return json({ error: "entry.date must fall in the given year" }, 400);
        // The quota: a different date already recorded for this dev+year is rejected.
        if (existing && existing.date !== entry.date) {
          return json({ error: "already used", existing, message: `Already used the ${year} restricted holiday on ${existing.date}.` }, 409);
        }
        ledger[devKey] = { ...(ledger[devKey] || {}), [year]: entry };
        await env.CONFIG.put(RH_KEY, JSON.stringify(ledger));
        return json({ ok: true, ledger });
      }

      // release
      if (ledger[devKey] && ledger[devKey][year]) {
        delete ledger[devKey][year];
        if (Object.keys(ledger[devKey]).length === 0) delete ledger[devKey];
        await env.CONFIG.put(RH_KEY, JSON.stringify(ledger));
      }
      return json({ ok: true, ledger });
    }

    return json({ error: "Not found" }, 404);
  },
};
