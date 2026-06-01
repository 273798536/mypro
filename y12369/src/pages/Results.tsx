import { useState, Fragment } from "react";
import { useStore } from "@/store/useStore";
import {
  exportNormalResults,
  exportAnomalyResults,
  exportFullReport,
  downloadFile,
  statusLabel,
  sourceLabel,
  anomalyTypeLabel,
} from "@/utils/export";
import type { ExportFormat } from "@/types";

const SRC: Record<string, string> = {
  input: "bg-blue-100 text-blue-700",
  import: "bg-purple-100 text-purple-700",
  sample: "bg-teal-100 text-teal-700",
  sensor: "bg-green-100 text-green-700",
  manual: "bg-orange-100 text-orange-700",
  calculated: "bg-gray-100 text-gray-600",
};

const ANOM: Record<string, string> = {
  load_eccentricity: "bg-orange-100 text-orange-700",
  density_misuse: "bg-yellow-100 text-yellow-700",
  inclination_exceedance: "bg-red-100 text-red-700",
};

const SrcBadge = ({ s }: { s: string }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${SRC[s] ?? "bg-gray-100 text-gray-600"}`}
  >
    {sourceLabel(s)}
  </span>
);

export default function Results() {
  const { results, impacts, hulls, inclinations, verified } = useStore();
  const [fmt, setFmt] = useState<ExportFormat>("csv");
  const [exp, setExp] = useState<Set<number>>(new Set());

  const pass = results.filter((r) => r.status === "pass");
  const anom = results.filter((r) => r.status === "anomaly");
  const uncalc = results.filter((r) => r.status === "uncalculable");
  const fail = results.filter((r) => r.status !== "pass");

  const tog = (i: number) =>
    setExp((p) => {
      const n = new Set(p);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  const doExport = (t: "normal" | "anomaly" | "full") => {
    let c: string, fn: string;
    if (t === "normal") {
      c = exportNormalResults(results, fmt);
      fn = `正常结果.${fmt}`;
    } else if (t === "anomaly") {
      c = exportAnomalyResults(results, fmt);
      fn = `异常结果.${fmt}`;
    } else {
      c = exportFullReport(results, impacts, hulls, inclinations, fmt);
      fn = `完整报告.${fmt}`;
    }
    downloadFile(c, fn);
  };

  if (!verified || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 font-body">
        <p className="text-lg text-gray-500">请先在数据录入页执行批量校验</p>
        <a href="/" className="text-[#00BFA5] underline hover:text-[#00a890]">
          前往数据录入
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 font-body">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display text-slate-900">校验结果</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs">
            <button
              onClick={() => setFmt("csv")}
              className={`px-2.5 py-1 ${fmt === "csv" ? "bg-[#0A2540] text-white" : "bg-white text-gray-600"}`}
            >
              CSV
            </button>
            <button
              onClick={() => setFmt("json")}
              className={`px-2.5 py-1 ${fmt === "json" ? "bg-[#0A2540] text-white" : "bg-white text-gray-600"}`}
            >
              JSON
            </button>
          </div>
          <button
            onClick={() => doExport("normal")}
            className="px-3 py-1.5 text-sm bg-[#00BFA5] text-white rounded-lg hover:bg-[#00a890]"
          >
            导出正常结果
          </button>
          <button
            onClick={() => doExport("anomaly")}
            className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            导出异常原因
          </button>
          <button
            onClick={() => doExport("full")}
            className="px-3 py-1.5 text-sm bg-[#0A2540] text-white rounded-lg hover:bg-[#0d2e50]"
          >
            导出完整报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { l: "总计", v: results.length, vc: "text-slate-900", lc: "text-gray-500" },
          { l: "正常", v: pass.length, vc: "text-[#00BFA5]", lc: "text-[#00BFA5]" },
          { l: "异常", v: anom.length, vc: "text-orange-600", lc: "text-orange-600" },
          { l: "不可计算", v: uncalc.length, vc: "text-red-600", lc: "text-red-600" },
        ].map((c) => (
          <div
            key={c.l}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center"
          >
            <p className={`text-sm ${c.lc}`}>{c.l}</p>
            <p className={`text-3xl font-display ${c.vc}`}>{c.v}</p>
          </div>
        ))}
      </div>

      {pass.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <h2 className="text-lg font-display text-slate-800">正常结果</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 w-8" />
                  <th className="px-3 py-2.5">船体</th>
                  <th className="px-3 py-2.5">GM(m)</th>
                  <th className="px-3 py-2.5">横摇角(°)</th>
                  <th className="px-3 py-2.5">纵摇角(°)</th>
                  <th className="px-3 py-2.5">纵倾角(°)</th>
                  <th className="px-3 py-2.5">船体来源</th>
                  <th className="px-3 py-2.5">倾角来源</th>
                  <th className="px-3 py-2.5">计算时间</th>
                  <th className="px-3 py-2.5">状态</th>
                </tr>
              </thead>
              <tbody>
                {pass.map((r, i) => (
                  <Fragment key={r.id}>
                    <tr
                      className="border-b hover:bg-slate-50/80 cursor-pointer"
                      onClick={() => tog(i)}
                    >
                      <td className="px-4 py-2 text-slate-400">
                        {exp.has(i) ? "▾" : "▸"}
                      </td>
                      <td className="px-3 py-2 font-medium">{r.hullName}</td>
                      <td className="px-3 py-2">{r.gm ?? "—"}</td>
                      <td className="px-3 py-2">{r.rollAngle ?? "—"}</td>
                      <td className="px-3 py-2">{r.pitchAngle ?? "—"}</td>
                      <td className="px-3 py-2">{r.trimAngle ?? "—"}</td>
                      <td className="px-3 py-2">
                        <SrcBadge s={r.hullSource} />
                      </td>
                      <td className="px-3 py-2">
                        <SrcBadge s={r.inclinationSource} />
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {r.calculatedAt}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#00BFA5]/15 text-[#00BFA5]">
                          正常
                        </span>
                      </td>
                    </tr>
                    {exp.has(i) && (
                      <tr className="border-b bg-slate-50/60">
                        <td colSpan={10} className="px-8 py-3 text-xs text-gray-600">
                          <pre className="whitespace-pre-wrap font-mono text-[11px]">
                            {JSON.stringify(
                              hulls.find((h) => h.id === r.hullId) ?? {},
                              null,
                              2
                            )}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fail.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <h2 className="text-lg font-display text-slate-800">异常 / 不可计算</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="px-5 py-2.5">船体</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">异常类型</th>
                  <th className="px-3 py-2.5">严重度</th>
                  <th className="px-3 py-2.5">描述</th>
                  <th className="px-3 py-2.5">相关参数</th>
                  <th className="px-3 py-2.5">阈值 / 实际值</th>
                  <th className="px-3 py-2.5">船体来源</th>
                  <th className="px-3 py-2.5">倾角来源</th>
                </tr>
              </thead>
              <tbody>
                {fail.flatMap((r) => {
                  const badge =
                    r.status === "anomaly" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {statusLabel(r.status)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {statusLabel(r.status)}
                      </span>
                    );
                  const rows = r.anomalies.length > 0 ? r.anomalies : [null];
                  return rows.map((a, j) => (
                    <tr
                      key={`${r.id}-${j}`}
                      className="border-b hover:bg-slate-50/80"
                    >
                      {j === 0 && (
                        <td className="px-5 py-2 font-medium" rowSpan={rows.length}>
                          {r.hullName}
                        </td>
                      )}
                      {j === 0 && (
                        <td className="px-3 py-2" rowSpan={rows.length}>
                          {badge}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        {a ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${ANOM[a.type] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {anomalyTypeLabel(a.type)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${a?.severity === "critical" ? "text-red-600" : "text-orange-600"}`}
                      >
                        {a?.severity === "critical" ? "严重" : "警告"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-xs truncate">
                        {a?.description ?? "无详细异常信息"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">
                        {a?.relatedParam ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {a ? (
                          <>
                            <span className="text-gray-500">{a.threshold}</span>
                            <span className="mx-1 text-gray-400">/</span>
                            <span
                              className={
                                a.severity === "critical"
                                  ? "text-red-600 font-medium"
                                  : "text-orange-600 font-medium"
                              }
                            >
                              {a.actual}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {j === 0 && (
                        <td className="px-3 py-2" rowSpan={rows.length}>
                          <SrcBadge s={r.hullSource} />
                        </td>
                      )}
                      {j === 0 && (
                        <td className="px-3 py-2" rowSpan={rows.length}>
                          <SrcBadge s={r.inclinationSource} />
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
