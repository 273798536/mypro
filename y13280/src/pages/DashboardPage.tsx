import { PageContainer } from "@/components/layout/PageContainer";
import { StatusPieChart } from "@/components/dashboard/StatusPieChart";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { ProgressStack } from "@/components/dashboard/ProgressStack";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import { GitMerge, FileText, AlertCircle, History } from "lucide-react";

export function DashboardPage() {
  const history = useAppStore((s) => s.historyRecords);
  const variants = useAppStore((s) => s.variants);
  const navigate = useNavigate();

  const laoCaoRecords = history.filter((h) => h.operator.includes("老曹"));
  const lateItems = variants.filter((v) => v.isLateAttachment);

  return (
    <PageContainer
      title="总览仪表盘"
      subtitle="先看图表状态分布与异常标记，发现异常点点击跳转追明细"
      headerActions={
        <>
          <button
            onClick={() => navigate("/merge")}
            className="btn-primary"
          >
            <GitMerge className="w-4 h-4" />
            进入归并工作台
          </button>
          <button onClick={() => navigate("/export")} className="btn-outline">
            <FileText className="w-4 h-4" />
            导出彩排结果
          </button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-4">
          <StatusPieChart />
        </div>
        <div className="col-span-5">
          <HeatmapGrid />
        </div>
        <div className="col-span-3">
          <ProgressStack />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 card-base p-5 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning-500" />
                重点关注事项
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                彩排进场前优先处理的异常项，处理后自动移除
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 p-3 rounded-civic bg-risk-50 border border-risk-200">
              <div className="w-8 h-8 rounded-civic bg-risk-500 text-white flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-900 text-sm">
                  红领巾公园西北两组点位疑似合错
                  <span className="ml-2 text-xs font-mono text-risk-600">
                    G007 ↔ G008
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  距离仅45米低于阈值，变体名称"西北步道/西北入口"高度相似。
                  老曹已拆分为两组，下一班重点确认不再误合并。
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate("/merge/G007")}
                    className="link-back"
                  >
                    查看G007材料 →
                  </button>
                  <button
                    onClick={() => navigate("/merge/G008")}
                    className="link-back"
                  >
                    查看G008材料 →
                  </button>
                  <button
                    onClick={() => navigate("/history")}
                    className="link-back"
                  >
                    <History className="w-3 h-3" />
                    老曹拆分操作历史
                  </button>
                </div>
              </div>
            </li>

            {lateItems.map((v, idx) => (
              <li
                key={v.variantId}
                className="flex items-start gap-3 p-3 rounded-civic bg-late-50 border border-late-200"
              >
                <div className="w-8 h-8 rounded-civic bg-late-500 text-white flex items-center justify-center shrink-0 font-bold">
                  {idx + 2}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                    晚到附件：{v.variantText}
                    <span className="text-xs font-mono text-late-600">
                      {v.variantId}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    居委会后补登记的商业活动材料，提交时间晚于同组其他记录2天，
                    证据权重已手动调低，需要人工判断是否仍归属该点位。
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={() => navigate(`/merge/${v.groupId}`)}
                      className="link-back"
                    >
                      跳转点位详情追原始材料 →
                    </button>
                  </div>
                </div>
              </li>
            ))}

            <li className="flex items-start gap-3 p-3 rounded-civic bg-warning-50 border border-warning-200">
              <div className="w-8 h-8 rounded-civic bg-warning-500 text-white flex items-center justify-center shrink-0 font-bold">
                {lateItems.length + 2}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-neutral-900 text-sm">
                  存疑点位 2 组待实地复核
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  紫竹院东门(G005)、月坛亭区(G011)反馈材料不足，
                  老曹备注等勘察数据，彩排版本在导出中请保留存疑标记。
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div className="col-span-5 card-base p-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-civic-600" />
                老曹最近判断
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                市政设计老曹的人工判断记录，下一班别让他再解释
              </p>
            </div>
            <button onClick={() => navigate("/history")} className="link-back">
              查看全部历史 →
            </button>
          </div>
          <ul className="space-y-3">
            {laoCaoRecords.map((r, i) => (
              <li
                key={r.recordId}
                className="flex items-start gap-3 p-3 rounded-civic border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                style={{ animation: `fade-up 0.3s ${i * 60}ms both` }}
              >
                <div className="w-9 h-9 rounded-full bg-civic-600 text-white flex items-center justify-center shrink-0 font-serif font-bold text-sm ring-2 ring-civic-200">
                  曹
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-neutral-900">
                      {r.action === "doubt"
                        ? "标记存疑"
                        : r.action === "split"
                        ? "拆分点位"
                        : r.action === "confirm"
                        ? "确认归并"
                        : "操作"}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      {r.groupId}
                    </span>
                    <button
                      onClick={() => navigate(`/merge/${r.groupId}`)}
                      className="link-back ml-auto"
                    >
                      点位详情
                    </button>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {r.remark}
                  </p>
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    {r.operateTime.replace("T", " ")} · {r.sessionId}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
