import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ChevronRight, MapPin, MessageSquare, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ReviewItem, ReviewStatus } from '@/types';

const typeLabels: Record<string, { label: string; color: string }> = {
  occlusion_miss: { label: '遮挡漏算疑似', color: 'text-dawn-gold' },
  floor_confusion: { label: '楼层数据疑问', color: 'text-steel-blue' },
  data_inconsistency: { label: '数据不一致', color: 'text-coral-red' },
};

const statusConfig: Record<ReviewStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: {
    label: '待处理',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: 'text-dawn-gold',
    bg: 'bg-dawn-gold/20',
  },
  confirmed: {
    label: '已确认',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    color: 'text-mint-green',
    bg: 'bg-mint-green/20',
  },
  resolved: {
    label: '已解决',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-slate-400',
    bg: 'bg-slate-600/20',
  },
};

export function ReviewPanel() {
  const { reviewMarks, updateReviewMark, setSelectedBuilding, setSelectedFloor, dataPackage } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');

  const filteredMarks = filter === 'all' 
    ? reviewMarks 
    : reviewMarks.filter(m => m.status === filter);

  const handleLocate = (item: ReviewItem) => {
    if (item.buildingId) {
      setSelectedBuilding(item.buildingId);
      
      if (item.apartmentId && dataPackage) {
        const building = dataPackage.buildings.find(b => b.id === item.buildingId);
        const apartment = building?.apartments.find(a => a.id === item.apartmentId);
        if (apartment) {
          setSelectedFloor(apartment.floor);
        }
      }
    }
  };

  const handleStatusChange = (item: ReviewItem, newStatus: ReviewStatus) => {
    updateReviewMark(item.id, { status: newStatus });
  };

  const handleAddNote = (item: ReviewItem) => {
    const note = prompt('添加复核备注：', item.reviewerNote || '');
    if (note !== null) {
      updateReviewMark(item.id, { reviewerNote: note });
    }
  };

  if (reviewMarks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-sm">暂无需要人工复核的项目</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-200">人工复核项</h4>
        <span className="text-xs bg-dawn-gold/20 text-dawn-gold px-2 py-0.5 rounded-full">
          {reviewMarks.filter(m => m.status === 'pending').length} 待处理
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {(['all', 'pending', 'confirmed', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-sun-orange text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? '全部' : statusConfig[f].label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
        {filteredMarks.map((item) => {
          const isExpanded = expandedId === item.id;
          const typeConfig = typeLabels[item.type];
          const status = statusConfig[item.status];

          return (
            <div
              key={item.id}
              className={`rounded-lg border transition-all ${
                item.status === 'pending'
                  ? 'bg-dawn-gold/5 border-dawn-gold/30'
                  : item.status === 'confirmed'
                  ? 'bg-mint-green/5 border-mint-green/30'
                  : 'bg-slate-800/50 border-slate-700/30'
              }`}
            >
              <div
                className="p-3 cursor-pointer flex items-start gap-2"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <ChevronRight
                  className={`w-4 h-4 text-slate-500 mt-0.5 transition-transform flex-shrink-0 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${status.bg} ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-snug">
                    {item.humanDescription}
                  </p>
                  {item.reviewerNote && (
                    <p className="text-xs text-slate-400 mt-1.5 italic">
                      💬 {item.reviewerNote}
                    </p>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-white/10 pt-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocate(item);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-steel-blue/20 text-steel-blue rounded-md text-xs font-medium hover:bg-steel-blue/30 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      定位到3D视图
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddNote(item);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-slate-300 rounded-md text-xs font-medium hover:bg-white/20 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      添加备注
                    </button>
                    {item.status !== 'confirmed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(item, 'confirmed');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-mint-green/20 text-mint-green rounded-md text-xs font-medium hover:bg-mint-green/30 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        标记已确认
                      </button>
                    )}
                    {item.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(item, 'resolved');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-600/30 text-slate-300 rounded-md text-xs font-medium hover:bg-slate-600/50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        标记已解决
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-500">
        <p>💡 提示：系统自动识别可能存在问题的条目，请规划设计师人工复核确认</p>
      </div>
    </div>
  );
}
