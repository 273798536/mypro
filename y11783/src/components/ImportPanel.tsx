import { useState, useCallback, useRef } from "react";
import { Upload, FileJson, X } from "lucide-react";
import { usePartitionStore } from "@/store";
import type { MaterialImport } from "@/types";

type ImportStrategy = "ignore" | "overwrite" | "append";

export default function ImportPanel() {
  const { importDialogOpen, setImportDialogOpen, importMaterial } =
    usePartitionStore();

  const [parsedMaterial, setParsedMaterial] = useState<MaterialImport | null>(
    null
  );
  const [strategy, setStrategy] = useState<ImportStrategy>("overwrite");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setParsedMaterial(null);
    setJsonText("");
    setError(null);
    setStrategy("overwrite");
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    setImportDialogOpen(false);
    resetState();
  }, [setImportDialogOpen, resetState]);

  const parseAndSetMaterial = useCallback(
    (text: string) => {
      setError(null);
      if (!text.trim()) {
        setParsedMaterial(null);
        return;
      }
      try {
        const obj = JSON.parse(text);
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
          setError("JSON 格式无效：需要一个对象");
          setParsedMaterial(null);
          return;
        }
        const material: MaterialImport = {};
        if (obj.targetNumber !== undefined) {
          if (typeof obj.targetNumber !== "number") {
            setError("targetNumber 必须是数字");
            setParsedMaterial(null);
            return;
          }
          material.targetNumber = obj.targetNumber;
        }
        if (obj.constraints !== undefined) {
          if (typeof obj.constraints !== "object" || obj.constraints === null) {
            setError("constraints 必须是对象");
            setParsedMaterial(null);
            return;
          }
          material.constraints = obj.constraints;
        }
        if (obj.presetSchemes !== undefined) {
          if (!Array.isArray(obj.presetSchemes)) {
            setError("presetSchemes 必须是数组");
            setParsedMaterial(null);
            return;
          }
          material.presetSchemes = obj.presetSchemes;
        }
        if (obj.studentAnswers !== undefined) {
          if (!Array.isArray(obj.studentAnswers)) {
            setError("studentAnswers 必须是数组");
            setParsedMaterial(null);
            return;
          }
          material.studentAnswers = obj.studentAnswers;
        }
        if (obj.notes !== undefined) {
          if (typeof obj.notes !== "string") {
            setError("notes 必须是字符串");
            setParsedMaterial(null);
            return;
          }
          material.notes = obj.notes;
        }
        if (obj.screenshots !== undefined) {
          if (!Array.isArray(obj.screenshots)) {
            setError("screenshots 必须是数组");
            setParsedMaterial(null);
            return;
          }
          material.screenshots = obj.screenshots;
        }
        setParsedMaterial(material);
      } catch {
        setError("JSON 解析失败，请检查格式");
        setParsedMaterial(null);
      }
    },
    []
  );

  const handleFileRead = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        setError("仅支持 .json 文件");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setJsonText(text);
        parseAndSetMaterial(text);
      };
      reader.onerror = () => {
        setError("文件读取失败");
      };
      reader.readAsText(file);
    },
    [parseAndSetMaterial]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setJsonText(text);
      parseAndSetMaterial(text);
    },
    [parseAndSetMaterial]
  );

  const handleImport = useCallback(() => {
    if (!parsedMaterial) return;
    importMaterial(parsedMaterial, strategy);
    handleClose();
  }, [parsedMaterial, strategy, importMaterial, handleClose]);

  if (!importDialogOpen) return null;

  const hasExistingData = !!usePartitionStore.getState().currentResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-amber-900/40 bg-slate-800 shadow-2xl shadow-amber-900/20">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-md p-1 text-amber-300/70 transition-colors hover:bg-slate-700 hover:text-amber-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-amber-900/30 px-6 py-4">
          <h2 className="text-lg font-bold text-amber-100">导入材料</h2>
          <p className="mt-1 text-sm text-amber-200/60">
            上传 JSON 文件或粘贴 JSON 内容
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragOver
                ? "border-amber-400 bg-amber-900/20"
                : "border-amber-900/40 bg-slate-900/50 hover:border-amber-700/60 hover:bg-slate-900/80"
            }`}
          >
            <Upload className="h-8 w-8 text-amber-400/70" />
            <span className="text-sm text-amber-200/70">
              拖拽 .json 文件到此处，或点击选择
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-amber-200/80">
              粘贴 JSON
            </label>
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              rows={5}
              className="w-full rounded-lg border border-amber-900/40 bg-slate-900/60 px-3 py-2 font-mono text-sm text-amber-100 placeholder-amber-200/30 outline-none transition-colors focus:border-amber-600 focus:ring-1 focus:ring-amber-600/50"
              placeholder='{"targetNumber": 5, "constraints": {"minAddend": 1}}'
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-amber-200/80">
              导入策略
            </label>
            <div className="flex gap-4">
              {(
                [
                  { value: "ignore", label: "忽略", desc: "已有数据时跳过" },
                  {
                    value: "overwrite",
                    label: "覆盖",
                    desc: "替换现有数据",
                  },
                  { value: "append", label: "追加", desc: "追加到现有数据" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center transition-colors ${
                    strategy === opt.value
                      ? "border-amber-500 bg-amber-900/30 text-amber-100"
                      : "border-amber-900/30 bg-slate-900/40 text-amber-200/60 hover:border-amber-700/50 hover:text-amber-200/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={opt.value}
                    checked={strategy === opt.value}
                    onChange={() => setStrategy(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                </label>
              ))}
            </div>
            {hasExistingData && strategy === "ignore" && (
              <p className="mt-1 text-xs text-amber-400/70">
                当前已有数据，选择"忽略"将不会导入
              </p>
            )}
          </div>

          {parsedMaterial && (
            <div className="rounded-lg border border-amber-900/30 bg-slate-900/40 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
                <FileJson className="h-4 w-4" />
                导入预览
              </h3>
              <dl className="space-y-1 text-sm">
                {parsedMaterial.targetNumber !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">目标数</dt>
                    <dd className="text-amber-100">
                      {parsedMaterial.targetNumber}
                    </dd>
                  </div>
                )}
                {parsedMaterial.constraints && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">约束条件</dt>
                    <dd className="text-amber-100">
                      {Object.keys(parsedMaterial.constraints).join("、")}
                    </dd>
                  </div>
                )}
                {parsedMaterial.presetSchemes && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">预设方案</dt>
                    <dd className="text-amber-100">
                      {parsedMaterial.presetSchemes.length} 组
                    </dd>
                  </div>
                )}
                {parsedMaterial.studentAnswers && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">学生答案</dt>
                    <dd className="text-amber-100">
                      {parsedMaterial.studentAnswers.length} 组
                    </dd>
                  </div>
                )}
                {parsedMaterial.notes && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">备注</dt>
                    <dd className="max-w-[200px] truncate text-amber-100">
                      {parsedMaterial.notes}
                    </dd>
                  </div>
                )}
                {parsedMaterial.screenshots && (
                  <div className="flex justify-between">
                    <dt className="text-amber-200/60">截图</dt>
                    <dd className="text-amber-100">
                      {parsedMaterial.screenshots.length} 张
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-amber-900/30 px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-amber-200/70 transition-colors hover:bg-slate-700 hover:text-amber-100"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedMaterial}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-600"
          >
            导入
          </button>
        </div>
      </div>
    </div>
  );
}
