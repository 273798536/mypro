"""多源复核整合 + 异常分类汇总

把"实验记录 + 称量单 + 反应时间 + 温度曲线 + 试剂台账"放入同一轮复核清单，
并按批次聚合，告诉管理员下一步该"补材料"还是"改口径"。
"""

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

from .config import AppConfig
from .models import (
    AnalysisDataset, AnomalyRecord, AnomalyAction, AnomalySeverity,
    RecordStatus, BatchTrackingRecord
)


@dataclass
class ReviewChecklistItem:
    """复核清单的一条 - 一个批次一条"""
    batch_no: str
    kit_name: str
    analysis_count: int
    current_status: str

    modules_status: Dict[str, str]

    reagent_ledger_count: int
    experiment_count: int
    weighing_count: int
    reaction_time_count: int
    reaction_time_missing: int
    temp_curve_count: int

    blank_control_total: int
    blank_control_required: int
    blank_control_pass: bool

    anomaly_summary: Dict[str, int]
    critical_count: int
    warning_count: int

    actions_needed: List[str]
    recheck_suggestions: List[str]
    unresolved_anomaly_ids: List[str]

    blocking_reasons: List[str]
    manual_notes_joined: str

    raw_context: Dict[str, Any]


class ReviewIntegrator:
    """复核整合器"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset
        self.checklist: List[ReviewChecklistItem] = []

    def build(self) -> List[ReviewChecklistItem]:
        """生成每个批次的复核清单条目"""
        batches = self.dataset.get_batch_numbers()
        required_blanks = self.config.thresholds.min_blank_control_count
        items: List[ReviewChecklistItem] = []
        for bn in batches:
            recs = self.dataset.get_records_for_batch(bn)
            bt = self.dataset.batch_tracking.get(bn, BatchTrackingRecord(batch_no=bn))

            rl_count = len(recs["reagent_ledgers"])
            exp_count = len(recs["experiment_records"])
            ws_count = len(recs["weighing_sheets"])
            rt_count = len(recs["reaction_times"])
            rt_missing = sum(1 for r in recs["reaction_times"] if r.is_missing)
            tc_count = len(recs["temp_curves"])

            blank_total = sum(e.blank_control_count for e in recs["experiment_records"])
            blank_pass = blank_total >= required_blanks

            batch_anomalies = [a for a in self.dataset.anomalies if a.batch_no == bn and not a.resolved]
            crit = sum(1 for a in batch_anomalies if a.severity == AnomalySeverity.CRITICAL)
            warn = sum(1 for a in batch_anomalies if a.severity == AnomalySeverity.WARNING)
            info = sum(1 for a in batch_anomalies if a.severity == AnomalySeverity.INFO)

            anomaly_summary = {
                "严重": crit,
                "警告": warn,
                "提示": info,
            }

            modules_status = self._modules_status(
                rl_count, exp_count, ws_count, rt_count, rt_missing, tc_count
            )

            actions_needed = self._summarize_actions(batch_anomalies)
            blocking_reasons = [a.blocking_reason for a in batch_anomalies
                                if a.blocking_reason and a.severity == AnomalySeverity.CRITICAL]
            notes_all: List[str] = []
            for lst in [
                recs["reagent_ledgers"], recs["experiment_records"],
                recs["weighing_sheets"], recs["reaction_times"], recs["temp_curves"]
            ]:
                for obj in lst:
                    for n in obj.manual_notes:
                        notes_all.append(n.display())
            notes_all.extend([n.display() for n in bt.manual_notes])
            for a in batch_anomalies:
                for n in a.manual_notes:
                    notes_all.append(n.display())
            notes_joined = "\n".join(dict.fromkeys(notes_all)) if notes_all else ""

            items.append(ReviewChecklistItem(
                batch_no=bn,
                kit_name=bt.kit_name,
                analysis_count=bt.analysis_count,
                current_status=bt.current_status,
                modules_status=modules_status,
                reagent_ledger_count=rl_count,
                experiment_count=exp_count,
                weighing_count=ws_count,
                reaction_time_count=rt_count,
                reaction_time_missing=rt_missing,
                temp_curve_count=tc_count,
                blank_control_total=blank_total,
                blank_control_required=required_blanks,
                blank_control_pass=blank_pass,
                anomaly_summary=anomaly_summary,
                critical_count=crit,
                warning_count=warn,
                actions_needed=actions_needed,
                recheck_suggestions=list(bt.recheck_suggestions),
                unresolved_anomaly_ids=list(bt.unresolved_anomaly_ids),
                blocking_reasons=blocking_reasons,
                manual_notes_joined=notes_joined,
                raw_context={
                    "batch_no": bn,
                    "records_count": {
                        "reagent_ledger": rl_count,
                        "experiment": exp_count,
                        "weighing_sheet": ws_count,
                        "reaction_time": rt_count,
                        "temp_curve": tc_count,
                    },
                },
            ))
        self.checklist = items
        return items

    # ── 辅助方法 ─────────────────────────────────────────────
    def _modules_status(self, rl, exp, ws, rt, rt_mis, tc) -> Dict[str, str]:
        def status_flag(present: bool, ok: bool = True) -> str:
            if not present:
                return "缺失"
            return "正常" if ok else "异常"
        return {
            "试剂台账": status_flag(rl > 0),
            "实验记录": status_flag(exp > 0),
            "称量单": status_flag(ws > 0),
            "反应时间": status_flag(rt > 0, rt_mis == 0),
            "温度曲线": status_flag(tc > 0),
        }

    def _summarize_actions(self, anomalies: List[AnomalyRecord]) -> List[str]:
        """按 补材料 / 改口径 / 复测 / 审核 聚合"""
        grouped: Dict[AnomalyAction, List[str]] = defaultdict(list)
        for a in anomalies:
            grouped[a.action].append(f"• {a.title}（{a.source_module}）")
        order = [
            AnomalyAction.BLOCK_RELEASE,
            AnomalyAction.SUPPLY_MATERIAL,
            AnomalyAction.CORRECT_RECORD,
            AnomalyAction.RECHECK,
            AnomalyAction.REVIEW_ONLY,
        ]
        lines: List[str] = []
        for act in order:
            if act in grouped and grouped[act]:
                lines.append(f"【{act.value}】共{len(grouped[act])}项")
                lines.extend(grouped[act])
        return lines


class AnomalyClassifier:
    """异常分类器 - 按动作类型统计，不只是一个红色数字"""

    def __init__(self, dataset: AnalysisDataset):
        self.dataset = dataset

    def classify(self) -> Dict[str, Any]:
        """返回按严重度、动作类型、批次、模块的多维分类统计"""
        unresolved = [a for a in self.dataset.anomalies if not a.resolved]
        by_severity = defaultdict(int)
        by_action = defaultdict(int)
        by_batch = defaultdict(int)
        by_module = defaultdict(int)
        for a in unresolved:
            by_severity[a.severity.value] += 1
            by_action[a.action.value] += 1
            by_batch[a.batch_no] += 1
            by_module[a.source_module] += 1
        return {
            "total_unresolved": len(unresolved),
            "total_resolved": len(self.dataset.anomalies) - len(unresolved),
            "by_severity": dict(by_severity),
            "by_action": dict(by_action),
            "by_batch": dict(by_batch),
            "by_module": dict(by_module),
        }
