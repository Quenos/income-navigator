import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ['coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'tastytrade-ts-sdk',
              message:
                'Use the read-only SDK entrypoint from src/server/market-data/tastytrade-provider.ts only.',
            },
            {
              name: 'tastytrade-ts-sdk/account',
              message: 'Account APIs are outside the read-only scanner MVP boundary.',
            },
            {
              name: 'tastytrade-ts-sdk/order',
              message: 'Order APIs are forbidden in the read-only scanner MVP.',
            },
            {
              name: 'tastytrade-ts-sdk/paper',
              message: 'Paper trading APIs are forbidden in the read-only scanner MVP.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
