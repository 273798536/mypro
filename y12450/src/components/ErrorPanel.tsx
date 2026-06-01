import { useGameStore } from '../store/gameStore';
import { format } from 'date-fns';

const ErrorPanel = () => {
  const errors = useGameStore(state => state.errors);

  const errorTypeLabels: Record<string, string> = {
    coupon_deferral_missed: '票息顺延未识别',
    put_option_missed: '回售选择权漏选',
    default_misjudged: '违约误判',
    coupon_amount_wrong: '票息金额错误',
    timing_error: '时间判断错误'
  };

  if (errors.length === 0) {
    return (
      <div className="text-center py-8">
      <span className="text-4xl mb-4 block">✅</span>
      <p className="text-gray-400">暂无错误记录</p>
      <p className="text-gray-500 text-sm mt-2">继续加油！</p>
    </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">错误记录</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
        {errors.map((error, index) => (
        <div key={index} className="bg-rail-danger/10 border border-rail-danger/30 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="px-2 py-1 bg-rail-danger/20 text-rail-danger text-xs rounded">
              {errorTypeLabels[error.type]}</span>
            <span className="text-gray-400 text-xs">
              {format(error.triggeredAt, 'HH:mm:ss')}
            </span>
          </div>
          <p className="text-white text-sm mb-2">{error.message}</p>
          <div className="text-xs text-gray-400 space-y-1 mt-3 pt-3 border-t border-gray-700">
            <p><span className="text-gray-500">触发者:</span> <span className="text-white">{error.triggeredBy}</span></p>
            <p><span className="text-gray-500">卡点:</span> <span className="text-white">{error.blockedStep}</span></p>
            <p><span className="text-rail-warning">💡 下一步:</span> <span className="text-white">{error.nextAction}</span></p>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
};

export default ErrorPanel;
