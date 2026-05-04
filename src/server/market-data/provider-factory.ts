import { FakeMarketDataProvider } from './fake-market-data-provider';
import type { MarketDataProvider } from './market-data-provider';
import { TastytradeMarketDataProvider } from './tastytrade-provider';

export interface ProviderFactoryEnv {
  SCANNER_PROVIDER?: string;
  TASTYTRADE_PROVIDER_SECRET?: string;
  TASTYTRADE_REFRESH_TOKEN?: string;
  TASTYTRADE_IS_TEST?: string;
}

export function createMarketDataProvider(
  env: ProviderFactoryEnv = process.env as unknown as ProviderFactoryEnv,
): MarketDataProvider {
  const provider = env.SCANNER_PROVIDER ?? 'fake';
  if (provider === 'fake') return new FakeMarketDataProvider({ failingSymbols: ['BAD', 'UNAVL'] });
  if (provider === 'tastytrade') {
    if (!env.TASTYTRADE_PROVIDER_SECRET) {
      throw new Error('TastyTrade provider is not configured');
    }
    return new TastytradeMarketDataProvider({
      providerSecret: env.TASTYTRADE_PROVIDER_SECRET,
      refreshToken: env.TASTYTRADE_REFRESH_TOKEN,
      isTest: env.TASTYTRADE_IS_TEST !== 'false',
    });
  }
  throw new Error(`Unsupported SCANNER_PROVIDER: ${provider}`);
}
