import { Check, X } from "lucide-react";
import type { NoticeItem, Location, Judgement, MaterialType } from "../shared/types";

const STATUS_LABELS: Record<NoticeItem["status"], string> = {
  pending_review: "待审核",
  need_supplement: "待补材料",
  pending_manual: "待人工确认",
  approved: "已通过",
  community_verified: "已核社区",
  rejected: "已驳回",
};

const STATUS_COLORS: Record<NoticeItem["status"], string> = {
  pending_review: "bg-amber-500",
  need_supplement: "bg-red-500",
  pending_manual: "bg-purple-500",
  approved: "bg-emerald-500",
  community_verified: "bg-cyan-500",
  rejected: "bg-slate-500",
};

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  photo: "现场照片",
  boundary: "边界范围",
  verbal_note: "口头笔录",
};

const SUGGESTION_STYLES: Record<
  Judgement["suggestion"],
  { label: string; className: string }
> = {
  approve: {
    label: "建议放行",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-sm font-medium",
  },
  need_supplement: {
    label: "建议补材料",
    className:
      "bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded text-sm font-medium",
  },
  pending_manual: {
    label: "需人工确认",
    className:
      "bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded text-sm font-medium",
  },
  reject: {
    label: "建议驳回",
    className:
      "bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded text-sm font-medium",
  },
};

interface ItemCardProps {
  item: NoticeItem;
  location: Location | undefined;
  judgement?: Judgement;
  materialTypes?: MaterialType[];
}

export default function ItemCard({ item, location, judgement, materialTypes }: ItemCardProps) {
  const hasMaterial = (type: MaterialType) => materialTypes?.includes(type) ?? false;

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-night-500 text-white p-3 flex items-center justify-between">
        <span className="font-serif-display text-base font-medium truncate pr-2">
          {location?.canonicalName || "未知点位"}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status]}`} />
          <span className="text-xs opacity-90">{STATUS_LABELS[item.status]}</span>
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">材料完整度</div>
          <div className="grid grid-cols-3 gap-2">
            {(["photo", "boundary", "verbal_note"] as MaterialType[]).map((type) => {
              const has = hasMaterial(type);
              return (
                <div
                  key={type}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${
                    has ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {has ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {has ? MATERIAL_TYPE_LABELS[type] : `缺${MATERIAL_TYPE_LABELS[type]}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {item.currentRemark && (
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">备注预览</div>
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
              {item.currentRemark}
            </p>
          </div>
        )}

        {judgement && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">系统建议</div>
              <span className={SUGGESTION_STYLES[judgement.suggestion].className}>
                {SUGGESTION_STYLES[judgement.suggestion].label}
              </span>
            </div>

            {judgement.nextActions?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">下一步行动</div>
                <ul className="space-y-1">
                  {judgement.nextActions.map((action, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="text-market-500 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
