import { X, FileText, FileJson } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SENSOR_TYPES } from '@/types';

export default function ExportPanel() {
  const isExportPanelOpen = useStore((s) => s.isExportPanelOpen);
  const toggleExportPanel = useStore((s) => s.toggleExportPanel);
  const filterCriteria = useStore((s) => s.filterCriteria);
  const filteredData = useStore((s) => s.filteredData);

  if (!isExportPanelOpen) return null;

  const tags: string[] = [];
  tags.push(`${filterCriteria.timeRangeStart.slice(0, 16)} ~ ${filterCriteria.timeRangeEnd.slice(0, 16)}`);
  if (filterCriteria.channel) tags.push(`通道: ${filterCriteria.channel}`);
  if (filterCriteria.cabinet) tags.push(`机柜: ${filterCriteria.cabinet}`);
  if (filterCriteria.sensorType) {
    const label = SENSOR_TYPES.find((t) => t.value === filterCriteria.sensorType)?.label ?? filterCriteria.sensorType;
    tags.push(`传感器: ${label}`);
  }
  if (filterCriteria.anomalyType) tags.push(`异常: ${filterCriteria.anomalyType}`);

  const sensorTypeLabels = [...new Set(filteredData.map((d) => d.type))].map(
    (t) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t
  );

  const handleExport = (format: string) => {
    alert(`已导出 ${filteredData.length} 条数据为 ${format} 格式`);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={toggleExportPanel} />
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">导出预览</h2>
          <button onClick={toggleExportPanel} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-gray-400 mb-2">筛选口径锁定</h3>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, i) => (
                  <span key={i} className="bg-cyan-900/40 text-cyan-300 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">导出 = 屏幕所见</p>
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-400 mb-2">数据预览</h3>
            <div className="bg-gray-800 rounded-lg p-3 space-y-1">
              <p className="text-sm text-white">
                记录数: <span className="text-[#00E5A0] font-mono">{filteredData.length}</span>
              </p>
              <p className="text-sm text-white">
                时间范围: <span className="text-gray-300 text-xs">{tags[0]}</span>
              </p>
              <p className="text-sm text-white">
                传感器类型: <span className="text-gray-300">{sensorTypeLabels.join('、') || '无'}</span>
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-400 mb-2">导出格式</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('CSV')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                <FileText size={16} /> CSV
              </button>
              <button
                onClick={() => handleExport('JSON')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                <FileJson size={16} /> JSON
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={() => handleExport('CSV')}
            className="flex-1 py-2 bg-[#00E5A0] text-gray-900 font-semibold rounded-lg hover:bg-[#00c88a] transition-colors"
          >
            确认导出
          </button>
          <button
            onClick={toggleExportPanel}
            className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </>
  );
}
