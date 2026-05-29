import { Order } from '../../types/game';

export class PriorityQueue {
  private queue: Order[] = [];

  private getPriorityValue(priority: Order['priority']): number {
    switch (priority) {
      case 'super_vip': return 3;
      case 'vip': return 2;
      case 'normal': return 1;
      default: return 1;
    }
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
      const priorityA = this.getPriorityValue(a.priority);
      const priorityB = this.getPriorityValue(b.priority);
      
      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }
      
      return a.arriveTime - b.arriveTime;
    });
  }

  getAll(): Order[] {
    return [...this.queue];
  }

  remove(orderId: string): void {
    this.queue = this.queue.filter(o => o.id !== orderId);
  }
}
