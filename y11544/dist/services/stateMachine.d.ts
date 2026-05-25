import { MaterialStatus } from '../types';
export declare class StateMachine {
    canTransition(from: MaterialStatus | null, to: MaterialStatus, role: string): boolean;
    getValidTransitions(currentStatus: MaterialStatus | null, role: string): MaterialStatus[];
    isTerminalStatus(status: MaterialStatus): boolean;
    validateTransition(from: MaterialStatus | null, to: MaterialStatus, role: string): void;
}
export declare const stateMachine: StateMachine;
