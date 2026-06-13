import { useState } from 'react';
import { X, FileText, FileJson, Download, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SENSOR_TYPES } from '@/types';
import type { ExportRecord, FilterCriteria, SensorRecord } from '@/types';

function buildFilterTags(criteria: FilterCriteria): string[] {
  const tags: string[] = [];
  tags.push(`${criteria.timeRangeStart.slice(0, 16)}~${criteria.timeRangeEnd.slice(0, 16)}`);
  if (criteria.channel) tags.push(`通道:${criteria.channel}`);
  if (criteria.cabinet) tags.push(`机柜:${criteria.cabinet}`);
  if (criteria.sensorType) {
    const label = SENSOR_TYPES.find((t) => t.value === criteria.sensorType)?.label ?? criteria.sensorType;
    tags.push(`传感器:${label}`);
  }
  if (criteria.anomalyType) tags.push(`异常:${criteria.anomalyType}`);
  return tags;
}

function buildCsvContent(data: SensorRecord[], criteria: FilterCriteria): string {
  const BOM = '\uFEFF';
  const metaLines = [
    '# 数据中心冷通道时序回放 导出数据',
    `# 导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `# 筛选口径: ${buildFilterTags(criteria).join(' | ')}`,
    `# 记录数: ${data.length}`,
    '',
  ];
  const header = '时间戳,通道,机柜,传感器名称,传感器类型,数值,单位';
  const typeLabel = (t: string) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t;
  const rows = data.map((d) =>
    `${d.timestamp},${d.channel},${d.cabinet},${d.sensorName},${typeLabel(d.type)},${d.value},${d.unit}`
  );
  return BOM + metaLines.join('\n') + header + '\n' + rows.join('\n');
}

function buildJsonContent(data: SensorRecord[], criteria: FilterCriteria): string {
  const typeLabel = (t: string) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t;
  const payload = {
    meta: {
      title: '数据中心冷通道时序回放 导出数据',
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      filterCriteria: {
        timeRangeStart: criteria.timeRangeStart,
        timeRangeEnd: criteria.timeRangeEnd,
        channel: criteria.channel ?? null,
        cabinet: criteria.cabinet ?? null,
        sensorType: criteria.sensorType ? { value: criteria.sensorType, label: typeLabel(criteria.sensorType) } : null,
        anomalyType: criteria.anomalyType ?? null,
      },
    },
    data: data.map((d) => ({
      timestamp: d.timestamp,
      channel: d.channel,
      cabinet: d.cabinet,
      sensorName: d.sensorName,
      sensorType: d.type,
      sensorTypeLabel: typeLabel(d.type),
      value: d.value,
      unit: d.unit,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function triggerDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeFileName(format: string): string {
  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `冷通道时序回放_${ts}.${format.toLowerCase()}`;
}

export default function ExportPanel() {
  const isExportPanelOpen = useStore((s) => s.isExportPanelOpen);
  const toggleExportPanel = useStore((s) => s.toggleExportPanel);
  const filterCriteria = useStore((s) => s.filterCriteria);
  const filteredData = useStore((s) => s.filteredData);
  const addExportRecord = useStore((s) => s.addExportRecord);
  const exportRecords = useStore((s) => s.exportRecords);

  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [lastExportStatus, setLastExportStatus] = useState<string | null>(null);

  if (!isExportPanelOpen) return null;

  const tags = buildFilterTags(filterCriteria);

  const sensorTypeLabels = [...new Set(filteredData.map((d) => d.type))].map(
    (t) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t
  );

  const doExport = (format: 'csv' | 'json') => {
    if (filteredData.length === 0) {
      setLastExportStatus('无数据可导出，请调整筛选条件');
      setTimeout(() => setLastExportStatus(null), 3000);
      return;
    }

    const fileName = makeFileName(format);
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      content = buildCsvContent(filteredData, filterCriteria);
      mimeType = 'text/csv;charset=utf-8';
    } else {
      content = buildJsonContent(filteredData, filterCriteria);
      mimeType = 'application/json;charset=utf-8';
    }

    triggerDownload(content, fileName, mimeType);

    const record: ExportRecord = {
      id: `exp-${Date.now()}`,
      format,
      recordCount: filteredData.length,
      filterCriteria: { ...filterCriteria },
      exportedAt: new Date().toISOString(),
      fileName,
    };
    addExportRecord(record);

    setLastExportStatus(`${filteredData.length} 条数据已导出为 ${format.toUpperCase()} → ${fileName}`);
    setTimeout(() => setLastExportStatus(null), 4000);
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

        {lastExportStatus && (
          <div className="mx-4 mt-3 px-3 py-2 bg-[#00E5A0]/10 border border-[#00E5A0]/30 rounded-lg text-xs text-[#00E5A0]">
            {lastExportStatus}
          </div>
        )}

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
                onClick={() => setSelectedFormat('csv')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedFormat === 'csv'
                    ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-transparent'
                }`}
              >
                <FileText size={16} /> CSV
              </button>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedFormat === 'json'
                    ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/40'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-transparent'
                }`}
              >
                <FileJson size={16} /> JSON
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {selectedFormat === 'csv'
                ? 'CSV 含 BOM 头，Excel 双击可直接打开中文不乱码'
                : 'JSON 含 meta 元数据，可二次处理或程序读取'}
            </p>
          </section>

          {exportRecords.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-400 mb-2">导出记录</h3>
              <div className="space-y-2">
                {[...exportRecords].reverse().slice(0, 5).map((rec) => (
                  <div key={rec.id} className="bg-gray-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white truncate flex-1 mr-2">{rec.fileName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                        {rec.format.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500">
                        {rec.exportedAt.slice(0, 19).replace('T', ' ')} · {rec.recordCount} 条
                      </span>
                      <button
                        onClick={() => doExport(rec.format)}
                        className="flex items-center gap-0.5 text-[10px] text-[#00E5A0] hover:underline"
                      >
                        <Download size={10} />
                        重新导出
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={() => doExport(selectedFormat)}
            className="flex-1 py-2 bg-[#00E5A0] text-gray-900 font-semibold rounded-lg hover:bg-[#00c88a] transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            确认导出 {selectedFormat.toUpperCase()}
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
