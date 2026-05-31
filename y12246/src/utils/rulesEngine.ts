import { CashFlowCell, AnnouncementEvent, OperationTrace } from '../types';

export const checkConflict = (
  bondCardInfo: string,
  cashFlowInfo: string,
  eventInfo: string
): { hasConflict: boolean; details: string } | null => {
  const sources = [
    { source: 'bond_card', info: bondCardInfo },
    { source: 'cash_flow', info: cashFlowInfo },
    { source: 'announcement', info: eventInfo },
  ].filter(s => s.info);

  if (sources.length < 2) return null;

  const uniqueInfos = new Set(sources.map(s => s.info));
  if (uniqueInfos.size > 1) {
    return {
      hasConflict: true,
      details: `信息冲突：${sources.map(s => `${s.source}: ${s.info}`).join(' vs ')}`,
    };
  }

  return null;
};

export const applyEventToCashFlow = (
  cashFlows: CashFlowCell[],
  event: AnnouncementEvent,
  selectedOption: number
): { updatedCashFlows: CashFlowCell[]; trace: OperationTrace; isCorrect: boolean } => {
  const isCorrect = selectedOption === event.correctOptionIndex;
  const updatedCashFlows = [...cashFlows];

  let traceContent = '';
  let traceDetails = '';

  switch (event.type) {
    case 'interest_delay':
      if (event.relatedCashFlowId && isCorrect) {
        const cfIndex = updatedCashFlows.findIndex(cf => cf.id === event.relatedCashFlowId);
        if (cfIndex !== -1) {
          updatedCashFlows[cfIndex] = {
            ...updatedCashFlows[cfIndex],
            date: '2024-03-18',
            status: 'delayed',
          };
        }
        traceContent = `正确处理付息顺延：${event.title}`;
        traceDetails = '付息日期已更新为顺延日期，状态标记为"顺延"';
      } else {
        traceContent = `错误处理付息顺延：${event.title}`;
        traceDetails = `选择了错误的操作：${event.options[selectedOption]}`;
      }
      break;

    case 'put_notice':
    case 'put_deadline':
      if (event.relatedCashFlowId) {
        const cfIndex = updatedCashFlows.findIndex(cf => cf.id === event.relatedCashFlowId);
        if (cfIndex !== -1) {
          if (isCorrect) {
            updatedCashFlows[cfIndex] = {
              ...updatedCashFlows[cfIndex],
              status: 'put_option',
              isSelected: true,
            };
            traceContent = `正确处理回售选择：${event.title}`;
            traceDetails = '已选择行使回售权';
          } else {
            updatedCashFlows[cfIndex] = {
              ...updatedCashFlows[cfIndex],
              status: 'missed',
              isSelected: false,
            };
            traceContent = `回售选择处理：${event.title}`;
            traceDetails = `选择了：${event.options[selectedOption]}`;
          }
        }
      }
      break;

    case 'default_warning':
      if (isCorrect) {
        updatedCashFlows.forEach((cf, index) => {
          if (cf.type === 'coupon' || cf.type === 'put') {
            updatedCashFlows[index] = { ...cf, status: 'default' };
          }
        });
        traceContent = `正确标记违约：${event.title}`;
        traceDetails = '相关现金流已标记为违约状态';
      } else {
        traceContent = `违约标记处理：${event.title}`;
        traceDetails = `选择了：${event.options[selectedOption]}`;
      }
      break;

    case 'revoke_default':
      if (isCorrect) {
        updatedCashFlows.forEach((cf, index) => {
          if (cf.status === 'default') {
            updatedCashFlows[index] = { ...cf, status: 'confirmed', actualAmount: cf.expectedAmount };
          }
        });
        traceContent = `正确撤销违约标记：${event.title}`;
        traceDetails = '违约状态已撤销，更新为已确认';
      } else {
        traceContent = `撤销违约处理：${event.title}`;
        traceDetails = `选择了：${event.options[selectedOption]}`;
      }
      break;

    case 'payment_confirmation':
      if (isCorrect) {
        if (event.relatedCashFlowId) {
          const cfIndex = updatedCashFlows.findIndex(cf => cf.id === event.relatedCashFlowId);
          if (cfIndex !== -1) {
            updatedCashFlows[cfIndex] = {
              ...updatedCashFlows[cfIndex],
              status: 'confirmed',
              actualAmount: updatedCashFlows[cfIndex].expectedAmount,
            };
          }
        }
        traceContent = `正确确认兑付：${event.title}`;
        traceDetails = '现金流状态已更新为已确认';
      } else {
        traceContent = `兑付确认处理：${event.title}`;
        traceDetails = `选择了：${event.options[selectedOption]}`;
      }
      break;

    default:
      traceContent = `处理事件：${event.title}`;
      traceDetails = `选择了：${event.options[selectedOption]}`;
  }

  const trace: OperationTrace = {
    id: `trace-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: isCorrect ? 'system_judge' : 'user_action',
    content: traceContent,
    source: 'system',
    isCorrect,
    details: traceDetails,
  };

  return { updatedCashFlows, trace, isCorrect };
};

export const calculateScore = (
  totalEvents: number,
  correctAnswers: number,
  isGameComplete: boolean
): number => {
  if (totalEvents === 0) return 0;
  const baseScore = (correctAnswers / totalEvents) * 100;
  const completionBonus = isGameComplete ? 10 : 0;
  return Math.min(100, Math.round(baseScore + completionBonus));
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    confirmed: 'bg-green-100 text-green-700',
    delayed: 'bg-amber-100 text-amber-700',
    default: 'bg-red-100 text-red-700',
    put_option: 'bg-blue-100 text-blue-700',
    missed: 'bg-orange-100 text-orange-700',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-600';
};

export const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    delayed: '已顺延',
    default: '违约',
    put_option: '回售选择',
    missed: '已放弃',
  };
  return textMap[status] || status;
};

export const getEventTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    interest_delay: '📅',
    put_notice: '📋',
    put_deadline: '⏰',
    default_warning: '⚠️',
    revoke_default: '✅',
    payment_confirmation: '💰',
  };
  return iconMap[type] || '📢';
};
