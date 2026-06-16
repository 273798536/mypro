import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { EvidenceTimeline } from "@/components/detail/EvidenceTimeline";
import { FeedbackCards } from "@/components/detail/FeedbackCards";
import { VariantCompareCard } from "@/components/merge/VariantCompareCard";
import { RiskAlertBar } from "@/components/merge/RiskAlertBar";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge, RiskLevelBadge, LateBadge } from "@/components/ui/Badges";
import {
  ArrowLeft,
  GitMerge,
  FileDown,
  History,
  Gauge,
  MapPin,
  Compass,
  Calendar,
  Bookmark,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { ACTION_LABEL } from "@/types";

export function MergeDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const groups = useAppStore((s) => s.groups);
  const allVariants = useAppStore((s) => s.variants);
  const allHistory = useAppStore((s) => s.historyRecords);
  const allRisks = useAppStore((s) => s.adjacentRisks);

  const group = useMemo(
    () => groups.find((g) => g.groupId === groupId),
    [groups, groupId]
  );
  const variants = useMemo(
    () => allVariants.filter((v) => v.groupId === groupId),
    [allVariants, groupId]
  );
  const history = useMemo(
    () => allHistory.filter((h) => h.groupId === groupId),
    [allHistory, groupId]
  );
  const risks = useMemo(
    () =>
      allRisks.find(
        (r) => r.groupA === groupId || r.groupB === groupId
      ),
    [allRisks, groupId]
  );

  const [highlightFb, setHighlightFb] = useState<string | null>(null);
  const [highlightV, setHighlightV] = useState<string | null>(null);

  if (!group) {
    return (
      <PageContainer title="点位不存在" subtitle="请返回工作台重新选择">
        <button onClick={() => navigate("/merge")} className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          返回归并工作台
        </button>
      </PageContainer>
    );
  }

  const hasLate = variants.some((v) => v.isLateAttachment);
  const laoCaoEdited = history.some((h) => h.operator.includes("老曹"));
  const latestHistory = history[0];

  return (
    <PageContainer
      title={`材料溯源详情 · ${group.canonicalName}`}
      subtitle="证据链一路点回原始材料，晚到附件红色标记，相邻合错紫色提示"
      headerActions={
        <>
          <button
            onClick={() => navigate("/merge")}
            className="btn-outline"
          >
            <ArrowLeft className="w-4 h-4" />
            工作台
          </button>
          <button onClick={() => navigate("/history")} className="btn-outline">
            <History className="w-4 h-4" />
            历史面板
          </button>
          <button onClick={() => navigate("/export")} className="btn-primary">
            <FileDown className="w-4 h-4" />
            导出此组
          </button>
        </>
      }
    >
      {risks && <RiskAlertBar />}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-4 space-y-5">
          <div className="card-base p-5 animate-fade-up">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-neutral-400 mb-1">
                  归并组编号 {group.groupId}
                </div>
                <h3 className="font-serif text-xl font-bold text-neutral-900 flex items-center gap-2 flex-wrap">
                  <MapPin className="w-5 h-5 text-civic-600" />
                  {group.canonicalName}
                </h3>
              </div>
              <StatusBadge status={group.status} />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <InfoRow icon={Compass} label="地理坐标">
                <span className="font-mono">
                  ({group.latitude.toFixed(6)}, {group.longitude.toFixed(6)})
                </span>
              </InfoRow>
              <InfoRow icon={Gauge} label="算法置信度">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden max-w-[140px]">
                    <div
                      className="h-full bg-civic-500"
                      style={{ width: `${group.confidence * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-civic-700">
                    {Math.round(group.confidence * 100)}%
                  </span>
                </div>
              </InfoRow>
              <InfoRow icon={Bookmark} label="变体写法">
                <span className="font-mono font-semibold">{group.variantCount} 种</span>
              </InfoRow>
              <InfoRow icon={GitMerge} label="证据链">
                <span className="font-mono font-semibold">{group.evidenceCount} 条</span>
              </InfoRow>
              <InfoRow icon={AlertTriangle} label="风险等级">
                <RiskLevelBadge level={group.riskLevel} />
              </InfoRow>
              <InfoRow icon={Calendar} label="更新时间">
                <span className="font-mono text-neutral-600">
                  {group.updatedAt.replace("T", " ")}
                </span>
              </InfoRow>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
              {hasLate && (
                <div className="flex items-center gap-2 p-2 rounded-civic bg-late-50 border border-late-200 text-xs">
                  <LateBadge />
                  <span className="text-late-700">此组含晚到附件，证据待补充核实</span>
                </div>
              )}
              {laoCaoEdited && latestHistory && (
                <div className="flex items-center gap-2 p-2 rounded-civic bg-warning-50 border border-warning-200 text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-warning-600 shrink-0" />
                  <div>
                    <span className="font-medium text-warning-700">老曹已做判断</span>
                    <span className="text-warning-600 mx-1">—</span>
                    <span className="text-warning-700">
                      {ACTION_LABEL[latestHistory.action]}
                    </span>
                    <button
                      onClick={() => navigate("/history")}
                      className="link-back ml-2"
                    >
                      查看理由
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <VariantCompareCard group={group} />
        </div>

        <div className="col-span-8 space-y-5">
          <EvidenceTimeline
            onScrollToFeedback={(id) => setHighlightFb(id)}
            onScrollToVariant={(id) => {
              setHighlightV(id);
              const el = document.getElementById(`v-${id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => setHighlightV(null), 2000);
            }}
          />
          <FeedbackCards
            highlightFeedbackId={highlightFb}
            onClearHighlight={() => setHighlightFb(null)}
          />
        </div>
      </div>
    </PageContainer>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
      <span className="text-neutral-500 w-20 shrink-0">{label}</span>
      {children}
    </div>
  );
}
