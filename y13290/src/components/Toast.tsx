import { CheckCircle2 } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const visible = !!toast;
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      {toast && (
        <div className="animate-fade-in flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-sm font-medium text-slate-700">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
