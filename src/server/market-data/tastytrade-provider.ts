import {
  Candle,
  DXLinkStreamer,
  Greeks,
  ReadOnlySession,
  getMarketDataByType,
  getOptionChain,
  type MarketData,
  type Option,
  type WebSocketLike,
} from 'tastytrade-ts-sdk/read-only';
import type {
  AssetType,
  MarketDataSnapshot,
  OptionContractSnapshot,
  TechnicalSnapshot,
} from '@/domain/scanner';
import { defaultScannerSettings } from '@/domain/scanner/settings';
import type { ScannerSettings } from '@/domain/scanner/settings';
import type { MarketDataProvider, MarketDataProviderResult } from './market-data-provider';

export interface TastytradeCandleSnapshot {
  time: number | string | Date;
  close: unknown;
}

export interface TastytradeGreekSnapshot {
  symbol: string;
  delta?: unknown;
}

interface LoadedOptionSnapshot {
  option: Option;
  quote?: MarketData;
  greek?: TastytradeGreekSnapshot;
}

export interface TastytradeReadOnlyPort {
  getEquityMarketData(symbols: readonly string[]): Promise<MarketData[]>;
  getOptionChain(symbol: string): Promise<Record<string, Option[]>>;
  getOptionMarketData(symbols: readonly string[]): Promise<MarketData[]>;
  getOptionGreeks(symbols: readonly string[]): Promise<TastytradeGreekSnapshot[]>;
  getDailyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]>;
  getWeeklyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]>;
}

export interface TastytradeMarketDataProviderConfig {
  providerSecret?: string;
  refreshToken?: string;
  isTest?: boolean;
  readOnlyPort?: TastytradeReadOnlyPort;
  now?: () => Date;
}

const REQUEST_TIMEOUT_MS = 7_500;
const DAILY_CANDLE_COUNT = 260;
const WEEKLY_CANDLE_COUNT = 40;
const MAX_TASTYTRADE_SYMBOLS_PER_REQUEST = 100;
const OPTION_DELTA_SCAN_MIN = 0.1;
const OPTION_DELTA_SCAN_MAX = 0.9;
const OPTION_DELTA_SCAN_BATCH_SIZE = 20;
const MAX_SHORT_CALL_EXPIRATIONS_TO_SCAN = 2;
const MAX_LONG_CALL_EXPIRATIONS_TO_SCAN = 1;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push([...items.slice(index, index + size)]);
  }
  return result;
}

function waitForWebSocketOpen(websocket: WebSocket): Promise<void> {
  if (websocket.readyState === WebSocket.OPEN) return Promise.resolve();
  if (websocket.readyState === WebSocket.CLOSED || websocket.readyState === WebSocket.CLOSING) {
    return Promise.reject(new Error('WebSocket closed before connection opened'));
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for WebSocket connection to open'));
    }, REQUEST_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('error', handleError);
      websocket.removeEventListener('close', handleClose);
    };
    const handleOpen = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('WebSocket connection failed'));
    };
    const handleClose = () => {
      cleanup();
      reject(new Error('WebSocket closed before connection opened'));
    };
    websocket.addEventListener('open', handleOpen, { once: true });
    websocket.addEventListener('error', handleError, { once: true });
    websocket.addEventListener('close', handleClose, { once: true });
  });
}

function openAwareWebSocketFactory(url: string): WebSocketLike {
  const websocket = new WebSocket(url);
  const wrapper: WebSocketLike = {
    onmessage: null,
    onerror: null,
    onclose: null,
    async send(data: string) {
      await waitForWebSocketOpen(websocket);
      websocket.send(data);
    },
    async close() {
      websocket.close();
    },
  };
  websocket.onmessage = (event) => wrapper.onmessage?.({ data: String(event.data) });
  websocket.onerror = (event) => wrapper.onerror?.(event);
  websocket.onclose = (event) => wrapper.onclose?.(event);
  return wrapper;
}

function decimalToNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function dateToIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function expirationToYmd(value: unknown): string | undefined {
  const iso = dateToIso(value);
  return iso?.slice(0, 10);
}

function marketDataPrice(quote: MarketData): number | undefined {
  return (
    decimalToNumber(quote.mark) ??
    decimalToNumber(quote.mid) ??
    decimalToNumber(quote.last) ??
    decimalToNumber(quote.close) ??
    decimalToNumber(quote.prev_close)
  );
}

function marketDataTime(quote: MarketData): string | undefined {
  if (quote.updated_at) return dateToIso(quote.updated_at);
  if (quote.last_trade_time) return dateToIso(quote.last_trade_time);
  return undefined;
}

function assetTypeFromEquityMarketData(quote: MarketData): AssetType {
  const instrument = quote.instrument as
    | ({ is_etf?: unknown; instrument_type?: unknown } | null)
    | undefined;
  if (instrument?.is_etf === true) return 'preferred ETF';
  if (quote.instrument_type === 'Equity' || instrument?.instrument_type === 'Equity')
    return 'stock';
  return 'unknown';
}

function optionSymbol(option: Option): string | undefined {
  return option.symbol ?? option.streamer_symbol;
}

function optionKey(symbol: string): string {
  return symbol.replaceAll(' ', '').toUpperCase();
}

function optionStrike(option: Option): number | undefined {
  return decimalToNumber(option.strike_price);
}

function optionDte(option: Option): number {
  return option.days_to_expiration ?? 0;
}

function groupOptionsByExpiration(options: readonly Option[]): Option[][] {
  const grouped = new Map<string, Option[]>();
  for (const option of options) {
    const key = expirationToYmd(option.expiration_date) ?? String(optionDte(option));
    grouped.set(key, [...(grouped.get(key) ?? []), option]);
  }
  return [...grouped.values()].sort((a, b) => optionDte(a[0]) - optionDte(b[0]));
}

function scannerRelevantExpirationGroups(
  options: readonly Option[],
  settings: ScannerSettings,
): Option[][] {
  const groups = groupOptionsByExpiration(options);
  const shortDteMidpoint = (settings.shortCall.dte.min + settings.shortCall.dte.max) / 2;
  const shortDteGroups = groups
    .filter((group) => {
      const dte = optionDte(group[0]);
      return dte >= settings.shortCall.dte.min && dte <= settings.shortCall.dte.max;
    })
    .sort(
      (a, b) =>
        Math.abs(optionDte(a[0]) - shortDteMidpoint) - Math.abs(optionDte(b[0]) - shortDteMidpoint),
    )
    .slice(0, MAX_SHORT_CALL_EXPIRATIONS_TO_SCAN)
    .sort((a, b) => optionDte(a[0]) - optionDte(b[0]));
  const longDteGroups = groups
    .filter((group) => optionDte(group[0]) >= settings.longCall.minDte)
    .sort(
      (a, b) =>
        Math.abs(optionDte(a[0]) - settings.longCall.preferredDte) -
        Math.abs(optionDte(b[0]) - settings.longCall.preferredDte),
    )
    .slice(0, MAX_LONG_CALL_EXPIRATIONS_TO_SCAN)
    .sort((a, b) => optionDte(a[0]) - optionDte(b[0]));
  return [...shortDteGroups, ...longDteGroups];
}

function scannerDeltaBounds(settings: ScannerSettings): { min: number; max: number } {
  const neutralMin = Math.max(0, settings.shortCall.neutralTargetDelta - 0.05);
  const neutralMax = Math.min(1, settings.shortCall.neutralTargetDelta + 0.05);
  const bounds = [
    { min: OPTION_DELTA_SCAN_MIN, max: OPTION_DELTA_SCAN_MAX },
    settings.shortCall.strongUptrendDelta,
    { min: neutralMin, max: neutralMax },
    settings.shortCall.downtrendDelta,
    settings.longCall.delta,
  ];
  return {
    min: Math.max(0, Math.min(...bounds.map((bound) => bound.min))),
    max: Math.min(1, Math.max(...bounds.map((bound) => bound.max))),
  };
}

function optionsNearAtmFirst(options: readonly Option[], stockPrice: number): Option[] {
  return [...options].sort((a, b) => {
    const aStrike = optionStrike(a) ?? Number.POSITIVE_INFINITY;
    const bStrike = optionStrike(b) ?? Number.POSITIVE_INFINITY;
    const distance = Math.abs(aStrike - stockPrice) - Math.abs(bStrike - stockPrice);
    if (distance !== 0) return distance;
    return aStrike - bStrike;
  });
}

function optionDelta(snapshot: LoadedOptionSnapshot): number | undefined {
  return decimalToNumber(snapshot.greek?.delta) ?? decimalToNumber(snapshot.quote?.delta);
}

function loadedDeltasCoverScannerBands(
  loaded: readonly LoadedOptionSnapshot[],
  settings: ScannerSettings,
): boolean {
  const deltas = loaded
    .map((snapshot) => optionDelta(snapshot))
    .filter((delta): delta is number => delta !== undefined);
  const bounds = scannerDeltaBounds(settings);
  return (
    deltas.length > 0 &&
    deltas.some((delta) => delta <= bounds.min + 1e-6) &&
    deltas.some((delta) => delta >= bounds.max - 1e-6)
  );
}

function simpleMovingAverage(values: number[], period: number): number | undefined {
  if (values.length < period) return undefined;
  const window = values.slice(-period);
  return window.reduce((sum, value) => sum + value, 0) / period;
}

function exponentialMovingAverageSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const series = [ema];
  for (const value of values.slice(period)) {
    ema = (value - ema) * multiplier + ema;
    series.push(ema);
  }
  return series;
}

function exponentialMovingAverage(values: number[], period: number): number | undefined {
  return exponentialMovingAverageSeries(values, period).at(-1);
}

function simplePercentageSlope(values: number[], bars: number): number | undefined {
  if (values.length <= bars) return undefined;
  const current = values.at(-1);
  const prior = values.at(-1 - bars);
  if (current === undefined || prior === undefined || prior === 0) return undefined;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function rollingSimpleMovingAverageSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const series: number[] = [];
  for (let index = period; index <= values.length; index += 1) {
    const window = values.slice(index - period, index);
    series.push(window.reduce((sum, value) => sum + value, 0) / period);
  }
  return series;
}

function linearRegressionSlopePercent(values: number[], bars: number): number | undefined {
  if (values.length < bars || bars < 2) return undefined;
  const window = values.slice(-bars);
  const xMean = (bars - 1) / 2;
  const yMean = window.reduce((sum, value) => sum + value, 0) / bars;
  const denominator = window.reduce((sum, _value, index) => sum + (index - xMean) ** 2, 0);
  if (denominator === 0 || yMean === 0) return undefined;
  const slopePerBar =
    window.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0) / denominator;
  return ((slopePerBar * (bars - 1)) / Math.abs(yMean)) * 100;
}

function rsi(values: number[], period: number, endOffset = 0): number | undefined {
  const end = values.length - endOffset;
  if (end <= period) return undefined;
  const window = values.slice(0, end);
  const changes = window.slice(1).map((value, index) => value - window[index]);
  const seed = changes.slice(0, period);
  let averageGain = seed.reduce((sum, change) => sum + Math.max(change, 0), 0) / period;
  let averageLoss = seed.reduce((sum, change) => sum + Math.max(-change, 0), 0) / period;
  for (const change of changes.slice(period)) {
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }
  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function closeValues(candles: readonly TastytradeCandleSnapshot[]): number[] {
  return candles
    .map((candle) => ({
      time: new Date(candle.time).getTime(),
      close: decimalToNumber(candle.close),
    }))
    .filter(
      (candle): candle is { time: number; close: number } =>
        Number.isFinite(candle.time) && candle.close !== undefined,
    )
    .sort((a, b) => a.time - b.time)
    .map((candle) => candle.close);
}

function buildTechnicals(
  dailyCandles: readonly TastytradeCandleSnapshot[],
  weeklyCandles: readonly TastytradeCandleSnapshot[],
  candleDataTime?: string,
): TechnicalSnapshot {
  const dailyCloses = closeValues(dailyCandles);
  const weeklyCloses = closeValues(weeklyCandles);
  const weekly8EmaSeries = exponentialMovingAverageSeries(weeklyCloses, 8);
  const weekly21EmaSeries = exponentialMovingAverageSeries(weeklyCloses, 21);
  const daily200SmaSeries = rollingSimpleMovingAverageSeries(dailyCloses, 200);
  return {
    weekly8Ema: weekly8EmaSeries.at(-1),
    weekly8EmaSlopePercent: simplePercentageSlope(weekly8EmaSeries, 4),
    weekly21Ema: weekly21EmaSeries.at(-1),
    weekly21EmaSlopePercent: simplePercentageSlope(weekly21EmaSeries, 4),
    daily50Ema: exponentialMovingAverage(dailyCloses, 50),
    daily150Sma: simpleMovingAverage(dailyCloses, 150),
    daily200Sma: daily200SmaSeries.at(-1),
    daily200SmaSlopePercent: linearRegressionSlopePercent(daily200SmaSeries, 20),
    rsi14: rsi(dailyCloses, 14),
    rsi14ThreeTradingDaysAgo: rsi(dailyCloses, 14, 3),
    candleDataTime,
    supportReversalKnown: false,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Timed out waiting for TastyTrade streamer data')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function collectEvents<T>(
  streamer: DXLinkStreamer,
  eventClass: typeof Greeks | typeof Candle,
  expectedCount: number,
): Promise<T[]> {
  const events: T[] = [];
  const started = Date.now();
  while (events.length < expectedCount && Date.now() - started < REQUEST_TIMEOUT_MS) {
    try {
      events.push((await withTimeout(streamer.getEvent(eventClass), REQUEST_TIMEOUT_MS)) as T);
    } catch {
      break;
    }
  }
  return events;
}

async function collectBatchesSequentially<T, R>(
  batches: readonly T[][],
  loadBatch: (batch: T[]) => Promise<readonly R[]>,
): Promise<R[]> {
  const results: R[] = [];
  for (const batch of batches) {
    results.push(...(await loadBatch(batch)));
  }
  return results;
}

class SdkTastytradeReadOnlyPort implements TastytradeReadOnlyPort {
  readonly #session: ReadOnlySession;

  constructor(session: ReadOnlySession) {
    this.#session = session;
  }

  async getEquityMarketData(symbols: readonly string[]): Promise<MarketData[]> {
    return getMarketDataByType(this.#session, { equities: [...symbols] });
  }

  async getOptionChain(symbol: string): Promise<Record<string, Option[]>> {
    return getOptionChain(this.#session, symbol.toUpperCase());
  }

  async getOptionMarketData(symbols: readonly string[]): Promise<MarketData[]> {
    if (symbols.length === 0) return [];
    return getMarketDataByType(this.#session, { options: [...symbols] });
  }

  async getOptionGreeks(symbols: readonly string[]): Promise<TastytradeGreekSnapshot[]> {
    if (symbols.length === 0) return [];
    const streamer = new DXLinkStreamer(this.#session, openAwareWebSocketFactory);
    try {
      await withTimeout(streamer.connect());
      await streamer.subscribe(Greeks, [...symbols]);
      const greeks = await collectEvents<Greeks>(streamer, Greeks, symbols.length);
      return greeks.map((greek) => ({ symbol: greek.event_symbol, delta: greek.delta }));
    } finally {
      await streamer.close().catch(() => undefined);
    }
  }

  async getDailyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]> {
    return this.#getCandles(symbol, '1d', DAILY_CANDLE_COUNT);
  }

  async getWeeklyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]> {
    return this.#getCandles(symbol, '1w', WEEKLY_CANDLE_COUNT);
  }

  async #getCandles(
    symbol: string,
    interval: string,
    expectedCount: number,
  ): Promise<TastytradeCandleSnapshot[]> {
    const streamer = new DXLinkStreamer(this.#session, openAwareWebSocketFactory);
    try {
      await withTimeout(streamer.connect());
      const startTime = new Date(Date.now() - expectedCount * 8 * 24 * 60 * 60 * 1000);
      await streamer.subscribeCandle(symbol.toUpperCase(), interval, startTime, false);
      const candles = await collectEvents<Candle>(streamer, Candle, expectedCount);
      return candles.map((candle) => ({ time: candle.time, close: candle.close }));
    } finally {
      await streamer.close().catch(() => undefined);
    }
  }
}

export class TastytradeMarketDataProvider implements MarketDataProvider, TastytradeReadOnlyPort {
  readonly #session: ReadOnlySession | null;
  readonly #port: TastytradeReadOnlyPort | null;
  readonly #now: () => Date;
  readonly configured: boolean;
  readonly isTest: boolean;

  constructor(config: TastytradeMarketDataProviderConfig = {}) {
    this.configured = Boolean(config.providerSecret || config.readOnlyPort);
    this.isTest = config.isTest ?? true;
    this.#now = config.now ?? (() => new Date());
    this.#session = config.providerSecret
      ? new ReadOnlySession({
          providerSecret: config.providerSecret,
          refreshToken: config.refreshToken,
          isTest: this.isTest,
        })
      : null;
    this.#port =
      config.readOnlyPort ?? (this.#session ? new SdkTastytradeReadOnlyPort(this.#session) : null);
  }

  async getEquityMarketData(symbols: readonly string[]): Promise<MarketData[]> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    return this.#port.getEquityMarketData(symbols);
  }

  async getOptionChain(symbol: string): Promise<Record<string, Option[]>> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    return this.#port.getOptionChain(symbol);
  }

  async getOptionMarketData(symbols: readonly string[]): Promise<MarketData[]> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    const batches = chunks(symbols, MAX_TASTYTRADE_SYMBOLS_PER_REQUEST);
    return collectBatchesSequentially(batches, (batch) => this.#port!.getOptionMarketData(batch));
  }

  async getOptionGreeks(symbols: readonly string[]): Promise<TastytradeGreekSnapshot[]> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    const batches = chunks(symbols, MAX_TASTYTRADE_SYMBOLS_PER_REQUEST);
    return collectBatchesSequentially(batches, (batch) => this.#port!.getOptionGreeks(batch));
  }

  async getDailyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    return this.#port.getDailyCandles(symbol);
  }

  async getWeeklyCandles(symbol: string): Promise<TastytradeCandleSnapshot[]> {
    if (!this.#port) throw new Error('TastyTrade read-only provider is not configured');
    return this.#port.getWeeklyCandles(symbol);
  }

  async #loadOptionBatch(options: readonly Option[]): Promise<LoadedOptionSnapshot[]> {
    const symbols = options
      .map((option) => optionSymbol(option))
      .filter((symbol): symbol is string => Boolean(symbol));
    if (symbols.length === 0) return [];

    const [optionQuotes, optionGreeks] = await Promise.all([
      this.getOptionMarketData(symbols),
      this.getOptionGreeks(symbols).catch(() => []),
    ]);
    const quoteBySymbol = new Map(
      optionQuotes.map((quote) => [optionKey(quote.symbol ?? ''), quote]),
    );
    const greekBySymbol = new Map(optionGreeks.map((greek) => [optionKey(greek.symbol), greek]));

    return options.map((option) => {
      const symbol = optionSymbol(option)!;
      return {
        option,
        quote: quoteBySymbol.get(optionKey(symbol)),
        greek: greekBySymbol.get(optionKey(symbol)),
      };
    });
  }

  async #loadRelevantCallOptions(
    callInstruments: readonly Option[],
    settings: ScannerSettings,
    stockPrice?: number,
  ): Promise<LoadedOptionSnapshot[]> {
    const relevantGroups = scannerRelevantExpirationGroups(callInstruments, settings);
    const relevantByDte = relevantGroups.flat();
    if (stockPrice === undefined) {
      const bounded = relevantByDte.slice(0, MAX_TASTYTRADE_SYMBOLS_PER_REQUEST);
      return this.#loadOptionBatch(bounded);
    }

    const loaded: LoadedOptionSnapshot[] = [];
    for (const expirationOptions of relevantGroups) {
      const ordered = optionsNearAtmFirst(expirationOptions, stockPrice);
      const loadedForExpiration: LoadedOptionSnapshot[] = [];
      for (const batch of chunks(ordered, OPTION_DELTA_SCAN_BATCH_SIZE)) {
        const loadedBatch = await this.#loadOptionBatch(batch);
        loaded.push(...loadedBatch);
        loadedForExpiration.push(...loadedBatch);

        if (loadedDeltasCoverScannerBands(loadedForExpiration, settings)) break;
      }
    }
    const bounds = scannerDeltaBounds(settings);
    return loaded.filter(({ greek, quote }) => {
      const delta = decimalToNumber(greek?.delta) ?? decimalToNumber(quote?.delta);
      return delta === undefined || (delta >= bounds.min && delta <= bounds.max);
    });
  }

  async getMarketDataForTicker(
    symbol: string,
    settings: ScannerSettings = defaultScannerSettings,
  ): Promise<MarketDataProviderResult> {
    const normalized = symbol.trim().toUpperCase();
    if (!this.#port) {
      return {
        ok: false,
        symbol: normalized,
        error: {
          code: 'provider-unavailable',
          message: 'TastyTrade read-only provider is not configured',
        },
      };
    }

    try {
      const [equityQuote] = await this.getEquityMarketData([normalized]);
      if (!equityQuote) {
        return {
          ok: false,
          symbol: normalized,
          error: {
            code: 'ticker-not-found',
            message: 'Ticker not found in TastyTrade market data',
          },
        };
      }

      const optionChain = await this.getOptionChain(normalized);
      const callInstruments = Object.values(optionChain)
        .flat()
        .filter(
          (option) => option.option_type === 'C' && option.active !== false && optionSymbol(option),
        );

      if (callInstruments.length === 0) {
        return {
          ok: false,
          symbol: normalized,
          error: {
            code: 'options-unavailable',
            message: 'No TastyTrade call option chain available',
          },
        };
      }

      const loadedOptions = await this.#loadRelevantCallOptions(
        callInstruments,
        settings,
        marketDataPrice(equityQuote),
      );
      const dailyCandlesResult = await this.getDailyCandles(normalized)
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch(() => ({ status: 'rejected' as const }));
      const weeklyCandlesResult = await this.getWeeklyCandles(normalized)
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch(() => ({ status: 'rejected' as const }));
      const dailyCandles =
        dailyCandlesResult.status === 'fulfilled' ? dailyCandlesResult.value : [];
      const weeklyCandles =
        weeklyCandlesResult.status === 'fulfilled' ? weeklyCandlesResult.value : [];

      const optionChainTime =
        loadedOptions
          .map(({ quote }) => quote)
          .map((quote) => quote && marketDataTime(quote))
          .find(Boolean) ??
        marketDataTime(equityQuote) ??
        this.#now().toISOString();

      const calls: OptionContractSnapshot[] = loadedOptions.map(({ option, quote, greek }) => {
        const symbol = optionSymbol(option)!;
        return {
          symbol,
          expiration: expirationToYmd(option.expiration_date) ?? '',
          dte: option.days_to_expiration ?? 0,
          strike: decimalToNumber(option.strike_price) ?? 0,
          bid: decimalToNumber(quote?.bid),
          ask: decimalToNumber(quote?.ask),
          last: decimalToNumber(quote?.last),
          delta: decimalToNumber(greek?.delta) ?? decimalToNumber(quote?.delta),
          quoteTime: quote ? marketDataTime(quote) : undefined,
        };
      });

      const quoteTime = marketDataTime(equityQuote) ?? this.#now().toISOString();
      const latestCandleTime = [...dailyCandles, ...weeklyCandles]
        .map((candle) => dateToIso(candle.time))
        .filter((time): time is string => Boolean(time))
        .sort()
        .at(-1);

      const snapshot: MarketDataSnapshot = {
        symbol: normalized,
        assetType: assetTypeFromEquityMarketData(equityQuote),
        currentPrice: marketDataPrice(equityQuote),
        quoteTime,
        optionChainTime,
        marketStatus: 'open',
        isLastAvailableData: false,
        confirmedNonOptionable: false,
        technicals: buildTechnicals(dailyCandles, weeklyCandles, latestCandleTime),
        calls,
      };

      return { ok: true, snapshot };
    } catch {
      return {
        ok: false,
        symbol: normalized,
        error: {
          code: 'provider-unavailable',
          message: 'TastyTrade market data provider unavailable',
        },
      };
    }
  }
}
