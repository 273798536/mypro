import { createMachine, createActor } from 'xstate';
import batchRepository from '../repositories/BatchRepository';
import documentRepository from '../repositories/DocumentRepository';
import type { BatchStatus, DocumentStatus, ReviewDecision } from '../../shared/types';

class StateMachineService {
  private batchTransitions: Record<string, Record<string, BatchStatus>> = {
    DRAFT: {
      SUBMIT: 'PENDING_REVIEW'
    },
    PENDING_REVIEW: {
      START_REVIEW: 'UNDER_REVIEW'
    },
    UNDER_REVIEW: {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      MODIFY: 'DRAFT'
    },
    APPROVED: {
      FREEZE: 'FROZEN',
      ARCHIVE: 'ARCHIVED'
    },
    REJECTED: {
      RESUBMIT: 'PENDING_REVIEW'
    },
    FROZEN: {
      UNFREEZE: 'APPROVED',
      SETTLE: 'SETTLED'
    },
    SETTLED: {
      ARCHIVE: 'ARCHIVED'
    },
    ARCHIVED: {}
  };

  private documentTransitions: Record<string, Record<string, DocumentStatus>> = {
    DRAFT: {
      SUBMIT: 'PENDING_REVIEW'
    },
    PENDING_REVIEW: {
      START_REVIEW: 'UNDER_REVIEW'
    },
    UNDER_REVIEW: {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      MODIFY: 'MODIFIED'
    },
    APPROVED: {
      FREEZE: 'FROZEN',
      ARCHIVE: 'ARCHIVED'
    },
    REJECTED: {
      RESUBMIT: 'PENDING_REVIEW'
    },
    MODIFIED: {
      SUBMIT: 'PENDING_REVIEW'
    },
    FROZEN: {
      UNFREEZE: 'APPROVED'
    },
    ARCHIVED: {}
  };

  private batchMachine = createMachine({
    id: 'batch',
    initial: 'DRAFT',
    states: {
      DRAFT: { on: { SUBMIT: 'PENDING_REVIEW' } },
      PENDING_REVIEW: { on: { START_REVIEW: 'UNDER_REVIEW' } },
      UNDER_REVIEW: { on: { APPROVE: 'APPROVED', REJECT: 'REJECTED', MODIFY: 'DRAFT' } },
      APPROVED: { on: { FREEZE: 'FROZEN', ARCHIVE: 'ARCHIVED' } },
      REJECTED: { on: { RESUBMIT: 'PENDING_REVIEW' } },
      FROZEN: { on: { UNFREEZE: 'APPROVED', SETTLE: 'SETTLED' } },
      SETTLED: { on: { ARCHIVE: 'ARCHIVED' } },
      ARCHIVED: { type: 'final' as const }
    }
  });

  private documentMachine = createMachine({
    id: 'document',
    initial: 'PENDING_REVIEW',
    states: {
      DRAFT: { on: { SUBMIT: 'PENDING_REVIEW' } },
      PENDING_REVIEW: { on: { START_REVIEW: 'UNDER_REVIEW' } },
      UNDER_REVIEW: { on: { APPROVE: 'APPROVED', REJECT: 'REJECTED', MODIFY: 'MODIFIED' } },
      APPROVED: { on: { FREEZE: 'FROZEN', ARCHIVE: 'ARCHIVED' } },
      REJECTED: { on: { RESUBMIT: 'PENDING_REVIEW' } },
      MODIFIED: { on: { SUBMIT: 'PENDING_REVIEW' } },
      FROZEN: { on: { UNFREEZE: 'APPROVED' } },
      ARCHIVED: { type: 'final' as const }
    }
  });

  transitionBatch(batchId: string, event: string, operatedBy: string, reason?: string) {
    const batch = batchRepository.findById(batchId);
    if (!batch) throw new Error('Batch not found');

    const currentStatus = batch.status as string;
    const targetStatus = this.batchTransitions[currentStatus]?.[event];
    
    if (!targetStatus) {
      throw new Error(`Invalid state transition: ${batch.status} -> ${event}`);
    }

    return batchRepository.update(
      batchId,
      { status: targetStatus },
      operatedBy,
      reason || `状态变更: ${batch.status} → ${targetStatus}`
    );
  }

  transitionDocument(documentId: string, event: string, operatedBy: string, reason?: string) {
    const doc = documentRepository.findById(documentId);
    if (!doc) throw new Error('Document not found');

    const currentStatus = doc.status as string;
    const targetStatus = this.documentTransitions[currentStatus]?.[event];
    
    if (!targetStatus) {
      throw new Error(`Invalid state transition: ${doc.status} -> ${event}`);
    }

    return documentRepository.updateStatus(
      documentId,
      targetStatus,
      reason,
      operatedBy,
      reason || `状态变更: ${doc.status} → ${targetStatus}`
    );
  }

  reviewDocument(documentId: string, decision: ReviewDecision, reason: string, operatedBy: string, modifiedData?: Record<string, any>) {
    const doc = documentRepository.findById(documentId);
    if (!doc) throw new Error('Document not found');

    if (decision === 'MODIFY' && modifiedData) {
      return documentRepository.updateData(documentId, modifiedData, operatedBy, reason);
    }

    const eventMap: Record<ReviewDecision, string> = {
      APPROVE: 'APPROVE',
      REJECT: 'REJECT',
      MODIFY: 'MODIFY'
    };

    if (doc.status !== 'UNDER_REVIEW') {
      const currentStatus = doc.status as string;
      const midStatus = this.documentTransitions[currentStatus]?.['START_REVIEW'];
      if (midStatus) {
        documentRepository.updateStatus(
          documentId,
          midStatus,
          '自动进入复核中状态',
          operatedBy,
          '开始复核'
        );
      }
    }

    return this.transitionDocument(documentId, eventMap[decision], operatedBy, reason);
  }

  canTransitionBatch(state: string, event: string): boolean {
    return !!this.batchTransitions[state]?.[event];
  }

  canTransitionDocument(state: string, event: string): boolean {
    return !!this.documentTransitions[state]?.[event];
  }

  canTransition(state: string, event: string): boolean {
    return this.canTransitionBatch(state, event) || this.canTransitionDocument(state, event);
  }
}

export default new StateMachineService();
