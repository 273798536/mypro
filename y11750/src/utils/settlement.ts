import {
  Order,
  ForwardContract,
  CashFlowItem,
  GameEvent,
  RoundRecord,
} from '@/types/game';
import { GAME_CONFIG } from '@/constants/config';
import { shouldCancelOrder, getOrderValueUSD } from './order';
import { calculateSettlementAmount, getTotalHedgedAmount } from './contract';
import { calculateOverHedgingPenalty, calculateOrderValueRMB } from './exchange';

interface SettlementResult {
  cashFlow: CashFlowItem[];
  events: GameEvent[];
  updatedOrders: Order[];
  updatedContracts: ForwardContract[];
  netProfit: number;
  isBankrupt: boolean;
  bankruptReason?: string;
}

export function settleRound(
  currentRound: number,
  activeOrders: Order[],
  activeContracts: ForwardContract[],
  currentCash: number,
  currentInventory: number,
  exchangeRate: number
): SettlementResult {
  const {
    OVER_HEDGING_THRESHOLD,
    OVER_HEDGING_PENALTY_RATE,
    INVENTORY_HOLDING_COST_PER_UNIT,
    ORDER_CANCEL_PENALTY_RATE,
  } = GAME_CONFIG;

  const cashFlow: CashFlowItem[] = [];
  const events: GameEvent[] = [];
  let updatedOrders = [...activeOrders];
  let updatedContracts = [...activeContracts];
  let netProfit = 0;

  const holdingCost = currentInventory * INVENTORY_HOLDING_COST_PER_UNIT;
  cashFlow.push({
    category: 'cost',
    description: `库存持有成本 (${currentInventory}件)`,
    amount: -holdingCost,
  });
  netProfit -= holdingCost;

  const deliveringOrders = updatedOrders.filter(
    o => o.status === 'accepted' && o.deliveryRound === currentRound
  );

  for (const order of deliveringOrders) {
    const orderValueUSD = getOrderValueUSD(order);

    if (shouldCancelOrder(order)) {
      const penalty = Math.round(orderValueUSD * exchangeRate * ORDER_CANCEL_PENALTY_RATE * 100) / 100;
      cashFlow.push({
        category: 'penalty',
        description: `订单取消违约金 (${order.currency} ${orderValueUSD.toFixed(2)})`,
        amount: -penalty,
      });
      netProfit -= penalty;

      events.push({
        type: 'order_cancelled',
        severity: 'warning',
        message: `订单被取消，支付违约金 ¥${penalty.toFixed(2)}`,
        details: {
          orderId: order.id,
          orderValue: orderValueUSD,
          penalty,
          currency: order.currency,
        },
      });

      order.status = 'cancelled';
    } else {
      const revenue = calculateOrderValueRMB(order.amount, order.unitPrice, exchangeRate);
      cashFlow.push({
        category: 'revenue',
        description: `订单收入 ${order.currency} ${orderValueUSD.toFixed(2)}`,
        amount: revenue,
      });
      netProfit += revenue;

      const orderContracts = updatedContracts.filter(
        c => c.orderId === order.id && c.status === 'active'
      );

      for (const contract of orderContracts) {
        const settlement = calculateSettlementAmount(contract, exchangeRate);
        if (settlement >= 0) {
          cashFlow.push({
            category: 'revenue',
            description: `远期合约结算盈利 (锁定汇率: ${contract.lockedRate})`,
            amount: settlement,
          });
        } else {
          cashFlow.push({
            category: 'cost',
            description: `远期合约结算亏损 (锁定汇率: ${contract.lockedRate})`,
            amount: settlement,
          });
        }
        netProfit += settlement;
        contract.status = 'exercised';
      }

      const hedgedAmount = getTotalHedgedAmount(updatedContracts, order.id);
      const maxAllowedHedge = order.amount * OVER_HEDGING_THRESHOLD;

      if (hedgedAmount > maxAllowedHedge) {
        const excessAmount = hedgedAmount - maxAllowedHedge;
        const penalty = calculateOverHedgingPenalty(
          excessAmount,
          order.unitPrice * exchangeRate,
          OVER_HEDGING_PENALTY_RATE
        );
        cashFlow.push({
          category: 'penalty',
          description: `超额锁汇罚款 (超额: ${excessAmount}件)`,
          amount: -penalty,
        });
        netProfit -= penalty;

        events.push({
          type: 'over_hedging',
          severity: 'error',
          message: `锁汇过量，罚款 ¥${penalty.toFixed(2)}`,
          details: {
            orderId: order.id,
            hedgedAmount,
            maxAllowedHedge,
            excessAmount,
            penalty,
          },
        });
      }

      order.status = 'delivered';
    }
  }

  const expiredContracts = updatedContracts.filter(
    c => c.status === 'active' && c.maturityRound <= currentRound
  );
  for (const contract of expiredContracts) {
    contract.status = 'expired';
  }

  const endingCash = currentCash + netProfit;
  let isBankrupt = false;
  let bankruptReason: string | undefined;

  if (endingCash < 0) {
    isBankrupt = true;
    bankruptReason = `现金不足，期末现金为 ¥${endingCash.toFixed(2)}`;
    events.push({
      type: 'cash_shortage',
      severity: 'error',
      message: bankruptReason,
      details: {
        endingCash,
        netProfit,
        currentCash,
      },
    });
  }

  if (events.length === 0) {
    events.push({
      type: 'normal',
      severity: 'info',
      message: '经营正常',
    });
  }

  return {
    cashFlow,
    events,
    updatedOrders,
    updatedContracts,
    netProfit,
    isBankrupt,
    bankruptReason,
  };
}

export function createRoundRecord(
  round: number,
  exchangeRate: number,
  forwardRate: number,
  orders: Order[],
  contracts: ForwardContract[],
  cashFlow: CashFlowItem[],
  events: GameEvent[],
  netProfit: number,
  endingCash: number,
  endingInventory: number
): RoundRecord {
  return {
    round,
    exchangeRate,
    forwardRate,
    orders: JSON.parse(JSON.stringify(orders)),
    contracts: JSON.parse(JSON.stringify(contracts)),
    cashFlow: JSON.parse(JSON.stringify(cashFlow)),
    events: JSON.parse(JSON.stringify(events)),
    netProfit,
    endingCash,
    endingInventory,
  };
}
