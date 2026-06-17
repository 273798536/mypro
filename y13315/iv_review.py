#!/usr/bin/env python3
"""工业视觉证据复核 (Industrial Vision Evidence Review).

一个稳定可纳入日常脚本的 CLI：读取 CSV 样本表，把模型预测与人工判断
沉淀成只追加的历史（备注/旧版本截图/人工修正都留在历史里，不被最终值盖掉），
换模型版本也不覆盖旧的人工判断；坏数据隔离并指向样本表里的原始行与具体对象；
产出说明变化与影响范围的 Markdown 报告，并支持对照两次复核结果看差异。
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

TOOL_NAME = "iv-review"
TOOL_VERSION = "1.0.0"
SCHEMA_VERSION = 1

REQUIRED_COLUMNS = [
    "sample_id", "image_ref", "object", "model_version",
    "model_prediction", "confidence", "manual_label",
    "manual_by", "notes", "screenshot_ref",
]
REQUIRED_FIELDS = ["sample_id"]

EXIT_OK = 0
EXIT_UNEXPECTED = 1
EXIT_INPUT_NOT_FOUND = 10
EXIT_HISTORY_IO = 11
EXIT_SCHEMA_ERROR = 12
EXIT_BAD_DATA_STRICT = 21
EXIT_RUN_NOT_FOUND = 22

ERROR_MESSAGES = {
    "E_INPUT_NOT_FOUND": "样本表不存在或不可读: {path}",
    "E_HISTORY_IO": "历史存储读写失败: {path}: {detail}",
    "E_SCHEMA_MISSING_HEADER": "样本表表头缺失必要列，期望包含: {expected}，实际: {actual}",
    "E_MISSING_REQUIRED": "第 {line} 行缺少必填字段 {field}，具体对象={object}",
    "E_DUPLICATE_ID": "第 {line} 行 sample_id 重复: {sample_id}（首次出现在第 {first_line} 行）",
    "E_NO_RUNS": "历史中没有可比较的复核记录，无法生成差异",
    "E_RUN_NOT_FOUND": "历史中找不到复核记录: {run_id}",
    "E_BAD_DATA_STRICT": "严格模式下检测到 {count} 条坏数据，已中止（非严格模式会隔离后继续）",
}

EXIT_CODE_MAP = {
    "E_INPUT_NOT_FOUND": EXIT_INPUT_NOT_FOUND,
    "E_HISTORY_IO": EXIT_HISTORY_IO,
    "E_SCHEMA_MISSING_HEADER": EXIT_SCHEMA_ERROR,
    "E_BAD_DATA_STRICT": EXIT_BAD_DATA_STRICT,
    "E_RUN_NOT_FOUND": EXIT_RUN_NOT_FOUND,
    "E_NO_RUNS": EXIT_UNEXPECTED,
}

CHANGE_LABELS = {
    "added": "新增样本",
    "model_version_changed": "模型版本变更",
    "prediction_changed": "模型预测变更",
    "manual_added": "新增人工判断",
    "manual_changed": "人工判断变更",
    "notes_added": "补备注（保留进历史）",
    "notes_changed": "备注变更（保留进历史）",
    "screenshot_added": "补旧版本截图（保留进历史）",
    "screenshot_changed": "截图变更（保留进历史）",
    "unchanged": "未变化",
    "imported": "导入基线",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_run_id(model_version: str, ts: str | None = None) -> str:
    return f"{ts or now_iso()}#{model_version}"


class ReviewError(Exception):
    def __init__(self, code: str, **kwargs: Any):
        self.code = code
        self.kwargs = kwargs
        super().__init__(ERROR_MESSAGES.get(code, code).format(**kwargs))


@dataclass
class SampleRow:
    sample_id: str
    image_ref: str
    object: str
    model_version: str
    model_prediction: str
    confidence: str
    manual_label: str
    manual_by: str
    notes: str
    screenshot_ref: str
    source_line: int


@dataclass
class Quarantine:
    source_line: int
    sample_id: str
    object: str
    reason_code: str
    message: str


@dataclass
class HistoryRecord:
    run_id: str
    run_kind: str
    timestamp: str
    model_version: str
    model_prediction: str
    confidence: str
    manual_label: str
    manual_by: str
    notes: str
    screenshot_ref: str
    source_line: int
    change: str = "unchanged"


@dataclass
class RunMeta:
    run_id: str
    run_kind: str
    timestamp: str
    model_version: str
    input_path: str
    good_count: int
    quarantined_count: int


@dataclass
class ChangeItem:
    sample_id: str
    object: str
    source_line: int
    change: str
    detail: str
    old: str = ""
    new: str = ""


@dataclass
class ReviewResult:
    run_id: str
    run_kind: str
    timestamp: str
    model_version: str
    input_path: str
    changes: list[ChangeItem] = field(default_factory=list)
    quarantined: list[Quarantine] = field(default_factory=list)
    impact_rows: list[dict] = field(default_factory=list)
    manual_preserved: list[dict] = field(default_factory=list)
    boundary_samples: list[dict] = field(default_factory=list)
    diff_vs_previous: dict = field(default_factory=dict)
    good_count: int = 0
    prev_run_id: str = ""


def load_sample_table(path: str) -> tuple[list[SampleRow], list[Quarantine]]:
    if not os.path.isfile(path):
        raise ReviewError("E_INPUT_NOT_FOUND", path=path)
    good: list[SampleRow] = []
    quarantined: list[Quarantine] = []
    seen: dict[str, int] = {}
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            raise ReviewError("E_SCHEMA_MISSING_HEADER",
                              expected=REQUIRED_COLUMNS, actual=[])
        header = [h.strip() for h in header]
        missing = [c for c in REQUIRED_COLUMNS if c not in header]
        if missing:
            raise ReviewError("E_SCHEMA_MISSING_HEADER",
                              expected=REQUIRED_COLUMNS, actual=header)
        idx = {c: header.index(c) for c in REQUIRED_COLUMNS}
        header_len = len(header)
        line_no = 1
        for raw in reader:
            line_no += 1
            if not raw or all((c is None or str(c).strip() == "") for c in raw):
                continue
            if len(raw) < header_len:
                raw = list(raw) + [""] * (header_len - len(raw))

            def get(c: str) -> str:
                v = raw[idx[c]]
                return v.strip() if isinstance(v, str) else ("" if v is None else str(v))

            sample_id = get("sample_id")
            obj = get("object")
            if not sample_id:
                quarantined.append(Quarantine(
                    line_no, sample_id, obj, "E_MISSING_REQUIRED",
                    ERROR_MESSAGES["E_MISSING_REQUIRED"].format(
                        line=line_no, field="sample_id", object=obj or "—")))
                continue
            if sample_id in seen:
                quarantined.append(Quarantine(
                    line_no, sample_id, obj, "E_DUPLICATE_ID",
                    ERROR_MESSAGES["E_DUPLICATE_ID"].format(
                        line=line_no, sample_id=sample_id, first_line=seen[sample_id])))
                continue
            seen[sample_id] = line_no
            good.append(SampleRow(
                sample_id=sample_id,
                image_ref=get("image_ref"),
                object=obj,
                model_version=get("model_version"),
                model_prediction=get("model_prediction"),
                confidence=get("confidence"),
                manual_label=get("manual_label"),
                manual_by=get("manual_by"),
                notes=get("notes"),
                screenshot_ref=get("screenshot_ref"),
                source_line=line_no,
            ))
    return good, quarantined


class History:
    def __init__(self, path: str):
        self.path = path
        self.schema_version = SCHEMA_VERSION
        self.samples: dict[str, list[HistoryRecord]] = {}
        self.runs: list[RunMeta] = []

    @classmethod
    def load(cls, path: str) -> "History":
        h = cls(path)
        if not os.path.exists(path):
            return h
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            raise ReviewError("E_HISTORY_IO", path=path, detail=str(e))
        h.schema_version = data.get("schema_version", SCHEMA_VERSION)
        for sid, recs in data.get("samples", {}).items():
            h.samples[sid] = [HistoryRecord(**r) for r in recs]
        for r in data.get("runs", []):
            h.runs.append(RunMeta(**r))
        return h

    def save(self) -> None:
        data = {
            "schema_version": self.schema_version,
            "tool_version": TOOL_VERSION,
            "samples": {sid: [asdict(r) for r in recs]
                        for sid, recs in self.samples.items()},
            "runs": [asdict(r) for r in self.runs],
        }
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except OSError as e:
            raise ReviewError("E_HISTORY_IO", path=self.path, detail=str(e))

    def last_record(self, sample_id: str) -> HistoryRecord | None:
        recs = self.samples.get(sample_id)
        return recs[-1] if recs else None

    def effective_manual_label(self, sample_id: str) -> str:
        for r in reversed(self.samples.get(sample_id, [])):
            if r.manual_label:
                return r.manual_label
        return ""

    def latest_run(self) -> RunMeta | None:
        return self.runs[-1] if self.runs else None

    def run_index(self) -> dict[str, RunMeta]:
        return {r.run_id: r for r in self.runs}

    def records_of_run(self, run_id: str) -> dict[str, HistoryRecord]:
        out: dict[str, HistoryRecord] = {}
        for recs in self.samples.values():
            for r in recs:
                if r.run_id == run_id:
                    out.setdefault(r.sample_id, r)
        return out


def run_review(input_path: str, history: History, model_version: str,
               run_id: str, run_kind: str = "review") -> ReviewResult:
    good, quarantined = load_sample_table(input_path)
    prev_run = history.latest_run()
    timestamp = now_iso()
    result = ReviewResult(
        run_id=run_id, run_kind=run_kind, timestamp=timestamp,
        model_version=model_version, input_path=input_path,
        quarantined=quarantined, good_count=len(good),
        prev_run_id=prev_run.run_id if prev_run else "",
    )
    changed_samples: set[str] = set()

    for row in good:
        last = history.last_record(row.sample_id)
        prior_eff = history.effective_manual_label(row.sample_id)
        row_changes: list[ChangeItem] = []

        if last is None:
            row_changes.append(ChangeItem(
                row.sample_id, row.object, row.source_line, "added",
                CHANGE_LABELS["added"], new=row.sample_id))
            disagree = bool(row.manual_label) and row.model_prediction != row.manual_label
            result.boundary_samples.append({
                "sample_id": row.sample_id,
                "object": row.object or "—",
                "source_line": row.source_line,
                "model_prediction": row.model_prediction or "—",
                "manual_label": row.manual_label or "—",
                "disagreement": disagree,
                "note": "模型与人工不一致，疑似边界/难例" if disagree else "新增样本",
            })
        else:
            if row.model_version != last.model_version:
                row_changes.append(ChangeItem(
                    row.sample_id, row.object, row.source_line,
                    "model_version_changed", CHANGE_LABELS["model_version_changed"],
                    old=last.model_version, new=row.model_version))
            if row.model_prediction != last.model_prediction:
                row_changes.append(ChangeItem(
                    row.sample_id, row.object, row.source_line,
                    "prediction_changed", CHANGE_LABELS["prediction_changed"],
                    old=last.model_prediction, new=row.model_prediction))
            if row.manual_label:
                if not last.manual_label:
                    row_changes.append(ChangeItem(
                        row.sample_id, row.object, row.source_line,
                        "manual_added", CHANGE_LABELS["manual_added"],
                        new=row.manual_label))
                elif row.manual_label != last.manual_label:
                    row_changes.append(ChangeItem(
                        row.sample_id, row.object, row.source_line,
                        "manual_changed", CHANGE_LABELS["manual_changed"],
                        old=last.manual_label, new=row.manual_label))
            if row.notes and row.notes != last.notes:
                tag = "notes_added" if not last.notes else "notes_changed"
                row_changes.append(ChangeItem(
                    row.sample_id, row.object, row.source_line, tag,
                    CHANGE_LABELS[tag], old=last.notes, new=row.notes))
            if row.screenshot_ref and row.screenshot_ref != last.screenshot_ref:
                tag = "screenshot_added" if not last.screenshot_ref else "screenshot_changed"
                row_changes.append(ChangeItem(
                    row.sample_id, row.object, row.source_line, tag,
                    CHANGE_LABELS[tag], old=last.screenshot_ref,
                    new=row.screenshot_ref))

        if row_changes:
            changed_samples.add(row.sample_id)
        result.changes.extend(row_changes)

        rec = HistoryRecord(
            run_id=run_id, run_kind=run_kind, timestamp=timestamp,
            model_version=row.model_version or model_version,
            model_prediction=row.model_prediction,
            confidence=row.confidence,
            manual_label=row.manual_label,
            manual_by=row.manual_by,
            notes=row.notes,
            screenshot_ref=row.screenshot_ref,
            source_line=row.source_line,
            change=row_changes[0].change if row_changes else "unchanged",
        )
        history.samples.setdefault(row.sample_id, []).append(rec)

        model_changed = last is not None and row.model_version != last.model_version
        if model_changed and prior_eff and not row.manual_label:
            result.manual_preserved.append({
                "sample_id": row.sample_id,
                "object": row.object or "—",
                "source_line": row.source_line,
                "preserved_label": prior_eff,
                "model_version_old": last.model_version,
                "model_version_new": row.model_version,
                "note": "模型版本变更，旧的人工判断保留在历史中，未被新预测盖掉",
            })

    result.impact_rows = sorted(
        [{"sample_id": row.sample_id, "object": row.object or "—",
          "source_line": row.source_line}
         for row in good if row.sample_id in changed_samples],
        key=lambda r: r["sample_id"])
    return result


def diff_runs(history: History, run_a_id: str, run_b_id: str) -> dict:
    a = history.records_of_run(run_a_id)
    b = history.records_of_run(run_b_id)
    added = sorted(set(b) - set(a))
    removed = sorted(set(a) - set(b))
    changed = []
    for sid in sorted(set(a) & set(b)):
        if a[sid].model_prediction != b[sid].model_prediction:
            changed.append({
                "sample_id": sid,
                "object": b[sid].object or "—",
                "source_line": b[sid].source_line,
                "old": a[sid].model_prediction,
                "new": b[sid].model_prediction,
                "manual_effective": history.effective_manual_label(sid) or "—",
            })
    return {
        "run_a": run_a_id, "run_b": run_b_id,
        "added": added, "removed": removed,
        "prediction_changed": changed,
    }


def md_table(headers: list[str], rows: list[list[Any]]) -> str:
    lines = ["| " + " | ".join(headers) + " |",
             "| " + " | ".join(["---"] * len(headers)) + " |"]
    for r in rows:
        cells = [str(c).replace("\n", " ").replace("|", "\\|") for c in r]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def build_markdown(result: ReviewResult, history: History) -> str:
    parts: list[str] = []
    parts.append(f"# 工业视觉证据复核报告\n")
    parts.append(f"> 工具 {TOOL_NAME} v{TOOL_VERSION} · schema v{SCHEMA_VERSION}\n")

    parts.append("## 1. 复核摘要\n")
    parts.append(md_table(
        ["项", "值"],
        [
            ["run_id", result.run_id],
            ["类型", result.run_kind],
            ["时间(UTC)", result.timestamp],
            ["模型版本", result.model_version],
            ["样本表", result.input_path],
            ["有效样本数", result.good_count],
            ["隔离坏数据数", len(result.quarantined)],
            ["受影响样本数", len(result.impact_rows)],
            ["上一轮 run_id", result.prev_run_id or "—"],
        ]))
    parts.append("")

    parts.append("## 2. 影响范围\n")
    if result.impact_rows:
        parts.append(md_table(
            ["受影响 sample_id", "具体对象", "样本表原始行"],
            [[r["sample_id"], r["object"], r["source_line"]]
             for r in result.impact_rows]))
    else:
        parts.append("本轮无样本发生变化。")
    parts.append("")

    parts.append("## 3. 变更明细\n")
    if result.changes:
        parts.append(md_table(
            ["sample_id", "具体对象", "原始行", "变更类型", "说明", "旧值", "新值"],
            [[c.sample_id, c.object or "—", c.source_line,
              CHANGE_LABELS.get(c.change, c.change), c.detail,
              c.old or "—", c.new or "—"] for c in result.changes]))
    else:
        parts.append("本轮未检测到任何变更。")
    parts.append("")

    parts.append("## 4. 人工判断保留（未被新结果盖掉）\n")
    if result.manual_preserved:
        parts.append("下列样本模型版本已变更，但旧的人工判断保留在历史中，**未被新模型预测覆盖**：\n")
        parts.append(md_table(
            ["sample_id", "具体对象", "原始行", "保留的人工判断",
             "旧模型版本", "新模型版本", "说明"],
            [[m["sample_id"], m["object"], m["source_line"], m["preserved_label"],
              m["model_version_old"], m["model_version_new"], m["note"]]
             for m in result.manual_preserved]))
    else:
        parts.append("本轮无“模型版本变更但人工判断需保留”的样本。")
    parts.append("")

    parts.append("## 5. 新增 / 边界样本\n")
    if result.boundary_samples:
        parts.append(md_table(
            ["sample_id", "具体对象", "原始行", "模型预测", "人工判断",
             "是否不一致", "备注"],
            [[b["sample_id"], b["object"], b["source_line"],
              b["model_prediction"], b["manual_label"],
              "是" if b["disagreement"] else "否", b["note"]]
             for b in result.boundary_samples]))
    else:
        parts.append("本轮无新增样本。")
    parts.append("")

    parts.append("## 6. 坏数据隔离（指向原始行与具体对象）\n")
    if result.quarantined:
        parts.append("下列行已被隔离，不参与本轮复核，避免把复核带偏：\n")
        parts.append(md_table(
            ["样本表原始行", "sample_id", "具体对象", "原因码", "失败提示"],
            [[q.source_line, q.sample_id or "—", q.object or "—",
              q.reason_code, q.message] for q in result.quarantined]))
    else:
        parts.append("本轮未发现坏数据。")
    parts.append("")

    parts.append("## 7. 与上一轮复核差异\n")
    diff = result.diff_vs_previous
    if diff:
        parts.append(f"对照 `{diff['run_a']}` → `{diff['run_b']}`：\n")
        parts.append(md_table(
            ["维度", "数量", "明细"],
            [
                ["新增样本", len(diff["added"]), ", ".join(diff["added"]) or "—"],
                ["消失样本", len(diff["removed"]), ", ".join(diff["removed"]) or "—"],
                ["预测变化", len(diff["prediction_changed"]),
                 ", ".join(f"{c['sample_id']}({c['old']}→{c['new']})"
                           for c in diff["prediction_changed"]) or "—"],
            ]))
        if diff["prediction_changed"]:
            parts.append("")
            parts.append("预测变化明细（含保留的人工判断）：\n")
            parts.append(md_table(
                ["sample_id", "具体对象", "原始行", "旧预测", "新预测", "生效人工判断"],
                [[c["sample_id"], c["object"], c["source_line"],
                  c["old"], c["new"], c["manual_effective"]]
                 for c in diff["prediction_changed"]]))
    else:
        parts.append("无上一轮复核记录，跳过差异对照。")
    parts.append("")

    parts.append("## 8. 稳定参数与失败提示参考（供排班脚本对照）\n")
    parts.append("**稳定参数**：`-i/--input`、`-H/--history`、`-r/--report`、"
                 "`--model-version`、`--run-id`、`--strict`、`--from`、`--to`。\n")
    parts.append(md_table(
        ["退出码", "含义"],
        [
            [f"{EXIT_OK}", "成功"],
            [f"{EXIT_INPUT_NOT_FOUND}", "样本表不存在或不可读"],
            [f"{EXIT_HISTORY_IO}", "历史存储读写失败"],
            [f"{EXIT_SCHEMA_ERROR}", "样本表表头缺失必要列"],
            [f"{EXIT_BAD_DATA_STRICT}", "严格模式检测到坏数据已中止"],
            [f"{EXIT_RUN_NOT_FOUND}", "diff 指定的 run_id 不存在"],
        ]))
    parts.append("")
    return "\n".join(parts)


def build_diff_markdown(diff: dict) -> str:
    parts: list[str] = []
    parts.append(f"# 工业视觉证据复核 · 两次结果差异\n")
    parts.append(f"对照 `{diff['run_a']}` → `{diff['run_b']}`：\n")
    parts.append(md_table(
        ["维度", "数量", "明细"],
        [
            ["新增样本", len(diff["added"]), ", ".join(diff["added"]) or "—"],
            ["消失样本", len(diff["removed"]), ", ".join(diff["removed"]) or "—"],
            ["预测变化", len(diff["prediction_changed"]),
             ", ".join(f"{c['sample_id']}({c['old']}→{c['new']})"
                       for c in diff["prediction_changed"]) or "—"],
        ]))
    if diff["prediction_changed"]:
        parts.append("")
        parts.append(md_table(
            ["sample_id", "具体对象", "原始行", "旧预测", "新预测", "生效人工判断"],
            [[c["sample_id"], c["object"], c["source_line"],
              c["old"], c["new"], c["manual_effective"]]
             for c in diff["prediction_changed"]]))
    parts.append("")
    return "\n".join(parts)


def handle_quarantine(quarantined: list[Quarantine], strict: bool) -> None:
    for q in quarantined:
        print(f"[{TOOL_NAME}] 坏数据隔离: 第 {q.source_line} 行 "
              f"sample_id={q.sample_id or '—'} 对象={q.object or '—'} "
              f"原因={q.reason_code}: {q.message}", file=sys.stderr)
    if strict and quarantined:
        raise ReviewError("E_BAD_DATA_STRICT", count=len(quarantined))


def write_text(path: str, content: str) -> None:
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    except OSError as e:
        raise ReviewError("E_HISTORY_IO", path=path, detail=str(e))


def cmd_import(args: argparse.Namespace) -> int:
    history = History.load(args.history)
    good, quarantined = load_sample_table(args.input)
    handle_quarantine(quarantined, args.strict)
    run_id = args.run_id or make_run_id(args.model_version)
    ts = now_iso()
    for row in good:
        rec = HistoryRecord(
            run_id=run_id, run_kind="import", timestamp=ts,
            model_version=row.model_version or args.model_version,
            model_prediction=row.model_prediction, confidence=row.confidence,
            manual_label=row.manual_label, manual_by=row.manual_by,
            notes=row.notes, screenshot_ref=row.screenshot_ref,
            source_line=row.source_line, change="imported")
        history.samples.setdefault(row.sample_id, []).append(rec)
    history.runs.append(RunMeta(run_id, "import", ts, args.model_version,
                                args.input, len(good), len(quarantined)))
    history.save()
    print(f"[{TOOL_NAME}] import done run_id={run_id} "
          f"model_version={args.model_version} good={len(good)} "
          f"quarantined={len(quarantined)}", file=sys.stderr)
    return EXIT_OK


def cmd_review(args: argparse.Namespace) -> int:
    history = History.load(args.history)
    run_id = args.run_id or make_run_id(args.model_version)
    result = run_review(args.input, history, args.model_version, run_id, "review")
    handle_quarantine(result.quarantined, args.strict)
    if result.prev_run_id:
        result.diff_vs_previous = diff_runs(history, result.prev_run_id, run_id)
    history.runs.append(RunMeta(run_id, "review", result.timestamp,
                               args.model_version, args.input,
                               result.good_count, len(result.quarantined)))
    history.save()
    write_text(args.report, build_markdown(result, history))
    print(f"[{TOOL_NAME}] review done run_id={run_id} "
          f"model_version={args.model_version} good={result.good_count} "
          f"quarantined={len(result.quarantined)} changes={len(result.changes)} "
          f"report={args.report}", file=sys.stderr)
    return EXIT_OK


def cmd_diff(args: argparse.Namespace) -> int:
    history = History.load(args.history)
    idx = history.run_index()
    if args.from_run not in idx:
        raise ReviewError("E_RUN_NOT_FOUND", run_id=args.from_run)
    if args.to_run not in idx:
        raise ReviewError("E_RUN_NOT_FOUND", run_id=args.to_run)
    d = diff_runs(history, args.from_run, args.to_run)
    write_text(args.report, build_diff_markdown(d))
    print(f"[{TOOL_NAME}] diff done {args.from_run} -> {args.to_run} "
          f"report={args.report}", file=sys.stderr)
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=TOOL_NAME, description="工业视觉证据复核（稳定 CLI）")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_common(p: argparse.ArgumentParser) -> None:
        p.add_argument("-i", "--input", required=True,
                       help="样本表 CSV 路径（表头需含必要列）")
        p.add_argument("-H", "--history", required=True,
                       help="只追加历史 JSON 路径")
        p.add_argument("--model-version", required=True,
                       help="本轮模型版本（用于 run_id 与运行元信息）")
        p.add_argument("--run-id", default=None,
                       help="自定义 run_id；不填则用 时间#模型版本")
        p.add_argument("--strict", action="store_true",
                       help="严格模式：检测到坏数据即中止（退出码 21）")

    p_import = sub.add_parser("import", help="导入旧材料作为基线历史")
    add_common(p_import)

    p_review = sub.add_parser("review", help="复核并产出 Markdown 报告")
    add_common(p_review)
    p_review.add_argument("-r", "--report", required=True,
                          help="输出 Markdown 报告路径")

    p_diff = sub.add_parser("diff", help="对照两次复核结果看差异")
    p_diff.add_argument("-H", "--history", required=True,
                        help="历史 JSON 路径")
    p_diff.add_argument("--from", dest="from_run", required=True,
                       help="对照起点 run_id")
    p_diff.add_argument("--to", dest="to_run", required=True,
                       help="对照终点 run_id")
    p_diff.add_argument("-r", "--report", required=True,
                        help="输出差异 Markdown 报告路径")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "import":
            return cmd_import(args)
        if args.command == "review":
            return cmd_review(args)
        if args.command == "diff":
            return cmd_diff(args)
    except ReviewError as e:
        print(f"[{TOOL_NAME}] {e.code}: {e}", file=sys.stderr)
        return EXIT_CODE_MAP.get(e.code, EXIT_UNEXPECTED)
    except (OSError, ValueError) as e:
        print(f"[{TOOL_NAME}] E_UNEXPECTED: {e}", file=sys.stderr)
        return EXIT_UNEXPECTED
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
