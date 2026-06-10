import { useParams, useNavigate, Link } from "react-router-dom";
import { useApp } from "@/store/useApp";
import TempChart from "@/components/TempChart";
import PhChart from "@/components/PhChart";
import { SOLVENT_META, STATUS_LABEL, STATUS_BADGE, purityColor, purityBg, ROLE_LABEL } from "@/types";
import {
  ArrowLeft,
  BookOpen,
  FlaskConical,
  Lock,
  Printer,
  Sparkles,
  Thermometer,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";

export default function StudentView() {
  const { batchId = "" } = useParams();
  const nav = useNavigate();
  const { getBatch, getPublishedVersion, calculateBalance, role } = useApp();

  const batch = getBatch(batchId);
  const pub = batch ? getPublishedVersion(batch) : undefined;
  const meta = batch ? SOLVENT_META[batch.solventType] : null;
  const bal = batch
    ? calculateBalance({
        solventType: batch.solventType,
        initialAmount: batch.initialAmount,
        targetPurity: batch.targetPurity,
      })
    : null;

  if (!batch || !meta) {
    return (
      <div className="max-w-3xl mx-auto p-10 card text-center">
        <div className="text-5xl mb-4">❓</div>
        <h3 className="font-display text-2xl mb-2">报告不存在</h3>
        <p className="text-ink-500">老师可能还没有发布这份报告</p>
        <button className="btn-primary mt-5" onClick={() => nav(-1)}>
          <ArrowLeft size="15" /> 返回
        </button>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="max-w-3xl mx-auto p-10 card text-center">
        <Lock size="44" className="mx-auto mb-4 text-warn-500" />
        <h3 className="font-display text-2xl text-ink-800 mb-2">报告暂未发布</h3>
        <p className="text-ink-500 max-w-md mx-auto">
          环境监测员或老师完成复核后会发布正式版本。当前批次只有草稿，学生无法查看。
        </p>
        <Link to="/records" className="btn-primary mt-5 inline-flex">
          <ArrowLeft size="15" /> 返回已发布报告列表
        </Link>
      </div>
    );
  }

  const recovery = batch.initialAmount
    ? +((batch.recoveredAmount / batch.initialAmount) * 100).toFixed(1)
    : 0;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      {role !== "student" && (
        <div className="mb-4 flex items-center justify-between no-print">
          <button className="btn-ghost" onClick={() => nav(-1)}>
            <ArrowLeft size="15" /> 返回（当前以老师/监测员预览）
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size="15" /> 打印报告
          </button>
        </div>
      )}

      <div className="card bg-gradient-to-br from-white via-white to-chem-50/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-lab-200/40 to-chem-200/40 rounded-bl-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-chem-50 text-chem-700 text-xs font-medium border border-chem-100">
                <Lock size="11" /> 已发布 · 唯一版本
              </div>
              {role === "student" && (
                <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lab-50 text-lab-700 text-xs">
                  <BookOpen size="11" /> 学生视图
                </span>
              )}
            </div>
            <div className="text-xs text-ink-500">发布时间：{fmt(pub.modifiedAt)}</div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-2xl text-lab-600 font-semibold">{batch.batchId}</span>
              <span className={`badge ${STATUS_BADGE[batch.status]}`}>
                {STATUS_LABEL[batch.status]}
              </span>
              <span className="badge bg-ink-100 text-ink-700">{meta.name}（{meta.abbreviation}）</span>
            </div>
            <h2 className="mt-4 font-display text-4xl text-ink-800 leading-tight">
              {meta.name}溶剂回收 · 纯度分析报告
            </h2>
            <p className="mt-2 text-ink-600 text-lg">
              本报告处理的是 <span className="font-semibold text-lab-700">{batch.batchId}</span> 这一批具体材料，
              以下数据、图表、解释全部来自同一轮实验。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 card relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${purityBg(pub.purityResult)}`} />
        <div className="pl-3 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-xs text-ink-500 mb-1">
                  已发布版本 v{pub.versionNum} · {ROLE_LABEL[pub.modifiedBy]}
                </div>
                <div className={`font-display text-7xl leading-none ${purityColor(pub.purityResult)}`}>
                  {pub.purityResult.toFixed(1)}
                  <span className="text-3xl font-sans ml-1 opacity-70">%</span>
                </div>
              </div>
              <div className="pb-3">
                <div className="h-3 w-56 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-full ${purityBg(pub.purityResult)}`}
                    style={{ width: `${Math.min(100, pub.purityResult)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-ink-500">
                  目标纯度 {batch.targetPurity}% · {" "}
                  {pub.purityResult >= batch.targetPurity ? (
                    <span className="text-chem-600 font-semibold">✅ 达到目标</span>
                  ) : (
                    <span className="text-alert-600 font-semibold">⚠ 未达目标</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-ink-50">
              <div className="text-[11px] text-ink-500">投料量</div>
              <div className="font-display text-xl text-ink-800">{batch.initialAmount}L</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-lab-50">
              <div className="text-[11px] text-ink-500">回收量</div>
              <div className="font-display text-xl text-lab-700">{batch.recoveredAmount}L</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-chem-50">
              <div className="text-[11px] text-ink-500">回收率</div>
              <div className="font-display text-xl text-chem-700">{recovery}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-lab-50/80 via-white to-white border border-lab-100 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-lab-500 text-white">
            <Sparkles size="16" />
          </div>
          <div>
            <div className="font-semibold text-ink-800 text-lg">结果解释（老师讲解重点）</div>
            <div className="text-xs text-ink-500">这段解释和上面的纯度数字绑定，不会出现"数字是新的、解释是旧的"的情况</div>
          </div>
        </div>
        <p className="text-ink-800 leading-relaxed text-lg pl-1 border-l-4 border-lab-300">
          {pub.explanation}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-2xl text-ink-800 mb-4">
          <span className="inline-block w-1.5 h-6 align-middle mr-2 rounded-full bg-chem-500" />
          同轮实验三要素
        </h3>
        <div className="text-sm text-ink-500 mb-5">
          下面三项全部来自 <span className="font-mono bg-ink-100 px-1.5 py-0.5 rounded">{batch.batchId}</span> 的同一轮实验，
          不是通用样例。你能通过它们看出这次处理过程是否正常。
        </div>
        <div className="grid xl:grid-cols-3 gap-5">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-lab-50 text-lab-600">
                <FlaskConical size="16" />
              </div>
              <div>
                <div className="font-semibold text-ink-800">① 反应条件</div>
                <div className="text-xs text-ink-500">处理这批材料用了什么参数</div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="th">参数</th>
                    <th className="th">数值</th>
                    <th className="th">单位</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.reactionConditions.map((r) => (
                    <tr key={r.id}>
                      <td className="td font-medium">{r.name}</td>
                      <td className="td text-lab-700 font-mono">{r.value}</td>
                      <td className="td text-ink-500">{r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-ink-800 mb-2">实验步骤</div>
              <ol className="space-y-2">
                {batch.steps.map((s, i) => (
                  <li
                    key={s.recordId}
                    className="flex gap-3 p-3 rounded-xl bg-ink-50/80 text-sm"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-white border border-ink-200 flex items-center justify-center text-sm font-semibold text-ink-700">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink-800">{s.stepName}</span>
                        <span className="font-mono text-xs text-lab-700 bg-lab-50 px-2 py-0.5 rounded-md">
                          {s.value} {s.unit}
                        </span>
                      </div>
                      {s.note && (
                        <div className="text-xs text-ink-600 mt-1 italic">备注：{s.note}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-warn-50 text-warn-600">
                <Thermometer size="16" />
              </div>
              <div>
                <div className="font-semibold text-ink-800">② 温度曲线</div>
                <div className="text-xs text-ink-500">
                  绿虚线是 {meta.name} 标准沸点 {meta.boilingPoint}°C
                </div>
              </div>
            </div>
            <TempChart data={batch.tempCurve} boilingPoint={meta.boilingPoint} height={240} />
            <div className="mt-3 p-3 rounded-lg bg-ink-50 text-xs text-ink-600">
              💡 观察要点：平台温度是否与沸点接近？升温过程是否平滑？有无异常突升或突降？
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-alert-50 text-alert-600">
                <AlertTriangle size="16" />
              </div>
              <div>
                <div className="font-semibold text-ink-800">③ pH 越界记录</div>
                <div className="text-xs text-ink-500">绿色区域是推荐 pH 范围</div>
              </div>
            </div>
            {bal && <PhChart data={batch.phLogs} range={bal.phRange} height={140} />}
            <div className="mt-3 p-3 rounded-lg bg-ink-50 text-xs text-ink-600">
              💡 推荐范围 [{bal?.phRange[0]} ~ {bal?.phRange[1]}]。
              红色点表示该时刻超出范围，可能暗示酸性或碱性杂质进入。
            </div>
          </div>
        </div>
      </div>

      {batch.retestAdvices.filter((r) => r.resolved).length > 0 && (
        <div className="mt-6 card">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 size="18" className="text-chem-600" />
            <div>
              <div className="font-semibold text-ink-800">已处理的复测记录</div>
              <div className="text-xs text-ink-500">老师可以拿这些例子讲解"出了问题应该怎么处理"</div>
            </div>
          </div>
          <div className="space-y-3">
            {batch.retestAdvices
              .filter((r) => r.resolved)
              .map((r) => (
                <div key={r.retestId} className="p-4 rounded-xl bg-chem-50/50 border border-chem-100">
                  <div className="text-sm font-semibold text-ink-800">{r.description}</div>
                  <div className="mt-2 text-sm text-ink-700 whitespace-pre-line leading-relaxed">
                    处理步骤：{r.action}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-10 text-center text-xs text-ink-400 border-t border-ink-100 pt-6">
        本报告基于版本 v{pub.versionNum} 生成 · 发布人：{ROLE_LABEL[pub.modifiedBy]} · {fmt(pub.modifiedAt)}
      </div>
    </div>
  );
}
