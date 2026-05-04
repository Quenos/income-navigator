# Dynamic PMCC Scanner Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Use strict `test-driven-development`: write failing tests first, verify RED, implement minimal GREEN, then refactor.

**Goal:** Build the MVP Dynamic PMCC Scanner as a web-based, read-only, rule-based scanner using the approved user and functional requirements.

**Architecture:** Use a simple Next.js + TypeScript full-stack app. Keep scanner logic as pure TypeScript domain modules independent from React, Next.js, TastyTrade, and network access. Route all market data through a read-only `MarketDataProvider` interface with a fake fixture provider for tests/MVP development and a future TastyTrade adapter behind the same boundary.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Playwright, pure TypeScript scanner domain modules, fake market-data provider, TastyTrade SDK adapter shell, Git, GitHub Actions CI.

**Source Requirements:**

- `docs/dynamic-pmcc-scanner-requirements.md`
- `docs/dynamic-pmcc-scanner-functional-requirements.md`

**Important MVP Constraints:**

- No trade execution.
- No order preview.
- No order modification/cancel/routing.
- No live order tickets.
- No account balances, positions, or order management.
- No recommendation language such as “Buy”, “Sell”, or “Recommended Trade”.
- All scanner tests must run without live TastyTrade/network access.

**TastyTrade SDK Note:** TastyTrade ecosystem support exists in both Python and TypeScript/JavaScript packages. The architecture must not assume one SDK directly in scanner logic. Keep the `MarketDataProvider` interface stable and add a provider-capability spike before committing to either:

- a TypeScript in-process adapter using `@tastytrade/api`, if it covers required read-only market-data endpoints cleanly;
- or a small Python sidecar/CLI adapter using the Python SDK, if Python is materially more complete for required endpoints.

---

## Execution Strategy and Parallelization

### Dependency Map

```text
Phase 0: Repo baseline
  ↓
Phase 1: App/test foundation + shared contracts
  ├─ Project scaffold
  ├─ Git/repo hygiene
  ├─ Result/domain types
  ├─ Settings defaults
  ├─ Provider interface
  └─ Disclaimer/safety constants
      ↓
Phase 2: Parallel core work
  ├─ Calculations
  ├─ Technical rules/indicators
  ├─ Long LEAPS filtering/ranking
  ├─ Short-call filtering/ranking
  ├─ Data freshness/error mapping
  ├─ Fake provider fixtures
  ├─ API schema
  └─ UI shell with mocked responses
      ↓
Phase 3: Decision engine + integration
  ├─ Result priority
  ├─ Pass/Watch/Fail/Insufficient Data/Manual Review decisions
  ├─ Fixture acceptance tests
  ├─ API route to scanner service
  └─ UI to API route
      ↓
Phase 4: E2E, safety, CI, final verification
```

### Parallel Agent Workstreams

After Task 4 establishes shared contracts, dispatch parallel subagents:

1. **Domain/Calculations Agent** — Tasks 6–8.
2. **Candidate Selection Agent** — Tasks 9–11.
3. **Data Provider/Fixtures Agent** — Tasks 12–14.
4. **UI/UX Agent** — Tasks 17–20 using mocked API responses.
5. **Safety/QA Agent** — Tasks 21–23.

Do **not** parallelize tasks that edit the same files. Shared contracts must stabilize before dependent work begins.

---

## Phase 0 — Repository Baseline

### Task 1: Verify Repository Baseline and Existing Docs

**Objective:** Confirm current project state before initialization.

**Files:**

- Read: `docs/dynamic-pmcc-scanner-requirements.md`
- Read: `docs/dynamic-pmcc-scanner-functional-requirements.md`
- Read: `docs/dynamic-pmcc-scanner-trader-review-report.md`

**Step 1: Inspect project files**

Run:

```bash
pwd
find . -maxdepth 3 -type f | sort
git status --short --branch || true
```

Expected:

```text
Project contains docs only.
Git may not be initialized yet.
```

**Step 2: Confirm no existing app scaffold**

Run:

```bash
test ! -f package.json && echo "no package.json yet"
test ! -d src && echo "no src directory yet"
```

Expected:

```text
no package.json yet
no src directory yet
```

**Step 3: Record baseline in implementation notes**

Create: `docs/implementation-notes.md`

```markdown
# Implementation Notes

## Baseline

- Project started as documentation-only repository.
- Source user requirements: `docs/dynamic-pmcc-scanner-requirements.md`
- Source functional requirements: `docs/dynamic-pmcc-scanner-functional-requirements.md`
- MVP stack: Next.js, React, TypeScript, Tailwind, shadcn/ui, Vitest, Playwright.
- MVP provider mode: fake fixture provider first; TastyTrade read-only adapter later.
```

**Step 4: Verify**

Run:

```bash
test -f docs/implementation-notes.md && echo "implementation notes created"
```

Expected:

```text
implementation notes created
```

**Commit:** Defer until Git is initialized in Task 2.

---

### Task 2: Initialize Git and Repository Hygiene

**Objective:** Create a clean Git baseline and ignore generated/sensitive files.

**Files:**

- Create: `.gitignore`
- Create: `.env.example`
- Create/Modify: `README.md`

**Step 1: Initialize Git if missing**

Run:

```bash
test -d .git || git init
git status --short --branch
```

Expected:

```text
Repository initialized or already present.
```

**Step 2: Create `.gitignore`**

Create: `.gitignore`

```gitignore
# dependencies
node_modules/

# Next.js
.next/
out/

# production/build
build/
dist/
*.tsbuildinfo

# tests
coverage/
test-results/
playwright-report/
.nyc_output/

# env/secrets
.env
.env*.local
!.env.example

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS/editor
.DS_Store
.vscode/
.idea/
```

**Step 3: Create `.env.example`**

Create: `.env.example`

```dotenv
# Provider selection. Use fake for local/TDD development.
SCANNER_PROVIDER=fake

# Future read-only TastyTrade market-data integration.
# Do not use live credentials in tests.
TASTYTRADE_USERNAME=
TASTYTRADE_PASSWORD=
TASTYTRADE_ENV=sandbox
```

**Step 4: Create MVP README**

Create: `README.md`

```markdown
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
- shadcn/ui
- Vitest
- Playwright

The default development provider is a fake fixture provider. Live TastyTrade access is not required for tests.
```

**Step 5: Verify**

Run:

```bash
git status --short
```

Expected:

```text
.gitignore, .env.example, README.md, docs files are visible as untracked if first commit.
```

**Step 6: Commit**

Run:

```bash
git add .gitignore .env.example README.md docs
git commit -m "chore: initialize repository baseline"
```

Expected:

```text
Commit created.
```

---

## Phase 1 — App and Test Foundation

### Task 3: Scaffold Next.js TypeScript App

**Objective:** Create the web app foundation directly in the repo root.

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Step 1: Scaffold app**

Run one of the following, depending on available package manager. Prefer npm for simplicity:

```bash
npx create-next-app@latest . \
  --ts \
  --eslint \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

If the scaffold warns about non-empty directory, keep existing docs and continue only if it will not delete docs.

**Step 2: Verify scaffold**

Run:

```bash
test -f package.json
test -f tsconfig.json
test -f src/app/page.tsx
npm run lint
npm run build
```

Expected:

```text
Lint and build pass on scaffold.
```

**Step 3: Commit**

Run:

```bash
git add package.json package-lock.json tsconfig.json next.config.* eslint.config.* postcss.config.* src
 git commit -m "chore: scaffold nextjs typescript app"
```

Expected:

```text
Commit created.
```

---

### Task 4: Add Quality Scripts and Formatting

**Objective:** Establish local quality gates before domain work starts.

**Files:**

- Modify: `package.json`
- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: Install dev tooling**

Run:

```bash
npm install -D prettier
```

**Step 2: Add scripts to `package.json`**

Ensure scripts include:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "quality": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build"
}
```

If current Next.js version uses `next lint` differently, adapt script to the scaffolded ESLint command.

**Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

**Step 4: Create `.prettierignore`**

```gitignore
node_modules
.next
coverage
playwright-report
test-results
package-lock.json
```

**Step 5: Verify**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Expected:

```text
All pass.
```

**Step 6: Commit**

```bash
git add package.json package-lock.json .prettierrc .prettierignore
git commit -m "chore: add local quality gates"
```

---

### Task 5: Configure Vitest for Strict TDD

**Objective:** Add unit test tooling for pure TypeScript scanner logic.

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/domain/scanner/index.ts`
- Create: `src/domain/scanner/scanner-smoke.test.ts`

**Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

**Step 2: Add test scripts**

Modify `package.json` scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/server/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/fixtures/**'],
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
```

**Step 4: Create setup file**

Create: `src/test/setup.ts`

```ts
// Shared Vitest setup for scanner tests.
```

**Step 5: RED — write failing smoke test**

Create: `src/domain/scanner/scanner-smoke.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { scannerModuleName } from './index';

describe('scanner module smoke test', () => {
  it('exports the scanner module name', () => {
    expect(scannerModuleName).toBe('dynamic-pmcc-scanner');
  });
});
```

Run:

```bash
npm run test -- src/domain/scanner/scanner-smoke.test.ts
```

Expected RED:

```text
FAIL because ./index or scannerModuleName does not exist.
```

**Step 6: GREEN — add minimal implementation**

Create: `src/domain/scanner/index.ts`

```ts
export const scannerModuleName = 'dynamic-pmcc-scanner';
```

Run:

```bash
npm run test -- src/domain/scanner/scanner-smoke.test.ts
npm run test
```

Expected:

```text
Tests pass.
```

**Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test src/domain/scanner
git commit -m "test: configure vitest for scanner domain"
```

---

### Task 6: Configure Playwright E2E Foundation

**Objective:** Add browser-level test tooling for core scanner flows and safety checks.

**Files:**

- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/home.spec.ts`

**Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

**Step 2: Add scripts**

Modify `package.json`:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 3: Create config**

Create: `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Step 4: RED — write failing disclaimer/safety E2E test**

Create: `e2e/home.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('home page presents scanner as read-only rule-based screening', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/rule-based screening/i)).toBeVisible();
  await expect(page.getByText(/not financial advice/i)).toBeVisible();

  await expect(page.getByText(/recommended trade/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /buy/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /sell/i })).toHaveCount(0);
});
```

Run:

```bash
npm run test:e2e -- e2e/home.spec.ts
```

Expected RED:

```text
FAIL because disclaimer/safety language is not implemented yet.
```

**Step 5: GREEN — minimally update `src/app/page.tsx`**

Add visible MVP heading and disclaimer. Keep design minimal for now.

**Step 6: Verify**

Run:

```bash
npm run test:e2e -- e2e/home.spec.ts
npm run quality
```

Expected:

```text
E2E and quality pass.
```

**Step 7: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e src/app/page.tsx
git commit -m "test: configure playwright safety smoke test"
```

---

## Phase 2 — Shared Contracts and Pure Domain

### Task 7: Define Scanner Domain Types and Result Priority

**Objective:** Create stable framework-neutral types used by scanner, API, UI, tests, and providers.

**Files:**

- Create: `src/domain/scanner/types.ts`
- Create: `src/domain/scanner/result-priority.ts`
- Create: `src/domain/scanner/result-priority.test.ts`
- Modify: `src/domain/scanner/index.ts`

**Step 1: RED — test primary labels and priority**

Create: `src/domain/scanner/result-priority.test.ts`

Test cases:

```text
TR-001.1 exactly one primary label exists per result
TR-001.3 allowed labels only
TR-002.1 Insufficient Data outranks otherwise Pass
TR-002.2 Fail outranks Watch
TR-002.3 Manual Review outranks Watch
TR-002.4 Pass only when no higher-priority condition exists
```

Run:

```bash
npm run test -- src/domain/scanner/result-priority.test.ts
```

Expected RED:

```text
FAIL because result priority helpers do not exist.
```

**Step 2: GREEN — implement minimal types/helpers**

Create `PrimaryResultLabel`, `ScanNote`, `RuleOutcome`, `ScannerResult`, and `resolvePrimaryResult`.

**Step 3: Verify**

```bash
npm run test -- src/domain/scanner/result-priority.test.ts
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/domain/scanner
git commit -m "feat: add scanner result model"
```

---

### Task 8: Define Scanner Settings Defaults and Validation

**Objective:** Encode configurable MVP settings from FR-032.

**Files:**

- Create: `src/domain/scanner/settings.ts`
- Create: `src/domain/scanner/settings.test.ts`

**Step 1: RED — default settings tests**

Test defaults:

```text
long min DTE = 180
long preferred DTE = 365
long delta range = 0.70–0.90
long ideal delta = 0.80
short DTE range = 7–30
strong short delta = 0.30–0.40
neutral target delta = 0.50
downtrend short delta = 0.60–0.70
extrinsic pass threshold = 0.0075
extrinsic watch lower bound = 0.006
pullback threshold = 0.05
RSI period = 14
RSI rising lookback = 3
```

**Step 2: RED — invalid settings tests**

Test invalid ranges:

```text
min > max rejects
negative thresholds reject
watch threshold > pass threshold rejects
DTE <= 0 rejects
```

**Step 3: GREEN — implement settings**

Implement `defaultScannerSettings` and `validateScannerSettings`.

**Step 4: Verify**

```bash
npm run test -- src/domain/scanner/settings.test.ts
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/domain/scanner/settings.ts src/domain/scanner/settings.test.ts
git commit -m "feat: add scanner settings defaults"
```

---

### Task 9: Implement Core Calculations with TDD

**Objective:** Implement all pure math functions needed by the scanner.

**Files:**

- Create: `src/domain/scanner/calculations.ts`
- Create: `src/domain/scanner/calculations.test.ts`

**Step 1: RED — intrinsic value tests**

Test:

```text
stock 100, strike 90 => 10
stock 100, strike 105 => 0
```

**Step 2: GREEN — intrinsic value**

Implement `calculateCallIntrinsicValue`.

**Step 3: RED/GREEN — mid price**

Test and implement:

```text
bid 1.00, ask 1.20 => 1.10
missing/invalid bid or ask returns invalid result
```

**Step 4: RED/GREEN — bid extrinsic**

Test and implement:

```text
OTM bid 0.80, intrinsic 0 => 0.80
ITM bid 6.00, intrinsic 5.00 => 1.00
last price is ignored
```

**Step 5: RED/GREEN — raw and weeklyized extrinsic**

Test and implement:

```text
stock 100, extrinsic 0.80, DTE 7 => 0.80%
stock 100, extrinsic 0.65, DTE 7 => 0.65%
stock 100, extrinsic 0.50, DTE 7 => 0.50%
stock 500, extrinsic 10.00, DTE 30 => approx 0.4667%
```

**Step 6: RED/GREEN — extrinsic classification**

Test and implement:

```text
>= 0.0075 => pass condition
0.006–0.00749 => watch
< 0.006 => fail
```

**Step 7: RED/GREEN — pullback distance**

Test and implement:

```text
price 100, MA 96 => 0.04
price 100, MA 94 => 0.06
```

**Step 8: Verify**

```bash
npm run test -- src/domain/scanner/calculations.test.ts
npm run test
```

**Step 9: Commit**

```bash
git add src/domain/scanner/calculations.ts src/domain/scanner/calculations.test.ts
git commit -m "feat: add scanner calculations"
```

---

### Task 10: Implement Technical Rules and Trend Regimes

**Objective:** Implement weekly trend, RSI, pullback, and trend-regime rule evaluation.

**Files:**

- Create: `src/domain/scanner/technical-rules.ts`
- Create: `src/domain/scanner/technical-rules.test.ts`
- Create: `src/domain/scanner/trend-regime.ts`
- Create: `src/domain/scanner/trend-regime.test.ts`

**Step 1: RED/GREEN — weekly trend**

Test and implement:

```text
weekly 8EMA > weekly 21EMA => pass
weekly 8EMA == weekly 21EMA => fail
weekly 8EMA < weekly 21EMA => fail
```

**Step 2: RED/GREEN — RSI ideal**

Test and implement:

```text
current 47, prior 42 => ideal
current 52, prior 45 => not ideal, note RSI Not Ideal
current 44, prior 48 => not ideal, note RSI Not Ideal
```

**Step 3: RED/GREEN — pullback**

Test and implement:

```text
price 100, MA 96, threshold 5% => pass
price 100, nearest MA 94, threshold 5% => watch note No Pullback
price 100, MA 96, threshold 3% => fail pullback condition
```

**Step 4: RED/GREEN — regime**

Test and implement:

```text
weekly 8EMA > weekly 21EMA and price not clearly below daily 200SMA => Strong Uptrend
weekly 8EMA < weekly 21EMA => Downtrend
neutral/mixed fixture => Neutral / Sideways
conflicting/unclear fixture => Unclear
```

**Step 5: Verify**

```bash
npm run test -- src/domain/scanner/technical-rules.test.ts src/domain/scanner/trend-regime.test.ts
npm run typecheck
```

**Step 6: Commit**

```bash
git add src/domain/scanner/technical-rules.* src/domain/scanner/trend-regime.*
git commit -m "feat: add technical rules and trend regimes"
```

---

### Task 11: Implement Long LEAPS Candidate Selection

**Objective:** Filter and rank qualifying long calls.

**Files:**

- Create: `src/domain/scanner/long-call-selection.ts`
- Create: `src/domain/scanner/long-call-selection.test.ts`

**Step 1: RED/GREEN — filter**

Test and implement:

```text
DTE 180, delta 0.70 qualifies
DTE 179 fails
delta 0.69 fails
delta 0.90 qualifies
delta 0.91 fails
no qualifying long call => no candidate
```

**Step 2: RED/GREEN — ranking**

Test and implement:

```text
prefer 370 DTE over 210 DTE when closest to 365
lower-end-of-range flag prefers 12–24 month candidate
if DTE preference ties, choose delta closest to 0.80
```

**Step 3: Verify**

```bash
npm run test -- src/domain/scanner/long-call-selection.test.ts
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/domain/scanner/long-call-selection.*
git commit -m "feat: add long leaps candidate selection"
```

---

### Task 12: Implement Short Call Candidate Selection

**Objective:** Filter and rank short-call candidates for each regime.

**Files:**

- Create: `src/domain/scanner/short-call-selection.ts`
- Create: `src/domain/scanner/short-call-selection.test.ts`

**Step 1: RED/GREEN — moneyness**

Test and implement:

```text
stock 100, strike 105 => OTM
stock 100, nearest strike 100 => ATM
stock 100, strike 95 => ITM
```

**Step 2: RED/GREEN — strong uptrend candidates**

Test and implement:

```text
35-delta OTM 14 DTE qualifies
45-delta OTM 14 DTE fails
35-delta ITM 14 DTE fails
35-delta OTM 31 DTE fails
```

**Step 3: RED/GREEN — neutral candidates**

Test and implement:

```text
ATM call in 7–30 DTE qualifies
choose ATM candidate closest to 0.50 delta
neutral regime result remains Watch, never Pass
```

**Step 4: RED/GREEN — downtrend context candidates**

Test and implement:

```text
65-delta ITM 14 DTE may be selected as context
downtrend short call never causes new-entry Pass
```

**Step 5: RED/GREEN — ranking**

Test and implement:

```text
candidate meeting extrinsic target beats one not meeting target
if both meet target, prefer delta closest to midpoint
if delta distance ties, prefer better weeklyized extrinsic
```

**Step 6: Verify**

```bash
npm run test -- src/domain/scanner/short-call-selection.test.ts
npm run typecheck
```

**Step 7: Commit**

```bash
git add src/domain/scanner/short-call-selection.*
git commit -m "feat: add short call candidate selection"
```

---

### Task 13: Implement Data Freshness and Error Mapping

**Objective:** Ensure missing/stale/invalid data produces deterministic user-facing results.

**Files:**

- Create: `src/domain/scanner/data-quality.ts`
- Create: `src/domain/scanner/data-quality.test.ts`

**Step 1: RED/GREEN — missing required data**

Test and implement:

```text
missing weekly candles => Insufficient Data
insufficient daily candles for daily 200SMA => Insufficient Data
missing option chain => Insufficient Data unless confirmed non-optionable
missing bid/ask => Insufficient Data
missing delta => Insufficient Data
```

**Step 2: RED/GREEN — stale/after-hours**

Test and implement:

```text
stale required quote during market hours => Insufficient Data
after-hours last available data => allowed with label
```

**Step 3: RED/GREEN — reason mapping**

Test and implement:

```text
invalid ticker => Ticker not found
confirmed non-optionable => No options available for this ticker
options unavailable => Options-chain data unavailable
missing delta => Option delta is required
missing bid/ask => Option quote is incomplete
provider unavailable => Market data provider unavailable
stale quote => Required quote data is stale
unclear trend => Trend regime unclear
```

**Step 4: Verify**

```bash
npm run test -- src/domain/scanner/data-quality.test.ts
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/domain/scanner/data-quality.*
git commit -m "feat: add data quality and error mapping"
```

---

## Phase 3 — Provider Boundary, Fixtures, and Decision Engine

### Task 14: Define Read-Only Market Data Provider Interface

**Objective:** Isolate scanner from TastyTrade and enforce read-only market-data access.

**Files:**

- Create: `src/server/market-data/market-data-provider.ts`
- Create: `src/server/market-data/market-data-provider.test.ts`

**Step 1: RED — provider contract tests**

Test required market-data methods exist:

```text
getMarketDataForTicker(symbol)
```

Test forbidden methods are absent:

```text
placeOrder
previewOrder
submitOrder
modifyOrder
cancelOrder
routeOrder
getBalances
getPositions
```

**Step 2: GREEN — implement interface**

Create a minimal read-only `MarketDataProvider` interface and associated result/error types.

**Step 3: Verify**

```bash
npm run test -- src/server/market-data/market-data-provider.test.ts
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/server/market-data
git commit -m "feat: add read-only market data provider contract"
```

---

### Task 15: Add Fake Provider and Required Fixtures

**Objective:** Provide deterministic, no-network scanner data for TDD and MVP UI.

**Files:**

- Create: `src/server/market-data/fake-market-data-provider.ts`
- Create: `src/domain/scanner/fixtures/index.ts`
- Create: `src/domain/scanner/fixtures/builders.ts`
- Create: fixture files for FR-037 scenarios
- Create: `src/server/market-data/fake-market-data-provider.test.ts`

**Step 1: RED — fixture registry test**

Test registry contains all required fixtures:

```text
clear_pass_strong_uptrend
watch_rsi_not_ideal
watch_no_pullback
watch_neutral_sideways
watch_extrinsic_between_060_and_0749
fail_weekly_trend
fail_downtrend
fail_no_qualifying_leaps
fail_no_qualifying_short_call
fail_extrinsic_below_060
fail_confirmed_non_optionable
insufficient_missing_greeks
insufficient_missing_bid_ask
insufficient_stale_quote
insufficient_provider_unavailable
manual_review_unclear_trend
long_candidate_ranking_closest_365
long_candidate_ranking_lower_end_range
short_candidate_ranking_delta_midpoint
after_hours_last_available_data_labeled
```

**Step 2: GREEN — add builders and fixtures incrementally**

Create fixture builder helpers for:

```text
quote
technical snapshot
option contract
option chain
market status
provider success
provider error
```

**Step 3: RED/GREEN — fake provider**

Test:

```text
fake provider returns fixture by ticker or fixture ID
fake provider can simulate one ticker failure
fake provider performs no network calls
```

**Step 4: Verify**

```bash
npm run test -- src/server/market-data/fake-market-data-provider.test.ts
npm run test -- src/domain/scanner/fixtures
```

**Step 5: Commit**

```bash
git add src/server/market-data/fake-market-data-provider.* src/domain/scanner/fixtures
git commit -m "test: add fake market data provider fixtures"
```

---

### Task 16: Implement Scanner Decision Engine

**Objective:** Combine data quality, technical rules, candidate selection, and result priority into final scanner results.

**Files:**

- Create: `src/domain/scanner/decision-engine.ts`
- Create: `src/domain/scanner/decision-engine.test.ts`
- Create: `src/domain/scanner/decision-engine.fixtures.test.ts`
- Modify: `src/domain/scanner/index.ts`

**Step 1: RED/GREEN — clean pass**

Test `clear_pass_strong_uptrend` fixture returns `Pass`.

**Step 2: RED/GREEN — priority tests**

Test:

```text
missing delta + otherwise pass => Insufficient Data
weekly trend failure + RSI watch => Fail
unclear trend + otherwise valid => Manual Review
```

**Step 3: RED/GREEN — Watch decisions**

Test:

```text
RSI not ideal => Watch
no pullback => Watch
neutral/sideways => Watch
extrinsic 0.60%–0.749% => Watch
```

**Step 4: RED/GREEN — Fail decisions**

Test:

```text
confirmed non-optionable => Fail
no qualifying LEAPS => Fail
no qualifying short call => Fail
weekly 8EMA <= weekly 21EMA => Fail
downtrend => Fail
extrinsic below 0.60% => Fail
```

**Step 5: RED/GREEN — Insufficient Data decisions**

Test:

```text
missing candle data => Insufficient Data
missing option delta => Insufficient Data
stale quote during market hours => Insufficient Data
provider unavailable => Insufficient Data
```

**Step 6: RED/GREEN — Manual Review decisions**

Test:

```text
unclear trend => Manual Review
support reversal cannot be determined => context/manual note
lower-end-of-range not manually marked => do not assume lower-end-of-range
```

**Step 7: Verify all fixture acceptance tests**

Run:

```bash
npm run test -- src/domain/scanner/decision-engine.fixtures.test.ts
npm run test -- src/domain/scanner
```

Expected:

```text
All primary statuses covered by deterministic offline fixtures.
```

**Step 8: Commit**

```bash
git add src/domain/scanner/decision-engine.* src/domain/scanner/index.ts
git commit -m "feat: add scanner decision engine"
```

---

### Task 17: Add Scan Service for Multiple Tickers

**Objective:** Orchestrate scans across tickers and ensure one ticker failure does not block others.

**Files:**

- Create: `src/server/scanner/scan-service.ts`
- Create: `src/server/scanner/scan-service.test.ts`

**Step 1: RED — scan-many isolation test**

Test:

```text
Given SPY fixture passes and BAD fixture provider fails,
scanMany returns one Pass and one Insufficient Data.
```

**Step 2: GREEN — implement scan service**

Implement:

```text
scanTicker(symbol, provider, settings)
scanMany(symbols, provider, settings)
```

**Step 3: Verify**

```bash
npm run test -- src/server/scanner/scan-service.test.ts
npm run test
```

**Step 4: Commit**

```bash
git add src/server/scanner
git commit -m "feat: add multi-ticker scan service"
```

---

## Phase 4 — API and UI

### Task 18: Add Scan API Route and Validation

**Objective:** Expose the scanner to the browser through a thin Next.js API route.

**Files:**

- Create: `src/app/api/scan/route.ts`
- Create: `src/server/api/scan-schema.ts`
- Create: `src/server/api/scan-schema.test.ts`
- Create: `src/server/market-data/provider-factory.ts`
- Create: `src/server/market-data/provider-factory.test.ts`

**Step 1: RED/GREEN — request schema**

Test and implement:

```text
non-empty ticker list required
lowercase tickers normalize uppercase
duplicates removed
invalid settings rejected
```

**Step 2: RED/GREEN — provider factory**

Test and implement:

```text
SCANNER_PROVIDER=fake returns fake provider
unknown provider setting fails safely
```

**Step 3: RED/GREEN — route behavior**

Test route or route handler:

```text
POST /api/scan returns results array
one ticker provider failure returns one Insufficient Data result
route has no order/trading dependencies
```

**Step 4: Verify**

```bash
npm run test -- src/server/api src/server/market-data
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/app/api/scan src/server/api src/server/market-data/provider-factory.*
git commit -m "feat: add scanner api route"
```

---

### Task 19: Add Scanner UI Components with Mocked Data First

**Objective:** Build the visible scanner interface independently from live API integration.

**Files:**

- Create: `src/features/scanner/components/disclaimer.tsx`
- Create: `src/features/scanner/components/ticker-input.tsx`
- Create: `src/features/scanner/components/ticker-chip-list.tsx`
- Create: `src/features/scanner/components/result-badge.tsx`
- Create: `src/features/scanner/components/scan-results-table.tsx`
- Create: `src/features/scanner/components/scan-result-detail.tsx`
- Create: `src/features/scanner/components/option-candidate-card.tsx`
- Create: `src/features/scanner/components/data-freshness.tsx`
- Create: `src/features/scanner/scanner-page.tsx`
- Modify: `src/app/page.tsx`

**Step 1: RED — E2E ticker entry tests**

Add/modify `e2e/scanner-flow.spec.ts`:

```text
spy displays as SPY
duplicate symbols dedupe
symbol can be removed
```

Run and verify RED.

**Step 2: GREEN — implement ticker input/list**

Implement minimal client component behavior.

**Step 3: RED/GREEN — summary/detail components**

Add tests for:

```text
primary result visible
notes/reasons visible
timestamps visible
selected candidates visible when available
detail view shows rule evidence
```

Implement with mocked result data first.

**Step 4: RED/GREEN — disclaimer and forbidden text**

Test:

```text
disclaimer visible
Criteria Match label visible
Buy/Sell/Recommended Trade absent
```

**Step 5: Verify**

```bash
npm run test:e2e -- e2e/home.spec.ts e2e/scanner-flow.spec.ts
npm run lint
npm run typecheck
```

**Step 6: Commit**

```bash
git add src/features src/app/page.tsx e2e
git commit -m "feat: add scanner ui shell"
```

---

### Task 20: Connect UI to API Route

**Objective:** Replace mocked UI data with real fake-provider-backed API calls.

**Files:**

- Create: `src/features/scanner/use-scanner.ts`
- Create: `src/features/scanner/scan-client.ts`
- Modify: `src/features/scanner/scanner-page.tsx`
- Modify: `e2e/scanner-flow.spec.ts`

**Step 1: RED — E2E run scan test**

Test:

```text
enter SPY
click Run Scan
loading state appears
result row appears
Criteria Match appears
```

**Step 2: GREEN — implement scan client/hook**

Implement minimal fetch to `POST /api/scan`.

**Step 3: RED/GREEN — partial failure UI**

Test:

```text
one ticker returns Insufficient Data
another ticker still returns result
```

**Step 4: Verify**

```bash
npm run test:e2e -- e2e/scanner-flow.spec.ts
npm run test
npm run build
```

**Step 5: Commit**

```bash
git add src/features/scanner e2e/scanner-flow.spec.ts
git commit -m "feat: connect scanner ui to api"
```

---

### Task 21: Add shadcn/ui Foundation and Polish

**Objective:** Add simple, consistent UI components without overengineering.

**Files:**

- Create: `components.json`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/lib/utils.ts`
- Modify: scanner components as needed

**Step 1: Initialize shadcn/ui**

Run:

```bash
npx shadcn@latest init
npx shadcn@latest add button card badge input
```

**Step 2: Verify imports and styling**

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

**Step 3: Run key E2E tests**

```bash
npm run test:e2e -- e2e/home.spec.ts e2e/scanner-flow.spec.ts
```

**Step 4: Commit**

```bash
git add components.json src/components src/lib/utils.ts src/features
git commit -m "chore: add ui component foundation"
```

---

## Phase 5 — Safety, TastyTrade Boundary, CI, and Final Verification

### Task 22: Add Read-Only Safety Tests

**Objective:** Enforce MVP broker safety at provider and UI layers.

**Files:**

- Create: `src/lib/safety/readonly-boundary.ts`
- Create: `src/lib/safety/readonly-boundary.test.ts`
- Create: `e2e/readonly-safety.spec.ts`

**Step 1: RED/GREEN — forbidden provider methods**

Test and implement helper asserting provider does not expose:

```text
placeOrder
previewOrder
submitOrder
modifyOrder
cancelOrder
routeOrder
getBalances
getPositions
```

**Step 2: RED/GREEN — UI forbidden controls**

Playwright test:

```text
no Buy button
no Sell button
no Submit Order button
no Recommended Trade label
no Route Order label
```

**Step 3: Verify**

```bash
npm run test -- src/lib/safety/readonly-boundary.test.ts
npm run test:e2e -- e2e/readonly-safety.spec.ts
```

**Step 4: Commit**

```bash
git add src/lib/safety e2e/readonly-safety.spec.ts
git commit -m "test: enforce read-only scanner safety"
```

---

### Task 23: Run TastyTrade SDK Capability Spike and Add Read-Only Adapter Shell

**Objective:** Decide whether the MVP should use the TypeScript SDK in-process or a Python SDK sidecar/CLI for read-only TastyTrade market data, then add only the selected adapter shell without blocking fake-provider MVP.

**Files:**

- Create: `docs/spikes/tastytrade-sdk-capability.md`
- Create: `src/server/market-data/tastytrade-provider.ts`
- Create: `src/server/market-data/tastytrade-provider.test.ts`
- Optional if Python sidecar is selected: `src/server/market-data/python-tastytrade-provider.ts`
- Optional if Python sidecar is selected: `scripts/tastytrade_market_data_adapter.py`
- Modify: `src/server/market-data/provider-factory.ts`
- Modify: `.env.example`

**Step 1: Research SDK options**

Evaluate at least:

```text
Python:
- tastytrade
- tastytrade-sdk

TypeScript/JavaScript:
- @tastytrade/api
```

Document in `docs/spikes/tastytrade-sdk-capability.md`:

```text
required endpoint/capability
available in TypeScript SDK?
available in Python SDK?
auth/session handling
quote access
option-chain access
Greeks/delta access
historical candle access or workaround
market-session/freshness support
read-only safety risks
recommended adapter path
```

**Step 2: Choose adapter mode**

Default recommendation unless spike disproves it:

```text
Use TypeScript @tastytrade/api in-process if it supports all required read-only data cleanly.
Use Python sidecar/CLI only if Python SDK materially covers required market-data capabilities better.
```

Rationale:

```text
The app stack remains TypeScript/Next.js. A Python SDK is acceptable behind MarketDataProvider, but it adds process/deployment complexity, serialization boundaries, and another runtime. Keep Python only if it buys meaningful API completeness or reliability.
```

**Step 3: RED — adapter boundary tests**

Test:

```text
adapter implements MarketDataProvider
adapter exposes only getMarketDataForTicker or read-only market-data methods
adapter does not expose order/trading/account methods
provider factory can select tastytrade only when env is configured
if Python sidecar is selected, TypeScript receives normalized internal JSON only
```

**Step 4: GREEN — adapter shell**

Implement placeholder adapter for the selected mode. It should throw a clear “not configured” error unless credentials/provider mode are set.

Do not call live TastyTrade yet unless separately planned.

**Step 5: Verify**

```bash
npm run test -- src/server/market-data/tastytrade-provider.test.ts
npm run test -- src/lib/safety/readonly-boundary.test.ts
npm run typecheck
```

If Python sidecar is selected, also verify:

```bash
python3 -m py_compile scripts/tastytrade_market_data_adapter.py
```

**Step 6: Commit**

```bash
git add docs/spikes src/server/market-data scripts .env.example
git commit -m "feat: add tastytrade read-only adapter shell"
```

---

### Task 24: Add GitHub Actions CI

**Objective:** Run quality gates automatically in GitHub.

**Files:**

- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Step 2: Verify locally**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add quality and e2e workflow"
```

---

### Task 25: Update README with Development and Test Instructions

**Objective:** Document how to run, test, and verify the MVP safely.

**Files:**

- Modify: `README.md`

**Step 1: Add commands**

Document:

```bash
npm install
npm run dev
npm run test
npm run test:coverage
npm run test:e2e
npm run quality
```

**Step 2: Add provider notes**

Document:

```text
Default provider: SCANNER_PROVIDER=fake
Live TastyTrade adapter is read-only and not required for tests.
Never put credentials in git.
```

**Step 3: Add MVP safety note**

Document:

```text
The MVP has no trading/order/account functionality.
```

**Step 4: Verify**

Run:

```bash
npm run quality
```

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add development and safety instructions"
```

---

### Task 26: Final Integration Verification Gate

**Objective:** Prove the MVP implementation is complete, safe, and test-covered.

**Files:**

- No new files expected unless fixing defects.

**Step 1: Run full local gate**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run test:e2e
```

Expected:

```text
All pass.
```

**Step 2: Verify acceptance coverage**

Confirm tests exist for:

```text
AT-001 through AT-020
FR-001 through FR-038 where applicable
TR-001.x through TR-038.x where applicable
```

**Step 3: Verify safety**

Search for forbidden UI language in source, excluding docs/tests if needed:

```bash
grep -RIn "Recommended Trade\|Submit Order\|Route Order" src || true
grep -RIn "Buy\|Sell" src || true
```

Expected:

```text
No forbidden MVP UI/control labels in runtime UI code.
```

**Step 4: Verify no live network required for tests**

Run tests with provider fake:

```bash
SCANNER_PROVIDER=fake npm run test
SCANNER_PROVIDER=fake npm run test:e2e
```

Expected:

```text
All pass without TastyTrade credentials.
```

**Step 5: Review Git status**

Run:

```bash
git status --short
git log --oneline --decorate -10
```

Expected:

```text
Working tree clean after final commit.
```

**Step 6: Final commit if needed**

If fixes were needed:

```bash
git add -A
git commit -m "chore: complete dynamic pmcc scanner mvp verification"
```

---

## Review Gates During Execution

Use this after every implementation task:

### Spec Compliance Review

A fresh reviewer checks:

- Does the task implement exactly the FR/TR requirements listed?
- Are file paths correct?
- Are result labels and thresholds exact?
- Is there any scope creep?
- Are tests present for each behavior?

Proceed only when spec review passes.

### Code Quality Review

A fresh reviewer checks:

- Small, simple modules.
- DRY but not over-abstracted.
- Pure scanner logic isolated from UI/provider/network.
- Clear names.
- No hidden TastyTrade dependency in tests.
- No trading/order functionality.
- Tests are behavior-focused and deterministic.

Proceed only when approved.

---

## Suggested Subagent Execution Batches

### Batch A — Foundation, mostly sequential

1. Task 1 — Verify Repository Baseline
2. Task 2 — Initialize Git
3. Task 3 — Scaffold App
4. Task 4 — Quality Scripts
5. Task 5 — Vitest
6. Task 6 — Playwright

### Batch B — Parallel after contracts stabilize

Run these in parallel if they do not edit the same files:

- Task 9 — Calculations
- Task 10 — Technical Rules and Trend Regimes
- Task 11 — Long LEAPS Selection
- Task 12 — Short Call Selection
- Task 13 — Data Freshness/Error Mapping
- Task 14 — Provider Interface

### Batch C — Sequential integration core

1. Task 15 — Fake Provider and Fixtures
2. Task 16 — Decision Engine
3. Task 17 — Scan Service
4. Task 18 — API Route

### Batch D — Parallel UI/safety polish

- Task 19 — UI Components
- Task 20 — UI/API Connection
- Task 21 — shadcn/ui Polish
- Task 22 — Read-Only Safety
- Task 23 — TastyTrade Adapter Shell

### Batch E — Finalization

1. Task 24 — GitHub Actions CI
2. Task 25 — README
3. Task 26 — Final Verification

---

## Completion Criteria

Implementation is complete when:

- `npm run quality` passes.
- `npm run test:e2e` passes.
- Every primary result has fixture-based tests.
- Every calculation has boundary tests.
- Candidate ranking is deterministic and tested.
- UI shows disclaimer and avoids recommendation/trade language.
- Provider interface is read-only.
- No tests require live TastyTrade access.
- Git working tree is clean.
