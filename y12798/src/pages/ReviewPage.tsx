import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApp } from "@/store/useApp";
import TempChart from "@/components/TempChart";
import PhChart from "@/components/PhChart";
import type { Version } from "@/types";
import {
  SOLVENT_META,
  STATUS_BADGE,
  STATUS_LABEL,
  ROLE_LABEL,
  RETEST_REASON_LABEL,
  purityColor,
  purityBg,
} from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  History,
  PlusCircle,
  AlertCircle,
  Save,
  Lock,
  Thermometer,
  Beaker,
  FlaskConical,
} from "lucide-react";

export default function ReviewPage() {
  const { batchId = "" } = useParams();
  const nav = useNavigate();
  const {
    role,
    getBatch,
    getLatestVersion,
    getPublishedVersion,
    addVersion,
    publishVersion,
    updateStatus,
    resolveRetest,
    calculateBalance,
  } = useApp();

  const batch = getBatch(batchId);
  const latest = batch ? getLatestVersion(batch) : undefined;
  const published = batch ? getPublishedVersion(batch) : undefined;

  const [newPurity, setNewPurity] = useState<string>(latest?.purityResult?.toString() || "");
  const [newExplain, setNewExplain] = useState<string>(latest?.explanation || "");
  const [newChange, setNewChange] = useState<string>("");
  const [compareMode, setCompareMode] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "warn"; msg: string } | null>(null);

  const meta = batch ? SOLVENT_META[batch.solventType] : null;
  const bal = batch
    ? calculateBalance({
        solventType: batch.solventType,
        initialAmount: batch.initialAmount,
        targetPurity: batch.targetPurity,
      })
    : null;

  const missing = useMemo(() => {
    if (!batch) return [];
    const m: string[] = [];
    if (batch.reactionConditions.length === 0) m.push("反应条件参数");
    if (batch.tempCurve.length < 5) m.push(`温度曲线（至少5点，当前${batch.tempCurve.length}点）`);
    if (batch.phLogs.length === 0) m.push("pH记录数据");
    if (!latest?.purityResult) m.push("纯度检测结果");
    if (latest && !latest.explanation) m.push("结果解释说明（1-2句）");
    return m;
  }, [batch, latest]);

  const highlight = useMemo(() => {
    if (!batch || !meta) return undefined;
    const low = batch.tempCurve.findIndex((t) => t.timeMin >= 15);
    const high = batch.tempCurve.findIndex((t) => t.timeMin >= 35);
    const first = low >= 0 ? low : 0;
    const last = high >= 0 ? high : batch.tempCurve.length - 1;
    if (
      meta.boilingPoint > 0 &&
      batch.tempCurve.slice(first, last + 1).some((t) => Math.abs(t.tempC - meta.boilingPoint) > 1.5)
    ) {
      return {
        min: 15,
        max: 35,
        reason: "平台温度与标准沸点偏差>1.5°C",
      };
    }
    return undefined;
  }, [batch, meta]);

  if (!batch || !meta) {
    return (
      <div className="card text-center py-20">
        <div className="text-5xl mb-4">❓</div>
        <h3 className="font-display text-2xl text-ink-800 mb-2">批次不存在</h3>
        <p className="text-ink-500 mb-4">请确认批次号是否正确</p>
        <button className="btn-primary" onClick={() => nav("/records")}>
          <ArrowLeft size="15" /> 返回记录列表
        </button>
      </div>
    );
  }

  if (role === "student") {
    nav(`/student/${batchId}`, { replace: true });
    return null;
  }

  const versions = [...batch.versions].sort((a, b) => b.versionNum - a.versionNum);

  const onAddVersion = () => {
    if (!newChange.trim()) {
      setToast({ kind: "warn", msg: "请填写修改说明：任何改动都要留痕，别人才知道你改了什么" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (!newExplain.trim()) {
      setToast({ kind: "warn", msg: "缺少结果解释（1-2句），这是老师讲解和学生理解的关键" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const r = addVersion({
      batchId,
      purityResult: Number(newPurity),
      explanation: newExplain,
      changeNote: newChange,
    });
    if (!r.ok) {
      setToast({ kind: "warn", msg: r.message || "保存失败" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setNewChange("");
    setToast({ kind: "ok", msg: "新版本已生成，旧版自动保留不可删除。你可以发布此版本给学生查看。" });
    setTimeout(() => setToast(null), 5000);
  };

  const onPublish = (v: Version) => {
    publishVersion(batchId, v.versionId);
    setToast({ kind: "ok", msg: `v${v.versionNum} 已发布并锁定，学生现在看到的是这个版本。` });
    setTimeout(() => setToast(null), 5000);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const verA = compareMode && versions.find((v) => v.versionNum === compareMode[0]);
  const verB = compareMode && versions.find((v) => v.versionNum === compareMode[1]);

  const recovery = batch.initialAmount
    ? +((batch.recoveredAmount / batch.initialAmount) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in no-print">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => nav(-1)}>
            <ArrowLeft size="16" /> 返回
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg text-lab-600 font-semibold">{batch.batchId}</span>
              <span className={`badge ${STATUS_BADGE[batch.status]}`}>{STATUS_LABEL[batch.status]}</span>
              {meta && <span className="badge bg-ink-100 text-ink-700">{meta.name}</span>}
            </div>
            <div className="text-xs text-ink-500 mt-1">
              投料 {batch.initialAmount}L → 回收 {batch.recoveredAmount}L（回收率 {recovery}%） · 目标纯度 {batch.targetPurity}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {published && (
            <Link to={`/student/${batch.batchId}`} className="btn-secondary">
              <FileCheck2 size="15" /> 预览学生视图
            </Link>
          )}
          {missing.length === 0 && batch.status !== "published" && (
            <button
              className="btn-success"
              onClick={() => {
                updateStatus(batch.batchId, "review");
                setToast({ kind: "ok", msg: "已标记为复核中，可以继续改或直接发布。" });
                setTimeout(() => setToast(null), 4000);
              }}
            >
              <Save size="15" /> 标记复核中
            </button>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="p-4 rounded-xl2 bg-warn-50 border border-warn-200 shadow-soft flex items-start gap-3">
          <AlertCircle size="20" className="text-warn-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-warn-800 text-sm">同轮复核缺少以下数据（不完整不能发布）：</div>
            <ul className="list-disc list-inside text-xs text-warn-700 mt-1 space-y-0.5">
              {missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {latest?.purityResult ? (
        <div className="card relative overflow-hidden">
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${purityBg(latest.purityResult)}`} />
          <div className="flex items-start justify-between gap-6 flex-wrap pl-2">
            <div className="flex-1 min-w-[260px]">
              <div className="text-xs text-ink-500 mb-1">
                最新版本 v{latest.versionNum} · {ROLE_LABEL[latest.modifiedBy]} · {fmt(latest.modifiedAt)}
                {latest.isPublished && (
                  <span className="ml-2 badge bg-chem-50 text-chem-700">
                    <Lock size="10" /> 已发布
                  </span>
                )}
              </div>
              <div className="flex items-end gap-3 mt-2">
                <div className={`font-display text-6xl ${purityColor(latest.purityResult)}`}>
                  {latest.purityResult.toFixed(1)}
                  <span className="text-2xl font-sans ml-1 opacity-70">%</span>
                </div>
                <div className="pb-3">
                  <div className="h-2 w-40 rounded-full bg-ink-100 overflow-hidden">
                    <div
                      className={`h-full ${purityBg(latest.purityResult)} transition-all`}
                      style={{ width: `${Math.min(100, latest.purityResult)}%` }}
                    />
                  </div>
                  <div className="text-xs text-ink-500 mt-1">目标 {batch.targetPurity}%</div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-lab-50/60 border border-lab-100/70 text-sm text-ink-700 leading-relaxed">
                <span className="inline-block px-2 py-0.5 rounded-md bg-lab-100 text-lab-700 text-xs font-semibold mr-2 mb-1">
                  结果解释
                </span>
                {latest.explanation || "（暂无解释，建议修改版本时补充）"}
              </div>
              <div className="mt-2 text-xs text-ink-500 italic">
                修改说明：{latest.changeNote}
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-[260px] grid grid-cols-2 gap-3">
              <div className="card-soft">
                <div className="text-[11px] text-ink-500">版本总数</div>
                <div className="font-display text-2xl text-ink-800 mt-1">{batch.versions.length}</div>
              </div>
              <div className="card-soft">
                <div className="text-[11px] text-ink-500">温度点</div>
                <div className="font-display text-2xl text-ink-800 mt-1">{batch.tempCurve.length}</div>
              </div>
              <div className="card-soft">
                <div className="text-[11px] text-ink-500">pH记录</div>
                <div className="font-display text-2xl text-ink-800 mt-1">{batch.phLogs.length}</div>
              </div>
              <div className="card-soft">
                <div className="text-[11px] text-ink-500">复测建议</div>
                <div className="font-display text-2xl text-ink-800 mt-1">
                  {batch.retestAdvices.filter((r) => !r.resolved).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🧪</div>
          <h4 className="font-display text-xl text-ink-800 mb-1">纯度结果待录入</h4>
          <p className="text-sm text-ink-500 mb-4">请在下方「新建版本」中填写结果与解释</p>
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-lab-50 text-lab-600">
              <FlaskConical size="16" />
            </div>
            <div>
              <div className="font-semibold text-ink-800 text-sm">反应条件</div>
              <div className="text-xs text-ink-500">同轮复核三要素 · 1/3</div>
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
                {batch.reactionConditions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="td text-center text-ink-400">
                      暂无条件参数
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Beaker size="16" className="text-chem-600" />
              <div className="text-sm font-semibold text-ink-800">实验步骤</div>
            </div>
            <ol className="space-y-2">
              {batch.steps.map((s, i) => (
                <li
                  key={s.recordId}
                  className="flex gap-3 p-2.5 rounded-lg bg-ink-50/80 text-sm"
                >
                  <span className="shrink-0 w-6 h-6 rounded-md bg-white border border-ink-200 text-ink-600 flex items-center justify-center text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-800">{s.stepName}</span>
                      <span className="font-mono text-xs text-lab-600">
                        {s.value} {s.unit}
                      </span>
                    </div>
                    {s.note && <div className="text-xs text-ink-500 mt-0.5">{s.note}</div>}
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
              <div className="font-semibold text-ink-800 text-sm">温度曲线</div>
              <div className="text-xs text-ink-500">同轮复核三要素 · 2/3</div>
            </div>
          </div>
          <TempChart
            data={batch.tempCurve}
            boilingPoint={meta.boilingPoint}
            highlight={highlight}
          />
          <div className="mt-3 text-xs text-ink-500 flex items-center justify-between">
            <span>绿虚线：标准沸点 {meta.boilingPoint}°C</span>
            <span>共 {batch.tempCurve.length} 个记录点</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-alert-50 text-alert-600">
              <AlertTriangle size="16" />
            </div>
            <div>
              <div className="font-semibold text-ink-800 text-sm">pH 记录与越界</div>
              <div className="text-xs text-ink-500">同轮复核三要素 · 3/3</div>
            </div>
          </div>
          {bal && <PhChart data={batch.phLogs} range={bal.phRange} />}
          <div className="mt-3 text-xs text-ink-500">
            推荐范围：[{bal?.phRange[0]} ~ {bal?.phRange[1]}]
          </div>
        </div>
      </div>

      {batch.retestAdvices.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size="18" className="text-warn-600" />
            <div>
              <div className="font-semibold text-ink-800">复测建议</div>
              <div className="text-xs text-ink-500">每条建议都有具体操作步骤，不只是一句空泛提醒</div>
            </div>
          </div>
          <div className="space-y-3">
            {batch.retestAdvices.map((r) => (
              <div
                key={r.retestId}
                className={`p-4 rounded-xl border ${
                  r.resolved
                    ? "bg-chem-50/50 border-chem-100"
                    : "bg-warn-50/50 border-warn-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span
                        className={`badge ${
                          r.priority === "high"
                            ? "bg-alert-100 text-alert-700"
                            : r.priority === "medium"
                            ? "bg-warn-100 text-warn-700"
                            : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {r.priority === "high" ? "高优先级" : r.priority === "medium" ? "中优先级" : "低优先级"}
                      </span>
                      <span className="badge bg-lab-50 text-lab-700">
                        {RETEST_REASON_LABEL[r.reason]}
                      </span>
                      {r.resolved && (
                        <span className="badge bg-chem-50 text-chem-700">
                          <CheckCircle2 size="10" /> 已处理
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink-700">{r.description}</div>
                    <div className="mt-2 p-3 rounded-lg bg-white/70 border border-ink-100 text-sm text-ink-700">
                      <div className="text-xs font-semibold text-lab-700 mb-1">可操作步骤：</div>
                      <div className="whitespace-pre-line leading-relaxed text-ink-700">{r.action}</div>
                    </div>
                  </div>
                  {!r.resolved && (
                    <button
                      className="btn-success"
                      onClick={() => {
                        resolveRetest(batch.batchId, r.retestId);
                        setToast({ kind: "ok", msg: "复测建议已标记为处理完成" });
                        setTimeout(() => setToast(null), 3500);
                      }}
                    >
                      <CheckCircle2 size="15" /> 标记处理
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle size="18" className="text-lab-600" />
            <div>
              <div className="font-semibold text-ink-800">新建 / 修改版本（自动留痕）</div>
              <div className="text-xs text-ink-500">
                任何改动都会生成新版本，旧版只读不可删。必须填写修改说明和结果解释。
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">
                纯度结果 (%)
                {!newPurity && <span className="ml-1 text-warn-600 text-xs">必填</span>}
              </label>
              <input
                type="number"
                className="input"
                value={newPurity}
                placeholder="例：96.2"
                onChange={(e) => setNewPurity(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                结果解释（1-2 句，老师会用这个给学生讲解）
                {!newExplain.trim() && <span className="ml-1 text-warn-600 text-xs">必填</span>}
              </label>
              <textarea
                className="input min-h-[90px]"
                placeholder="例：延长静置时间至30分钟后切取中段馏分，水分降至0.3%以下，纯度稳定达标。"
                value={newExplain}
                onChange={(e) => setNewExplain(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                修改说明（别人才知道你改了什么）
                {!newChange.trim() && <span className="ml-1 text-warn-600 text-xs">必填</span>}
              </label>
              <input
                type="text"
                className="input"
                placeholder="例：重新检测后更新纯度，补充了切取中段的处理说明"
                value={newChange}
                onChange={(e) => setNewChange(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full" onClick={onAddVersion}>
              <Save size="15" /> 生成新版本
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size="18" className="text-ink-600" />
              <div>
                <div className="font-semibold text-ink-800">版本历史</div>
                <div className="text-xs text-ink-500">所有版本可追溯，老师可直接用于对比讲解</div>
              </div>
            </div>
            {versions.length >= 2 && !compareMode && (
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  setCompareMode([versions[0].versionNum, versions[versions.length - 1].versionNum])
                }
              >
                对比最新 & 最早
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {versions.map((v) => (
              <div
                key={v.versionId}
                className={`p-3 rounded-xl border ${
                  v.isPublished
                    ? "bg-chem-50/50 border-chem-200"
                    : "bg-ink-50/60 border-ink-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg text-ink-800">v{v.versionNum}</span>
                      <span className={`font-mono text-sm font-semibold ${purityColor(v.purityResult)}`}>
                        {v.purityResult ? `${v.purityResult.toFixed(1)}%` : "—"}
                      </span>
                      {v.isPublished && (
                        <span className="badge bg-chem-50 text-chem-700">
                          <Lock size="10" /> 已发布
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {ROLE_LABEL[v.modifiedBy]} · {fmt(v.modifiedAt)}
                    </div>
                    <div className="text-xs text-ink-600 mt-1.5 leading-relaxed">
                      <span className="font-medium">修改说明：</span>
                      {v.changeNote}
                    </div>
                  </div>
                  {!v.isPublished && v.purityResult > 0 && missing.length === 0 && (
                    <button
                      className="btn-success text-xs"
                      onClick={() => onPublish(v)}
                    >
                      <Lock size="13" /> 发布给学生
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {compareMode && verA && verB && (
            <div className="mt-5 p-4 rounded-xl bg-lab-50 border border-lab-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-lab-700">
                  版本对比：v{compareMode[1]} → v{compareMode[0]}
                </div>
                <button
                  className="text-xs text-lab-600 hover:underline"
                  onClick={() => setCompareMode(null)}
                >
                  关闭对比
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-white">
                  <div className="text-xs text-ink-500 mb-1">旧 v{compareMode[1]} 纯度</div>
                  <div className={`font-display text-2xl ${purityColor(verB.purityResult)}`}>
                    {verB.purityResult?.toFixed(1)}%
                  </div>
                  <div className="text-xs text-ink-600 mt-2 line-through">{verB.explanation}</div>
                </div>
                <div className="p-3 rounded-lg bg-chem-50 border border-chem-100">
                  <div className="text-xs text-ink-500 mb-1">新 v{compareMode[0]} 纯度</div>
                  <div className={`font-display text-2xl ${purityColor(verA.purityResult)}`}>
                    {verA.purityResult?.toFixed(1)}%
                  </div>
                  <div className="text-xs text-ink-700 mt-2">{verA.explanation}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-md">
          <div
            className={`px-5 py-3 rounded-xl shadow-card text-sm border flex items-center gap-2 ${
              toast.kind === "ok"
                ? "bg-chem-50 text-chem-800 border-chem-200"
                : "bg-warn-50 text-warn-800 border-warn-200"
            }`}
          >
            {toast.kind === "ok" ? <CheckCircle2 size="16" /> : <AlertTriangle size="16" />}
            <div className="leading-relaxed">{toast.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
