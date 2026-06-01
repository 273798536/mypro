import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import type { Conflict, Room, Band, Course } from '../../types';
import { formatDateTime, formatTime } from '../../utils/dateUtils';
import { conflictTypeNames } from '../../data/sampleData';

interface ConflictPanelProps {
  conflicts: Conflict[];
  rooms: Room[];
  bands: Band[];
  courses: Course[];
  onResolve?: (conflictId: string) => void;
}

type FilterType = 'all' | 'equipment' | 'teacher_leave' | 'overday' | 'overlap';

export function ConflictPanel({
  conflicts,
  rooms,
  bands,
  courses,
  onResolve,
}: ConflictPanelProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredConflicts = useMemo(() => {
    return conflicts
      .filter(c => {
        if (filter !== 'all' && c.type !== filter) return false;
        if (search) {
          const band = bands.find(b => b.id === c.affectedBookingIds?.[0]?.split('_')[0]);
          const bandName = band?.name.toLowerCase() || '';
          return bandName.includes(search.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        if (a.resolved && !b.resolved) return 1;
        if (!a.resolved && b.resolved) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [conflicts, filter, search, bands]);

  const stats = useMemo(() => {
    return {
      total: conflicts.length,
      unresolved: conflicts.filter(c => !c.resolved).length,
      equipment: conflicts.filter(c => c.type === 'equipment').length,
      teacher_leave: conflicts.filter(c => c.type === 'teacher_leave').length,
      overday: conflicts.filter(c => c.type === 'overday').length,
      overlap: conflicts.filter(c => c.type === 'overlap').length,
    };
  }, [conflicts]);

  const getTypeIcon = (type: string) => {
    const icons = {
      equipment: <MapPin className="w-4 h-4" />,
      teacher_leave: <Users className="w-4 h-4" />,
      overday: <Clock className="w-4 h-4" />,
      overlap: <AlertTriangle className="w-4 h-4" />,
    };
    return icons[type as keyof typeof icons] || <AlertTriangle className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      equipment: 'bg-warning text-warning-dark border-warning',
      teacher_leave: 'bg-conflict-light text-conflict-dark border-conflict',
      overday: 'bg-primary-light text-primary-dark border-primary',
      overlap: 'bg-conflict text-white border-conflict-dark',
    };
    return colors[type as keyof typeof colors] || 'bg-conflict text-white';
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-lg font-semibold text-primary-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-conflict" />
            冲突检测结果
          </h2>
          <p className="text-sm text-primary-600 mt-1">
            共检测到 <span className="font-semibold text-conflict">{stats.total}</span> 个冲突，
            待处理 <span className="font-semibold text-conflict">{stats.unresolved}</span> 个
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['all', 'equipment', 'teacher_leave', 'overday', 'overlap'] as FilterType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`
              p-3 rounded-lg border transition-all text-left
              ${filter === type
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                : 'border-primary-100 hover:border-primary-200 bg-white'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              {type === 'all' ? (
                <AlertTriangle className="w-4 h-4 text-primary-600" />
              ) : (
                getTypeIcon(type)
              )}
              <span className="text-xs font-medium text-primary-700">
                {type === 'all' ? '全部' : conflictTypeNames[type]}
              </span>
            </div>
            <div className="text-xl font-bold text-primary-900">
              {type === 'all' ? stats.total : stats[type as keyof typeof stats]}
            </div>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
        <input
          type="text"
          placeholder="搜索乐队名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
        />
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredConflicts.length === 0 ? (
          <div className="text-center py-12 text-primary-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="font-medium">暂无匹配的冲突记录</p>
            <p className="text-sm mt-1">所有预约安排合理，没有冲突</p>
          </div>
        ) : (
          filteredConflicts.map(conflict => {
            const band = bands.find(b => b.id === conflict.bookingId.split('_')[0]);
            const room = rooms.find(r => r.id === conflict.roomId);
            const course = courses.find(c => c.id === conflict.courseId);
            const isExpanded = expandedId === conflict.id;

            return (
              <div
                key={conflict.id}
                className={`
                  border rounded-lg overflow-hidden transition-all
                  ${conflict.resolved
                    ? 'border-success/30 bg-success/5'
                    : 'border-conflict/30 bg-conflict/5'
                  }
                `}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-primary-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : conflict.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${getTypeColor(conflict.type)}
                    `}>
                      {getTypeIcon(conflict.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`
                          text-xs font-medium px-2 py-0.5 rounded
                          ${getTypeColor(conflict.type)}
                        `}>
                          {conflictTypeNames[conflict.type]}
                        </span>
                        {conflict.resolved && (
                          <span className="badge-success flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            已解决
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-primary-900">
                        {conflict.description}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-primary-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {band?.name || '未知乐队'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {room?.name || '未知房间'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(conflict.bookingStartTime)} ~ {formatTime(conflict.bookingEndTime)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-5 h-5 text-primary-400 transition-transform flex-shrink-0 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-primary-100 p-4 bg-white/80">
                    <div className="space-y-4">
                      {conflict.impactAnalysis && (
                        <div>
                          <h5 className="text-sm font-medium text-primary-800 mb-2">影响分析</h5>
                          <p className="text-sm text-primary-700">
                            {conflict.impactAnalysis}
                          </p>
                        </div>
                      )}

                      {conflict.affectedBookingIds && conflict.affectedBookingIds.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-primary-800 mb-2">
                            影响的预约 ({conflict.affectedBookingIds.length})
                          </h5>
                          <div className="space-y-1">
                            {conflict.affectedBookingIds.map((bid, idx) => {
                              const bBand = bands.find(b => bid.startsWith(b.id));
                              return (
                                <div
                                  key={idx}
                                  className="text-xs bg-primary-50 px-3 py-1.5 rounded flex items-center gap-2"
                                >
                                  <span className="text-primary-700">{bBand?.name || bid}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/booking/${bid}`);
                                    }}
                                    className="text-primary-500 hover:text-primary-700 ml-auto"
                                  >
                                    查看
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {conflict.suggestions && conflict.suggestions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-primary-800 mb-2">建议处理方案</h5>
                          <ul className="space-y-1">
                            {conflict.suggestions.map((suggestion, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-primary-700 flex items-start gap-2"
                              >
                                <span className="text-success font-bold mt-0.5">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-primary-100">
                        <span className="text-xs text-primary-500">
                          检测时间：{formatDateTime(conflict.createdAt)}
                        </span>
                        <div className="flex gap-2">
                          {!conflict.resolved && onResolve && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onResolve(conflict.id);
                              }}
                              className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              标记已解决
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/booking/${conflict.bookingId}`);
                            }}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            查看详情
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
