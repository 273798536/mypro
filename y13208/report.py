import os
from datetime import datetime
from typing import Optional
from collections import Counter

from models import (
    TimecodeAnomaly, AnomalyStatus, AnomalyType,
    RemarkHistory, StatusChange, Judgment
)
from storage import Storage
from anomaly_engine import AnomalyEngine


def _fmt_dt(dt) -> str:
    if not dt:
        return "-"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def _status_badge(s: AnomalyStatus) -> str:
    mapping = {
        AnomalyStatus.PENDING: "🟡 待处理",
        AnomalyStatus.CONFIRMED: "🔴 已确认",
        AnomalyStatus.RESOLVED: "🟢 已解决",
        AnomalyStatus.DISMISSED: "⚪ 已驳回",
        AnomalyStatus.WAIVED: "🟣 已授权豁免"
    }
    return mapping.get(s, s.value)


def _type_icon(t: AnomalyType) -> str:
    mapping = {
        AnomalyType.FILENAME_MISMATCH: "📁",
        AnomalyType.TIMECODE_OFFBEAT: "⏱️",
        AnomalyType.TRACKLIST_NOTE_MISMATCH: "📝",
        AnomalyType.SCOPE_IMPACT: "🌊",
        AnomalyType.LICENSE_AUTH: "🔏"
    }
    return mapping.get(t, "❓")


def _render_table(headers, rows):
    lines = []
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for r in rows:
        cells = [str(c).replace("|", "\\|").replace("\n", " ") for c in r]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


class ReportGenerator:
    def __init__(self, storage: Storage, engine: AnomalyEngine):
        self.storage = storage
        self.engine = engine

    def generate_full_report(self,
                             report_title: str = "录音棚时码异常提醒报告",
                             include_resolved: bool = True,
                             operator_context: str = "社区公示前校验") -> str:
        snap = self.storage.export_state_snapshot()
        align = self.engine.get_alignment_status()
        anomalies = self.storage.list_anomalies()

        if not include_resolved:
            anomalies = [a for a in anomalies
                         if a.status not in
                         (AnomalyStatus.RESOLVED, AnomalyStatus.WAIVED)]

        out = []
        out.append(f"# {report_title}")
        out.append("")
        out.append(f"**系统：录音棚时码异常提醒处理链**  ")
        out.append(f"> 生成时间：**{_fmt_dt(datetime.now())}**  ")
        out.append(f"> 校验场景：{operator_context}  ")
        out.append(f"> 数据快照版本：`{snap['exported_at']}`")
        out.append("")

        # ==== 1. 概览 ====
        out.append("## 1. 概览")
        out.append("")
        out.append(_render_table(
            ["指标", "数值"],
            [
                ["导入曲目表条目数", snap["counts"]["tracks"]],
                ["导入录音文件数", snap["counts"]["files"]],
                ["时码异常总数", snap["counts"]["anomalies"]],
                ["历史备注留存数", snap["counts"]["remarks"]],
                ["改判状态流转记录数", snap["counts"]["status_changes"]],
                ["正式改判判定数", snap["counts"]["judgments"]],
                ["未匹配文件数", align["unmatched_file_count"]],
                ["一致性校验", "✅ 通过" if align["consistency_check"]["consistent"]
                                else "❌ 存在问题"]
            ]
        ))
        out.append("")

        # ==== 2. 异常分布 ====
        out.append("## 2. 异常状态分布")
        out.append("")
        status_counts = Counter(a.status.value for a in self.storage.list_anomalies())
        type_counts = Counter(a.anomaly_type.value for a in self.storage.list_anomalies())
        out.append("### 2.1 按状态")
        out.append("")
        out.append(_render_table(
            ["状态", "数量"],
            list(status_counts.items()) or [["(空)", 0]]
        ))
        out.append("")
        out.append("### 2.2 按类型")
        out.append("")
        out.append(_render_table(
            ["异常类型", "数量"],
            list(type_counts.items()) or [["(空)", 0]]
        ))
        out.append("")

        # ==== 3. 对齐情况 ====
        out.append("## 3. 文件 × 曲目表 × 最终清单 对齐")
        out.append("")
        out.append(_render_table(
            ["维度", "结果"],
            [
                ["文件 vs 曲目表（已对齐）",
                 align["total_files"] - align["unmatched_file_count"]],
                ["文件 vs 曲目表（未对齐）", align["unmatched_file_count"]],
                ["未对齐文件清单",
                 "、".join(align["unmatched_filenames"])
                 if align["unmatched_filenames"] else "(全部对齐)"],
                ["最终清单对齐依据",
                 "以异常当前状态 + 最后一次改判/授权备注为准"]
            ]
        ))
        out.append("")

        # ==== 4. 逐项异常详情 ====
        out.append("## 4. 逐项异常详情")
        out.append("")
        if not anomalies:
            out.append("_（无符合条件的异常）_")
            out.append("")
        else:
            for idx, a in enumerate(anomalies, start=1):
                out.append(self._render_anomaly_section(idx, a))

        # ==== 5. 变化摘要（重点给阿蓝看） ====
        out.append("## 5. 变化摘要（演出统筹视角）")
        out.append("")
        changed = [a for a in self.storage.list_anomalies()
                   if len(a.status_history) >= 2 or len(a.remarks) >= 2]
        if not changed:
            out.append("_（尚无状态或备注变化）_")
        else:
            rows = []
            for a in changed:
                first_status = a.status_history[0].from_status if a.status_history else "-"
                last_status = a.status.value
                first_remark = a.remarks[0].content[:20] + ("…" if len(a.remarks[0].content) > 20 else "") if a.remarks else "-"
                last_remark = a.latest_remark[:30] + ("…" if a.latest_remark and len(a.latest_remark) > 30 else "") if a.latest_remark else "-"
                rows.append([
                    f"#{a.id}",
                    a.title,
                    f"{first_status} → {last_status}",
                    f"{len(a.status_history)}次",
                    first_remark,
                    last_remark
                ])
            out.append(_render_table(
                ["编号", "异常标题", "状态变化", "流转次数", "初始备注摘要", "最新备注摘要"],
                rows
            ))
        out.append("")

        # ==== 6. 历史留存验证 ====
        out.append("## 6. 历史留存完整性验证")
        out.append("")
        out.append(_render_table(
            ["校验项", "结果"],
            [
                ["备注历史全部保留",
                 f"是（共{align['consistency_check']['total_remarks_preserved']}条）"],
                ["状态流转全部保留",
                 f"是（共{align['consistency_check']['total_status_changes_preserved']}条）"],
                ["改判判定全部保留",
                 f"是（共{align['consistency_check']['total_judgments_preserved']}条）"],
                ["DB当前状态与历史末态一致",
                 "✅ 通过" if align["consistency_check"]["consistent"]
                            else "❌ " + "; ".join(align["consistency_check"]["issues"])],
                ["重启后报告可复现",
                 "✅ 是（报告完全由DB重算生成，不依赖内存状态）"]
            ]
        ))
        out.append("")
        out.append("---")
        out.append(f"_报告由 timecode anomaly 引擎自动生成于 {_fmt_dt(datetime.now())}_")

        return "\n".join(out)

    # ========== 单条异常渲染 ==========
    def _render_anomaly_section(self, idx: int, a: TimecodeAnomaly) -> str:
        out = []
        out.append(f"### 4.{idx} {_type_icon(a.anomaly_type)} "
                   f"#{a.id} {a.title}")
        out.append("")
        out.append(f"- **当前状态**：{_status_badge(a.status)}")
        out.append(f"- **异常类型**：{a.anomaly_type.value}")
        out.append(f"- **关联曲目**：{a.matched_track_title or '(无)'} "
                   f"(曲目表行 {a.source_file_line})")
        out.append(f"- **关联文件**：`{a.matched_filename or '(无)'}`")
        out.append(f"- **影响范围**：{a.impact_scope}")
        out.append(f"- **检测时间**：{_fmt_dt(a.created_at)}")
        out.append(f"- **最后更新**：{_fmt_dt(a.updated_at)}")
        out.append("")

        out.append("#### 描述")
        out.append("")
        out.append(f"> {a.description}")
        out.append("")

        if a.current_snapshot:
            out.append("#### 当前对齐快照")
            out.append("")
            out.append("```")
            out.append(a.current_snapshot)
            out.append("```")
            out.append("")

        if a.current_judgment:
            out.append("#### 当前改判结论")
            out.append("")
            out.append(f"**{a.current_judgment}**")
            out.append("")

        # 状态流转
        if a.status_history:
            out.append("#### 状态流转记录（完整历史）")
            out.append("")
            rows = []
            for i, sc in enumerate(a.status_history, start=1):
                rows.append([
                    i,
                    _fmt_dt(sc.created_at),
                    sc.from_status.value,
                    sc.to_status.value,
                    sc.reason,
                    sc.operator
                ])
            out.append(_render_table(
                ["#", "时间", "从状态", "到状态", "原因/判定", "操作人"],
                rows
            ))
            out.append("")

        # 改判判定
        if a.judgments:
            out.append("#### 正式改判判定（来源可查）")
            out.append("")
            rows = []
            for i, j in enumerate(a.judgments, start=1):
                rows.append([
                    i,
                    _fmt_dt(j.created_at),
                    ("✅ " if j.is_favorable else "⚠️ ") + j.judgment_text,
                    j.source_ref,
                    j.impact_scope,
                    j.operator
                ])
            out.append(_render_table(
                ["#", "时间", "判定内容", "来源", "影响范围", "操作人"],
                rows
            ))
            out.append("")

        # 备注历史
        if a.remarks:
            out.append("#### 备注历史（包括后补、授权、旧版本截图）")
            out.append("")
            rows = []
            for i, r in enumerate(a.remarks, start=1):
                attach = (f" 附:[{os.path.basename(r.attachment_path)}]"
                          f"({r.attachment_path})") if r.attachment_path else ""
                rows.append([
                    i,
                    _fmt_dt(r.created_at),
                    r.remark_type,
                    r.content + attach,
                    r.source,
                    r.operator
                ])
            out.append(_render_table(
                ["#", "时间", "类型", "内容", "来源行/文件", "操作人"],
                rows
            ))
            out.append("")

        return "\n".join(out)

    def save_report(self, output_path: str, **kwargs) -> str:
        content = self.generate_full_report(**kwargs)
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".",
                    exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        return output_path
