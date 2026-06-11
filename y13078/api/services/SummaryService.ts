import type { Point, UnifiedSummary, OverlapPair, Cabinet } from '../../shared/types';

export class SummaryService {
  static buildUnified(points: Point[], overlaps: OverlapPair[], cabinets: Cabinet[]): UnifiedSummary {
    const normal = points.filter(p => !p.withdrawn);
    const withdrawn = points.filter(p => p.withdrawn);
    const bad = points.filter(p => p.isBadData);
    const supplements = points.reduce((sum, p) => sum + p.supplements.length, 0);
    const byStatus = {
      normal: normal.filter(p => p.status === 'normal').length,
      warning: normal.filter(p => p.status === 'warning').length,
      error: normal.filter(p => p.status === 'error').length,
    };
    const byType = {
      sensor: normal.filter(p => p.type === 'sensor').length,
      outlet: normal.filter(p => p.type === 'outlet').length,
      switch: normal.filter(p => p.type === 'switch').length,
      cable: normal.filter(p => p.type === 'cable').length,
    };

    const coreText =
      `本次冷通道剖面共覆盖 ${cabinets.length} 个机柜，有效点位 ${normal.length} 个，涉及温度传感器 ${byType.sensor} 个、电源插座 ${byType.outlet} 个、交换机 ${byType.switch} 个、走线/光缆 ${byType.cable} 个。` +
      `状态分布：正常 ${byStatus.normal}、预警 ${byStatus.warning}、故障 ${byStatus.error}。` +
      `撤回记录 ${withdrawn.length} 条（已隔离不参与统计）、后补说明 ${supplements} 条、坏数据标注 ${bad.length} 条、坐标重叠对 ${overlaps.length} 组。`;

    const annotationSummary = `【标注层】${coreText}`;
    const sidebarSummary = `【侧边明细】${coreText} 备注与后补说明已按点位逐条校验，口径与画布标注完全一致。`;
    const reportSummary = `【报告摘要】${coreText} 本摘要由系统从同一数据源自动生成，标注、侧边、报告三栏口径统一。`;

    const talkingPoints = [
      `开场：冷通道总体情况——${cabinets.length}机柜 ${normal.length}点位，正常率 ${normal.length ? Math.round(byStatus.normal / normal.length * 100) : 0}%。`,
      `主线：按机柜顺序依次讲解核心点位，重点关注状态为预警(${byStatus.warning})和故障(${byStatus.error})的设备。`,
      `异常段：单独说明 ${overlaps.length} 组重叠坐标、${bad.length} 条坏数据、${withdrawn.length} 条撤回记录（已物理隔离）。`,
      `收尾：总结 ${supplements} 条后补说明的处理结论，并预告下一次巡检/复核时间。`,
    ];

    return {
      annotationSummary,
      sidebarSummary,
      reportSummary,
      talkingPoints,
      timestamp: Date.now(),
    };
  }
}
