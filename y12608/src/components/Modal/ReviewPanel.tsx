import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Clock, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { StatusBadge, AnnotationStatusBadge } from '../common/StatusBadge';
import { useCanvasStore } from '../../stores/canvasStore';


interface ReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'abnormal' | 'pending' | 'normal';
type FilterStatus = 'all' | 'draft' | 'confirmed' | 'rejected';

export function ReviewPanel({ isOpen, onClose }: ReviewPanelProps) {
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    tracks,
    annotations,
    updateAnnotation,
    selectAnnotation,
    selectedAnnotationId
  } = useCanvasStore();

  const filteredAnnotations = annotations.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const track = tracks.find(t => t.id === a.trackId);
      const searchLower = searchQuery.toLowerCase();
      return (
        a.note.toLowerCase().includes(searchLower) ||
        track?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const stats = {
    total: annotations.length,
    abnormal: annotations.filter(a => a.type === 'abnormal').length,
    pending: annotations.filter(a => a.type === 'pending').length,
    normal: annotations.filter(a => a.type === 'normal').length,
    draft: annotations.filter(a => a.status === 'draft').length,
    confirmed: annotations.filter(a => a.status === 'confirmed').length,
    rejected: annotations.filter(a => a.status === 'rejected').length
  };

  const canExport = stats.abnormal === 0 && stats.draft === 0;

  const typeFilters: { id: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: '全部', icon: <Filter size={14} />, color: 'gray' },
    { id: 'abnormal', label: '异常', icon: <AlertTriangle size={14} />, color: 'orange' },
    { id: 'pending', label: '待确认', icon: <Clock size={14} />, color: 'yellow' },
    { id: 'normal', label: '正常', icon: <CheckCircle size={14} />, color: 'green' }
  ];

  const statusFilters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: '全部状态' },
    { id: 'draft', label: '草稿' },
    { id: 'confirmed', label: '已确认' },
    { id: 'rejected', label: '已拒绝' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-xl h-full md:h-auto md:max-h-[80vh] bg-white md:rounded-2xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-800">复核面板</h3>
                <p className="text-sm text-gray-500">检查并确认所有标注</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <div className="grid grid-cols-4 gap-2 mb-4">
                {typeFilters.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id)}
                    className={`
                      flex flex-col items-center gap-1 p-3 rounded-xl transition-all
                      ${typeFilter === f.id
                        ? 'bg-white shadow-sm ring-1 ring-gray-200'
                        : 'hover:bg-white/50'
                      }
                    `}
                  >
                    <span className={`text-${f.color}-500`}>{f.icon}</span>
                    <span className="text-xs font-medium text-gray-600">{f.label}</span>
                    <span className="text-lg font-bold text-gray-800">
                      {f.id === 'all' ? stats.total : stats[f.id as keyof typeof stats]}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索备注或轨迹..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                >
                  {statusFilters.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredAnnotations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <CheckCircle size={48} className="mb-4" />
                  <p>暂无符合条件的标注</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredAnnotations.map(annotation => {
                    const track = tracks.find(t => t.id === annotation.trackId);
                    return (
                      <motion.div
                        key={annotation.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          p-4 rounded-xl border transition-all cursor-pointer
                          ${selectedAnnotationId === annotation.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => selectAnnotation(annotation.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusBadge type={annotation.type} size="sm" />
                              <AnnotationStatusBadge status={annotation.status} />
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="text-gray-400">轨迹:</span> {track?.name || '未关联'}
                            </div>
                            {annotation.note && (
                              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                                {annotation.note}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAnnotation(annotation.id, { status: 'confirmed' }); }}
                              className={`
                                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${annotation.status === 'confirmed'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }
                              `}
                            >
                              确认
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAnnotation(annotation.id, { status: 'rejected' }); }}
                              className={`
                                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${annotation.status === 'rejected'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }
                              `}
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {canExport ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} />
                      所有标注已复核，可以导出
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle size={16} />
                      还有 {stats.abnormal + stats.draft} 项需要处理
                    </span>
                  )}
                </div>
                <Button onClick={onClose}>
                  完成复核
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
