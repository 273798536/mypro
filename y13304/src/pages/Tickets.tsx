import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Clock,
  User,
  FileText,
  Image,
  FileJson,
  Link as LinkIcon,
  Download,
  MessageSquare,
  Layers,
  Check,
  X
} from 'lucide-react';
import { StatusBadge, EvaluationTypeBadge, JudgmentBadge } from '../components/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import { modelVersions } from '../data/mockData';
import type { Ticket, Evaluation } from '../types';
import { cn } from '../lib/utils';

export default function Tickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    getFilteredTickets, 
    setFilters, 
    filters, 
    selectedTicketId, 
    setSelectedTicketId,
    updateTicketStatus
  } = useDashboardStore();
  
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showVersionCompare, setShowVersionCompare] = useState(false);

  const tickets = getFilteredTickets();
  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    const statusParam = searchParams.get('status');
    
    if (ticketParam) {
      setSelectedTicketId(ticketParam);
      setExpandedRowId(ticketParam);
    }
    if (statusParam) {
      setFilters({ status: statusParam as any });
    }
    
    return () => {
      setSearchParams({}, { replace: true });
    };
  }, [searchParams, setSelectedTicketId, setFilters, setSearchParams]);

  const toggleExpand = (ticketId: string) => {
    if (expandedRowId === ticketId) {
      setExpandedRowId(null);
      setSelectedTicketId(null);
    } else {
      setExpandedRowId(ticketId);
      setSelectedTicketId(ticketId);
    }
  };

  const getEvaluationsTimeline = (evaluations: Evaluation[]) => {
    return [...evaluations].sort((a, b) => 
      new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime()
    );
  };

  const getVersionComparisons = (ticket: Ticket) => {
    const versions = [...new Set(ticket.evaluations.map(e => e.modelVersion))].sort();
    if (versions.length < 2) return [];
    
    const comparisons = [];
    for (let i = 0; i < versions.length - 1; i++) {
      const v1 = versions[i];
      const v2 = versions[i + 1];
      const eval1 = ticket.evaluations.find(e => e.modelVersion === v1 && !e.isDuplicate);
      const eval2 = ticket.evaluations.find(e => e.modelVersion === v2 && !e.isDuplicate);
      
      if (eval1 && eval2) {
        comparisons.push({ v1: eval1, v2: eval2, version1: v1, version2: v2 });
      }
    }
    return comparisons;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索工单号或工单内容..."
              value={filters.searchKeyword}
              onChange={(e) => setFilters({ searchKeyword: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ status: e.target.value as any || null })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="processed">已处理</option>
              <option value="need_evidence">需补证据</option>
              <option value="duplicate">重复评测</option>
            </select>

            <select
              value={filters.modelVersion || ''}
              onChange={(e) => setFilters({ modelVersion: e.target.value || null })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
              <option value="">全部版本</option>
              {modelVersions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
              <Filter size={16} />
              更多筛选
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-10 px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">工单号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">问题描述</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">最新模型版本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">人工判断</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">评测次数</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">创建时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket, index) => {
                const latestEval = ticket.evaluations
                  .filter(e => !e.isDuplicate)
                  .sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime())[0];
                const evalCount = ticket.evaluations.filter(e => !e.isDuplicate).length;
                const isExpanded = expandedRowId === ticket.id;

                return (
                  <>
                    <tr 
                      key={ticket.id}
                      className={cn(
                        "hover:bg-slate-50 transition-colors cursor-pointer",
                        ticket.isSupplementary && "bg-purple-50/50",
                        isExpanded && "bg-blue-50/50"
                      )}
                      onClick={() => toggleExpand(ticket.id)}
                      style={{ animation: `fadeInUp 0.3s ease ${index * 50}ms both` }}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-slate-800">{ticket.ticketNo}</span>
                          {ticket.isSupplementary && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">后补</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <p className="text-sm text-slate-700 truncate">{ticket.originalContent}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded text-xs font-mono font-medium text-slate-700">
                          {latestEval?.modelVersion || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {latestEval ? <JudgmentBadge judgment={latestEval.judgment} /> : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-sm font-mono font-medium",
                          evalCount > 1 ? "text-orange-600" : "text-slate-600"
                        )}>
                          {evalCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {ticket.createdAt}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {ticket.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTicketStatus(ticket.id, 'processed');
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="标记已处理"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {ticket.status === 'need_evidence' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTicketStatus(ticket.id, 'processed');
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="证据已补充，标记已处理"
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={9} className="px-6 py-6">
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                  <MessageSquare size={18} className="text-blue-500" />
                                  原始工单内容
                                </h4>
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                  <p className="text-sm text-slate-700 leading-relaxed">
                                    {ticket.originalContent}
                                  </p>
                                </div>
                                {ticket.supplementaryNote && (
                                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                    <p className="text-xs font-medium text-purple-700 mb-1">后补备注：</p>
                                    <p className="text-sm text-purple-800 leading-relaxed">
                                      {ticket.supplementaryNote}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Layers size={18} className="text-cyan-500" />
                                    版本对比
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowVersionCompare(!showVersionCompare);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    {showVersionCompare ? '收起' : '展开'}
                                  </button>
                                </div>
                                {showVersionCompare && getVersionComparisons(ticket).length > 0 ? (
                                  <div className="space-y-3">
                                    {getVersionComparisons(ticket).map((comp, idx) => (
                                      <div key={idx} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
                                          <div className="p-2 text-xs font-medium text-slate-500 border-r border-slate-200">
                                            {comp.version1}（旧版本）
                                          </div>
                                          <div className="p-2 text-xs font-medium text-slate-500">
                                            {comp.version2}（新版本）
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2">
                                          <div className="p-3 border-r border-slate-200">
                                            <div className="mb-2">
                                              <JudgmentBadge judgment={comp.v1.judgment} />
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                              {comp.v1.summaryContent}
                                            </p>
                                            {comp.v1.judgeNotes && (
                                              <p className="text-xs text-slate-400 mt-2 italic">
                                                备注：{comp.v1.judgeNotes}
                                              </p>
                                            )}
                                          </div>
                                          <div className="p-3">
                                            <div className="mb-2">
                                              <JudgmentBadge judgment={comp.v2.judgment} />
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                              {comp.v2.summaryContent}
                                            </p>
                                            {comp.v2.judgeNotes && (
                                              <p className="text-xs text-slate-400 mt-2 italic">
                                                备注：{comp.v2.judgeNotes}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : showVersionCompare ? (
                                  <div className="bg-white rounded-lg p-4 border border-slate-200 text-center text-sm text-slate-500">
                                    该工单只有一个模型版本，暂无对比数据
                                  </div>
                                ) : (
                                  <div className="bg-white rounded-lg p-4 border border-slate-200 text-center text-sm text-slate-500">
                                    点击展开查看不同模型版本的人工判断对比
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" />
                                评测时间线
                              </h4>
                              <div className="relative pl-8">
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />
                                {getEvaluationsTimeline(ticket.evaluations).map((evalItem, idx) => (
                                  <div key={evalItem.id} className="relative mb-4 last:mb-0">
                                    <div className={cn(
                                      "absolute -left-5 w-4 h-4 rounded-full border-2 border-white",
                                      evalItem.isDuplicate 
                                        ? "bg-red-500" 
                                        : evalItem.type === 'supplementary'
                                        ? "bg-purple-500"
                                        : evalItem.type === 'version_update'
                                        ? "bg-cyan-500"
                                        : "bg-blue-500"
                                    )} />
                                    <div className={cn(
                                      "bg-white rounded-lg p-4 border transition-all",
                                      evalItem.isDuplicate 
                                        ? "border-red-200 bg-red-50/50" 
                                        : "border-slate-200 hover:border-slate-300"
                                    )}>
                                      <div className="flex items-center gap-3 mb-2">
                                        <EvaluationTypeBadge type={evalItem.type} />
                                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-600">
                                          {evalItem.modelVersion}
                                        </span>
                                        <JudgmentBadge judgment={evalItem.judgment} />
                                        <span className="text-xs text-slate-400 ml-auto">
                                          <User size={12} className="inline mr-1" />
                                          {evalItem.evaluatedBy} · {evalItem.evaluatedAt}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-700 mb-2">
                                        {evalItem.summaryContent}
                                      </p>
                                      {evalItem.judgeNotes && (
                                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                                          评测备注：{evalItem.judgeNotes}
                                        </p>
                                      )}
                                      {evalItem.isDuplicate && evalItem.parentEvaluationId && (
                                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                                          <X size={12} />
                                          已标记为重复，不计入统计
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {ticket.evidence.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                  <FileText size={18} className="text-green-500" />
                                  证据材料 ({ticket.evidence.length})
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                  {ticket.evidence.map((ev) => (
                                    <div key={ev.id} className="bg-white rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-colors">
                                      <div className="flex items-center gap-2 mb-2">
                                        {ev.type === 'screenshot' && <Image size={16} className="text-blue-500" />}
                                        {ev.type === 'log' && <FileJson size={16} className="text-orange-500" />}
                                        {ev.type === 'document' && <FileText size={16} className="text-green-500" />}
                                        {ev.type === 'other' && <LinkIcon size={16} className="text-slate-500" />}
                                        <span className="text-sm font-medium text-slate-700 truncate">{ev.name}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 mb-1">{ev.description}</p>
                                      <p className="text-xs text-slate-400">
                                        {ev.uploadedAt} · {ev.uploadedBy}
                                      </p>
                                      <button className="mt-2 w-full inline-flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                                        <Download size={12} /> 下载
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {tickets.length === 0 && (
          <div className="py-12 text-center">
            <Search className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">没有找到匹配的工单</p>
          </div>
        )}
      </div>
    </div>
  );
}
