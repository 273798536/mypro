import { FileText, GitMerge, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { MergeStrategy } from "@/types";
import { useMaterialStore } from "@/store/materialStore";

type PreviewPayload = {
  coils?: unknown[];
  spreaders?: unknown[];
  rails?: unknown[];
  zones?: unknown[];
  tasks?: unknown[];
  reports?: unknown[];
};

export default function ImportPanel() {
  const importCoils = useMaterialStore((s) => s.importCoils);
  const importSpreaders = useMaterialStore((s) => s.importSpreaders);
  const importRails = useMaterialStore((s) => s.importRails);
  const importZones = useMaterialStore((s) => s.importZones);
  const importTasks = useMaterialStore((s) => s.importTasks);

  const [strategy, setStrategy] = useState<MergeStrategy>("ignore");
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File) => {
    setFilename(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setPreview(parsed);
      } catch (e) {
        setError("JSON 解析失败：" + (e as Error).message);
        setPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  const count = (arr?: unknown[]) => (Array.isArray(arr) ? arr.length : 0);

  const doImport = () => {
    if (!preview) return;
    const source = filename || "inline";
    if (preview.coils?.length) importCoils(preview.coils as never, strategy, source);
    if (preview.spreaders?.length) importSpreaders(preview.spreaders as never, strategy, source);
    if (preview.rails?.length) importRails(preview.rails as never, strategy, source);
    if (preview.zones?.length) importZones(preview.zones as never, strategy, source);
    if (preview.tasks?.length) importTasks(preview.tasks as never, strategy, source);
    setPreview(null);
    setFilename("");
  };

  const strategies: { key: MergeStrategy; label: string; hint: string }[] = [
    { key: "ignore", label: "忽略", hint: "已存在的同 ID 项不更新" },
    { key: "overwrite", label: "覆盖", hint: "同 ID 项整体替换，并记录 diff" },
    { key: "append", label: "追加", hint: "列表追加；同 ID 则合并并记录 diff" },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Upload className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-100">导入材料</h3>
        <span className="text-[11px] text-slate-500">
          支持 JSON：coils / spreaders / rails / zones / tasks
        </span>
      </div>
      <div className="p-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/40 px-6 py-8 text-center text-xs text-slate-400"
        >
          <FileText className="mb-2 h-6 w-6 text-slate-500" />
          <div>拖拽 JSON 文件到此处</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-md bg-slate-800 px-3 py-1 text-[12px] text-slate-200 hover:bg-slate-700"
          >
            选择文件
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
            }}
          />
          {filename && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
              <span>{filename}</span>
              <button
                onClick={() => {
                  setFilename("");
                  setPreview(null);
                }}
                className="text-rose-400 hover:text-rose-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-400">
            <GitMerge className="h-3.5 w-3.5" /> 合并策略
          </div>
          <div className="grid grid-cols-3 gap-2">
            {strategies.map((s) => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={
                  "rounded-lg border px-3 py-2 text-left text-[11px] transition " +
                  (strategy === s.key
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800")
                }
              >
                <div className="font-semibold">{s.label}</div>
                <div className="mt-0.5 opacity-80">{s.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px]">
            <div className="mb-2 text-slate-400">导入预览</div>
            <div className="grid grid-cols-5 gap-2 text-slate-300">
              <div>钢卷 · {count(preview.coils)}</div>
              <div>吊具 · {count(preview.spreaders)}</div>
              <div>轨道 · {count(preview.rails)}</div>
              <div>作业区 · {count(preview.zones)}</div>
              <div>任务 · {count(preview.tasks)}</div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={doImport}
                className="rounded-md bg-amber-500/80 px-3 py-1 text-[12px] font-medium text-slate-900 hover:bg-amber-400"
              >
                执行导入（策略：{strategies.find((x) => x.key === strategy)?.label}）
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
