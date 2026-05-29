from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from .engine import MaturityWarning


@dataclass
class DiffEntry:
    bill_id: str
    change_type: str
    old_value: Optional[str]
    new_value: Optional[str]
    detail: str

    def to_dict(self) -> dict:
        return {
            "bill_id": self.bill_id,
            "change_type": self.change_type,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "detail": self.detail,
        }


class RunDiffer:
    def __init__(self, history_dir: str = ".bill_pool_history"):
        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(exist_ok=True)

    def _run_path(self, run_id: Optional[str] = None) -> Path:
        if run_id:
            return self.history_dir / f"run_{run_id}.json"
        runs = sorted(self.history_dir.glob("run_*.json"))
        if runs:
            return runs[-1]
        return self.history_dir / "run_initial.json"

    def save_run(self, warnings: list[MaturityWarning], quota_snapshot: dict,
                 risk_score: dict, run_id: Optional[str] = None) -> str:
        if not run_id:
            run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        data = {
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "warnings": [w.to_dict() for w in warnings],
            "quota_snapshot": quota_snapshot,
            "risk_score": risk_score,
        }

        path = self.history_dir / f"run_{run_id}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return run_id

    def load_run(self, run_id: Optional[str] = None) -> Optional[dict]:
        path = self._run_path(run_id)
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return None

    def list_runs(self) -> list[str]:
        runs = sorted(self.history_dir.glob("run_*.json"))
        return [p.stem.replace("run_", "") for p in runs]

    def diff(self, current: list[MaturityWarning], prev_data: Optional[dict] = None,
             prev_run_id: Optional[str] = None) -> list[DiffEntry]:
        if prev_data is None:
            prev_data = self.load_run(prev_run_id)
        if prev_data is None:
            return []

        prev_warnings = prev_data.get("warnings", [])
        prev_map = {w["bill_id"]: w for w in prev_warnings}
        curr_map = {w.bill_id: w for w in current}

        diffs: list[DiffEntry] = []

        for bid, cw in curr_map.items():
            if bid not in prev_map:
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="新增预警",
                    old_value=None,
                    new_value=cw.warning_level,
                    detail=f"票据 {bid} 新增到期预警，级别={cw.warning_level}，"
                           f"到期日={cw.effective_maturity_date}，"
                           f"金额={cw.amount}，额度影响={cw.quota_impact}",
                ))
                continue

            pw = prev_map[bid]
            if pw["warning_level"] != cw.warning_level:
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="预警级别变化",
                    old_value=pw["warning_level"],
                    new_value=cw.warning_level,
                    detail=f"票据 {bid} 预警级别从 {pw['warning_level']} 变为 {cw.warning_level}",
                ))

            if pw.get("effective_maturity_date") != cw.effective_maturity_date.isoformat():
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="到期日变化",
                    old_value=pw.get("effective_maturity_date"),
                    new_value=cw.effective_maturity_date.isoformat(),
                    detail=f"票据 {bid} 到期日从 {pw.get('effective_maturity_date')} 变为 {cw.effective_maturity_date.isoformat()}",
                ))

            if pw.get("quota_impact") != cw.quota_impact:
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="额度影响变化",
                    old_value=str(pw.get("quota_impact")),
                    new_value=str(cw.quota_impact),
                    detail=f"票据 {bid} 额度影响从 {pw.get('quota_impact')} 变为 {cw.quota_impact}",
                ))

            if pw.get("pledge_release_status") != cw.pledge_release_status:
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="质押释放状态变化",
                    old_value=pw.get("pledge_release_status"),
                    new_value=cw.pledge_release_status,
                    detail=f"票据 {bid} 质押释放状态从 {pw.get('pledge_release_status')} 变为 {cw.pledge_release_status}",
                ))

        for bid, pw in prev_map.items():
            if bid not in curr_map:
                diffs.append(DiffEntry(
                    bill_id=bid,
                    change_type="预警消除",
                    old_value=pw["warning_level"],
                    new_value=None,
                    detail=f"票据 {bid} 预警已消除，原级别={pw['warning_level']}",
                ))

        prev_quota = prev_data.get("quota_snapshot", {})
        return diffs

    def diff_quota(self, current_quota: dict, prev_data: Optional[dict] = None,
                   prev_run_id: Optional[str] = None) -> list[DiffEntry]:
        if prev_data is None:
            prev_data = self.load_run(prev_run_id)
        if prev_data is None:
            return []

        prev_quota = prev_data.get("quota_snapshot", {})
        diffs: list[DiffEntry] = []

        for key in ("total_quota", "used_quota", "pledged_quota", "discounted_quota",
                     "available_quota", "usage_ratio"):
            old_val = prev_quota.get(key)
            new_val = current_quota.get(key)
            if old_val != new_val:
                diffs.append(DiffEntry(
                    bill_id="POOL",
                    change_type=f"额度指标变化:{key}",
                    old_value=str(old_val),
                    new_value=str(new_val),
                    detail=f"票据池额度指标 {key} 从 {old_val} 变为 {new_val}。"
                           f"原因：票据状态变化导致质押/贴现金额重新计算，从而影响已用额度和可用额度。",
                ))

        return diffs
