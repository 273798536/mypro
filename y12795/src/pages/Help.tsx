import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Terminal, FileText, Lightbulb, Copy, Check, AlertTriangle } from 'lucide-react';
import { FAILURE_REASONS } from '@/utils/failureReasons';

export function Help() {
  const navigate = useNavigate();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const commands = [
    { label: '安装依赖', cmd: 'npm install', note: '项目根目录下执行' },
    { label: '启动开发服务器', cmd: 'npm run dev', note: '默认端口 5173，启动后自动打开浏览器' },
    { label: '构建生产版本', cmd: 'npm run build', note: '输出到 dist/ 目录' },
    { label: '类型检查', cmd: 'npm run check', note: '运行 TypeScript 类型检查' },
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const formulas = [
    {
      title: '燃烧热（恒容）',
      formula: 'Qv = [W × (tn - t0 + Δt) - q × m] / M',
      unit: 'J/g',
      desc: '恒容条件下，单位质量样品完全燃烧释放的热量。苯甲酸理论值约 26460 J/g。',
      scope: '适用：固体/液体有机化合物，样品质量 0.5~1.5 g，氧弹量热计',
    },
    {
      title: '燃烧热（恒压）换算',
      formula: 'Qp = Qv + Δn × R × T',
      unit: 'J/g',
      desc: '恒压燃烧热与恒容燃烧热的关系，Δn 为气体物质的量变化。',
      scope: '适用：涉及气体产物的燃烧反应，T 取 298 K',
    },
    {
      title: '摩尔浓度换算',
      formula: 'c = (m × 1000) / (Mm × V)',
      unit: 'mol/L',
      desc: '由溶质质量、摩尔质量和溶液体积计算摩尔浓度。',
      scope: '适用：稀水溶液，室温 20~25 ℃',
    },
    {
      title: '雷诺温度校正',
      formula: 'Δt = (T末 - T始) × 校正系数',
      unit: '℃',
      desc: '补偿搅拌热和热辐射导致的温度偏差。',
      scope: '适用：温度变化曲线有明显前期、主期、末期的情况',
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b border-lab-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-serif text-xl font-semibold text-lab-navy">帮助说明</h1>
            <p className="text-xs text-gray-500">公式手册 · 启动指南 · 失败原因库 · 样例位置</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={22} className="text-lab-navy" />
            <h2 className="font-serif text-xl font-semibold text-lab-ink">空目录启动指南</h2>
          </div>
          <div className="lab-card p-6 space-y-4">
            <p className="text-sm text-gray-600">
              以下步骤从一个空目录开始，到工具成功运行并加载第一份示例批次。
            </p>
            <div className="space-y-3">
              {commands.map((c, i) => (
                <div key={i} className="border border-lab-line rounded-sm overflow-hidden">
                  <div className="bg-lab-navy text-white px-4 py-2 flex items-center justify-between">
                    <span className="font-medium text-sm">步骤 {i + 1}：{c.label}</span>
                    <span className="text-xs text-white/70">{c.note}</span>
                  </div>
                  <div className="flex items-stretch">
                    <div className="code-block flex-1 m-0 rounded-none border-0">{c.cmd}</div>
                    <button
                      onClick={() => handleCopy(c.cmd, i)}
                      className="px-4 flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 transition-colors border-l border-lab-line"
                    >
                      {copiedIdx === i ? <Check size={16} className="text-lab-green" /> : <Copy size={16} />}
                      {copiedIdx === i ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-lab-cream border border-lab-amber/30 rounded-sm">
              <div className="flex items-start gap-3">
                <Lightbulb size={20} className="text-lab-amber shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-lab-ink">第一份样例位置</p>
                  <p className="text-sm text-gray-700 mt-1">
                    启动后，在首页点击 <span className="font-mono bg-white px-1.5 py-0.5 rounded border">载入示例批次 YH20260610-01</span> 即可加载第一份样例数据。
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    对应源文件：<span className="font-mono bg-white px-1.5 py-0.5 rounded border">src/data/mockBatch.ts</span>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    样例包含：称量单 6 行、实验记录 3 组（含 1 处空白对照缺失）、反应时间 3 组（含 1 处漏记）
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={22} className="text-lab-navy" />
            <h2 className="font-serif text-xl font-semibold text-lab-ink">公式手册</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {formulas.map((f, i) => (
              <div key={i} className="lab-card p-5">
                <h3 className="font-serif text-lg font-semibold text-lab-navy mb-2">{f.title}</h3>
                <div className="formula-box mb-3 text-center">
                  <span className="font-mono text-lg">{f.formula}</span>
                  <span className="ml-3 text-sm text-gray-600">单位：{f.unit}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{f.desc}</p>
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <BookOpen size={14} className="mt-0.5 shrink-0" />
                  {f.scope}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={22} className="text-lab-amber" />
            <h2 className="font-serif text-xl font-semibold text-lab-ink">失败原因库（为什么要复核？）</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            以下是系统自动检测的常见问题，以及药化研究员积累的经验解释。点击每项可查看详细说明。
          </p>
          <div className="space-y-3">
            {FAILURE_REASONS.map((r) => (
              <div key={r.code} className="lab-card overflow-hidden">
                <div className="p-4 border-l-4 border-lab-amber bg-lab-cream/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lab-ink">
                        <span className="font-mono text-sm mr-2 px-2 py-0.5 bg-white rounded border border-lab-line">[{r.code}]</span>
                        {r.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">触发条件：<span className="font-mono">{r.trigger}</span></p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">为什么需要复核？</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{r.explanation}</p>
                  </div>
                  <div className="pt-2 border-t border-lab-line/50">
                    <p className="text-xs font-medium text-gray-500 mb-1">处理建议</p>
                    <p className="text-sm text-lab-navy font-medium">{r.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={22} className="text-lab-navy" />
            <h2 className="font-serif text-xl font-semibold text-lab-ink">溯源标记说明</h2>
          </div>
          <div className="lab-card p-5 space-y-3 text-sm text-gray-700">
            <p>
              本工具所有结论均可追溯到原始材料。以下标记在界面和导出文件中都会保留：
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-center gap-2">
                <span className="source-badge">行3</span>
                <span><strong>原始行号</strong>：对应用户称量单或记录本上的实际行号，不是程序自动编号</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="source-badge">📷 temp-01.png</span>
                <span><strong>关联图片名</strong>：扫描或拍摄的原始记录文件名，方便翻找</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="source-badge">📝 十万分之一天平</span>
                <span><strong>备注</strong>：自由文本说明，会随数据一起导出</span>
              </li>
            </ul>
            <p className="pt-3 border-t border-lab-line/50 text-gray-600">
              在批次报告时间线中，每条操作也会标注对应的来源行号/图片，实现从结论回查原始记录的完整链路。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
