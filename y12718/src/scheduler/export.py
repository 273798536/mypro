from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path
from typing import Iterable

from .models import Assignment, RowStatus, ProjectState

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover
    plt = None


def export_assignments_csv(state: ProjectState, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(state.assignments.values())
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["assignment_id", "person", "date", "shift", "hours", "status", "source_rows", "created_at", "updated_at"])
        for a in rows:
            w.writerow([
                a.assignment_id, a.person, a.date, a.shift, a.hours,
                a.status.value,
                ";".join(a.source_rows), a.created_at, a.updated_at,
            ])
    return path


def export_audit_csv(state: ProjectState, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["record_id", "timestamp", "assignment_id", "operator", "comment", "before", "after"])
        for r in state.audit:
            import json
            w.writerow([
                r.record_id, r.timestamp, r.assignment_id, r.operator, r.comment,
                json.dumps(r.before, ensure_ascii=False),
                json.dumps(r.after, ensure_ascii=False),
            ])
    return path


def export_counterexamples_csv(state: ProjectState, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ce_id", "severity", "rule", "description", "affected_assignments", "created_at"])
        for ce in state.counter_examples:
            w.writerow([
                ce.ce_id, ce.severity, ce.rule, ce.description,
                ";".join(ce.affected_assignments), ce.created_at,
            ])
    return path


def _active(assignments: Iterable[Assignment]):
    return [a for a in assignments if a.status != RowStatus.REJECTED]


def chart_hours_by_person(state: ProjectState, path: Path) -> Path | None:
    if plt is None:
        return None
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    agg: dict[str, float] = defaultdict(float)
    for a in _active(state.assignments.values()):
        agg[a.person] += a.hours
    if not agg:
        return None
    people = sorted(agg)
    hours = [agg[p] for p in people]
    fig, ax = plt.subplots(figsize=(max(6, len(people) * 0.6), 4))
    ax.bar(people, hours, color="#4C6EF5")
    ax.set_title("各助教工时分布")
    ax.set_xlabel("助教")
    ax.set_ylabel("总工时 (小时)")
    plt.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def chart_shift_counts(state: ProjectState, path: Path) -> Path | None:
    if plt is None:
        return None
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    dates = sorted({a.date for a in _active(state.assignments.values())})
    if not dates:
        return None
    shift_order = ["早", "中", "晚"]
    data = defaultdict(lambda: defaultdict(int))
    for a in _active(state.assignments.values()):
        data[a.date][a.shift] += 1
    fig, ax = plt.subplots(figsize=(max(6, len(dates) * 0.8), 4))
    bottom = [0] * len(dates)
    colors = {"早": "#FFD43B", "中": "#F59F00", "晚": "#7950F2"}
    for s in shift_order:
        vals = [data[d].get(s, 0) for d in dates]
        ax.bar(dates, vals, bottom=bottom, label=s, color=colors.get(s, "#CCCCCC"))
        bottom = [b + v for b, v in zip(bottom, vals)]
    ax.set_title("每日班次分布")
    ax.set_xlabel("日期")
    ax.set_ylabel("班次数量")
    ax.legend()
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def chart_status_pie(state: ProjectState, path: Path) -> Path | None:
    if plt is None:
        return None
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    statuses = [a.status.value for a in state.assignments.values()]
    if not statuses:
        return None
    from collections import Counter
    cnt = Counter(statuses)
    labels = list(cnt.keys())
    sizes = list(cnt.values())
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.pie(sizes, labels=labels, autopct="%1.1f%%", startangle=90)
    ax.set_title("排班状态分布")
    plt.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def export_all(state: ProjectState, output_dir: Path) -> dict[str, Path | None]:
    output_dir = Path(output_dir)
    exports_dir = output_dir / "exports"
    charts_dir = output_dir / "charts"
    result: dict[str, Path | None] = {}
    result["assignments_csv"] = export_assignments_csv(state, exports_dir / "assignments.csv")
    result["audit_csv"] = export_audit_csv(state, exports_dir / "audit_log.csv")
    result["counterexamples_csv"] = export_counterexamples_csv(state, exports_dir / "counterexamples.csv")
    result["hours_person"] = chart_hours_by_person(state, charts_dir / "hours_by_person.png")
    result["shift_counts"] = chart_shift_counts(state, charts_dir / "shift_counts.png")
    result["status_pie"] = chart_status_pie(state, charts_dir / "status_pie.png")
    return result
