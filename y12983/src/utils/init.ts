import { hasInitialized, markInitialized } from '@/utils/storage';
import { gapService } from '@/services/gapService';
import { snapshotService } from '@/services/snapshotService';
import { auditService } from '@/services/auditService';
import { historyService } from '@/services/historyService';

export const initializeApp = (): void => {
  if (hasInitialized()) {
    return;
  }

  gapService.resetToMock();
  snapshotService.resetToMock();
  auditService.resetToMock();
  historyService.resetToMock();

  markInitialized();
};

export const resetAllData = (): void => {
  gapService.resetToMock();
  snapshotService.resetToMock();
  auditService.resetToMock();
  historyService.resetToMock();
};
