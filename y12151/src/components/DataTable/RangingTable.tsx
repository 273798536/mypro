import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, AlertTriangle, CheckCircle, Clock, Eye, Sparkles } from 'lucide-react';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { RangingRecord, RecordStatus } from '../../types';
import { ANOMALY_LABELS, ANOMALY_COLORS } from '../../constants/anomalies';
import { formatDistance } from '../../utils/unitConversion';

interface RangingTableProps {
  onSelectRecord: (record: RangingRecord) => void;
}

export const RangingTable = ({ onSelectRecord }: RangingTableProps) => {
  const { records, filters, setFilters, selectRecord, selectedRecordId } = useCalibrationStore();
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredRecords = useMemo(() => {
    let result = [...records];
    
    if (filters.status !== 'all') {
      result = result.filter(r => r.status === filters.status);
    }
    
    if (filters.anomalyType !== 'all') {
      result = result.filter(r => r.anomalies.some(a => a.type === filters.anomalyType));
    }
    
    if (filters.affectedByMaterial !== 'all') {
      result = result.filter(r => r.affectedByMaterial === filters.affectedByMaterial);
    }
    
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(search) ||
        r.rawDistance.toString().includes(search) ||
        r.reflectiveMaterial?.toLowerCase().includes(search)
      );
    }
    
    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      
      switch (sortField) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'rawDistance':
          aVal = a.rawDistance;
          bVal = b.rawDistance;
          break;
        case 'calibratedDistance':
          aVal = a.calibratedDistance ?? 0;
          bVal = b.calibratedDistance ?? 0;
          break;
        case 'temperature':
          aVal = a.temperature;
          bVal = b.temperature;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    
    return result;
  }, [records, filters, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: RecordStatus) => {
    const styles: Record<RecordStatus, string> = {
      pending: 'bg-gray-100 text-gray-600',
      calibrated: 'bg-green-100 text-green-700',
      anomaly: 'bg-red-100 text-red-700',
    };
    const labels: Record<RecordStatus, string> = {
      pending: '待处理',
      calibrated: '已校准',
      anomaly: '异常',
    };
    const icons: Record<RecordStatus, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      calibrated: <CheckCircle className="w-3 h-3" />,
      anomaly: <AlertTriangle className="w-3 h-3" />,
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">数据明细</h3>
            <span className="text-sm text-gray-500">
              共 {filteredRecords.length} 条记录
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索记录..."
                value={filters.searchText}
                onChange={(e) => setFilters({ searchText: e.target.value })}
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E92CC]/20 focus:border-[#3E92CC]"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value as RecordStatus | 'all' })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E92CC]/20 focus:border-[#3E92CC]"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="calibrated">已校准</option>
              <option value="anomaly">异常</option>
            </select>
            {filters.affectedByMaterial !== 'all' && (
              <button
                onClick={() => setFilters({ affectedByMaterial: 'all' })}
                className="px-3 py-2 bg-[#3E92CC]/10 text-[#3E92CC] rounded-lg text-sm font-medium"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                受材质影响
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  时间
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('rawDistance')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  原始测距
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('temperature')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  环境温度
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('calibratedDistance')}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  校准后距离
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                反射面材质
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                异常
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无数据</p>
                  <p className="text-sm">请导入测距数据开始校准</p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedRecordId === record.id ? 'bg-[#3E92CC]/5' : ''
                  } ${record.affectedByMaterial ? 'bg-yellow-50/50' : ''}`}
                  onClick={() => onSelectRecord(record)}
                >
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">
                      {record.rawDistance} {record.rawDistanceUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">
                      {record.temperature.toFixed(1)} {record.temperatureUnit === 'C' ? '°C' : record.temperatureUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {record.calibratedDistance !== undefined ? (
                      <span className="font-mono text-sm font-semibold text-[#0A2463]">
                        {formatDistance(record.calibratedDistance)} m
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {record.reflectiveMaterial ? (
                      <span className={`text-sm ${record.affectedByMaterial ? 'font-medium text-[#3E92CC]' : 'text-gray-600'}`}>
                        {record.reflectiveMaterial}
                        {record.affectedByMaterial && <Sparkles className="w-3 h-3 inline ml-1" />}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">未设置</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {record.anomalies.slice(0, 3).map((anomaly) => (
                        <span
                          key={anomaly.id}
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${ANOMALY_COLORS[anomaly.type]}20`,
                            color: ANOMALY_COLORS[anomaly.type]
                          }}
                        >
                          {ANOMALY_LABELS[anomaly.type]}
                        </span>
                      ))}
                      {record.anomalies.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{record.anomalies.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectRecord(record.id);
                        onSelectRecord(record);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#3E92CC] transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
