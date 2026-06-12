import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Timeline } from "@/components/detail/Timeline";
import { SidebarDetail } from "@/components/detail/SidebarDetail";
import { Corridor3D } from "@/components/detail/Corridor3D";
import { WithdrawalLinkView } from "@/components/detail/WithdrawalLinkView";
import { ActionSummary } from "@/components/detail/ActionSummary";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Clock,
  History,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    planDetail,
    currentTimelineNode,
    setCurrentTimelineNode,
    fetchPlanDetail,
    loading,
    clearPlanDetail,
    setShowRejudgeModal,
  } = useStore();

  useEffect(() => {
    if (id) {
      fetchPlanDetail(id);
    }
    return () => clearPlanDetail();
  }, [id, fetchPlanDetail, clearPlanDetail]);

  if (loading.planDetail && !planDetail) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">正在加载方案详情...</p>
        </div>
      </div>
    );
  }

  if (!planDetail) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center card p-10">
          <Layers className="w-12 h-12 mx-auto mb-3 text-muted opacity-40" />
          <h3 className="text-base font-medium text-text mb-1">未找到方案</h3>
          <p className="text-sm text-muted mb-4">该方案可能已被删除</p>
          <Link to="/" className="btn-primary text-sm">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const segmentCount =
    planDetail.timeline
      .map((n) => n.corridorSegmentIndex)
      .filter((i) => i != null)
      .reduce((max, i) => Math.max(max, (i as number) + 1), 6) || 6;

  return (
    <div className="h-full flex flex-col min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 border-b border-border bg-surface/50 backdrop-blur-sm flex-shrink-0"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回方案列表
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-text">
                {planDetail.corridorName}
              </h1>
              <StatusBadge status={planDetail.status} size="md" />
            </div>
            <div className="flex items-center gap-5 text-xs text-muted flex-wrap">
              <span className="flex items-center gap-1.5 font-mono">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {planDetail.corridorCode}
              </span>
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                时间节点 {planDetail.timeline.length} 个
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {segmentCount} 个航段
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                更新于{" "}
                {format(new Date(planDetail.updatedAt), "MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-primary text-sm"
              onClick={() => setShowRejudgeModal(true, planDetail.id)}
            >
              <Edit3 className="w-4 h-4" />
              改判
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-background/60 rounded-lg p-3 border border-border">
            <div className="text-xs text-muted mb-1">传感器来源</div>
            <p className="text-sm text-text">{planDetail.sensorSourceSummary}</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3 border border-border">
            <div className="text-xs text-muted mb-1">结论摘要</div>
            <p className="text-sm text-text">{planDetail.conclusionSummary}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex-1 flex flex-col xl:flex-row min-h-0"
      >
        <div className="w-full xl:w-72 border-b xl:border-b-0 xl:border-r border-border flex-shrink-0 xl:max-h-none overflow-y-auto max-h-[320px] xl:max-h-none">
          <div className="p-4 h-full">
            <Timeline
              nodes={planDetail.timeline}
              currentNode={currentTimelineNode}
              onSelect={setCurrentTimelineNode}
            />
          </div>
        </div>

        <div className="w-full xl:w-96 border-b xl:border-b-0 xl:border-r border-border flex-shrink-0 xl:max-h-none overflow-y-auto max-h-[400px] xl:max-h-none bg-background/30">
          <SidebarDetail
            node={currentTimelineNode}
            planDetail={planDetail}
          />
        </div>

        <div className="flex-1 min-h-[480px] relative bg-[#0F1419]">
          <Corridor3D
            planDetail={planDetail}
            currentNode={currentTimelineNode}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 border-t border-border space-y-5 bg-surface/30"
      >
        <WithdrawalLinkView planDetail={planDetail} />
        <ActionSummary planDetail={planDetail} />
      </motion.div>
    </div>
  );
}
