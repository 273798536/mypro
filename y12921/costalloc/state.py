from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional

from .allocator import AllocationResult, allocate
from .loader import load_feedback, load_rules, load_tasks, validate_feedback
from .models import (
    AllocationRule, AllocationRun, FeedbackRecord, TaskAllocation,
    TrainingTask, USD_TO_CNY_DEFAULT, parse_hours, parse_money,
)

DATA_DIR = Path("data")
STATE_FILE = Path("alloc_state/state.json")


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class State:
    """训练任务成本分摊的运行状态：任务/规则/反馈/版本快照，全部落盘可复跑。"""

    def __init__(self, path: Path = STATE_FILE):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data: dict = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        return {
            "tasks": [], "rules": [], "feedback": [],
            "runs": [], "latest_version": 0, "next_fb_id": 1, "next_run_version": 1,
        }

    def save(self) -> None:
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

    # ---- 数据载入（幂等：仅空状态或 --force 时从 CSV 种入，避免要求使用者手工整理）----
    def seed(self, tasks_csv=DATA_DIR / "sample_tasks.csv",
             rules_csv=DATA_DIR / "allocation_rules.csv",
             feedback_csv=DATA_DIR / "feedback.csv", force: bool = False) -> str:
        if self.data["tasks"] and not force:
            return "状态已有数据，跳过载入（如需重载请加 --force）。"
        tasks = load_tasks(tasks_csv)
        rules = load_rules(rules_csv)
        feedback = load_feedback(feedback_csv)
        validate_feedback(feedback, tasks)
        self.data["tasks"] = [t.to_dict() for t in tasks]
        self.data["rules"] = [r.to_dict() for r in rules]
        self.data["feedback"] = [r.to_dict() for r in feedback]
        self.data["next_fb_id"] = max((int(r["fb_id"].split("-")[-1]) for r in self.data["feedback"] if r["fb_id"].split("-")[-1].isdigit()), default=0) + 1
        self.save()
        return f"已载入样例：{len(tasks)} 个任务、{len(rules)} 条规则、{len(feedback)} 条反馈。"

    def _tasks(self) -> list[TrainingTask]:
        return [TrainingTask.from_dict(d) for d in self.data["tasks"]]

    def _rules(self) -> list[AllocationRule]:
        return [AllocationRule.from_dict(d) for d in self.data["rules"]]

    def _feedback(self) -> list[FeedbackRecord]:
        return [FeedbackRecord.from_dict(d) for d in self.data["feedback"]]

    # ---- 人工反馈线：补录（幂等）----
    def add_supplement(self, task_id: str, value: str, unit: str = "",
                       reviewer: str = "cli", remark: str = "") -> tuple[FeedbackRecord, bool]:
        """补录：金额则作为权威实际金额，时长则补一次额外运行。按 任务+值+备注 去重。"""
        existing = self._find_feedback(task_id, "supplement", value, remark)
        if existing is not None:
            return existing, False
        rec = self._make_feedback(task_id, "supplement", value, unit, reviewer, remark)
        self.data["feedback"].append(rec.to_dict())
        self.save()
        return rec, True

    # ---- 人工反馈线：确认（幂等，按 任务+审核人 去重）----
    def add_confirm(self, task_id: str, reviewer: str = "cli", status: str = "ok",
                    value: str = "", unit: str = "", note: str = "") -> tuple[FeedbackRecord, bool]:
        for r in self.data["feedback"]:
            if r["task_id"] == task_id and r["action"] == "confirm" and r["reviewer"] == reviewer:
                return FeedbackRecord.from_dict(r), False
        rec = self._make_feedback(task_id, "confirm", value, unit, reviewer,
                                  note or f"人工确认：{status}")
        self.data["feedback"].append(rec.to_dict())
        self.save()
        return rec, True

    def _find_feedback(self, task_id: str, action: str, value: str, remark: str) -> Optional[FeedbackRecord]:
        for r in self.data["feedback"]:
            if (r["task_id"] == task_id and r["action"] == action
                    and r["value_raw"] == value and r["remark"] == remark):
                return FeedbackRecord.from_dict(r)
        return None

    def _make_feedback(self, task_id: str, action: str, value: str, unit: str,
                       reviewer: str, remark: str) -> FeedbackRecord:
        mp = parse_money(value, default_currency=unit or None)
        hp = parse_hours(value)
        if value.strip() == "":
            # 确认动作可以不填数值；补录/更正必须填
            if action == "confirm":
                parsed_amount, parsed_currency, parsed_hours = None, (unit or None), None
                ok, problem = True, ""
            else:
                parsed_amount, parsed_currency, parsed_hours = None, (unit or None), None
                ok, problem = False, "补录/更正需要填写数值（时长或金额）。"
        elif mp.ok and mp.amount is not None:
            parsed_amount, parsed_currency, parsed_hours = mp.amount, mp.currency, None
            ok, problem = True, ""
        elif hp.ok and hp.amount is not None:
            parsed_amount, parsed_currency, parsed_hours = None, (unit or None), hp.amount
            ok, problem = True, ""
        else:
            parsed_amount, parsed_currency, parsed_hours = None, (unit or None), None
            ok, problem = False, mp.problem or hp.problem

        fid = f"FB-{self.data['next_fb_id']:03d}"
        self.data["next_fb_id"] += 1
        rec = FeedbackRecord(
            fb_id=fid, task_id=task_id, action=action, reviewer=reviewer,
            value_raw=value, unit_raw=unit, remark=remark, ts=_now(),
            parsed_amount=parsed_amount, parsed_currency=parsed_currency,
            parsed_hours=parsed_hours, ok=ok, problem=problem,
        )
        known = {t["task_id"] for t in self.data["tasks"]}
        if task_id not in known:
            rec.problem = (rec.problem + " " if rec.problem else "") + \
                f"任务 {task_id} 在任务表里找不到，可能是漏登的任务，需要先补录任务再确认。"
            rec.ok = False
        return rec

    # ---- 分摊运行（幂等内容，每次留一个版本快照）----
    def run_allocate(self, note: str = "", usd_rate: Decimal = USD_TO_CNY_DEFAULT) -> AllocationRun:
        result: AllocationResult = allocate(
            self._tasks(), self._rules(), self._feedback(), usd_rate=usd_rate)
        snap = {
            "allocations": [a.to_dict() for a in result.allocations],
            "team_totals": _decimalize_totals(result.team_totals),
            "currency_totals": _decimalize_flat(result.currency_totals),
            "needs_attention": result.needs_attention,
            "before_after_summary": result.before_after_summary,
            "bad_feedback": [r.to_dict() for r in result.bad_feedback],
        }
        ver = self.data["next_run_version"]
        run = AllocationRun(version=ver, ts=_now(), note=note or f"第 {ver} 次分摊",
                            rolled_back=False, result=snap)
        self.data["runs"].append(run.to_dict())
        self.data["latest_version"] = ver
        self.data["next_run_version"] = ver + 1
        self.save()
        return run

    # ---- 版本回滚（丢记录但保留可查）----
    def rollback(self, version: int) -> AllocationRun:
        runs = {int(r["version"]): r for r in self.data["runs"]}
        if version not in runs:
            raise ValueError(f"找不到版本 {version}。")
        runs[version]["rolled_back"] = True
        # 回到该版本之前的最近一个未回滚版本
        prev = max((v for v in runs if v < version), default=None)
        if prev is not None:
            runs[prev]["rolled_back"] = False
            self.data["latest_version"] = prev
        else:
            self.data["latest_version"] = 0
        self.save()
        return AllocationRun.from_dict(runs[version])

    def get_run(self, version: Optional[int] = None) -> Optional[AllocationRun]:
        if version is None or version == 0:
            v = self.data["latest_version"]
        else:
            v = version
        for r in self.data["runs"]:
            if int(r["version"]) == v:
                return AllocationRun.from_dict(r)
        return None

    def list_runs(self) -> list[AllocationRun]:
        return [AllocationRun.from_dict(r) for r in self.data["runs"]]

    def rolled_back_runs(self) -> list[AllocationRun]:
        return [AllocationRun.from_dict(r) for r in self.data["runs"] if r.get("rolled_back")]


def _decimalize_totals(team_totals: dict) -> dict:
    return {team: {k: str(v) for k, v in vals.items()} for team, vals in team_totals.items()}


def _decimalize_flat(d: dict) -> dict:
    return {k: str(v) for k, v in d.items()}
