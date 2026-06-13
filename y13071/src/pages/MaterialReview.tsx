import { Link } from "react-router-dom";
import { ArrowLeft, Mountain, ClipboardCheck, FileWarning, FileCheck2 } from "lucide-react";
import { MaterialNeedFix } from "@/components/review/MaterialNeedFix";
import { MaterialPassed } from "@/components/review/MaterialPassed";
import { materialItems } from "@/utils/mockData";

export default function MaterialReview() {
  const needFixCount = materialItems.filter((m) => m.status === "NEED_FIX").length;
  const passCount = materialItems.filter((m) => m.status === "PASS").length;

  return (
    <div className="min-h-screen bg-mine-950 scan-bg">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-lg glass border border-mine-700/60 flex items-center justify-center text-silver-300 hover:text-cable-300 hover:border-cable-500/40 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-cable-500/20 flex items-center justify-center shadow-glow-cable">
                  <Mountain className="w-5 h-5 text-cable-400" />
                </div>
                <h1 className="font-display text-[20px] text-silver-200 tracking-wide">
                  材料审核收尾
                </h1>
              </div>
              <div className="text-[11px] text-silver-400 font-mono mt-1 ml-10">
                REVIEW WRAP-UP — 为阿乔准备：哪些要补，哪些可以放行
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded glass border border-mine-700/60">
              <ClipboardCheck className="w-3.5 h-3.5 text-silver-300" />
              <span className="text-[11px] text-silver-300 font-mono">
                共 {materialItems.length} 项材料
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-fix-500/30 bg-fix-500/10">
              <FileWarning className="w-3.5 h-3.5 text-fix-400" />
              <span className="text-[11px] text-fix-400 font-mono">
                需补 {needFixCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-pass-500/30 bg-pass-500/10">
              <FileCheck2 className="w-3.5 h-3.5 text-pass-400" />
              <span className="text-[11px] text-pass-400 font-mono">
                放行 {passCount}
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl border border-mine-700/50 p-4 mb-6">
          <div className="font-display text-[13px] text-silver-200 mb-1.5 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-cable-400" />
            评审助理备忘
          </div>
          <div className="text-[12px] text-silver-400 leading-relaxed font-mono">
            评审会前，先按"需补材料"清单催齐责任人；"可放行材料"可直接在会上引用通过依据。
            所有材料条目避免使用技术术语，面向非技术负责人也能一眼看懂。
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MaterialNeedFix />
          <MaterialPassed />
        </div>
      </div>
    </div>
  );
}
