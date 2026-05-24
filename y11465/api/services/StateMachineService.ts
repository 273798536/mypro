import { createMachine, createActor } from 'xstate';
import batchRepository from '../repositories/BatchRepository';
import documentRepository from '../repositories/DocumentRepository';
import type { BatchStatus, DocumentStatus, ReviewDecision } from '../../shared/types';

class StateMachineService {
  private batchMachine = createMachine({
    id: 'batch',
    initial: 'DRAFT',
    states: {
      DRAFT: {
        on: {
          SUBMIT: 'PENDING_REVIEW'
        }
      },
      PENDING_REVIEW: {
        on: {
          START_REVIEW: 'UNDER_REVIEW'
        }
      },
      UNDER_REVIEW: {
        on: {
          APPROVE: 'APPROVED',
          REJECT: 'REJECTED',
          MODIFY: 'DRAFT'
        }
      },
      APPROVED: {
        on: {
          FREEZE: 'FROZEN',
          ARCHIVE: 'ARCHIVED'
        }
      },
      REJECTED: {
        on: {
          RESUBMIT: 'PENDING_REVIEW'
        }
      },
      FROZEN: {
        on: {
          UNFREEZE: 'APPROVED',
          SETTLE: 'SETTLED'
        }
      },
      SETTLED: {
        on: {
          ARCHIVE: 'ARCHIVED'
        }
      },
      ARCHIVED: {
        type: 'final'
      }
    }
  });

  private documentMachine = createMachine({
    id: 'document',
    initial: 'PENDING_REVIEW',
    states: {
      DRAFT: {
        on: {
          SUBMIT: 'PENDING_REVIEW'
        }
      },
      PENDING_REVIEW: {
        on: {
          START_REVIEW: 'UNDER_REVIEW'
        }
      },
      UNDER_REVIEW: {
        on: {
          APPROVE: 'APPROVED',
          REJECT: 'REJECTED',
          MODIFY: 'MODIFIED'
        }
      },
      APPROVED: {
        on: {
          FREEZE: 'FROZEN',
          ARCHIVE: 'ARCHIVED'
        }
      },
      REJECTED: {
        on: {
          RESUBMIT: 'PENDING_REVIEW'
        }
      },
      MODIFIED: {
        on: {
          SUBMIT: 'PENDING_REVIEW'
        }
      },
      FROZEN: {
        on: {
          UNFREEZE: 'APPROVED'
        }
      },
      ARCHIVED: {
        type: 'final'
      }
    }
  });

  transitionBatch(batchId: string, event: string, operatedBy: string, reason?: string) {
    const batch = batchRepository.findById(batchId);
    if (!batch) throw new Error('Batch not found');

    const actor = createActor(this.batchMachine, {
      snapshot: { value: batch.status } as any
    });
    actor.start();

    try {
      actor.send({ type: event });
      const newState = actor.getSnapshot().value as BatchStatus;
      
      return batchRepository.update(batchId, { status: newState }, operatedBy, reason || `状态变更: ${event}`);
    } catch (error) {
      throw new Error(`Invalid state transition: ${batch.status} -> ${event}`);
    } finally {
      actor.stop();
    }
  }

  transitionDocument(documentId: string, event: string, operatedBy: string, reason?: string) {
    const doc = documentRepository.findById(documentId);
    if (!doc) throw new Error('Document not found');

    const actor = createActor(this.documentMachine, {
      snapshot: { value: doc.status } as any
    });
    actor.start();

    try {
      actor.send({ type: event });
      const newState = actor.getSnapshot().value as DocumentStatus;
      
      return documentRepository.updateStatus(documentId, newState, reason, operatedBy, reason);
    } catch (error) {
      throw new Error(`Invalid state transition: ${doc.status} -> ${event}`);
    } finally {
      actor.stop();
    }
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

    return this.transitionDocument(documentId, eventMap[decision], operatedBy, reason);
  }

  canTransition(state: string, event: string): boolean {
    try {
      const actor = createActor(this.batchMachine, {
        snapshot: { value: state } as any
      });
      actor.start();
      actor.send({ type: event });
      actor.stop();
      return true;
    } catch {
      return false;
    }
  }
}

export default new StateMachineService();
