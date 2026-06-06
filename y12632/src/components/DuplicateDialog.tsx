import { AlertTriangle, X, GitMerge, RefreshCw, FileX } from "lucide-react";
import type { TrajectoryRecord } from "@/types";

interface DuplicateDialogProps {
  existing: TrajectoryRecord;
  incoming: TrajectoryRecord;
  onMerge: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN");
}

export default function DuplicateDialog({
  existing,
  incoming,
  onMerge,
  onOverwrite,
  onCancel,
}: DuplicateDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-orange-100 bg-orange-50 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-orange-800">检测到重复轨迹记录</h3>
            <p className="mt-0.5 text-xs text-orange-600">
              该轨迹已存在，请选择处理方式
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded p-1 text-orange-500 hover:bg-orange-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-1 font-semibold text-gray-600">现有记录</div>
              <div className="space-y-1 text-gray-700">
                <div>名称：{existing.name}</div>
                <div>标注：{existing.annotations.length} 处</div>
                <div>操作：{existing.operations.length} 条</div>
                <div className="text-gray-500">
                  更新：{formatDate(existing.updatedAt)}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="mb-1 font-semibold text-blue-700">导入记录</div>
              <div className="space-y-1 text-blue-800">
                <div>名称：{incoming.name}</div>
                <div>标注：{incoming.annotations.length} 处</div>
                <div>操作：{incoming.operations.length} 条</div>
                <div className="text-blue-600">
                  更新：{formatDate(incoming.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs leading-relaxed text-orange-800">
            💡 同一批轨迹记录第二次导入时，建议<strong>合并记录</strong>以避免
            出现两份互相冲突的结论。合并会保留全部标注和操作历史，不会重复。
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 p-4">
          <button
            onClick={onMerge}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            <GitMerge className="h-4 w-4" />
            合并标注与操作（推荐）
          </button>
          <button
            onClick={onOverwrite}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            覆盖现有记录
          </button>
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <FileX className="h-4 w-4" />
            取消导入
          </button>
        </div>
      </div>
    </div>
  );
}
