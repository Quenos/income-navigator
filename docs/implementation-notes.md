# Implementation Notes

## Baseline

- Project started as documentation-only repository.
- Source user requirements: `docs/dynamic-pmcc-scanner-requirements.md`
- Source functional requirements: `docs/dynamic-pmcc-scanner-functional-requirements.md`
- MVP stack: Next.js, React, TypeScript, Tailwind, shadcn/ui later, Vitest, Playwright.
- MVP provider mode: fake fixture provider first; TastyTrade read-only adapter shell later.
- TastyTrade SDK integration must import only from `tastytrade-ts-sdk/read-only` and remain behind the app-owned `MarketDataProvider` boundary.
