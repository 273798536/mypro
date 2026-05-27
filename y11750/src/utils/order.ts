import { Order, Currency } from '@/types/game';
import { GAME_CONFIG } from '@/constants/config';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateOrders(currentRound: number, maxRounds: number): Order[] {
  const {
    MAX_ORDERS_PER_ROUND,
    MIN_ORDER_AMOUNT,
    MAX_ORDER_AMOUNT,
    ORDER_PRICE_MIN,
    ORDER_PRICE_MAX,
  } = GAME_CONFIG;

  const orderCount = Math.floor(Math.random() * MAX_ORDERS_PER_ROUND) + 1;
  const orders: Order[] = [];
  const currencies: Currency[] = ['USD', 'EUR'];

  for (let i = 0; i < orderCount; i++) {
    const remainingRounds = maxRounds - currentRound;
    const maxDeliveryDelay = Math.min(remainingRounds, 3);
    const deliveryDelay = Math.floor(Math.random() * maxDeliveryDelay) + 1;

    const order: Order = {
      id: generateId(),
      amount: Math.floor(Math.random() * (MAX_ORDER_AMOUNT - MIN_ORDER_AMOUNT + 1)) + MIN_ORDER_AMOUNT,
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      deliveryRound: currentRound + deliveryDelay,
      unitPrice: Math.floor(Math.random() * (ORDER_PRICE_MAX - ORDER_PRICE_MIN + 1)) + ORDER_PRICE_MIN,
      status: 'pending',
      cancelProbability: Math.round(Math.random() * 30) / 100,
    };
    orders.push(order);
  }

  return orders;
}

export function shouldCancelOrder(order: Order): boolean {
  return Math.random() < order.cancelProbability;
}

export function getOrderValueUSD(order: Order): number {
  return order.amount * order.unitPrice;
}
