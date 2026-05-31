import { useEffect, useState } from 'react';
import { Trash2, Eye, AlertTriangle, Copy, Clock, Ship, RefreshCw } from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import AnomalyPanel from '@/components/AnomalyPanel';
import TraceabilityPanel from '@/components/TraceabilityPanel';
import ResultDisplay from '@/components/ResultDisplay';

export default function History() {
  const {
    historyList,
    historyLoading,
    selectedHistory,
    loadHistory,
    loadHistoryDetail,
    deleteHistory,
    clearSelectedHistory,
  } = useCalculationStore();

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadHistory(50);
  }, [loadHistory]);

  const handleViewDetail = async (id: string) => {
    await loadHistoryDetail(id);
    setShowModal(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？此操作不可恢复。')) {
      await deleteHistory(id);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600 bg-emerald-100';
    if (score >= 6) return 'text-amber-600 bg-amber-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-3xl font-bold text-slate-800 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              计算历史记录
            </h2>
            <p className="text-slate-600">
              查看所有历史计算记录，支持详情追溯和结果对比
            </p>
          </div>
          <button
            onClick={() => loadHistory(50)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {historyLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0A2463] rounded-full animate-spin mb-4" />
            <p className="text-slate-500">加载中...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Clock className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无历史记录</h3>
            <p className="text-slate-500">完成第一次计算后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      船舶名称
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      舒适度评分
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      异常
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((record) => (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        record.isDuplicate ? 'bg-red-50/50' : ''
                      }`}
                      onClick={() => handleViewDetail(record.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-800">{formatDate(record.createdAt)}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {record.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Ship className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-800">{record.shipName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                            record.comfortScore
                          )}`}
                        >
                          {record.comfortScore.toFixed(0)} / 10
                        </span>
                        <div className="text-xs text-slate-500 mt-1">{record.comfortLevel}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {record.hasAnomalies ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            存在异常
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">正常</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {record.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <Copy className="w-3 h-3" />
                            重复记录
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">新记录</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-slate-400 hover:text-[#0A2463] hover:bg-slate-100 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(record.id, e)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3
                  className="text-xl font-bold text-slate-800"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  历史记录详情
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedHistory.shipName} · {formatDate(selectedHistory.createdAt)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  clearSelectedHistory();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <ResultDisplay result={selectedHistory} onReset={() => {}} />
                <AnomalyPanel anomalies={selectedHistory.anomalies} />
                <TraceabilityPanel traceability={selectedHistory.traceability} />

                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-4">原始输入参数</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">排水量：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.hullParams.displacement} 吨</span>
                    </div>
                    <div>
                      <span className="text-slate-500">初稳心高：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.hullParams.GM} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500">船长：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.hullParams.shipLength} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500">船宽：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.hullParams.shipWidth} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500">有义波高：</span>
                      <span className="text-slate-800 font-medium">
                        {selectedHistory.waveParams.significantHeight ?? '缺测'} m
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">波浪周期：</span>
                      <span className="text-slate-800 font-medium">
                        {selectedHistory.waveParams.wavePeriod ?? '缺测'} s
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">航速：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.navigationParams.speed} 节</span>
                    </div>
                    <div>
                      <span className="text-slate-500">舱室甲板：</span>
                      <span className="text-slate-800 font-medium">第 {selectedHistory.cabinParams.deck} 层</span>
                    </div>
                    <div>
                      <span className="text-slate-500">垂向位置：</span>
                      <span className="text-slate-800 font-medium">{selectedHistory.cabinParams.verticalPos} m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
