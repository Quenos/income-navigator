# Income Navigator — Dynamic PMCC Scanner

Web-based rule scanner for the user-defined Dynamic PMCC setup.

## MVP Boundary

This app is a read-only rule-based scanner. It does not place, preview, modify, cancel, route, or recommend trades.

## Development

Implementation stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vitest
- Playwright

The default development provider is a fake fixture provider. Live TastyTrade access is not required for tests.

## Commands

```bash
npm install
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```
