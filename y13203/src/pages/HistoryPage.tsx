import ChangeHistory from "@/components/ChangeHistory";
import AlignmentView from "@/components/AlignmentView";
import { GitBranch } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <GitBranch className="w-5 h-5 text-amber" />
        <h2 className="font-mono text-lg font-semibold text-zinc-100">变更溯源与对齐</h2>
      </div>

      <ChangeHistory />
      <AlignmentView />
    </div>
  );
}
