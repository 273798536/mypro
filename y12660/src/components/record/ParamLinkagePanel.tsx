import { useState } from 'react';
import type { AvailabilityStatus, SoundRecord } from '@/types';
import { SectionTitle, EmptyState } from '@/components/common/Badges';
import { useParamLinkage } from '@/hooks/useParamLinkage';
import { useRecordsStore } from '@/store/records';
import { formatDateTime } from '@/utils/formatters';
import { Link2, ArrowRightLeft, Sparkles } from 'lucide-react';

const FIELD_OPTIONS: { value: keyof SoundRecord | 'availabilityStatus'; label: string }[] = [
  { value: 'deviceCode', label: '设备编号' },
  { value: 'deviceCoordinates', label: '设备坐标' },
  { value: 'rawRemark', label: '原始备注' },
  { value: 'cameraView', label: '相机视角' },
  { value: 'availabilityStatus', label: '可用状态' },
];

export function ParamLinkagePanel({ record }: { record: SoundRecord }) {
  const { flashField, changeAndTrace } = useParamLinkage();
  const addChange = useRecordsStore((s) => s.addParamChange);
  const [srcField, setSrcField] = useState<string>('deviceCoordinates');
  const [oldVal, setOldVal] = useState('');
  const [newVal, setNewVal] = useState('');
  const [reason, setReason] = useState('');

  const previewLink = (field: string) => {
    flashField(field);
  };

  const submit = () => {
    if (!oldVal.trim() || !newVal.trim() || !reason.trim()) return;
    changeAndTrace(record.id, srcField, oldVal.trim(), newVal.trim(), reason.trim());
    setOldVal('');
    setNewVal('');
    setReason('');
  };

  return (
    <section className="card p-4">
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <ArrowRightLeft size={13} /> 参数联动 · 结论追溯来源
        </span>
      </SectionTitle>

      <div className="mb-4 p-3 rounded border border-hall-border bg-hall-bg/60 space-y-2.5 text-xs">
        <div className="text-[11px] text-hall-textMute">选择来源字段，点击"高亮联动"查看来源材料中对应字段的闪烁提示</div>
        <div className="flex items-center gap-2 flex-wrap">
          {FIELD_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => previewLink(f.value)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
                srcField === f.value
                  ? 'bg-hall-accent/15 border-hall-accent/40 text-hall-accent'
                  : 'border-hall-border text-hall-textDim hover:text-hall-text hover:bg-hall-bg3'
              }`}
              onMouseDown={() => setSrcField(f.value)}
            >
              <Link2 size={10} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-hall-textMute block mb-1">变更前值</label>
            <input value={oldVal} onChange={(e) => setOldVal(e.target.value)} className="input font-mono !text-xs" />
          </div>
          <div>
            <label className="text-[11px] text-hall-textMute block mb-1">变更后值</label>
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} className="input font-mono !text-xs" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-hall-textMute block mb-1">调整原因（将写入变更留痕）</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：剖面图改一句，坐标需与现场复测一致"
            className="input !text-xs"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              if (!oldVal || !newVal || !reason) return;
              addChange(record.id, { sourceField: srcField, oldValue: oldVal, newValue: newVal, reason });
              flashField(srcField);
            }}
            className="btn btn-ghost"
          >
            仅追加留痕
          </button>
          <button onClick={submit} disabled={!oldVal || !newVal || !reason} className="btn btn-primary disabled:opacity-50">
            <Sparkles size={13} /> 提交并联动高亮
          </button>
        </div>
      </div>

      <div className="border-t border-hall-border pt-3">
        <div className="text-[11px] uppercase tracking-wider text-hall-textMute/80 mb-2">参数变更留痕 ({record.paramChanges.length})</div>
        {record.paramChanges.length === 0 ? (
          <EmptyState title="暂无参数变更" desc="上方调整参数后会在此留痕，方便月底转交运维组核对" />
        ) : (
          <ul className="space-y-2">
            {record.paramChanges.map((c) => (
              <li
                key={c.id}
                className="p-2 rounded border border-hall-border bg-hall-bg/50 text-xs"
                onMouseEnter={() => flashField(c.sourceField, 600)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-hall-accent">
                    <Link2 size={10} /> {c.sourceField}
                  </span>
                  <span className="text-[10px] text-hall-textMute">{formatDateTime(c.changedAt)}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] mb-1">
                  <span className="line-through text-status-unusable/80">{c.oldValue}</span>
                  <ArrowRightLeft size={11} className="text-hall-textMute" />
                  <span className="underline text-status-usable">{c.newValue}</span>
                </div>
                <div className="text-[11px] text-hall-textDim">{c.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
