import { ForwardContract, Order } from '@/types/game';
import { GAME_CONFIG } from '@/constants/config';
import { generateId } from './order';
import { calculateForwardRate, calculateContractFee } from './exchange';

export function createForwardContract(
  order: Order,
  spotRate: number,
  amount: number,
  currentRound: number
): { contract: ForwardContract; fee: number } {
  const { FORWARD_CONTRACT_FEE_RATE } = GAME_CONFIG;
  const deliveryRounds = order.deliveryRound - currentRound;
  const forwardRate = calculateForwardRate(spotRate, deliveryRounds);
  const fee = calculateContractFee(amount, forwardRate, FORWARD_CONTRACT_FEE_RATE);

  const contract: ForwardContract = {
    id: generateId(),
    orderId: order.id,
    lockedRate: forwardRate,
    amount,
    maturityRound: order.deliveryRound,
    feeRate: FORWARD_CONTRACT_FEE_RATE,
    status: 'active',
  };

  return { contract, fee };
}

export function calculateSettlementAmount(
  contract: ForwardContract,
  actualRate: number
): number {
  const rateDiff = contract.lockedRate - actualRate;
  return Math.round(contract.amount * rateDiff * 100) / 100;
}

export function getContractsForOrder(
  contracts: ForwardContract[],
  orderId: string
): ForwardContract[] {
  return contracts.filter(c => c.orderId === orderId && c.status === 'active');
}

export function getTotalHedgedAmount(
  contracts: ForwardContract[],
  orderId: string
): number {
  return getContractsForOrder(contracts, orderId).reduce((sum, c) => sum + c.amount, 0);
}
