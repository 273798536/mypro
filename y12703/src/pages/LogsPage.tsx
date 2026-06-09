import PageContainer from "@/components/layout/PageContainer";
import LogTimeline from "@/components/logs/LogTimeline";
import { History } from "lucide-react";

export default function LogsPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="font-serif font-bold text-2xl text-ink-800 flex items-center gap-2">
          <History size={22} />
          操作日志
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          全量操作留痕 · 可追溯每一次修正、状态变更、导入合并的前后差异与原因
        </p>
      </div>
      <LogTimeline />
    </PageContainer>
  );
}
