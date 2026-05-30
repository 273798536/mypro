import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Copy, FileJson } from 'lucide-react';
import { DEFAULT_POOL } from '@/utils/gachaEngine';
import { useState } from 'react';

const POOL_JSON_EXAMPLE = JSON.stringify(DEFAULT_POOL, null, 2);

const PITY_REPRO_STEPS = [
  { step: 1, title: '设置硬保底', desc: '在卡池配置中，将"硬保底"设为一个较小的值（如 10），方便快速复现。' },
  { step: 2, title: '关闭软保底', desc: '将"软保底起始"设为 0、"软保底增量"设为 0%，确保只有硬保底生效。' },
  { step: 3, title: '开始实验并单抽', desc: '点击"开始实验"，然后连续单抽。观察保底计数器逐渐接近硬保底值。' },
  { step: 4, title: '观察保底触发', desc: '当保底计数器达到硬保底值时，下一抽必定出 SSR。此时计数器重置为 0。' },
  { step: 5, title: '回看确认', desc: '进入"回看分析"页面，找到标记为"保底触发"的记录，查看错因解释。' },
];

const DUPLICATE_STEPS = [
  { step: 1, title: '选择折算策略', desc: '在卡池配置的"重复卡折算"中选择"碎片"或"星辉币"。' },
  { step: 2, title: '多次抽卡', desc: '执行多次十连抽，直到出现重复卡。记录中会标注"重复→碎片 ×N"。' },
  { step: 3, title: '查看折算详情', desc: '点击该记录展开，错因解释会说明折算规则：SSR→50碎片，SR→5碎片，R→1碎片。' },
];

export default function Guide() {
  const [copied, setCopied] = useState(false);

  function copyJSON() {
    navigator.clipboard.writeText(POOL_JSON_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-screen flex-col bg-gacha-bg bg-noise">
      <header className="flex items-center gap-4 border-b border-gacha-border px-6 py-3">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-gacha-gold"
        >
          <ArrowLeft className="h-4 w-4" /> 返回实验室
        </Link>
        <h1 className="font-display text-sm font-bold tracking-wider text-gacha-gold text-shadow-glow-gold">
          GUIDE
        </h1>
        <span className="text-xs text-slate-500">说明文档</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="rounded-xl border border-gacha-border bg-gacha-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gacha-gold" />
              <h2 className="font-display text-base font-bold text-slate-200">卡池准备指南</h2>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div>
                <h3 className="mb-1.5 text-xs font-bold text-gacha-gold">概率参数</h3>
                <p className="text-xs text-slate-400">
                  SSR/SR 概率使用滑块调节，R 概率自动计算（= 1 - SSR% - SR%）。各概率之和需 ≤ 100%，
                  若 SSR + SR 超过 100%，R 概率将为 0，可能导致异常结果。
                </p>
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-bold text-gacha-gold">保底机制</h3>
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                  <li><span className="text-slate-300">硬保底</span>：达到指定抽数后必定出 SSR，计数器重置为 0</li>
                  <li><span className="text-slate-300">软保底</span>：从"起始"抽开始，每抽额外增加"增量"概率，直到硬保底</li>
                  <li><span className="text-slate-300">SR 保底</span>：独立计数，达到后必定出 SR</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-bold text-gacha-gold">重复卡折算策略</h3>
                <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                  <li><span className="text-slate-300">碎片</span>：SSR→50 碎片，SR→5 碎片，R→1 碎片</li>
                  <li><span className="text-slate-300">星辉币</span>：SSR→1600 星辉币，SR→100 星辉币，R→5 星辉币</li>
                  <li><span className="text-slate-300">无折算</span>：重复卡无补偿</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1.5 text-xs font-bold text-gacha-gold">导入/导出</h3>
                <p className="mb-2 text-xs text-slate-400">
                  点击"导出"获取当前卡池的 JSON 配置，"导入"可粘贴 JSON 恢复配置。
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border border-gacha-border bg-gacha-bg p-3 text-[10px] text-slate-400">
                    {POOL_JSON_EXAMPLE}
                  </pre>
                  <button
                    onClick={copyJSON}
                    className="absolute right-2 top-2 flex items-center gap-1 rounded border border-gacha-border bg-gacha-card px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-gacha-gold/50"
                  >
                    {copied ? '已复制 ✓' : <><Copy className="h-3 w-3" /> 复制</>}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gacha-border bg-gacha-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-gacha-purple" />
              <h2 className="font-display text-base font-bold text-slate-200">保底重置复现方法</h2>
            </div>

            <div className="space-y-3">
              {PITY_REPRO_STEPS.map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gacha-gold/20 font-display text-xs font-bold text-gacha-gold">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gacha-border bg-gacha-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-rose-400" />
              <h2 className="font-display text-base font-bold text-slate-200">重复卡折算复现方法</h2>
            </div>

            <div className="space-y-3">
              {DUPLICATE_STEPS.map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 font-display text-xs font-bold text-rose-400">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gacha-border bg-gacha-card p-6">
            <h2 className="mb-3 font-display text-base font-bold text-slate-200">关键数学概念</h2>
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <h3 className="mb-1 text-xs font-bold text-amber-400">软保底公式</h3>
                <p>实际概率 = 基础概率 + max(0, 当前抽数 - 软保底起始 + 1) × 软保底增量</p>
                <p className="mt-1">例：基础 0.6%，起始 74，增量 6% → 第 80 抽实际概率 = 0.6% + 7×6% = 42.6%</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <h3 className="mb-1 text-xs font-bold text-purple-400">保底重置</h3>
                <p>出 SSR 后，SSR 保底计数器归零。这意味着即使你在第 89 抽出了 SSR（接近硬保底），下一次循环仍需从 0 开始累计。这是保底机制的核心：它保证的不是"每 N 抽必出一个 SSR"，而是"连续 N 抽无 SSR 时强制出一个"。</p>
              </div>
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <h3 className="mb-1 text-xs font-bold text-rose-400">重复卡与期望值</h3>
                <p>当卡池中 SSR 卡数量有限时，随着收集进度推进，重复率上升。碎片/星辉币折算降低了重复卡的"零收益"问题，但实际期望收益仍低于初次获得。这是抽卡系统设计的经济平衡机制。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
