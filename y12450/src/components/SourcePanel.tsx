import { useGameStore } from '../store/gameStore';
import { format } from 'date-fns';

const SourcePanel = () => {
  const sources = useGameStore(state => state.sources);

  const getSourceTypeLabels: Record<string, string> = {
    bond: '债券基础信息',
    coupon: '票息支付信息',
    put: '回售选择权信息',
    default: '违约事件信息'
  };

  const getSourceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      bond: '📄',
      coupon: '💰',
      put: '🔀',
      default: '⚠️'
    };
    return icons[type] || '📁';
  };

  if (sources.length === 0) {
    return <div className="text-gray-400">暂无数据源</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">数据来源追溯</h3>
      <p className="text-gray-400 text-sm mb-4">
        债券、票息、回售、违约信息可能来自不同的提供方</p>
      
      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="bg-rail-accent/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{getSourceTypeIcon(source.type)}</span>
              <div className="flex-1">
                <p className="text-white font-medium">{getSourceTypeLabels[source.type]}</p>
                <p className="text-gray-400 text-sm">
                  提供方: {source.provider}
                </p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              提供时间: {format(source.providedAt, 'yyyy-MM-dd HH:mm')}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              来源ID: {source.id}
            </div>
          </div>
          ))}
      </div>
    </div>
  );
};

export default SourcePanel;
