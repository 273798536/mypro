import { ChangeHistoryRepository } from '../db/repositories/ChangeHistoryRepository.js';
import type { HistoryAction, HistoryTargetType } from '../../shared/types.js';

export const HistoryService = {
  recordChange(data: {
    inspectionId: string;
    batchId: string;
    operator: string;
    action: HistoryAction;
    targetType: HistoryTargetType;
    targetId: string;
    reason?: string;
    beforeValue?: Record<string, unknown>;
    afterValue?: Record<string, unknown>;
  }) {
    return ChangeHistoryRepository.create(data);
  },
};
