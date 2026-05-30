import { RiverSection, FlowData, SedimentData, DataQualityIssue } from '../types';

const generateId = () => `issue-${Math.random().toString(36).substring(2, 9)}`;

export function detectMissingSections(sections: RiverSection[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const sorted = [...sections].sort((a, b) => a.chainage - b.chainage);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.chainage - prev.chainage;
    const expectedGap = 500;

    if (gap > expectedGap * 1.5) {
      issues.push({
        id: generateId(),
        type: 'missing_section',
        description: `断面 ${prev.name} (桩号 ${prev.chainage}) 和 ${curr.name} (桩号 ${curr.chainage}) 之间间距过大 (${gap}m)，可能存在断面缺失`,
        suggestion: `建议在桩号 ${Math.round((prev.chainage + curr.chainage) / 2)} 附近补充测量断面，或使用插值方法生成虚拟断面。操作：点击"插值补全"按钮自动生成中间断面。`,
        severity: gap > expectedGap * 3 ? 'high' : 'medium',
        ignored: false,
        fixData: {
          action: 'interpolate',
          section1Id: prev.id,
          section2Id: curr.id,
          targetChainage: Math.round((prev.chainage + curr.chainage) / 2),
        },
      });
    }
  }

  return issues;
}

export function detectFlowMutations(flowData: FlowData[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const hourMs = 3600 * 1000;

  const grouped = flowData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, FlowData[]>);

  Object.entries(grouped).forEach(([sectionId, data]) => {
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const timeDiff = (curr.timestamp - prev.timestamp) / hourMs;

      if (timeDiff <= 4) {
        const flowChange = Math.abs(curr.flow - prev.flow);
        const relativeChange = flowChange / Math.max(prev.flow, 1);

        if (relativeChange > 0.8 && flowChange > 500) {
          const sectionName = sectionId;
          issues.push({
            id: generateId(),
            type: 'flow_mutation',
            sectionId,
            description: `断面 ${sectionName} 在 ${new Date(curr.timestamp).toLocaleString()} 流量突变: ${prev.flow.toFixed(1)} → ${curr.flow.toFixed(1)} m³/s (变化率 ${(relativeChange * 100).toFixed(0)}%)`,
            suggestion: `建议核实该时段数据来源。操作：1) 点击"标记异常"将此点标记为待核实；2) 点击"线性插值"用前后数据平滑过渡；3) 点击"手动修正"输入正确流量值。`,
            severity: relativeChange > 1.5 ? 'high' : 'medium',
            ignored: false,
            fixData: {
              action: 'smooth',
              dataIndex: i,
              sectionId,
              suggestedValue: (prev.flow + (sorted[i + 1]?.flow || curr.flow)) / 2,
            },
          });
        }
      }
    }
  });

  return issues;
}

export function detectCoordinateMisalignment(sections: RiverSection[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  sections.forEach((section) => {
    const coords = section.coordinates;

    if (coords.length < 3) {
      issues.push({
        id: generateId(),
        type: 'coordinate_misalignment',
        sectionId: section.id,
        description: `断面 ${section.name} 坐标点过少 (${coords.length}个)，无法准确描绘断面形状`,
        suggestion: `建议补充断面测量点，至少需要5个坐标点才能可靠计算过水断面面积。操作：点击"自动加密"在现有坐标点间插值。`,
        severity: 'high',
        ignored: false,
        fixData: {
          action: 'densify',
          sectionId: section.id,
          targetPoints: 7,
        },
      });
    }

    const xs = coords.map(c => c[0]);
    const zs = coords.map(c => c[2]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    if (maxX - minX < 30) {
      issues.push({
        id: generateId(),
        type: 'coordinate_misalignment',
        sectionId: section.id,
        description: `断面 ${section.name} 横向范围过小 (${(maxX - minX).toFixed(1)}m)，可能未覆盖整个河宽`,
        suggestion: `建议检查测量范围是否包含两岸。当前范围 ${minX.toFixed(1)}m ~ ${maxX.toFixed(1)}m，建议扩展至至少80m宽。`,
        severity: 'medium',
        ignored: false,
        fixData: {
          action: 'extend',
          sectionId: section.id,
          extendLeft: -50,
          extendRight: 50,
        },
      });
    }

    if (maxZ - minZ < 1) {
      issues.push({
        id: generateId(),
        type: 'coordinate_misalignment',
        sectionId: section.id,
        description: `断面 ${section.name} 高程差过小 (${(maxZ - minZ).toFixed(2)}m)，坐标可能存在错位`,
        suggestion: `建议检查坐标系统是否正确，是否存在纵横向单位混淆。操作：点击"检查坐标系"查看坐标分布热力图。`,
        severity: 'medium',
        ignored: false,
        fixData: {
          action: 'check_system',
          sectionId: section.id,
        },
      });
    }

    for (let i = 1; i < coords.length; i++) {
      if (coords[i][0] <= coords[i - 1][0]) {
        issues.push({
          id: generateId(),
          type: 'coordinate_misalignment',
          sectionId: section.id,
          description: `断面 ${section.name} 坐标点顺序错误，第${i}点 (x=${coords[i][0].toFixed(1)}) 未按从左到右递增排列`,
          suggestion: `坐标点必须按左岸到右岸的顺序排列。操作：点击"自动排序"按x坐标重新排列。`,
          severity: 'high',
          ignored: false,
          fixData: {
            action: 'sort',
            sectionId: section.id,
          },
        });
        break;
      }
    }
  });

  return issues;
}

export function detectMissingFields(
  sections: RiverSection[],
  flowData: FlowData[],
  sedimentData: SedimentData[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const hourMs = 3600 * 1000;

  const flowBySection = flowData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, FlowData[]>);

  const sedimentBySection = sedimentData.reduce((acc, d) => {
    if (!acc[d.sectionId]) acc[d.sectionId] = [];
    acc[d.sectionId].push(d);
    return acc;
  }, {} as Record<string, SedimentData[]>);

  sections.forEach((section) => {
    const flows = flowBySection[section.id] || [];
    const sediments = sedimentBySection[section.id] || [];

    if (flows.length === 0) {
      issues.push({
        id: generateId(),
        type: 'missing_field',
        sectionId: section.id,
        description: `断面 ${section.name} 没有流量数据`,
        suggestion: `建议导入该断面的流量观测数据。操作：1) 点击"从相邻断面插值"使用上下游数据估算；2) 点击"导入数据"上传流量文件。`,
        severity: 'high',
        ignored: false,
        fixData: {
          action: 'interpolate_flow',
          sectionId: section.id,
        },
      });
    } else {
      const sortedFlows = [...flows].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 1; i < sortedFlows.length; i++) {
        const gap = (sortedFlows[i].timestamp - sortedFlows[i - 1].timestamp) / hourMs;
        if (gap > 12) {
          issues.push({
            id: generateId(),
            type: 'missing_field',
            sectionId: section.id,
            description: `断面 ${section.name} 流量数据存在 ${gap.toFixed(0)} 小时的缺失 (${new Date(sortedFlows[i - 1].timestamp).toLocaleString()} - ${new Date(sortedFlows[i].timestamp).toLocaleString()})`,
            suggestion: `建议补全缺失时段的数据。操作：点击"线性插值"自动填充缺失数据。`,
            severity: gap > 24 ? 'high' : 'medium',
            ignored: false,
            fixData: {
              action: 'fill_gap',
              sectionId: section.id,
              startTime: sortedFlows[i - 1].timestamp,
              endTime: sortedFlows[i].timestamp,
            },
          });
        }
      }
    }

    if (sediments.length === 0) {
      issues.push({
        id: generateId(),
        type: 'missing_field',
        sectionId: section.id,
        description: `断面 ${section.name} 没有泥沙浓度数据`,
        suggestion: `建议导入该断面的含沙量观测数据。操作：点击"使用经验关系"根据流量估算含沙量。`,
        severity: 'medium',
        ignored: false,
        fixData: {
          action: 'estimate_sediment',
          sectionId: section.id,
        },
      });
    }
  });

  return issues;
}

export function detectDelayedData(
  sedimentData: SedimentData[],
  flowData: FlowData[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  const delayedRecords = sedimentData.filter(s => s.delayHours > 0);

  if (delayedRecords.length > 0) {
    const sectionsWithDelay = new Set(delayedRecords.map(d => d.sectionId));
    const avgDelay = delayedRecords.reduce((sum, d) => sum + d.delayHours, 0) / delayedRecords.length;

    sectionsWithDelay.forEach((sectionId) => {
      const sectionDelays = delayedRecords.filter(d => d.sectionId === sectionId);
      const maxDelay = Math.max(...sectionDelays.map(d => d.delayHours));
      const timeRange = sectionDelays.length > 0
        ? `${new Date(Math.min(...sectionDelays.map(d => d.timestamp))).toLocaleDateString()} - ${new Date(Math.max(...sectionDelays.map(d => d.timestamp))).toLocaleDateString()}`
        : '';

      issues.push({
        id: generateId(),
        type: 'delayed_data',
        sectionId,
        description: `断面 ${sectionId} 泥沙浓度数据存在延迟，平均延迟 ${avgDelay.toFixed(1)} 小时，最大延迟 ${maxDelay} 小时。影响时段: ${timeRange}`,
        suggestion: `泥沙数据晚到会导致冲淤计算滞后。操作：1) 点击"时间对齐"将泥沙数据前移对应小时数；2) 点击"保持延迟"在计算时考虑滞后效应。`,
        severity: maxDelay > 12 ? 'high' : 'medium',
        ignored: false,
        fixData: {
          action: 'align_time',
          sectionId,
          alignHours: avgDelay,
        },
      });
    });
  }

  return issues;
}

export function validateDataQuality(
  sections: RiverSection[],
  flowData: FlowData[],
  sedimentData: SedimentData[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  issues.push(...detectMissingSections(sections));
  issues.push(...detectFlowMutations(flowData));
  issues.push(...detectCoordinateMisalignment(sections));
  issues.push(...detectMissingFields(sections, flowData, sedimentData));
  issues.push(...detectDelayedData(sedimentData, flowData));

  return issues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function getIssueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    missing_section: '断面缺失',
    flow_mutation: '流量突变',
    coordinate_misalignment: '坐标错位',
    missing_field: '字段缺失',
    delayed_data: '数据延迟',
  };
  return labels[type] || type;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    high: '#EF4444',
    medium: '#F97316',
    low: '#10B981',
  };
  return colors[severity] || '#64748B';
}

export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    high: '严重',
    medium: '中等',
    low: '轻微',
  };
  return labels[severity] || severity;
}
