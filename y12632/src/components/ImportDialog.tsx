import { useRef, useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { importFromJSON, checkDuplicate, getAllFromLocalStorage } from "@/utils/dataIO";
import { X, Upload, Folder, AlertTriangle, CheckCircle2, FileJson } from "lucide-react";
import type { TrajectoryRecord } from "@/types";

interface ImportDialogProps {
  onClose: () => void;
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const { loadRecord } = useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ existing: TrajectoryRecord; incoming: TrajectoryRecord } | null>(null);
  const [localRecords, setLocalRecords] = useState<TrajectoryRecord[]>([]);
  const [showLocal, setShowLocal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setDuplicate(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const record = importFromJSON(content);
        if (!record) {
          setError("文件格式不正确，无法解析为轨迹数据");
          return;
        }
        const { isDuplicate, existing } = checkDuplicate(record);
        if (isDuplicate && existing) {
          setDuplicate({ existing, incoming: record });
          return;
        }
        loadRecord(record);
        setSuccess(`已导入：${record.name}（${record.annotations.length} 个标注）`);
        setTimeout(onClose, 800);
      } catch {
        setError("读取文件失败");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadLocal = (rec: TrajectoryRecord) => {
    loadRecord(rec);
    setSuccess(`已加载：${rec.name}`);
    setTimeout(onClose, 800);
  };

  const handleShowLocal = () => {
    setLocalRecords(getAllFromLocalStorage());
    setShowLocal(true);
  };

  const handleForceImport = () => {
    if (duplicate) {
      loadRecord(duplicate.incoming);
      setSuccess(`已覆盖导入：${duplicate.incoming.name}`);
      setTimeout(onClose, 800);
    }
  };

  const handleMerge = () => {
    if (duplicate) {
      const merged: TrajectoryRecord = {
        ...duplicate.existing,
        annotations: [...duplicate.existing.annotations, ...duplicate.incoming.annotations],
        operations: [...duplicate.existing.operations, ...duplicate.incoming.operations],
        updatedAt: new Date().toISOString(),
      };
      loadRecord(merged);
      setSuccess(`已合并：共 ${merged.annotations.length} 个标注`);
      setTimeout(onClose, 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">导入轨迹数据</h2>
            <p className="text-xs text-neutral-500 mt-0.5">从文件或本地存储加载标注轨迹</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-success-50 text-success-600 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {duplicate ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-warning-700">检测到重复轨迹</div>
                  <div className="text-xs text-warning-600 mt-1">
                    本地已存在同名同内容轨迹，请选择处理方式
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="font-medium text-neutral-700 mb-1">现有轨迹</div>
                  <div className="text-neutral-500">{duplicate.existing.name}</div>
                  <div className="text-neutral-400 mt-0.5">
                    {duplicate.existing.annotations.length} 个标注
                  </div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="font-medium text-neutral-700 mb-1">导入轨迹</div>
                  <div className="text-neutral-500">{duplicate.incoming.name}</div>
                  <div className="text-neutral-400 mt-0.5">
                    {duplicate.incoming.annotations.length} 个标注
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleMerge}
                  className="px-3 py-2 text-xs rounded-lg bg-medical-600 text-white hover:bg-medical-700 transition"
                >
                  合并标注
                </button>
                <button
                  onClick={handleForceImport}
                  className="px-3 py-2 text-xs rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                >
                  覆盖导入
                </button>
              </div>
              <button
                onClick={() => setDuplicate(null)}
                className="w-full px-3 py-2 text-xs rounded-lg text-neutral-500 hover:text-neutral-700 transition"
              >
                取消
              </button>
            </div>
          ) : showLocal ? (
            <div className="space-y-2">
              <div className="text-xs text-neutral-500 flex justify-between items-center">
                <span>本地存储的轨迹（{localRecords.length} 条）</span>
                <button
                  onClick={() => setShowLocal(false)}
                  className="text-medical-600 hover:text-medical-700"
                >
                  返回
                </button>
              </div>
              {localRecords.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  本地暂无存储的轨迹
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {localRecords.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => handleLoadLocal(rec)}
                      className="w-full text-left p-3 rounded-lg border border-neutral-200 hover:border-medical-300 hover:bg-medical-50 transition-all"
                    >
                      <div className="text-sm font-medium text-neutral-800">{rec.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5 flex gap-3">
                        <span>{rec.annotations.length} 个标注</span>
                        <span>
                          {new Date(rec.updatedAt).toLocaleDateString("zh-CN")}
                        </span>
                        {rec.isFlipped && <span className="text-warning-600">已翻转</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-5 rounded-xl border-2 border-dashed border-neutral-300 hover:border-medical-400 hover:bg-medical-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-medical-100 flex items-center justify-center group-hover:bg-medical-200 transition">
                  <Upload className="w-6 h-6 text-medical-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-neutral-800">选择 JSON 文件</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    从之前导出的轨迹文件导入
                  </div>
                </div>
                <FileJson className="w-5 h-5 text-neutral-400 ml-auto" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400">或</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              <button
                onClick={handleShowLocal}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-medical-300 hover:bg-medical-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition">
                  <Folder className="w-5 h-5 text-neutral-700" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-neutral-800">从本地存储加载</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    加载之前保存到浏览器的轨迹
                  </div>
                </div>
                <span className="text-xs text-neutral-400">→</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
