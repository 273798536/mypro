import {
  X,
  GraduationCap,
  Calendar,
  UserPlus,
  LogOut,
  DollarSign,
  CheckCircle,
  ArrowDown,
  Clock,
  User,
} from 'lucide-react';
import { TraceNode, EntityType } from '../types';
import { useStore } from '../store/useStore';

export const TraceModal = () => {
  const selectedAttendanceId = useStore((state) => state.selectedAttendanceId);
  const traceModalOpen = useStore((state) => state.traceModalOpen);
  const setTraceModalOpen = useStore((state) => state.setTraceModalOpen);
  const getTraceChain = useStore((state) => state.getTraceChain);

  if (!traceModalOpen || !selectedAttendanceId) return null;

  const traceChain = getTraceChain(selectedAttendanceId);

  const entityConfig: Record<EntityType, { label: string; icon: typeof GraduationCap; color: string; bgColor: string }> = {
    coursePack: { label: '课包', icon: GraduationCap, color: 'text-teal-600', bgColor: 'bg-teal-100' },
    attendance: { label: '签到', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    substitute: { label: '代课', icon: UserPlus, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    leave: { label: '请假', icon: LogOut, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    freeze: { label: '冻结', icon: Clock, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    revenue: { label: '收入', icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setTraceModalOpen(false)}
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">全链路追溯</h2>
            <p className="text-sm text-gray-500">从课包购买到收入确认的完整流程</p>
          </div>
          <button
            onClick={() => setTraceModalOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {traceChain.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无追溯数据</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-teal-200 via-blue-200 to-emerald-200" />

              <div className="space-y-6">
                {traceChain.map((node, index) => {
                  const config = entityConfig[node.type];
                  const Icon = config.icon;
                  const isLast = index === traceChain.length - 1;

                  return (
                    <div key={node.id} className="relative pl-16">
                      <div
                        className={`absolute left-4 w-5 h-5 rounded-full ${config.bgColor} border-2 border-white shadow-md flex items-center justify-center`}
                      >
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>

                      <div
                        className={`relative p-4 rounded-xl border-2 ${config.bgColor} border-white shadow-sm`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {config.label}
                            </span>
                            <h3 className="font-semibold text-gray-800">{node.title}</h3>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(node.timestamp)}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{node.description}</p>

                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <User className="w-3.5 h-3.5" />
                          <span>操作人: {node.operator}</span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-white/50">
                          <div className="text-xs font-medium text-gray-600 mb-2">详细信息:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(node.details).map(([key, value]) => (
                              <div
                                key={key}
                                className="text-xs bg-white/60 rounded px-2 py-1"
                              >
                                <span className="text-gray-500">{key}: </span>
                                <span className="font-medium text-gray-700">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {!isLast && (
                        <div className="absolute left-6 -bottom-4 transform -translate-x-1/2">
                          <ArrowDown className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-teal-800">追溯完成</span>
                </div>
                <p className="text-sm text-teal-700">
                  共追溯到 {traceChain.length} 个关键节点，包含完整的操作链路和变更记录。
                  所有数据均可在审计日志中查证。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
