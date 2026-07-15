# Security Policy

## Supported versions

This is a single, continuously released web application. Only the latest version deployed at
<https://pactap.github.io/dev-eval-calculator/> (and `master`) is supported.

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** rather than opening a public issue:

- Use GitHub's **[Report a vulnerability](https://github.com/Pactap/dev-eval-calculator/security/advisories/new)**
  (Security → Advisories), or
- email the maintainers at **umendra.singh@pactap.com**.

Include steps to reproduce, affected version/URL, and impact. We aim to acknowledge within a few business
days and to fix confirmed issues promptly.

## Security model (what to keep in mind)

- The app is **client-side**: all evaluation data stays in the browser (localStorage) and never leaves the
  device. There is no user database.
- Editing the shared scoring rules is gated by a **passkey**. Only the SHA-256 hash of the passkey ships in
  the bundle; the raw key is never bundled. The client gate is a deterrent — the authoritative check is
  performed **server-side** by an optional Cloudflare Worker (`worker/`) using a constant-time comparison
  before persisting the shared config. Treat the client gate alone as non-authoritative.
- Because the code is client-side, a lack of client-side permission enforcement is not itself a
  vulnerability; report issues that bypass the **server** check, expose secrets, or execute untrusted input.
