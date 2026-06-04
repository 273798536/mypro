import { useCanvasStore } from '@/store/useCanvasStore';
import { COLOR_RULES, FRIENDLY_MESSAGES } from '@/constants/colorRules';
import type { Tank, ActionRecord, TankStatus } from '@/types';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getStatusLabel(status: TankStatus): string {
  return COLOR_RULES[status].label;
}

function getFriendlyTankIssues(tank: Tank): string[] {
  const issues: string[] = [];
  if (tank.missingUnit) {
    issues.push(FRIENDLY_MESSAGES.missingUnit);
  }
  if (tank.source === 'supplement') {
    issues.push(FRIENDLY_MESSAGES.supplementData);
  }
  if (tank.status === 'recovered') {
    issues.push(FRIENDLY_MESSAGES.correctedData);
  }
  if (tank.status === 'normal' && tank.source === 'original') {
    issues.push(FRIENDLY_MESSAGES.normalData);
  }
  return issues;
}

function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'zoom': '画布缩放',
    'pan': '画布平移',
    'snap': '网格吸附',
    'tank-move': '展缸移动',
    'scale-change': '比例尺变更',
    'recovery': '数据恢复',
    'load-sample': '加载样例',
    'reset': '重置画布'
  };
  return labels[type] || type;
}

export function useExport() {
  const { tanks, records, scaleRatio, sessionId, sessionStartTime, previousSessions } = useCanvasStore();

  function generateFileName(): string {
    return `水族馆展缸排布_${sessionId}_${formatTimestamp(sessionStartTime)}.csv`;
  }

  function generateCsvContent(): string {
    const lines: string[] = [];

    lines.push('=== 水族馆展缸平面排布 - 导出报告 ===');
    lines.push(`会话ID: ${sessionId}`);
    lines.push(`导出时间: ${formatDateTime(Date.now())}`);
    lines.push(`操作开始时间: ${formatDateTime(sessionStartTime)}`);
    lines.push(`当前比例尺: ${scaleRatio}`);
    lines.push('');

    lines.push('=== 颜色规则说明 ===');
    lines.push('状态,颜色,说明,处理意见');
    Object.values(COLOR_RULES).forEach(rule => {
      lines.push(`"${rule.label}","${rule.color}","${rule.description}","${rule.handling}"`);
    });
    lines.push('');

    lines.push('=== 展缸数据列表 ===');
    lines.push('序号,展缸名称,位置X,位置Y,宽度,高度,单位,状态,数据来源,问题说明,备注');
    tanks.forEach((tank, idx) => {
      const issues = getFriendlyTankIssues(tank);
      const issuesStr = issues.join('；') || '无';
      lines.push([
        idx + 1,
        `"${tank.name}"`,
        tank.x,
        tank.y,
        tank.width,
        tank.height,
        tank.unit || '未填写',
        `"${getStatusLabel(tank.status)}"`,
        `"${tank.source === 'original' ? '原始档案' : tank.source === 'supplement' ? '后期补录' : '已修正'}"`,
        `"${issuesStr}"`,
        `"${tank.remark || '无'}"`
      ].join(','));
    });
    lines.push('');

    lines.push('=== 异常数据追溯说明 ===');
    const errorTanks = tanks.filter(t => t.status === 'error');
    if (errorTanks.length > 0) {
      errorTanks.forEach(tank => {
        lines.push(`【${tank.name}】`);
        lines.push(`  - 当前状态: ${getStatusLabel(tank.status)}`);
        lines.push(`  - 颜色标记: ${COLOR_RULES[tank.status].color}`);
        lines.push(`  - 问题描述: ${COLOR_RULES[tank.status].description}`);
        const issues = getFriendlyTankIssues(tank);
        issues.forEach(issue => lines.push(`  - 详细说明: ${issue}`));
        lines.push(`  - 处理意见: ${COLOR_RULES[tank.status].handling}`);
        lines.push(`  - 离线素材说明: ${FRIENDLY_MESSAGES.offlineAsset}`);
        lines.push('');
      });
    } else {
      lines.push('当前无异常数据');
      lines.push('');
    }

    lines.push('=== 操作记录摘要（共' + records.length + '条）===');
    lines.push('序号,时间,操作类型,描述,操作人,是否异常,关联展缸');
    records.forEach((rec, idx) => {
      lines.push([
        idx + 1,
        `"${formatDateTime(rec.timestamp)}"`,
        `"${getActionTypeLabel(rec.type)}"`,
        `"${rec.description}"`,
        `"${rec.operator}"`,
        rec.isError ? '是' : '否',
        rec.relatedTankId ? `"${tanks.find(t => t.id === rec.relatedTankId)?.name || rec.relatedTankId}"` : '无'
      ].join(','));
    });
    lines.push('');

    if (previousSessions.length > 0) {
      lines.push('=== 历史运行记录（最近' + previousSessions.length + '次）===');
      lines.push('序号,会话ID,开始时间,结束时间,操作记录数');
      previousSessions.forEach((sess, idx) => {
        lines.push([
          idx + 1,
          `"${sess.sessionId}"`,
          `"${formatDateTime(sess.startTime)}"`,
          `"${formatDateTime(sess.endTime)}"`,
          sess.recordCount
        ].join(','));
      });
    }

    return '\uFEFF' + lines.join('\n');
  }

  function generateJsonContent(): string {
    const exportData = {
      metadata: {
        sessionId,
        exportTime: formatDateTime(Date.now()),
        sessionStartTime: formatDateTime(sessionStartTime),
        scaleRatio,
        tankCount: tanks.length,
        recordCount: records.length
      },
      colorRules: Object.values(COLOR_RULES).map(rule => ({
        status: rule.status,
        label: rule.label,
        color: rule.color,
        description: rule.description,
        handling: rule.handling
      })),
      tanks: tanks.map(tank => ({
        id: tank.id,
        name: tank.name,
        position: { x: tank.x, y: tank.y },
        size: { width: tank.width, height: tank.height },
        unit: tank.unit || '未填写',
        status: {
          code: tank.status,
          label: getStatusLabel(tank.status),
          color: COLOR_RULES[tank.status].color
        },
        source: tank.source === 'original' ? '原始档案' : tank.source === 'supplement' ? '后期补录' : '已修正',
        issues: getFriendlyTankIssues(tank),
        offlineAssetNote: FRIENDLY_MESSAGES.offlineAsset,
        remark: tank.remark || '无',
        handlingAdvice: COLOR_RULES[tank.status].handling
      })),
      traceability: tanks.filter(t => t.status === 'error').map(tank => ({
        tankId: tank.id,
        tankName: tank.name,
        status: tank.status,
        colorRule: COLOR_RULES[tank.status],
        issues: getFriendlyTankIssues(tank),
        relatedRecords: records.filter(r => r.relatedTankId === tank.id).map(r => ({
          time: formatDateTime(r.timestamp),
          type: getActionTypeLabel(r.type),
          description: r.description
        }))
      })),
      operationRecords: records.map((r, idx) => ({
        index: idx + 1,
        time: formatDateTime(r.timestamp),
        type: getActionTypeLabel(r.type),
        description: r.description,
        operator: r.operator,
        isError: !!r.isError,
        relatedTank: r.relatedTankId ? tanks.find(t => t.id === r.relatedTankId)?.name : null
      })),
      previousSessions: previousSessions.map((s, idx) => ({
        index: idx + 1,
        sessionId: s.sessionId,
        startTime: formatDateTime(s.startTime),
        endTime: formatDateTime(s.endTime),
        recordCount: s.recordCount
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  function downloadFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportCsv(): void {
    const content = generateCsvContent();
    const fileName = generateFileName();
    downloadFile(content, fileName, 'text/csv;charset=utf-8');
  }

  function exportJson(): void {
    const content = generateJsonContent();
    const fileName = generateFileName().replace('.csv', '.json');
    downloadFile(content, fileName, 'application/json;charset=utf-8');
  }

  function getExportPreview(): {
    fileName: string;
    tankCount: number;
    recordCount: number;
    errorCount: number;
    scaleRatio: string;
    sessionId: string;
    sessionTime: string;
  } {
    return {
      fileName: generateFileName(),
      tankCount: tanks.length,
      recordCount: records.length,
      errorCount: tanks.filter(t => t.status === 'error').length,
      scaleRatio,
      sessionId,
      sessionTime: formatDateTime(sessionStartTime)
    };
  }

  return {
    exportCsv,
    exportJson,
    generateFileName,
    generateCsvContent,
    generateJsonContent,
    getExportPreview
  };
}
