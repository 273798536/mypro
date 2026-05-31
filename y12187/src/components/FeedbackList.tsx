import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { Feedback } from '../types';
import { cn } from '../lib/utils';

interface FeedbackListProps {
  filterAreaId?: string;
}

export function FeedbackList({ filterAreaId }: FeedbackListProps) {
  const navigate = useNavigate();
  const { feedbacks, seatAreas, trackSegments, deleteFeedback } = useFeedbackStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getAreaName = (areaId?: string) => {
    return seatAreas.find(a => a.id === areaId)?.name || '未填写';
  };

  const getSegmentName = (segmentId?: string) => {
    return trackSegments.find(s => s.id === segmentId)?.name || '未关联';
  };

  const getStatusBadge = (feedback: Feedback) => {
    switch (feedback.qualityStatus) {
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            完整
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertTriangle className="w-3 h-3" />
            不完整
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3" />
            无效
          </span>
        );
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesSearch = f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.qualityStatus === statusFilter;
    const matchesArea = !filterAreaId || f.seatAreaId === filterAreaId;
    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">反馈列表</h2>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="搜索反馈内容或ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="complete">完整</option>
            <option value="incomplete">不完整</option>
            <option value="invalid">无效</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">反馈内容</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">座位区域</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">曲目段落</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">数据状态</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.map((feedback, index) => (
              <tr
                key={feedback.id}
                className={cn(
                  'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                  feedback.qualityStatus === 'invalid' && 'bg-red-50',
                  feedback.qualityStatus === 'incomplete' && 'bg-yellow-50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="py-4 px-4">
                  <span className="text-sm font-mono text-slate-500">{feedback.id}</span>
                </td>
                <td className="py-4 px-4">
                  <p className="text-sm text-slate-800 line-clamp-2 max-w-md">{feedback.content}</p>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-600">{getAreaName(feedback.seatAreaId)}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-600">{getSegmentName(feedback.segmentId)}</span>
                </td>
                <td className="py-4 px-4">
                  {getStatusBadge(feedback)}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/feedback/${feedback.id}`)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/feedback/${feedback.id}?edit=true`)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFeedback(feedback.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFeedbacks.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            <p>暂无匹配的反馈数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
