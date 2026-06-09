"""统一处理记录模块

核心目标：批量复核和公式计算共用同一套 ProcessingRecord，
界面、报告、导出都只读取这里的结果，绝不"各算各的"。
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .core import MarkovChain
from .exceptions import MarkovError


@dataclass
class ProcessingRecord:
    """单个样例的完整处理记录

    一条记录 = 输入参数 + 模型实例 + 所有计算结果 + 异常/告警 + 处理意见。
    界面显示、报告生成、JSON 导出都从这里取数，保证口径统一。
    """

    record_id: str
    label: str
    raw_input: Dict[str, Any]
    status: str = "pending"  # pending | success | failed | warning
    model: Optional[MarkovChain] = None
    error: Optional[Dict[str, Any]] = None
    results: Dict[str, Any] = field(default_factory=dict)
    review_notes: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def touch(self) -> None:
        self.updated_at = datetime.now()

    def mark_success(self, results: Dict[str, Any]) -> None:
        self.status = "success"
        self.results = results
        self.touch()

    def mark_warning(self, results: Dict[str, Any], warning_msg: str) -> None:
        self.status = "warning"
        self.results = results
        self.review_notes.append(f"[告警] {warning_msg}")
        self.touch()

    def mark_failed(self, err: MarkovError) -> None:
        self.status = "failed"
        self.error = err.to_dict()
        self.review_notes.append(f"[失败] {err.suggestion}")
        self.touch()

    def add_review_note(self, note: str) -> None:
        self.review_notes.append(f"[复核] {note}")
        self.touch()

    # ------------------------------------------------------------------
    # 结果获取（给报告和界面用，避免各处重复算）
    # ------------------------------------------------------------------
    @property
    def states(self) -> List[str]:
        return list(self.raw_input.get("states", []))

    @property
    def param_snapshot(self) -> Dict[str, Any]:
        if self.model is not None:
            return self.model.param_snapshot()
        return self.raw_input

    def distribution_df(self) -> Optional[pd.DataFrame]:
        series = self.results.get("distribution_series")
        if series is None:
            return None
        return pd.DataFrame(series, columns=self.states)

    def transition_df(self, n: int = 1) -> Optional[pd.DataFrame]:
        key = f"step_transition_{n}"
        mat = self.results.get(key)
        if mat is None:
            return None
        return pd.DataFrame(mat, index=self.states, columns=self.states)

    def steady_state_df(self) -> Optional[pd.DataFrame]:
        pi = self.results.get("steady_state")
        if pi is None:
            return None
        return pd.DataFrame(
            {"状态": self.states, "稳态概率": pi}
        ).sort_values("稳态概率", ascending=False).reset_index(drop=True)

    # ------------------------------------------------------------------
    # 序列化（用于导出/复核）
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict[str, Any]:
        d = {
            "record_id": self.record_id,
            "label": self.label,
            "status": self.status,
            "raw_input": self.raw_input,
            "results": {
                k: (v.tolist() if isinstance(v, np.ndarray) else v)
                for k, v in self.results.items()
            },
            "error": self.error,
            "review_notes": self.review_notes,
            "created_at": self.created_at.isoformat(timespec="seconds"),
            "updated_at": self.updated_at.isoformat(timespec="seconds"),
        }
        if self.model is not None:
            d["model"] = self.model.to_dict()
        return d


class BatchProcessor:
    """批量处理控制器

    - 先算能算的，失败项单独收集；
    - 所有记录都保存在 records 里，报告和界面共用；
    - 提供缺口清单（gaps）让数据分析员知道要补什么。
    """

    def __init__(self, batch_label: str = "未命名批次") -> None:
        self.batch_id = uuid.uuid4().hex[:8]
        self.batch_label = batch_label
        self.records: List[ProcessingRecord] = []
        self.created_at = datetime.now()

    # ------------------------------------------------------------------
    # 录入 + 运行
    # ------------------------------------------------------------------
    def add_case(
        self,
        label: str,
        states,
        transition_matrix,
        initial_dist: Optional[Dict[str, Any]] = None,
        tolerance: float = 1e-6,
    ) -> ProcessingRecord:
        raw = {
            "states": list(states),
            "transition_matrix": [list(row) for row in transition_matrix],
            "initial_dist": dict(initial_dist) if initial_dist else None,
            "tolerance": tolerance,
        }
        rec = ProcessingRecord(
            record_id=uuid.uuid4().hex[:8],
            label=label,
            raw_input=raw,
        )
        self.records.append(rec)
        return rec

    def run_all(
        self,
        steps: int = 10,
        steady_max_steps: int = 10000,
        steady_threshold: float = 1e-8,
    ) -> None:
        for rec in self.records:
            self._run_one(
                rec,
                steps=steps,
                steady_max_steps=steady_max_steps,
                steady_threshold=steady_threshold,
            )

    def _run_one(
        self,
        rec: ProcessingRecord,
        steps: int,
        steady_max_steps: int,
        steady_threshold: float,
    ) -> None:
        raw = rec.raw_input
        try:
            mc = MarkovChain(
                states=raw["states"],
                transition_matrix=raw["transition_matrix"],
                initial_dist=raw.get("initial_dist"),
                label=rec.label,
                tolerance=raw.get("tolerance", 1e-6),
            )
        except MarkovError as e:
            rec.mark_failed(e)
            return

        rec.model = mc

        results: Dict[str, Any] = {}
        try:
            series = mc.distribution_series(steps)
            results["distribution_series"] = series
            results["distribution_steps"] = steps

            for n in (1, 2, 5):
                results[f"step_transition_{n}"] = mc.step_transition(n)

            pi, info = mc.steady_state(
                max_steps=steady_max_steps,
                threshold=steady_threshold,
            )
            results["steady_state"] = pi
            results["steady_info"] = info

            results["simulate_path"] = mc.simulate_path(
                steps=20, seed=42
            )

            if not info["converged"]:
                rec.mark_warning(results, info["warning"])
            else:
                rec.mark_success(results)
        except MarkovError as e:
            rec.mark_failed(e)

    # ------------------------------------------------------------------
    # 查询
    # ------------------------------------------------------------------
    def successful(self) -> List[ProcessingRecord]:
        return [r for r in self.records if r.status in ("success", "warning")]

    def failed(self) -> List[ProcessingRecord]:
        return [r for r in self.records if r.status == "failed"]

    def gaps_summary(self) -> pd.DataFrame:
        """缺口清单：告诉数据分析员哪些样例缺什么、怎么补"""
        rows = []
        for r in self.failed():
            err = r.error or {}
            rows.append({
                "记录ID": r.record_id,
                "标签": r.label,
                "错误类型": err.get("error_type", "未知"),
                "错误说明": err.get("message", ""),
                "处理意见": err.get("suggestion", ""),
                "参数快照": json.dumps(err.get("context", {}), ensure_ascii=False),
            })
        return pd.DataFrame(rows)

    def find_record(self, record_id: str) -> Optional[ProcessingRecord]:
        for r in self.records:
            if r.record_id == record_id:
                return r
        return None

    def rerun(self, record_id: str, **overrides) -> bool:
        """复核入口：根据 ID 重跑某条记录，可覆盖输入参数"""
        rec = self.find_record(record_id)
        if rec is None:
            return False

        if overrides:
            new_raw = dict(rec.raw_input)
            new_raw.update(overrides)
            rec.raw_input = new_raw
            rec.add_review_note(f"复核时覆盖参数: {list(overrides.keys())}")

        steps = rec.results.get("distribution_steps", 10)
        steady_info = rec.results.get("steady_info", {})
        self._run_one(
            rec,
            steps=steps,
            steady_max_steps=steady_info.get("threshold", 1e-8) and 10000,
            steady_threshold=steady_info.get("threshold", 1e-8),
        )
        return True

    # ------------------------------------------------------------------
    # 导出
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "batch_label": self.batch_label,
            "created_at": self.created_at.isoformat(timespec="seconds"),
            "summary": {
                "total": len(self.records),
                "success": len(self.successful()),
                "failed": len(self.failed()),
            },
            "records": [r.to_dict() for r in self.records],
        }

    def save_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
