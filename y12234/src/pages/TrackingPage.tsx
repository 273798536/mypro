import { useState } from 'react';
import { GitBranch, AlertCircle, CheckCircle, FileText, User, Clock, MapPin, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { useAppStore } from '../store';
import { TimelineEvent, ProblemMark } from '../types';

export default function TrackingPage() {
  const { getTimelineEvents, problems, resolveProblem, isDataLoaded } = useAppStore();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const timelineEvents = getTimelineEvents();
  
  const filteredEvents = filterType === 'all' 
    ? timelineEvents 
    : timelineEvents.filter(e => e.type === filterType);

  const getEventIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      plate_change: <FileText className="w-5 h-5" />,
      refund: <AlertCircle className="w-5 h-5" />,
      deduction: <CheckCircle className="w-5 h-5" />,
      calculation: <GitBranch className="w-5 h-5" />,
      binding: <Link2 className="w-5 h-5" />
    };
    return icons[type] || <FileText className="w-5 h-5" />;
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'error') return 'bg-red-100 text-red-600 border-red-200';
    const colors: Record<string, string> = {
      plate_change: 'bg-purple-100 text-purple-600',
      refund: 'bg-amber-100 text-amber-600',
      deduction: 'bg-emerald-100 text-emerald-600',
      calculation: 'bg-blue-100 text-blue-600',
      binding: 'bg-pink-100 text-pink-600'
    };
    return colors[type] || 'bg-slate-100 text-slate-600';
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels: Record<string, string> = {
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[severity]}`}>
        {labels[severity]}
      </span>
    );
  };

  const unresolvedProblems = problems.filter(p => !p.isResolved);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-xl">
              <GitBranch className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">事件追踪中心</h2>
              <p className="text-sm text-slate-500">查看所有事件时间线和问题追踪</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              待处理问题: <span className="font-semibold text-red-600">{unresolvedProblems.length}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: '全部' },
            { key: 'binding', label: '换绑事件' },
            { key: 'calculation', label: '计算事件' },
            { key: 'deduction', label: '抵扣事件' },
            { key: 'plate_change', label: '状态变更' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === filter.key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isDataLoaded ? (
          filteredEvents.length > 0 ? (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
              
              <div className="space-y-6">
                {filteredEvents.map((event: TimelineEvent) => (
                  <div key={event.id} className="relative pl-14">
                    <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-2 ${getEventColor(event.type, event.status)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${
                      event.status === 'error' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-800">{event.title}</h4>
                          <p className="text-sm text-slate-500">{event.description}</p>
                        </div>
                        <button
                          onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {expandedEvent === event.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(event.time)}
                        </div>
                      </div>

                      {expandedEvent === event.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          {event.type === 'binding' && event.relatedData && (
                            <div className="space-y-3">
                              {event.relatedData.failReason && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                  <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                                    <AlertCircle className="w-4 h-4" />
                                    失败原因
                                  </div>
                                  <p className="text-sm text-red-600">{event.relatedData.failReason}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500">旧车牌:</span>
                                  <span className="ml-2 font-medium text-slate-800">{event.relatedData.oldPlate}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">新车牌:</span>
                                  <span className="ml-2 font-medium text-slate-800">{event.relatedData.newPlate}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">操作人:</span>
                                  <span className="ml-2 font-medium text-slate-800">{event.relatedData.operator}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">状态:</span>
                                  <span className="ml-2 font-medium text-slate-800">{event.relatedData.status}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {event.type === 'calculation' && event.relatedData && (
                            <div className="text-sm text-slate-600">
                              <p>相关记录ID: {event.relatedData.relatedRecordIds?.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无符合条件的事件</p>
            </div>
          )
        ) : (
          <div className="text-center py-16 text-slate-400">
            <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>请先导入数据以查看事件追踪</p>
          </div>
        )}
      </div>

      {unresolvedProblems.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">待处理问题明细</h3>
          <div className="space-y-4">
            {unresolvedProblems.map((problem: ProblemMark) => (
              <div key={problem.id} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getSeverityBadge(problem.severity)}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-1">{problem.description}</h4>
                      <p className="text-sm text-slate-500">触发源: {problem.triggerSource}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => resolveProblem(problem.id)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
                  >
                    标记已解决
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <MapPin className="w-4 h-4" />
                      当前卡点
                    </div>
                    <p className="text-sm text-slate-600">{problem.stuckPoint}</p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <FileText className="w-4 h-4" />
                      缺失材料
                    </div>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {problem.missingMaterial.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      下一步操作
                    </div>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {problem.nextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="w-4 h-4" />
                    责任人: <span className="font-medium text-slate-700">{problem.responsibleParty}</span>
                  </div>
                  <span className="text-sm text-slate-400">问题类型: {problem.problemType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
