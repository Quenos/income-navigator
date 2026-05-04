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

Live TastyTrade access is not required for tests. The TastyTrade adapter is a read-only shell behind `MarketDataProvider` and currently uses the local packaged `tastytrade-ts-sdk` tarball because the upstream package is not yet published on npm and direct GitHub install was verified as broken. Replace the local tarball once the SDK has a working distribution path.

Never put credentials in git, logs, docs, fixtures, screenshots, or test output.

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
