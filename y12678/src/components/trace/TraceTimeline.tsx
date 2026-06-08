import { useState } from "react";
import {
  FileText,
  Table,
  GitBranch,
  ImageIcon,
  Eye,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CollisionResult, MeasurementRecord, SupplementRecord } from "@/types";
import { cn } from "@/lib/utils";
import CoordBadge from "@/components/record/CoordBadge";

interface Props {
  collision: CollisionResult | null;
  records: MeasurementRecord[];
  supplementsMap: Record<string, SupplementRecord[]>;
}

type NodeType = "conclusion" | "detection" | "record" | "supplement" | "source";

interface TimelineNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  details?: React.ReactNode;
  children?: TimelineNode[];
}

export default function TraceTimeline({ collision, records, supplementsMap }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!collision) {
    return (
      <div className="eng-card flex flex-col items-center justify-center py-24">
        <GitBranch className="mb-3 h-12 w-12 text-ocean-200" />
        <p className="font-song text-ocean-500">请选择一条碰撞结论开始溯源</p>
        <p className="mt-1 text-xs text-gray-400">或在上方输入记录ID进行坐标系混用倒查</p>
      </div>
    );
  }

  const buildNodes = (): TimelineNode[] => {
    const recordNodes: TimelineNode[] = records.map((r) => {
      const sups = supplementsMap[r.id] || [];
      const supNodes: TimelineNode[] = sups.map((s, idx) => ({
        id: `sup-${s.id}`,
        type: "supplement" as NodeType,
        title: `补录记录 #${sups.length - idx}`,
        subtitle: `${s.operator} · ${s.operatedAt}`,
        details: (
          <div className="space-y-1 text-xs text-gray-600">
            <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
              原因：{s.reason}
            </p>
            {Object.entries(s.diffFields).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className="w-14 text-gray-500">{k}</span>
                <span className="font-mono-num text-coral-600 line-through">{String(v.old ?? "空")}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className="font-mono-num text-seaweed-600 font-semibold">{String(v.new)}</span>
              </div>
            ))}
          </div>
        ),
      }));

      return {
        id: `rec-${r.id}`,
        type: "record" as NodeType,
        title: `测量记录 · 网箱 ${r.cageId}`,
        subtitle: `原始行号 ${r.originalRowNumber} · ${r.createdBy} · ${r.createdAt}`,
        details: (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <CoordBadge system={r.coordinateSystem} />
              <span className="font-mono-num text-gray-700">X:{r.x} Y:{r.y}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <ImageIcon className="h-3 w-3" />
              <span className="font-mono-num">{r.imageName}</span>
            </div>
            <p className="rounded bg-ocean-50 px-2 py-1 text-ocean-700">{r.sourceNote}</p>
            <button
              onClick={() => navigate("/records")}
              className="inline-flex items-center gap-1 text-ocean-600 hover:text-ocean-800"
            >
              <Eye className="h-3 w-3" />
              查看完整记录
            </button>
          </div>
        ),
        children: supNodes.length > 0 ? supNodes : undefined,
      };
    });

    return [
      {
        id: "root",
        type: "conclusion",
        title: "最终结论",
        subtitle: collision.detectedAt,
        details: (
          <div className="space-y-2">
            <p className="rounded bg-lavender-50 px-3 py-2 text-xs text-lavender-800 leading-relaxed">
              {collision.conclusion}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-song font-semibold text-ocean-700">涉及网箱</span>
              <span className="font-mono-num font-semibold text-ocean-800">{collision.cageA}</span>
              <ArrowRight className="h-3 w-3 text-coral-400" />
              <span className="font-mono-num font-semibold text-ocean-800">{collision.cageB}</span>
              <span className="ml-2 font-mono-num text-coral-600 font-semibold">{collision.distance}m</span>
            </div>
          </div>
        ),
        children: [
          {
            id: "detect",
            type: "detection",
            title: "碰撞检测处理",
            subtitle: "自动检测 + 人工复核",
            details: (
              <div className="space-y-1 text-xs text-gray-600">
                <p className="font-song font-semibold text-ocean-700">判定依据：</p>
                <p className="leading-relaxed">{collision.basis}</p>
              </div>
            ),
            children: recordNodes,
          },
        ],
      },
    ];
  };

  const iconMap: Record<NodeType, { icon: any; cls: string }> = {
    conclusion: { icon: FileText, cls: "bg-lavender-500 text-white" },
    detection: { icon: GitBranch, cls: "bg-ocean-500 text-white" },
    record: { icon: Table, cls: "bg-seaweed-500 text-white" },
    supplement: { icon: FileText, cls: "bg-lavender-400 text-white" },
    source: { icon: ImageIcon, cls: "bg-amber-500 text-white" },
  };

  const renderNode = (node: TimelineNode, depth = 0) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const cfg = iconMap[node.type];
    const Icon = cfg.icon;

    return (
      <div key={node.id} className="relative">
        <div
          className={cn(
            "relative flex gap-3 pb-6",
            depth > 0 && "ml-6 border-l-2 border-ocean-100 pl-6"
          )}
        >
          <div className="flex flex-col items-center">
            <button
              onClick={() => hasChildren && toggle(node.id)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-md transition-transform",
                cfg.cls,
                hasChildren && "cursor-pointer hover:scale-110"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
            {hasChildren && (
              <div className="mt-1">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-ocean-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-ocean-400" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <button
              onClick={() => hasChildren && toggle(node.id)}
              className="w-full text-left"
            >
              <h5 className="font-song text-sm font-semibold text-ocean-800">{node.title}</h5>
              {node.subtitle && (
                <p className="text-[11px] text-gray-400 font-mono-num">{node.subtitle}</p>
              )}
            </button>
            {isExpanded && node.details && (
              <div className="mt-2 rounded border border-ocean-100 bg-ocean-50/40 p-3 animate-fade-in-up">
                {node.details}
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children!.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="eng-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-song text-base font-semibold text-ocean-800">溯源链路</h4>
        <button
          onClick={() => setExpanded(new Set(["root", "detect", ...records.map((r) => `rec-${r.id}`)]))}
          className="text-xs text-ocean-600 hover:text-ocean-800"
        >
          展开全部
        </button>
      </div>
      <div>{buildNodes().map((n) => renderNode(n))}</div>
    </div>
  );
}
