"""题目清单解析器。

支持：
- 读取 CSV 题目清单
- 解析多版本备注（history_note 字段按换行切分，前缀 [时间]作者: 内容）
- 识别截图文件（与 qid 匹配）
- 保留原始行号用于排序溯源
- 从 history/ 目录的旧版本 CSV 读取历史顺序，用于排序稳定性比对
- 从历史 CSV 文件名（*_YYYY-MM-DD.csv）提取真实旧版本日期
"""

from __future__ import annotations

import csv
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import ChangeEvent, ChangeType, HistoryEntry, QuestionItem, ReviewBundle, ReviewStatus, SortTrace


HISTORY_LINE_RE = re.compile(
    r"^\[(?P<ts>[^\]]+)\]\s*(?P<author>[^:：]+)[:：]\s*(?P<content>.*)$"
)

FILENAME_DATE_RE = re.compile(
    r"_(\d{4}-\d{2}-\d{2})\.csv$", re.IGNORECASE
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


def _extract_version_date(filepath: Path) -> Optional[datetime]:
    """从文件名提取旧版本日期。

    约定文件名格式：*_YYYY-MM-DD.csv
    例：questions_v1_2025-11-15.csv → 2025-11-15
    """
    m = FILENAME_DATE_RE.search(filepath.name)
    if m:
        try:
            return datetime.strptime(m.group(1), "%Y-%m-%d")
        except ValueError:
            pass
    return None


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


def build_sort_traces(
    questions: List[QuestionItem],
    history_qid_orders: List[Tuple[str, List[str]]],
) -> List[SortTrace]:
    """基于历史版本 CSV 的 qid 行序与当前清单行序对比，构建排序追踪。

    参数:
        questions: 当前题目列表
        history_qid_orders: 列表元素为 (history_source, [qid, qid, ...])
            每个 history_source 对应一份历史 CSV 的 qid 出现顺序

    稳定判定：
        对于同时出现在当前清单和最近一份历史 CSV 中的 qid，
        检查它们在两份清单中的相对顺序是否一致。
        不一致的标记为 unstable，并在 history_row 中记录旧版本行号。
    """
    current_order = [q.qid for q in questions]
    current_pos = {qid: i for i, qid in enumerate(current_order)}

    latest_history: Optional[Tuple[str, List[str]]] = None
    for source, order in history_qid_orders:
        latest_history = (source, order)

    if latest_history is None:
        return [
            SortTrace(
                qid=q.qid,
                original_row=q.original_row,
                current_index=q.current_index,
                history_row=-1,
                history_source="",
                content_hash=q.content_hash(),
                stable=True,
            )
            for q in questions
        ]

    hist_source, hist_order = latest_history
    hist_pos = {qid: i for i, qid in enumerate(hist_order)}

    shared_qids = [qid for qid in current_order if qid in hist_pos]
    shared_current_rank = {qid: rank for rank, qid in enumerate(shared_qids)}
    shared_qids_by_hist = sorted(shared_qids, key=lambda x: hist_pos[x])
    shared_hist_rank = {qid: rank for rank, qid in enumerate(shared_qids_by_hist)}

    traces: List[SortTrace] = []
    for q in questions:
        if q.qid in hist_pos:
            h_row = hist_pos[q.qid] + 1
            stable = shared_current_rank.get(q.qid) == shared_hist_rank.get(q.qid)
        else:
            h_row = -1
            stable = True
        traces.append(SortTrace(
            qid=q.qid,
            original_row=q.original_row,
            current_index=q.current_index,
            history_row=h_row,
            history_source=hist_source if q.qid in hist_pos else "",
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


def _merge_history_csv(
    questions: List[QuestionItem],
    hist_csv: Path,
) -> List[str]:
    """把历史版本 CSV 合并进当前题目的 history，返回该历史 CSV 的 qid 行序。

    时间戳提取优先级：
    1. 文件名中 _YYYY-MM-DD.csv → 该日期 00:00:00
    2. 文件修改时间（附注"文件名未含日期，使用修改时间"）
    """
    by_qid: Dict[str, QuestionItem] = {q.qid: q for q in questions}
    hist_qid_order: List[str] = []

    version_ts = _extract_version_date(hist_csv)
    ts_source = "文件名日期"
    if version_ts is None:
        version_ts = datetime.fromtimestamp(hist_csv.stat().st_mtime)
        ts_source = "文件修改时间"

    with open(hist_csv, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=1):
            qid = (row.get("qid") or row.get("题目编号") or "").strip()
            if not qid:
                continue
            hist_qid_order.append(qid)
            if qid not in by_qid:
                continue
            q = by_qid[qid]
            for field_name, value in row.items():
                if not value:
                    continue
                key = field_name.lower()
                if "阈值" in field_name or "threshold" in key:
                    q.history.append(HistoryEntry(
                        timestamp=version_ts,
                        field="threshold",
                        old_value=q.threshold,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note=f"从历史版本 CSV 恢复的阈值（{ts_source}）",
                    ))
                elif "单位" in field_name or "unit" in key:
                    q.history.append(HistoryEntry(
                        timestamp=version_ts,
                        field="unit",
                        old_value=q.unit,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note=f"从历史版本 CSV 恢复的单位（{ts_source}）",
                    ))
                elif "备注" in field_name or "note" in key:
                    q.history.append(HistoryEntry(
                        timestamp=version_ts,
                        field="note",
                        old_value=None,
                        new_value=str(value),
                        author=f"history:{hist_csv.stem}",
                        note=f"从历史版本 CSV 恢复的备注（{ts_source}）",
                    ))
    return hist_qid_order


def build_review_bundle(input_dir: Path) -> ReviewBundle:
    """从输入目录装配完整复盘包。"""
    csv_candidates = list(input_dir.glob("*.csv")) + list(input_dir.glob("*.CSV"))
    if not csv_candidates:
        raise FileNotFoundError(f"在 {input_dir} 中未找到 CSV 题目清单")
    csv_path = csv_candidates[0]

    screenshots_dir = input_dir / "screenshots"
    history_dir = input_dir / "history"

    questions = parse_question_list(csv_path, screenshots_dir)

    history_qid_orders: List[Tuple[str, List[str]]] = []
    if history_dir.exists():
        for hist_csv in sorted(history_dir.glob("*.csv")):
            order = _merge_history_csv(questions, hist_csv)
            history_qid_orders.append((hist_csv.stem, order))

    sort_traces = build_sort_traces(questions, history_qid_orders)
    change_events = detect_changes(questions)

    return ReviewBundle(
        questions=questions,
        sort_traces=sort_traces,
        change_events=change_events,
        source_file=str(csv_path),
    )
