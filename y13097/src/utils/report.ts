import type {
  PreReviewReport,
  CollisionStatus,
  CollisionResult,
  Attachment,
} from '../types';

const STATUS_LABELS: Record<CollisionStatus, string> = {
  danger: '严重冲突',
  warning: '存在风险',
  safe: '安全',
  pending: '待核实',
};

const TYPE_LABELS: Record<string, string> = {
  cad_drawing: 'CAD图纸',
  supplement: '补充附件',
  verbal_note: '口头说明',
  official_document: '正式文件',
};

export function generateMarkdownReport(report: PreReviewReport): string {
  const lines: string[] = [];

  lines.push(`# 低空航线走廊碰撞预审报告`);
  lines.push('');
  lines.push(`- **航线名称**：${report.corridorName}`);
  lines.push(`- **预审日期**：${report.reviewDate}`);
  lines.push(`- **审核人员**：${report.reviewedBy}`);
  lines.push(`- **整体结论**：${STATUS_LABELS[report.overallStatus]}`);
  lines.push('');

  lines.push('## 一、预审概要');
  lines.push('');
  lines.push('| 类别 | 数量 |');
  lines.push('| --- | ---: |');
  lines.push(`| 总对象数 | ${report.totalObjects} |`);
  lines.push(`| 严重冲突 | ${report.dangerCount} |`);
  lines.push(`| 存在风险 | ${report.warningCount} |`);
  lines.push(`| 安全 | ${report.safeCount} |`);
  lines.push(`| 待核实 | ${report.pendingCount} |`);
  lines.push('');

  lines.push('## 二、材料附件清单');
  lines.push('');

  report.attachments.forEach((att, idx) => {
    const lateTag = att.isLateArrival ? ' ⚠️ 晚到附件' : '';
    lines.push(`### ${idx + 1}. ${att.name}${lateTag}`);
    lines.push('');
    lines.push(`- **类型**：${TYPE_LABELS[att.type] || att.type}`);
    lines.push(`- **提交人**：${att.uploadedBy}`);
    lines.push(`- **提交时间**：${att.uploadedAt}`);
    lines.push(`- **当前版本**：v${att.currentVersion}（共${att.versions.length}版）`);
    lines.push(`- **备注**：${att.notes || '无'}`);
    lines.push('');

    if (att.versions.length > 1) {
      lines.push('**版本变更历史**：');
      lines.push('');
      lines.push('| 版本 | 时间 | 提交人 | 变更说明 | 影响对象 |');
      lines.push('| --- | --- | --- | --- | ---: |');
      [...att.versions].reverse().forEach((ver) => {
        lines.push(
          `| v${ver.version}${ver.version === att.currentVersion ? ' (当前)' : ''} | ${ver.timestamp} | ${ver.author} | ${ver.changeSummary} | ${ver.affectedObjectIds.length}个 |`
        );
      });
      lines.push('');
    }
  });

  lines.push('## 三、碰撞分析结果');
  lines.push('');

  const dangerResults = report.collisionResults.filter((r) => r.status === 'danger');
  const warningResults = report.collisionResults.filter((r) => r.status === 'warning');
  const safeResults = report.collisionResults.filter((r) => r.status === 'safe');
  const pendingResults = report.collisionResults.filter((r) => r.status === 'pending');

  function renderResultList(results: CollisionResult[], allAttachments: Attachment[], level: string) {
    if (results.length === 0) return;

    lines.push(`### ${level}对象（${results.length}个）`);
    lines.push('');

    results.forEach((result, idx) => {
      lines.push(`#### ${idx + 1}. ${result.objectName}`);
      lines.push('');
      lines.push(`- **状态**：${STATUS_LABELS[result.status]}`);
      lines.push(`- **说明**：${result.description}`);
      lines.push('');

      if (result.overlapDistance > 0) {
        lines.push('- **碰撞数据**：');
        lines.push(`  - 重叠距离：${result.overlapDistance.toFixed(1)} 米`);
        lines.push(`  - 重叠面积：${result.overlapArea.toFixed(0)} 平方米`);
        lines.push(`  - 高度冲突：${result.altitudeConflict ? '是' : '否'}`);
        lines.push('');
      }

      if (result.nextSteps.length > 0) {
        lines.push('- **下一步操作**：');
        result.nextSteps.forEach((step, stepIdx) => {
          lines.push(`  ${stepIdx + 1}. ${step}`);
        });
        lines.push('');
      }

      const att = allAttachments.find(
        (a) =>
          a.versions.some((v) =>
            v.affectedObjectIds.some((oid) => oid.includes(result.objectId))
          ) || result.objectId.includes(a.id)
      );
      if (att) {
        lines.push(`- **来源材料**：${att.name}（v${att.currentVersion}）`);
        lines.push('');
      }
    });
  }

  renderResultList(dangerResults, report.attachments, '严重冲突');
  renderResultList(warningResults, report.attachments, '风险关注');
  renderResultList(safeResults, report.attachments, '安全');
  renderResultList(pendingResults, report.attachments, '待核实');

  lines.push('## 四、结论与建议');
  lines.push('');
  lines.push(report.conclusions || '（待填写）');
  lines.push('');

  if (report.viewSnapshot) {
    lines.push('---');
    lines.push('');
    lines.push('*报告生成时的视图快照已保存，可在系统中加载查看对应画面。*');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*报告生成时间：${new Date().toLocaleString('zh-CN')}*`);

  return lines.join('\n');
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
