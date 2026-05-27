import { useStore } from '../../store/useStore';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import type { CorrectionRecord } from '../../types';

export default function DetailPanel() {
  const { data, selectedDataId, corrections, detections } = useStore();
  const selected = data.find((d) => d.id === selectedDataId);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [editingField, setEditingField] = useState<string | null>(null);

  const dataCorrections = corrections.filter((c) => c.dataId === selectedDataId);
  const relatedDetections = detections.filter((d) => d.relatedDataIds.includes(selectedDataId || ''));

  if (!selected) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 p-8 text-center">
        <div>
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">点击3D视图中的数据点</p>
          <p className="text-xs mt-1 opacity-60">查看合约详情、研究备注和修正记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/50 border-l border-slate-700/50 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-blue-400">{selected.contractMonth}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
            {selected.status === 'corrected' ? '已修正' : selected.status === 'warning' ? '有警告' : '正常'}
          </span>
        </div>
        <span className="text-slate-500 text-xs">{isCollapsed ? '展开' : '收起'}</span>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Section title="合约信息">
            <InfoRow label="合约月份" value={selected.contractMonth} />
            <InfoRow
              label="价格"
              value={selected.price.toFixed(2)}
              editable
              fieldName="price"
              currentValue={String(selected.price)}
              editingField={editingField}
              setEditingField={setEditingField}
              editValue={editValue}
              setEditValue={setEditValue}
            />
            <InfoRow
              label="成交量"
              value={selected.volume.toLocaleString()}
              editable
              fieldName="volume"
              currentValue={String(selected.volume)}
              editingField={editingField}
              setEditingField={setEditingField}
              editValue={editValue}
              setEditValue={setEditValue}
            />
            <InfoRow
              label="基差"
              value={selected.basis.toFixed(2)}
              editable
              fieldName="basis"
              currentValue={String(selected.basis)}
              editingField={editingField}
              setEditingField={setEditingField}
              editValue={editValue}
              setEditValue={setEditValue}
            />
            <InfoRow label="时间窗口" value={selected.timeWindow} />
            <InfoRow label="原始行号" value={`第${selected.originalRow}行`} />
          </Section>

          <Section title="研究备注">
            <div className="px-4 py-2">
              <textarea
                className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder="输入研究备注..."
                defaultValue={selected.notes}
                onBlur={(e) => {
                  if (e.target.value !== selected.notes) {
                    addCorrection('notes', selected.notes, e.target.value);
                  }
                }}
              />
            </div>
          </Section>

          <Section title="数据来源">
            <InfoRow label="来源文件" value={selected.source} />
            <InfoRow label="数据ID" value={selected.id} mono />
          </Section>

          {dataCorrections.length > 0 && (
            <Section title={`修正记录 (${dataCorrections.length})`} defaultOpen>
              <div className="space-y-2 px-4 py-2">
                {dataCorrections.map((c) => (
                  <div key={c.id} className="bg-slate-800/30 rounded p-2 text-xs">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>{c.fieldName}</span>
                      <span>{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-red-400">{c.oldValue}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-green-400">{c.newValue}</span>
                    </div>
                    {c.reason && <div className="text-slate-500 mt-1">{c.reason}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {relatedDetections.length > 0 && (
            <Section title="关联异常" defaultOpen>
              <div className="space-y-2 px-4 py-2">
                {relatedDetections.map((d) => (
                  <div
                    key={d.id}
                    className={`rounded p-2 text-xs ${
                      d.severity === 'error' ? 'bg-red-900/20 border border-red-800/30' : 'bg-yellow-900/20 border border-yellow-800/30'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium ${d.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {d.type === 'backwardation' ? '倒挂' : d.type === 'month_gap' ? '月份缺口' : d.type === 'volume_occlusion' ? '成交量遮挡' : '解析错误'}
                      </span>
                      <span className="text-slate-500">第{d.originalRow}行</span>
                    </div>
                    <div className="text-slate-400">{d.description}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700/30">
      <button
        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-slate-800/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">{title}</span>
        <span className="text-slate-500 text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  editable,
  fieldName,
  currentValue,
  editingField,
  setEditingField,
  editValue,
  setEditValue,
  mono,
}: {
  label: string;
  value: string;
  editable?: boolean;
  fieldName?: string;
  currentValue?: string;
  editingField?: string | null;
  setEditingField?: (v: string | null) => void;
  editValue?: string;
  setEditValue?: (v: string) => void;
  mono?: boolean;
}) {
  if (!editable || !fieldName) {
    return (
      <div className="flex justify-between px-4 py-1.5 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={mono ? 'font-mono text-slate-200' : 'text-slate-200'}>{value}</span>
      </div>
    );
  }

  if (editingField === fieldName) {
    return (
      <div className="flex justify-between items-center px-4 py-1.5 text-sm gap-2">
        <span className="text-slate-400">{label}</span>
        <input
          className="bg-slate-800 border border-blue-500 rounded px-2 py-0.5 text-sm text-slate-200 w-24 text-right font-mono focus:outline-none"
          defaultValue={currentValue}
          autoFocus
          onBlur={(e) => {
            const newValue = e.target.value;
            if (newValue !== currentValue) {
              addCorrection(fieldName, currentValue || '', newValue);
            }
            setEditingField?.(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex justify-between px-4 py-1.5 text-sm cursor-pointer hover:bg-slate-800/30 transition-colors"
      onClick={() => {
        setEditingField?.(fieldName);
        setEditValue?.(currentValue || '');
      }}
    >
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200 hover:text-blue-400">{value}</span>
    </div>
  );
}

function addCorrection(fieldName: string, oldValue: string, newValue: string) {
  const { selectedDataId, addCorrection: storeAddCorrection } = useStore.getState();
  if (!selectedDataId) return;

  const record: CorrectionRecord = {
    id: `corr-${Date.now()}`,
    dataId: selectedDataId,
    fieldName,
    oldValue,
    newValue,
    timestamp: new Date().toISOString(),
    operator: 'researcher',
    reason: '',
  };
  storeAddCorrection(record);
}