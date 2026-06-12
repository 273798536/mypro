import { useCallback } from 'react';
import type { PointStatus, ActionType } from '@/types';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useViewStore } from '@/store/useViewStore';
import { useOrphanStore } from '@/store/useOrphanStore';
import { STATUS_LABELS } from '@/types';

const OPERATOR = '当前用户';

export function useHistory() {
  const { addRecord } = useHistoryStore();
  const { getCurrentViewCondition } = useViewStore();
  const { addScreenshot: addOrphanScreenshot } = useOrphanStore();

  const logStatusChange = useCallback((
    pointId: string,
    oldStatus: PointStatus,
    newStatus: PointStatus,
    remark?: string
  ) => {
    const viewCondition = getCurrentViewCondition();
    addRecord(pointId, OPERATOR, 'update_status', {
      oldValue: STATUS_LABELS[oldStatus],
      newValue: STATUS_LABELS[newStatus],
      remark,
      viewCondition,
    });
  }, [addRecord, getCurrentViewCondition]);

  const logRemark = useCallback((
    pointId: string,
    remark: string
  ) => {
    addRecord(pointId, OPERATOR, 'add_remark', {
      newValue: remark,
      remark,
    });
  }, [addRecord]);

  const logJudgment = useCallback((
    pointId: string,
    oldValue: string,
    newValue: string,
    remark: string
  ) => {
    const viewCondition = getCurrentViewCondition();
    addRecord(pointId, OPERATOR, 'modify_judgment', {
      oldValue,
      newValue,
      remark,
      viewCondition,
    });
  }, [addRecord, getCurrentViewCondition]);

  const logScreenshot = useCallback((
    pointId: string,
    imageUrl: string,
    hasViewCondition: boolean = true,
    remark?: string
  ) => {
    const viewCondition = getCurrentViewCondition();
    
    if (hasViewCondition) {
      addRecord(pointId, OPERATOR, 'add_screenshot', {
        screenshot: imageUrl,
        remark,
        viewCondition,
      });
    } else {
      addRecord(pointId, OPERATOR, 'add_screenshot', {
        screenshot: imageUrl,
        remark,
      });
      addOrphanScreenshot(pointId, imageUrl, '上传时未记录视图条件');
    }
  }, [addRecord, getCurrentViewCondition, addOrphanScreenshot]);

  return {
    logStatusChange,
    logRemark,
    logJudgment,
    logScreenshot,
  };
}
