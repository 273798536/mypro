import { useSchemeStore } from "@/store/useSchemeStore";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ShieldAlert,
  FileOutput,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";

export default function Handover() {
  const navigate = useNavigate();
  const schemes = useSchemeStore((s) => s.schemes);
  const getSchemeStats = useSchemeStore((s) => s.getSchemeStats);

  const allStats = schemes.map((sc) => ({
    scheme: sc,
    stats: getSchemeStats(sc.id),
  }));

  const totalConfirmedMerges = allStats.reduce(
    (sum, { stats }) => sum + stats.confirmedMerges,
    0
  );
  const totalHandledAnomalies = schemes.reduce(
    (sum, sc) =>
      sum +
      sc.anomalies.filter((a) => a.status === "confirmed" || a.status === "reverted")
        .length,
    0
  );
  const totalPendingAnomalies = allStats.reduce(
    (sum, { stats }) => sum + stats.pendingAnomalies,
    0
  );
  const totalNeedEvidence = allStats.reduce(
    (sum, { stats }) => sum + stats.needEvidence,
    0
  );

  const handled = totalConfirmedMerges + totalHandledAnomalies;

  function getStatusColor(pending: number, evidence: number): string {
    if (pending > 0) return "red";
    if (evidence > 0) return "amber";
    return "green";
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif-title">交接看板</h1>
        <p className="text-sm text-gray-500 mt-1">
          算法值班人接手即知：哪里放材料、哪里看异常、哪里重新导出
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-4">
          <div className="bg-emerald-100 rounded-full p-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{handled}</div>
            <div className="text-sm text-emerald-600">已处理</div>
          </div>
        </div>

        <div className="card bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4">
          <div className="bg-amber-100 rounded-full p-2">
            <FileQuestion className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-700">
              {totalNeedEvidence}
            </div>
            <div className="text-sm text-amber-600">待补证据</div>
          </div>
        </div>

        <div className="card bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
          <div className="bg-red-100 rounded-full p-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-700">
              {totalPendingAnomalies}
            </div>
            <div className="text-sm text-red-600">需人工确认</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/")}
          className="card rounded-lg p-5 text-left border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          style={{ borderLeft: "4px solid #0F4C54" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <ClipboardList className="w-6 h-6 mb-2" style={{ color: "#0F4C54" }} />
              <div className="font-semibold text-gray-800">哪里放材料</div>
              <div className="text-sm text-gray-500 mt-1">
                录入会议纪要、意见表、后补备注
              </div>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: "#E8742C" }} />
          </div>
        </button>

        <button
          onClick={() => navigate("/check")}
          className="card rounded-lg p-5 text-left border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          style={{ borderLeft: "4px solid #0F4C54" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <ShieldAlert className="w-6 h-6 mb-2" style={{ color: "#0F4C54" }} />
              <div className="font-semibold text-gray-800">哪里看异常</div>
              <div className="text-sm text-gray-500 mt-1">
                检查相邻路口合错、人工确认归并
              </div>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: "#E8742C" }} />
          </div>
        </button>

        <button
          onClick={() => navigate("/export")}
          className="card rounded-lg p-5 text-left border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          style={{ borderLeft: "4px solid #0F4C54" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <FileOutput className="w-6 h-6 mb-2" style={{ color: "#0F4C54" }} />
              <div className="font-semibold text-gray-800">哪里重新导出</div>
              <div className="text-sm text-gray-500 mt-1">
                多视角一致性导出比选报告
              </div>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: "#E8742C" }} />
          </div>
        </button>
      </div>

      <div className="card rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-700">方案状态一览</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="text-left px-5 py-2 font-medium">方案名称</th>
              <th className="text-center px-5 py-2 font-medium">材料数</th>
              <th className="text-center px-5 py-2 font-medium">归并数</th>
              <th className="text-center px-5 py-2 font-medium">异常（待确认/已确认/已拆分）</th>
              <th className="text-center px-5 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(({ scheme, stats }) => {
              const pending = scheme.anomalies.filter((a) => a.status === "pending").length;
              const confirmed = scheme.anomalies.filter((a) => a.status === "confirmed").length;
              const reverted = scheme.anomalies.filter((a) => a.status === "reverted").length;
              const statusColor = getStatusColor(stats.pendingAnomalies, stats.needEvidence);
              const dotColor =
                statusColor === "green"
                  ? "bg-green-500"
                  : statusColor === "amber"
                    ? "bg-amber-500"
                    : "bg-red-500";

              return (
                <tr key={scheme.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{scheme.name}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{stats.totalMaterials}</td>
                  <td className="text-center px-5 py-3 text-gray-600">{stats.confirmedMerges}</td>
                  <td className="text-center px-5 py-3 text-gray-600">
                    {pending}/{confirmed}/{reverted}
                  </td>
                  <td className="text-center px-5 py-3">
                    <span className={`inline-block w-3 h-3 rounded-full ${dotColor}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="card rounded-lg p-4 bg-gray-50 border border-gray-200"
        style={{ borderLeft: "4px solid #0F4C54" }}
      >
        <p className="text-sm text-gray-600 leading-relaxed">
          交接须知：接手人应先查看异常卡口中的待确认项，再检查点位归并台是否有遗漏，最后在导出中心生成报告。所有归并操作均留有证据链。
        </p>
      </div>
    </div>
  );
}
