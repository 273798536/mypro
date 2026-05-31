import type { Order } from '../types/order';
import type { QueueScheduler } from '../types/queue';

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function priorityScheduler(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.patience - b.patience;
  });
}

export function fifoScheduler(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => a.createdAt - b.createdAt);
}

export function lifoScheduler(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}

export function scheduleOrders(orders: Order[], scheduler: QueueScheduler): Order[] {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  
  switch (scheduler) {
    case 'priority':
      return priorityScheduler(pendingOrders);
    case 'fifo':
      return fifoScheduler(pendingOrders);
    case 'lifo':
      return lifoScheduler(pendingOrders);
    default:
      return priorityScheduler(pendingOrders);
  }
}

export function getNextOrder(orders: Order[], scheduler: QueueScheduler): Order | undefined {
  const scheduled = scheduleOrders(orders, scheduler);
  return scheduled[0];
}
