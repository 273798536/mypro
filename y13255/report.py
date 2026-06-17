import html
from typing import Dict, List
from models import MergeSession, MergedPoint, ResidentFeedback, HistoryRecord


class ReviewReport:
    def __init__(self, session: MergeSession):
        self.session = session
        self._fb_map: Dict[str, ResidentFeedback] = {
            fb.feedback_id: fb for fb in session.feedbacks
        }
        self._history_by_point: Dict[str, List[HistoryRecord]] = {}
        for h in session.history:
            self._history_by_point.setdefault(h.point_id, []).append(h)

    def _delivery_guide(self) -> str:
        return """
        <div class="delivery-guide">
          <h2>交付使用说明（给阿宁对照用）</h2>
          <div class="guide-grid">
            <div class="guide-item">
              <h4>① 居民反馈 ↔ 归并点位</h4>
              <p>每个点位卡的「居民反馈与计算证据」区列出了所有被归并进来的原始反馈。<br>
              <strong>核对方法：</strong>看「反馈ID」是否和居民提交表一致；<br>
              看「相似度」值（≥0.72 被自动归并），低的重点复核。</p>
            </div>
            <div class="guide-item">
              <h4>② 同地点不同写法 ↔ 最终结论</h4>
              <p>「同地点不同写法（作为证据留存）」区列出了该点位被收录的全部别名。<br>
              <strong>核对方法：</strong>每个别名标了「来源反馈」，居民说的A写法和B写法<br>
              都在这里，不会因为重命名而丢失原始说法。</p>
            </div>
            <div class="guide-item">
              <h4>③ 异常提示 ↔ 下一步处理</h4>
              <p>出现红色「异常提示」的点位，下方有蓝色「下一步操作」清单。<br>
              <strong>处理方法：</strong>按编号步骤逐条操作，处理完用 ManualOperator<br>
              做拆分/合并/确认，操作记录会自动进「人工处理历史」。</p>
            </div>
            <div class="guide-item">
              <h4>④ 接口返回 ↔ 三方对照</h4>
              <p>HTML 上的 <code>点位ID / 反馈ID</code> 与 JSON 导出文件、后端接口字段完全一致。<br>
              <strong>对接口方法：</strong>render_flat_json 导出的每一行包含 point_id、feedback_id、<br>
              canonical_name、alias_names、peak_type、anomaly_flags，直接对齐后端返回体。</p>
            </div>
          </div>
        </div>
        """

    def _peak_note(self) -> str:
        return (
            "<p><strong>口径说明（早晚高峰为什么不一样）：</strong>"
            "「早高峰」仅统计标注为早高峰/上午/送学的反馈；"
            "「晚高峰」仅统计标注为晚高峰/下午/接学的反馈；"
            "未标注高峰时段的反馈同时计入两边，避免遗漏。"
            "每一条反馈的「高峰类型」tag 可以在下方证据区核对。</p>"
        )

    def _history_summary(self) -> dict:
        total = len(self.session.history)
        by_action: Dict[str, int] = {}
        by_op: Dict[str, int] = {}
        for h in self.session.history:
            by_action[h.action] = by_action.get(h.action, 0) + 1
            by_op[h.operator] = by_op.get(h.operator, 0) + 1
        return {"total": total, "by_action": by_action, "by_op": by_op}

    def _render_point_card(self, point: MergedPoint) -> str:
        aliases_html = ""
        if point.aliases:
            items = []
            for a in point.aliases:
                src = a.source_feedback_id
                note = f"（来源反馈：{src}）" if src else (f"（{a.note}）" if a.note else "")
                items.append(f"<li>{html.escape(a.alias_text)}{note}</li>")
            aliases_html = "<div class='block'><h4>同地点不同写法（作为证据留存）</h4><ul>" + "".join(items) + "</ul></div>"

        ev_items = []
        for ev in point.merge_evidence:
            fb = self._fb_map.get(ev.get("feedback_id", ""))
            if fb:
                raw = html.escape(fb.raw_text or fb.point_description)
                peak = html.escape(fb.peak_type or "未标注")
                src = html.escape(fb.source or "居民反馈")
                sim = ev.get("similarity", "-")
                ev_items.append(
                    f"<li><span class='tag tag-peak'>{peak}</span>"
                    f"<span class='tag tag-sim'>相似度 {sim}</span>"
                    f"<span class='tag tag-src'>{src}</span>"
                    f"<div class='raw'>{raw}</div>"
                    f"<div class='meta'>反馈ID: {html.escape(fb.feedback_id)} / 提交: {html.escape(fb.submitted_at)}</div></li>"
                )
        evidence_html = "<div class='block'><h4>居民反馈与计算证据</h4><ol class='evidence'>" + "".join(ev_items) + "</ol></div>"

        anomaly_html = ""
        if point.anomaly_flags:
            flags = "".join(
                f"<li class='anomaly-flag'>⚠️ {html.escape(f)}</li>" for f in point.anomaly_flags
            )
            anomaly_html = f"<div class='block anomaly'><h4>异常提示</h4><ul>{flags}</ul></div>"

        next_html = ""
        if point.next_steps:
            steps = "".join(f"<li>{html.escape(s)}</li>" for s in point.next_steps)
            next_html = f"<div class='block next-steps'><h4>下一步操作（照着处理即可）</h4><ol>{steps}</ol></div>"

        history_html = ""
        records = self._history_by_point.get(point.point_id, [])
        if records:
            items = []
            for r in sorted(records, key=lambda x: x.timestamp):
                before_name = (r.before or {}).get("canonical_name", "-")
                after_name = (r.after or {}).get("canonical_name", "-")
                items.append(
                    f"<li><span class='tag tag-action'>{html.escape(r.action)}</span>"
                    f"<span class='tag tag-op'>{html.escape(r.operator)}</span>"
                    f"<div>变更：{html.escape(before_name)} → {html.escape(after_name)}</div>"
                    f"<div class='reason'>{html.escape(r.reason)}</div>"
                    f"<div class='meta'>{html.escape(r.timestamp)}</div></li>"
                )
            history_html = "<div class='block history'><h4>人工处理历史（灰度复盘用）</h4><ol>" + "".join(items) + "</ol></div>"

        status = "已人工确认" if point.is_manual_confirmed else "待复核"
        status_cls = "confirmed" if point.is_manual_confirmed else "pending"
        return f"""
        <div class="point-card">
          <div class="point-head">
            <h3>{html.escape(point.school_name)} · {html.escape(point.canonical_name)}</h3>
            <span class="status status-{status_cls}">{status}</span>
          </div>
          <div class="counts">
            <span class="count"><strong>早高峰</strong> {point.peak_morning_count} 条</span>
            <span class="count"><strong>晚高峰</strong> {point.peak_evening_count} 条</span>
            <span class="count"><strong>关联反馈</strong> {len(point.feedback_refs)} 条</span>
          </div>
          {aliases_html}
          {evidence_html}
          {anomaly_html}
          {next_html}
          {history_html}
          <div class="meta point-id">点位ID：{html.escape(point.point_id)}</div>
        </div>
        """

    def render_html(self, output_path: str, title: str = "学校接送点位归并·灰度复核版") -> None:
        cards = "".join(self._render_point_card(p) for p in self.session.merged_points)
        total_morning = sum(p.peak_morning_count for p in self.session.merged_points)
        total_evening = sum(p.peak_evening_count for p in self.session.merged_points)
        total_points = len(self.session.merged_points)
        anomalous = sum(1 for p in self.session.merged_points if p.anomaly_flags)
        confirmed = sum(1 for p in self.session.merged_points if p.is_manual_confirmed)
        hist_summary = self._history_summary()
        hist_total = hist_summary["total"]
        hist_action_html = " / ".join(
            f"{k} {v}次" for k, v in sorted(hist_summary["by_action"].items())
        ) or "暂无"
        hist_op_html = " / ".join(
            f"{k} {v}次" for k, v in sorted(hist_summary["by_op"].items())
        ) or "暂无"

        page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{html.escape(title)}</title>
<style>
  body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
         margin: 0; padding: 24px; background: #f5f6f8; color: #222; }}
  h1 {{ margin: 0 0 8px; font-size: 22px; }}
  h2 {{ margin: 0 0 12px; font-size: 17px; }}
  .subtitle {{ color: #666; margin-bottom: 20px; }}
  .summary {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }}
  .summary .card {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
                    padding: 12px 18px; min-width: 140px; }}
  .summary .num {{ font-size: 24px; font-weight: 600; }}
  .summary .label {{ color: #666; font-size: 13px; }}
  .peak-note {{ background: #fff8e6; border-left: 4px solid #f0b429;
                padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; }}
  .delivery-guide {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
                     padding: 18px 20px; margin-bottom: 20px; }}
  .guide-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }}
  .guide-item {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
                 padding: 12px 14px; }}
  .guide-item h4 {{ margin: 0 0 6px; font-size: 14px; color: #1e40af; }}
  .guide-item p {{ margin: 0; font-size: 13px; color: #374151; line-height: 1.65; }}
  .guide-item code {{ background: #e0e7ff; padding: 1px 5px; border-radius: 3px; font-size: 12px; }}
  .history-summary {{ background: #faf5ff; border-left: 4px solid #7c3aed;
                      padding: 10px 14px; border-radius: 4px; margin-bottom: 20px;
                      font-size: 13px; color: #4c1d95; }}
  .history-summary strong {{ color: #5b21b6; }}
  .point-card {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
                 padding: 18px 20px; margin-bottom: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }}
  .point-head {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }}
  .point-head h3 {{ margin: 0; font-size: 18px; }}
  .status {{ padding: 3px 10px; border-radius: 999px; font-size: 12px; }}
  .status-pending {{ background: #fff1e6; color: #c05621; }}
  .status-confirmed {{ background: #e6fffa; color: #2c7a7b; }}
  .counts {{ display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 10px; color: #444; }}
  .count strong {{ color: #111; }}
  .block {{ margin-top: 12px; }}
  .block h4 {{ margin: 0 0 6px; font-size: 14px; color: #374151; }}
  .block ul, .block ol {{ margin: 0; padding-left: 20px; line-height: 1.7; }}
  .evidence li {{ margin-bottom: 6px; }}
  .raw {{ margin: 4px 0 2px; color: #1f2937; }}
  .meta {{ font-size: 12px; color: #6b7280; }}
  .tag {{ display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 12px;
          margin-right: 6px; }}
  .tag-peak {{ background: #e0e7ff; color: #3730a3; }}
  .tag-sim {{ background: #f3f4f6; color: #374151; }}
  .tag-src {{ background: #d1fae5; color: #065f46; }}
  .tag-action {{ background: #ede9fe; color: #5b21b6; }}
  .tag-op {{ background: #fee2e2; color: #991b1b; }}
  .anomaly {{ background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; }}
  .anomaly-flag {{ color: #991b1b; }}
  .next-steps {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; }}
  .next-steps ol {{ padding-left: 22px; }}
  .next-steps li {{ color: #1e3a8a; }}
  .reason {{ color: #444; }}
  .history ol {{ background: #fafafa; padding: 8px 8px 8px 28px; border-radius: 6px; }}
  .history li {{ margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e5e7eb; }}
  .history li:last-child {{ border-bottom: none; }}
  .point-id {{ margin-top: 10px; }}
  .footer {{ margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center; }}
</style>
</head>
<body>
<h1>{html.escape(title)}</h1>
<div class="subtitle">版本 {html.escape(self.session.version)} · 会话 {html.escape(self.session.session_id)} · 生成于 {html.escape(self.session.created_at)}</div>
<div class="summary">
  <div class="card"><div class="num">{total_points}</div><div class="label">归并点位</div></div>
  <div class="card"><div class="num">{confirmed}</div><div class="label">已人工确认</div></div>
  <div class="card"><div class="num">{anomalous}</div><div class="label">异常待处理</div></div>
  <div class="card"><div class="num">{total_morning}</div><div class="label">早高峰反馈</div></div>
  <div class="card"><div class="num">{total_evening}</div><div class="label">晚高峰反馈</div></div>
  <div class="card"><div class="num">{hist_total}</div><div class="label">人工处理记录</div></div>
</div>
<div class="peak-note">{self._peak_note()}</div>
<div class="history-summary"><strong>灰度复盘：</strong>操作明细：{html.escape(hist_action_html)}；操作人：{html.escape(hist_op_html)}。每条变更记录在对应点位卡的「人工处理历史」区可追溯。</div>
{self._delivery_guide()}
{cards}
<div class="footer">交付对象：社区运营阿宁 · 用途：灰度发布前复核与复盘 · JSON 导出可与接口字段一一对应</div>
</body>
</html>"""
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(page)

    def render_flat_json(self, output_path: str) -> None:
        evidence_rows = []
        for p in self.session.merged_points:
            for ev in p.merge_evidence:
                fb = self._fb_map.get(ev.get("feedback_id", ""))
                evidence_rows.append({
                    "point_id": p.point_id,
                    "school_name": p.school_name,
                    "canonical_name": p.canonical_name,
                    "location_hint": p.location_hint,
                    "alias_names": [a.alias_text for a in p.aliases],
                    "aliases_with_source": [
                        {"alias_text": a.alias_text, "source_feedback_id": a.source_feedback_id, "note": a.note}
                        for a in p.aliases
                    ],
                    "peak_type": fb.peak_type if fb else "",
                    "peak_morning_count": p.peak_morning_count,
                    "peak_evening_count": p.peak_evening_count,
                    "feedback_id": fb.feedback_id if fb else "",
                    "feedback_raw": fb.raw_text if fb else "",
                    "feedback_source": fb.source if fb else "",
                    "feedback_submitted_at": fb.submitted_at if fb else "",
                    "similarity": ev.get("similarity"),
                    "anomaly_flags": p.anomaly_flags,
                    "next_steps": p.next_steps,
                    "is_manual_confirmed": p.is_manual_confirmed,
                    "feedback_refs": p.feedback_refs,
                })
        points_summary = []
        for p in self.session.merged_points:
            points_summary.append({
                "point_id": p.point_id,
                "school_name": p.school_name,
                "canonical_name": p.canonical_name,
                "alias_count": len(p.aliases),
                "feedback_count": len(p.feedback_refs),
                "peak_morning_count": p.peak_morning_count,
                "peak_evening_count": p.peak_evening_count,
                "anomaly_count": len(p.anomaly_flags),
                "anomaly_flags": p.anomaly_flags,
                "next_steps": p.next_steps,
                "is_manual_confirmed": p.is_manual_confirmed,
                "history_records": [
                    {
                        "action": h.action,
                        "operator": h.operator,
                        "reason": h.reason,
                        "timestamp": h.timestamp,
                        "before_canonical": (h.before or {}).get("canonical_name"),
                        "after_canonical": (h.after or {}).get("canonical_name"),
                    }
                    for h in self._history_by_point.get(p.point_id, [])
                ],
            })
        history_full = [
            {
                "record_id": h.record_id,
                "point_id": h.point_id,
                "action": h.action,
                "operator": h.operator,
                "reason": h.reason,
                "timestamp": h.timestamp,
                "before": h.before,
                "after": h.after,
            }
            for h in self.session.history
        ]
        output = {
            "session_meta": {
                "session_id": self.session.session_id,
                "version": self.session.version,
                "created_at": self.session.created_at,
                "rules": [r.__dict__ for r in self.session.rules],
            },
            "peak_calculation_rule": {
                "morning_keywords": ["早高峰", "早", "morning", "上午", "送学"],
                "evening_keywords": ["晚高峰", "晚", "evening", "下午", "接学"],
                "unmarked_strategy": "未标注高峰时同时计入早晚两边",
            },
            "merge_threshold": {
                "text_similarity": 0.72,
                "alias_similarity": 0.80,
                "adjacent_intersection_similarity_range": [0.50, 0.92],
                "note": "相邻路口命中方位词差异且相似度在区间内的，标记异常待人工确认",
            },
            "summary": {
                "total_points": len(self.session.merged_points),
                "confirmed_points": sum(1 for p in self.session.merged_points if p.is_manual_confirmed),
                "anomalous_points": sum(1 for p in self.session.merged_points if p.anomaly_flags),
                "total_morning": sum(p.peak_morning_count for p in self.session.merged_points),
                "total_evening": sum(p.peak_evening_count for p in self.session.merged_points),
                "total_feedbacks": len(self.session.feedbacks),
                "total_history_records": len(self.session.history),
            },
            "points": points_summary,
            "evidence_rows": evidence_rows,
            "history": history_full,
        }
        import json
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
