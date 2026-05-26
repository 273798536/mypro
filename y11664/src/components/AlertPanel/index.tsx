import { AlertTriangle, X, ChevronDown, ChevronUp, LocateFixed, AlertCircle, AlertOctagon } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const AlertPanel = () => {
  const { alerts, showAlertPanel, toggleAlertPanel, focusOnFund, filteredFunds } = useStore();

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === 'danger') {
      return <AlertOctagon className="w-5 h-5 text-red-400" />;
    }
    switch (type) {
      case 'industry_overlap':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'occlusion':
        return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'negative_return':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'bad_data':
        return <AlertOctagon className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'industry_overlap':
        return '行业重叠';
      case 'occlusion':
        return '视图遮挡';
      case 'negative_return':
        return '负收益';
      case 'bad_data':
        return '异常数据';
      default:
        return '未知';
    }
  };

  const getFundNameById = (id: string) => {
    return filteredFunds.find(f => f.id === id)?.name || id;
  };

  if (!showAlertPanel) {
    return alerts.length > 0 ? (
      <button
        onClick={toggleAlertPanel}
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-lg px-4 py-2 text-red-400 hover:bg-red-500/30 transition-all z-20 flex items-center gap-2"
      >
        <AlertTriangle className="w-5 h-5 animate-pulse" />
        <span className="font-medium">{alerts.length} 个异常警告</span>
      </button>
    ) : null;
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-96 max-h-80 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl z-20 overflow-hidden">
      <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-white">异常警告</span>
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={toggleAlertPanel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-64">
        {alerts.length > 0 ? (
          <div className="p-2 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'danger'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type, alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          alert.severity === 'danger'
                            ? 'bg-red-500/30 text-red-400'
                            : 'bg-yellow-500/30 text-yellow-400'
                        }`}>
                          {getAlertTypeLabel(alert.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{alert.message}</p>
                    </div>
                  </div>
                </div>
                {alert.relatedFunds.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1">相关基金：</p>
                    <div className="flex flex-wrap gap-1">
                      {alert.relatedFunds.slice(0, 5).map((fundId) => (
                        <button
                          key={fundId}
                          onClick={() => focusOnFund(fundId)}
                          className="text-xs px-2 py-1 bg-gray-700/50 rounded text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          <LocateFixed className="w-3 h-3" />
                          {getFundNameById(fundId)}
                        </button>
                      ))}
                      {alert.relatedFunds.length > 5 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{alert.relatedFunds.length - 5} 更多
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-400">暂无异常，数据状态良好</p>
          </div>
        )}
      </div>
    </div>
  );
};
