import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, RotateCcw, Send, MinusCircle, AlertTriangle, User as UserIcon, Calendar as CalendarIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { useWarningStore } from '@/store/useWarningStore';
import StatusBadge from '@/components/StatusBadge';
import RemarkTimeline from '@/components/RemarkTimeline';
import ScreenshotGrid from '@/components/ScreenshotGrid';
import type { WarningStatus } from '@/types';
import { RISK_LABEL } from '@/types';

export default function WarningDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const getWarningById = useWarningStore((s) => s.getWarningById);
  const updateStatus = useWarningStore((s) => s.updateStatus);
  const addRemark = useWarningStore((s) => s.addRemark);
  const warning = getWarningById(id);

  const [remarkContent, setRemarkContent] = useState('');
  const [isTemporaryLedger, setIsTemporaryLedger] = useState(false);
  const [judgmentImpact, setJudgmentImpact] = useState('');

  if (!warning) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-600 mb-4">未找到该预警记录</p>
          <button onClick={() => navigate('/')} className="text-deep-sea-700 font-medium hover:underline">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const riskColor: Record<string, string> = {
    high: 'bg-red-50 text-red-700 ring-red-600/20',
    medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    low: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  };

  const handleSubmitRemark = () => {
    if (!remarkContent.trim()) return;
    addRemark(warning.id, {
      content: remarkContent.trim(),
      author: '老许',
      isTemporaryLedger,
      judgmentImpact: isTemporaryLedger ? judgmentImpact.trim() || undefined : undefined,
    });
    setRemarkContent('');
    setJudgmentImpact('');
    setIsTemporaryLedger(false);
  };

  const handleStatusChange = (status: WarningStatus) => {
    updateStatus(warning.id, status, '老许');
  };

  const statusButtons: { status: WarningStatus; label: string; icon: React.ReactNode; tone: string }[] = [
    { status: 'confirmed', label: '确认通过', icon: <CheckCircle2 size={16} />, tone: 'bg-emerald-600 hover:bg-emerald-700' },
    { status: 'pending', label: '标记待补件', icon: <Send size={16} />, tone: 'bg-amber-500 hover:bg-amber-600' },
    { status: 'returned', label: '退回', icon: <RotateCcw size={16} />, tone: 'bg-slate-500 hover:bg-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-deep-sea-50/30">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-deep-sea-700 mb-3"
          >
            <ArrowLeft size={16} />
            返回预警列表
          </button>

          {warning.isNegativeCorrection && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 ring-1 ring-red-600/20 animate-breathing-red">
              <MinusCircle size={18} className="text-red-600" />
              <span className="text-sm font-medium text-red-700">负数冲正记录</span>
              <span className="text-xs text-red-600">请特别关注金额方向及关联台账</span>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900 font-mono">{warning.billNo}</h1>
                <StatusBadge status={warning.status} />
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ${riskColor[warning.riskLevel]}`}>
                  <AlertTriangle size={12} />
                  {RISK_LABEL[warning.riskLevel]}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 ring-1 ring-slate-200 text-xs font-medium">
                  {warning.riskType}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{warning.customerName}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold font-mono ${warning.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                ¥{warning.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-deep-sea-600" />
            风险描述
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">{warning.description}</p>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoItem icon={<CalendarIcon size={16} />} label="预警日期" value={warning.createDate} />
          <InfoItem icon={<UserIcon size={16} />} label="操作人" value={warning.operator || '待处理'} />
          <InfoItem icon={<CalendarIcon size={16} />} label="确认日期" value={warning.confirmDate || '—'} />
          <InfoItem icon={<FileText size={16} />} label="备注数量" value={String(warning.remarks.length)} />
        </div>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">状态操作</h2>
          <div className="flex flex-wrap gap-2">
            {statusButtons.map((b) => {
              const active = warning.status === b.status;
              return (
                <button
                  key={b.status}
                  onClick={() => handleStatusChange(b.status)}
                  disabled={active}
                  className={[
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-60',
                    active ? 'bg-deep-sea-700 opacity-100 ring-2 ring-offset-2 ring-deep-sea-300' : b.tone,
                  ].join(' ')}
                >
                  {b.icon}
                  {b.label}
                  {active && '（当前）'}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ImageIcon size={16} className="text-deep-sea-600" />
            截图说明（{warning.screenshots.length}）
          </h2>
          <ScreenshotGrid screenshots={warning.screenshots} />
        </section>

        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-deep-sea-600" />
            人工备注（{warning.remarks.length}）
          </h2>
          <div className="mb-5">
            <RemarkTimeline remarks={warning.remarks} />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTemporaryLedger}
                  onChange={(e) => setIsTemporaryLedger(e.target.checked)}
                  className="rounded border-slate-300 text-deep-sea-600 focus:ring-deep-sea-500"
                />
                临时台账备注（社区公示前补充）
              </label>
            </div>
            <textarea
              value={remarkContent}
              onChange={(e) => setRemarkContent(e.target.value)}
              rows={3}
              placeholder={isTemporaryLedger ? '请输入临时台账备注内容…' : '请输入人工备注内容…'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-deep-sea-500/30 focus:border-deep-sea-500 transition resize-none"
            />
            {isTemporaryLedger && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-amber-700 mb-1.5">
                  该备注改变了哪些判断？
                </label>
                <input
                  type="text"
                  value={judgmentImpact}
                  onChange={(e) => setJudgmentImpact(e.target.value)}
                  placeholder="如：风险等级调整、原判断依据变更等"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                />
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSubmitRemark}
                disabled={!remarkContent.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-deep-sea-700 rounded-lg hover:bg-deep-sea-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <FileText size={14} />
                提交备注
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/60 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <span className="text-deep-sea-600">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800 truncate">{value}</div>
    </div>
  );
}
