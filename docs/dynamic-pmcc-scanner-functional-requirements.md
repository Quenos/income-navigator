# Dynamic PMCC Scanner — Functional Requirements

**Source user requirements:** `docs/dynamic-pmcc-scanner-requirements.md`  
**Purpose:** Convert the trader/user requirements into implementation-ready functional requirements and test requirements for test-driven development.  
**Scope:** MVP web-based, read-only, rule-based Dynamic PMCC scanner.  
**Out of scope:** Trade execution, portfolio management, backtesting, recommendation engine, automated order tickets, fundamental entry gates.

---

## 1. Functional Requirements Overview

The application shall provide a browser-based scanner that answers:

> Does this ticker currently satisfy the user-defined Dynamic PMCC entry criteria?

For each ticker, the scanner shall return exactly one primary criteria-match result:

- `Pass`
- `Watch`
- `Fail`
- `Insufficient Data`
- `Manual Review`

The scanner shall also return supporting notes, warnings, rule results, technical values, long LEAPS candidate details, short-call candidate details, extrinsic calculations, and data timestamps.

The MVP shall be read-only. It shall not place, preview, modify, cancel, or route trades.

---

## 2. Result Model Functional Requirements

### FR-001 — One Primary Result Label

The scanner shall return exactly one primary result label per ticker scan.

Allowed primary labels:

| Label               | Meaning                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `Pass`              | Ticker meets all clean Dynamic PMCC new-entry rules.                |
| `Watch`             | Setup is close, but one or more ideal/watch conditions are missing. |
| `Fail`              | One or more required trading rules clearly fail.                    |
| `Insufficient Data` | Required data is missing, stale, or invalid.                        |
| `Manual Review`     | Required subjective judgment cannot be automated cleanly.           |

The scanner may attach secondary notes or badges, but these must not replace the primary result.

Example secondary notes:

- `RSI Not Ideal`
- `No Pullback`
- `Unclear Trend`
- `Stale Quote`
- `Wide Spread Warning`
- `Manual Chart Review Suggested`

#### Test Requirements

- `TR-001.1` Given a scan result with multiple non-primary notes, the result shall still contain exactly one primary label.
- `TR-001.2` Given an unsupported combined label such as `Watch / Manual Review`, result validation shall reject it or normalize it to one primary label plus notes.
- `TR-001.3` Given a valid result, the primary label shall be one of the five allowed labels only.

---

### FR-002 — Result Priority Order

When multiple result conditions apply, the scanner shall use this priority order:

```text
Insufficient Data > Fail > Manual Review > Watch > Pass
```

This means:

| Condition                                        | Primary Result      |
| ------------------------------------------------ | ------------------- |
| Required data is missing, stale, or invalid      | `Insufficient Data` |
| Required objective trading rule clearly fails    | `Fail`              |
| Required subjective judgment cannot be automated | `Manual Review`     |
| Setup is close but not clean                     | `Watch`             |
| All clean-entry rules pass                       | `Pass`              |

#### Test Requirements

- `TR-002.1` Given missing required option delta and otherwise passing rules, result shall be `Insufficient Data`.
- `TR-002.2` Given a clear weekly trend failure and an imperfect RSI condition, result shall be `Fail`, not `Watch`.
- `TR-002.3` Given unclear trend and otherwise valid objective rules, result shall be `Manual Review`.
- `TR-002.4` Given all clean-pass rules satisfied, result shall be `Pass`.

---

## 3. Ticker List and Scan Flow Requirements

### FR-003 — Ticker Entry

The web UI shall allow the user to enter one or more ticker symbols to scan.

The application shall normalize ticker symbols to uppercase for display and scanning.

The UI shall allow the user to remove tickers from the current scan list before scanning.

#### Test Requirements

- `TR-003.1` Given user input `spy`, the scan list shall display `SPY`.
- `TR-003.2` Given duplicate ticker input, the scan list shall not create duplicate scan rows for the same symbol.
- `TR-003.3` Given a ticker in the scan list, the user shall be able to remove it before running the scan.

---

### FR-004 — Run Scan

The UI shall allow the user to run the scanner from the browser.

During scanning, the UI shall show loading or in-progress state.

A failure for one ticker shall not prevent results from being returned for other tickers.

#### Test Requirements

- `TR-004.1` Given a valid ticker list, clicking Run Scan shall initiate a scan request.
- `TR-004.2` Given a scan in progress, the UI shall show a loading or pending state.
- `TR-004.3` Given one ticker fails due to unavailable data and another succeeds, the successful ticker shall still display its result.

---

## 4. Data Input Requirements

### FR-005 — Required Price and Technical Data

For each ticker, the scanner shall obtain or derive:

- Current stock/ETF price
- Weekly candle data
- Daily candle data
- Weekly 8EMA
- Weekly 21EMA
- Daily 50EMA
- Daily 150SMA
- Daily 200SMA
- Daily RSI(14)
- Daily RSI(14) from 3 trading days ago
- Candle data timestamp/date
- Quote timestamp
- Market open/closed status

If any required field cannot be obtained or calculated, the scanner shall return `Insufficient Data` unless another explicit rule states otherwise.

#### Test Requirements

- `TR-005.1` Given missing weekly candles, scanner result shall be `Insufficient Data`.
- `TR-005.2` Given insufficient daily candles to calculate daily 200SMA, scanner result shall be `Insufficient Data`.
- `TR-005.3` Given missing quote timestamp during market hours, scanner result shall not be `Pass`.

---

### FR-006 — Required Options Data

For each ticker, the scanner shall obtain options-chain data containing calls with:

- Expiration date
- DTE
- Strike price
- Bid
- Ask
- Delta
- Option quote timestamp where available

The scanner shall derive:

- Mid price
- Intrinsic value
- Bid-based extrinsic value
- Mid-based extrinsic value
- Bid-based raw extrinsic percentage
- Bid-based weeklyized extrinsic percentage

#### Test Requirements

- `TR-006.1` Given missing options-chain data, result shall be `Insufficient Data` unless ticker is confirmed non-optionable.
- `TR-006.2` Given a confirmed non-optionable ticker, result shall be `Fail` with reason `No options available for this ticker`.
- `TR-006.3` Given missing option delta, result shall be `Insufficient Data`.
- `TR-006.4` Given missing bid or ask, result shall be `Insufficient Data`.

---

## 5. Technical Setup Functional Requirements

### FR-007 — Weekly Trend Rule

The scanner shall calculate weekly 8EMA and weekly 21EMA.

The weekly trend rule passes when:

```text
Weekly 8EMA > Weekly 21EMA
```

If weekly 8EMA is less than or equal to weekly 21EMA, the ticker shall not receive `Pass`.

For new-entry scanning, weekly 8EMA <= weekly 21EMA shall produce `Fail`, unless required data is missing/stale, in which case `Insufficient Data` takes priority.

#### Test Requirements

- `TR-007.1` Given weekly 8EMA > weekly 21EMA and all other clean-pass rules pass, weekly trend shall pass.
- `TR-007.2` Given weekly 8EMA == weekly 21EMA, result shall be `Fail` if data is otherwise sufficient.
- `TR-007.3` Given weekly 8EMA < weekly 21EMA, result shall be `Fail` if data is otherwise sufficient.

---

### FR-008 — RSI Rule

The scanner shall use daily 14-period RSI.

The RSI condition is ideal when:

```text
Current daily RSI(14) < 50
Current daily RSI(14) > daily RSI(14) from 3 trading days ago
```

RSI is required for a clean `Pass`.

If all required objective rules pass but RSI is not ideal, the scanner shall return `Watch`, not `Fail`, with note `RSI Not Ideal`.

#### Test Requirements

- `TR-008.1` Given current RSI 47 and RSI three trading days ago 42, RSI condition shall pass.
- `TR-008.2` Given current RSI 52 and RSI three trading days ago 45, RSI condition shall not be ideal and shall add `RSI Not Ideal`.
- `TR-008.3` Given current RSI 44 and RSI three trading days ago 48, RSI condition shall not be ideal and shall add `RSI Not Ideal`.
- `TR-008.4` Given all clean-pass rules except RSI pass, result shall be `Watch`, not `Fail`.

---

### FR-009 — Pullback Rule

The scanner shall calculate distance from current price to each of:

- Daily 50EMA
- Daily 150SMA
- Daily 200SMA

Distance percentage shall be calculated as:

```text
Distance % = abs(current price - moving average) / current price
```

The pullback condition passes when current price is within the configured pullback threshold of at least one of these moving averages.

Default threshold:

```text
5%
```

Pullback proximity is required for clean `Pass`.

If all other clean-pass rules pass but price is not near one of the configured moving averages, the scanner shall return `Watch` with note `No Pullback`.

#### Test Requirements

- `TR-009.1` Given price 100 and daily 50EMA 96, distance is 4%; pullback condition shall pass under 5% threshold.
- `TR-009.2` Given price 100 and nearest moving average 94, distance is 6%; pullback condition shall fail under 5% threshold.
- `TR-009.3` Given all clean-pass rules except pullback pass, result shall be `Watch` with note `No Pullback`.
- `TR-009.4` Given configured threshold 3% and price 100 / moving average 96, pullback condition shall fail.

---

## 6. Trend Regime Functional Requirements

### FR-010 — Strong Uptrend Regime

The scanner shall classify a ticker as `Strong Uptrend` when all of the following are true:

- Weekly 8EMA > weekly 21EMA.
- Current price is not clearly below daily 200SMA.
- The ticker is not classified as `Neutral / Sideways`, `Downtrend`, or `Unclear` by the applicable rules.

Only `Strong Uptrend` may produce a clean `Pass` for MVP new-entry scanning.

#### Test Requirements

- `TR-010.1` Given weekly 8EMA > weekly 21EMA and price not below daily 200SMA, with no downtrend/unclear flags, regime shall be `Strong Uptrend`.
- `TR-010.2` Given regime is not `Strong Uptrend`, result shall not be `Pass`.

---

### FR-011 — Neutral / Sideways Regime

The scanner shall classify a ticker as `Neutral / Sideways` when it is not a clear strong uptrend or clear downtrend and the available indicators show mixed/non-directional behavior.

For MVP new-entry scanning, `Neutral / Sideways` shall not produce `Pass`.

If the rest of the setup is valid, `Neutral / Sideways` shall produce `Watch`.

#### Test Requirements

- `TR-011.1` Given regime `Neutral / Sideways` and otherwise valid LEAPS/short-call/extrinsic setup, result shall be `Watch`.
- `TR-011.2` Given regime `Neutral / Sideways`, the scanner shall select/display the neutral short-call style where possible: around 50 delta ATM call, 7–30 DTE.

---

### FR-012 — Downtrend Regime

The scanner shall classify a ticker as `Downtrend` when:

- Weekly 8EMA < weekly 21EMA, or
- Other available rules clearly indicate downtrend.

For MVP new-entry scanning, clear `Downtrend` shall produce `Fail` if data is otherwise sufficient.

Downtrend short-call rules may be displayed as future/manual context, but shall not allow `Pass` for new entry.

#### Test Requirements

- `TR-012.1` Given weekly 8EMA < weekly 21EMA and data is sufficient, result shall be `Fail`.
- `TR-012.2` Given downtrend and valid defensive ITM short call, result shall still not be `Pass`.

---

### FR-013 — Unclear Regime

If the scanner has enough data but cannot clearly classify trend regime, the result shall be `Manual Review`.

The scanner shall not force a default short-call style when regime is unclear.

#### Test Requirements

- `TR-013.1` Given sufficient data but conflicting trend signals that cannot be classified, result shall be `Manual Review`.
- `TR-013.2` Given unclear regime, scanner shall not return a regime-dependent short-call candidate as the selected candidate.

---

## 7. Long LEAPS Candidate Functional Requirements

### FR-014 — Long LEAPS Filter

The scanner shall identify long call candidates satisfying:

```text
DTE >= 180
Delta between 0.70 and 0.90 inclusive
```

If no such long call exists and data is sufficient, result shall be `Fail`.

#### Test Requirements

- `TR-014.1` Given a call with DTE 180 and delta 0.70, it shall qualify.
- `TR-014.2` Given a call with DTE 179, it shall not qualify.
- `TR-014.3` Given a call with delta 0.69, it shall not qualify.
- `TR-014.4` Given no qualifying long call and data sufficient, result shall be `Fail`.

---

### FR-015 — Long LEAPS Ranking

When multiple long calls qualify, the scanner shall rank them using this order:

1. Prefer expiration closest to 365 DTE.
2. If the trader manually marks the underlying as near the lower end of its range, prefer 12–24 months.
3. Prefer delta closest to 0.80 after the DTE preference above.
4. Display bid/ask spread, volume, open interest, and extrinsic value paid as context/warnings only.

The highest-ranked long call shall be returned as the best matching long LEAPS candidate.

#### Test Requirements

- `TR-015.1` Given qualifying calls at 210 DTE and 370 DTE, scanner shall prefer 370 DTE when no lower-end-of-range flag is set.
- `TR-015.2` Given lower-end-of-range flag and qualifying 620 DTE candidate, scanner shall prefer 12–24 month candidate over one merely closest to 365 DTE.
- `TR-015.3` Given equal DTE preference, scanner shall choose delta closest to 0.80.

---

## 8. Short Call Candidate Functional Requirements

### FR-016 — Moneyness Definitions

For calls, the scanner shall use these definitions:

```text
OTM call = strike price above current stock/ETF price
ATM call = strike price closest to current stock/ETF price
ITM call = strike price below current stock/ETF price
```

#### Test Requirements

- `TR-016.1` Given stock price 100, call strike 105 shall be OTM.
- `TR-016.2` Given stock price 100, nearest strike 100 shall be ATM.
- `TR-016.3` Given stock price 100, call strike 95 shall be ITM.

---

### FR-017 — Strong Uptrend Short Call Filter

For `Strong Uptrend`, the scanner shall identify short call candidates satisfying:

```text
30–40 delta
OTM call
7–30 DTE
```

#### Test Requirements

- `TR-017.1` Given a 35-delta OTM call with 14 DTE, it shall qualify for Strong Uptrend.
- `TR-017.2` Given a 45-delta OTM call with 14 DTE, it shall not qualify for Strong Uptrend.
- `TR-017.3` Given a 35-delta ITM call with 14 DTE, it shall not qualify for Strong Uptrend.
- `TR-017.4` Given a 35-delta OTM call with 31 DTE, it shall not qualify.

---

### FR-018 — Neutral / Sideways Short Call Filter

For `Neutral / Sideways`, the scanner shall identify short call candidates satisfying:

```text
Around 50 delta
ATM call
7–30 DTE
```

Unless later configured more precisely, around 50 delta shall mean the candidate closest to 0.50 delta among ATM calls in the DTE range.

#### Test Requirements

- `TR-018.1` Given neutral regime and multiple ATM calls, scanner shall choose the candidate closest to 0.50 delta.
- `TR-018.2` Given neutral regime and otherwise valid setup, result shall be `Watch`, not `Pass`.

---

### FR-019 — Downtrend Short Call Filter

For `Downtrend`, the scanner may identify defensive/manual-context short call candidates satisfying:

```text
60–70 delta
ITM call
7–30 DTE
```

For MVP new-entry scanning, such candidates shall not cause `Pass`.

#### Test Requirements

- `TR-019.1` Given downtrend and a 65-delta ITM call with 14 DTE, scanner may display it as context.
- `TR-019.2` Given downtrend and otherwise valid defensive short call, result shall remain `Fail` for new-entry scan.

---

### FR-020 — Short Call Ranking

When multiple short calls qualify for the applicable regime, the scanner shall rank them using this order:

1. Must match regime delta range.
2. Must match regime moneyness.
3. Must have DTE between 7 and 30 inclusive.
4. Prefer contracts meeting bid-based weeklyized extrinsic target.
5. Prefer delta closest to regime target or midpoint.
6. Prefer best bid-based weeklyized extrinsic after the above criteria are met.
7. Display spread, volume, and open interest as warnings/context only.

For Strong Uptrend, regime midpoint is 0.35 delta.  
For Neutral / Sideways, target is 0.50 delta.  
For Downtrend, regime midpoint is 0.65 delta.

#### Test Requirements

- `TR-020.1` Given two Strong Uptrend candidates both meeting extrinsic target, scanner shall prefer delta closest to 0.35.
- `TR-020.2` Given two candidates with equal delta distance, scanner shall prefer better bid-based weeklyized extrinsic.
- `TR-020.3` Given one candidate meets extrinsic target and one does not, scanner shall prefer the one meeting target if both otherwise qualify.

---

## 9. Calculation Functional Requirements

### FR-021 — Intrinsic Value

For each call option, intrinsic value shall be calculated as:

```text
Intrinsic value = max(0, stock price - strike price)
```

#### Test Requirements

- `TR-021.1` Given stock price 100 and strike 90, intrinsic value shall be 10.
- `TR-021.2` Given stock price 100 and strike 105, intrinsic value shall be 0.

---

### FR-022 — Mid Price

For each option with valid bid and ask, mid price shall be calculated as:

```text
Mid price = (bid + ask) / 2
```

#### Test Requirements

- `TR-022.1` Given bid 1.00 and ask 1.20, mid price shall be 1.10.
- `TR-022.2` Given missing bid or ask, scanner shall not calculate decision values from mid and shall return `Insufficient Data` if that quote is required.

---

### FR-023 — Short-Call Decision Extrinsic

For short-call pass/watch/fail decisions, the scanner shall use bid price.

```text
Short-call bid extrinsic = short-call bid - intrinsic value
```

The scanner shall not use last traded price for pass/watch/fail decisions.

#### Test Requirements

- `TR-023.1` Given OTM short call with bid 0.80 and intrinsic 0, bid extrinsic shall be 0.80.
- `TR-023.2` Given ITM short call with bid 6.00 and intrinsic 5.00, bid extrinsic shall be 1.00.
- `TR-023.3` Given last price meets target but bid does not, candidate shall not pass the income target based on last price.

---

### FR-024 — Weeklyized Extrinsic Percentage

The scanner shall calculate bid-based raw and weeklyized extrinsic percentages:

```text
Bid raw extrinsic % = short-call bid extrinsic / stock price
Bid weeklyized extrinsic % = (short-call bid extrinsic / stock price) * (7 / DTE)
```

Result impact:

| Bid Weeklyized Extrinsic % | Result Impact      |
| -------------------------: | ------------------ |
|                 `>= 0.75%` | Pass condition met |
|             `0.60%–0.749%` | Watch              |
|                  `< 0.60%` | Fail               |

#### Test Requirements

- `TR-024.1` Given stock price 100, extrinsic 0.80, DTE 7, weeklyized extrinsic shall be 0.80% and meet Pass condition.
- `TR-024.2` Given stock price 100, extrinsic 0.65, DTE 7, weeklyized extrinsic shall be 0.65% and produce Watch impact.
- `TR-024.3` Given stock price 100, extrinsic 0.50, DTE 7, weeklyized extrinsic shall be 0.50% and produce Fail impact.
- `TR-024.4` Given stock price 500, extrinsic 10.00, DTE 30, weeklyized extrinsic shall be approximately 0.4667% and produce Fail impact.

---

## 10. Scanner Decision Engine Requirements

### FR-025 — Clean Pass Decision

The scanner shall return `Pass` only when all clean-pass conditions are true:

1. Required data is usable and fresh.
2. Ticker has usable options-chain data.
3. Ticker is not confirmed non-optionable.
4. Trend regime is `Strong Uptrend`.
5. Weekly 8EMA > weekly 21EMA.
6. Daily RSI(14) < 50 and rising vs 3 trading days ago.
7. Price is within pullback threshold of daily 50EMA, daily 150SMA, or daily 200SMA.
8. Qualifying long LEAPS exists.
9. Qualifying Strong Uptrend short call exists.
10. Bid-based weeklyized short-call extrinsic >= 0.75%.

#### Test Requirements

- `TR-025.1` Given a fixture satisfying all clean-pass conditions, scanner result shall be `Pass`.
- `TR-025.2` Given a clean-pass fixture with one required condition removed, result shall no longer be `Pass`.

---

### FR-026 — Watch Decision

The scanner shall return `Watch` when data is sufficient and no required objective rule fails, but one or more watch conditions are present.

Watch conditions include:

- RSI not ideal while other clean-entry rules pass.
- Pullback proximity missing while other clean-entry rules pass.
- Neutral / Sideways regime with otherwise valid setup.
- Bid-based weeklyized extrinsic between 0.60% and 0.749%.
- Long LEAPS barely meets acceptable range but still qualifies.

#### Test Requirements

- `TR-026.1` Given all clean-pass conditions except RSI, result shall be `Watch`.
- `TR-026.2` Given all clean-pass conditions except pullback, result shall be `Watch`.
- `TR-026.3` Given otherwise valid setup and extrinsic 0.60%–0.749%, result shall be `Watch`.
- `TR-026.4` Given neutral/sideways regime with otherwise valid setup, result shall be `Watch`.

---

### FR-027 — Fail Decision

The scanner shall return `Fail` when data is sufficient and a required objective trading rule clearly fails.

Fail conditions include:

- Confirmed non-optionable ticker.
- No qualifying long LEAPS candidate.
- No qualifying short-call candidate for applicable regime.
- Weekly 8EMA <= weekly 21EMA.
- Clear downtrend for new-entry scan.
- Bid-based weeklyized short-call extrinsic below 0.60%.

#### Test Requirements

- `TR-027.1` Given confirmed non-optionable ticker, result shall be `Fail`.
- `TR-027.2` Given no qualifying long LEAPS, result shall be `Fail`.
- `TR-027.3` Given no qualifying short call, result shall be `Fail`.
- `TR-027.4` Given weekly 8EMA <= weekly 21EMA, result shall be `Fail`.
- `TR-027.5` Given extrinsic below 0.60%, result shall be `Fail`.

---

### FR-028 — Insufficient Data Decision

The scanner shall return `Insufficient Data` when required data is missing, stale, invalid, or incomplete.

Insufficient Data conditions include:

- Invalid or unrecognized ticker.
- Missing required candle data.
- Missing required quote data.
- Stale required quote data during market hours.
- Missing option-chain data from provider.
- Missing bid/ask for required option candidates.
- Missing delta/Greeks required for filtering.
- Provider unavailable, rate-limited, timed out, or returned malformed data.

#### Test Requirements

- `TR-028.1` Given missing candle data, result shall be `Insufficient Data`.
- `TR-028.2` Given missing option delta, result shall be `Insufficient Data`.
- `TR-028.3` Given stale required quote data during market hours, result shall be `Insufficient Data`.
- `TR-028.4` Given provider timeout for one ticker, that ticker shall be `Insufficient Data` and other tickers shall still complete.

---

### FR-029 — Manual Review Decision

The scanner shall return `Manual Review` when data is sufficient but an important subjective condition cannot be automated.

Manual Review conditions include:

- Trend regime cannot be clearly classified.
- Setup depends on support reversal that cannot be derived from available data.
- Setup depends on lower-end-of-range condition and the user has not manually marked it.
- Setup depends on shortening DTE near support and support is unclear.

#### Test Requirements

- `TR-029.1` Given conflicting trend inputs with sufficient data, result shall be `Manual Review`.
- `TR-029.2` Given lower-end-of-range candidate ranking is requested but no manual lower-end flag is set, scanner shall not assume lower-end-of-range.
- `TR-029.3` Given support reversal cannot be determined, scanner shall display context and return or note `Manual Review` according to priority rules.

---

## 11. Output Requirements

### FR-030 — Summary Result Output

For each ticker, the scanner shall display:

- Ticker
- Asset type: stock, ETF, preferred ETF/index ETF, or unknown
- Current price
- Primary result label
- Secondary notes/badges
- Trend regime
- Technical checklist summary
- Best matching long LEAPS candidate, if available
- Best matching short call candidate, if available
- Bid-based raw extrinsic percentage
- Bid-based weeklyized extrinsic percentage
- Mid-based extrinsic values for context
- Notes explaining passed/failed/watch/manual-review criteria
- Scan time
- Quote time
- Option-chain quote time if available
- Candle data timestamp/date
- Market open/closed status

#### Test Requirements

- `TR-030.1` Given a completed ticker scan, summary output shall include primary result and explanation notes.
- `TR-030.2` Given candidate options are available, summary output shall include selected long and short candidates.
- `TR-030.3` Given timestamps are available, summary output shall display scan and data timestamps.

---

### FR-031 — Detail View Output

The UI shall provide a ticker detail view with:

- Overall result and notes
- Technical values and rule outcomes
- Long LEAPS candidate details
- Short-call candidate details
- Intrinsic/extrinsic calculations
- Data freshness details
- Warnings/context values
- Static management-rule reference for future tracking
- Disclaimer text

Each checklist item shall show enough evidence for the user to understand the result.

Example:

```text
Weekly Trend: Pass
Weekly 8EMA: 512.40
Weekly 21EMA: 498.10
Rule: Weekly 8EMA > Weekly 21EMA
```

#### Test Requirements

- `TR-031.1` Given a result detail view, each rule shall show pass/watch/fail/manual/insufficient-data state or equivalent evidence.
- `TR-031.2` Given selected option candidates, detail view shall display strike, expiration, DTE, delta, bid, ask, mid, intrinsic, and extrinsic values.
- `TR-031.3` Detail view shall include disclaimer text.

---

## 12. Settings Requirements

### FR-032 — Configurable Scanner Settings

The application shall support configurable scanner settings with documented defaults:

| Setting                            |                    Default |
| ---------------------------------- | -------------------------: |
| Long call minimum DTE              |                        180 |
| Long call preferred DTE            |                        365 |
| Long call delta minimum            |                       0.70 |
| Long call delta maximum            |                       0.90 |
| Long call ideal delta              |                       0.80 |
| Short call minimum DTE             |                          7 |
| Short call maximum DTE             |                         30 |
| Strong uptrend short delta min/max |                0.30 / 0.40 |
| Neutral target delta               |                       0.50 |
| Downtrend short delta min/max      |                0.60 / 0.70 |
| Extrinsic Pass threshold           | 0.75% bid-based weeklyized |
| Extrinsic Watch lower bound        | 0.60% bid-based weeklyized |
| Pullback proximity threshold       |                         5% |
| RSI period                         |                   14 daily |
| RSI rising lookback                |             3 trading days |
| Unclear trend handling             |              Manual Review |

#### Test Requirements

- `TR-032.1` Given default settings, scanner shall use the values in the table.
- `TR-032.2` Given changed pullback threshold, pullback classification shall use the changed threshold.
- `TR-032.3` Given invalid setting range where min > max, settings validation shall reject it.
- `TR-032.4` Given changed extrinsic thresholds, Watch/Pass/Fail extrinsic classification shall use configured thresholds.

---

## 13. Data Freshness and Error Handling Requirements

### FR-033 — Data Freshness

Required stale or missing data shall block `Pass`.

Every scan result shall show:

- Scan time
- Stock/ETF quote time
- Options-chain quote time if available
- Candle data date/time
- Market open/closed status

After-hours and weekend scans are allowed if clearly labeled as using last available market data.

During market hours, stale required quote data shall return `Insufficient Data` instead of `Pass`.

#### Test Requirements

- `TR-033.1` Given stale required quote data during market hours, result shall be `Insufficient Data`.
- `TR-033.2` Given after-hours scan using last available data, UI shall label data as last available market data.
- `TR-033.3` Given fresh data and all clean-pass rules, data freshness shall not block `Pass`.

---

### FR-034 — User-Facing Error Reasons

The scanner shall return user-facing reasons for non-Pass results.

Required mappings:

| Situation                         | Primary Result      | Reason Shown                         |
| --------------------------------- | ------------------- | ------------------------------------ |
| Invalid ticker                    | `Insufficient Data` | Ticker not found                     |
| Confirmed non-optionable ticker   | `Fail`              | No options available for this ticker |
| Provider options data unavailable | `Insufficient Data` | Options-chain data unavailable       |
| Missing option delta              | `Insufficient Data` | Option delta is required             |
| Missing bid/ask                   | `Insufficient Data` | Option quote is incomplete           |
| Data provider unavailable         | `Insufficient Data` | Market data provider unavailable     |
| Stale quote                       | `Insufficient Data` | Required quote data is stale         |
| Trend unclear                     | `Manual Review`     | Trend regime unclear                 |

#### Test Requirements

- `TR-034.1` Given invalid ticker, result shall include reason `Ticker not found`.
- `TR-034.2` Given missing bid/ask, result shall include reason `Option quote is incomplete`.
- `TR-034.3` Given trend unclear, result shall include reason `Trend regime unclear`.

---

## 14. Read-Only Broker Safety Requirements

### FR-035 — Read-Only MVP Boundary

The MVP shall use TastyTrade only for read-only market data required by the scanner.

The MVP shall not:

- Place orders
- Preview orders
- Modify orders
- Cancel orders
- Route orders
- Display live order tickets
- Provide order-entry buttons
- Manage positions
- Display account balances unless explicitly requested later

#### Test Requirements

- `TR-035.1` UI shall not render order-entry, buy, sell, route, submit, cancel, or position-management controls.
- `TR-035.2` Scanner service tests shall verify scanner flow does not call order-placement, order-preview, order-modification, or order-cancellation provider methods.
- `TR-035.3` If any trading provider method is unavailable or disabled, scanner market-data functionality shall still be testable independently.

---

### FR-036 — Recommendation Boundary and Disclaimer

The UI shall display this disclaimer or substantially equivalent language:

```text
This tool performs rule-based screening only. It is not financial advice, investment advice, or a trade recommendation. Options involve risk and may result in substantial loss. The user is responsible for verifying all data, suitability, and trade decisions.
```

The UI shall use labels such as:

```text
Criteria Match: Pass / Watch / Fail
```

The UI shall avoid recommendation language such as:

- Recommended Trade
- Buy
- Sell
- Best Trade

#### Test Requirements

- `TR-036.1` Summary or detail scan views shall display disclaimer text.
- `TR-036.2` UI text shall not include forbidden recommendation labels in MVP scan actions/results.
- `TR-036.3` Result labels shall be presented as criteria matches, not trade instructions.

---

## 15. Test Fixture Requirements

### FR-037 — Required Deterministic Fixtures

The project shall include deterministic fixtures for scanner tests. Fixtures shall not require live provider access.

Required fixtures:

1. `clear_pass_strong_uptrend`
2. `watch_rsi_not_ideal`
3. `watch_no_pullback`
4. `watch_neutral_sideways`
5. `watch_extrinsic_between_060_and_0749`
6. `fail_weekly_trend`
7. `fail_downtrend`
8. `fail_no_qualifying_leaps`
9. `fail_no_qualifying_short_call`
10. `fail_extrinsic_below_060`
11. `fail_confirmed_non_optionable`
12. `insufficient_missing_greeks`
13. `insufficient_missing_bid_ask`
14. `insufficient_stale_quote`
15. `insufficient_provider_unavailable`
16. `manual_review_unclear_trend`
17. `long_candidate_ranking_closest_365`
18. `long_candidate_ranking_lower_end_range`
19. `short_candidate_ranking_delta_midpoint`
20. `after_hours_last_available_data_labeled`

#### Test Requirements

- `TR-037.1` Each fixture shall produce the expected primary result.
- `TR-037.2` Each fixture shall include expected notes/reasons where applicable.
- `TR-037.3` Fixture-based tests shall run without network access.
- `TR-037.4` Fixture-based tests shall be stable and deterministic.

---

## 16. TDD Process Requirements

### FR-038 — Test-First Implementation

All production scanner logic shall be implemented using test-driven development:

1. Write a failing test for one behavior.
2. Run the test and verify it fails for the expected reason.
3. Implement the smallest production change to pass the test.
4. Run the test and verify it passes.
5. Run the related test group.
6. Refactor only after tests pass.

#### Test Requirements

- `TR-038.1` Each scanner rule shall have at least one dedicated unit test.
- `TR-038.2` Each result status shall have fixture-based acceptance tests.
- `TR-038.3` Candidate ranking shall have deterministic tests.
- `TR-038.4` Calculation functions shall have boundary tests.
- `TR-038.5` Provider integration shall be tested through fake/mock provider adapters, not live network calls.

---

## 17. Functional Acceptance Test Matrix

| ID       | Scenario                                    | Expected Result                   |
| -------- | ------------------------------------------- | --------------------------------- |
| `AT-001` | All clean-pass conditions true              | `Pass`                            |
| `AT-002` | Missing option delta                        | `Insufficient Data`               |
| `AT-003` | Weekly 8EMA <= weekly 21EMA                 | `Fail`                            |
| `AT-004` | Clear downtrend                             | `Fail`                            |
| `AT-005` | Neutral/Sideways with otherwise valid setup | `Watch`                           |
| `AT-006` | RSI not ideal but otherwise valid           | `Watch`                           |
| `AT-007` | No pullback but otherwise valid             | `Watch`                           |
| `AT-008` | Extrinsic 0.60%–0.749%                      | `Watch`                           |
| `AT-009` | Extrinsic < 0.60%                           | `Fail`                            |
| `AT-010` | No qualifying long LEAPS                    | `Fail`                            |
| `AT-011` | No qualifying short call                    | `Fail`                            |
| `AT-012` | Confirmed non-optionable ticker             | `Fail`                            |
| `AT-013` | Invalid ticker                              | `Insufficient Data`               |
| `AT-014` | Stale required quote during market hours    | `Insufficient Data`               |
| `AT-015` | Trend unclear with enough data              | `Manual Review`                   |
| `AT-016` | After-hours scan with last available data   | Result allowed, clearly labeled   |
| `AT-017` | UI summary output for completed scan        | Required fields displayed         |
| `AT-018` | Detail view for completed scan              | Rule evidence displayed           |
| `AT-019` | Read-only UI safety                         | No order-entry controls displayed |
| `AT-020` | Broker provider adapter safety              | No trading/order methods called   |

---

## 18. Traceability Summary

| User Requirement Area              | Functional Requirement IDs             |
| ---------------------------------- | -------------------------------------- |
| Pass / Watch / Fail logic          | FR-001, FR-002, FR-025–FR-029          |
| Ticker list and web app flow       | FR-003, FR-004, FR-030, FR-031         |
| Technical setup                    | FR-007, FR-008, FR-009                 |
| Trend regime                       | FR-010, FR-011, FR-012, FR-013         |
| Long LEAPS                         | FR-014, FR-015                         |
| Short calls                        | FR-016, FR-017, FR-018, FR-019, FR-020 |
| Calculations                       | FR-021, FR-022, FR-023, FR-024         |
| Settings                           | FR-032                                 |
| Data freshness/errors              | FR-005, FR-006, FR-033, FR-034         |
| Read-only TastyTrade boundary      | FR-035                                 |
| Disclaimer/recommendation boundary | FR-036                                 |
| Test-based development             | FR-037, FR-038, AT-001–AT-020          |

---

## 19. Done Criteria for Functional Requirements

The functional requirements are ready for implementation planning when:

- Every scanner decision maps to exactly one primary result.
- Every result has at least one fixture-based acceptance test.
- Every calculation has boundary tests.
- Every candidate-selection rule has deterministic ranking tests.
- UI requirements include summary, detail, loading, error, timestamp, and disclaimer behavior.
- Provider access can be tested without live network calls.
- Read-only broker safety has both UI and provider-adapter tests.
