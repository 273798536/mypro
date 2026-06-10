import { SearchX, Beaker } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import SampleCard from "./SampleCard";
import { useMemo } from "react";
import { SampleStatus, FilterStatus } from "@/types";

export default function SampleCardList() {
  const samples = useSampleStore((s) => s.samples);
  const searchKeyword = useSampleStore((s) => s.searchKeyword);
  const filterStatus = useSampleStore((s) => s.filterStatus);

  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        return (
          s.id.toLowerCase().includes(kw) ||
          s.name.toLowerCase().includes(kw) ||
          s.location.toLowerCase().includes(kw) ||
          s.batch.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [samples, filterStatus, searchKeyword]);

  if (filteredSamples.length === 0) {
    return (
      <div
        className="animate-fade-in-up rounded-2xl bg-white p-12 shadow-card"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 -m-3 rounded-full bg-slate-50" />
            <SearchX className="relative h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">未找到匹配的样本</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {searchKeyword
              ? `没有与关键词「${searchKeyword}」匹配的样本，请尝试其他搜索条件`
              : filterStatus !== "all"
              ? `当前「${
                  filterStatus === "normal" ? "正常" : filterStatus === "borderline" ? "边界" : "异常"
                }」筛选状态下暂无样本`
              : "样本数据为空，请稍后再试"}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <Beaker className="h-4 w-4" />
            <span>提示：可调整搜索框关键词或切换筛选按钮</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in-up grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
      style={{ animationDelay: "400ms" }}
    >
      {filteredSamples.map((sample, i) => (
        <SampleCard key={sample.id} sample={sample} delay={400 + i * 60} />
      ))}
    </div>
  );
}
