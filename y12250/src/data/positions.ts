import type { Position } from '../engine/types';

export const POSITIONS: Position[] = [
  {
    id: 'pos-001',
    source: 'Aave V3 Ethereum',
    version: 'v3.0.1',
    debtAmount: 10000,
    debtAsset: 'USDC',
    collaterals: [
      {
        id: 'col-001',
        asset: 'ETH',
        amount: 5,
        source: 'Aave V3',
        version: 'v3.0.1',
      },
    ],
    oracle: {
      id: 'oracle-001',
      asset: 'ETH',
      price: 3000,
      source: 'Chainlink',
      version: 'v0.8',
      volatility: 0.15,
    },
    createdAt: 1717209600000,
  },
  {
    id: 'pos-002',
    source: 'Compound V3',
    version: 'v3.1.0',
    debtAmount: 50000,
    debtAsset: 'USDT',
    collaterals: [
      {
        id: 'col-002',
        asset: 'WETH',
        amount: 20,
        source: 'Compound V3',
        version: 'v3.1.0',
      },
      {
        id: 'col-003',
        asset: 'WBTC',
        amount: 1,
        source: 'Compound V3',
        version: 'v3.1.0',
      },
    ],
    oracle: {
      id: 'oracle-002',
      asset: 'WETH',
      price: 3200,
      source: 'Pyth Network',
      version: 'v2.0',
      volatility: 0.2,
    },
    createdAt: 1717296000000,
  },
  {
    id: 'pos-003',
    source: 'MakerDAO',
    version: 'v1.2.0',
    debtAmount: 25000,
    debtAsset: 'DAI',
    collaterals: [
      {
        id: 'col-004',
        asset: 'ETH',
        amount: 12,
        source: 'MakerDAO Vault',
        version: 'v1.2.0',
      },
    ],
    oracle: {
      id: 'oracle-003',
      asset: 'ETH',
      price: 2800,
      source: 'Chainlink',
      version: 'v0.8',
      volatility: 0.25,
    },
    createdAt: 1717382400000,
  },
];

export function getPositionById(id: string): Position | undefined {
  return POSITIONS.find((p) => p.id === id);
}
