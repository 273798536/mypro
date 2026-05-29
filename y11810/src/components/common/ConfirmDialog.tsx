import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export function ConfirmDialog({
  open,
  title,
  content,
  onConfirm,
  onCancel,
  confirmText = "确认",
  cancelText = "取消",
  confirmButtonClass,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-4 text-[18px] font-semibold text-gray-900">{title}</h3>
        {content && <div className="mb-6 text-[14px] text-gray-600">{content}</div>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "rounded bg-primary px-4 py-2 text-[14px] text-white hover:bg-primary/90 transition-colors",
              confirmButtonClass
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
