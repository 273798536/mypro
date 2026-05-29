import { Order } from '../../types/game';

export class SJFQueue {
  private queue: Order[] = [];

  private getTotalPrepTime(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.prepTime * item.quantity, 0);
  }

  enqueue(order: Order): void {
    this.queue.push(order);
    this.reorder();
  }

  dequeue(): Order | undefined {
    return this.queue.shift();
  }

  peek(): Order | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  reorder(): void {
    this.queue.sort((a, b) => {
      const prepA = this.getTotalPrepTime(a);
      const prepB = this.getTotalPrepTime(b);
      return prepA - prepB;
    });
  }

  getAll(): Order[] {
    return [...this.queue];
  }

  remove(orderId: string): void {
    this.queue = this.queue.filter(o => o.id !== orderId);
  }
}
