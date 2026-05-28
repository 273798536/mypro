import { useState } from "react";
import { usePartitionStore } from "@/store/index";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  RotateCcw,
  FileDown,
  Plus,
  X,
  Hash,
  Layers,
  SlidersHorizontal,
  Filter,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function ConfigPanel() {
  const config = usePartitionStore((s) => s.config);
  const setConfig = usePartitionStore((s) => s.setConfig);
  const generate = usePartitionStore((s) => s.generate);
  const isGenerating = usePartitionStore((s) => s.isGenerating);
  const resetConfig = usePartitionStore((s) => s.resetConfig);
  const setImportDialogOpen = usePartitionStore((s) => s.setImportDialogOpen);

  const [predicateInput, setPredicateInput] = useState("");

  const addPredicate = () => {
    const trimmed = predicateInput.trim();
    if (trimmed && !config.customPredicates.includes(trimmed)) {
      setConfig({ customPredicates: [...config.customPredicates, trimmed] });
      setPredicateInput("");
    }
  };

  const removePredicate = (index: number) => {
    setConfig({
      customPredicates: config.customPredicates.filter((_, i) => i !== index),
    });
  };

  const isTargetValid =
    config.targetNumber >= 1 && config.targetNumber <= 100;
  const isAddendRangeValid = config.minAddend <= config.maxAddend;
  const isCountRangeValid = config.minCount <= config.maxCount;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-[#1e293b] p-5 text-slate-200">
      <h2
        className="text-center text-xl font-bold tracking-wide text-[#fbbf24]"
        style={{ fontFamily: "'LXGW WenKai', serif" }}
      >
        整数拆分讲解器
      </h2>

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Hash size={16} className="text-[#fbbf24]" />
          目标数
        </label>
        <div className="relative">
          <input
            type="number"
            min={1}
            max={100}
            value={config.targetNumber}
            onChange={(e) =>
              setConfig({ targetNumber: Number(e.target.value) || 1 })
            }
            className={cn(
              "w-full rounded-lg border bg-slate-800 px-4 py-2 text-center text-3xl font-bold outline-none transition-colors",
              isTargetValid
                ? "border-slate-600 text-[#fbbf24] focus:border-[#34d399]"
                : "border-[#f87171] text-[#f87171]"
            )}
            style={{ fontFamily: "'LXGW WenKai', serif" }}
          />
          {!isTargetValid && (
            <span className="mt-1 text-xs text-[#f87171]">
              请输入 1 ~ 100 之间的整数
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Layers size={16} className="text-[#fbbf24]" />
          拆分模式
        </label>
        <div className="flex rounded-lg border border-slate-600 bg-slate-800 p-1">
          <button
            onClick={() => setConfig({ mode: "ordered" })}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              config.mode === "ordered"
                ? "bg-[#fbbf24] text-slate-900 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            有序拆分
          </button>
          <button
            onClick={() => setConfig({ mode: "unordered" })}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
              config.mode === "unordered"
                ? "bg-[#fbbf24] text-slate-900 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            无序拆分
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <SlidersHorizontal size={16} className="text-[#fbbf24]" />
          加数范围
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">最小加数</span>
            <input
              type="number"
              min={1}
              max={config.maxAddend}
              value={config.minAddend}
              onChange={(e) =>
                setConfig({ minAddend: Math.max(1, Number(e.target.value) || 1) })
              }
              className={cn(
                "w-full rounded-lg border bg-slate-800 px-3 py-2 text-center text-sm outline-none transition-colors",
                isAddendRangeValid
                  ? "border-slate-600 text-slate-200 focus:border-[#34d399]"
                  : "border-[#f87171] text-[#f87171]"
              )}
            />
          </div>
          <span className="mt-5 text-slate-500">—</span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">最大加数</span>
            <input
              type="number"
              min={config.minAddend}
              max={100}
              value={config.maxAddend}
              onChange={(e) =>
                setConfig({
                  maxAddend: Math.min(100, Number(e.target.value) || 100),
                })
              }
              className={cn(
                "w-full rounded-lg border bg-slate-800 px-3 py-2 text-center text-sm outline-none transition-colors",
                isAddendRangeValid
                  ? "border-slate-600 text-slate-200 focus:border-[#34d399]"
                  : "border-[#f87171] text-[#f87171]"
              )}
            />
          </div>
        </div>
        {!isAddendRangeValid && (
          <span className="text-xs text-[#f87171]">最小加数不能大于最大加数</span>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Filter size={16} className="text-[#fbbf24]" />
          加数个数范围
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">最少个数</span>
            <input
              type="number"
              min={1}
              max={config.maxCount}
              value={config.minCount}
              onChange={(e) =>
                setConfig({ minCount: Math.max(1, Number(e.target.value) || 1) })
              }
              className={cn(
                "w-full rounded-lg border bg-slate-800 px-3 py-2 text-center text-sm outline-none transition-colors",
                isCountRangeValid
                  ? "border-slate-600 text-slate-200 focus:border-[#34d399]"
                  : "border-[#f87171] text-[#f87171]"
              )}
            />
          </div>
          <span className="mt-5 text-slate-500">—</span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">最多个数</span>
            <input
              type="number"
              min={config.minCount}
              max={100}
              value={config.maxCount}
              onChange={(e) =>
                setConfig({
                  maxCount: Math.min(100, Number(e.target.value) || 100),
                })
              }
              className={cn(
                "w-full rounded-lg border bg-slate-800 px-3 py-2 text-center text-sm outline-none transition-colors",
                isCountRangeValid
                  ? "border-slate-600 text-slate-200 focus:border-[#34d399]"
                  : "border-[#f87171] text-[#f87171]"
              )}
            />
          </div>
        </div>
        {!isCountRangeValid && (
          <span className="text-xs text-[#f87171]">最少个数不能大于最多个数</span>
        )}
      </section>

      <section className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800 px-4 py-3">
        <span className="text-sm text-slate-300">允许重复加数</span>
        <button
          onClick={() => setConfig({ allowDuplicate: !config.allowDuplicate })}
          className="transition-all"
        >
          {config.allowDuplicate ? (
            <ToggleRight size={28} className="text-[#34d399]" />
          ) : (
            <ToggleLeft size={28} className="text-slate-500" />
          )}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-300">自定义谓词</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={predicateInput}
            onChange={(e) => setPredicateInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPredicate();
            }}
            placeholder="输入谓词表达式"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-[#34d399]"
          />
          <button
            onClick={addPredicate}
            disabled={!predicateInput.trim()}
            className="flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-[#fbbf24] transition-colors hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800"
          >
            <Plus size={18} />
          </button>
        </div>
        {config.customPredicates.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {config.customPredicates.map((pred, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-slate-600 bg-slate-800/60 px-3 py-1.5"
              >
                <span className="truncate text-xs text-slate-300">{pred}</span>
                <button
                  onClick={() => removePredicate(i)}
                  className="ml-2 shrink-0 text-slate-500 transition-colors hover:text-[#f87171]"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <button
          onClick={generate}
          disabled={isGenerating}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all",
            isGenerating
              ? "cursor-wait bg-slate-700 text-slate-400"
              : "bg-[#fbbf24] text-slate-900 shadow-lg shadow-yellow-900/30 hover:bg-yellow-400 active:scale-[0.97]"
          )}
        >
          <Sparkles size={18} />
          {isGenerating ? "生成中…" : "生成方案"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={resetConfig}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            <RotateCcw size={15} />
            重置
          </button>
          <button
            onClick={() => setImportDialogOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            <FileDown size={15} />
            导入材料
          </button>
        </div>
      </div>
    </div>
  );
}
