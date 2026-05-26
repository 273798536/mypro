import { useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { parseMaterialsFromText } from '@/utils/importExport';
import { Database, Upload, Trash2, Plus, RefreshCw, Layers } from 'lucide-react';
import { ImportStrategy } from '@/types';

export default function MaterialsPage() {
  const { materials, sources, applyImport, resetToDefault } = useGameStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [strategy, setStrategy] = useState<ImportStrategy>('overwrite');
  const [pendingPreview, setPendingPreview] = useState<{
    fileName: string;
    text: string;
  } | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setPendingPreview({ fileName: file.name, text });
  };

  const confirmImport = () => {
    if (!pendingPreview) return;
    const parsed = parseMaterialsFromText(pendingPreview.text, pendingPreview.fileName);
    applyImport(parsed, strategy, pendingPreview.fileName);
    setPendingPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wider">材料导入</h1>
          <p className="text-white/60 text-sm mt-1">
            导入冷库区、蒸发器、货物温层、出入库任务、除霜时段、运行报告。保留来源与每次修正痕迹。
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost flex items-center gap-2" onClick={resetToDefault}>
            <RefreshCw size={14} /> 恢复默认示例
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} /> 选择文件
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div
        className={`card p-10 text-center border-dashed transition ${
          dragOver ? 'border-[#2E5BFF] bg-[#2E5BFF]/10' : 'border-white/15'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <Database className="mx-auto mb-3 text-[#5B8DFF]" size={40} />
        <div className="font-display text-lg">拖拽 JSON / CSV 文件到此处</div>
        <div className="text-white/50 text-xs mt-2">
          支持同时导入多类材料（zone / evaporator / layer / task / defrost / opReport）
        </div>
      </div>

      {pendingPreview && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold">待导入文件：{pendingPreview.fileName}</div>
              <div className="text-xs text-white/50">请选择导入策略后确认导入</div>
            </div>
            <button className="btn-ghost" onClick={() => setPendingPreview(null)}>
              取消
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(['ignore', 'overwrite', 'append'] as ImportStrategy[]).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  strategy === s
                    ? 'bg-[#2E5BFF] border-[#2E5BFF] text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                {s === 'ignore' ? '忽略（保留已有）' : s === 'overwrite' ? '覆盖（同 id 替换）' : '追加（新 id 并入）'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={confirmImport}>
            确认导入
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <StatCard
          icon={<Layers size={16} />}
          label="冷库区"
          value={materials.zones.length}
          color="from-sky-500/30 to-sky-500/5"
        />
        <StatCard
          icon={<Layers size={16} />}
          label="蒸发器"
          value={materials.evaporators.length}
          color="from-indigo-500/30 to-indigo-500/5"
        />
        <StatCard
          icon={<Layers size={16} />}
          label="温层"
          value={materials.tempLayers.length}
          color="from-cyan-500/30 to-cyan-500/5"
        />
        <StatCard
          icon={<Layers size={16} />}
          label="任务"
          value={materials.tasks.length}
          color="from-emerald-500/30 to-emerald-500/5"
        />
        <StatCard
          icon={<Layers size={16} />}
          label="除霜时段"
          value={materials.defrostSlots.length}
          color="from-orange-500/30 to-orange-500/5"
        />
        <StatCard
          icon={<Layers size={16} />}
          label="运行报告"
          value={materials.opReports.length}
          color="from-violet-500/30 to-violet-500/5"
        />
      </div>

      {sources.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display">来源与修正痕迹</div>
          </div>
          <div className="space-y-2 max-h-60 scroll-y pr-2">
            {sources.map((s) => (
              <div key={s.batchId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{s.fileName}</div>
                  <div className="text-xs text-white/50">
                    {new Date(s.importedAt).toLocaleString()} · 策略：{s.strategy}
                  </div>
                </div>
                <div className="text-xs text-white/60">
                  {Object.entries(s.itemCounts)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' / ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display">当前材料清单</div>
        </div>
        <SectionTable title="冷库区" rows={materials.zones.map((z) => [z.id, z.name, `${z.targetTemp}℃`, `${z.minTemp}~${z.maxTemp}℃`])} headers={['ID', '名称', '目标温度', '范围']} />
        <SectionTable title="蒸发器" rows={materials.evaporators.map((e) => [e.id, e.name, e.zoneId, `${e.defrostDurationMin}分钟`, `${e.defrostIntervalMin}分钟`])} headers={['ID', '名称', '所属区', '除霜时长', '建议间隔']} />
        <SectionTable title="任务" rows={materials.tasks.map((t) => [t.id, t.type === 'out' ? '出库' : '入库', t.zoneId, `${Math.floor(t.scheduledStart / 60)}:${String(t.scheduledStart % 60).padStart(2, '0')} - ${Math.floor(t.scheduledEnd / 60)}:${String(t.scheduledEnd % 60).padStart(2, '0')}`, `${t.penaltyPerMin}/分`])} headers={['ID', '类型', '区', '时间窗', '延误扣分']} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`card p-4 bg-gradient-to-br ${color} col-span-2`}>
      <div className="flex items-center gap-2 text-white/70 text-xs">{icon}{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}

function SectionTable({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mb-4">
      <div className="text-sm text-white/70 mb-2">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/50 border-b border-white/10">
              {headers.map((h) => (
                <th key={h} className="text-left py-2 pr-4 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5">
                {r.map((c, j) => (
                  <td key={j} className="py-2 pr-4 text-white/80">{c}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-3 text-white/40">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
