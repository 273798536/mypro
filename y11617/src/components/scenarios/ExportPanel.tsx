import { Download, BarChart3, FileSpreadsheet, FileJson } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import { exportChartAsPNG, exportDataAsCSV, exportScenarioAsJSON } from '../../utils/exporter';
import { useState } from 'react';

export default function ExportPanel() {
  const currentScenario = useCashflowStore(state => state.currentScenario);
  const [exporting, setExporting] = useState(false);

  const handleExportChart = async () => {
    if (!currentScenario) return;
    setExporting(true);
    try {
      await exportChartAsPNG('balance-chart', `${currentScenario.name}_余额趋势`);
    } catch (error) {
      console.error('导出图表失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentScenario) return;
    exportDataAsCSV(currentScenario.entries, `${currentScenario.name}_现金流数据`);
  };

  const handleExportJSON = () => {
    if (!currentScenario) return;
    exportScenarioAsJSON(currentScenario, `${currentScenario.name}_方案`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Download size={20} className="text-brand-primary" />
        <h3 className="font-semibold text-gray-800">数据导出</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={handleExportChart}
          disabled={exporting}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 size={20} className="text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">余额趋势图</div>
            <div className="text-xs text-gray-500">导出为PNG图片</div>
          </div>
        </button>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">现金流数据</div>
            <div className="text-xs text-gray-500">导出为CSV文件</div>
          </div>
        </button>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileJson size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-800">完整方案</div>
            <div className="text-xs text-gray-500">导出为JSON文件，包含所有设置和修正历史</div>
          </div>
        </button>
      </div>

      {!currentScenario && (
        <p className="mt-4 text-xs text-gray-400 text-center">请先选择一个方案</p>
      )}
    </div>
  );
}