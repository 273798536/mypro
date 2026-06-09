import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageContainer from "@/components/layout/PageContainer";
import ProblemSelector from "@/components/formula/ProblemSelector";
import FormulaDerivation from "@/components/formula/FormulaDerivation";
import ExtrapolationAnalysis from "@/components/formula/ExtrapolationAnalysis";
import { useStore } from "@/store/useStore";
import { BookOpen } from "lucide-react";

export default function FormulaPage() {
  const [params] = useSearchParams();
  const { problems } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get("id") ?? problems[0]?.id ?? null
  );

  useEffect(() => {
    const id = params.get("id");
    if (id && problems.some((p) => p.id === id)) {
      setSelectedId(id);
    }
  }, [params, problems]);

  const problem = problems.find((p) => p.id === selectedId) ?? null;

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="font-serif font-bold text-2xl text-ink-800 flex items-center gap-2">
          <BookOpen size={22} />
          公式计算解释
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          月底 / 课前入口 · 展示递推公式推导过程、逐项计算结果与外推越界判定逻辑，确保历史答案解释得清
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="lg:col-span-3 h-[calc(100vh-12rem)] min-h-[600px]">
          <ProblemSelector selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="lg:col-span-9 space-y-5">
          {problem ? (
            <>
              <FormulaDerivation problem={problem} />
              <ExtrapolationAnalysis problem={problem} />
            </>
          ) : (
            <div className="bg-white border border-ink-100 rounded-xl shadow-card p-16 text-center text-ink-400">
              请从左侧选择题目查看公式推导
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
