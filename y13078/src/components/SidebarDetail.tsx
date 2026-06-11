import { useEffect, useState } from 'react';
import {
  Info, MapPin, Tag, Database, Calendar, User, FileText,
  ShieldAlert, StickyNote, CheckCircle2, AlertTriangle, XCircle,
  Trash2, Plus, Clipboard,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  typeLabel, statusLabel, formatDate, debounce, regionOfCabinet,
} from '@/utils/helpers';

export default function SidebarDetail() {
  const {
    selectedPointId, points, remarkSavingId, overlaps,
    updateRemark, markWithdrawn, addSupplement, markBadData,
  } = useAppStore();

  const p = points.find(pt => pt.id === selectedPointId) ?? null;
  const relatedOverlaps = overlaps.filter(o => o.pointIds.includes(selectedPointId ?? ''));

  const [remark, setRemark] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [supplementText, setSupplementText] = useState('');
  const [showSupplement, setShowSupplement] = useState(false);
  const [badDataReason, setBadDataReason] = useState('');
  const [badDataRow, setBadDataRow] = useState<number>(0);
  const [showBadData, setShowBadData] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setRemark(p?.remark ?? '');
    setShowWithdraw(false); setShowSupplement(false); setShowBadData(false);
  }, [p?.id, p?.remark]);

  useEffect(() => {
    if (remarkSavingId === null && p && savedFlash) {
      const t = setTimeout(() => setSavedFlash(false), 600);
      return () => clearTimeout(t);
    }
    if (remarkSavingId === p?.id) setSavedFlash(true);
  }, [remarkSavingId, p?.id, savedFlash]);

  const debouncedSave = debounce(
    (val: string) => p && updateRemark(p.id, val, '排班同事'),
    500,
  );
  const onRemarkChange = (v: string) => {
    setRemark(v);
    debouncedSave(v);
  };

  if (!p) {
    return (
      <div className="w-[340px] flex-shrink-0 h-full border-l border-cold-border bg-slate-900/40 flex flex-col">
        <div className="px-4 py-3 border-b border-cold-border">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cold-accent" />
            侧边明细
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">点击画布上的点位查看详情</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="w-16 h-16 rounded-full bg-cold-primary/20 flex items-center justify-center border border-cold-primary/40">
            <MapPin className="w-7 h-7 text-slate-500" />
          </div>
          <div>
            <div className="text-sm text-slate-300 mb-1">未选中点位</div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              在中央剖面图上点击任意标记点，<br />
              此处会同步展示编号、坐标、备注、<br />
              撤回记录与后补说明，保持三栏口径一致。
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-cold-border">
          <div className="chip chip-idle !w-full !justify-center gap-2 cursor-default">
            <Clipboard className="w-3 h-3" /> 标注 · 明细 · 报告 三栏数据同源
          </div>
        </div>
      </div>
    );
  }

  const stInfo = statusLabel[p.status];
  return (
    <div className="w-[340px] flex-shrink-0 h-full border-l border-cold-border bg-slate-900/50 flex flex-col">
      <div className="px-4 py-3 border-b border-cold-border flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-sm text-white font-semibold">{p.id}</span>
            <span className={`chip ${stInfo.color} border border-current/50 bg-current/10`}>
              {stInfo.text}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono-data">
            {typeLabel[p.type]} · {p.cabinetId} · {regionOfCabinet(p.cabinetId)}区
          </div>
        </div>
        {savedFlash && remarkSavingId !== p.id && (
          <CheckCircle2 className="w-4 h-4 text-cold-success shrink-0 animate-pulse" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Section icon={<Info className="w-3 h-3" />} title="基本信息">
          <Row label="坐标" mono>
            ({p.x}, {p.y}) px
          </Row>
          <Row label="所属机柜">{p.cabinetId}</Row>
          <Row label="类型">{typeLabel[p.type]}</Row>
          <Row label="原始行号" highlight={p.originalRow ?? undefined}>
            {p.originalRow ? `R-${p.originalRow}（Excel/CSV原始记录）` : '未关联'}
          </Row>
          <Row label="创建时间" mono>{formatDate(p.createdAt)}</Row>
          <Row label="更新时间" mono>{formatDate(p.updatedAt)}</Row>
          {p.originalRow && (
            <Row label="状态图标">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stInfo.dot}`} />
                <span className={stInfo.color}>{stInfo.text}</span>
              </span>
            </Row>
          )}
        </Section>

        {relatedOverlaps.length > 0 && (
          <Section icon={<AlertTriangle className="w-3 h-3 text-cold-danger" />} title="重叠检测" danger>
            {relatedOverlaps.map(o => {
              const other = o.pointIds.find(id => id !== p.id)!;
              return (
                <div key={o.pointIds.join('-')} className="mb-2 last:mb-0 p-2 rounded-[2px] bg-cold-danger/5 border border-cold-danger/30">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-data text-[11px] text-cold-danger">与 {other} 重叠</span>
                    <span className="text-[10px] text-slate-400 font-mono-data">
                      d={o.distance}px
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    严重程度：{o.severity === 'high' ? '高风险' : o.severity === 'medium' ? '中风险' : '低风险'}
                  </div>
                </div>
              );
            })}
          </Section>
        )}

        {p.isBadData && (
          <Section icon={<ShieldAlert className="w-3 h-3 text-cold-danger" />} title="坏数据标记" danger>
            <div className="text-[11px] text-cold-danger leading-relaxed p-2 rounded-[2px] bg-cold-danger/5 border border-cold-danger/30">
              {p.badDataReason ?? '已标记为异常数据，请核实。'}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 font-mono-data">
              原始行号 → R-{p.originalRow}
            </div>
          </Section>
        )}

        <Section icon={<FileText className="w-3 h-3 text-cold-primaryLight" />} title="备注（三栏同步）">
          <div className="relative">
            <textarea
              value={remark}
              onChange={e => onRemarkChange(e.target.value)}
              rows={4}
              placeholder="排班同事可在此编辑备注，失焦后自动同步至后端，标注层和报告将统一更新..."
              className="input-industrial !py-2 resize-none text-[12px] leading-relaxed"
            />
            {remarkSavingId === p.id && (
              <div className="absolute top-2 right-2 text-[10px] text-cold-accent font-mono-data flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cold-accent animate-pulse" />
                保存中
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span className="font-mono-data">{remark.length} 字</span>
            <span>防抖 500ms · 实时同步后端</span>
          </div>
        </Section>

        <Section icon={<Database className="w-3 h-3" />} title="时间线（撤回 + 后补）">
          {p.withdrawn && p.withdrawalInfo && (
            <TimelineItem
              color="#64748B"
              title="已撤回"
              tag={<XCircle className="w-3 h-3" />}
              subtitle={`${p.withdrawalInfo.operator} · ${formatDate(p.withdrawalInfo.timestamp)}`}
              content={p.withdrawalInfo.reason}
              strike
            />
          )}
          {p.supplements.slice().reverse().map(s => (
            <TimelineItem
              key={s.id}
              color="#F59E0B"
              title="后补说明"
              tag={<StickyNote className="w-3 h-3" />}
              subtitle={`${s.operator} · ${formatDate(s.timestamp)}`}
              content={s.content}
              highlight
            />
          ))}
          {!p.withdrawn && p.supplements.length === 0 && (
            <div className="text-[10px] text-slate-500 text-center py-3">暂无特殊记录</div>
          )}
        </Section>
      </div>

      <div className="border-t border-cold-border p-3 space-y-2 bg-slate-900/70">
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-industrial-danger justify-start"
            onClick={() => { setShowWithdraw(s => !s); setShowSupplement(false); setShowBadData(false); }}
            disabled={p.withdrawn}
          >
            <Trash2 className="w-3 h-3" /> 撤回记录
          </button>
          <button
            className="btn-industrial justify-start"
            onClick={() => { setShowSupplement(s => !s); setShowWithdraw(false); setShowBadData(false); }}
          >
            <Plus className="w-3 h-3" /> 后补说明
          </button>
        </div>
        <button
          className="btn-industrial w-full justify-start"
          onClick={() => { setShowBadData(s => !s); setShowWithdraw(false); setShowSupplement(false); }}
          disabled={p.isBadData}
        >
          <ShieldAlert className="w-3 h-3" /> 标记坏数据（绑定原始行）
        </button>

        {showWithdraw && (
          <div className="p-2.5 rounded-[2px] bg-slate-800/80 border border-cold-border space-y-2">
            <input
              className="input-industrial text-xs"
              placeholder="请输入撤回原因..."
              value={withdrawReason}
              onChange={e => setWithdrawReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-industrial" onClick={() => setShowWithdraw(false)}>取消</button>
              <button
                className="btn-industrial-danger"
                disabled={!withdrawReason.trim()}
                onClick={() => {
                  markWithdrawn(p.id, withdrawReason.trim(), '排班同事');
                  setWithdrawReason(''); setShowWithdraw(false);
                }}
              >
                确认撤回
              </button>
            </div>
          </div>
        )}
        {showSupplement && (
          <div className="p-2.5 rounded-[2px] bg-amber-500/5 border border-amber-500/30 space-y-2">
            <textarea
              className="input-industrial text-xs !py-1.5 resize-none"
              rows={2}
              placeholder="请输入补充说明内容..."
              value={supplementText}
              onChange={e => setSupplementText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-industrial" onClick={() => setShowSupplement(false)}>取消</button>
              <button
                className="btn-industrial-primary"
                disabled={!supplementText.trim()}
                onClick={() => {
                  addSupplement(p.id, supplementText.trim(), '排班同事');
                  setSupplementText(''); setShowSupplement(false);
                }}
              >
                追加后补
              </button>
            </div>
          </div>
        )}
        {showBadData && (
          <div className="p-2.5 rounded-[2px] bg-cold-danger/5 border border-cold-danger/30 space-y-2">
            <input
              className="input-industrial text-xs"
              placeholder="原因说明"
              value={badDataReason}
              onChange={e => setBadDataReason(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="input-industrial text-xs flex-1"
                type="number"
                placeholder="原始行号 R-???"
                value={badDataRow || ''}
                onChange={e => setBadDataRow(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-industrial" onClick={() => setShowBadData(false)}>取消</button>
              <button
                className="btn-industrial-danger"
                disabled={!badDataReason.trim() || !badDataRow}
                onClick={() => {
                  markBadData(p.id, badDataReason.trim(), badDataRow);
                  setBadDataReason(''); setBadDataRow(0); setShowBadData(false);
                }}
              >
                确认标记
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon, title, danger, children,
}: { icon: React.ReactNode; title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className="border-b border-cold-border/60 last:border-b-0">
      <div className={`px-4 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${danger ? 'text-cold-danger' : 'text-slate-300'}`}>
        {icon} {title}
      </div>
      <div className="px-4 pb-3 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function Row({
  label, children, mono, highlight,
}: { label: string; children: React.ReactNode; mono?: boolean; highlight?: number | string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="text-[10px] text-slate-500 shrink-0 w-20 flex items-center gap-1">
        {label === '原始行号' && <Tag className="w-3 h-3" />}
        {label === '创建时间' && <Calendar className="w-3 h-3" />}
        {label === '更新时间' && <Calendar className="w-3 h-3" />}
        {label}
      </span>
      <span className={`text-[11px] text-right ${mono ? 'font-mono-data' : ''} ${highlight ? 'text-cold-warning font-semibold' : 'text-slate-200'}`}>
        {children}
      </span>
    </div>
  );
}

function TimelineItem({
  color, title, tag, subtitle, content, strike, highlight,
}: {
  color: string;
  title: string;
  tag: React.ReactNode;
  subtitle: string;
  content: string;
  strike?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="relative pl-5 pb-3 last:pb-1">
      <div
        className="absolute left-0 top-0.5 w-2.5 h-2.5 rounded-full border-2"
        style={{ borderColor: color, background: highlight ? color : 'transparent' }}
      />
      <div className="absolute left-[4.5px] top-3 bottom-0 w-px bg-slate-700/60" />
      <div className="flex items-center gap-1.5 mb-0.5">
        <span style={{ color }} className="flex items-center gap-1 text-[11px] font-semibold">
          {tag} {title}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 font-mono-data mb-1">
        <User className="w-2.5 h-2.5 inline mr-0.5" />
        {subtitle}
      </div>
      <div
        className={`text-[11px] leading-relaxed px-2 py-1 rounded-[2px] ${
          highlight ? 'bg-amber-500/5 border border-amber-500/20 text-amber-100/85'
            : strike ? 'line-through text-slate-500'
            : 'text-slate-300'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
