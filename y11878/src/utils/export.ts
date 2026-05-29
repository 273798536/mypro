import type { Node, Route, AnalysisResult } from '@/types';

export function exportToCsv(
  nodes: Node[],
  routes: Route[],
  result: AnalysisResult
): void {
  const csvParts: string[] = [];

  csvParts.push('=== 统计摘要 ===');
  csvParts.push('指标,数值');
  csvParts.push(`最大流,${result.maxFlow}`);
  csvParts.push(`总容量,${result.totalCapacity}`);
  csvParts.push(`整体利用率,${(result.utilizationRate * 100).toFixed(2)}%`);
  csvParts.push(`瓶颈线路数,${result.bottleneckRoutes.length}`);
  csvParts.push(`孤立节点数,${result.isolatedNodes.length}`);
  csvParts.push(`零容量线路数,${result.zeroCapacityRoutes.length}`);
  csvParts.push(`禁用未生效线路数,${result.disabledNotEffective.length}`);
  csvParts.push('');

  csvParts.push('=== 线路明细 ===');
  csvParts.push('线路ID,起点,终点,容量,流量,利用率,是否瓶颈,是否禁用,禁用未生效');
  routes.forEach((r) => {
    const flow = result.routeFlows[r.id] || 0;
    const util = r.capacity > 0 ? flow / r.capacity : 0;
    csvParts.push(
      `${r.id},${r.from},${r.to},${r.capacity},${flow},${(util * 100).toFixed(2)}%,${r.isBottleneck ? '是' : '否'},${r.isDisabled ? '是' : '否'},${r.disableNotEffective ? '是' : '否'}`
    );
  });
  csvParts.push('');

  csvParts.push('=== 瓶颈分析 ===');
  csvParts.push('线路ID,起点,终点,容量,流量,利用率');
  result.bottleneckRoutes.forEach((r) => {
    const flow = result.routeFlows[r.id] || 0;
    const util = r.capacity > 0 ? flow / r.capacity : 0;
    csvParts.push(
      `${r.id},${r.from},${r.to},${r.capacity},${flow},${(util * 100).toFixed(2)}%`
    );
  });
  csvParts.push('');

  csvParts.push('=== 待确认异常 ===');
  csvParts.push('类型,ID,描述');
  result.isolatedNodes.forEach((n) => {
    csvParts.push(`孤立节点,${n.id},${n.name} 无连通线路`);
  });
  result.zeroCapacityRoutes.forEach((r) => {
    csvParts.push(`零容量线路,${r.id},${r.from}→${r.to} 容量为0`);
  });
  result.disabledNotEffective.forEach((r) => {
    csvParts.push(
      `禁用未生效,${r.id},${r.from}→${r.to} 已禁用但仍有流量 ${result.routeFlows[r.id] || 0}`
    );
  });
  csvParts.push('');

  csvParts.push('=== 求解步骤 ===');
  csvParts.push('步骤,增广路径,新增流量,瓶颈线路');
  result.solverSteps.forEach((step) => {
    csvParts.push(
      `${step.step},${step.augmentingPath.join('→')},${step.flowAdded},${step.bottleneckRouteId}`
    );
  });

  const csvContent = csvParts.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `网络流分析_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
