# Income Navigator — Dynamic PMCC Scanner

Web-based rule scanner for the user-defined Dynamic PMCC setup.

## MVP Boundary

This app is a read-only rule-based scanner. It does not place, preview, modify, cancel, route, or recommend trades. It has no account balance, position, order-management, or order-ticket functionality.

## Development

```bash
npm install
npm run dev
npm run test
npm run test:coverage
npm run test:e2e
npm run quality
```

The default development provider is the deterministic fake fixture provider:

```dotenv
SCANNER_PROVIDER=fake
```

To run development against live read-only TastyTrade market data, create `.env.local` with:

```dotenv
SCANNER_PROVIDER=tastytrade
TASTYTRADE_PROVIDER_SECRET=<provider-credential>
TASTYTRADE_REFRESH_TOKEN=<refresh-token>
TASTYTRADE_ACCOUNT_ID=<account-number>
# Defaults to true. Set false only when intentionally using the production TastyTrade environment.
TASTYTRADE_IS_TEST=true
```

The TastyTrade provider is read-only behind `MarketDataProvider`. It fetches the underlying quote, call option chain, option quotes, option greeks, and daily/weekly candle snapshots, then normalizes them into the scanner's `MarketDataSnapshot`. Live TastyTrade access is not required for tests. The app currently uses the local packaged `tastytrade-ts-sdk` tarball because the upstream package is not yet published on npm and direct GitHub install was verified as broken. Replace the local tarball once the SDK has a working distribution path.

Never put credentials in git, logs, docs, fixtures, screenshots, or test output.

## CLI

Run local development scans from the terminal with the same read-only provider selected by
`SCANNER_PROVIDER`. The CLI is intentionally documented as a local development entry point; this
private app does not publish a compiled runtime-safe package bin.

```bash
# Explicit tickers with progress status on stderr and a table on stdout
SCANNER_PROVIDER=fake npm run cli -- scan SPY QQQ

# Full DPMCC ETF universe, showing only pass results
SCANNER_PROVIDER=fake npm run cli -- scan --universe dpmcc --pass-only

# Machine-readable output
SCANNER_PROVIDER=fake npm run --silent cli -- scan SPY --json
```

Direct `tsx` execution also keeps JSON stdout parseable:

```bash
SCANNER_PROVIDER=fake npx tsx src/cli/main.ts scan SPY --json
```

The CLI scans sequentially and prints the active ticker status, for example `Scanning SPY (1 of 41)…`, before each provider call. Use `SCANNER_PROVIDER=tastytrade` with the TastyTrade environment variables above for live read-only market data.

## Verification

Local quality gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
```

Full gate including coverage and E2E:

```bash
npm run quality:full
```

On this Hermes host, Playwright may skip locally if Chromium shared libraries cannot be installed without sudo. GitHub Actions runs the real browser suite using `npx playwright install --with-deps chromium`.

## Safety

The scanner uses `Criteria Match`, `Watch`, `Fail`, `Insufficient Data`, and `Manual Review` labels only. It intentionally avoids recommendation/trade-control language and exposes only read-only market-data provider methods.
