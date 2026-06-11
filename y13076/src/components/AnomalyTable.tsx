import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ANOMALY_TYPE_LABELS, ANOMALY_STATUS_LABELS } from '@/types';

export default function AnomalyTable() {
  const anomalies = useStore((s) => s.anomalies);
  const activeAnomalyId = useStore((s) => s.activeAnomalyId);
  const setActiveAnomaly = useStore((s) => s.setActiveAnomaly);
  const setFilterCriteria = useStore((s) => s.setFilterCriteria);
  const applyFilters = useStore((s) => s.applyFilters);

  const navigate = useNavigate();

  const handleTrace = (anomaly: typeof anomalies[0]) => {
    if (anomaly.filterSnapshot) {
      setFilterCriteria(anomaly.filterSnapshot);
      applyFilters();
    }
    navigate('/');
  };

  return (
    <div className="h-full overflow-auto bg-[#111827]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[#111827] z-10">
          <tr className="border-b border-gray-700 text-gray-400 text-xs">
            <th className="text-left px-3 py-2 font-medium">时间</th>
            <th className="text-left px-3 py-2 font-medium">传感器</th>
            <th className="text-left px-3 py-2 font-medium">异常类型</th>
            <th className="text-left px-3 py-2 font-medium">描述</th>
            <th className="text-left px-3 py-2 font-medium">处理状态</th>
            <th className="text-left px-3 py-2 font-medium">处理结果</th>
            <th className="text-left px-3 py-2 font-medium">截图</th>
            <th className="text-left px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map((a, i) => (
            <tr
              key={a.id}
              onClick={() => setActiveAnomaly(a.id)}
              className={`border-b border-gray-800/50 text-gray-300 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                i % 2 === 1 ? 'bg-gray-800/20' : ''
              } ${activeAnomalyId === a.id ? 'border-l-2 border-l-[#00E5A0]' : 'border-l-2 border-l-transparent'}`}
            >
              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                {a.createdAt.slice(0, 16).replace('T', ' ')}
              </td>
              <td className="px-3 py-2 text-xs">{a.sensorName}</td>
              <td className="px-3 py-2 text-xs text-[#F59E0B]">
                {ANOMALY_TYPE_LABELS[a.type]}
              </td>
              <td className="px-3 py-2 text-xs text-gray-400 max-w-[200px] truncate">
                {a.description}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-medium ${
                    a.status === 'pending'
                      ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      : a.status === 'processing'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-[#00E5A0]/20 text-[#00E5A0]'
                  }`}
                >
                  {ANOMALY_STATUS_LABELS[a.status]}
                </span>
              </td>
              <td className="px-3 py-2 text-xs">
                {a.status === 'pending' && !a.result ? (
                  <span className="text-[#F59E0B]">待确认</span>
                ) : a.result.startsWith('异常-') ? (
                  <span className="text-[#EF4444]">{a.result}</span>
                ) : (
                  <span className="text-gray-400">{a.result}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {a.screenshotUrl ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(a.screenshotUrl, '_blank'); }}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <Camera size={14} />
                  </button>
                ) : (
                  <span className="text-gray-700">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleTrace(a); }}
                  className="text-[#00E5A0] hover:underline text-xs"
                >
                  溯源
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
