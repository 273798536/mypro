"""报告导出模块

让课题组只看导出报告也能明白：
- 为什么被拦下来（拦截原因 + 上下文）
- 下一步该补材料还是改口径
- 每个批次的完整复核轨迹
- 人工备注原话（不改写）
"""

from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd

from .config import AppConfig
from .models import AnalysisDataset, AnomalyRecord, AnomalySeverity, AnomalyAction
from .review import ReviewChecklistItem


class ReportExporter:
    """报告导出器"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset

    def export_all(
        self,
        checklist: List[ReviewChecklistItem],
        classifier_result: Dict[str, Any],
        fresh_supplements: Dict[str, List[str]],
    ) -> Dict[str, Path]:
        output_dir = self.config.output_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        paths: Dict[str, Path] = {}
        paths["report"] = self._export_main_report(checklist, classifier_result, fresh_supplements)
        paths["anomalies"] = self._export_anomaly_list()
        paths["review_checklist"] = self._export_review_checklist(checklist)
        paths["cv_results"] = self._export_cv_results()
        paths["batch_tracking"] = self._export_batch_tracking()
        return paths

    # ── 1. 主报告（带上下文解释） ───────────────────────────
    def _export_main_report(
        self,
        checklist: List[ReviewChecklistItem],
        classifier: Dict[str, Any],
        supplements: Dict[str, List[str]],
    ) -> Path:
        out_path = self.config.output_dir / self.config.output_files.report_filename
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            # Sheet 1: 分析概览
            self._sheet_overview(writer, checklist, classifier, supplements)
            # Sheet 2: 逐批次结论（重点：拦截原因上下文）
            self._sheet_batch_conclusions(writer, checklist)
            # Sheet 3: 异常动作看板（补材料 / 改口径 / 复测 / 审核）
            self._sheet_action_dashboard(writer)
            # Sheet 4: 批间差CV汇总
            self._sheet_cv_summary(writer)
            # Sheet 5: 人工备注合集（原样保留）
            self._sheet_manual_notes(writer, checklist)
        return out_path

    def _sheet_overview(
        self, writer, checklist: List[ReviewChecklistItem],
        classifier: Dict[str, Any], supplements: Dict[str, List[str]],
    ) -> None:
        rows = []
        rows.append({"项目": "分析运行编号", "内容": self.dataset.analysis_run_id})
        rows.append({"项目": "分析时间", "内容": self.dataset.analysis_timestamp.strftime("%Y-%m-%d %H:%M:%S")})
        rows.append({"项目": "本次覆盖批次数量", "内容": len(checklist)})
        rows.append({"项目": "输入目录", "内容": str(self.config.input_dir)})
        rows.append({"项目": "输出目录", "内容": str(self.config.output_dir)})
        rows.append({})
        rows.append({"项目": "【异常统计】", "内容": ""})
        rows.append({"项目": "未解决异常总数", "内容": classifier.get("total_unresolved", 0)})
        rows.append({"项目": "已解决异常总数（沿用历史）", "内容": classifier.get("total_resolved", 0)})
        by_sev = classifier.get("by_severity", {})
        rows.append({"项目": "  · 严重异常", "内容": by_sev.get("严重", 0)})
        rows.append({"项目": "  · 警告异常", "内容": by_sev.get("警告", 0)})
        rows.append({"项目": "  · 提示", "内容": by_sev.get("提示", 0)})
        rows.append({})
        rows.append({"项目": "【下一步动作分布】", "内容": ""})
        by_act = classifier.get("by_action", {})
        for act_label in ["拦截放行", "补材料", "改口径", "复测", "待审核"]:
            rows.append({"项目": f"  · {act_label}", "内容": by_act.get(act_label, 0)})
        if supplements:
            rows.append({})
            rows.append({"项目": "【本轮新补录的材料】", "内容": "(相对上一轮分析)"})
            for bn, mods in supplements.items():
                rows.append({"项目": f"  · 批次 {bn}", "内容": "、".join(mods)})
        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name="1-分析概览", index=False)

    def _sheet_batch_conclusions(
        self, writer, checklist: List[ReviewChecklistItem]
    ) -> None:
        rows = []
        for item in checklist:
            module_line = "；".join(
                f"{k}={v}" for k, v in item.modules_status.items()
            )
            actions_block = "\n".join(item.actions_needed) if item.actions_needed else "无，通过"
            recheck_block = "、".join(item.recheck_suggestions) if item.recheck_suggestions else "无"
            blocking_block = "\n\n".join(item.blocking_reasons) if item.blocking_reasons else "无"
            blank_line = (
                f"{item.blank_control_total}个 "
                f"（要求≥{item.blank_control_required}个）"
                f"{' ✅达标' if item.blank_control_pass else ' ❌不达标'}"
            )
            anomaly_line_parts = []
            for k, v in item.anomaly_summary.items():
                if v:
                    anomaly_line_parts.append(f"{k}={v}项")
            anomaly_line = "；".join(anomaly_line_parts) if anomaly_line_parts else "无"
            rows.append({
                "批次号": item.batch_no,
                "试剂盒名称": item.kit_name,
                "本轮是第几次分析": item.analysis_count,
                "当前总体状态": item.current_status,
                "5类材料齐全性": module_line,
                "空白对照数": blank_line,
                "反应时间漏记数": f"{item.reaction_time_missing} / {item.reaction_time_count}",
                "异常分布": anomaly_line,
                "⚠️ 拦截/预警原因（给课题组的说明）": blocking_block,
                "✅👉 下一步动作（补材料/改口径/复测）": actions_block,
                "批次持续追踪：复测建议": recheck_block,
                "未解决异常ID清单": "、".join(item.unresolved_anomaly_ids) if item.unresolved_anomaly_ids else "无",
                "人工备注（原样保留）": item.manual_notes_joined,
            })
        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name="2-逐批次结论", index=False)

    def _sheet_action_dashboard(self, writer) -> None:
        unresolved = [a for a in self.dataset.anomalies if not a.resolved]
        rows = []
        for a in unresolved:
            severity_emoji = {
                AnomalySeverity.CRITICAL: "🔴 ",
                AnomalySeverity.WARNING: "🟡 ",
                AnomalySeverity.INFO: "🔵 ",
            }.get(a.severity, "")
            notes_line = " | ".join(n.display() for n in a.manual_notes) if a.manual_notes else ""
            rows.append({
                "动作分类": a.action_label(),
                "严重程度": severity_emoji + a.severity.value,
                "批次号": a.batch_no,
                "异常ID": a.anomaly_id,
                "来源模块": a.source_module,
                "异常类型": a.anomaly_type,
                "标题": a.title,
                "细节": a.detail_message,
                "【为什么被拦/预警】（上下文说明）": a.blocking_reason,
                "相关记录ID": "、".join(a.related_record_ids) if a.related_record_ids else "",
                "人工备注（原样）": notes_line,
            })
        action_order = [
            AnomalyAction.BLOCK_RELEASE.value,
            AnomalyAction.SUPPLY_MATERIAL.value,
            AnomalyAction.CORRECT_RECORD.value,
            AnomalyAction.RECHECK.value,
            AnomalyAction.REVIEW_ONLY.value,
        ]
        def _find_act_index(text: str) -> int:
            for i, act in enumerate(action_order):
                if act in text:
                    return i
            return 99
        if rows:
            df_all = pd.DataFrame(rows)
            df_all["_sort_key"] = df_all["动作分类"].apply(_find_act_index)
            df_all = df_all.sort_values(["_sort_key", "严重程度", "批次号"]).drop(columns=["_sort_key"])
        else:
            df_all = pd.DataFrame(rows)
        df_all.to_excel(writer, sheet_name="3-动作看板", index=False)

    def _sheet_cv_summary(self, writer) -> None:
        rows = []
        for c in self.dataset.cv_results:
            rows.append({
                "批次号": c.batch_no,
                "指标名称": c.indicator_name,
                "数据来源": c.data_source,
                "样本数 n": c.sample_count,
                "均值 Mean": round(c.mean_value, 4),
                "标准差 SD": round(c.std_value, 4),
                "变异系数 CV(%)": round(c.cv_percent, 2),
                "阈值(%)": c.pass_threshold,
                "判定": "✅通过" if c.is_pass else "❌超差",
            })
        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name="4-批间差CV", index=False)

    def _sheet_manual_notes(
        self, writer, checklist: List[ReviewChecklistItem]
    ) -> None:
        """人工备注合集 - 严格原样，不做任何规范化"""
        rows = []
        seen_notes = set()
        for item in checklist:
            if item.manual_notes_joined:
                for line in item.manual_notes_joined.split("\n"):
                    if line and line not in seen_notes:
                        seen_notes.add(line)
                        rows.append({
                            "批次号": item.batch_no,
                            "人工备注原话（系统未做任何修改）": line,
                        })
        if not rows:
            rows.append({"批次号": "", "人工备注原话（系统未做任何修改）": "（无）"})
        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name="5-人工备注", index=False)

    # ── 2. 异常清单（独立文件） ──────────────────────────────
    def _export_anomaly_list(self) -> Path:
        out_path = self.config.output_dir / self.config.output_files.anomaly_filename
        rows = []
        for a in self.dataset.anomalies:
            rows.append({
                "异常ID": a.anomaly_id,
                "批次号": a.batch_no,
                "来源模块": a.source_module,
                "异常类型": a.anomaly_type,
                "严重程度": a.severity.value,
                "动作分类": a.action.value,
                "标题": a.title,
                "细节": a.detail_message,
                "拦截原因说明": a.blocking_reason,
                "相关记录ID": "、".join(a.related_record_ids) if a.related_record_ids else "",
                "是否已解决（沿用历史）": "是" if a.resolved else "否",
                "解决说明": a.resolution_note,
                "创建时间": a.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "人工备注": " | ".join(n.display() for n in a.manual_notes),
            })
        df = pd.DataFrame(rows)
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="全部异常", index=False)
            unresolved = df[df["是否已解决（沿用历史）"] == "否"]
            unresolved.to_excel(writer, sheet_name="未解决", index=False)
        return out_path

    # ── 3. 复核清单（独立文件） ──────────────────────────────
    def _export_review_checklist(self, checklist: List[ReviewChecklistItem]) -> Path:
        out_path = self.config.output_dir / self.config.output_files.review_checklist_filename
        rows = []
        for item in checklist:
            rows.append({
                "批次号": item.batch_no,
                "试剂盒名称": item.kit_name,
                "第几次分析": item.analysis_count,
                "当前状态": item.current_status,
                "试剂台账": f"{item.reagent_ledger_count}条 ({item.modules_status.get('试剂台账', '')})",
                "实验记录": f"{item.experiment_count}条 ({item.modules_status.get('实验记录', '')})",
                "称量单": f"{item.weighing_count}条 ({item.modules_status.get('称量单', '')})",
                "反应时间": f"{item.reaction_time_count}条,漏记{item.reaction_time_missing} ({item.modules_status.get('反应时间', '')})",
                "温度曲线": f"{item.temp_curve_count}条 ({item.modules_status.get('温度曲线', '')})",
                "空白对照": f"{item.blank_control_total}个(要求≥{item.blank_control_required}) {'✅' if item.blank_control_pass else '❌'}",
                "严重异常数": item.critical_count,
                "警告数": item.warning_count,
                "复测建议": "、".join(item.recheck_suggestions) if item.recheck_suggestions else "无",
                "下一步动作": "\n".join(item.actions_needed) if item.actions_needed else "无",
                "拦截原因": "\n\n".join(item.blocking_reasons) if item.blocking_reasons else "无",
                "人工备注": item.manual_notes_joined,
            })
        df = pd.DataFrame(rows)
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="复核清单", index=False)
        return out_path

    # ── 4. CV 结果（从 dataset 直接导出，独立文件） ─────────
    def _export_cv_results(self) -> Path:
        out_path = self.config.output_dir / "批间差CV明细.xlsx"
        rows = []
        for c in self.dataset.cv_results:
            rows.append({
                "批次号": c.batch_no,
                "指标": c.indicator_name,
                "数据来源": c.data_source,
                "n": c.sample_count,
                "Mean": c.mean_value,
                "SD": c.std_value,
                "CV%": round(c.cv_percent, 2),
                "阈值%": c.pass_threshold,
                "判定": "通过" if c.is_pass else "超差",
            })
        df = pd.DataFrame(rows)
        df.to_excel(out_path, index=False)
        return out_path

    # ── 5. 批次追踪导出 ─────────────────────────────────────
    def _export_batch_tracking(self) -> Path:
        out_path = self.config.output_dir / "批次追踪轨迹.xlsx"
        with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
            current_rows = []
            for bn, bt in self.dataset.batch_tracking.items():
                current_rows.append({
                    "批次号": bn,
                    "试剂盒名称": bt.kit_name,
                    "首次分析日期": str(bt.first_analysis_date) if bt.first_analysis_date else "",
                    "最近分析日期": str(bt.last_analysis_date) if bt.last_analysis_date else "",
                    "累计分析次数": bt.analysis_count,
                    "当前状态": bt.current_status,
                    "复测建议": "、".join(bt.recheck_suggestions),
                    "未解决异常数": len(bt.unresolved_anomaly_ids),
                    "历史快照数": len(bt.history_snapshots),
                })
            pd.DataFrame(current_rows).to_excel(writer, sheet_name="当前追踪表", index=False)
            snap_rows = []
            for bn, bt in self.dataset.batch_tracking.items():
                for i, snap in enumerate(bt.history_snapshots, 1):
                    snap_rows.append({
                        "批次号": bn,
                        "第几次快照": i,
                        "时间": snap.get("timestamp", ""),
                        "分析轮次": snap.get("analysis_count", ""),
                        "当时状态": snap.get("status", ""),
                        "当时材料": "、".join(snap.get("modules_present", [])),
                        "当时复测建议": "、".join(snap.get("recheck_suggestions", [])),
                        "当时未解决数": snap.get("unresolved_count", ""),
                    })
            pd.DataFrame(snap_rows).to_excel(writer, sheet_name="历史快照", index=False)
        return out_path
