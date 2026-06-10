import { useState, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { PenLine, CalendarDays, FileJson, Hash, Layers, Activity } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import { formatDate } from "@/utils/boundaryCheck";
import ExportToolbar from "@/components/report/ExportToolbar";
import ReportHeader from "@/components/report/ReportHeader";
import BlockReasonCard from "@/components/report/BlockReasonCard";
import MetricComparison from "@/components/report/MetricComparison";
import SuggestionList from "@/components/report/SuggestionList";
import { cn } from "@/lib/utils";

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const samples = useSampleStore((s) => s.samples);
  const sample = useMemo(() => (id ? samples.find((x) => x.id === id) : undefined), [samples, id]);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [exportTime] = useState(new Date());

  if (!sample) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-card p-8 max-w-md w-full text-center border border-primary-200">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">样本未找到</h2>
          <p className="text-sm text-primary-600 mb-6">
            报告ID <code className="bg-primary-100 px-2 py-0.5 rounded font-mono text-xs">{id}</code> 不存在或已被移除。
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-2.5 rounded-lg bg-primary-700 text-white font-medium hover:bg-primary-800 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-100/60">
      <ExportToolbar
        sample={sample}
        includeRawData={includeRawData}
        onToggleRawData={setIncludeRawData}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:px-0 print:py-0 print:max-w-none">
        <div
          id="report-content"
          className={cn(
            "bg-white shadow-2xl shadow-primary-900/10 rounded-2xl overflow-hidden",
            "print:shadow-none print:rounded-none print:overflow-visible"
          )}
        >
          <ReportHeader sample={sample} />

          <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-8 print:px-12 print:py-10 print:space-y-6">
            <BlockReasonCard sample={sample} />
            <MetricComparison metrics={sample.metrics} />
            <SuggestionList sample={sample} />

            {includeRawData && (
              <RawDataSection sample={sample} />
            )}

            <div className="pt-6 border-t-2 border-dashed border-primary-200 print:pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 print:text-xs">
                    <PenLine className="w-4 h-4 text-primary-500" />
                    管理员签字确认
                  </div>
                  <div className="border-b-2 border-primary-300 h-16 flex items-end pb-1 print:h-20">
                    <span className="text-primary-400 text-sm print:text-xs italic">
                      （此处签字 / 盖章）
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary-500 print:text-[10px]">
                    <span>姓名：______________</span>
                    <span>日期：______________</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 print:text-xs">
                    <PenLine className="w-4 h-4 text-primary-500" />
                    学生签字确认
                  </div>
                  <div className="border-b-2 border-primary-300 h-16 flex items-end pb-1 print:h-20">
                    <span className="text-primary-400 text-sm print:text-xs italic">
                      （本人已阅读并理解上述判定）
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-primary-500 print:text-[10px]">
                    <span>姓名：{sample.operator}</span>
                    <span>日期：______________</span>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50/80 rounded-xl p-4 sm:p-5 border border-primary-200 print:bg-white print:border-2 print:rounded-lg print:p-4">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-primary-600 print:text-[10px]">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary-500 print:w-3.5 print:h-3.5" />
                    <span className="font-medium">报告导出时间：</span>
                    <span className="font-mono text-primary-800">
                      {exportTime.toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary-500 print:w-3.5 print:h-3.5" />
                    <span className="font-medium">报告编号：</span>
                    <span className="font-mono text-primary-800">{sample.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary-500 print:w-3.5 print:h-3.5" />
                    <span className="font-medium">系统版本：</span>
                    <span className="font-mono text-primary-800">v1.0.0</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-primary-200/70 text-[11px] text-primary-500 leading-relaxed print:text-[9px]">
                  <span className="font-semibold text-primary-700">声明：</span>
                  本报告由引物设计边界检查系统自动生成，结合管理员复核意见。判定阈值基于实验室累计10,000+样本数据训练。如有异议，请于3个工作日内提交复核申请，逾期视为认可本报告结论。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-primary-500 print:hidden">
          提示：点击右上角"导出PDF"或"打印"可生成纸质版 / 电子版报告
        </div>
      </div>
    </div>
  );
}

function RawDataSection({ sample }: { sample: import("@/types").PrimerSample }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-primary-300 overflow-hidden print:border-2 print:rounded-lg">
      <div className="bg-primary-100/70 px-5 py-3 border-b border-primary-200 flex items-center gap-2 print:px-4 print:py-2.5">
        <FileJson className="w-5 h-5 text-primary-700 print:w-4 print:h-4" />
        <h3 className="text-base font-bold text-primary-900 print:text-sm">
          附：原始数据明细（可选导出）
        </h3>
      </div>

      <div className="p-5 space-y-5 print:p-4">
        <div>
          <h4 className="text-sm font-semibold text-primary-800 mb-2 pb-1 border-b border-primary-100 print:text-xs">
            质量指标原始数值表
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse print:text-[10px]">
              <thead>
                <tr className="bg-primary-50">
                  <th className="border border-primary-200 px-3 py-2 text-left font-semibold text-primary-700">指标</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">缩写</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">实测值</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">正常下限</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">正常上限</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">单位</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">偏差%</th>
                  <th className="border border-primary-200 px-3 py-2 text-center font-semibold text-primary-700">状态</th>
                </tr>
              </thead>
              <tbody>
                {sample.metrics.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-primary-50/30"}>
                    <td className="border border-primary-200 px-3 py-2 text-primary-800 font-medium">{m.name}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center font-mono text-primary-600">{m.shortName}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center font-mono font-bold text-primary-900">{m.value}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center font-mono text-primary-600">{m.thresholdMin}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center font-mono text-primary-600">{m.thresholdMax}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center text-primary-600">{m.unit}</td>
                    <td className="border border-primary-200 px-3 py-2 text-center font-mono font-semibold text-primary-800">{m.deviationPercent}%</td>
                    <td className={cn(
                      "border border-primary-200 px-3 py-2 text-center font-semibold",
                      m.isOutOfRange ? "text-red-600 bg-red-50" : m.isBoundary ? "text-amber-600 bg-amber-50" : "text-teal-600 bg-teal-50"
                    )}>
                      {m.isOutOfRange ? "越界" : m.isBoundary ? "临界" : "正常"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-primary-800 mb-2 pb-1 border-b border-primary-100 print:text-xs">
            样本履历追踪
          </h4>
          <div className="space-y-2">
            {sample.lineage.map((node) => (
              <div key={node.id} className="flex gap-3 p-3 bg-primary-50/50 rounded-lg border border-primary-200 print:p-2.5">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                  <div className="flex-1 w-px bg-primary-300 my-1 last:hidden" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm text-primary-900 print:text-xs">{node.stage}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-200 text-primary-700 font-mono print:text-[9px]">
                      {node.id}
                    </span>
                  </div>
                  <div className="text-xs text-primary-700 leading-relaxed print:text-[10px]">{node.note}</div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-primary-500 print:text-[9px]">
                    <span>操作人：<span className="font-medium">{node.operator}</span></span>
                    <span>时间：<span className="font-mono">{formatDate(node.timestamp)}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {sample.reviews.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-primary-800 mb-2 pb-1 border-b border-primary-100 print:text-xs">
              管理员复核记录
            </h4>
            <div className="space-y-2">
              {sample.reviews.map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 print:p-2.5">
                  <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-primary-900 print:text-xs">{r.author}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 print:text-[9px]">
                        {r.role}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-primary-500 print:text-[9px]">
                      {formatDate(r.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-primary-700 leading-relaxed print:text-[10px]">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-primary-800 mb-2 pb-1 border-b border-primary-100 print:text-xs">
            PCA批次效应数据
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200 text-center print:p-2.5">
              <div className="text-[10px] text-primary-500 mb-0.5 print:text-[9px]">样本ID</div>
              <div className="font-mono text-sm font-bold text-primary-800 print:text-xs">{sample.batchEffect.sampleId}</div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200 text-center print:p-2.5">
              <div className="text-[10px] text-primary-500 mb-0.5 print:text-[9px]">PC1坐标</div>
              <div className="font-mono text-sm font-bold text-primary-800 print:text-xs">{sample.batchEffect.pc1.toFixed(3)}</div>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200 text-center print:p-2.5">
              <div className="text-[10px] text-primary-500 mb-0.5 print:text-[9px]">PC2坐标</div>
              <div className="font-mono text-sm font-bold text-primary-800 print:text-xs">{sample.batchEffect.pc2.toFixed(3)}</div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center print:p-2.5",
              sample.batchEffect.isOutlier
                ? "bg-red-50 border-red-200"
                : "bg-teal-50 border-teal-200"
            )}>
              <div className="text-[10px] text-primary-500 mb-0.5 print:text-[9px]">离群判定</div>
              <div className={cn(
                "font-mono text-sm font-bold print:text-xs",
                sample.batchEffect.isOutlier ? "text-red-700" : "text-teal-700"
              )}>
                {sample.batchEffect.isOutlier ? "离群" : "正常"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
