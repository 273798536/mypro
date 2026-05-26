import { X, Database, Clock, User, AlertTriangle, CheckCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { RISK_LEVEL_LABELS, DATA_STATUS_LABELS, INDUSTRY_COLORS } from '../../types';
import { useStore } from '../../store/useStore';

export const DetailPanel = () => {
  const { selectedFund, setSelectedFund, showDetailPanel, toggleDetailPanel } = useStore();

  if (!showDetailPanel) {
    return (
      <button
        onClick={toggleDetailPanel}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 py-2 text-gray-400 hover:text-white hover:border-gray-600 transition-all z-10"
      >
        展开明细
      </button>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'border':
        return <MinusCircle className="w-4 h-4 text-orange-400" />;
      case 'bad':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-400 bg-green-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="w-80 bg-gray-900/90 backdrop-blur-md border-l border-gray-700/50 h-full flex flex-col">
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">基金明细</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDetailPanel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedFund ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedFund.name}</h3>
                  <p className="text-sm text-gray-400">{selectedFund.code}</p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(selectedFund.dataStatus)}
                  <span className={`text-xs ${
                    selectedFund.dataStatus === 'normal' ? 'text-green-400' :
                    selectedFund.dataStatus === 'border' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {DATA_STATUS_LABELS[selectedFund.dataStatus]}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span 
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{ backgroundColor: INDUSTRY_COLORS[selectedFund.industry] + '40' }}
                >
                  {selectedFund.industry}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getRiskColor(selectedFund.riskLevel)}`}>
                  {RISK_LEVEL_LABELS[selectedFund.riskLevel]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">持仓权重</p>
                <p className="text-lg font-semibold text-white">{selectedFund.weight}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">波动率</p>
                <p className="text-lg font-semibold text-orange-400">{selectedFund.volatility}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">最大回撤</p>
                <p className="text-lg font-semibold text-red-400">{selectedFund.maxDrawdown}%</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">收益率</p>
                <p className={`text-lg font-semibold ${selectedFund.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedFund.returnRate >= 0 ? '+' : ''}{selectedFund.returnRate}%
                </p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">数据来源</span>
              </div>
              <p className="text-sm text-gray-400">{selectedFund.source}</p>
            </div>

            {selectedFund.customerNote && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">客户备注</span>
                </div>
                <p className="text-sm text-gray-400">{selectedFund.customerNote}</p>
              </div>
            )}

            {selectedFund.modifyHistory.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">修改记录</span>
                </div>
                <div className="space-y-3">
                  {selectedFund.modifyHistory.map((record, index) => (
                    <div key={index} className="relative pl-4 border-l border-gray-700 pb-3 last:pb-0">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-gray-600 border-2 border-gray-800" />
                      <p className="text-xs text-gray-500 mb-1">{record.timestamp}</p>
                      <p className="text-sm text-white">
                        <span className="text-gray-400">{record.field}:</span>{' '}
                        <span className="text-red-400 line-through">{record.oldValue}</span>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className="text-green-400">{record.newValue}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        操作人: {record.operator} | 原因: {record.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              最后修改: {selectedFund.lastModified}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">点击3D星图中的基金点查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
};
