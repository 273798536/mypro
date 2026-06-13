import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Image as ImageIcon, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ANOMALY_TYPE_LABELS, ANOMALY_STATUS_LABELS, SENSOR_TYPES, CHANNELS } from '@/types';
import type { AnomalyStatus, ExportRecord, SensorRecord, FilterCriteria } from '@/types';
import MaterialDropZone from '@/components/MaterialDropZone';

function serializeCsv(data: SensorRecord[], criteria: FilterCriteria): string {
  const BOM = '\uFEFF';
  const tags: string[] = [`${criteria.timeRangeStart.slice(0, 16)}~${criteria.timeRangeEnd.slice(0, 16)}`];
  if (criteria.channel) tags.push(`通道:${criteria.channel}`);
  if (criteria.cabinet) tags.push(`机柜:${criteria.cabinet}`);
  if (criteria.sensorType) tags.push(`传感器:${SENSOR_TYPES.find((t) => t.value === criteria.sensorType)?.label ?? criteria.sensorType}`);
  const meta = [`# 数据中心冷通道时序回放 导出数据`, `# 导出时间: ${new Date().toLocaleString('zh-CN')}`, `# 筛选口径: ${tags.join(' | ')}`, `# 记录数: ${data.length}`, ''];
  const header = '时间戳,通道,机柜,传感器名称,传感器类型,数值,单位';
  const tl = (t: string) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t;
  const rows = data.map((d) => `${d.timestamp},${d.channel},${d.cabinet},${d.sensorName},${tl(d.type)},${d.value},${d.unit}`);
  return BOM + meta.join('\n') + header + '\n' + rows.join('\n');
}

function serializeJson(data: SensorRecord[], criteria: FilterCriteria): string {
  const tl = (t: string) => SENSOR_TYPES.find((s) => s.value === t)?.label ?? t;
  return JSON.stringify({
    meta: {
      title: '数据中心冷通道时序回放 导出数据',
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      filterCriteria: {
        timeRangeStart: criteria.timeRangeStart,
        timeRangeEnd: criteria.timeRangeEnd,
        channel: criteria.channel ?? null,
        cabinet: criteria.cabinet ?? null,
        sensorType: criteria.sensorType ? { value: criteria.sensorType, label: tl(criteria.sensorType) } : null,
      },
    },
    data: data.map((d) => ({ timestamp: d.timestamp, channel: d.channel, cabinet: d.cabinet, sensorName: d.sensorName, sensorType: d.type, sensorTypeLabel: tl(d.type), value: d.value, unit: d.unit })),
  }, null, 2);
}

function downloadFile(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AnomalyDetail() {
  const activeAnomalyId = useStore((s) => s.activeAnomalyId);
  const anomalies = useStore((s) => s.anomalies);
  const setActiveAnomaly = useStore((s) => s.setActiveAnomaly);
  const updateAnomalyStatus = useStore((s) => s.updateAnomalyStatus);
  const setFilterCriteria = useStore((s) => s.setFilterCriteria);
  const applyFilters = useStore((s) => s.applyFilters);
  const sensorData = useStore((s) => s.sensorData);
  const addExportRecord = useStore((s) => s.addExportRecord);

  const navigate = useNavigate();

  const anomaly = anomalies.find((a) => a.id === activeAnomalyId);
  if (!anomaly) return null;

  const handleStatusChange = (status: AnomalyStatus) => {
    updateAnomalyStatus(anomaly.id, status);
  };

  const handleFilterClick = (field: string, value: string) => {
    setFilterCriteria({ [field]: value });
    applyFilters();
    navigate('/');
  };

  const handleScreenshotTrace = () => {
    if (anomaly.filterSnapshot) {
      setFilterCriteria(anomaly.filterSnapshot);
      applyFilters();
    }
    navigate('/');
  };

  const handleReExport = (format: 'csv' | 'json') => {
    const criteria = anomaly.filterSnapshot ?? { id: 'f-reexport', timeRangeStart: '2026-06-10T00:00:00', timeRangeEnd: '2026-06-10T23:59:59' };
    const data = sensorData.filter((d) => {
      if (d.timestamp < criteria.timeRangeStart || d.timestamp > criteria.timeRangeEnd) return false;
      if (criteria.channel && d.channel !== criteria.channel) return false;
      if (criteria.cabinet && d.cabinet !== criteria.cabinet) return false;
      if (criteria.sensorType && d.type !== criteria.sensorType) return false;
      return true;
    });
    if (data.length === 0) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const fileName = `冷通道时序回放_异常${anomaly.id}_${ts}.${format}`;
    const content = format === 'csv' ? serializeCsv(data, criteria) : serializeJson(data, criteria);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
    downloadFile(content, fileName, mime);
    addExportRecord({
      id: `exp-${Date.now()}`,
      format,
      recordCount: data.length,
      filterCriteria: { ...criteria },
      exportedAt: new Date().toISOString(),
      fileName,
    });
  };

  const filterItems: Array<{ label: string; field: string; value: string; display: string }> = [];
  if (anomaly.filterSnapshot) {
    const fs = anomaly.filterSnapshot;
    if (fs.channel) filterItems.push({ label: '通道', field: 'channel', value: fs.channel, display: fs.channel });
    if (fs.cabinet) filterItems.push({ label: '机柜', field: 'cabinet', value: fs.cabinet, display: fs.cabinet });
    if (fs.sensorType) {
      const l = SENSOR_TYPES.find((t) => t.value === fs.sensorType)?.label ?? fs.sensorType;
      filterItems.push({ label: '传感器', field: 'sensorType', value: fs.sensorType, display: l });
    }
  }

  return (
    <div className="h-full bg-[#111827] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-800 shrink-0">
        <h3 className="text-white text-sm font-semibold truncate">
          {anomaly.sensorName}
          <span className="text-[#F59E0B] text-xs ml-2">
            {ANOMALY_TYPE_LABELS[anomaly.type]}
          </span>
        </h3>
        <button
          onClick={() => setActiveAnomaly(null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        <section>
          <div className="text-xs text-gray-500 mb-1">描述</div>
          <p className="text-gray-300 text-xs leading-relaxed">{anomaly.description}</p>
        </section>

        <section>
          <div className="text-xs text-gray-500 mb-1">处理状态</div>
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                anomaly.status === 'pending'
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  : anomaly.status === 'processing'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-[#00E5A0]/20 text-[#00E5A0]'
              }`}
            >
              {ANOMALY_STATUS_LABELS[anomaly.status]}
            </span>
            <select
              value={anomaly.status}
              onChange={(e) => handleStatusChange(e.target.value as AnomalyStatus)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:border-[#00E5A0] focus:outline-none"
            >
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已处理</option>
            </select>
          </div>
        </section>

        <section>
          <div className="text-xs text-gray-500 mb-1">处理结果</div>
          <p className={`text-xs ${anomaly.result.startsWith('异常-') ? 'text-[#EF4444] font-medium' : 'text-gray-300'}`}>
            {anomaly.result || '—'}
          </p>
        </section>

        <section>
          <div className="text-xs text-gray-500 mb-1">筛选口径</div>
          <div className="flex flex-wrap gap-1">
            {filterItems.map((item) => (
              <button
                key={item.field}
                onClick={() => handleFilterClick(item.field, item.value)}
                className="inline-flex items-center gap-1 bg-cyan-900/40 text-cyan-300 text-xs px-2 py-0.5 rounded hover:bg-cyan-900/60 transition-colors"
              >
                {item.label}: {item.display}
                <ExternalLink size={8} />
              </button>
            ))}
          </div>
          {anomaly.filterSnapshot && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleReExport('csv')}
                className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                <Download size={10} />
                重新导出 CSV
              </button>
              <button
                onClick={() => handleReExport('json')}
                className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                <Download size={10} />
                重新导出 JSON
              </button>
            </div>
          )}
        </section>

        {anomaly.screenshotUrl && (
          <section>
            <div className="text-xs text-gray-500 mb-1">截图溯源</div>
            <div className="rounded overflow-hidden border border-gray-700">
              <img
                src={anomaly.screenshotUrl}
                alt="异常截图"
                className="w-full h-auto max-h-40 object-cover"
              />
            </div>
            <button
              onClick={handleScreenshotTrace}
              className="mt-2 flex items-center gap-1 text-xs text-[#00E5A0] hover:underline"
            >
              <ExternalLink size={10} />
              跳转回来源
            </button>
          </section>
        )}

        <section>
          <div className="text-xs text-gray-500 mb-2">材料放置区</div>
          <MaterialDropZone anomalyId={anomaly.id} />
        </section>
      </div>
    </div>
  );
}
