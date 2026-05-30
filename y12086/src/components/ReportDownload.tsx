import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { valves, inspectionRoutes, workOrders, gallerySegments } from '@/data/mockData';
import { generateReport } from '@/utils/detector';

export default function ReportDownload() {
  const handleDownload = useCallback(() => {
    const report = generateReport(valves, inspectionRoutes, workOrders, gallerySegments);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `管廊巡检分析报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('=== 管廊巡检分析报告摘要 ===');
    console.log(`阀门重号: ${report.summary.duplicateValveIds.join(', ')}`);
    console.log(`穿禁区路线: ${report.summary.crossZoneRoutes.join(', ')}`);
    console.log(`过期工单: ${report.summary.overdueWorkOrderIds.join(', ')}`);
  }, []);

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55a28] text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors shadow-lg shadow-[#FF6B35]/20"
    >
      <Download size={14} />
      下载分析报告
    </button>
  );
}
