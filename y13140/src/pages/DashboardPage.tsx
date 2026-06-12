import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, AlertTriangle, FileOutput, ArrowRight, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStoreShallow } from '@/store/useAppStoreShallow';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { parameters, anomalies, records } = useAppStoreShallow((s) => ({
    parameters: s.parameters,
    anomalies: s.anomalies,
    records: s.records,
  }));

  const weirdRecord = records.find((r) => r.isSeeminglyNormal);
  const changedParams = parameters.filter((p) => p.changeCount > 0);
  const weightAnomalyParams = new Set(
    anomalies.filter((a) => a.type === 'weight').map((a) => a.paramId),
  );

  return (
    <div className="max-w-[1180px] mx-auto p-6 space-y-6 fade-in">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-song text-2xl text-ink-800">整数规划错题复盘 · 工作台</h1>
          <p className="text-sm text-ink-500 mt-1">
            参数表能拼出主线，变更有历史，异常追到原始说法。
          </p>
        </div>
      </header>

      {/* 引导卡片：运营主管接手不用问 —— 三步上手 */}
      <section className="stagger">
        <div className="mb-2 text-[11px] text-ink-400 tracking-widest font-hei">
          接手指引 · 第一次来这里看
        </div>
        <div className="grid grid-cols-3 gap-4">
          <GuideCard
            icon={<FolderOpen size={20} />
            step="01"
            title="材料放这里"
            desc="点导航栏「参数历史面板」能看到所有版本、备注、旧截图。"
            to="/history/p1"
          />
          <GuideCard
            icon={<AlertTriangle size={20} />}
            step="02"
            title="异常看这里"
            desc='所有「外推越界」不只一句警告，能一路追到参数表原始说法。'
            to="/anomaly"
          />
          <GuideCard
            icon={<FileOutput size={20} />
            step="03"
            title="重新导出点这里"
            desc="去复核单页锁定快照，一键导出Markdown。"
            to="/review"
          />
        </div>
      </section>

      {/* 异常提醒条：琥珀黄对角条纹 */}
      {anomalies.length > 0 && (
        <section>
          <div
            className="rounded-[2px] px-5 py-3 flex items-center justify-between"
            style={{ backgroundImage:
              'repeating-linear-gradient(45deg, #f9ecc9 0, #f9ecc9 10px, #f2d78e 10px, #f2d78e 20px)' }}
          >
            <div className="flex items-center gap-3 text-ink-800">
              <span className="w-8 h-8 rounded bg-ink-800 text-white flex items-center justify-center">
                <AlertTriangle size={16} />
              </span>
              <div>
                <div className="text-sm font-hei">
                  当前有 <span className="font-mono text-amber-600">{anomalies.length}</span> 条异常未闭环
                </div>
                <div className="text-xs text-ink-600 mt-0.5">
                  {anomalies.map((a) => a.title).join(' · ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/anomaly')}
              className="px-4 py-1.5 text-xs bg-ink-800 text-white rounded-[2px] hover:bg-ink-700 transition-colors font-hei flex items-center gap-1.5"
            >
              去溯源 <ArrowRight size={13} />
            </button>
          </div>
        </section>
      )}

      {/* 参数表总览 + "这条记录为什么影响结论" */}
      <section className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <SectionHeader title="参数表总览" subtitle="被改动过的单元格左上角有琥珀黄三角标，悬停看变更次数" />
          <div className="bg-white border border-ink-200 rounded-[2px] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 border-b border-ink-200 text-ink-600 text-[12px] font-hei">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">参数</th>
                  <th className="text-right font-medium px-4 py-2.5">当前值</th>
                  <th className="text-right font-medium px-4 py-2.5">当前权重</th>
                  <th className="text-center font-medium px-4 py-2.5">变更</th>
                  <th className="text-left font-medium px-4 py-2.5">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {parameters.map((p, idx) => {
                  const changed = p.changeCount > 0;
                  const weightAnomaly = weightAnomalyParams.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`${idx % 2 === 1 ? 'bg-ink-50/40' : ''} hover:bg-amber-50/40 transition-colors`}
                    >
                      <td
                        className={`px-4 py-3 cell-triangle ${changed ? '' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {changed && (
                            <Pencil size={12} className="text-amber-500 shrink-0" />
                          )}
                          <Link
                            to={`/history/${p.id}`}
                            className={`link-underline text-ink-800 hover:text-ink-700 ${
                              weightAnomaly ? 'text-amber-700' : ''
                            }`}
                          >
                            {p.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ink-800">
                        {p.currentValue}
                        <span className="text-xs text-ink-500 ml-1">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <WeightBar value={p.currentWeight} highlight={weightAnomaly} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {changed ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-mono ${
                              weightAnomaly
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-ink-100 text-ink-700'
                            }`}
                          >
                            {p.changeCount}次
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-500">
                        {weightAnomaly
                          ? '权重异动 · 见v1-3未走流程'
                          : changed
                          ? '有补记'
                          : '无变更'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-500">
            <LegendDot color="#d4a24c" label="已变更" />
            <LegendDot color="#b8853a" label="权重异动" />
            <LegendDot color="#c8d3e2" label="无变更" />
            <span className="ml-auto">
              共 {parameters.length} 项参数 · {changedParams.length} 项被改动过
            </span>
          </div>
        </div>

        {/* 为什么这条"正常记录"影响结论 */}
        <div>
          <SectionHeader title="影响主线" subtitle="一条看似正常的记录如何改变结论" />
          {weirdRecord && (
            <div className="bg-white border-2 border-amber-200 rounded-[2px] p-4 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 shrink-0 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                  <AlertTriangle size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-hei text-ink-800 leading-snug">
                    {weirdRecord.title}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-1 font-hei tracking-wide">
                    看似正常 · 贡献占比 {weirdRecord.contributionToConclusion}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-ink-600 leading-relaxed pl-10 border-l border-dashed border-amber-300 ml-3.5 pl-4">
                {weirdRecord.impactExplanation}
              </div>
              <button
                onClick={() => navigate('/analysis')}
                className="w-full mt-1 py-2 text-xs text-ink-700 bg-ink-50 hover:bg-ink-100 transition-colors rounded-[2px] border border-ink-200 font-hei flex items-center justify-center gap-1"
              >
                去分析页看展开的影响链路 <ArrowRight size={13} />
              </button>
            </div>
          )}

          <div className="mt-4 bg-white border border-ink-200 rounded-[2px] p-4">
            <div className="text-[11px] text-ink-400 tracking-widest font-hei mb-3">
              变更速览
            </div>
            <div className="space-y-2 text-xs">
              {changedParams.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Link
                    to={`/history/${p.id}`}
                    className="text-ink-700 hover:text-ink-800 truncate max-w-[160px] link-underline"
                  >
                    {p.name}
                  </Link>
                  <span className="font-mono text-ink-500">
                    改 {p.changeCount} 次
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between">
      <div>
        <h2 className="font-song text-lg text-ink-800">{title}</h2>
        {subtitle && (
          <div className="text-[11px] text-ink-500 mt-0.5 font-hei">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function GuideCard({
  icon,
  step,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="hover-lift bg-white border border-ink-200 rounded-[2px] p-5 block group"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-[2px] bg-ink-700 text-white flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs text-ink-400">{step}</span>
            <span className="font-song text-base text-ink-800">{title}</span>
          </div>
          <div className="text-xs text-ink-500 mt-1 leading-relaxed">{desc}</div>
          <div className="mt-3 text-xs text-ink-700 font-hei flex items-center gap-1 group-hover:gap-2 transition-all">
            进入 <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function WeightBar({ value, highlight }: { value: number; highlight?: boolean }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const bg = highlight ? 'bg-amber-400' : 'bg-ink-500';
  const txt = highlight ? 'text-amber-700' : 'text-ink-800';
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-24 h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-xs ${txt} w-12 text-right`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-[2px]"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
