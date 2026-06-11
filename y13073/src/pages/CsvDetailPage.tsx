import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { downloadCsv, recordsToCsv } from '../utils/csvParser';
import { formatTimestamp, getAnomalyTypeLabel } from '../utils/dataProcessor';
import { PROCESS_STATUS_OPTIONS, ANOMALY_TYPE_OPTIONS } from '../utils/constants';
import { ArrowLeft, Download, Search, AlertTriangle, X } from 'lucide-react';

export const CsvDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rowParam = searchParams.get('row');
  
  const records = useDataStore((s) => s.records);
  const anomalies = useDataStore((s) => s.anomalies);
  const loadDemoData = useDataStore((s) => s.loadDemoData);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('rowNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [highlightRow, setHighlightRow] = useState<number | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (records.length === 0) {
      loadDemoData();
    }
  }, [records.length, loadDemoData]);

  useEffect(() => {
    if (rowParam) {
      const rowNum = parseInt(rowParam, 10);
      if (!isNaN(rowNum)) {
        setHighlightRow(rowNum);
        setTimeout(() => {
          const rowEl = rowRefs.current.get(rowNum);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        setTimeout(() => setHighlightRow(null), 3000);
      }
    }
  }, [rowParam, records]);

  const recordAnomalies = useMemo(() => {
    const map = new Map<string, typeof anomalies>();
    anomalies.forEach((a) => {
      if (!map.has(a.recordId)) {
        map.set(a.recordId, []);
      }
      map.get(a.recordId)!.push(a);
    });
    return map;
  }, [anomalies]);

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((r) =>
        r.id.toLowerCase().includes(term) ||
        r.source.toLowerCase().includes(term) ||
        r.layer.toLowerCase().includes(term) ||
        String(r.rowNumber).includes(term) ||
        Object.values(r.originalFields).some((v) =>
          String(v).toLowerCase().includes(term)
        )
      );
    }
    
    result.sort((a, b) => {
      let aVal: unknown = a[sortField as keyof typeof a];
      let bVal: unknown = b[sortField as keyof typeof b];
      
      if (sortField === 'timestamp') {
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
    
    return result;
  }, [records, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const csv = recordsToCsv(filteredAndSortedRecords);
    downloadCsv(csv, `索道站剖面数据_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const getStatusInfo = (status: string) => {
    return PROCESS_STATUS_OPTIONS.find((o) => o.value === status) || {
      label: status,
      color: 'bg-gray-500',
    };
  };

  const getAnomalyColor = (type: string) => {
    const option = ANOMALY_TYPE_OPTIONS.find((o) => o.value === type);
    return option ? option.color.replace('text-', 'bg-') : 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回图表
            </button>
            <h1 className="text-xl font-bold">CSV明细数据</h1>
            <span className="text-sm text-slate-500">
              共 {filteredAndSortedRecords.length} 条记录
            </span>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            导出CSV
          </button>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索记录ID、来源、图层、原始字段..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div ref={tableRef} className="overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'rowNumber', label: '行号' },
                    { key: 'id', label: '记录ID' },
                    { key: 'source', label: '来源' },
                    { key: 'processStatus', label: '处理状态' },
                    { key: 'x', label: 'X坐标' },
                    { key: 'y', label: 'Y坐标(高程)' },
                    { key: 'timestamp', label: '时间' },
                    { key: 'layer', label: '图层' },
                    { key: 'anomalies', label: '异常' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortField === col.key && (
                          <span className="text-blue-400">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAndSortedRecords.map((record) => {
                  const hasAnomaly = recordAnomalies.has(record.id);
                  const recordAnomalyList = recordAnomalies.get(record.id) || [];
                  const isHighlighted = highlightRow === record.rowNumber;

                  return (
                    <tr
                      key={record.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(record.rowNumber, el);
                      }}
                      className={`hover:bg-slate-700/30 transition-colors ${
                        isHighlighted
                          ? 'bg-yellow-500/20 animate-pulse'
                          : hasAnomaly
                          ? 'bg-red-500/5'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-yellow-400">
                        #{record.rowNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-400">
                        {record.id}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {record.source}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${getStatusInfo(record.processStatus).color}`}
                          />
                          <span className="text-slate-300">
                            {getStatusInfo(record.processStatus).label}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {record.x.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {isNaN(record.y) ? (
                          <span className="text-red-400">-</span>
                        ) : (
                          <span className="text-slate-300">{record.y.toFixed(1)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatTimestamp(record.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {record.layer}
                      </td>
                      <td className="px-4 py-3">
                        {hasAnomaly ? (
                          <div className="flex flex-wrap gap-1">
                            {recordAnomalyList.map((a) => (
                              <span
                                key={a.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getAnomalyColor(a.type)}/20 ${getAnomalyColor(a.type).replace('bg-', 'text-')}`}
                                title={a.description}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {getAnomalyTypeLabel(a.type)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAndSortedRecords.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>暂无匹配的记录</p>
            {searchTerm && (
              <p className="text-sm mt-1">尝试修改搜索条件</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
