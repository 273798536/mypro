import {
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  AlertCircle,
  CameraOff,
  TrendingUp,
  MapPinOff,
  FileX2,
  StickyNote,
  CheckCircle2,
  XCircle,
  Clock,
  Loader,
} from "lucide-react";
import type { RiskLevel, AnomalyType, NoteConclusion } from "@/types";
import { RISK_LABELS, ANOMALY_LABELS } from "@/types";

export const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const styles: Record<RiskLevel, string> = {
    low: "tag-safe",
    medium: "tag-warning",
    high: "tag-danger",
    critical: "tag-critical",
  };
  const icons: Record<RiskLevel, React.ReactNode> = {
    low: <ShieldCheck className="w-3 h-3 mr-1" />,
    medium: <AlertCircle className="w-3 h-3 mr-1" />,
    high: <AlertTriangle className="w-3 h-3 mr-1" />,
    critical: <AlertOctagon className="w-3 h-3 mr-1" />,
  };
  return (
    <span className={`tag ${styles[level]} font-mono`}>
      {icons[level]}
      {RISK_LABELS[level]}
    </span>
  );
};

export const AnomalyBadge = ({ type }: { type: AnomalyType }) => {
  const icons: Record<AnomalyType, React.ReactNode> = {
    camera_view_lost: <CameraOff className="w-3 h-3 mr-1" />,
    height_deviation: <TrendingUp className="w-3 h-3 mr-1" />,
    coordinate_missing: <MapPinOff className="w-3 h-3 mr-1" />,
    risk_note_conflict: <StickyNote className="w-3 h-3 mr-1" />,
    profile_incomplete: <FileX2 className="w-3 h-3 mr-1" />,
  };
  return (
    <span className="tag tag-danger font-mono">
      {icons[type]}
      {ANOMALY_LABELS[type]}
    </span>
  );
};

export const ConclusionBadge = ({ conclusion }: { conclusion: NoteConclusion }) => {
  const config: Record<NoteConclusion, { cls: string; icon: React.ReactNode; label: string }> = {
    safe: { cls: "tag-safe", icon: <ShieldCheck className="w-3 h-3 mr-1" />, label: "安全" },
    warning: { cls: "tag-warning", icon: <AlertCircle className="w-3 h-3 mr-1" />, label: "告警" },
    dangerous: { cls: "tag-critical", icon: <AlertOctagon className="w-3 h-3 mr-1" />, label: "危险" },
    pending: { cls: "tag-pending", icon: <Clock className="w-3 h-3 mr-1" />, label: "待评估" },
  };
  const c = config[conclusion];
  return (
    <span className={`tag ${c.cls} font-mono`}>
      {c.icon}
      结论：{c.label}
    </span>
  );
};

export const StepStatusBadge = ({
  status,
  okLabel = "已完成",
  notLabel = "未开始",
  runLabel = "进行中",
  failLabel = "失败",
}: {
  status: string;
  okLabel?: string;
  notLabel?: string;
  runLabel?: string;
  failLabel?: string;
}) => {
  if (status === "passed" || status === "completed" || status === "confirmed") {
    return (
      <span className="tag tag-safe">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {okLabel}
      </span>
    );
  }
  if (status === "failed" || status === "rejected") {
    return (
      <span className="tag tag-critical">
        <XCircle className="w-3 h-3 mr-1" />
        {failLabel}
      </span>
    );
  }
  if (status === "running" || status === "in_progress") {
    return (
      <span className="tag tag-warning">
        <Loader className="w-3 h-3 mr-1 animate-spin" />
        {runLabel}
      </span>
    );
  }
  if (status === "not_needed") {
    return (
      <span className="tag tag-pending">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        无需执行
      </span>
    );
  }
  return (
    <span className="tag tag-pending">
      <Clock className="w-3 h-3 mr-1" />
      {notLabel}
    </span>
  );
};

export const StatusBar = ({ level }: { level: RiskLevel | "default" }) => {
  const colors: Record<string, string> = {
    low: "bg-status-safe",
    medium: "bg-status-warning",
    high: "bg-status-danger",
    critical: "bg-status-critical",
    default: "bg-industrial-border",
  };
  return <div className={`w-1 h-full self-stretch ${colors[level]}`} />;
};
