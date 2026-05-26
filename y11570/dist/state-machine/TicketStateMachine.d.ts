import { Ticket, TicketStatus, AssignmentType, TimeoutRecord, FrozenType, SLARule, CompensationRule } from '../types';
import TicketDao from '../daos/TicketDao';
export declare class InvalidStateTransitionError extends Error {
    constructor(from: TicketStatus, to: TicketStatus);
}
export declare class TicketStateMachine {
    private static readonly VALID_TRANSITIONS;
    private dao;
    constructor(dao: TicketDao);
    canTransition(from: TicketStatus, to: TicketStatus): boolean;
    transition(ticketId: string, toStatus: TicketStatus, reason: string, operatorId: string, operatorName?: string, metadata?: Record<string, any>): Promise<Ticket>;
    reassignTicket(ticketId: string, toAgentId: string, assignmentType: AssignmentType, reason: string, operatorId: string, slaRule?: SLARule): Promise<Ticket>;
    checkForTimeout(ticketId: string, slaRule: SLARule): Promise<TimeoutRecord[]>;
    private calculateBlameLevel;
    calculateAgentTimeoutResponsibility(ticketId: string): Promise<Map<string, number>>;
    calculateCompensation(ticketId: string, compensationRules: CompensationRule[], baseAmount?: number): Promise<number>;
    requestCompensation(ticketId: string, requestedAmount: number, reason: string, operatorId: string): Promise<Ticket>;
    reviewCompensation(ticketId: string, approvalId: string, approved: boolean, approvedAmount: number | undefined, reason: string, operatorId: string): Promise<Ticket>;
    freezeTicket(ticketId: string, frozenType: FrozenType, reason: string, operatorId: string): Promise<Ticket>;
    unfreezeTicket(ticketId: string, reason: string, operatorId: string): Promise<Ticket>;
    settleTicket(ticketId: string, reason: string, operatorId: string): Promise<Ticket>;
    archiveTicket(ticketId: string, reason: string, operatorId: string): Promise<Ticket>;
    getTicketDetail(ticketId: string): Promise<Ticket>;
    calculateFullResponsibility(ticketId: string): Promise<any>;
    private calculateAssignmentResponsibility;
    private summarizeTimeoutResponsibility;
    private calculateCompensationResponsibility;
    private findCompensationStuckStep;
    private calculateInventoryResponsibility;
    private generateResponsibilitySummary;
    unarchiveTicket(ticketId: string, reason: string, operatorId: string): Promise<Ticket>;
    reviewTicket(ticketId: string, reviewResult: 'approved' | 'rejected' | 'escalated', reviewComments: string, operatorId: string): Promise<Ticket>;
    overrideTicket(ticketId: string, toStatus: TicketStatus, overrideReason: string, newCompensation?: number, operatorId?: string): Promise<Ticket>;
}
export default TicketStateMachine;
