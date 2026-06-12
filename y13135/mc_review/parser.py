"""题目清单解析器。

支持：
- 读取 CSV 题目清单
- 解析多版本备注（history_note 字段按换行切分，前缀 [时间]作者: 内容）
- 识别截图文件（与 qid 匹配）
- 保留原始行号用于排序溯源
"""

from __future__ import annotations

import csv
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

from .models import HistoryEntry, QuestionItem, ReviewStatus, SortTrace, ChangeEvent, ReviewBundle, ChangeType


HISTORY_LINE_RE = re.compile(
    r"^\[(?P<ts>[^\]]+)\]\s*(?P<author>[^:：]+)[:：]\s*(?P<content>.*)$"
)


def _parse_status(raw: str) -> ReviewStatus:
    raw = (raw or "").strip().lower()
    mapping = {
        "已处理": ReviewStatus.PROCESSED,
        "processed": ReviewStatus.PROCESSED,
        "done": ReviewStatus.PROCESSED,
        "待补材料": ReviewStatus.PENDING,
        "待补": ReviewStatus.PENDING,
        "pending": ReviewStatus.PENDING,
        "人工改判": ReviewStatus.MANUAL,
        "manual": ReviewStatus.MANUAL,
        "改判": ReviewStatus.MANUAL,
    }
    return mapping.get(raw, ReviewStatus.PENDING)


def _parse_history_block(block: str, field: str = "note") -> List[HistoryEntry]:
    """把备注块解析成历史记录列表。每行保留，即使格式不规范也作为匿名系统记录。"""
    entries: List[HistoryEntry] = []
    if not block:
        return entries
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        m = HISTORY_LINE_RE.match(line)
        if m:
            ts_raw = m.group("ts").strip()
            try:
                ts = datetime.fromisoformat(ts_raw)
            except ValueError:
                ts = datetime.now()
            entries.append(HistoryEntry(
                timestamp=ts,
                field=field,
                old_value=None,
                new_value=m.group("content").strip(),
                author=m.group("author").strip(),
                note="",
            ))
        else:
            entries.append(HistoryEntry(
                timestamp=datetime.now(),
                field=field,
                old_value=None,
                new_value=line,
                author="anonymous",
                note="未标注时间作者的备注",
            ))
    return entries


def _find_screenshots(screenshots_dir: Path, qid: str) -> List[str]:
    if not screenshots_dir.exists():
        return []
    results = []
    for p in sorted(screenshots_dir.iterdir()):
        if p.is_file() and qid.lower() in p.stem.lower():
            results.append(p.name)
    return results


def parse_question_list(csv_path: Path, screenshots_dir: Path) -> List[QuestionItem]:
    """解析题目清单 CSV。"""
    questions: List[QuestionItem] = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            qid = (row.get("qid") or row.get("题目编号") or f"Q{idx}").strip()
            title = (row.get("title") or row.get("题目") or "").strip()
            try:
                score = float(row.get("score") or row.get("得分") or 0)
            except (TypeError, ValueError):
                score = 0.0
            try:
                max_score = float(row.get("max_score") or row.get("满分") or 0)
            except (TypeError, ValueError):
                max_score = 0.0
            threshold = (row.get("threshold") or row.get("阈值") or "").strip() or None
            unit = (row.get("unit") or row.get("单位") or "").strip()
            status = _parse_status(row.get("status") or row.get("状态") or "")
            history_note = row.get("history_note") or row.get("历史备注") or ""
            manual_note = (row.get("manual_review_note") or row.get("人工备注") or "").strip()

            history = _parse_history_block(history_note, field="note")
            screenshots = _find_screenshots(screenshots_dir, qid)

            questions.append(QuestionItem(
                qid=qid,
                title=title,
                score=score,
                max_score=max_score,
                threshold=threshold,
                unit=unit,
                status=status,
                original_row=idx,
                current_index=len(questions),
                history=history,
                screenshots=screenshots,
                manual_review_note=manual_note,
            ))
    return questions


def build_sort_traces(questions: List[QuestionItem]) -> List[SortTrace]:
    """基于原始行号和当前索引构建排序追踪。

    稳定判定：qid 在原始清单和当前列表中的相对顺序是否一致。
    """
    traces: List[SortTrace] = []
    by_row = sorted(questions, key=lambda q: q.original_row)
    by_current = sorted(questions, key=lambda q: q.current_index)
    row_order = [q.qid for q in by_row]
    current_order = [q.qid for q in by_current]

    for q in questions:
        stable = row_order.index(q.qid) == current_order.index(q.qid)
        traces.append(SortTrace(
            qid=q.qid,
            original_row=q.original_row,
            current_index=q.current_index,
            content_hash=q.content_hash(),
            stable=stable,
        ))
    return traces


def detect_changes(questions: List[QuestionItem]) -> List[ChangeEvent]:
    """基于 history 字段检测阈值、单位、备注造成的结果跳变。"""
    events: List[ChangeEvent] = []
    for q in questions:
        for h in q.history:
            if h.field == "threshold":
                events.append(ChangeEvent(
                    qid=q.qid,
                    change_type=ChangeType.THRESHOLD,
                    field_name="threshold",
                    before=h.old_value,
                    after=h.new_value,
                    evidence=f"历史记录 [{h.timestamp.isoformat()}] {h.author}: {h.note or '阈值调整'}",
                    severity="high" if h.old_value and h.new_value and h.old_value != h.new_value else "low",
                ))
            elif h.field == "unit":
                events.append(ChangeEvent(
                    qid=q.qid,
                    change_type=ChangeType.UNIT,
                    field_name="unit",
                    before=h.old_value,
                    after=h.new_value,
                    evidence=f"历史记录 [{h.timestamp.isoformat()}] {h.author}: {h.note or '单位变更'}",
                    severity="medium",
                ))
            elif h.field == "note":
                haystack = f"{h.note or ''} {h.new_value or ''}"
                if "后补" in haystack:
                    events.append(ChangeEvent(
                        qid=q.qid,
                        change_type=ChangeType.NOTE,
                        field_name="note",
                        before=h.old_value,
                        after=h.new_value,
                        evidence=f"后补备注 [{h.timestamp.isoformat()}] {h.author}: {h.new_value}",
                        severity="medium",
                    ))
    return events


def build_review_bundle(input_dir: Path) -> ReviewBundle:
    """从输入目录装配完整复盘包。"""
    csv_candidates = list(input_dir.glob("*.csv")) + list(input_dir.glob("*.CSV"))
    if not csv_candidates:
        raise FileNotFoundError(f"在 {input_dir} 中未找到 CSV 题目清单")
    csv_path = csv_candidates[0]

    screenshots_dir = input_dir / "screenshots"
    history_dir = input_dir / "history"

    questions = parse_question_list(csv_path, screenshots_dir)

    if history_dir.exists():
        for hist_csv in sorted(history_dir.glob("*.csv")):
            _merge_history_csv(questions, hist_csv)

    sort_traces = build_sort_traces(questions)
    change_events = detect_changes(questions)

    return ReviewBundle(
        questions=questions,
        sort_traces=sort_traces,
        change_events=change_events,
        source_file=str(csv_path),
    )


def _merge_history_csv(questions: List[QuestionItem], hist_csv: Path) -> None:
    """把历史版本 CSV 合并进当前题目的 history。"""
    by_qid = {q.qid: q for q in questions}
    with open(hist_csv, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        ts = datetime.fromtimestamp(hist_csv.stat().st_mtime)
        for row in reader:
            qid = (row.get("qid") or row.get("题目编号") or "").strip()
            if qid not in by_qid:
                continue
            q = by_qid[qid]
            for field_name, value in row.items():
                if not value:
                    continue
                key = field_name.lower()
                if "阈值" in field_name or "threshold" in key:
                    q.history.append(HistoryEntry(
                        timestamp=ts,
                        field="threshold",
                        old_value=q.threshold,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note="从历史版本 CSV 恢复的阈值",
                    ))
                elif "单位" in field_name or "unit" in key:
                    q.history.append(HistoryEntry(
                        timestamp=ts,
                        field="unit",
                        old_value=q.unit,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note="从历史版本 CSV 恢复的单位",
                    ))
                elif "备注" in field_name or "note" in key:
                    q.history.append(HistoryEntry(
                        timestamp=ts,
                        field="note",
                        old_value=None,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note="从历史版本 CSV 恢复的备注",
                    ))
