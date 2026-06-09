import { AlertTriangle, Check, Crosshair, Info, MapPin } from "lucide-react";
import { useState } from "react";
import { useLatticeStore } from "@/store/useLatticeStore";
import type { BatchRecord } from "@/types";

function CollisionCard({
  collision,
  selected,
  onSelect,
  onFocus,
}: {
  collision: BatchRecord["collisions"][number];
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
}) {
  const approveCollision = useLatticeStore((s) => s.approveCollision);
  const [approver, setApprover] = useState("复核工程师");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div
      className={
        "panel mb-2 animate-slide-up " +
        (selected ? "ring-1 ring-warn shadow-warn" : "")
      }
    >
      <button
        type="button"
        onClick={() => {
          onSelect();
          onFocus();
        }}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <div
          className={
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border " +
            (collision.approved
              ? "border-pass/60 bg-pass/10 text-pass"
              : "border-warn/60 bg-warn/10 text-warn animate-blink-warn")
          }
        >
          {collision.approved ? <Check size={14} /> : <AlertTriangle size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-ink-50">{collision.collisionId}</span>
            <span className="chip border-ink-400/40 text-ink-200">
              {collision.atomPair[0]}–{collision.atomPair[1]}
            </span>
            <span className="chip border-warn/50 text-warn">{collision.volume.toFixed(2)}Å³</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-ink-200/80">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              ({collision.position.x}, {collision.position.y}, {collision.position.z})
            </span>
            <span>设备 {collision.deviceIds.join(", ")}</span>
          </div>
          <p className="mt-1.5 border-l-2 border-lattice/40 pl-2 text-[11px] leading-relaxed text-ink-100/90">
            <Info size={11} className="mr-1 inline -translate-y-0.5 text-lattice" />
            {collision.explanation}
          </p>
          {collision.approved && (
            <div className="mt-1.5 text-[10px] font-mono text-pass">
              ✓ {collision.approver} · {new Date(collision.approvedAt ?? 0).toLocaleString("zh-CN")} ·{" "}
              {collision.approveReason}
            </div>
          )}
        </div>
      </button>

      {!collision.approved && (
        <div className="border-t border-ink-500/25 px-3 pb-3">
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="text-[11px] font-mono text-lattice hover:underline"
          >
            {open ? "收起复核面板" : "复核通过此碰撞"}
          </button>
          {open && (
            <div className="mt-2 space-y-2 animate-slide-up">
              <div>
                <label className="label">复核人</label>
                <input
                  className="num-input mt-1"
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                />
              </div>
              <div>
                <label className="label">通过原因（必填）</label>
                <textarea
                  className="num-input min-h-[60px] resize-y"
                  value={reason}
                  placeholder="例如：离子间短程作用在容差内，不影响晶格稳定性。"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={!reason.trim() || !approver.trim()}
                onClick={() =>
                  approveCollision(collision.collisionId, approver.trim(), reason.trim())
                }
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                确认通过 · 记入审计日志
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollisionPanel({ batch }: { batch: BatchRecord }) {
  const selectedId = useLatticeStore((s) => s.selectedCollisionId);
  const selectCollision = useLatticeStore((s) => s.selectCollision);
  const focusPosition = useLatticeStore((s) => s.focusPosition);

  const approvedCount = batch.collisions.filter((c) => c.approved).length;

  return (
    <aside className="panel flex h-full w-96 shrink-0 flex-col overflow-hidden animate-fade-in">
      <div className="panel-header">
        <div>
          <div className="section-title text-base flex items-center gap-2">
            <Crosshair size={16} className="text-warn" />
            碰撞检测 · 复核说明
          </div>
          <div className="label mt-0.5">与参数面板共用同批次记录</div>
        </div>
        <div className="flex gap-1">
          <span className="chip border-warn/50 text-warn">
            {batch.collisions.length} 处异常
          </span>
          <span className="chip border-pass/50 text-pass">{approvedCount} 已通过</span>
        </div>
      </div>

      <div className="flex-1 space-y-0 overflow-y-auto p-3">
        {batch.collisions.length === 0 ? (
          <div className="panel p-6 text-center">
            <Check size={28} className="mx-auto text-pass" />
            <p className="mt-2 font-mono text-sm text-ink-100">
              本轮未检测到碰撞异常
            </p>
            <p className="mt-1 text-[11px] text-ink-200/70">
              调整堆叠层数或偏移量后，运行碰撞检测可生成结果。
            </p>
          </div>
        ) : (
          batch.collisions.map((c) => (
            <CollisionCard
              key={c.collisionId}
              collision={c}
              selected={selectedId === c.collisionId}
              onSelect={() => selectCollision(c.collisionId)}
              onFocus={() => focusPosition(c.position)}
            />
          ))
        )}
      </div>

      <div className="border-t border-ink-500/25 p-3">
        <div className="label mb-1">本轮复核处理意见</div>
        <textarea
          className="num-input min-h-[64px] resize-y"
          placeholder="可在此处填写给评审会的总处理说明……"
          value={batch.reviewerNote ?? ""}
          onChange={(e) =>
            useLatticeStore.getState().setReviewStatus(batch.reviewStatus, e.target.value)
          }
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => useLatticeStore.getState().setReviewStatus("pending", batch.reviewerNote)}
            className={
              "btn " +
              (batch.reviewStatus === "pending"
                ? "border-ink-200 bg-ink-500/40 text-ink-50"
                : "border-ink-400/60 text-ink-100 hover:bg-ink-500/40")
            }
          >
            待复核
          </button>
          <button
            type="button"
            onClick={() => useLatticeStore.getState().setReviewStatus("approved", batch.reviewerNote)}
            className={
              "btn " +
              (batch.reviewStatus === "approved"
                ? "border-pass bg-pass/20 text-pass"
                : "border-pass/60 text-pass hover:bg-pass/10")
            }
          >
            通过
          </button>
          <button
            type="button"
            onClick={() => useLatticeStore.getState().setReviewStatus("rejected", batch.reviewerNote)}
            className={
              "btn " +
              (batch.reviewStatus === "rejected"
                ? "border-alert bg-alert/20 text-alert"
                : "border-alert/60 text-alert hover:bg-alert/10")
            }
          >
            驳回
          </button>
        </div>
      </div>
    </aside>
  );
}
