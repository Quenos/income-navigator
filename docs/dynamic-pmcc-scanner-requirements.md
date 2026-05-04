# Dynamic PMCC Scanner — Requirements Document

## 1. Purpose

Create an app that scans tickers to determine whether the criteria to enter a **Dynamic PMCC — Poor Man's Covered Call** are present.

The app should focus strictly on the user-defined DPMCC setup and avoid adding extra scoring models, indicators, filters, or trading logic that are not part of the setup.

The strategy focus is:

> **Income, not capital appreciation.**

The goal of the strategy is to:

- Collect extrinsic value from covered calls over time.
- Reduce cost basis.
- Target net positive ROI.

---

## 2. Strategy Scope

The scanner should evaluate:

1. Whether the underlying has a valid technical setup.
2. Whether a valid long LEAPS call is available.
3. Whether a valid short call can be sold according to the current trend regime.
4. Whether the short call offers the required extrinsic value target.

The scanner should not make fundamental criteria a required DPMCC entry gate.

---

## 3. Decision Logic — Pass / Watch / Fail / Insufficient Data

This section converts the DPMCC strategy description into explicit scanner behavior so the developer does not need to make trading assumptions.

### 3.1 One Primary Result Label

Each ticker scan should return **one primary result label** only. Do not combine labels such as `Watch / Manual Review` as the primary status. Use notes or badges for secondary context.

Allowed primary result labels:

| Label                 | Meaning                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Pass**              | The ticker meets all clean DPMCC new-entry rules.                                                                |
| **Watch**             | The setup is close, but one or more ideal/watch conditions are missing.                                          |
| **Fail**              | One or more required trading rules clearly fail.                                                                 |
| **Insufficient Data** | The scanner cannot evaluate because required price, candle, option-chain, quote, or Greek data is missing/stale. |
| **Manual Review**     | The scanner cannot judge an important subjective condition cleanly.                                              |

Secondary notes/badges may include:

```text
Unclear Trend
RSI Not Ideal
No Pullback
Stale Quote
Wide Spread Warning
Manual Chart Review Suggested
```

### 3.2 Result Priority Order

If more than one condition applies, use this priority order:

```text
Insufficient Data > Fail > Manual Review > Watch > Pass
```

Meaning:

| Situation                                          | Primary Result    |
| -------------------------------------------------- | ----------------- |
| Required data is missing or stale                  | Insufficient Data |
| A required trading rule clearly fails              | Fail              |
| A required subjective judgment cannot be automated | Manual Review     |
| Setup is close but not clean                       | Watch             |
| All clean-entry rules are met                      | Pass              |

Missing or stale required data should not be treated as a trading failure. Return **Insufficient Data** and explain which data is missing or stale.

### 3.3 Required for Clean Pass

A ticker should only receive **Pass** when all of the following are true:

1. Data is usable and fresh enough for the scan.
2. Ticker has usable options-chain data.
3. Ticker is not known to be non-optionable.
4. Trend regime is **Strong Uptrend**.
5. Weekly trend requirement is met:

```text
Weekly 8EMA > Weekly 21EMA
```

6. RSI condition is ideal:

```text
Daily RSI(14) < 50
Current daily RSI(14) > daily RSI(14) from 3 trading days ago
```

7. Pullback condition is met:

```text
Current price is within the configured pullback threshold of daily 50EMA, daily 150SMA, or daily 200SMA.
Default threshold: 5%
```

8. A long call exists with:

```text
DTE >= 180
Delta between 0.70 and 0.90
```

9. A short call exists with:

```text
DTE between 7 and 30
Delta and moneyness matching the Strong Uptrend regime: 30–40 delta OTM call
```

10. The short call meets the income target using **bid-based weeklyized extrinsic**:

```text
Bid-based weeklyized extrinsic % >= 0.75% of stock/ETF price
```

### 3.4 Watch Conditions

Return **Watch** when the setup is close but not clean enough for Pass. Examples:

- Weekly 8EMA > 21EMA, but RSI is not ideal.
- Weekly 8EMA > 21EMA, but price is not within the configured pullback threshold.
- Trend regime is Neutral / Sideways.
- Long LEAPS candidate exists, but only barely meets DTE/delta criteria.
- Short-call candidate exists, but bid-based weeklyized extrinsic is below 0.75% and at least 0.60%.
- Preferred ETF/index ETF condition is met, but the technical setup is not yet complete.

### 3.5 Fail Conditions

Return **Fail** when a required trading condition is clearly not met. Examples:

- Ticker is confirmed non-optionable.
- No long call exists with DTE >= 180 and delta between 0.70 and 0.90.
- No short call exists in the required DTE/delta/moneyness range for the applicable regime.
- Weekly 8EMA <= weekly 21EMA for a new DPMCC entry.
- Trend regime is clear Downtrend for a new DPMCC entry.
- Bid-based weeklyized short-call extrinsic is below 0.60%.

### 3.6 Manual Review Conditions

Return **Manual Review** when the scanner has enough data but cannot cleanly automate an important trading judgment. Examples:

- Trend regime cannot be classified clearly.
- The setup depends on “reversing off support” and the scanner cannot define that from the available data.
- The setup depends on “underlying at the lower end of its range” and the user has not manually marked that condition.
- The setup depends on shortening DTE near support, but support location is unclear.

For MVP, display the relevant numbers and context rather than pretending to know the trader's chart read.

### 3.7 Context Only / Not Pass-Fail Gates

These items should be displayed but should not automatically determine Pass or Fail in the MVP:

- Preferred ETF / index ETF status.
- Individual-stock fundamental data.
- Bid/ask spread, volume, and open interest unless the user later defines hard thresholds.
- Strong market position / quality notes.
- Management rules for already-open positions.

---

## 4. Application Platform

The app should have a **web-based frontend**.

The web frontend should allow the user to:

- Enter or manage a list of tickers to scan.
- Run the DPMCC scanner from the browser.
- View Pass / Watch / Fail / Insufficient Data / Manual Review results for each ticker.
- Open a ticker detail view showing the rule checklist, long LEAPS candidate, short call candidate, and extrinsic-value result.

The frontend does not need to place trades in the MVP.

---

## 5. Underlying Preference

The app should support both stocks and ETFs.

Preferred underlyings are:

- **SPY**
- **QQQ**
- **GLD**
- Index ETFs

The app should identify whether a ticker is:

- A preferred ETF / index ETF
- Another ETF
- An individual stock

This should be displayed as context, not as an automatic pass/fail condition unless the user later requests that behavior.

---

## 6. Optional Fundamental Data Sources

Fundamental data should **not** be a required DPMCC scanner entry gate in the MVP. However, the app may optionally display fundamental context for individual stocks because the broader DPMCC framework references stock quality.

From a trading workflow perspective, fundamentals are secondary for this scanner because the preferred underlyings are SPY, QQQ, GLD, and index ETFs. For ETFs, stock-level revenue growth, earnings growth, and ROE do not apply.

If optional stock fundamental context is added, the app may display:

- Revenue growth
- Earnings growth
- ROE
- Strong market position / quality notes, if available from the chosen data provider or manually tagged

Potential data sources:

### 6.1 SEC EDGAR APIs

Use for official U.S. company filing data.

Source:

```text
https://www.sec.gov/search-filings/edgar-application-programming-interfaces
```

Relevant use:

- Revenue from company facts / XBRL data
- Net income / earnings data
- Shareholders' equity data for ROE calculation

Notes:

- This is the most official source for U.S. listed company fundamentals.
- It is rawer and requires more normalization.
- The app would need to calculate growth rates and ROE itself.
- Best suited as a reliable fallback or for later deeper implementation.

### 6.2 Financial Modeling Prep

Use for easier-to-consume financial statements, ratios, and key metrics.

Source:

```text
https://site.financialmodelingprep.com/developer/docs/
```

Relevant use:

- Revenue growth
- Earnings growth
- ROE
- Income statements
- Key metrics / ratios

Notes:

- Easier to integrate than raw SEC data.
- Likely requires an API key and paid plan depending on usage.
- Good candidate if the app wants fundamentals without building a full SEC normalization layer.

### 6.3 Alpha Vantage Fundamentals

Use for basic company overview and fundamental statement data.

Source:

```text
https://www.alphavantage.co/documentation/#fundamentals
```

Relevant use:

- Company overview
- Income statement data
- Earnings data
- Some ratio-style fields depending on endpoint coverage

Notes:

- Simple API.
- Has free and paid tiers.
- Suitable for basic fundamental context, but coverage and rate limits should be checked.

### 6.4 Finnhub Basic Financials

Use for company financial metrics and basic fundamentals.

Source:

```text
https://finnhub.io/docs/api/company-basic-financials
```

Relevant use:

- Financial metrics
- ROE-related fields if available
- Revenue and earnings-related metrics

Notes:

- API-key based.
- Useful if the developer wants a packaged fundamentals endpoint rather than parsing filings.

### 6.5 Polygon.io Stock Financials

Use for stock financials if already using Polygon or if a paid market-data provider is acceptable.

Source:

```text
https://polygon.io/docs/
```

Relevant use:

- Financial statements
- Company financial data
- Potentially useful for revenue and earnings calculations

Notes:

- Generally paid for serious usage.
- May be overkill if TastyTrade already covers the scanner's required price and options data.

### 6.6 Nasdaq Data Link / Sharadar Fundamentals

Use for cleaner historical fundamental datasets.

Source:

```text
https://data.nasdaq.com/databases/SF1/documentation
```

Relevant use:

- Revenue
- Net income / earnings
- Equity
- Pre-normalized fundamental fields

Notes:

- Typically paid.
- Better suited for research, screening, and historical consistency.

### 6.7 Intrinio Fundamentals

Use for professional-grade company fundamentals.

Source:

```text
https://docs.intrinio.com/documentation/web_api/get_company_fundamentals_v2
```

Relevant use:

- Fundamental statements
- Company financial metrics
- ROE and growth calculations

Notes:

- Paid/professional data provider.
- Good option if data quality and coverage matter more than cost.

### 6.8 Suggested Approach

For the MVP, do **not** block DPMCC entries based on fundamentals.

Recommended implementation path:

1. Use **tastyware/tastytrade SDK** for the core scanner data: prices, candles, and options chains.
2. Skip fundamentals in the MVP entry decision.
3. Add an optional stock fundamentals panel later.
4. If adding fundamentals, start with a simple provider such as Financial Modeling Prep, Alpha Vantage, or Finnhub.
5. Use SEC EDGAR as the official fallback if the app needs source-of-truth filing data.

---

## 7. Trade Entry Criteria

### 7.1 Technical Setup

The app must evaluate the following technical criteria.

#### Weekly Uptrend

The weekly chart should be up-trending.

Required condition:

```text
8EMA > 21EMA on the weekly chart
```

The app should display:

- Weekly 8EMA
- Weekly 21EMA
- Whether 8EMA > 21EMA

---

#### RSI Setup

Use daily 14-period RSI.

Ideal RSI condition:

```text
Daily RSI(14) < 50
Current daily RSI(14) > daily RSI(14) from 3 trading days ago
```

Scanner behavior:

- If all required conditions are otherwise met but RSI is not ideal, downgrade the result to **Watch**.
- RSI should not create **Fail** by itself unless another required rule also fails.

The app should display:

- Current daily RSI(14)
- Daily RSI(14) from 3 trading days ago
- Whether RSI is under 50
- Whether RSI is rising by this definition

The app may also indicate, as context only, if price appears to be:

- Reversing off support
- Reversing from oversold conditions

---

#### Pullback Setup

The ideal entry is on a pullback to one of the following **daily** moving averages:

- Daily 50EMA
- Daily 150SMA
- Daily 200SMA

Pullback proximity rule:

```text
Near = current price is within the configured threshold of daily 50EMA, daily 150SMA, or daily 200SMA.
Default threshold = 5%
Distance % = abs(current price - moving average) / current price
```

Scanner behavior:

- Pullback proximity is required for a clean **Pass**.
- If all other required conditions are met but price is not near one of these moving averages, return **Watch**.

The app should display:

- Current price
- Daily 50EMA
- Daily 150SMA
- Daily 200SMA
- Distance percentage to each moving average
- Nearest moving average
- Whether price is within the configured pullback threshold

---

## 8. Long LEAPS Criteria

The app must scan the options chain for a suitable long call.

### 8.1 DTE

The long call should have:

```text
180–365+ DTE
```

The exact DTE depends on:

- User's time horizon
- Current setup

If the underlying is at the lower end of its range, the app should allow:

```text
12–24+ months
```

The app should display:

- Expiration date
- DTE
- Whether the DTE fits the 180–365+ DTE requirement
- Whether it is in the 12–24+ month area

---

### 8.2 Delta

The long call should be in this delta range:

```text
0.70–0.90 delta
```

Ideal:

```text
0.80 delta
```

The app should identify long call candidates in the 0.70–0.90 delta range and mark the one closest to 0.80 delta as ideal.

The app should display:

- Strike
- Expiration
- DTE
- Delta
- Bid
- Ask
- Mid price, if available
- Whether delta is within the accepted range
- Distance from ideal 0.80 delta

### 8.3 Long LEAPS Candidate Priority

When multiple long calls qualify, the scanner should use this priority order:

1. Must have DTE >= 180.
2. Must have delta between 0.70 and 0.90.
3. Prefer expiration closest to 365 DTE.
4. If the trader manually marks the underlying as near the lower end of its range, prefer 12–24 months.
5. Prefer delta closest to 0.80 after the DTE preference above.
6. Display bid/ask spread, volume, open interest, and extrinsic value paid as context/warnings, but do not hard-fail on them unless the user later defines thresholds.

---

## 9. Trend Regime Definitions

The short call depends on the detected trend regime. The scanner should classify the regime using the DPMCC technical setup and simple moving-average context.

### 9.1 Strong Uptrend

Classify as **Strong Uptrend** when all of the following are true:

- Weekly 8EMA > weekly 21EMA.
- Current price is not clearly below daily 200SMA.
- Trend is not classified as Neutral / Sideways or Downtrend by the rules below.

Short-call style:

```text
30–40 delta OTM call, 7–30 DTE
```

### 9.2 Neutral / Sideways

Classify as **Neutral / Sideways** when:

- Trend is not clearly strong uptrend or clear downtrend.
- Price is chopping around key moving averages.
- Weekly 8EMA and 21EMA are close together or flattening.
- RSI is mixed or non-directional.

Short-call style:

```text
Around 50 delta ATM call, 7–30 DTE
```

For MVP new-entry scanning, Neutral / Sideways can **not** produce Pass. Return **Watch** if the rest of the setup is valid.

### 9.3 Downtrend

Classify as **Downtrend** when:

- Weekly 8EMA < weekly 21EMA, or
- Price is clearly below key moving averages and failing bounces, or
- Lower-high / lower-low structure is evident if the app can detect it.

Short-call style:

```text
60–70 delta ITM call, 7–30 DTE
```

For MVP new-entry scanning, a clear Downtrend can **not** produce Pass. Return **Fail** for a clear downtrend. The downtrend short-call rule remains useful for existing-position management or future defensive/manual-review workflows.

### 9.4 Unclear Regime

If the scanner cannot clearly classify the trend regime, return:

```text
Manual Review
```

Do not force a default short-call style when the regime is unclear.

---

## 10. Short Call Criteria

The app must identify short call candidates based on the current trend regime.

Short calls should target:

```text
0.75–1% extrinsic value relative to stock price weekly
```

The app should calculate and display:

- Bid-based short call extrinsic value
- Mid-based short call extrinsic value for context
- Bid-based raw extrinsic value as a percentage of stock price
- Bid-based weeklyized extrinsic value as a percentage of stock price
- Whether the short call meets the 0.75–1% bid-based weeklyized target

---

### 10.1 Strong Uptrend

If the underlying is in a strong uptrend, the short call should be:

```text
30–40 delta
OTM
7–30 DTE
```

Rationale:

```text
Participate in trend + collect approximately 1–2%/week premium
```

The app should display short call candidates matching:

- 30–40 delta
- OTM
- 7–30 DTE

---

### 10.2 Neutral / Sideways

If the underlying is neutral or sideways, the short call should be:

```text
50 delta
ATM
7–30 DTE
```

Rationale:

```text
Max extrinsic; lower breakout probability
```

The app should display short call candidates matching:

- Around 50 delta
- ATM
- 7–30 DTE

---

### 10.3 Downtrend

If the underlying is in a downtrend, the short call should be:

```text
60–70 delta
ITM
7–30 DTE
```

The app may also use:

```text
9ATR
```

or:

```text
A percentage of Expected Move
```

Rationale:

```text
Synthetic short hedge; near-equal extrinsic
```

Additional rule:

```text
Shorten DTE near supports
```

The app should display short call candidates matching:

- 60–70 delta
- ITM
- 7–30 DTE
- Optional: strike based on 9ATR or percentage of expected move
- Whether DTE has been shortened near supports

### 10.4 Short Call Candidate Priority

When multiple short calls qualify, the scanner should use this priority order:

1. Must match the detected trend-regime delta range.
2. Must match the intended moneyness for that regime: OTM, ATM, or ITM.
3. Must have DTE between 7 and 30.
4. Prefer contracts meeting the weeklyized extrinsic target.
5. Prefer delta closest to the regime target or midpoint.
6. Prefer the best weeklyized extrinsic value after the above criteria are met.
7. Display bid/ask spread, volume, and open interest as context/warnings, but do not hard-fail on them unless the user later defines thresholds.

If no short call meets the bid-based weeklyized extrinsic target but an otherwise valid short call exists:

- Return **Watch** if bid-based weeklyized extrinsic is 0.60%–0.749%.
- Return **Fail** if bid-based weeklyized extrinsic is below 0.60%.

---

## 11. Management Rules

The app's first purpose is to scan for entry criteria. Management rules should be included as **static reference / future settings** in the MVP and should not affect entry scanner results.

### 11.1 Covered Call Management

Covered calls should be managed as follows:

```text
Close at 80–90% of extrinsic captured.
```

If the short call is not threatened:

```text
Let expire.
```

Early close rule:

```text
Can close early at 50–70%+ profit in ≤50% of DTE.
```

---

### 11.2 Long Call / Entire Trade Management

Close the entire trade if:

```text
Loss on longs minus covered call gains exceeds 30%.
```

Close the entire trade if:

```text
Total trade gain reaches 50–100%.
```

Close the entire trade if:

```text
The short call is so deep ITM that rolling makes no sense.
```

Close the entire trade if:

```text
Fundamental or technical outlook changes materially.
```

Note: this management rule references fundamental outlook changes, but the scanner MVP should not require fundamental criteria for entry.

---

### 11.3 ITM Covered Calls

The app should reflect the following rule:

```text
Going ITM on covered calls is OK.
```

Reason:

```text
Losses in covered call intrinsic value are offset by long call gains.
```

Goal:

```text
Target net positive ROI.
```

---

### 11.4 Rolling After Large Moves

If a large move occurs and the short call becomes deep ITM or deep OTM, and a roll is needed:

```text
Consider only rolling the covered call 50–75% of the distance.
```

Reason:

```text
Avoid a whipsaw move.
```

---

## 12. Data Provider / TastyTrade Integration

The app should use the **tastyware/tastytrade SDK** to interface with **TastyTrade** for market data.

The initial integration should support retrieving the data needed by the scanner, including:

- Current price information.
- Candle data needed for technical calculations.
- Options chains.
- Expiration dates.
- Strikes.
- Option bid / ask prices.
- Option deltas.
- Other option data required to calculate intrinsic and extrinsic value.

The TastyTrade integration should be designed so that it can support trading in the future, but **trade execution is not part of the MVP**.

Future trading functionality may include:

- Building an order ticket from the selected DPMCC structure.
- Sending orders to TastyTrade.
- Tracking submitted orders.
- Managing or closing DPMCC positions.

For the MVP, the TastyTrade connection must be treated as **read-only market-data access**. The MVP must not place, preview, modify, cancel, or route orders. It must not expose order-entry buttons, live order tickets, position-management actions, account-management actions, or account-balance views unless explicitly requested later.

---

## 13. Required Data Inputs

### 13.1 Price / Technical Data

For each ticker:

- Current stock or ETF price
- Weekly price data
- RSI
- 8EMA on weekly chart
- 21EMA on weekly chart
- 50EMA
- 150MA
- 200MA
- 9ATR, if used for downtrend short call selection
- Expected Move, if used for downtrend short call selection
- Candle data timestamp/date
- Quote timestamp
- Market open/closed status

---

### 13.2 Options Data

For each ticker:

- Expiration dates
- DTE
- Strike prices
- Call option bid
- Call option ask
- Call option mid price, if calculated
- Delta
- Intrinsic value
- Extrinsic value
- Option quote timestamp

---

## 14. Required Calculations

### 14.1 Intrinsic Value for Calls

For a call option:

```text
Intrinsic value = max(0, stock price - strike price)
```

---

### 14.2 Option Pricing Basis

The app should calculate and display bid, ask, and mid.

Mid price:

```text
Mid price = (bid + ask) / 2
```

For short-call income pass/watch/fail decisions, use the **bid price** as the conservative collectible premium.

For display, show both:

- Bid-based extrinsic value
- Mid-based extrinsic value

For long-call cost display, show:

- Ask price
- Mid price

Do not use last traded option price for pass/watch/fail calculations. Last price may be stale.

### 14.3 Extrinsic Value for Calls

For a call option:

```text
Intrinsic value = max(0, stock price - strike price)
Extrinsic value = option price used - intrinsic value
```

For short-call scanner decisions:

```text
Short-call decision extrinsic = short-call bid - intrinsic value
```

For display:

```text
Short-call mid extrinsic = short-call mid - intrinsic value
```

### 14.4 Extrinsic Value Relative to Stock Price

For short calls, calculate both raw and weeklyized extrinsic percentage.

Bid-based raw extrinsic percentage:

```text
Bid raw extrinsic % = short-call bid extrinsic / stock price
```

Bid-based weeklyized extrinsic percentage:

```text
Bid weeklyized extrinsic % = (short-call bid extrinsic / stock price) * (7 / DTE)
```

Mid-based values should also be displayed for trader context but should not determine Pass.

The DPMCC target is:

```text
0.75–1% extrinsic value relative to stock price weekly
```

For scanner pass/watch/fail logic, interpret this as a **bid-based weeklyized** target because the short-call DTE range is 7–30 days.

Result impact:

| Bid Weeklyized Extrinsic % | Result Impact                  |
| -------------------------: | ------------------------------ |
|                 `>= 0.75%` | Pass condition met             |
|             `0.60%–0.749%` | Watch — close but below target |
|                  `< 0.60%` | Fail — materially below target |

The app should display both raw and weeklyized values so the trader can see the actual premium and the time-adjusted yield.

### 14.5 Call Moneyness Definitions

For calls:

```text
OTM call = strike price above current stock/ETF price
ATM call = strike price closest to current stock/ETF price
ITM call = strike price below current stock/ETF price
```

---

## 15. Scanner Output

For each ticker, the app should display a clear result.

### 15.1 Summary Output

Each ticker should show:

- Ticker
- Asset type: stock or ETF
- Whether it is a preferred ETF / index ETF
- Current price
- Entry status:
  - Pass
  - Watch
  - Fail
  - Insufficient Data
  - Manual Review
- Trend regime:
  - Strong uptrend
  - Neutral / sideways
  - Downtrend
- Technical checklist result
- Best matching long LEAPS candidate
- Best matching short call candidate
- Raw and weeklyized short call extrinsic percentage of stock price
- Notes explaining which criteria passed or failed
- Scan time, quote time, option-chain quote time, candle data timestamp, and market open/closed status

---

### 15.2 Rule Checklist

For each ticker, display a checklist.

```text
DPMCC Entry Checklist — [TICKER]

Objective:
[ ] Income-focused setup
[ ] Goal is extrinsic collection / cost-basis reduction

Technical:
[ ] Weekly 8EMA > 21EMA
[ ] RSI under 50 and rising
[ ] Reversing off support / oversold
[ ] Pullback to 50EMA / 150MA / 200MA

Underlying:
[ ] Preferred ETF / index ETF
[ ] Other ETF
[ ] Individual stock

Long LEAPS:
[ ] 180–365+ DTE
[ ] 12–24+ months if underlying at lower end of range
[ ] Delta between 0.70 and 0.90
[ ] Delta near ideal 0.80

Short Call:
[ ] Trend regime identified
[ ] Short call delta matches regime
[ ] 7–30 DTE
[ ] Weeklyized extrinsic value is 0.75–1% of stock price

Result:
[ ] Pass
[ ] Watch
[ ] Fail
[ ] Insufficient Data
[ ] Manual Review
```

---

## 16. User Configurable Settings

The developer should allow the user to configure the values from the DPMCC setup rather than hardcoding them permanently.

Configurable values:

```text
Long call minimum DTE: default 180
Long call preferred DTE: default 365+
Long call delta range: default 0.70–0.90
Long call ideal delta: default 0.80

Short call DTE range: default 7–30

Strong uptrend short call delta: default 30–40
Neutral/sideways short call delta: default 50
Downtrend short call delta: default 60–70

Short call target extrinsic % of stock price: default >=0.75% bid-based weeklyized for Pass
Short call Watch range: default 0.60%–0.749% bid-based weeklyized
Short call Fail threshold: default <0.60% bid-based weeklyized
Pullback proximity threshold: configurable; default 5%
Result handling for unclear trend: default Manual Review
RSI period: default 14 daily
RSI rising lookback: default current RSI > RSI from 3 trading days ago

Covered call close target: default 80–90% extrinsic captured
Early close profit target: default 50–70%+ profit
Early close timing: default ≤50% of DTE

Long call / full trade loss threshold: default 30%
Full trade gain target: default 50–100%
Rolling distance after large move: default 50–75%
```

---

## 17. What the App Should Not Do in MVP

To avoid adding assumptions beyond the original setup, the MVP should **not** include the following unless requested later:

- No invented 0–100 score unless separately specified.
- No extra indicators beyond the DPMCC setup.
- No hardcoded liquidity rules unless specified later.
- No broker execution in MVP; TastyTrade integration must be read-only for scanner data.
- No portfolio management.
- No risk model beyond the stated DPMCC rules.
- No backtesting unless requested later.
- No automated trade placement, order preview, order modification, cancellation, routing, or live order tickets in MVP.
- No recommendation language beyond checking the DPMCC criteria; label outputs as criteria matches, not trade recommendations.
- No fundamental entry filter unless requested later.

---

## 18. Data Freshness, Error Handling, and Safety

### 18.1 Data Freshness

Required stale or missing data cannot produce Pass.

Every scan result should show:

- Scan time
- Stock/ETF quote time
- Options-chain quote time, if available
- Candle data date/time
- Whether the market is open or closed

After-hours and weekend scans are allowed if clearly labeled as using last available market data.

During market hours, stale required quote data should return **Insufficient Data** rather than Pass. The developer may define the exact staleness threshold based on TastyTrade data behavior, but the UI must clearly show quote timestamps.

### 18.2 User-Facing Error Results

| Situation                               | Primary Result    | Reason Shown                         |
| --------------------------------------- | ----------------- | ------------------------------------ |
| Invalid ticker                          | Insufficient Data | Ticker not found                     |
| Confirmed non-optionable ticker         | Fail              | No options available for this ticker |
| Options provider unavailable/incomplete | Insufficient Data | Options-chain data unavailable       |
| Missing option delta                    | Insufficient Data | Option delta is required             |
| Missing bid/ask                         | Insufficient Data | Option quote is incomplete           |
| Data provider unavailable               | Insufficient Data | Market data provider unavailable     |
| Stale required quote data               | Insufficient Data | Required quote data is stale         |
| Trend unclear                           | Manual Review     | Trend regime unclear                 |

### 18.3 User-Facing Disclaimer

The web UI should display this disclaimer or substantially equivalent language:

```text
This tool performs rule-based screening only. It is not financial advice, investment advice, or a trade recommendation. Options involve risk and may result in substantial loss. The user is responsible for verifying all data, suitability, and trade decisions.
```

Use labels such as:

```text
Criteria Match: Pass / Watch / Fail
```

Avoid labels such as:

```text
Recommended Trade
Buy
Sell
Best Trade
```

---

## 19. MVP Final Decision Rules and Trader Assumptions

These are the final MVP assumptions the developer should implement unless superseded by a later requirements update.

| Area                     | Final MVP Rule                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Result model             | One primary status plus notes/badges                                                     |
| Status priority          | Insufficient Data > Fail > Manual Review > Watch > Pass                                  |
| Extrinsic Pass           | Bid-based weeklyized extrinsic >= 0.75%                                                  |
| Extrinsic Watch          | Bid-based weeklyized extrinsic 0.60%–0.749%                                              |
| Extrinsic Fail           | Bid-based weeklyized extrinsic < 0.60%                                                   |
| New-entry Pass regime    | Strong Uptrend only                                                                      |
| Neutral/Sideways         | Watch only in MVP                                                                        |
| Downtrend                | Fail for new entry; defensive short-call display may be future/manual context            |
| Unclear trend            | Manual Review                                                                            |
| RSI                      | 14-period daily RSI                                                                      |
| RSI rising               | Current RSI > RSI from 3 trading days ago                                                |
| RSI role                 | Ideal/watch condition; imperfect RSI downgrades otherwise valid setup to Watch, not Fail |
| Weekly trend             | Weekly 8EMA > weekly 21EMA required                                                      |
| Pullback MAs             | Daily 50EMA, daily 150SMA, daily 200SMA                                                  |
| Pullback proximity       | Required for clean Pass; absence downgrades otherwise valid setup to Watch               |
| Pullback threshold       | 5% default, configurable                                                                 |
| Short-call pricing       | Display bid and mid; require bid-based extrinsic to meet target for Pass                 |
| OTM call                 | Strike above current price                                                               |
| ATM call                 | Strike closest to current price                                                          |
| ITM call                 | Strike below current price                                                               |
| Long LEAPS DTE           | Must be >=180 DTE; normally prefer closest to 365 DTE, then delta closest to 0.80        |
| Lower-end-of-range LEAPS | If manually marked lower-end-of-range, prefer 12–24 months                               |
| Stale data               | Blocks Pass                                                                              |
| After-hours scans        | Allowed if clearly labeled as last available data                                        |
| No options chain         | Fail if confirmed non-optionable; otherwise Insufficient Data                            |
| Broker behavior          | Read-only scanner only, no order actions                                                 |
| Disclaimer               | Required in UI                                                                           |

---

## 20. Example Scanner Outcomes

### 20.1 Clear Pass

```text
Ticker has usable fresh price and options data.
Trend regime is Strong Uptrend.
Weekly 8EMA > weekly 21EMA.
Daily RSI(14) is under 50 and higher than it was 3 trading days ago.
Price is within the configured pullback threshold of daily 50EMA, daily 150SMA, or daily 200SMA.
A long call exists with DTE >= 180 and delta between 0.70 and 0.90.
A 30–40 delta OTM short call exists with 7–30 DTE.
The short call meets bid-based weeklyized extrinsic >= 0.75% of stock/ETF price.
Result: Pass.
```

### 20.2 Watch

```text
Ticker has usable data.
Weekly 8EMA > weekly 21EMA.
Valid long call exists.
Valid short call exists.
RSI setup is not ideal, price is not near a key moving average, trend regime is Neutral / Sideways, or bid-based weeklyized extrinsic is 0.60%–0.749%.
Result: Watch.
```

### 20.3 Fail

```text
Ticker is confirmed non-optionable, has no valid LEAPS, has no valid short call, weekly 8EMA <= weekly 21EMA, clear downtrend is detected, or bid-based weeklyized extrinsic is below 0.60%.
Result: Fail.
```

### 20.4 Insufficient Data

```text
Ticker may be valid, but the scanner is missing required option delta, candle data, bid/ask data, or options-chain data.
Result: Insufficient Data.
```

### 20.5 Manual Review

```text
Scanner can display the data but cannot confidently judge a subjective item such as support reversal, lower-end-of-range condition, or unclear trend regime.
Result: Manual Review.
Notes/badges may explain the subjective issue.
```

---

## 21. Final Developer Deliverable

The developer should build an app that answers this question:

> Does this ticker currently satisfy the user-defined Dynamic PMCC entry criteria?

For each ticker, the app should return:

1. Whether the setup matches.
2. Which criteria passed.
3. Which criteria failed.
4. The best matching long LEAPS call.
5. The best matching short call according to the current trend regime, using the MVP decision rules.
6. Whether the short call meets the bid-based weeklyized 0.75–1% extrinsic target.
7. Any applicable management rules for future tracking.

The developer should deliver this as a **web-based application** using the **tastyware/tastytrade SDK** for TastyTrade price data, candle data, and options-chain data.

The implementation should leave room for future TastyTrade trade execution, but the MVP must remain read-only and must not place, preview, modify, cancel, or route trades.
