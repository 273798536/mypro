"""幂等性保障 + 批次追踪引擎

职责：
1. 保存/恢复分析状态，重复执行不会累积重复异常
2. 批次追踪：持续性判断而非一次性，温度曲线补录后复测建议自动更新
3. 跨轮次保留已解决异常的标记
"""

import hashlib
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from .config import AppConfig
from .models import (
    AnalysisDataset, AnomalyRecord, BatchTrackingRecord, ManualNote,
    AnomalyAction, AnomalySeverity
)


def _signature_of_anomaly(a: AnomalyRecord) -> str:
    """计算异常的稳定签名（用于幂等去重）"""
    raw = f"{a.batch_no}|{a.source_module}|{a.anomaly_type}|{a.title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16].upper()


class StateManager:
    """状态管理器：幂等 + 批次追踪"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset
        self.state_path: Path = config.output_dir / config.output_files.state_filename
        self._loaded_state: Dict[str, Any] = self._load_state_file()

    # ── 状态文件读写 ─────────────────────────────────────────
    def _load_state_file(self) -> Dict[str, Any]:
        if not self.state_path.exists():
            return {"version": 1, "runs": [], "anomalies": {}, "batch_tracking": {}}
        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"version": 1, "runs": [], "anomalies": {}, "batch_tracking": {}}

    def save_state(self) -> None:
        state: Dict[str, Any] = {
            "version": 1,
            "last_run_id": self.dataset.analysis_run_id,
            "last_run_timestamp": self.dataset.analysis_timestamp.isoformat(),
            "runs": self._loaded_state.get("runs", [])[-19:],
            "anomalies": {},
            "batch_tracking": {},
        }
        state["runs"].append({
            "run_id": self.dataset.analysis_run_id,
            "timestamp": self.dataset.analysis_timestamp.isoformat(),
            "batch_count": len(self.dataset.get_batch_numbers()),
            "anomaly_count": len(self.dataset.anomalies),
        })
        known_anomalies: Dict[str, Any] = self._loaded_state.get("anomalies", {})
        for a in self.dataset.anomalies:
            sig = _signature_of_anomaly(a)
            prev = known_anomalies.get(sig, {})
            resolved = bool(prev.get("resolved", False))
            resolved_at = prev.get("resolved_at")
            resolution_note = prev.get("resolution_note", "")
            if resolved:
                a.resolved = True
                a.resolved_at = datetime.fromisoformat(resolved_at) if resolved_at else None
                a.resolution_note = resolution_note or "（沿用前次分析的解决标记）"
            state["anomalies"][sig] = {
                "anomaly_id": a.anomaly_id,
                "batch_no": a.batch_no,
                "source_module": a.source_module,
                "anomaly_type": a.anomaly_type,
                "severity": a.severity.value,
                "action": a.action.value,
                "title": a.title,
                "first_seen": prev.get("first_seen", datetime.now().isoformat()),
                "last_seen": datetime.now().isoformat(),
                "seen_count": int(prev.get("seen_count", 0)) + 1,
                "resolved": resolved,
                "resolved_at": resolved_at,
                "resolution_note": resolution_note,
            }
        for bn, bt in self.dataset.batch_tracking.items():
            state["batch_tracking"][bn] = {
                "kit_name": bt.kit_name,
                "first_analysis_date": str(bt.first_analysis_date) if bt.first_analysis_date else None,
                "last_analysis_date": str(bt.last_analysis_date) if bt.last_analysis_date else None,
                "analysis_count": bt.analysis_count,
                "current_status": bt.current_status,
                "recheck_suggestions": list(bt.recheck_suggestions),
                "unresolved_anomaly_ids": list(bt.unresolved_anomaly_ids),
                "history_snapshots": list(bt.history_snapshots[-30:]),
                "manual_notes": [
                    {"raw_text": n.raw_text, "author": n.author,
                     "timestamp": n.timestamp.isoformat() if n.timestamp else None}
                    for n in bt.manual_notes
                ],
            }
        try:
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
        except OSError:
            pass
        self._loaded_state = state

    # ── 幂等：异常去重 ───────────────────────────────────────
    def deduplicate_anomalies(self) -> Tuple[int, int]:
        """移除本轮内的重复异常，返回 (原始数, 去重后数)"""
        original = len(self.dataset.anomalies)
        seen: Set[str] = set()
        unique: List[AnomalyRecord] = []
        for a in self.dataset.anomalies:
            sig = _signature_of_anomaly(a)
            if sig in seen:
                continue
            seen.add(sig)
            unique.append(a)
        self.dataset.anomalies = unique
        return original, len(unique)

    # ── 补录检测：判断哪些材料是本轮新补录的 ─────────────────
    def detect_fresh_supplements(self) -> Dict[str, List[str]]:
        """检测本轮相比上轮新增/补录的模块

        返回 {batch_no: [新补录的模块名, ...]}
        """
        prev_runs = self._loaded_state.get("runs", [])
        supplements: Dict[str, List[str]] = {}
        if not prev_runs:
            return supplements
        prev_bt = self._loaded_state.get("batch_tracking", {})
        batches = self.dataset.get_batch_numbers()
        for bn in batches:
            current = self.dataset.get_records_for_batch(bn)
            modules = []
            if current["reagent_ledgers"]:
                modules.append("试剂台账")
            if current["experiment_records"]:
                modules.append("实验记录")
            if current["weighing_sheets"]:
                modules.append("称量单")
            if current["reaction_times"]:
                modules.append("反应时间")
            if current["temp_curves"]:
                modules.append("温度曲线")
            prev = prev_bt.get(bn, {})
            prev_snap = prev.get("history_snapshots", [])
            if prev_snap:
                last_mods = set(prev_snap[-1].get("modules_present", []))
                new_mods = [m for m in modules if m not in last_mods]
                if new_mods:
                    supplements[bn] = new_mods
            elif modules:
                supplements[bn] = list(modules)
        return supplements


class BatchTrackingEngine:
    """批次追踪引擎 - 持续性追踪，不是一次性判断"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset

    def refresh_all(self) -> None:
        today = date.today()
        batches = self.dataset.get_batch_numbers()
        for bn in batches:
            bt = self.dataset.batch_tracking.get(bn)
            if bt is None:
                continue
            if bt.analysis_count == 0 or bt.first_analysis_date is None:
                bt.first_analysis_date = today
            bt.last_analysis_date = today
            bt.analysis_count += 1
            self._refresh_recheck_suggestions(bt)
            self._refresh_current_status(bt)
            self._refresh_unresolved_anomalies(bt)
            self._append_snapshot(bt)

    # ── 复测建议随补录更新 ───────────────────────────────────
    def _refresh_recheck_suggestions(self, bt: BatchTrackingRecord) -> None:
        """根据当前材料状态刷新复测建议 - 补录后旧建议要清除"""
        batch_no = bt.batch_no
        recs = self.dataset.get_records_for_batch(batch_no)
        current_suggestions: Set[str] = set(bt.recheck_suggestions)

        # (a) 温度曲线补录后 -> 清掉旧的"温度曲线超差"建议，重新判断
        temp_dev_found = False
        max_dev_allowed = self.config.thresholds.temp_curve_max_deviation
        for tc in recs["temp_curves"]:
            md = tc.max_deviation()
            if md is not None and md > max_dev_allowed:
                temp_dev_found = True
                break
        if recs["temp_curves"] and not temp_dev_found:
            current_suggestions.discard("温度曲线超差")
        elif temp_dev_found:
            current_suggestions.add("温度曲线超差")

        # (b) 反应时间补录后 -> 重算漏记建议
        missing = [r for r in recs["reaction_times"] if r.is_missing]
        if recs["reaction_times"] and not missing:
            current_suggestions.discard("反应时间漏记")
        elif missing:
            current_suggestions.add("反应时间漏记")

        # (c) 空白对照补录后
        total_blank = sum(e.blank_control_count for e in recs["experiment_records"])
        if total_blank >= self.config.thresholds.min_blank_control_count:
            current_suggestions.discard("空白对照不足")
        elif recs["experiment_records"]:
            current_suggestions.add("空白对照不足")

        # (d) 批间差CV超差
        bad_cv = [c for c in self.dataset.cv_results
                  if c.batch_no == batch_no and not c.is_pass]
        if bad_cv:
            current_suggestions.add("批间差CV超差")
        else:
            current_suggestions.discard("批间差CV超差")

        bt.recheck_suggestions = sorted(current_suggestions)

    # ── 当前批次状态 ─────────────────────────────────────────
    def _refresh_current_status(self, bt: BatchTrackingRecord) -> None:
        if bt.recheck_suggestions:
            bt.current_status = "待整改：" + "、".join(bt.recheck_suggestions)
        else:
            unresolved = [a for a in self.dataset.anomalies
                          if a.batch_no == bt.batch_no and not a.resolved]
            crit = [a for a in unresolved if a.severity == AnomalySeverity.CRITICAL]
            warn = [a for a in unresolved if a.severity == AnomalySeverity.WARNING]
            if crit:
                bt.current_status = f"存在{len(crit)}项严重异常待处理"
            elif warn:
                bt.current_status = f"存在{len(warn)}项警告待复核"
            else:
                bt.current_status = "材料齐全、异常已处理，可放行"

    # ── 未解决异常清单 ───────────────────────────────────────
    def _refresh_unresolved_anomalies(self, bt: BatchTrackingRecord) -> None:
        ids = [a.anomaly_id for a in self.dataset.anomalies
               if a.batch_no == bt.batch_no and not a.resolved]
        bt.unresolved_anomaly_ids = ids

    # ── 历史快照（用于追踪变化轨迹）───────────────────────────
    def _append_snapshot(self, bt: BatchTrackingRecord) -> None:
        recs = self.dataset.get_records_for_batch(bt.batch_no)
        modules_present = []
        if recs["reagent_ledgers"]:
            modules_present.append("试剂台账")
        if recs["experiment_records"]:
            modules_present.append("实验记录")
        if recs["weighing_sheets"]:
            modules_present.append("称量单")
        if recs["reaction_times"]:
            modules_present.append("反应时间")
        if recs["temp_curves"]:
            modules_present.append("温度曲线")
        unresolved_count = len(bt.unresolved_anomaly_ids)
        bt.history_snapshots.append({
            "timestamp": datetime.now().isoformat(),
            "analysis_count": bt.analysis_count,
            "modules_present": modules_present,
            "status": bt.current_status,
            "recheck_suggestions": list(bt.recheck_suggestions),
            "unresolved_count": unresolved_count,
        })


class IdempotencyOrchestrator:
    """幂等性总协调器"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset
        self.state = StateManager(config, dataset)
        self.tracking = BatchTrackingEngine(config, dataset)

    def run_pre_analysis(self) -> Dict[str, Any]:
        """分析前的准备：恢复状态"""
        info: Dict[str, Any] = {}
        info["historical_runs"] = len(self.state._loaded_state.get("runs", []))
        supplements = self.state.detect_fresh_supplements()
        info["fresh_supplements"] = supplements
        return info

    def run_post_analysis(self) -> Dict[str, Any]:
        """分析后的收尾：去重、刷新追踪、保存状态"""
        info: Dict[str, Any] = {}
        orig, deduped = self.state.deduplicate_anomalies()
        info["anomaly_original"] = orig
        info["anomaly_deduped"] = deduped
        self.tracking.refresh_all()
        self.state.save_state()
        info["state_saved"] = True
        return info
