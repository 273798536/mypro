from __future__ import annotations

import csv
import io
import re
from pathlib import Path
from typing import Iterable

from .models import DraftRow


_NOTE_PATTERNS = [
    re.compile(r"#.*$"),
    re.compile(r"//.*$"),
    re.compile(r"\(.*?\)$"),
    re.compile(r"（.*?）$"),
]

_SHIFT_KEYWORDS = {
    "早", "早班", "morning", "am",
    "中", "中班", "mid", "noon",
    "晚", "晚班", "night", "pm",
    "全天", "all", "full",
}

_DATE_RE = re.compile(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}")
_HOURS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*[hH时小时]")


def _strip_notes(text: str) -> tuple[str, str | None]:
    note_parts: list[str] = []
    cleaned = text
    for pat in _NOTE_PATTERNS:
        for m in pat.finditer(cleaned):
            note_parts.append(m.group(0))
        cleaned = pat.sub("", cleaned)
    cleaned = cleaned.strip()
    return cleaned, " ".join(note_parts).strip() or None


def _is_empty(text: str) -> bool:
    if not text:
        return True
    stripped = text.strip()
    return stripped == "" or all(c in " \t-—_." for c in stripped)


def _extract_hours(text: str) -> float | None:
    m = _HOURS_RE.search(text)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    for token in re.split(r"[,\s，、]+", text):
        try:
            if re.fullmatch(r"\d+(\.\d+)?", token):
                return float(token)
        except ValueError:
            continue
    return None


def _extract_date(text: str) -> str | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    raw = m.group(0).replace("/", "-")
    parts = raw.split("-")
    if len(parts) == 2:
        return f"2026-{int(parts[0]):02d}-{int(parts[1]):02d}"
    if len(parts) == 3:
        y, m, d = parts
        if len(y) == 2:
            y = "20" + y
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    return None


def _extract_shift(text: str) -> str | None:
    for kw in _SHIFT_KEYWORDS:
        if kw.lower() in text.lower():
            return kw
    return None


def _extract_person(text: str) -> str | None:
    tokens = [t for t in re.split(r"[,\s，、]+", text) if t]
    for t in tokens:
        if re.fullmatch(r"[A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa50-9_·\.\-]{0,19}", t):
            if t.lower() not in {"am", "pm", "mid", "all", "full", "morning", "noon", "night"}:
                return t
    return None


def parse_single_line(raw: str, idx: int, source_file: str = "") -> DraftRow:
    row = DraftRow(raw_index=idx, raw_text=raw, source_file=source_file)
    if _is_empty(raw):
        row.is_empty = True
        return row

    cleaned, note = _strip_notes(raw)
    row.note = note

    if _is_empty(cleaned):
        row.is_empty = True
        return row

    parts = [p.strip() for p in re.split(r"[\t,，|;；\s]+", cleaned) if p.strip()]

    found_date = _extract_date(cleaned)
    found_shift = _extract_shift(cleaned)
    found_hours = _extract_hours(cleaned)

    remaining = list(parts)
    for field_val in (found_date, found_shift):
        if field_val and field_val in remaining:
            remaining.remove(field_val)

    found_person = None
    for tok in remaining:
        person = _extract_person(tok)
        if person:
            found_person = person
            break

    if found_date is None and not found_person and not found_shift and found_hours is None:
        row.parse_errors.append(f"无法解析字段: {cleaned[:40]}")

    row.date = found_date
    row.shift = found_shift
    row.hours = found_hours
    row.person = found_person
    return row


def parse_text_block(text: str, source_file: str = "") -> list[DraftRow]:
    rows: list[DraftRow] = []
    for i, line in enumerate(text.splitlines()):
        rows.append(parse_single_line(line, i, source_file=source_file))
    return rows


def parse_csv_file(path: Path) -> list[DraftRow]:
    rows: list[DraftRow] = []
    try:
        content = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        content = path.read_text(encoding="gbk", errors="ignore")

    try:
        reader = csv.reader(io.StringIO(content))
        for i, fields in enumerate(reader):
            raw = ",".join(fields)
            rows.append(parse_single_line(raw, i, source_file=path.name))
    except csv.Error:
        return parse_text_block(content, source_file=path.name)
    return rows


def parse_markdown_table(text: str, source_file: str = "") -> list[DraftRow]:
    rows: list[DraftRow] = []
    idx = 0
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if all(set(c) <= {"-", " ", ":"} for c in cells):
                continue
            rows.append(parse_single_line(" ".join(cells), idx, source_file=source_file))
            idx += 1
    return rows


def load_drafts(input_dir: Path) -> list[DraftRow]:
    input_dir = Path(input_dir)
    if not input_dir.exists():
        return []
    all_rows: list[DraftRow] = []
    for path in sorted(input_dir.rglob("*")):
        if not path.is_file():
            continue
        suf = path.suffix.lower()
        try:
            if suf in {".csv", ".tsv"}:
                all_rows.extend(parse_csv_file(path))
            elif suf in {".md", ".markdown", ".txt"}:
                text = path.read_text(encoding="utf-8-sig", errors="ignore")
                if "|" in text:
                    all_rows.extend(parse_markdown_table(text, source_file=path.name))
                all_rows.extend(parse_text_block(text, source_file=path.name))
        except Exception as e:
            row = DraftRow(raw_index=0, raw_text=f"<read-error: {e}>", source_file=path.name)
            row.parse_errors.append(f"读取失败: {e}")
            all_rows.append(row)
    return all_rows
