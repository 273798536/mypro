import { ReplayCommandEntity } from './ReplayCommand';
export declare class ReplaySessionEntity {
    id: string;
    name: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed';
    commands: ReplayCommandEntity[];
    createdBy: string;
}
