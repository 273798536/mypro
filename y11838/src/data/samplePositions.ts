import type { FundPosition } from '@/types';

export const completePositions: FundPosition[] = [
  {
    id: 'pos-001',
    industryCardId: 'ind-001',
    weight: 0.25,
    cost: 250000,
    currentValue: 262500,
    shares: 10000,
  },
  {
    id: 'pos-002',
    industryCardId: 'ind-002',
    weight: 0.2,
    cost: 200000,
    currentValue: 210000,
    shares: 8000,
  },
  {
    id: 'pos-003',
    industryCardId: 'ind-003',
    weight: 0.2,
    cost: 200000,
    currentValue: 204000,
    shares: 5000,
  },
  {
    id: 'pos-004',
    industryCardId: 'ind-004',
    weight: 0.2,
    cost: 200000,
    currentValue: 202000,
    shares: 4000,
  },
  {
    id: 'pos-005',
    industryCardId: 'ind-005',
    weight: 0.15,
    cost: 150000,
    currentValue: 151500,
    shares: 3000,
  },
];

export const incompletePositions: FundPosition[] = [
  {
    id: 'pos-001',
    industryCardId: 'ind-001',
    weight: 0.25,
    cost: 0,
    currentValue: 262500,
    shares: 10000,
  },
  {
    id: 'pos-002',
    industryCardId: 'ind-002',
    weight: 0.2,
    cost: 200000,
    currentValue: 210000,
    shares: 0,
  },
  {
    id: 'pos-003',
    industryCardId: 'ind-003',
    weight: 0,
    cost: 200000,
    currentValue: 204000,
    shares: 5000,
  },
  {
    id: 'pos-004',
    industryCardId: 'ind-004',
    weight: 0.2,
    cost: 200000,
    currentValue: 0,
    shares: 4000,
  },
  {
    id: 'pos-005',
    industryCardId: 'ind-005',
    weight: 0.15,
    cost: 150000,
    currentValue: 151500,
    shares: 3000,
  },
];

export const samplePositions = completePositions;
