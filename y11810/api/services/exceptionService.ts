import { clickLogDAO } from '../dao/clickLogDAO.js';
import { impressionLogDAO } from '../dao/impressionLogDAO.js';
import { deductionRuleDAO } from '../dao/deductionRuleDAO.js';
import { settlementRunDAO } from '../dao/settlementRunDAO.js';
import { exceptionRecordDAO } from '../dao/exceptionRecordDAO.js';
import { deductionService } from './deductionService.js';
import type {
  ExceptionRecord,
  DeductionRule,
} from '../../shared/types/index.js';

const EXPECTED_IMPRESSION_TO_CLICK_RATIO_MIN = 0.01;
const EXPECTED_IMPRESSION_TO_CLICK_RATIO_MAX = 0.5;
const CLICK_MISSING_THRESHOLD_PERCENT = 10;

export const exceptionService = {
  detectClickMissing(
    channelId: string,
    startDate: string,
    endDate: string
  ): ExceptionRecord | null {
    const impressions = impressionLogDAO.findByChannelAndDateRange(channelId, startDate, endDate);
    const clicks = clickLogDAO.findByChannelAndDateRange(channelId, startDate, endDate);

    if (impressions.length === 0) {
      return null;
    }

    const requestIdsInClicks = new Set(clicks.map(c => c.requestId));
    const impressionsWithoutClicks = impressions.filter(
      imp => !requestIdsInClicks.has(imp.requestId)
    );

    const missingPercent = (impressionsWithoutClicks.length / impressions.length) * 100;

    if (missingPercent > CLICK_MISSING_THRESHOLD_PERCENT) {
      const suggestion = this.generateExceptionSuggestion('click_missing', {
        channelId,
        startDate,
        endDate,
        totalImpressions: impressions.length,
        missingCount: impressionsWithoutClicks.length,
        missingPercent,
      });

      const record: Omit<ExceptionRecord, 'id' | 'createdAt'> = {
        type: 'click_missing',
        level: missingPercent > 30 ? 'high' : missingPercent > 20 ? 'medium' : 'low',
        title: `点击数据缺失: ${missingPercent.toFixed(1)}% 的曝光无对应点击`,
        description: `渠道 ${channelId} 在 ${startDate} 至 ${endDate} 期间，共 ${impressions.length} 条曝光，其中 ${impressionsWithoutClicks.length} 条曝光无对应点击记录，缺失率 ${missingPercent.toFixed(1)}%`,
        suggestion,
        affectedCount: impressionsWithoutClicks.length,
        affectedRunIds: [],
        status: 'pending',
      };

      const recordId = exceptionRecordDAO.create(record);
      return exceptionRecordDAO.findById(recordId) || null;
    }

    return null;
  },

  detectAnomalyClicks(
    channelId: string,
    startDate: string,
    endDate: string
  ): ExceptionRecord | null {
    const clicks = clickLogDAO.findByChannelAndDateRange(channelId, startDate, endDate);

    if (clicks.length === 0) {
      return null;
    }

    const anomalies = deductionService.detectClickAnomaly(clicks);

    if (anomalies.length > 0) {
      const anomalyPercent = (anomalies.length / clicks.length) * 100;
      const suggestion = this.generateExceptionSuggestion('click_anomaly', {
        channelId,
        startDate,
        endDate,
        totalClicks: clicks.length,
        anomalyCount: anomalies.length,
        anomalyPercent,
      });

      const anomalyReasons = new Map<string, number>();
      for (const anomaly of anomalies) {
        const reasonKey = anomaly.reason.split(':')[0];
        anomalyReasons.set(reasonKey, (anomalyReasons.get(reasonKey) || 0) + 1);
      }

      const topReasons = Array.from(anomalyReasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => `${reason}: ${count}次`)
        .join('; ');

      const record: Omit<ExceptionRecord, 'id' | 'createdAt'> = {
        type: 'click_anomaly',
        level: anomalyPercent > 20 ? 'high' : anomalyPercent > 10 ? 'medium' : 'low',
        title: `异常点击检测: ${anomalies.length} 条点击存在异常`,
        description: `渠道 ${channelId} 在 ${startDate} 至 ${endDate} 期间，共 ${clicks.length} 条点击，检测到 ${anomalies.length} 条异常点击，占比 ${anomalyPercent.toFixed(1)}%。主要异常类型: ${topReasons}`,
        suggestion,
        affectedCount: anomalies.length,
        affectedRunIds: [],
        status: 'pending',
      };

      const recordId = exceptionRecordDAO.create(record);
      return exceptionRecordDAO.findById(recordId) || null;
    }

    return null;
  },

  detectRuleChanges(lastRunId: string): ExceptionRecord | null {
    const lastRun = settlementRunDAO.findById(lastRunId);
    if (!lastRun) {
      throw new Error(`结算运行不存在: ${lastRunId}`);
    }

    const previousRuns = settlementRunDAO.findByChannelAndDateRange(
      lastRun.channelId,
      lastRun.startDate,
      lastRun.endDate
    ).filter(r => r.id !== lastRunId && r.status === 'completed');

    if (previousRuns.length === 0) {
      return null;
    }

    const baseRun = previousRuns.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const currentRules = deductionRuleDAO.findAll();
    const currentVersion = deductionRuleDAO.getLatestVersion();

    const runTime = new Date(lastRun.createdAt);
    const baseRunTime = new Date(baseRun.createdAt);

    const rulesChangedDuringPeriod = currentRules.filter(rule => {
      const updatedAt = new Date(rule.updatedAt);
      return updatedAt.getTime() > baseRunTime.getTime() && updatedAt.getTime() <= runTime.getTime();
    });

    if (rulesChangedDuringPeriod.length > 0) {
      const suggestion = this.generateExceptionSuggestion('rule_change', {
        channelId: lastRun.channelId,
        lastRunId,
        baseRunId: baseRun.id,
        changedRules: rulesChangedDuringPeriod,
        currentVersion,
      });

      const record: Omit<ExceptionRecord, 'id' | 'createdAt'> = {
        type: 'rule_change',
        level: 'medium',
        title: `扣量规则版本变更: 共 ${rulesChangedDuringPeriod.length} 条规则被修改`,
        description: `在结算运行 ${lastRun.batchNo} 与基准运行 ${baseRun.batchNo} 之间，有 ${rulesChangedDuringPeriod.length} 条扣量规则发生变更。变更规则: ${rulesChangedDuringPeriod.map(r => `${r.name}(v${r.version})`).join(', ')}`,
        suggestion,
        affectedCount: rulesChangedDuringPeriod.length,
        affectedRunIds: [baseRun.id, lastRunId],
        status: 'pending',
      };

      const recordId = exceptionRecordDAO.create(record);
      return exceptionRecordDAO.findById(recordId) || null;
    }

    return null;
  },

  generateExceptionSuggestion(
    type: ExceptionRecord['type'],
    data: Record<string, unknown>
  ): string {
    switch (type) {
      case 'click_missing': {
        const { channelId, startDate, endDate, totalImpressions, missingCount, missingPercent } = data;
        return `
1. **数据核对**: 检查渠道 ${channelId} 在 ${startDate} 至 ${endDate} 期间的点击数据上报是否正常
2. **日志排查**: 检查广告平台与服务端的 requestId 匹配逻辑，确认是否存在 requestId 传递丢失
3. **接口验证**: 验证点击上报接口是否存在异常，查看服务器日志中的错误信息
4. **时间同步**: 检查曝光与点击的时间戳是否存在时钟不同步问题
5. **网络分析**: 分析是否存在网络丢包导致点击数据未能成功上报

**数据概览**:
- 总曝光数: ${totalImpressions}
- 缺失点击数: ${missingCount}
- 缺失比例: ${(missingPercent as number).toFixed(1)}%
        `.trim();
      }

      case 'click_anomaly': {
        const { channelId, startDate, endDate, totalClicks, anomalyCount, anomalyPercent } = data;
        return `
1. **IP封禁**: 对检测出的高频异常IP进行临时封禁，观察后续点击质量
2. **频次限制**: 调整IP点击频次阈值，当前阈值: 60分钟内100次
3. **UA校验**: 加强UserAgent有效性校验，过滤机器人流量
4. **人工审核**: 抽取 ${Math.min(anomalyCount as number, 100)} 条异常点击进行人工复核
5. **规则优化**: 根据异常类型调整扣量规则，提高异常检测准确率

**数据概览**:
- 总点击数: ${totalClicks}
- 异常点击数: ${anomalyCount}
- 异常比例: ${(anomalyPercent as number).toFixed(1)}%
- 影响渠道: ${channelId}
- 时间范围: ${startDate} ~ ${endDate}
        `.trim();
      }

      case 'duplicate_conversion': {
        const { channelId, conversionCount, duplicateCount } = data;
        return `
1. **订单校验**: 检查重复订单号的来源，确认是否存在测试数据或误上报
2. **去重逻辑**: 优化转化去重逻辑，确保相同订单号只结算一次
3. **时间窗口**: 评估当前30分钟去重窗口是否合理，必要时进行调整
4. **用户核实**: 对重复转化的用户进行核实，确认是否存在真实的多次购买
5. **接口防重**: 在转化上报接口增加幂等性校验，防止重复提交

**数据概览**:
- 总转化数: ${conversionCount}
- 重复转化数: ${duplicateCount}
- 影响渠道: ${channelId}
        `.trim();
      }

      case 'rule_change': {
        const { changedRules, currentVersion } = data;
        const rules = changedRules as DeductionRule[];
        return `
1. **差异对比**: 使用结算对比功能对比规则变更前后的结算结果差异
2. **规则审核**: 审核以下规则变更的合理性:
${rules.map(r => `   - ${r.name} (v${r.version}): 扣量比例 ${(r.deductionRate * 100).toFixed(1)}%`).join('\n')}
3. **影响评估**: 评估规则变更对渠道收益的影响程度
4. **版本记录**: 当前规则版本: v${currentVersion}，确认所有变更均已正确记录
5. **渠道通知**: 如规则变更影响较大，需及时通知相关渠道方

**操作建议**:
- 确认规则变更是否经过审批流程
- 检查变更后的规则是否符合业务预期
- 观察后续结算数据是否存在异常波动
        `.trim();
      }

      case 'data_inconsistency': {
        const { field, oldValue, newValue, runId, baseRunId } = data;
        return `
1. **数据核对**: 核对结算运行 ${runId} 与基准运行 ${baseRunId} 在 ${field as string} 字段上的差异
2. **原因分析**: 分析数据差异产生的原因: ${JSON.stringify({ oldValue, newValue })}
3. **源头追溯**: 追溯数据变更的源头，确认是数据修正还是逻辑变更导致
4. **操作记录**: 检查是否存在相关的人工操作记录或数据修正记录
5. **重新结算**: 如差异影响较大，考虑是否需要重新执行结算

**差异详情**:
- 差异字段: ${field as string}
- 原值: ${JSON.stringify(oldValue)}
- 新值: ${JSON.stringify(newValue)}
- 影响运行: ${runId}
        `.trim();
      }

      default:
        return `
1. **问题确认**: 确认异常类型和影响范围
2. **数据排查**: 检查相关数据的完整性和准确性
3. **原因分析**: 分析异常产生的根本原因
4. **处理方案**: 根据分析结果制定处理方案
5. **后续监控**: 加强监控，防止类似问题再次发生
        `.trim();
    }
  },
};
