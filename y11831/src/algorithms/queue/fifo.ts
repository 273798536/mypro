import { Order } from '../../types/game';

export class FIFOQueue {
  private queue: Order[] = [];

  enqueue(order: Order): void {
    this.queue.push(order);
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
    this.queue.sort((a, b) => a.arriveTime - b.arriveTime);
  }

  getAll(): Order[] {
    return [...this.queue];
  }

  remove(orderId: string): void {
    this.queue = this.queue.filter(o => o.id !== orderId);
  }
}
