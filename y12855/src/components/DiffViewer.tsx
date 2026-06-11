import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

export interface DiffField {
  label: string;
  oldValue?: string;
  newValue: string;
  changed: boolean;
}

export default function DiffViewer({
  title,
  fields,
  oldImageUrl,
  newImageUrl,
  imageCaption,
}: {
  title: string;
  fields: DiffField[];
  oldImageUrl?: string;
  newImageUrl?: string;
  imageCaption?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const changedCount = fields.filter((f) => f.changed).length + (oldImageUrl ? 1 : 0);

  return (
    <div className="card card-hover overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-steel-100 bg-ocean-50/50 hover:bg-ocean-50"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-ocean-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ocean-500" />
          )}
          <span className="font-semibold text-ocean-800 text-sm">{title}</span>
          {changedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <AlertCircle className="w-3 h-3" />
              {changedCount} 处变化
            </span>
          )}
        </div>
        <span className="text-xs text-ocean-500">
          点击{expanded ? "收起" : "展开"}前后对比
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-0 border-b border-steel-100">
          <div className="px-5 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-r border-steel-100">
            修改前（原版本）
          </div>
          <div className="px-5 py-2 bg-ocean-50 text-[11px] font-semibold text-ocean-600 uppercase tracking-wider">
            修改后（新版本）
          </div>
        </div>
      )}

      {expanded && (oldImageUrl || newImageUrl) && (
        <div className="grid grid-cols-2 gap-0 border-b border-steel-100">
          <div className="p-4 border-r border-steel-100">
            {oldImageUrl ? (
              <div className="group relative">
                <img
                  src={oldImageUrl}
                  alt="修改前"
                  className="w-full aspect-square object-cover rounded-md border-2 border-slate-200 grayscale-[30%]"
                />
                <div className="absolute top-2 left-2 chip bg-slate-900/70 text-white text-[10px]">
                  BEFORE
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square bg-slate-100 rounded-md flex items-center justify-center text-slate-400 text-xs">
                无历史图片
              </div>
            )}
            {imageCaption && (
              <div className="mt-2 text-xs text-slate-500">{imageCaption}</div>
            )}
          </div>
          <div className="p-4">
            <div className="group relative">
              <img
                src={newImageUrl}
                alt="修改后"
                className="w-full aspect-square object-cover rounded-md border-2 border-amber-400 ring-2 ring-amber-100"
              />
              <div className="absolute top-2 left-2 chip bg-amber-500 text-white text-[10px] shadow">
                AFTER
              </div>
              <div className="absolute top-2 right-2 chip bg-ocean-800 text-white text-[10px] shadow">
                Δ 差异高亮
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="divide-y divide-steel-100">
          {fields.map((f) => (
            <div
              key={f.label}
              className={`grid grid-cols-2 gap-0 ${f.changed ? "bg-amber-50/40" : ""}`}
            >
              <div className="px-5 py-3 border-r border-steel-100">
                <div className="label mb-1">{f.label}</div>
                <div
                  className={`font-mono text-sm ${f.changed ? "line-through text-slate-400" : "text-ocean-700"}`}
                >
                  {f.oldValue ?? "—"}
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="label mb-1">
                  {f.label}
                  {f.changed && (
                    <span className="ml-2 text-amber-600 normal-case tracking-normal">
                      Δ 已变更
                    </span>
                  )}
                </div>
                <div
                  className={`font-mono text-sm ${f.changed ? "text-ocean-900 font-semibold field-diff" : "text-ocean-700"}`}
                >
                  {f.newValue}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
