# Implementation Notes

## Baseline

- Project started as documentation-only repository.
- Source user requirements: `docs/dynamic-pmcc-scanner-requirements.md`
- Source functional requirements: `docs/dynamic-pmcc-scanner-functional-requirements.md`
- MVP stack: Next.js, React, TypeScript, Tailwind, shadcn/ui later, Vitest, Playwright.
- MVP provider mode: fake fixture provider first; TastyTrade read-only adapter shell later.
- TastyTrade SDK integration must import only from `tastytrade-ts-sdk/read-only` and remain behind the app-owned `MarketDataProvider` boundary.

## Scan API rate limiting

- `/api/scan` keeps in-process active-request and per-window gates as defense-in-depth only; production deployments with more than one Node process/instance must enforce a shared rate limit at the gateway/WAF/load balancer or a shared store such as Redis/KV.
- The route does not trust client-supplied `x-forwarded-for` or `x-real-ip` headers by default. If a deployment needs per-client in-process keys, set `SCAN_TRUSTED_CLIENT_IP_HEADER` only to a header that the trusted proxy overwrites after stripping the same header from inbound client requests.
- `SCAN_MAX_RATE_LIMIT_KEYS` bounds retained in-memory limiter windows, and expired windows are pruned before accepting new requests.
