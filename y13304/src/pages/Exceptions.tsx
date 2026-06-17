import { useState } from 'react';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Upload, 
  FileText,
  Image,
  FileJson,
  Link as LinkIcon,
  Plus,
  CheckCircle2,
  Clock,
  User,
  Copy
} from 'lucide-react';
import { StatusBadge, EvaluationTypeBadge, JudgmentBadge } from '../components/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import type { TicketStatus } from '../types';
import { cn } from '../lib/utils';

export default function Exceptions() {
  const { 
    tickets, 
    markDuplicate, 
    unmarkDuplicate, 
    updateTicketStatus,
    addEvidence,
    getDuplicateRecords
  } = useDashboardStore();
  
  const [selectedEvals, setSelectedEvals] = useState<Set<string>>(new Set());
  const [uploadTicketId, setUploadTicketId] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    type: 'screenshot' as const,
    name: '',
    description: '',
  });

  const duplicateRecords = getDuplicateRecords();
  const supplementaryTickets = tickets.filter(t => t.isSupplementary);
  const needEvidenceTickets = tickets.filter(t => t.status === 'need_evidence');

  const toggleEvalSelection = (evalId: string) => {
    const newSelected = new Set(selectedEvals);
    if (newSelected.has(evalId)) {
      newSelected.delete(evalId);
    } else {
      newSelected.add(evalId);
    }
    setSelectedEvals(newSelected);
  };

  const handleMarkDuplicate = (evalId: string, parentEvalId: string) => {
    markDuplicate(evalId, parentEvalId);
  };

  const handleUnmarkDuplicate = (evalId: string) => {
    unmarkDuplicate(evalId);
  };

  const handleBatchMarkDuplicate = () => {
    selectedEvals.forEach(evalId => {
      const ticket = tickets.find(t => t.evaluations.some(e => e.id === evalId));
      if (ticket) {
        const parentEval = ticket.evaluations.find(e => !e.isDuplicate && e.id !== evalId);
        if (parentEval) {
          markDuplicate(evalId, parentEval.id);
        }
      }
    });
    setSelectedEvals(new Set());
  };

  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    updateTicketStatus(ticketId, status);
  };

  const handleUploadEvidence = (ticketId: string) => {
    addEvidence(ticketId, {
      ...uploadForm,
      url: '#',
      uploadedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      uploadedBy: '当前用户',
    });
    setUploadTicketId(null);
    setUploadForm({ type: 'screenshot', name: '', description: '' });
  };

  const EvidenceIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'screenshot': return <Image size={16} className="text-blue-500" />;
      case 'log': return <FileJson size={16} className="text-orange-500" />;
      case 'document': return <FileText size={16} className="text-green-500" />;
      default: return <LinkIcon size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">重复评测工单</p>
              <p className="text-2xl font-bold text-slate-800 font-mono">{duplicateRecords.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">后补备注工单</p>
              <p className="text-2xl font-bold text-slate-800 font-mono">{supplementaryTickets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">需补证据工单</p>
              <p className="text-2xl font-bold text-slate-800 font-mono">{needEvidenceTickets.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              重复评测处理
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              标记重复评测记录，合并统计计数，确保指标准确性
            </p>
          </div>
          {selectedEvals.size > 0 && (
            <button
              onClick={handleBatchMarkDuplicate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <Check size={16} />
              批量标记重复 ({selectedEvals.size})
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {duplicateRecords.map((record) => {
            const normalEvals = record.evaluations.filter(e => !e.isDuplicate);
            const duplicateEvals = record.evaluations.filter(e => e.isDuplicate);
            
            return (
              <div key={record.ticketId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {record.ticketNo}
                      </span>
                      <StatusBadge status="duplicate" />
                      <button 
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        onClick={() => navigator.clipboard.writeText(record.ticketNo)}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-400 font-medium mb-1">原始工单说法：</p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {record.originalContent}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 ml-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">评测记录</p>
                  
                  {normalEvals.map((evalItem) => (
                    <div key={evalItem.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                        <EvaluationTypeBadge type={evalItem.type} />
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-600">
                          {evalItem.modelVersion}
                        </span>
                        <JudgmentBadge judgment={evalItem.judgment} />
                        <span className="text-xs text-slate-400 ml-auto">
                          <User size={12} className="inline mr-1" />
                          {evalItem.evaluatedBy} · {evalItem.evaluatedAt}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 ml-7">{evalItem.summaryContent}</p>
                    </div>
                  ))}

                  {duplicateEvals.map((evalItem) => (
                    <div 
                      key={evalItem.id} 
                      className={cn(
                        "border rounded-lg p-4 transition-all",
                        evalItem.isDuplicate 
                          ? "bg-red-50 border-red-200" 
                          : "bg-white border-slate-200",
                        selectedEvals.has(evalItem.id) && "ring-2 ring-blue-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEvals.has(evalItem.id)}
                          onChange={() => toggleEvalSelection(evalItem.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <X className={cn("shrink-0", evalItem.isDuplicate ? "text-red-500" : "text-slate-400")} size={18} />
                        <EvaluationTypeBadge type={evalItem.type} />
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-600">
                          {evalItem.modelVersion}
                        </span>
                        <JudgmentBadge judgment={evalItem.judgment} />
                        <span className="text-xs text-slate-400 ml-auto">
                          <User size={12} className="inline mr-1" />
                          {evalItem.evaluatedBy} · {evalItem.evaluatedAt}
                        </span>
                        {evalItem.isDuplicate ? (
                          <button
                            onClick={() => handleUnmarkDuplicate(evalItem.id)}
                            className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                          >
                            取消标记
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const parentEval = normalEvals[0];
                              if (parentEval) {
                                handleMarkDuplicate(evalItem.id, parentEval.id);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                          >
                            标记重复
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-2 ml-7">{evalItem.summaryContent}</p>
                      {evalItem.judgeNotes && (
                        <p className="text-xs text-slate-500 italic mt-1 ml-7">
                          备注：{evalItem.judgeNotes}
                        </p>
                      )}
                      {evalItem.isDuplicate && (
                        <p className="text-xs text-red-600 mt-2 ml-7 flex items-center gap-1">
                          <X size={12} />
                          已标记为重复，不计入统计
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="text-purple-500" size={20} />
            后补备注识别
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            后补备注工单需要特殊处理，确保同一条后补备注不被重复计数
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {supplementaryTickets.map((ticket) => (
            <div key={ticket.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm font-medium text-slate-800">{ticket.ticketNo}</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                      后补备注
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-2">原始工单内容</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{ticket.originalContent}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-xs font-medium text-purple-600 mb-2">后补备注内容</p>
                      <p className="text-sm text-purple-800 leading-relaxed">{ticket.supplementaryNote}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <p className="text-xs text-slate-500">
                      评测次数：<span className="font-mono font-medium text-slate-700">{ticket.evaluations.length}</span> 次
                      （去重后：<span className="font-mono font-medium text-green-600">{ticket.evaluations.filter(e => !e.isDuplicate).length}</span> 次）
                    </p>
                    {ticket.status !== 'processed' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'processed')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check size={14} />
                        标记已处理
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="text-orange-500" size={20} />
            证据材料管理
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            上传补充证据材料，关联到对应工单，建立完整证据链
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {needEvidenceTickets.map((ticket) => (
            <div key={ticket.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium text-slate-800">{ticket.ticketNo}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-sm text-slate-700">{ticket.originalContent}</p>
                </div>
                <button
                  onClick={() => setUploadTicketId(uploadTicketId === ticket.id ? null : ticket.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  上传材料
                </button>
              </div>

              {uploadTicketId === ticket.id && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">材料类型</label>
                      <select
                        value={uploadForm.type}
                        onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="screenshot">截图</option>
                        <option value="log">日志文件</option>
                        <option value="document">文档</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">文件名称</label>
                      <input
                        type="text"
                        value={uploadForm.name}
                        onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                        placeholder="请输入文件名称"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">描述说明</label>
                      <textarea
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                        placeholder="请输入材料描述说明"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                      <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                      <p className="text-xs text-slate-500">拖拽文件到此处或点击上传</p>
                    </div>
                    <button
                      onClick={() => handleUploadEvidence(ticket.id)}
                      disabled={!uploadForm.name}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认上传
                    </button>
                    <button
                      onClick={() => setUploadTicketId(null)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {ticket.evidence.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {ticket.evidence.map((ev) => (
                    <div key={ev.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <EvidenceIcon type={ev.type} />
                        <span className="text-sm font-medium text-slate-700 truncate">{ev.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{ev.description}</p>
                      <p className="text-xs text-slate-400">{ev.uploadedAt}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                {ticket.status === 'need_evidence' && ticket.evidence.length > 0 && (
                  <button
                    onClick={() => handleUpdateStatus(ticket.id, 'processed')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check size={14} />
                    证据已补充，标记已处理
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
