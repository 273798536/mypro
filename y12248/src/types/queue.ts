export type QueueScheduler = 'priority' | 'fifo' | 'lifo';

export interface SchedulerConfig {
  name: string;
  description: string;
}

export const SCHEDULER_CONFIG: Record<QueueScheduler, SchedulerConfig> = {
  priority: {
    name: '优先级调度',
    description: '按紧急程度处理，可能饿死低优先级订单',
  },
  fifo: {
    name: '先进先出',
    description: '按订单顺序公平处理，紧急订单可能超时',
  },
  lifo: {
    name: '后进先出',
    description: '新订单优先处理，老订单容易超时',
  },
};
