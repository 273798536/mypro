import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  Calendar,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Edit3,
  History,
  Download,
  BookOpen,
} from 'lucide-react';
import { DataChainView } from '../components/booking/DataChainView';
import { RoomChangeForm } from '../components/booking/RoomChangeForm';
import { useDataStore } from '../store/useDataStore';
import { useBookingStore } from '../store/useBookingStore';
import { useConflictStore } from '../store/useConflictStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { ExportDialog } from '../components/review/ExportDialog';
import { formatDateTime, formatTime, formatDate, dayjsInstance } from '../utils/dateUtils';
import { conflictTypeNames } from '../data/sampleData';

export function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'chain' | 'history'>('info');
  const [showExport, setShowExport] = useState(false);

  const { rooms, bands, courses, loadFromStorage } = useDataStore();
  const { bookings, changeRoom, adjustTime, resolveConflict } = useBookingStore();
  const { conflicts, getConflictsByBooking, markResolved } = useConflictStore();
  const { changeHistories, getHistoryByBooking, loadFromStorage: loadHistory } = useHistoryStore();

  useEffect(() => {
    loadFromStorage();
    loadHistory();
  }, [loadFromStorage, loadHistory]);

  const booking = bookings.find(b => b.id === id);
  const bookingConflicts = booking ? getConflictsByBooking(booking.id) : [];
  const bookingHistory = booking ? getHistoryByBooking(booking.id) : [];

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card p-12 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-conflict mx-auto mb-4" />
          <h2 className="font-serif text-xl font-bold text-primary-900 mb-2">
            预约不存在
          </h2>
          <p className="text-primary-600 mb-6">
            无法找到ID为 {id} 的预约记录
          </p>
          <button
            onClick={() => navigate('/board')}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            返回看板
          </button>
        </div>
      </div>
    );
  }

  const room = rooms.find(r => r.id === booking.roomId);
  const band = bands.find(b => b.id === booking.bandId);
  const course = courses.find(c => c.id === booking.courseId);
  const startTime = dayjsInstance(booking.startTime);
  const endTime = dayjsInstance(booking.endTime);
  const duration = endTime.diff(startTime, 'hour', true);

  const unresolvedConflicts = bookingConflicts.filter(c => !c.resolved);

  const statusConfig = {
    normal: {
      label: '正常',
      icon: <CheckCircle className="w-4 h-4" />,
      className: 'badge-success',
    },
    conflict: {
      label: '有冲突',
      icon: <AlertTriangle className="w-4 h-4" />,
      className: 'badge-conflict',
    },
    resolved: {
      label: '已解决',
      icon: <CheckCircle className="w-4 h-4" />,
      className: 'badge-success',
    },
  };

  const status = statusConfig[booking.status as keyof typeof statusConfig];

  const handleChangeRoom = (newRoomId: string, newStartTime?: string, newEndTime?: string) => {
    changeRoom(booking.id, newRoomId);
    if (newStartTime && newEndTime && (newStartTime !== booking.startTime || newEndTime !== booking.endTime)) {
      adjustTime(booking.id, newStartTime, newEndTime);
    }
    setShowChangeForm(false);
  };

  const handleResolveConflict = (conflictId: string) => {
    markResolved(conflictId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/board')}
          className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-primary-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-primary-900">
              预约详情
            </h1>
            <span className={status.className}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-primary-500 text-sm mt-1">
            ID: <code className="bg-primary-50 px-1.5 py-0.5 rounded text-xs">{booking.id}</code>
            <span className="mx-2">·</span>
            版本: <code className="bg-primary-50 px-1.5 py-0.5 rounded text-xs">{booking.version}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          {!showChangeForm && (
            <button
              onClick={() => setShowChangeForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              调整预约
            </button>
          )}
        </div>
      </div>

      {unresolvedConflicts.length > 0 && (
        <div className="card p-4 bg-conflict/5 border-conflict/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-conflict/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-conflict" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-conflict-dark">
                存在 {unresolvedConflicts.length} 个待处理冲突
              </h3>
              <p className="text-sm text-conflict/80 mt-1">
                请查看下方冲突列表，根据建议处理后标记为已解决，或调整预约信息。
              </p>
            </div>
          </div>
        </div>
      )}

      {showChangeForm ? (
        <RoomChangeForm
          booking={booking}
          rooms={rooms}
          onSubmit={handleChangeRoom}
          onCancel={() => setShowChangeForm(false)}
        />
      ) : (
        <>
          <div className="flex gap-2 border-b border-primary-100">
            {[
              { id: 'info', label: '基本信息', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'chain', label: '数据链路', icon: <GitBranch className="w-4 h-4" /> },
              { id: 'history', label: '变更历史', icon: <History className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-800 font-medium'
                    : 'border-transparent text-primary-500 hover:text-primary-700'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'history' && bookingHistory.length > 0 && (
                  <span className="bg-primary-100 text-primary-600 text-xs px-1.5 py-0.5 rounded-full">
                    {bookingHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                  <h3 className="font-serif text-lg font-semibold text-primary-900 mb-6">
                    预约信息
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm text-primary-500">乐队</div>
                        <div className="font-medium text-primary-900">
                          {band?.name || '未知乐队'}
                        </div>
                        {band && (
                          <div className="text-xs text-primary-500 mt-1">
                            {band.members.length} 名成员
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm text-primary-500">排练室</div>
                        <div className="font-medium text-primary-900">
                          {room?.name || '未知房间'}
                        </div>
                        {room && (
                          <div className="text-xs text-primary-500 mt-1">
                            容量 {room.capacity}人
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm text-primary-500">日期</div>
                        <div className="font-medium text-primary-900">
                          {formatDate(booking.startTime)}
                        </div>
                        <div className="text-xs text-primary-500 mt-1">
                          时长 {duration} 小时
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm text-primary-500">时间</div>
                        <div className="font-medium text-primary-900">
                          {formatTime(booking.startTime)} ~ {formatTime(booking.endTime)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {room && (
                    <div className="mt-6 pt-6 border-t border-primary-100">
                      <h4 className="text-sm font-medium text-primary-700 mb-3">
                        排练室设备
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {room.equipment.map((eq, idx) => (
                          <span
                            key={idx}
                            className="bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-full"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {band && band.equipmentNeeds.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-primary-100">
                      <h4 className="text-sm font-medium text-primary-700 mb-3">
                        乐队设备需求
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {band.equipmentNeeds.map((eq, idx) => {
                          const isAvailable = room?.equipment.includes(eq);
                          return (
                            <span
                              key={idx}
                              className={`text-sm px-3 py-1.5 rounded-full ${
                                isAvailable
                                  ? 'bg-success-light text-success-dark'
                                  : 'bg-conflict-light text-conflict-dark'
                              }`}
                            >
                              {eq}
                              {!isAvailable && ' (缺失)'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {course && (
                    <div className="mt-6 pt-6 border-t border-primary-100">
                      <h4 className="text-sm font-medium text-primary-700 mb-3">
                        关联课程
                      </h4>
                      <div className="bg-primary-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-primary-900">
                              {course.name}
                            </div>
                            <div className="text-sm text-primary-600 mt-1">
                              授课教师：{course.teacher}
                            </div>
                          </div>
                          <span className="badge-primary">
                            {course.dayOfWeek}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {bookingConflicts.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
                      冲突记录 ({bookingConflicts.length})
                    </h3>
                    <div className="space-y-3">
                      {bookingConflicts.map(conflict => (
                        <div
                          key={conflict.id}
                          className={`p-4 rounded-lg border ${
                            conflict.resolved
                              ? 'border-success/30 bg-success/5'
                              : 'border-conflict/30 bg-conflict/5'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                ${conflict.resolved
                                  ? 'bg-success/20 text-success'
                                  : 'bg-conflict/20 text-conflict'
                                }
                              `}>
                                {conflict.resolved ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    conflict.resolved
                                      ? 'bg-success-light text-success-dark'
                                      : 'bg-conflict-light text-conflict-dark'
                                  }`}>
                                    {conflictTypeNames[conflict.type]}
                                  </span>
                                  {conflict.resolved && (
                                    <span className="text-xs text-success">已解决</span>
                                  )}
                                </div>
                                <p className="text-sm text-primary-800">
                                  {conflict.description}
                                </p>
                                {conflict.impactAnalysis && (
                                  <p className="text-xs text-primary-600 mt-2">
                                    {conflict.impactAnalysis}
                                  </p>
                                )}
                              </div>
                            </div>
                            {!conflict.resolved && (
                              <button
                                onClick={() => handleResolveConflict(conflict.id)}
                                className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                标记解决
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
                    数据概览
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-primary-50">
                      <span className="text-primary-600">创建时间</span>
                      <span className="text-sm text-primary-800">
                        {formatDateTime(booking.dataChain[0]?.timestamp || booking.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-primary-50">
                      <span className="text-primary-600">更新时间</span>
                      <span className="text-sm text-primary-800">
                        {formatDateTime(booking.dataChain[booking.dataChain.length - 1]?.timestamp || booking.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-primary-50">
                      <span className="text-primary-600">链路节点</span>
                      <span className="text-sm text-primary-800">
                        {booking.dataChain.length} 个
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-primary-600">操作历史</span>
                      <span className="text-sm text-primary-800">
                        {bookingHistory.length} 条
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
                    快捷操作
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab('chain')}
                      className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
                    >
                      <GitBranch className="w-4 h-4" />
                      查看数据链路
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      查看变更历史
                    </button>
                    <button
                      onClick={() => setShowExport(true)}
                      className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      导出此预约
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chain' && (
            <div className="card p-6">
              <DataChainView dataChain={booking.dataChain} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card p-6">
              <h4 className="text-sm font-medium text-primary-800 mb-4 flex items-center gap-2">
                <History className="w-4 h-4" />
                变更历史 ({bookingHistory.length} 条)
              </h4>
              {bookingHistory.length === 0 ? (
                <div className="text-center py-12 text-primary-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">暂无变更记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookingHistory.map(record => (
                    <div key={record.id} className="relative pl-8 pb-6 last:pb-0">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary-500 border-4 border-primary-100" />
                      {bookingHistory.indexOf(record) < bookingHistory.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-primary-200" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-primary-800">
                            {{
                              create: '创建预约',
                              change_room: '更换排练室',
                              adjust_time: '调整时间',
                              resolve_conflict: '解决冲突',
                              export: '导出数据',
                            }[record.actionType]}
                          </span>
                          {record.operator && (
                            <span className="text-xs text-primary-500">
                              · {record.operator}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-primary-500 mb-2">
                          {formatDateTime(record.timestamp)}
                        </div>
                        {record.remark && (
                          <p className="text-sm text-primary-700">{record.remark}</p>
                        )}
                        {record.fromValue && record.toValue && (
                          <div className="mt-2 bg-primary-50 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-primary-500">{record.field}:</span>
                              <span className="line-through text-primary-400">
                                {record.fromValue}
                              </span>
                              <span className="text-primary-400">→</span>
                              <span className="text-success-dark font-medium">
                                {record.toValue}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showExport && (
        <ExportDialog
          bookingId={booking.id}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
