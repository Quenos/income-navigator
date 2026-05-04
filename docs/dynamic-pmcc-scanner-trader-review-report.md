# Dynamic PMCC Scanner — Final Trader Review Report

**Purpose of this report:** Help the trader make the last trading-rule decisions needed before the Dynamic PMCC scanner can be built reliably.

**Reviewed document:** `dynamic-pmcc-scanner-requirements.md`

**Review status:** The requirements are much improved and close to build-ready, but a few trading decisions still need to be made so the scanner does not have to guess.

---

## Executive Summary

The updated requirements document is now strong as a strategy description. It clearly explains that the scanner is for a **Dynamic PMCC / Poor Man's Covered Call** setup focused on:

- Income generation
- Collecting extrinsic value from covered calls
- Reducing cost basis over time
- Avoiding unnecessary trade logic outside the defined setup
- Keeping the MVP read-only, with no trade placement

The biggest remaining issue is not technology. The biggest remaining issue is that a few rules still need to be written in a way the scanner can apply consistently.

In plain terms:

> The scanner needs to know exactly when to say **Pass**, **Watch**, **Fail**, **Insufficient Data**, or **Manual Review**.

The trader does not need to define technical architecture. That is the developer's job. But the trader should verify the trading assumptions below so the developer does not accidentally encode the wrong strategy behavior.

---

## Overall Readiness

### What Is Now Good Enough

The requirements now clearly define:

- The scanner's purpose.
- Pass / Watch / Fail / Insufficient Data / Manual Review as possible results.
- Weeklyized extrinsic value as the target measurement.
- Long LEAPS criteria.
- Short-call criteria by trend regime.
- Candidate-selection priorities.
- Fundamentals as optional context only.
- Management rules as future/static reference for MVP.
- Examples of scanner outcomes.

### What Still Needs Clarification

The remaining issues are mostly about final trading-rule precision:

1. How should result labels be prioritized when more than one condition applies?
2. How close to the extrinsic target counts as Watch instead of Fail?
3. Can neutral/sideways setups ever Pass, or are they always Watch?
4. Can downtrend setups ever Pass for a new entry, or are they always Fail / Manual Review?
5. What exactly does “RSI rising” mean?
6. Are 50EMA / 150MA / 200MA daily chart levels?
7. Does pullback proximity affect Pass, or is it only Watch/context?
8. Should short-call extrinsic be calculated using bid, mid, or another price?
9. How should the scanner handle stale or missing market data?
10. What user-facing disclaimer should appear?

---

# 1. Result Labels Need One Clear Priority Order

The requirements now include these result labels:

- **Pass**
- **Watch**
- **Fail**
- **Insufficient Data**
- **Manual Review**

This is good. But the document also mentions combined labels such as:

```text
Watch / Manual Review
```

That can become confusing in the app.

## Recommendation

Use **one main result label** plus optional notes or badges.

Example:

```text
Main result: Watch
Notes: Manual review required because trend regime is unclear.
```

Instead of:

```text
Watch / Manual Review / Unclear Trend
```

## Suggested Result Priority

If more than one condition applies, use this priority order:

```text
Insufficient Data > Fail > Manual Review > Watch > Pass
```

### What This Means

| Situation                                                  | Result            |
| ---------------------------------------------------------- | ----------------- |
| Required data is missing                                   | Insufficient Data |
| A required trading rule clearly fails                      | Fail              |
| The scanner cannot judge an important subjective condition | Manual Review     |
| The setup is close but not clean                           | Watch             |
| All required rules are met                                 | Pass              |

## Example

If a ticker has a valid LEAPS and short-call candidate, but option delta is missing from the data provider:

```text
Result: Insufficient Data
Reason: Option delta is required to evaluate long and short call criteria.
```

It should not be marked Fail, because the trade setup did not fail — the scanner simply lacks required data.

## Trader Verification Needed

Please confirm whether this priority order matches your intent:

```text
Insufficient Data > Fail > Manual Review > Watch > Pass
```

---

# 2. Define Watch vs Fail for Extrinsic Value

The requirements now correctly use **weeklyized extrinsic value**.

Current Pass rule:

```text
Weeklyized extrinsic % >= 0.75% of stock price
```

That is clear for Pass.

What is not yet clear is what happens when the short call is below 0.75%.

## Question

At what point is the result still **Watch**, and at what point is it clearly **Fail**?

## Suggested Assumption

Use this default unless the trader disagrees:

| Weeklyized Extrinsic % | Result Impact                  |
| ---------------------: | ------------------------------ |
|             `>= 0.75%` | Pass condition met             |
|         `0.60%–0.749%` | Watch — close but below target |
|              `< 0.60%` | Fail — materially below target |

## Example

Assume SPY is trading at `$500`.

| Short Call Extrinsic | DTE | Weeklyized % | Result Impact                          |
| -------------------: | --: | -----------: | -------------------------------------- |
|              `$4.00` |   7 |      `0.80%` | Pass condition met                     |
|              `$3.25` |   7 |      `0.65%` | Watch                                  |
|              `$2.00` |   7 |      `0.40%` | Fail                                   |
|             `$10.00` |  30 |      `0.47%` | Fail, even though raw premium is 2.00% |

The last example matters because a 30-DTE option may look attractive in raw dollars but may fail the weeklyized income target.

## Trader Verification Needed

Please confirm or adjust these ranges:

```text
Pass: >= 0.75% weeklyized
Watch: 0.60%–0.749% weeklyized
Fail: < 0.60% weeklyized
```

---

# 3. Clarify Whether Neutral / Sideways Can Ever Pass

The requirements define a neutral/sideways short-call style:

```text
Around 50 delta ATM call, 7–30 DTE
```

But they also say neutral/sideways should usually be **Watch** unless the rest of the setup is very clean.

That creates an important question:

> Can a neutral/sideways setup ever receive Pass for a new DPMCC entry?

## Suggested Assumption

For MVP, use this conservative rule:

| Trend Regime       | New Entry Result           |
| ------------------ | -------------------------- |
| Strong Uptrend     | Can Pass                   |
| Neutral / Sideways | Watch only                 |
| Downtrend          | Fail or Manual Review only |
| Unclear            | Manual Review              |

## Why This Is Recommended

The core entry setup requires:

```text
Weekly 8EMA > Weekly 21EMA
```

That implies the scanner should favor up-trending names for new entries. Neutral/sideways may still be interesting, but probably should not be a clean Pass unless the trader explicitly wants that.

## Example

```text
Ticker: QQQ
Weekly 8EMA > 21EMA: Yes
Valid LEAPS: Yes
Valid 50-delta ATM short call: Yes
Trend: Neutral / Sideways
Extrinsic target: Met
Result: Watch
Reason: Neutral/sideways regime is not a clean new-entry Pass in MVP.
```

## Trader Verification Needed

Please choose one:

1. Neutral/sideways can never Pass in MVP; it should be Watch.
2. Neutral/sideways can Pass if all other criteria are excellent.
3. Neutral/sideways should be Manual Review.

Recommended choice: **Option 1**.

---

# 4. Clarify Downtrend Behavior

The requirements include downtrend short-call rules:

```text
60–70 delta ITM call, 7–30 DTE
```

But they also say a clear downtrend is generally not appropriate for a new DPMCC entry.

This should be made explicit.

## Suggested Assumption

For MVP:

```text
A clear downtrend cannot produce Pass for a new DPMCC entry.
```

The scanner may still display the defensive ITM short-call candidate as context, but the main result should not be Pass.

## Example

```text
Ticker: XYZ
Weekly 8EMA < Weekly 21EMA
Valid LEAPS exists
60-delta ITM short call exists
Extrinsic target is met
Result: Fail or Manual Review
Reason: Clear downtrend is not a valid new DPMCC entry setup.
```

## Trader Verification Needed

Please choose one:

1. Clear downtrend always means Fail for new entry.
2. Clear downtrend means Manual Review, because defensive setup may still be possible.
3. Clear downtrend can Pass if the short-call hedge is attractive.

Recommended choice: **Option 1 for MVP**.

---

# 5. Define RSI More Clearly

The document says:

```text
RSI under 50 but rising
```

That is a useful trading idea, but the scanner needs exact interpretation.

## Suggested Assumption

Use:

```text
RSI period: 14
RSI timeframe: daily
RSI rising: current RSI is greater than RSI from 3 trading days ago
```

## Example

| Current RSI | RSI 3 Trading Days Ago | Meaning                      |
| ----------: | ---------------------: | ---------------------------- |
|          47 |                     42 | RSI under 50 and rising      |
|          52 |                     45 | RSI rising, but not under 50 |
|          44 |                     48 | RSI under 50, but falling    |

## Suggested Scanner Behavior

RSI should be treated as an **ideal/watch condition**, not a hard Pass requirement, unless the trader wants it to be mandatory.

Example:

```text
Weekly trend is valid.
LEAPS and short call are valid.
Extrinsic target is met.
RSI is not ideal.
Result: Watch, not Fail.
```

## Trader Verification Needed

Please confirm:

1. Is RSI 14 correct?
2. Should RSI be daily or weekly?
3. Is “rising over the last 3 trading days” acceptable?
4. Should imperfect RSI downgrade Pass to Watch, or only appear as context?

Recommended defaults:

```text
RSI 14, daily, rising compared with 3 trading days ago, Watch-only condition.
```

---

# 6. Confirm Moving Average Timeframes

The requirements clearly define:

```text
Weekly 8EMA > Weekly 21EMA
```

But the document should explicitly define the timeframe for:

- 50EMA
- 150MA
- 200MA

## Suggested Assumption

Use daily chart levels:

```text
50EMA = daily 50-period EMA
150MA = daily 150-period simple moving average
200MA = daily 200-period simple moving average
```

## Example

```text
Weekly trend check:
- Weekly 8EMA
- Weekly 21EMA

Pullback check:
- Daily 50EMA
- Daily 150SMA
- Daily 200SMA
```

## Trader Verification Needed

Please confirm that 50EMA / 150MA / 200MA are intended to be **daily** moving averages.

---

# 7. Clarify Whether Pullback Proximity Is Required for Pass

The requirements now suggest:

```text
Price within 5% of a selected moving average counts as near.
```

That is helpful. But it still needs to say whether this affects Pass.

## Decision Needed

Should price being near a key moving average be:

1. Required for Pass,
2. A Watch-only condition,
3. Context only?

## Suggested Assumption

Use this rule:

```text
Pullback proximity is required for a clean Pass.
If the setup is otherwise valid but price is not near a key moving average, result = Watch.
```

## Example

```text
Ticker: SPY
Weekly 8EMA > 21EMA: Yes
Valid LEAPS: Yes
Valid short call: Yes
Extrinsic target: Met
Price distance from nearest key MA: 8%
Configured near threshold: 5%
Result: Watch
Reason: Setup is otherwise valid, but price is not near the desired pullback zone.
```

## Alternative

If the trader does not want the pullback rule to downgrade results, then use:

```text
Pullback proximity is context only and does not affect Pass / Watch / Fail.
```

## Trader Verification Needed

Please choose:

1. Pullback proximity required for Pass.
2. Pullback proximity downgrades otherwise valid setups to Watch.
3. Pullback proximity is context only.

Recommended choice: **Option 2**.

---

# 8. Define Option Price Used for Extrinsic Calculations

Extrinsic value changes depending on whether the scanner uses bid, ask, mid, mark, or last price.

This matters most for short calls because the scanner is checking whether the option pays enough premium.

## Suggested Assumption

Use a conservative approach:

```text
Short-call extrinsic for Pass/Watch/Fail uses bid price.
Mid price is displayed as an estimate.
Long-call cost displays ask and mid price.
```

## Why This Is Recommended

For a short call, the bid is closer to what the trader can realistically collect immediately.

Using mid may make a setup look better than what is actually fillable.

## Example

Assume:

```text
Stock price: $100
Short call strike: $105
Bid: $0.70
Ask: $0.90
Mid: $0.80
DTE: 7
```

Using bid:

```text
Weeklyized extrinsic = 0.70 / 100 = 0.70%
Result impact: Watch
```

Using mid:

```text
Weeklyized extrinsic = 0.80 / 100 = 0.80%
Result impact: Pass
```

Same option, different result. That is why the pricing basis must be explicit.

## Trader Verification Needed

Please choose:

1. Use bid for short-call pass/fail calculations.
2. Use mid for short-call pass/fail calculations.
3. Display both, but require bid to meet the target for Pass.

Recommended choice: **Option 3**.

---

# 9. Define OTM / ATM / ITM in Simple Terms

The short-call rules use:

- OTM
- ATM
- ITM

These should be explicitly defined.

## Suggested Assumption

For calls:

```text
OTM call = strike price above current stock/ETF price
ITM call = strike price below current stock/ETF price
ATM call = strike price closest to current stock/ETF price
```

## Example

If SPY is trading at `$500`:

|   Strike | Moneyness |
| -------: | --------- |
| 490 call | ITM       |
| 500 call | ATM       |
| 510 call | OTM       |

## Trader Verification Needed

Please confirm these definitions are acceptable.

---

# 10. Clarify Long LEAPS DTE Preference

The requirements allow:

```text
DTE >= 180
Prefer DTE >= 365
Prefer 12–24+ months when underlying is near lower end of range
```

That is workable, but there is still a ranking question when multiple contracts qualify.

## Suggested Assumption

Use this order:

1. Must have DTE >= 180.
2. Must have delta between 0.70 and 0.90.
3. Prefer expiration closest to 365 DTE.
4. If the trader marks the underlying as near the lower end of its range, prefer 12–24 months.
5. Prefer delta closest to 0.80.

## Example

| Contract | DTE | Delta |                              Normal Ranking |
| -------- | --: | ----: | ------------------------------------------: |
| A        | 210 |  0.80 |                       Good, but shorter DTE |
| B        | 370 |  0.78 |                                   Preferred |
| C        | 620 |  0.80 | Preferred only if trader wants 12–24 months |

## Trader Verification Needed

Please confirm whether the scanner should normally prefer:

1. Closest to 365 DTE, or
2. Longest available DTE in the 12–24 month range, or
3. Delta closest to 0.80 before considering DTE.

Recommended choice: **Closest to 365 DTE first, then delta closest to 0.80**.

---

# 11. Clarify Data Freshness Rules

The scanner should not produce a clean Pass from stale or incomplete data.

## Suggested Assumption

Use this rule:

```text
Required stale or missing data cannot produce Pass.
```

Every result should show:

- Scan time
- Stock/ETF quote time
- Options-chain quote time if available
- Candle data date/time
- Whether the market is open or closed

## Example

```text
Ticker: QQQ
All strategy rules appear valid.
Option quote timestamp: 2 hours old during market hours.
Result: Insufficient Data or Watch
Reason: Option quote is stale.
```

## Trader Verification Needed

Please confirm:

1. Should stale data block Pass?
2. Should after-hours/weekend scans be allowed using last available data if clearly labeled?

Recommended defaults:

```text
Stale data blocks Pass.
After-hours/weekend scans are allowed but must be clearly labeled as using last available data.
```

---

# 12. Clarify User-Facing Error Results

The requirements include **Insufficient Data**, but should include examples of why a ticker may get that result.

## Suggested User-Facing Reasons

| Situation                 | Suggested Result          | Reason Shown                         |
| ------------------------- | ------------------------- | ------------------------------------ |
| Invalid ticker            | Insufficient Data         | Ticker not found                     |
| No options chain          | Fail or Insufficient Data | No options available for this ticker |
| Missing delta             | Insufficient Data         | Option delta is required             |
| Missing bid/ask           | Insufficient Data         | Option quote is incomplete           |
| Data provider unavailable | Insufficient Data         | Market data provider unavailable     |
| Stale quote               | Insufficient Data         | Required quote data is stale         |
| Trend unclear             | Manual Review             | Trend regime unclear                 |

## Trader Verification Needed

Please confirm whether **no options chain** should be:

1. Fail, because the ticker cannot support PMCC, or
2. Insufficient Data, because provider data might be incomplete.

Recommended default:

```text
If the ticker is confirmed non-optionable: Fail.
If provider data is unavailable or incomplete: Insufficient Data.
```

---

# 13. Add Read-Only Broker Safety Language

The requirements say no trading in MVP. That should be made stronger because the app connects to TastyTrade.

## Suggested Requirement Text

```text
MVP must be read-only. It must not place, preview, modify, cancel, or route orders. It must not expose order-entry buttons, order tickets, position-management actions, or account-management actions. The TastyTrade integration must only be used for market data required by the scanner.
```

## User-Facing Meaning

The app can show scanner results, but it cannot:

- Place trades
- Build live orders
- Close positions
- Roll positions
- Display account balances unless later requested
- Manage orders

## Trader Verification Needed

Please confirm that MVP should remain scanner-only and read-only.

---

# 14. Add Disclaimer / Recommendation Boundary

The scanner checks rules, but it should not appear to give personal financial advice.

## Suggested Disclaimer

```text
This tool performs rule-based screening only. It is not financial advice, investment advice, or a trade recommendation. Options involve risk and may result in substantial loss. The user is responsible for verifying all data, suitability, and trade decisions.
```

## Suggested Labeling

Use:

```text
Criteria Match: Pass / Watch / Fail
```

Avoid:

```text
Recommended Trade
Buy
Sell
Best Trade
```

## Trader Verification Needed

Please confirm whether this disclaimer language is acceptable.

---

# 15. Suggested Final Assumptions for the Developer

If the trader agrees, the developer can build the MVP using these assumptions:

| Area               | Suggested Assumption                                          |
| ------------------ | ------------------------------------------------------------- |
| Result model       | One primary status plus notes/badges                          |
| Status priority    | Insufficient Data > Fail > Manual Review > Watch > Pass       |
| Extrinsic Pass     | Weeklyized extrinsic >= 0.75%                                 |
| Extrinsic Watch    | Weeklyized extrinsic 0.60%–0.749%                             |
| Extrinsic Fail     | Weeklyized extrinsic < 0.60%                                  |
| Strong uptrend     | Only regime that can produce clean Pass                       |
| Neutral/sideways   | Watch only in MVP                                             |
| Downtrend          | Fail or Manual Review, never Pass for new entry               |
| RSI                | 14-period daily RSI                                           |
| RSI rising         | Current RSI > RSI from 3 trading days ago                     |
| RSI role           | Watch/ideal condition, not hard Fail                          |
| 50EMA/150MA/200MA  | Daily chart levels                                            |
| Pullback proximity | If absent, downgrade otherwise valid setup to Watch           |
| Pullback threshold | 5% default                                                    |
| Short-call pricing | Display bid and mid; require bid to meet target for Pass      |
| OTM call           | Strike above current price                                    |
| ATM call           | Strike closest to current price                               |
| ITM call           | Strike below current price                                    |
| Long LEAPS DTE     | Prefer closest to 365 DTE, then delta closest to 0.80         |
| Stale data         | Blocks Pass                                                   |
| After-hours scans  | Allowed if clearly labeled as last available data             |
| No options chain   | Fail if confirmed non-optionable; otherwise Insufficient Data |
| Broker behavior    | Read-only scanner only, no order actions                      |
| Disclaimer         | Required in UI                                                |

---

# 16. Final Questions for the Trader

The trader does not need to answer technical questions. These are trading-behavior questions only.

## Result Labels

1. Do you agree with one main result plus notes/badges?
2. Do you agree with this priority?

```text
Insufficient Data > Fail > Manual Review > Watch > Pass
```

## Extrinsic Target

3. Is this acceptable?

```text
Pass: >= 0.75% weeklyized
Watch: 0.60%–0.749% weeklyized
Fail: < 0.60% weeklyized
```

4. Should bid price be required to meet the target for Pass, or is mid price acceptable?

## Trend Regime

5. Should only Strong Uptrend be allowed to Pass in MVP?
6. Should Neutral/Sideways always be Watch?
7. Should Downtrend always be Fail or Manual Review for a new entry?

## RSI and Pullback

8. Should RSI be daily 14-period RSI?
9. Should “RSI rising” mean current RSI is above RSI from 3 trading days ago?
10. Should bad RSI downgrade Pass to Watch, or just show as context?
11. Are 50EMA / 150MA / 200MA daily chart levels?
12. Should missing pullback proximity downgrade an otherwise valid setup to Watch?

## Long LEAPS

13. Should the scanner prefer closest to 365 DTE before delta closest to 0.80?
14. Or should delta closest to 0.80 be the top priority once minimum DTE is met?

## Data and Safety

15. Should stale data block Pass?
16. Should after-hours scans be allowed if clearly labeled?
17. Should no options chain be Fail if the ticker is confirmed non-optionable?
18. Is the read-only/no-trading MVP rule confirmed?
19. Is the proposed disclaimer acceptable?

---

## Recommended Update to the Requirements Document

Add a final section named:

```markdown
## MVP Final Decision Rules and Trader Assumptions
```

That section should include the verified assumptions from this report.

Once those assumptions are confirmed and added, the requirements will be ready to turn into an implementation plan.

---

## Final Verdict

The requirements are now approximately **80–85% build-ready**.

They are good enough to understand the intended strategy, but not yet precise enough to guarantee that the scanner will make decisions exactly the way the trader expects.

The final step is for the trader to verify the assumptions in this report. After that, the developer can make the technical decisions and build the MVP without repeatedly asking for trading-rule clarification.
