
import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { Task, HistoryRecord } from '@/types';
import {
  History as HistoryIcon,
  Clock,
  MessageSquare,
  ArrowRight,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldX,
  FileText,
  Image,
  Target,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Tag,
} from 'lucide-react';

const HistoryPage = () => {
  const { tasks, getSelectedTask, selectTask } = useAppStore();
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allHistory = useMemo(() => {
    const list: (HistoryRecord & { taskId: string; taskName: string })[] = [];
    tasks.forEach((task: Task) => {
      task.history.forEach((h) => {
        list.push({ ...h, taskId: task.id, taskName: task.name });
      });
    });
    list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return list;
  }, [tasks]);

  const filteredHistory = useMemo(() => {
    return allHistory.filter((h) => {
      if (taskFilter !== 'all' && h.taskId !== taskFilter) return false;
      if (actionFilter !== 'all' && !h.action.includes(actionFilter)) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        if (
          !h.operator.toLowerCase().includes(q) &&
          !h.action.toLowerCase().includes(q) &&
          !h.reason.toLowerCase().includes(q) &&
          !h.taskName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allHistory, taskFilter, actionFilter, searchText]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    allHistory.forEach((h) => {
      const key = h.action.split(' ')[0].replace(/[（(].*[)）]/g, '').trim();
      set.add(key);
    });
    return Array.from(set);
  }, [allHistory]);

  if (!getSelectedTask()) {
    return (
      <div className="p-8">
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
          <HistoryIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">请先从数据仪表盘选择一个校验任务</p>
          <p className="text-slate-400 text-sm">或在下方筛选器中查看全部任务的历史记录</p>
        </div>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    if (action.includes('复核')) return ShieldCheck;
    if (action.includes('标记') || action.includes('离群')) return ShieldX;
    if (action.includes('剖面图') || action.includes('截图')) return Image;
    if (action.includes('补录') || action.includes('新增')) return Plus;
    if (action.includes('删除')) return Trash2;
    if (action.includes('校验') || action.includes('重复运行')) return RefreshCw;
    if (action.includes('状态')) return Tag;
    if (action.includes('备注')) return MessageSquare;
    return FileText;
  };

  const getActionColor = (action: string) => {
    if (action.includes('复核') || action.includes('完成') || action.includes('通过'))
      return { bg: 'bg-green-500', text: 'text-green-600', soft: 'bg-green-50 border-green-200' };
    if (action.includes('标记') || action.includes('拒绝') || action.includes('越界'))
      return { bg: 'bg-orange-500', text: 'text-orange-600', soft: 'bg-orange-50 border-orange-200' };
    if (action.includes('删除'))
      return { bg: 'bg-red-500', text: 'text-red-600', soft: 'bg-red-50 border-red-200' };
    if (action.includes('补录') || action.includes('新增') || action.includes('创建'))
      return { bg: 'bg-blue-500', text: 'text-blue-600', soft: 'bg-blue-50 border-blue-200' };
    if (action.includes('剖面图') || action.includes('更新'))
      return { bg: 'bg-purple-500', text: 'text-purple-600', soft: 'bg-purple-50 border-purple-200' };
    return { bg: 'bg-slate-500', text: 'text-slate-600', soft: 'bg-slate-50 border-slate-200' };
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">操作历史与审计追踪</h1>
        <p className="text-slate-500">完整记录谁在什么时候对什么数据做了什么修改，以及为什么修改</p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              任务筛选
            </label>
            <select
              value={taskFilter}
              onChange={(e) => {
                setTaskFilter(e.target.value);
                if (e.target.value !== 'all') selectTask(e.target.value);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全部任务 ({allHistory.length} 条)</option>
              {tasks.map((t: Task) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.history.length})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              操作类型
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全部操作</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              关键词搜索（操作人/原因/操作）
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="例如：张工、复核、电磁干扰..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">变更时间线</h2>
            <span className="text-sm text-slate-500">共 {filteredHistory.length} 条记录</span>
          </div>
        </div>

        <div className="p-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <HistoryIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">暂无匹配的历史记录</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-slate-200" />

              <div className="space-y-5">
                {filteredHistory.map((record) => {
                  const Icon = getActionIcon(record.action);
                  const color = getActionColor(record.action);
                  const isExpanded = expandedId === record.id;
                  const hasDiff = record.beforeData || record.afterData;

                  return (
                    <div key={record.id} className="relative pl-14">
                      <div
                        className={`absolute left-0 w-11 h-11 rounded-full flex items-center justify-center shadow-md ring-4 ring-white ${color.bg}`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div className={`rounded-xl border overflow-hidden ${color.soft}`}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          className="w-full p-4 flex items-start justify-between text-left hover:bg-white/40 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.bg} text-white`}
                              >
                                {record.action}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">
                                {record.operator}
                              </span>
                              <span className="text-xs text-slate-500 bg-white/70 px-2 py-0.5 rounded">
                                {record.taskName}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-slate-400 align-text-bottom" />
                              {record.reason}
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(record.timestamp).toLocaleString('zh-CN')}
                              </span>
                              {hasDiff && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" />
                                      收起变更详情
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" />
                                      展开变更详情
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {hasDiff && (
                            <div className="ml-4 text-slate-400 flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          )}
                        </button>

                        {isExpanded && hasDiff && (
                          <div className="px-4 pb-4 border-t border-slate-200/60 bg-white/50">
                            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {record.beforeData && (
                                <div className="rounded-lg border border-red-200 overflow-hidden">
                                  <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                    <span className="text-xs font-semibold text-red-700">
                                      变更前
                                    </span>
                                  </div>
                                  <div className="p-3 bg-white">
                                    <pre className="text-xs text-slate-700 overflow-x-auto font-mono whitespace-pre-wrap">
{JSON.stringify(record.beforeData, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              {record.afterData && (
                                <div className="rounded-lg border border-green-200 overflow-hidden">
                                  <div className="px-3 py-2 bg-green-50 border-b border-green-200 flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-xs font-semibold text-green-700">
                                      变更后
                                    </span>
                                  </div>
                                  <div className="p-3 bg-white">
                                    <pre className="text-xs text-slate-700 overflow-x-auto font-mono whitespace-pre-wrap">
{JSON.stringify(record.afterData, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                            {(record.beforeData && record.afterData) && (
                              <div className="mt-3 flex items-center justify-center text-slate-400">
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-xs font-medium">
                                  <span className="text-red-500">修改前</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  <span className="text-green-600">修改后</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          审计说明
        </h3>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>所有操作均不可删除、不可篡改，完整记录操作人、时间、原因和变更前后数据</li>
          <li>离群点复核必须填写原因，记录审核人、审核时间，用于后续质量追溯</li>
          <li>剖面图补录、数据点补录、删除等操作同样进入审计追踪</li>
          <li>重复运行校验会生成操作日志，便于排查校验过程异常</li>
        </ul>
      </div>
    </div>
  );
};

export default HistoryPage;
