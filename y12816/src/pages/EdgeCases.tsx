import EdgeCaseCard from '@/components/EdgeCaseCard';
import { mockEdgeCases } from '@/data/mockEdgeCases';
import { Info } from 'lucide-react';

export default function EdgeCases() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-warm-900">边界案例库</h2>
          <p className="text-warm-500 text-sm mt-1">
            条码重复、低质量读段等边界情况，两三个常见例子就够，但每个都要真的改变结果
          </p>
        </div>
        <span className="badge badge-danger gap-1">
          <Info size={12} />
          共 {mockEdgeCases.length} 个案例，全部会真实改变判定结论
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockEdgeCases.map((ec, idx) => (
          <div key={ec.id} className={`stagger-${idx + 1}`}>
            <EdgeCaseCard edgeCase={ec} />
          </div>
        ))}
      </div>
    </div>
  );
}
