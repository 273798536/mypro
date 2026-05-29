import { impressionLogDAO } from '../dao/impressionLogDAO.js';
import { clickLogDAO } from '../dao/clickLogDAO.js';
import { conversionOrderDAO } from '../dao/conversionOrderDAO.js';
import type {
  ClickLog,
  ImpressionLog,
  ConversionOrder,
  AttributionNode,
} from '../../shared/types/index.js';

const CLICK_CONVERSION_WINDOW_HOURS = 24;
const IMPRESSION_CLICK_WINDOW_HOURS = 1;

export const attributionService = {
  matchImpressionToClick(clickLog: ClickLog): ImpressionLog | null {
    if (!clickLog.requestId) {
      throw new Error('点击日志缺少 requestId，无法进行曝光匹配');
    }

    const impression = impressionLogDAO.findByRequestId(clickLog.requestId);

    if (!impression) {
      return null;
    }

    const impressionTime = new Date(impression.impressionTime).getTime();
    const clickTime = new Date(clickLog.clickTime).getTime();
    const timeDiffHours = (clickTime - impressionTime) / (1000 * 60 * 60);

    if (timeDiffHours < 0 || timeDiffHours > IMPRESSION_CLICK_WINDOW_HOURS) {
      throw new Error(
        `曝光和点击时间差不合法: ${timeDiffHours.toFixed(2)}小时，允许窗口: ${IMPRESSION_CLICK_WINDOW_HOURS}小时`
      );
    }

    if (impression.channelId !== clickLog.channelId) {
      throw new Error(
        `曝光和点击渠道不匹配: 曝光渠道=${impression.channelId}, 点击渠道=${clickLog.channelId}`
      );
    }

    return impression;
  },

  matchClickToConversion(conversion: ConversionOrder): ClickLog | null {
    if (conversion.clickId) {
      const click = clickLogDAO.findById(conversion.clickId);
      if (!click) {
        throw new Error(`转化关联的 clickId=${conversion.clickId} 不存在`);
      }
      if (click.isAnomaly) {
        throw new Error(`转化关联的点击已被标记为异常: ${click.anomalyReason || '未知原因'}`);
      }
      return click;
    }

    if (!conversion.userId) {
      throw new Error('转化缺少 clickId 和 userId，无法进行点击匹配');
    }

    const conversionTime = new Date(conversion.conversionTime).getTime();
    const startTime = new Date(conversionTime - CLICK_CONVERSION_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const endTime = conversion.conversionTime;

    const userClicks = clickLogDAO.findByUserIdAndTimeRange(
      conversion.userId,
      startTime,
      endTime
    );

    if (userClicks.length === 0) {
      return null;
    }

    const validClicks = userClicks.filter(
      click => !click.isAnomaly && click.channelId === conversion.channelId
    );

    if (validClicks.length === 0) {
      throw new Error(`用户 ${conversion.userId} 在时间窗口内无有效点击`);
    }

    validClicks.sort((a, b) => {
      const timeA = new Date(a.clickTime).getTime();
      const timeB = new Date(b.clickTime).getTime();
      return timeB - timeA;
    });

    const matchedClick = validClicks[0];
    const clickTime = new Date(matchedClick.clickTime).getTime();
    const timeDiffHours = (conversionTime - clickTime) / (1000 * 60 * 60);

    if (timeDiffHours > CLICK_CONVERSION_WINDOW_HOURS) {
      throw new Error(
        `点击和转化时间差超出窗口: ${timeDiffHours.toFixed(2)}小时，允许窗口: ${CLICK_CONVERSION_WINDOW_HOURS}小时`
      );
    }

    return matchedClick;
  },

  buildAttributionTrace(conversionId: string): AttributionNode[] {
    const conversion = conversionOrderDAO.findById(conversionId);
    if (!conversion) {
      throw new Error(`转化记录不存在: ${conversionId}`);
    }

    const trace: AttributionNode[] = [];

    let click: ClickLog | null = null;
    try {
      click = this.matchClickToConversion(conversion);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }

    let impression: ImpressionLog | null = null;
    if (click) {
      try {
        impression = this.matchImpressionToClick(click);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }
    }

    if (impression) {
      trace.push({
        type: 'impression',
        recordId: impression.id,
        timestamp: impression.impressionTime,
        ip: impression.ip,
        matched: true,
      });
    }

    if (click) {
      trace.push({
        type: 'click',
        recordId: click.id,
        timestamp: click.clickTime,
        ip: click.ip,
        matched: true,
      });
    } else if (conversion.clickId) {
      trace.push({
        type: 'click',
        recordId: conversion.clickId,
        timestamp: conversion.conversionTime,
        ip: '',
        matched: false,
      });
    }

    trace.push({
      type: 'conversion',
      recordId: conversion.id,
      timestamp: conversion.conversionTime,
      ip: '',
      matched: true,
    });

    const sortedTrace = trace.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return sortedTrace;
  },
};
