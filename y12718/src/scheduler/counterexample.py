from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Iterable

from .models import Assignment, CounterExample, RowStatus, ProjectState
from .storage import next_id, save_state


def _filter_active(assignments: Iterable[Assignment]) -> list[Assignment]:
    return [a for a in assignments if a.status != RowStatus.REJECTED]


def check_overbooking(assignments: Iterable[Assignment]) -> list[CounterExample]:
    """反例规则: 同一人同一天排了多班 (工时冲突)。"""
    by_person_date: dict[tuple[str, str], list[Assignment]] = defaultdict(list)
    for a in _filter_active(assignments):
        by_person_date[(a.person, a.date)].append(a)

    ces: list[CounterExample] = []
    for (person, date), group in by_person_date.items():
        total_hours = sum(a.hours for a in group)
        if len(group) > 1 or total_hours > 12:
            ces.append(CounterExample(
                ce_id=next_id("ce"),
                rule="overbooking",
                description=f"{person} 在 {date} 排了 {len(group)} 个班次, 合计 {total_hours:.1f} 小时",
                affected_assignments=[a.assignment_id for a in group],
                severity="error" if total_hours > 12 else "warning",
                created_at=datetime.now().isoformat(timespec="seconds"),
            ))
    return ces


def check_gap_violation(assignments: Iterable[Assignment]) -> list[CounterExample]:
    """反例规则: 相邻班次间隔不足 (晚班+次日早班)。"""
    order = {"早": 0, "早班": 0, "morning": 0, "am": 0,
             "中": 1, "中班": 1, "mid": 1, "noon": 1,
             "晚": 2, "晚班": 2, "night": 2, "pm": 2,
             "全天": 3, "all": 3, "full": 3}
    by_person: dict[str, dict[str, Assignment]] = defaultdict(dict)
    for a in _filter_active(assignments):
        by_person[a.person][a.date] = a

    ces: list[CounterExample] = []
    for person, schedule in by_person.items():
        dates = sorted(schedule.keys())
        for i in range(len(dates) - 1):
            d1, d2 = dates[i], dates[i + 1]
            s1 = order.get(schedule[d1].shift, -1)
            s2 = order.get(schedule[d2].shift, -1)
            if s1 == 2 and s2 == 0:
                ces.append(CounterExample(
                    ce_id=next_id("ce"),
                    rule="gap_violation",
                    description=f"{person} {d1} 晚班后 {d2} 早班, 间隔不足",
                    affected_assignments=[schedule[d1].assignment_id, schedule[d2].assignment_id],
                    severity="warning",
                    created_at=datetime.now().isoformat(timespec="seconds"),
                ))
    return ces


def _norm_shift(shift: str) -> str:
    s = shift.lower()
    if s in {"早", "早班", "morning", "am"}:
        return "早"
    if s in {"中", "中班", "mid", "noon"}:
        return "中"
    if s in {"晚", "晚班", "night", "pm"}:
        return "晚"
    if s in {"全天", "all", "full"}:
        return "全天"
    return shift


def check_coverage(assignments: Iterable[Assignment]) -> list[CounterExample]:
    """反例规则: 某天某班次缺人。"""
    by_date_shift: dict[tuple[str, str], list[Assignment]] = defaultdict(list)
    all_dates: set[str] = set()
    for a in _filter_active(assignments):
        all_dates.add(a.date)
        by_date_shift[(a.date, _norm_shift(a.shift))].append(a)
    ces: list[CounterExample] = []
    for date in sorted(all_dates):
        for shift in ("早", "中", "晚"):
            if not by_date_shift.get((date, shift)) and not by_date_shift.get((date, "全天")):
                ces.append(CounterExample(
                    ce_id=next_id("ce"),
                    rule="coverage_gap",
                    description=f"{date} {shift}班 无人排班",
                    affected_assignments=[],
                    severity="info",
                    created_at=datetime.now().isoformat(timespec="seconds"),
                ))
    return ces


def check_pending(assignments: Iterable[Assignment]) -> list[CounterExample]:
    """反例规则: 待确认条目。"""
    ces: list[CounterExample] = []
    for a in assignments:
        if a.status == RowStatus.PENDING:
            ces.append(CounterExample(
                ce_id=next_id("ce"),
                rule="pending_review",
                description=f"{a.person} {a.date} {a.shift} 待确认",
                affected_assignments=[a.assignment_id],
                severity="info",
                created_at=datetime.now().isoformat(timespec="seconds"),
            ))
    return ces


def run_all_checks(state: ProjectState, output_dir) -> list[CounterExample]:
    assignments = list(state.assignments.values())
    state.counter_examples = []
    for fn in (check_overbooking, check_gap_violation, check_coverage, check_pending):
        state.counter_examples.extend(fn(assignments))
    state.touch()
    save_state(output_dir, state)
    return state.counter_examples
