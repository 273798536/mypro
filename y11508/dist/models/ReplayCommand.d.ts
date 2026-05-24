import { ReplaySessionEntity } from './ReplaySession';
export declare class ReplayCommandEntity {
    id: string;
    sessionId: string;
    session: ReplaySessionEntity;
    order: number;
    type: 'http' | 'db' | 'script';
    content: string;
    result?: string;
    executedAt?: Date;
    duration?: number;
}
