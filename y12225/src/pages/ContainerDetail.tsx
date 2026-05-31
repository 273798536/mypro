import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  ArrowLeft,
  Package,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Shield,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatFee(value: number): string {
  return `¥${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

const inspectionTypeLabels: Record<string, string> = {
  customs: '海关',
  quarantine: '检疫',
  security: '安全',
};

const inspectionStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待查验', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '查验中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
};

const storageTypeConfig: Record<string, { label: string; color: string }> = {
  normal: { label: '普通', color: 'text-slate-600' },
  inspection: { label: '查验', color: 'text-orange-600' },
  holiday: { label: '节假日', color: 'text-violet-600' },
};

const waiverTypeLabels: Record<string, string> = {
  inspection: '查验减免',
  delay: '延误减免',
  special: '特殊减免',
  holiday: '节假日减免',
};

const waiverStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已驳回', color: 'bg-rose-100 text-rose-700' },
  expired: { label: '过期', color: 'bg-rose-100 text-rose-700' },
};

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const containers = useStore((s) => s.containers);
  const confirmContainer = useStore((s) => s.confirmContainer);
  const addNote = useStore((s) => s.addNote);

  const container = containers.find((c) => c.id === id);

  const [noteText, setNoteText] = useState('');
  const [expandedAudits, setExpandedAudits] = useState<Record<string, boolean>>({});

  if (!container) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">未找到该集装箱信息</p>
          <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(container.id, noteText.trim());
    setNoteText('');
  };

  const handleConfirm = () => {
    if (window.confirm('确认该集装箱的减免核算结果？')) {
      confirmContainer(container.id);
    }
  };

  const toggleAudit = (waId: string) => {
    setExpandedAudits((prev) => ({ ...prev, [waId]: !prev[waId] }));
  };

  const groupedStorageRecords = container.storageRecords.reduce<
    Record<string, typeof container.storageRecords>
  >((acc, record) => {
    const date = formatDate(record.recordDate);
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回工作台</span>
        </Link>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-800">{container.containerNo}</h1>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">
            {container.containerType}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          基本信息
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400">箱号</p>
            <p className="text-sm font-medium text-slate-700">{container.containerNo}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">箱型</p>
            <p className="text-sm font-medium text-slate-700">{container.containerType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">来源编号</p>
            <p className="text-sm font-medium text-slate-700">{container.sourceRef}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">进港时间</p>
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(container.arrivalDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">出港时间</p>
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(container.departureDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">堆存天数</p>
            <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {container.storageDays}天
            </p>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4 flex items-end gap-6">
          <div>
            <p className="text-xs text-slate-400">原费</p>
            <p className="text-sm text-slate-700">{formatFee(container.originalFee)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">减免</p>
            <p
              className={`text-sm font-medium ${
                container.waivedFee > 0 ? 'text-emerald-600' : 'text-slate-700'
              }`}
            >
              {formatFee(container.waivedFee)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">实付</p>
            <p className="text-base font-bold text-slate-800">{formatFee(container.finalFee)}</p>
          </div>
        </div>
        {container.affectedByRuleChange && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">{container.affectedByRuleChange}</p>
          </div>
        )}
      </div>

      {container.inspectionRecords.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            查验记录
          </h2>
          {container.inspectionRecords.map((ir) => (
            <div
              key={ir.id}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {inspectionTypeLabels[ir.inspectionType]}
                </span>
                {ir.isCrossDay && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                    跨天
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    inspectionStatusConfig[ir.status]?.color ?? ''
                  }`}
                >
                  {inspectionStatusConfig[ir.status]?.label ?? ir.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(ir.startDate)} ~ {formatDate(ir.endDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {ir.durationDays}天
                </span>
              </div>
              {ir.remark && <p className="text-sm text-slate-500">{ir.remark}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          堆存记录
        </h2>
        <div className="relative pl-6 space-y-1">
          {Object.entries(groupedStorageRecords).map(([date, records]) => (
            <div key={date} className="relative">
              <div className="absolute left-[-22px] top-2 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
              <p className="text-xs font-medium text-slate-500 mb-1">{date}</p>
              <div className="space-y-1">
                {records.map((sr) => {
                  const typeConf = storageTypeConfig[sr.type] ?? storageTypeConfig.normal;
                  return (
                    <div
                      key={sr.id}
                      className={`flex items-center justify-between text-sm py-1 px-3 rounded ${
                        sr.isCrossDay ? 'border-l-2 border-orange-400 bg-orange-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${typeConf.color}`}>
                          {typeConf.label}
                        </span>
                        {sr.remark && (
                          <span className="text-xs text-slate-400">{sr.remark}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <span className="text-xs">费率 {formatFee(sr.dailyRate)}/天</span>
                        <span className="font-medium text-slate-700">
                          {formatFee(sr.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="absolute left-[-18px] top-0 bottom-0 w-px bg-slate-200" />
        </div>
      </div>

      {container.waiverApplications.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            减免申请
          </h2>
          {container.waiverApplications.map((wa) => {
            const statusConf = waiverStatusConfig[wa.status] ?? {
              label: wa.status,
              color: 'bg-slate-100 text-slate-600',
            };
            const isExpanded = expandedAudits[wa.id] ?? false;

            return (
              <div
                key={wa.id}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {waiverTypeLabels[wa.waiverType] ?? wa.waiverType}
                    </span>
                    <span className="text-sm text-slate-500">
                      {wa.waiverPercent > 0
                        ? `${wa.waiverPercent}% (${formatFee(wa.waiverAmount)})`
                        : formatFee(wa.waiverAmount)}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${statusConf.color}`}
                  >
                    {statusConf.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">申请日期：</span>
                    <span className="text-slate-600">{formatDate(wa.applyDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">到期日期：</span>
                    <span className="text-slate-600">{formatDate(wa.expireDate)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">原因：</span>
                    <span className="text-slate-600">{wa.reason}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">申请人：</span>
                    <span className="text-slate-600">{wa.applicant}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">规则版本：</span>
                    <span className="text-slate-600">{wa.ruleVersion}</span>
                  </div>
                </div>
                {wa.auditTrail.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleAudit(wa.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      审批记录 ({wa.auditTrail.length})
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2 pl-3 border-l-2 border-slate-100">
                        {wa.auditTrail.map((entry, idx) => (
                          <div key={idx} className="text-xs space-y-0.5">
                            <div className="flex items-center gap-2 text-slate-500">
                              <span>{formatDate(entry.timestamp)}</span>
                              <span className="text-slate-700 font-medium">{entry.actor}</span>
                              <span>{entry.action}</span>
                            </div>
                            {entry.oldValue && entry.newValue && (
                              <div className="text-slate-400">
                                {entry.oldValue} → {entry.newValue}
                              </div>
                            )}
                            {entry.remark && (
                              <div className="text-slate-400">{entry.remark}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          添加备注
        </h2>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full rounded-lg border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          rows={3}
          placeholder="输入备注内容..."
        />
        <button
          onClick={handleAddNote}
          disabled={!noteText.trim()}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          提交备注
        </button>
      </div>

      {container.status === 'pending' && (
        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          确认减免核算
        </button>
      )}
    </div>
  );
}
