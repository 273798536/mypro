import { BookOpen, Info, X } from 'lucide-react';
import { useState } from 'react';

export default function FormulaCard() {
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-card text-ink-700 hover:bg-white/90 transition"
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-sm font-medium">公式与适用范围</span>
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-card p-5 relative animate-fade-up max-w-sm">
      <button
        onClick={() => setExpanded(false)}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-ink-100/60 text-ink-400"
        aria-label="收起公式"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-ink-600" />
        <h3 className="font-serif text-ink-800 font-semibold">秩计算 · 数值方法</h3>
      </div>

      <div className="divider-gold mb-3" />

      <div className="formula-block text-[13.5px] space-y-2">
        <p>
          对矩阵 <span className="italic">A</span> ∈ ℝ<sup>m×n</sup> 做奇异值分解：
        </p>
        <p className="pl-2 font-mono bg-ink-50/80 rounded-lg px-3 py-2 border border-ink-100">
          A = U · Σ · Vᵀ
        </p>
        <p>
          其中 Σ = diag(σ₁, σ₂, …, σ<sub>p</sub>), &nbsp;σ₁ ≥ σ₂ ≥ … ≥ σ<sub>p</sub> ≥ 0。
        </p>
        <p>数值秩 <span className="italic">r</span> 由阈值判定：</p>
        <p className="pl-2 font-mono bg-ink-50/80 rounded-lg px-3 py-2 border border-ink-100">
          {'r = #{ i : σᵢ > max(m,n) · σ₁ · εₘₐₙ }'}
        </p>
      </div>

      <div className="mt-4 space-y-1.5 text-[12px] text-ink-500">
        <div className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-700">单位说明：</span>
            秩为无量纲整数；条件数 κ = σ₁/σ<sub>min</sub> 亦无量纲。原始数据单位由使用者录入单元格并随来源追溯。
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-forest-700">适用范围：</span>
            稠密浮点矩阵；εₘₐₙ ≈ 2.2×10⁻¹⁶（双精度）。若条件数 κ &gt; 10¹²，结论需人工复核。
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rose-700">常见失败：</span>
            ① 含空值/NaN → 需补数据；② 单位缺失 → 需补材料或统一口径；③ 严重秩亏 → 检查是否线性相关。
          </div>
        </div>
      </div>
    </div>
  );
}
