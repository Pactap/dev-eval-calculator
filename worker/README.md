# PEC config backend (Cloudflare Worker)

Authoritative store for the shared scoring config, with server-side passkey
enforcement. The front-end reads the config from here on load and can only
change it by sending the passkey, which is verified here (never shipped to the
browser).

## Deploy (one-time)

```bash
cd worker
npx wrangler login                       # your Cloudflare account
npx wrangler kv namespace create CONFIG  # copy the printed id into wrangler.toml
npx wrangler secret put PASSKEY          # paste: test-passkey
npx wrangler deploy                      # prints the Worker URL
```

Then point the front-end at it and redeploy:

```bash
# from the repo root
echo "VITE_CONFIG_API=https://pec-config.<your-subdomain>.workers.dev" > .env.production
npm run deploy
```

## API

| Method | Path      | Auth            | Body        | Returns |
| ------ | --------- | --------------- | ----------- | ------- |
| GET    | `/config` | none            | —           | config JSON, or `null` if unset |
| PUT    | `/config` | `X-Passkey` hdr | config JSON | `{ok:true}` / `401` / `400` |

## Test the Worker logic locally

```bash
node --test worker/worker.test.mjs
```

## Notes

- Passkey lives only as a Worker secret; the browser sends the key the user
  types, over HTTPS, and the Worker compares it in constant time.
- With no `VITE_CONFIG_API` set, the front-end runs local-only (each browser
  keeps its own config) — the backend is optional.
