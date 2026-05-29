import { clickLogDAO } from '../dao/clickLogDAO.js';
import { conversionOrderDAO } from '../dao/conversionOrderDAO.js';
import { impressionLogDAO } from '../dao/impressionLogDAO.js';
import type {
  ClickLog,
  ConversionOrder,
  DeductionRule,
  DeductionItem,
  SettlementDetail,
} from '../../shared/types/index.js';

const IP_FREQUENCY_THRESHOLD = 100;
const IP_FREQUENCY_WINDOW_MINUTES = 60;
const MIN_CLICK_INTERVAL_MS = 100;
const DUPLICATE_CONVERSION_WINDOW_MINUTES = 30;

export const deductionService = {
  detectClickAnomaly(clickLogs: ClickLog[]): { clickId: string; reason: string }[] {
    const anomalies: { clickId: string; reason: string }[] = [];

    if (clickLogs.length === 0) {
      return anomalies;
    }

    const ipClickMap = new Map<string, ClickLog[]>();
    for (const click of clickLogs) {
      if (!ipClickMap.has(click.ip)) {
        ipClickMap.set(click.ip, []);
      }
      ipClickMap.get(click.ip)!.push(click);
    }

    for (const [ip, clicks] of ipClickMap) {
      if (clicks.length > IP_FREQUENCY_THRESHOLD) {
        const windowStart = new Date(clicks[0].clickTime).getTime();
        const windowEnd = windowStart + IP_FREQUENCY_WINDOW_MINUTES * 60 * 1000;
        
        const windowClicks = clicks.filter(c => {
          const t = new Date(c.clickTime).getTime();
          return t >= windowStart && t <= windowEnd;
        });

        if (windowClicks.length > IP_FREQUENCY_THRESHOLD) {
          for (const click of windowClicks) {
            anomalies.push({
              clickId: click.id,
              reason: `IP高频点击: IP=${ip}, ${IP_FREQUENCY_WINDOW_MINUTES}分钟内${windowClicks.length}次点击，超过阈值${IP_FREQUENCY_THRESHOLD}`,
            });
          }
        }
      }
    }

    const sortedClicks = [...clickLogs].sort((a, b) => {
      return new Date(a.clickTime).getTime() - new Date(b.clickTime).getTime();
    });

    for (let i = 1; i < sortedClicks.length; i++) {
      const prevTime = new Date(sortedClicks[i - 1].clickTime).getTime();
      const currTime = new Date(sortedClicks[i].clickTime).getTime();
      const interval = currTime - prevTime;

      if (interval < MIN_CLICK_INTERVAL_MS) {
        if (sortedClicks[i - 1].ip === sortedClicks[i].ip) {
          anomalies.push({
            clickId: sortedClicks[i].id,
            reason: `点击间隔过短: 与前次点击间隔${interval}ms，小于最小阈值${MIN_CLICK_INTERVAL_MS}ms`,
          });
        }
      }
    }

    for (const click of clickLogs) {
      if (!click.userAgent || click.userAgent.length < 10) {
        anomalies.push({
          clickId: click.id,
          reason: `UserAgent异常: UA长度不足或为空`,
        });
      }

      if (click.ip === '0.0.0.0' || click.ip === '127.0.0.1' || click.ip.startsWith('192.168.')) {
        anomalies.push({
          clickId: click.id,
          reason: `IP地址异常: 私有IP或保留IP=${click.ip}`,
        });
      }
    }

    const uniqueAnomalies = new Map<string, string>();
    for (const anomaly of anomalies) {
      if (!uniqueAnomalies.has(anomaly.clickId)) {
        uniqueAnomalies.set(anomaly.clickId, anomaly.reason);
      } else {
        const existing = uniqueAnomalies.get(anomaly.clickId)!;
        uniqueAnomalies.set(anomaly.clickId, `${existing}; ${anomaly.reason}`);
      }
    }

    return Array.from(uniqueAnomalies.entries()).map(([clickId, reason]) => ({
      clickId,
      reason,
    }));
  },

  detectDuplicateConversion(conversions: ConversionOrder[]): { conversionId: string; reason: string }[] {
    const duplicates: { conversionId: string; reason: string }[] = [];

    if (conversions.length === 0) {
      return duplicates;
    }

    const orderNoMap = new Map<string, ConversionOrder[]>();
    for (const conv of conversions) {
      if (!orderNoMap.has(conv.orderNo)) {
        orderNoMap.set(conv.orderNo, []);
      }
      orderNoMap.get(conv.orderNo)!.push(conv);
    }

    for (const [orderNo, convs] of orderNoMap) {
      if (convs.length > 1) {
        const sorted = convs.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        for (let i = 1; i < sorted.length; i++) {
          duplicates.push({
            conversionId: sorted[i].id,
            reason: `重复订单号: orderNo=${orderNo}, 首单时间=${sorted[0].conversionTime}`,
          });
        }
      }
    }

    const userConversionMap = new Map<string, ConversionOrder[]>();
    for (const conv of conversions) {
      if (conv.userId) {
        if (!userConversionMap.has(conv.userId)) {
          userConversionMap.set(conv.userId, []);
        }
        userConversionMap.get(conv.userId)!.push(conv);
      }
    }

    for (const [userId, convs] of userConversionMap) {
      const sorted = convs.sort((a, b) => 
        new Date(a.conversionTime).getTime() - new Date(b.conversionTime).getTime()
      );

      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const timeI = new Date(sorted[i].conversionTime).getTime();
          const timeJ = new Date(sorted[j].conversionTime).getTime();
          const diffMinutes = (timeJ - timeI) / (1000 * 60);

          if (diffMinutes < DUPLICATE_CONVERSION_WINDOW_MINUTES) {
            if (Math.abs(sorted[i].amount - sorted[j].amount) < 0.01) {
              duplicates.push({
                conversionId: sorted[j].id,
                reason: `用户短时间重复转化: userId=${userId}, 间隔${diffMinutes.toFixed(1)}分钟，金额均为${sorted[i].amount}`,
              });
            }
          }
        }
      }
    }

    const uniqueDuplicates = new Map<string, string>();
    for (const dup of duplicates) {
      if (!uniqueDuplicates.has(dup.conversionId)) {
        uniqueDuplicates.set(dup.conversionId, dup.reason);
      } else {
        const existing = uniqueDuplicates.get(dup.conversionId)!;
        uniqueDuplicates.set(dup.conversionId, `${existing}; ${dup.reason}`);
      }
    }

    return Array.from(uniqueDuplicates.entries()).map(([conversionId, reason]) => ({
      conversionId,
      reason,
    }));
  },

  calculateDeductions(
    detail: SettlementDetail,
    rules: DeductionRule[]
  ): DeductionItem[] {
    const deductions: DeductionItem[] = [];
    const activeRules = rules.filter(r => r.isActive);

    if (activeRules.length === 0) {
      return deductions;
    }

    for (const rule of activeRules) {
      try {
        const deduction = this.applyDeductionRule(detail, rule);
        if (deduction && deduction.amount > 0) {
          deductions.push(deduction);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`应用扣量规则失败 [${rule.name}]: ${error.message}`);
        }
        throw error;
      }
    }

    return deductions;
  },

  applyDeductionRule(detail: SettlementDetail, rule: DeductionRule): DeductionItem | null {
    if (!rule.isActive) {
      return null;
    }

    let shouldDeduct = false;
    let reason = '';

    const context = {
      impressionId: detail.impressionId,
      clickId: detail.clickId,
      conversionId: detail.conversionId,
      channelId: detail.channelId,
      amount: detail.amount,
      commission: detail.commission,
      hasImpression: detail.attributionTrace.some(n => n.type === 'impression' && n.matched),
      hasClick: detail.attributionTrace.some(n => n.type === 'click' && n.matched),
      traceComplete: detail.attributionTrace.every(n => n.matched),
    };

    switch (rule.type) {
      case 'click_anomaly': {
        if (detail.clickId) {
          const click = clickLogDAO.findById(detail.clickId);
          if (click && click.isAnomaly) {
            shouldDeduct = true;
            reason = `异常点击扣量: ${click.anomalyReason || '点击被标记为异常'}`;
          }
        }
        if (!context.hasClick) {
          shouldDeduct = true;
          reason = '无有效点击归因，按异常点击规则扣量';
        }
        break;
      }

      case 'duplicate_conversion': {
        const conversion = conversionOrderDAO.findById(detail.conversionId);
        if (conversion && conversion.isDuplicate) {
          shouldDeduct = true;
          reason = `重复转化扣量: ${conversion.duplicateReason || '转化被标记为重复'}`;
        }
        break;
      }

      case 'ip_fraud': {
        const click = detail.clickId ? clickLogDAO.findById(detail.clickId) : null;
        const impression = detail.impressionId ? impressionLogDAO.findById(detail.impressionId) : null;
        
        const ip = click?.ip || impression?.ip || '';
        if (ip && (ip === '0.0.0.0' || ip.startsWith('192.168.') || ip.startsWith('10.'))) {
          shouldDeduct = true;
          reason = `IP欺诈扣量: 异常IP地址=${ip}`;
        }
        break;
      }

      case 'time_abnormal': {
        const conversion = conversionOrderDAO.findById(detail.conversionId);
        const click = detail.clickId ? clickLogDAO.findById(detail.clickId) : null;
        
        if (conversion && click) {
          const convTime = new Date(conversion.conversionTime).getTime();
          const clickTime = new Date(click.clickTime).getTime();
          const diffHours = (convTime - clickTime) / (1000 * 60 * 60);
          
          if (diffHours > 24 || diffHours < 0) {
            shouldDeduct = true;
            reason = `归因时间异常: 点击与转化间隔${diffHours.toFixed(2)}小时，超出正常范围`;
          }
        }
        break;
      }

      case 'custom': {
        try {
          const conditionFn = new Function('ctx', `return ${rule.condition}`);
          shouldDeduct = conditionFn(context) === true;
          if (shouldDeduct) {
            reason = `自定义规则扣量: ${rule.name}`;
          }
        } catch (error) {
          throw new Error(`自定义规则条件执行失败: ${rule.condition}`);
        }
        break;
      }

      default:
        throw new Error(`未知的扣量规则类型: ${rule.type}`);
    }

    if (shouldDeduct) {
      const deductionAmount = Number((detail.commission * rule.deductionRate).toFixed(2));
      return {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.version,
        amount: deductionAmount,
        reason,
      };
    }

    return null;
  },
};
