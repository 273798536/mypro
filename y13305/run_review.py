#!/usr/bin/env python3
"""病历问答证据复核运行器.

一条命令跑完整包样例:
    python run_review.py

确认某条人工改判后重跑(小孟人工确认):
    python run_review.py --confirm MR-003

把历史时间线对给别人看(社区公示前复盘):
    python run_review.py --timeline
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
OUT = BASE / "out"
HISTORY_PATH = OUT / "history.jsonl"
RECORDS_PATH = OUT / "processing_records.json"

SOURCES = {
    "sample_table": DATA / "sample_table.csv",
    "sample_table_old": DATA / "sample_table_old.csv",
    "manual_overrides": DATA / "manual_overrides.json",
    "verbal_notes": DATA / "verbal_notes.json",
    "model_misjudgment": DATA / "model_misjudgment.json",
}

BLOCK_KEYWORDS = ("先别用", "不对", "存疑", "不要用", "别用", "不准")


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def run_id() -> str:
    return hashlib.sha1(now_iso().encode()).hexdigest()[:8]


# ---------- data classes ----------
@dataclass
class SampleRow:
    sample_id: str
    question: str
    answer: str
    label: str
    reviewer: str = ""
    note: str = ""


@dataclass
class ManualOverride:
    sample_id: str
    from_label: str
    to_label: str
    reviewer: str
    reason: str
    ts: str
    confirmed: bool = False


@dataclass
class VerbalNote:
    sample_id: str
    note: str
    reporter: str
    ts: str


@dataclass
class ModelMisjudgment:
    sample_id: str
    question: str
    answer: str
    old_model_label: str
    new_model_label: str
    ground_truth: str
    explanation: str
    ts: str


@dataclass
class Conflict:
    sample_id: str
    kinds: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    reason: str = ""
    impact: str = ""
    stuck: bool = False


# ---------- loaders ----------
def load_sample_table(path: Path) -> list[SampleRow]:
    rows: list[SampleRow] = []
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append(
                SampleRow(
                    sample_id=r["sample_id"].strip(),
                    question=r["question"].strip(),
                    answer=r["answer"].strip(),
                    label=r["label"].strip(),
                    reviewer=r.get("reviewer", "").strip(),
                    note=r.get("note", "").strip(),
                )
            )
    return rows


def load_json_list(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_manual(path: Path) -> list[ManualOverride]:
    return [ManualOverride(**r) for r in load_json_list(path)]


def load_verbal(path: Path) -> list[VerbalNote]:
    return [VerbalNote(**r) for r in load_json_list(path)]


def load_model(path: Path) -> list[ModelMisjudgment]:
    return [ModelMisjudgment(**r) for r in load_json_list(path)]


# ---------- history ----------
def append_history(event: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    line = {"ts": now_iso(), **event}
    with HISTORY_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(line, ensure_ascii=False) + "\n")


def read_history() -> list[dict]:
    if not HISTORY_PATH.exists():
        return []
    out = []
    with HISTORY_PATH.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


# ---------- core review ----------
def review(confirm: list[str] | None = None) -> tuple[list[Conflict], list[ModelMisjudgment], dict]:
    confirm = confirm or []
    run = run_id()
    append_history({"event": "review_run_start", "run_id": run, "confirm": confirm})

    samples = load_sample_table(SOURCES["sample_table"])
    old_by_id = {s.sample_id: s for s in load_sample_table(SOURCES["sample_table_old"])}
    manuals = load_manual(SOURCES["manual_overrides"])
    verbals = load_verbal(SOURCES["verbal_notes"])
    models = load_model(SOURCES["model_misjudgment"])

    manual_by_id = {m.sample_id: m for m in manuals}
    verbal_by_id: dict[str, list[VerbalNote]] = {}
    for v in verbals:
        verbal_by_id.setdefault(v.sample_id, []).append(v)

    # apply confirmations -> 落人工确认前后变化进历史
    for m in manuals:
        before = m.confirmed
        if m.sample_id in confirm and not before:
            m.confirmed = True
            append_history(
                {
                    "event": "manual_override_confirmed",
                    "sample_id": m.sample_id,
                    "from_label": m.from_label,
                    "to_label": m.to_label,
                    "reviewer": m.reviewer,
                    "reason": m.reason,
                    "before_confirmed": False,
                    "after_confirmed": True,
                }
            )

    conflicts: list[Conflict] = []
    for s in samples:
        sid = s.sample_id
        src_lines: list[str] = [f"样本表(当前):{s.label}"]
        old = old_by_id.get(sid)
        if old:
            src_lines.append(f"旧版样本表(v{old.reviewer and '1.0'}):{old.label}")
        m = manual_by_id.get(sid)
        if m:
            src_lines.append(
                f"人工改判:{m.from_label}->{m.to_label}(已确认:{'是' if m.confirmed else '否'})"
            )
        vn = verbal_by_id.get(sid)
        if vn:
            src_lines.append("口头备注:" + ";".join(x.note for x in vn))

        kinds: list[str] = []
        reasons: list[str] = []
        impacts: list[str] = []
        stuck = False

        # 1) 旧版样本表标签漂移
        if old and old.label != s.label:
            if m and m.to_label == old.label:
                kinds.append("version_drift_with_manual")
                reasons.append(
                    f"旧版({old.label})与当前({s.label})不一致,人工改判指向{m.to_label}"
                )
            else:
                kinds.append("unresolved_version_drift")
                reasons.append(
                    f"旧版样本表({old.label})与当前样本表({s.label})不一致,无人工改判佐证"
                )
                impacts.append("1条样本,直接影响训练集纳入结论")
                stuck = True

        # 2) 人工改判未确认 -> 改判前后变化尚未确认,卡住
        if m and not m.confirmed:
            kinds.append("manual_override_pending")
            reasons.append(
                f"人工改判({m.from_label}->{m.to_label})尚未确认,不计入结论"
            )
            impacts.append("1条样本,改判未确认前不计入结论")
            stuck = True

        # 3) 口头备注阻断"支持"
        if vn:
            blocked = any(kw in n.note for n in vn for kw in BLOCK_KEYWORDS)
            if blocked and s.label == "支持":
                kinds.append("verbal_block")
                reasons.append("口头备注要求'先别用',与样本表'支持'冲突")
                impacts.append("1条样本,被口头备注阻断")
                stuck = True

        if kinds:
            cf = Conflict(
                sample_id=sid,
                kinds=kinds,
                sources=src_lines,
                reason=";".join(reasons),
                impact=";".join(impacts) if impacts else "1条样本需关注",
                stuck=stuck,
            )
            conflicts.append(cf)
            append_history(
                {
                    "event": "conflict_detected" if stuck else "conflict_noted",
                    "run_id": run,
                    "sample_id": sid,
                    "kinds": kinds,
                    "sources": src_lines,
                    "reason": cf.reason,
                    "impact": cf.impact,
                    "stuck": stuck,
                }
            )

        # 人工改判前后状态进历史(无论是否卡住)
        if m and m.to_label != m.from_label:
            append_history(
                {
                    "event": "manual_override_state",
                    "run_id": run,
                    "sample_id": sid,
                    "before": {"label": m.from_label, "confirmed": False},
                    "after": {"label": m.to_label, "confirmed": m.confirmed},
                    "reviewer": m.reviewer,
                    "reason": m.reason,
                }
            )

    # 模型误判复盘: 旧模型误判样本放回,看新结果能否解释改判
    reconciled: list[ModelMisjudgment] = []
    for mm in models:
        explained = (mm.new_model_label == mm.ground_truth) and bool(mm.explanation)
        reconciled.append(mm)
        append_history(
            {
                "event": "model_reconciliation",
                "run_id": run,
                "sample_id": mm.sample_id,
                "old_model_label": mm.old_model_label,
                "new_model_label": mm.new_model_label,
                "ground_truth": mm.ground_truth,
                "explained": explained,
                "explanation": mm.explanation,
            }
        )

    stuck_conflicts = [c for c in conflicts if c.stuck]
    append_history(
        {
            "event": "review_run_end",
            "run_id": run,
            "stuck": [c.sample_id for c in stuck_conflicts],
            "exit_code": 1 if stuck_conflicts else 0,
        }
    )

    summary = {
        "run_id": run,
        "ts": now_iso(),
        "counts": {
            "samples": len(samples),
            "old_version": len(old_by_id),
            "manual_overrides": len(manuals),
            "verbal_notes": len(verbals),
            "model_misjudgments": len(models),
            "conflicts": len(conflicts),
            "stuck": len(stuck_conflicts),
        },
        "sources_loaded": {k: str(v.relative_to(BASE)) for k, v in SOURCES.items()},
    }
    return conflicts, reconciled, summary


# ---------- report ----------
def print_report(conflicts: list[Conflict], models: list[ModelMisjudgment], summary: dict) -> None:
    print("=" * 60)
    print("【病历问答证据复核】")
    print(f"  run_id: {summary['run_id']}  时间: {summary['ts']}")
    c = summary["counts"]
    print("  已加载样本源(分清谁影响了结论):")
    print(f"    - 样本表(当前)   : {SOURCES['sample_table'].name:<22} ({c['samples']} 条)")
    print(f"    - 旧版样本表     : {SOURCES['sample_table_old'].name:<22} ({c['old_version']} 条)")
    print(f"    - 人工改判       : {SOURCES['manual_overrides'].name:<22} ({c['manual_overrides']} 条)")
    print(f"    - 口头备注       : {SOURCES['verbal_notes'].name:<22} ({c['verbal_notes']} 条)")
    print(f"    - 旧模型误判样本 : {SOURCES['model_misjudgment'].name:<22} ({c['model_misjudgments']} 条)")
    print("-" * 60)
    print("【标签冲突检测】")
    if not conflicts:
        print("  无冲突,可计入最终结论。")
    else:
        for i, cf in enumerate(conflicts, 1):
            mark = "⚠ 冲突(卡住)" if cf.stuck else "· 关注"
            print(f"  {i}. {mark} {cf.sample_id} [{','.join(cf.kinds)}]")
            for s in cf.sources:
                print(f"       来源: {s}")
            print(f"       原因: {cf.reason}")
            print(f"       影响: {cf.impact}")
    print("-" * 60)
    print("【模型误判复盘】旧模型误判样本放回,看新结果能否解释改判")
    for mm in models:
        explained = mm.new_model_label == mm.ground_truth and bool(mm.explanation)
        flag = "✅ 新结果已解释改判" if explained else "❌ 新结果未能解释改判"
        print(f"  - {mm.sample_id}: 旧模型={mm.old_model_label} -> 新模型={mm.new_model_label} (真值={mm.ground_truth})")
        print(f"      {flag}")
        print(f"      解释: {mm.explanation}")
    print("-" * 60)
    stuck = [c for c in conflicts if c.stuck]
    print("【待确认】标签冲突不急着算完,先给原因和影响范围")
    if not stuck:
        print("  无待确认冲突,可进入社区公示。")
    else:
        print(f"  标签冲突卡在以下 {len(stuck)} 条样本,未计入最终结论:")
        for cf in stuck:
            print(f"    - {cf.sample_id}: 原因={cf.reason}")
            print(f"        影响范围={cf.impact}")
    print("-" * 60)
    print(f"【历史时间线】已追加: {HISTORY_PATH.relative_to(BASE)}")
    print(f"【处理记录  】已写入: {RECORDS_PATH.relative_to(BASE)}")
    print("=" * 60)
    if stuck:
        ids = ", ".join(c.sample_id for c in stuck)
        print(f"⚠ 退出原因: 标签冲突卡在 {ids}")
        for cf in stuck:
            print(f"    - {cf.sample_id}: {cf.reason}")
        confirm_hint = next(
            (c.sample_id for c in stuck if "manual_override_pending" in c.kinds),
            None,
        )
        hint = f"  请小孟确认后重跑,例如: python run_review.py --confirm {confirm_hint}" if confirm_hint else "  请小孟核实旧版与当前不一致后重跑。"
        print(hint)
        print("  本次不计入社区公示。")
    else:
        print("✅ 复核完成,无标签冲突,可进入社区公示。")
    print("=" * 60)


def print_timeline() -> None:
    events = read_history()
    print("=" * 60)
    print("【历史时间线】病历问答证据复核 - 给负责人/社区公示复盘用")
    print(f"  共 {len(events)} 条事件,来源: {HISTORY_PATH.relative_to(BASE)}")
    print("-" * 60)
    for e in events:
        ts = e.get("ts", "")
        ev = e.get("event", "")
        sid = e.get("sample_id", "")
        if ev == "review_run_start":
            print(f"  {ts} | RUN开始        | run_id={e.get('run_id')} confirm={e.get('confirm')}")
        elif ev == "review_run_end":
            print(f"  {ts} | RUN结束        | run_id={e.get('run_id')} 卡住={e.get('stuck')} 退出码={e.get('exit_code')}")
        elif ev == "manual_override_state":
            b = e.get("before", {})
            a = e.get("after", {})
            print(f"  {ts} | 人工改判状态   | {sid}: {b.get('label')}({b.get('confirmed')}) -> {a.get('label')}({a.get('confirmed')}) by {e.get('reviewer')}")
        elif ev == "manual_override_confirmed":
            print(f"  {ts} | 人工确认(后)   | {sid}: {e.get('from_label')} -> {e.get('to_label')} 已确认 by {e.get('reviewer')}")
        elif ev == "conflict_detected":
            print(f"  {ts} | 冲突(卡住)     | {sid} [{','.join(e.get('kinds', []))}] {e.get('reason')}")
        elif ev == "conflict_noted":
            print(f"  {ts} | 冲突(关注)     | {sid} [{','.join(e.get('kinds', []))}] {e.get('reason')}")
        elif ev == "model_reconciliation":
            flag = "已解释" if e.get("explained") else "未解释"
            print(f"  {ts} | 模型误判复盘   | {sid}: {e.get('old_model_label')} -> {e.get('new_model_label')} 真值={e.get('ground_truth')} [{flag}]")
        else:
            print(f"  {ts} | {ev:<14} | {sid} {json.dumps({k: v for k, v in e.items() if k not in ('ts', 'event', 'sample_id')}, ensure_ascii=False)}")
    print("=" * 60)


def write_records(conflicts: list[Conflict], models: list[ModelMisjudgment], summary: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    payload = {
        "summary": summary,
        "conflicts": [asdict(c) for c in conflicts],
        "model_reconciliation": [asdict(m) for m in models],
        "artifacts": {
            "样本表(当前)": str(SOURCES["sample_table"].relative_to(BASE)),
            "旧版样本表": str(SOURCES["sample_table_old"].relative_to(BASE)),
            "处理记录": str(RECORDS_PATH.relative_to(BASE)),
            "历史时间线": str(HISTORY_PATH.relative_to(BASE)),
        },
    }
    RECORDS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="病历问答证据复核运行器(一条命令跑完整包样例)")
    ap.add_argument("--confirm", nargs="*", default=[], metavar="SAMPLE_ID",
                   help="确认某条人工改判后重跑,例如 --confirm MR-003")
    ap.add_argument("--timeline", action="store_true",
                   help="只打印历史时间线,用于对给别人看/社区公示前复盘")
    args = ap.parse_args(argv)

    if args.timeline:
        print_timeline()
        return 0

    conflicts, models, summary = review(confirm=args.confirm)
    print_report(conflicts, models, summary)
    write_records(conflicts, models, summary)
    stuck = [c for c in conflicts if c.stuck]
    return 1 if stuck else 0


if __name__ == "__main__":
    sys.exit(main())
