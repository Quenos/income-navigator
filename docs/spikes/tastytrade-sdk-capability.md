# TastyTrade SDK Capability Spike

**SDK selected for MVP shell:** https://github.com/Quenos/tastytrade-sdk (`tastytrade-ts-sdk`).

## Current packaging decision

The SDK is not published on npm yet, and direct GitHub installation is currently brittle because the package entrypoints point at `dist/` while GitHub installs do not build `dist` unless the SDK adds a prepare/publish workflow. For this implementation pass, the SDK was packed from the reviewed local checkout and installed as a local tarball dependency:

```text
vendor/tastytrade-ts-sdk-0.1.0.tgz
```

## Read-only entrypoint

Income Navigator must import only from:

```ts
tastytrade - ts - sdk / read - only;
```

Do not import from the root `tastytrade-ts-sdk` package because the root surface includes trading-capable account/order modules.

## Adapter boundary

The app owns the scanner-facing interface:

```ts
MarketDataProvider.getMarketDataForTicker(symbol);
```

The TastyTrade adapter shell lives at:

```text
src/server/market-data/tastytrade-provider.ts
```

It currently:

- uses the SDK read-only entrypoint;
- keeps `ReadOnlySession` private;
- exposes only read-only market-data helper methods;
- returns a safe provider-unavailable result for scanner snapshots until normalization is implemented;
- is not required for tests or fake-provider MVP development.

## Required future normalization work

Before enabling `SCANNER_PROVIDER=tastytrade`, normalize SDK responses into the domain-owned `MarketDataSnapshot` shape:

- current stock/ETF price;
- quote timestamp;
- weekly/daily candle-derived technical values;
- options chain calls with DTE, strike, bid, ask, delta, and quote timestamps;
- market open/closed status and freshness labels.

## Safety constraints

The adapter must not expose or call order/account methods, including:

- place/preview/submit/modify/cancel/route order;
- account balances;
- positions;
- order history;
- live order tickets.

All scanner tests must continue to pass with `SCANNER_PROVIDER=fake` and no TastyTrade credentials.
