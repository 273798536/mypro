import { Queue, QueueEvents } from 'bullmq';
export declare const signinQueue: Queue<any, any, string, any, any, string>;
export declare const queueEvents: QueueEvents;
export declare function closeQueue(): Promise<void>;
