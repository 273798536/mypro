import { useAppStore } from "@/utils/store";
import { Plus, Trash2 } from "lucide-react";

export default function InputPanel() {
  const {
    channels,
    materials,
    totalBudget,
    setTotalBudget,
    updateChannel,
    addChannel,
    removeChannel,
    updateMaterial,
    addMaterial,
    removeMaterial,
  } = useAppStore();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          总预算
        </h2>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 text-sm font-mono">
            ¥
          </span>
          <input
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-4 py-2.5 text-zinc-100 font-mono text-lg focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            渠道数据
          </h2>
          <button
            onClick={addChannel}
            className="px-2 py-1 rounded text-[10px] text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            添加
          </button>
        </div>
        <div className="space-y-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={ch.name}
                  onChange={(e) =>
                    updateChannel(ch.id, "name", e.target.value)
                  }
                  className="bg-transparent text-zinc-100 text-sm font-medium focus:outline-none border-b border-transparent focus:border-amber-500/50 w-full"
                />
                <button
                  onClick={() => removeChannel(ch.id)}
                  className="text-zinc-600 hover:text-rose-500 transition-colors ml-2 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="日消耗上限"
                  value={ch.dailyCap}
                  onChange={(v) => updateChannel(ch.id, "dailyCap", v)}
                />
                <Field
                  label="CPA出价"
                  value={ch.cpaBid}
                  onChange={(v) => updateChannel(ch.id, "cpaBid", v)}
                />
                <Field
                  label="转化率"
                  value={ch.conversionRate}
                  onChange={(v) => updateChannel(ch.id, "conversionRate", v)}
                  step={0.001}
                />
                <Field
                  label="延迟天数"
                  value={ch.conversionDelayDays}
                  onChange={(v) =>
                    updateChannel(ch.id, "conversionDelayDays", v)
                  }
                  min={0}
                />
              </div>
            </div>
          ))}
          {channels.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">
              请选择场景或添加渠道
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            素材标签
          </h2>
          <button
            onClick={addMaterial}
            className="px-2 py-1 rounded text-[10px] text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            添加
          </button>
        </div>
        <div className="space-y-2">
          {materials.map((m) => {
            const isDuplicate = checkDuplicate(m, materials);
            return (
              <div
                key={m.id}
                className={`bg-zinc-900/80 border rounded-lg p-3 space-y-2 ${
                  isDuplicate
                    ? "border-rose-500/40"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) =>
                      updateMaterial(m.id, "name", e.target.value)
                    }
                    className="bg-transparent text-zinc-100 text-sm font-medium focus:outline-none border-b border-transparent focus:border-amber-500/50 flex-1"
                  />
                  <select
                    value={m.channelId}
                    onChange={(e) =>
                      updateMaterial(m.id, "channelId", e.target.value)
                    }
                    className="bg-zinc-800 text-zinc-300 text-[10px] rounded px-2 py-1 focus:outline-none"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeMaterial(m.id)}
                    className="text-zinc-600 hover:text-rose-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <TagEditor
                    tags={m.tags}
                    onChange={(tags) => updateMaterial(m.id, "tags", tags)}
                  />
                  {isDuplicate && (
                    <span className="text-[10px] text-rose-500 font-medium">
                      重复
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {materials.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">
              请选择场景或添加素材
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 block mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-zinc-800 border border-zinc-700/50 rounded px-2 py-1 text-zinc-200 text-xs font-mono focus:outline-none focus:border-amber-500/50"
      />
    </div>
  );
}

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      e.currentTarget.value = "";
    }
    if (e.key === "Backspace" && !e.currentTarget.value && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap flex-1">
      {tags.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded"
        >
          {t}
          <button
            onClick={() => removeTag(i)}
            className="text-zinc-500 hover:text-zinc-300 ml-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        onKeyDown={handleKeyDown}
        placeholder="+标签"
        className="bg-transparent text-zinc-400 text-[10px] focus:outline-none w-14 placeholder:text-zinc-600"
      />
    </div>
  );
}

function checkDuplicate(
  material: { id: string; channelId: string; tags: string[] },
  allMaterials: { id: string; channelId: string; tags: string[] }[]
): boolean {
  const sig = [...material.tags].sort().join("|");
  return allMaterials.some(
    (m) =>
      m.id !== material.id &&
      m.channelId === material.channelId &&
      [...m.tags].sort().join("|") === sig
  );
}
