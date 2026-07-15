// Cloudflare Worker: authoritative scoring config for the Performance Evaluation Centre.
//
//   GET  /config  -> current shared config JSON (public read; "null" if unset)
//   PUT  /config  -> requires header  X-Passkey: <key>  matching the PASSKEY secret;
//                    validates JSON and persists to KV. This is the REAL gate — the
//                    front-end can't change the shared config without the server's OK.
//
// Bindings (see wrangler.toml): KV namespace CONFIG, secret PASSKEY.

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { ...cors(request.headers.get("Origin")), "Content-Type": "application/json" };

    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname !== "/config") return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });

    if (request.method === "GET") {
      const cfg = await env.CONFIG.get("scoring");
      return new Response(cfg || "null", { headers });
    }

    if (request.method === "PUT") {
      if (!env.PASSKEY || !safeEqual(request.headers.get("X-Passkey") || "", env.PASSKEY)) {
        return new Response(JSON.stringify({ error: "Invalid passkey" }), { status: 401, headers });
      }
      const body = await request.text();
      try { JSON.parse(body); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers }); }
      await env.CONFIG.put("scoring", body);
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  },
};
