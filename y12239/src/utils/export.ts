import { GameSession, ExportOptions, ReviewDetailRow, ScoreReport } from '@/types';
import { getTaskById } from '@/data/tasks';
import { calculateTrigonometry, getUnitLabel } from './geometry';
import { getErrorTypeLabel } from './scoring';

export const generateReviewDetails = (session: GameSession): ReviewDetailRow[] => {
  const task = getTaskById(session.taskId);
  if (!task) return [];

  const rows: ReviewDetailRow[] = [];

  for (const point of session.surveyPoints.filter((p) => p.isTarget)) {
    const angleOp = session.operations.find(
      (op) => op.type === 'angle_measure' && op.surveyPointId === point.id
    );
    const distanceOp = session.operations.find(
      (op) => op.type === 'distance_input' && op.surveyPointId === point.id
    );

    const angle = angleOp?.data.angle ?? 0;
    const distance = distanceOp?.data.distance ?? 0;
    const unit = distanceOp?.data.unit ?? task.requiredUnit;
    const trig = calculateTrigonometry(angle);

    const pointErrors = session.scoreReport?.scoreItems
      .flatMap((item) => item.errors)
      .filter((e) => {
        const op = session.operations.find((o) => o.id === e.operationId);
        return op?.surveyPointId === point.id;
      }) || [];

    const pointScore = session.scoreReport?.scoreItems.reduce((sum, item) => {
      const itemErrors = item.errors.filter((e) => {
        const op = session.operations.find((o) => o.id === e.operationId);
        return op?.surveyPointId === point.id;
      });
      const deduction = itemErrors.reduce((s, e) => s + e.pointsDeducted, 0);
      return sum + Math.max(0, (item.maxScore / session.surveyPoints.filter((p) => p.isTarget).length) - deduction);
    }, 0) ?? 0;

    rows.push({
      surveyPointId: point.id,
      surveyPointName: point.name,
      angleValue: angle,
      angleUnit: '°',
      distanceValue: distance,
      distanceUnit: unit,
      sin: trig.sin,
      cos: trig.cos,
      tan: trig.tan,
      score: Number(pointScore.toFixed(1)),
      maxScore: 100 / session.surveyPoints.filter((p) => p.isTarget).length,
      errors: pointErrors.map((e) => getErrorTypeLabel(e.type)),
    });
  }

  return rows;
};

export const exportToJson = (
  session: GameSession,
  options: ExportOptions
): string => {
  const exportData: Record<string, unknown> = {
    exportInfo: {
      timestamp: new Date(options.timestamp).toISOString(),
      format: 'json',
      includeReviewDetails: options.includeReviewDetails,
      includeCorrections: options.includeCorrections,
    },
    session: {
      id: session.id,
      playerName: session.playerName,
      startTime: new Date(session.startTime).toISOString(),
      endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
      taskId: session.taskId,
      status: session.status,
    },
    scoreReport: session.scoreReport ? {
      ...session.scoreReport,
      generatedAt: new Date(session.scoreReport.generatedAt).toISOString(),
    } : null,
  };

  if (options.includeReviewDetails) {
    exportData.reviewDetails = generateReviewDetails(session);
  }

  if (options.includeCorrections && session.corrections.length > 0) {
    exportData.corrections = session.corrections.map((c) => ({
      ...c,
      timestamp: new Date(c.timestamp).toISOString(),
    }));
  }

  return JSON.stringify(exportData, null, 2);
};

export const exportToCsv = (
  session: GameSession,
  options: ExportOptions
): string => {
  const reviewDetails = generateReviewDetails(session);

  let csv = '\uFEFF';

  csv += '=== 基本信息 ===\n';
  csv += '学生姓名,任务ID,开始时间,结束时间,状态\n';
  csv += `${session.playerName},${session.taskId},${new Date(session.startTime).toLocaleString()},${session.endTime ? new Date(session.endTime).toLocaleString() : ''},${session.status}\n\n`;

  if (session.scoreReport) {
    csv += '=== 成绩汇总 ===\n';
    csv += '总分,满分,等级\n';
    csv += `${session.scoreReport.totalScore},${session.scoreReport.maxScore},${session.scoreReport.grade}\n\n`;

    csv += '=== 分项得分 ===\n';
    csv += '项目,得分,满分,扣分规则\n';
    for (const item of session.scoreReport.scoreItems) {
      csv += `${item.categoryName},${item.score},${item.maxScore},${item.ruleReference}\n`;
    }
    csv += '\n';

    csv += '=== 错误详情 ===\n';
    csv += '错误类型,错误分类,规则描述,扣分,规则编号\n';
    const allErrors = session.scoreReport.scoreItems.flatMap((item) => item.errors);
    for (const error of allErrors) {
      csv += `"${getErrorTypeLabel(error.type)}","${error.category === 'triangle_calculation' ? '三角计算' : '路径选择'}","${error.ruleDescription}",${error.pointsDeducted},${error.ruleReference}\n`;
    }
    csv += '\n';
  }

  if (options.includeReviewDetails) {
    csv += '=== 复核详情 ===\n';
    csv += '测绘点ID,测绘点名称,角度(°),距离,单位,sin,cos,tan,得分,满分,错误\n';
    for (const row of reviewDetails) {
      csv += `${row.surveyPointId},"${row.surveyPointName}",${row.angleValue},${row.distanceValue},${getUnitLabel(row.distanceUnit)},${row.sin},${row.cos},${row.tan},${row.score},${row.maxScore},"${row.errors.join('; ')}"\n`;
    }
    csv += '\n';
  }

  if (options.includeCorrections && session.corrections.length > 0) {
    csv += '=== 修正记录 ===\n';
    csv += '修正时间,老师姓名,修正字段,原值,新值,备注\n';
    for (const correction of session.corrections) {
      csv += `${new Date(correction.timestamp).toLocaleString()},"${correction.teacherName}",${correction.field},"${correction.oldValue}","${correction.newValue}","${correction.remark}"\n`;
    }
  }

  return csv;
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateExportFilename = (session: GameSession, format: 'json' | 'csv'): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeName = session.playerName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  return `几何测绘成绩_${safeName}_${dateStr}.${format}`;
};

export const performExport = (
  session: GameSession,
  options: ExportOptions,
  scoreReport?: ScoreReport
): void => {
  const exportSession = scoreReport ? { ...session, scoreReport } : session;

  let content: string;
  let mimeType: string;
  let filename: string;

  if (options.format === 'json') {
    content = exportToJson(exportSession, options);
    mimeType = 'application/json';
    filename = generateExportFilename(exportSession, 'json');
  } else {
    content = exportToCsv(exportSession, options);
    mimeType = 'text/csv;charset=utf-8';
    filename = generateExportFilename(exportSession, 'csv');
  }

  downloadFile(content, filename, mimeType);
};
