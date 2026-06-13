import { X, ClipboardCheck } from "lucide-react";
import { AnnotationForm } from "./AnnotationForm";
import { AnnotationList } from "./AnnotationList";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AnnotationDrawer({ open, onClose }: Props) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 w-[440px] z-50 glass border-l border-mine-700/60 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-mine-700/60">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-cable-400" />
            <span className="font-display text-[14px] text-silver-200">
              评审批注
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-mine-700/60 text-silver-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scan-bg">
          <AnnotationForm />
          <div className="border-t border-mine-700/50 pt-4">
            <AnnotationList />
          </div>
        </div>
      </div>
    </>
  );
}
