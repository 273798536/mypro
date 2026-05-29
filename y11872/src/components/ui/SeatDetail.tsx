import { X, MapPin, DollarSign, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { Seat } from '@/types';
import { useTheaterStore } from '@/store/theaterStore';

interface SeatDetailProps {
  seat: Seat;
}

const sectionNames: Record<string, string> = {
  orchestra: '管弦乐区',
  mezzanine: '中层区',
  balcony: '阳台区',
};

export function SeatDetail({ seat }: SeatDetailProps) {
  const setSelectedSeat = useTheaterStore((state) => state.setSelectedSeat);
  const addPendingIssue = useTheaterStore((state) => state.addPendingIssue);

  const handleReportIssue = (type: 'railing_block' | 'duplicate_seat' | 'view_error') => {
    const issueConfigs = {
      railing_block: {
        description: `座位 ${seat.row}${seat.number} 栏杆遮挡待确认`,
        action: '建议现场人工复核或调整票价',
      },
      duplicate_seat: {
        description: `座位 ${seat.row}${seat.number} 重复标记`,
        action: '请检查座位数据是否重复',
      },
      view_error: {
        description: `座位 ${seat.row}${seat.number} 视角判定有误`,
        action: '请人工复核并反馈检测算法',
      },
    };

    const config = issueConfigs[type];
    addPendingIssue({
      seatId: seat.id,
      type,
      description: config.description,
      status: 'pending',
      suggestedAction: config.action,
    });
  };

  const renderVisibilityStatus = (label: string, visible: boolean, confidence: string, blockedBy?: string) => {
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-gray-700 last:border-0">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="flex items-center gap-1.5">
          {visible ? (
            <CheckCircle size={14} className="text-theater-success" />
          ) : (
            <AlertTriangle size={14} className="text-theater-error" />
          )}
          <span className={`text-sm font-medium ${visible ? 'text-theater-success' : 'text-theater-error'}`}>
            {visible ? '可见' : '受阻'}
          </span>
          {confidence === 'medium' && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-900 text-yellow-400 rounded">
              待确认
            </span>
          )}
          {blockedBy && (
            <span className="text-xs text-gray-500">({blockedBy})</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-theater-dark border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <div>
          <h3 className="text-xl font-display font-bold text-white">
            {seat.row}排 {seat.number}座
          </h3>
          <p className="text-gray-400 text-sm">{sectionNames[seat.section]}</p>
        </div>
        <button
          onClick={() => setSelectedSeat(null)}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <DollarSign size={16} />
            <span className="text-sm">价格</span>
          </div>
          <span className="text-theater-gold font-bold text-lg">¥{seat.price}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin size={16} />
            <span className="text-sm">位置</span>
          </div>
          <span className="font-mono text-xs text-gray-500">
            X:{seat.position.x.toFixed(1)} Y:{seat.position.y.toFixed(1)} Z:{seat.position.z.toFixed(1)}
          </span>
        </div>

        {seat.comparisonStatus && seat.comparisonStatus !== 'unchanged' && (
          <div className={`p-3 rounded-lg text-sm ${
            seat.comparisonStatus === 'worsened' 
              ? 'bg-red-900/30 border border-red-700 text-red-400'
              : seat.comparisonStatus === 'improved'
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-blue-900/30 border border-blue-700 text-blue-400'
          }`}>
            {seat.comparisonStatus === 'worsened' && '⚠️ 相比历史版本视线变差'}
            {seat.comparisonStatus === 'improved' && '✓ 相比历史版本视线改善'}
            {seat.comparisonStatus === 'new' && '✚ 新增座位'}
          </div>
        )}

        {seat.visibility && (
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Eye size={16} className="text-theater-gold" />
              视线检测结果
            </h4>
            <div className="bg-gray-800 rounded-lg p-3">
              {renderVisibilityStatus(
                '舞台',
                seat.visibility.stage.visible,
                seat.visibility.stage.confidence,
                seat.visibility.stage.blockedBy
              )}
              {renderVisibilityStatus(
                '左侧屏',
                seat.visibility.leftScreen.visible,
                seat.visibility.leftScreen.confidence,
                seat.visibility.leftScreen.blockedBy
              )}
              {renderVisibilityStatus(
                '右侧屏',
                seat.visibility.rightScreen.visible,
                seat.visibility.rightScreen.confidence,
                seat.visibility.rightScreen.blockedBy
              )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-gray-400 text-sm mb-2">标记问题</h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleReportIssue('railing_block')}
              className="py-2 px-2 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-700 text-yellow-400 rounded text-xs transition-all"
            >
              栏杆遮挡
            </button>
            <button
              onClick={() => handleReportIssue('duplicate_seat')}
              className="py-2 px-2 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-700 text-orange-400 rounded text-xs transition-all"
            >
              座位重复
            </button>
            <button
              onClick={() => handleReportIssue('view_error')}
              className="py-2 px-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 rounded text-xs transition-all"
            >
              视角错误
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
