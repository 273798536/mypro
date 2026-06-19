import { Info, Play, Code, RefreshCw, AlertTriangle } from "lucide-react"

const steps = [
  "进入看板主页，设置筛选条件（选择版本、日期范围、是否有人工修正/阈值漂移）",
  "查看统计卡片，了解整体评测情况",
  "在明细表中找到异常样本（左侧有橙色/红色标记）",
  "点击样本行，进入评测链路页",
  "在链路页查看完整评测时间线、人工修正记录和阈值漂移标记",
]

const fieldDescriptions: Record<string, string> = {
  sampleId: "样本标识",
  version: "评测版本",
  metrics: "各项指标值与阈值",
  evaluatedAt: "评测时间",
}

export default function Guide() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-xl font-semibold text-slate-100">使用说明</h1>

      <section>
        <h2 className="mb-4 flex items-center gap-2 border-l-4 border-cyan-500 pl-3 text-base font-medium text-slate-200">
          <Play className="h-4 w-4 text-cyan-400" />
          样例演示
        </h2>
        <div className="space-y-3">
          {steps.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-slate-300">
                {text}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-sm text-slate-400">
            异常样本在明细表中通过左侧彩色竖条标记：
            <span className="text-orange-400">橙色</span>=有人工修正，
            <span className="text-rose-400">红色</span>=有阈值漂移
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 border-l-4 border-cyan-500 pl-3 text-base font-medium text-slate-200">
          <RefreshCw className="h-4 w-4 text-cyan-400" />
          重跑操作
        </h2>
        <div className="space-y-2 text-sm text-slate-300">
          <p>
            点击看板主页右上角
            <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
              重跑
            </code>
            按钮 → 选择重跑版本和范围 → 等待完成
          </p>
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-slate-400">
              重跑会基于最新阈值重新计算所有指标，已有的人工修正不会丢失
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 border-l-4 border-cyan-500 pl-3 text-base font-medium text-slate-200">
          <Code className="h-4 w-4 text-cyan-400" />
          查看接口返回
        </h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            在样本评测链路页底部，点击
            <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
              查看接口返回
            </code>
            可展开原始JSON
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300">
{`{
  "sampleId": "SCH-001",
  "version": "v2.0",
  "metrics": {
    "准确率": { "value": 0.89, "threshold": 0.85 },
    "召回率": { "value": 0.82, "threshold": 0.80 }
  },
  "evaluatedAt": "2025-06-15T10:30:00Z"
}`}
          </pre>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400">
            {Object.entries(fieldDescriptions).map(([key, desc]) => (
              <div key={key} className="flex gap-2">
                <span className="font-mono text-cyan-400">{key}</span>
                <span>= {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
