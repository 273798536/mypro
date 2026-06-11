import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ANOMALY_TYPE_LABELS, ANOMALY_STATUS_LABELS, SENSOR_TYPES, CHANNELS } from '@/types';
import type { AnomalyStatus } from '@/types';
import MaterialDropZone from '@/components/MaterialDropZone';

export default function AnomalyDetail() {
  const activeAnomalyId = useStore((s) => s.activeAnomalyId);
  const anomalies = useStore((s) => s.anomalies);
  const setActiveAnomaly = useStore((s) => s.setActiveAnomaly);
  const updateAnomalyStatus = useStore((s) => s.updateAnomalyStatus);
  const setFilterCriteria = useStore((s) => s.setFilterCriteria);
  const applyFilters = useStore((s) => s.applyFilters);

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
