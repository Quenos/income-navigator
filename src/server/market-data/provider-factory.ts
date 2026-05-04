import { FakeMarketDataProvider } from './fake-market-data-provider';
import type { MarketDataProvider } from './market-data-provider';
import { TastytradeMarketDataProvider } from './tastytrade-provider';

export function createMarketDataProvider(env: NodeJS.ProcessEnv = process.env): MarketDataProvider {
  const provider = env.SCANNER_PROVIDER ?? 'fake';
  if (provider === 'fake') return new FakeMarketDataProvider();
  if (provider === 'tastytrade') return new TastytradeMarketDataProvider();
  throw new Error(`Unsupported SCANNER_PROVIDER: ${provider}`);
}
