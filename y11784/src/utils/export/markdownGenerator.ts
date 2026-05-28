import type {
  VectorField,
  Path,
  IntegrationResult,
  Anomaly,
  RevisionEntry,
  ExportConfig,
} from '@/types';
import { getMethodLabel } from '../math/numericalIntegration';
import { getAnomalyTypeLabel, getSeverityLabel } from '../math/anomalyDetection';

export function generateMarkdownReport(
  vectorField: VectorField | null,
  paths: Path[],
  results: IntegrationResult[],
  anomalies: Anomaly[],
  revisions: RevisionEntry[],
  config: ExportConfig,
  title: string = '曲线积分路径比较报告'
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  if (config.includeVectorField && vectorField) {
    lines.push('## 向量场信息');
    lines.push('');
    lines.push(`- **名称**: ${vectorField.name}`);
    lines.push(`- **来源**: ${vectorField.source || '手动输入'}`);
    lines.push(`- **X 分量**: \`${vectorField.expressionX}\``);
    lines.push(`- **Y 分量**: \`${vectorField.expressionY}\``);
    lines.push(
      `- **范围**: X: [${vectorField.range.minX}, ${vectorField.range.maxX}], Y: [${vectorField.range.minY}, ${vectorField.range.maxY}]`
    );
    lines.push('');
  }

  if (config.includePaths && paths.length > 0) {
    lines.push('## 路径列表');
    lines.push('');
    paths.forEach((path) => {
      lines.push(`### ${path.name}`);
      lines.push('');
      lines.push(`- **ID**: ${path.id}`);
      lines.push(`- **颜色**: ${path.color}`);
      lines.push(`- **来源**: ${path.source || '手动输入'}`);
      if (path.studentRemark) {
        lines.push(`- **学生备注**: ${path.studentRemark}`);
      }
      const nodesStr = path.nodes
        .map((n) => `(${n.x.toFixed(2)}, ${n.y.toFixed(2)})`)
        .join(' → ');
      lines.push(`- **节点**: ${nodesStr}`);
      lines.push('');
    });
  }

  if (config.includeResults && results.length > 0) {
    lines.push('## 积分结果对比');
    lines.push('');

    const header = ['路径名称', '积分方法', '步长', '积分值', '误差估计', '计算时间(ms)', '是否有异常'];
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`| ${header.map(() => '---').join(' | ')} |`);

    results.forEach((result) => {
      const path = paths.find((p) => p.id === result.pathId);
      const row = [
        path?.name || '未知路径',
        getMethodLabel(result.method),
        result.stepSize.toFixed(4),
        result.value.toFixed(6),
        result.errorEstimate.toExponential(2),
        result.computationTime.toFixed(2),
        result.hasAnomalies ? '是 ⚠️' : '否',
      ];
      lines.push(`| ${row.join(' | ')} |`);
    });

    lines.push('');

    const validResults = results.filter((r) => !r.hasAnomalies);
    if (validResults.length >= 2) {
      lines.push('### 结果分析');
      lines.push('');
      const maxValue = Math.max(...validResults.map((r) => Math.abs(r.value)));
      const minValue = Math.min(...validResults.map((r) => r.value));
      const diff = maxValue - minValue;
      lines.push(`- **最大绝对值**: ${maxValue.toFixed(6)}`);
      lines.push(`- **最小值**: ${minValue.toFixed(6)}`);
      lines.push(`- **差值范围**: ${diff.toFixed(6)}`);
      if (Math.abs(diff) < 1e-6) {
        lines.push('- **备注**: 各路径积分结果基本一致，该向量场可能是保守场');
      } else {
        lines.push('- **备注**: 不同路径积分结果有差异，该向量场是非保守场');
      }
      lines.push('');
    }
  }

  if (config.includeAnomalies && anomalies.length > 0) {
    lines.push('## 异常检测报告');
    lines.push('');

    const grouped = anomalies.reduce((acc, a) => {
      if (!acc[a.type]) acc[a.type] = [];
      acc[a.type].push(a);
      return acc;
    }, {} as Record<Anomaly['type'], Anomaly[]>);

    Object.entries(grouped).forEach(([type, list]) => {
      lines.push(`### ${getAnomalyTypeLabel(type as Anomaly['type'])} (${list.length} 项)`);
      lines.push('');
      list.forEach((a) => {
        const path = paths.find((p) => p.id === results.find((r) => r.id === a.resultId)?.pathId);
        const pos =
          a.positionX !== undefined && a.positionY !== undefined
            ? ` 位置: (${a.positionX.toFixed(2)}, ${a.positionY.toFixed(2)})`
            : '';
        lines.push(
          `- [${getSeverityLabel(a.severity)}] ${path?.name || '未知路径'}: ${a.description}${pos}`
        );
      });
      lines.push('');
    });
  }

  if (config.includeRevisionHistory && revisions.length > 0) {
    lines.push('## 修订历史');
    lines.push('');
    revisions.forEach((rev) => {
      const typeLabel =
        rev.targetType === 'vectorField' ? '向量场' : rev.targetType === 'path' ? '路径' : '积分配置';
      const actionLabel =
        rev.action === 'create'
          ? '创建'
          : rev.action === 'update'
          ? '更新'
          : rev.action === 'delete'
          ? '删除'
          : '导入';
      lines.push(
        `- **${new Date(rev.timestamp).toLocaleString('zh-CN')}** - ${actionLabel} ${typeLabel} "${rev.targetId}"`
      );
      if (rev.source) {
        lines.push(`  - 来源: ${rev.source}`);
      }
      if (rev.correctionNote) {
        lines.push(`  - 修正说明: ${rev.correctionNote}`);
      }
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*本报告由曲线积分路径比较工具自动生成*');

  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename: string): void {
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
