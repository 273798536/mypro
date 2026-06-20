import os
import csv
import re
from pathlib import Path
from typing import List, Optional, Tuple, Dict
from .models import LessonRecord, ArchiveResult


OLD_MASTER_PATTERNS = [
    r"旧版", r"母带", r"master", r"backup", r"_old", r"_v0",
    r"deprecated",
]


def is_old_master(filename: str, notes: str = "") -> bool:
    combined = f"{filename} {notes}".lower()
    return any(re.search(p, combined, re.IGNORECASE) for p in OLD_MASTER_PATTERNS)


def is_bad_row(row: Dict[str, str], required_cols: List[str]) -> Tuple[bool, str]:
    missing = [c for c in required_cols if c not in row or not str(row.get(c, "")).strip()]
    if missing:
        return True, f"缺少必填列: {', '.join(missing)}"
    return False, ""


def find_audio_file(audio_dir: Path, student: str, lesson_date: str) -> Optional[str]:
    if not audio_dir or not audio_dir.exists():
        return None
    student_clean = re.sub(r"\s+", "", student)
    date_clean = re.sub(r"[-/]", "", lesson_date)
    for f in audio_dir.iterdir():
        if f.is_file():
            fname = f.name
            fname_clean = re.sub(r"\s+", "", fname).lower()
            if student_clean.lower() in fname_clean and date_clean in fname_clean:
                return str(f.resolve())
    return None


def read_csv_with_source(filepath: Path) -> Tuple[List[Dict[str, str]], List[str]]:
    rows = []
    with open(filepath, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        for i, row in enumerate(reader, start=2):
            row["_source_line"] = str(i)
            rows.append(row)
    return rows, fields


def read_tracklist(filepath: Path) -> List[Dict[str, str]]:
    rows = []
    if filepath.suffix == ".csv":
        with open(filepath, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                row["_source_line"] = str(i)
                rows.append(row)
    else:
        import pandas as pd
        df = pd.read_excel(filepath)
        for i, row in df.iterrows():
            d = row.to_dict()
            d["_source_line"] = str(i + 2)
            rows.append({k: str(v) if v is not None else "" for k, v in d.items()})
    return rows


def process_lesson_list(
    lesson_file: Path,
    audio_dir: Optional[Path],
    tracklist_file: Optional[Path],
    required_cols: List[str] = None,
    auth_note: str = "",
) -> ArchiveResult:
    if required_cols is None:
        required_cols = ["学生姓名", "上课日期", "授课老师"]

    result = ArchiveResult()
    rows, _ = read_csv_with_source(lesson_file)

    tracklist_map: Dict[str, Dict[str, str]] = {}
    if tracklist_file and tracklist_file.exists():
        tl_rows = read_tracklist(tracklist_file)
        for tl in tl_rows:
            key = f"{tl.get('学生姓名', '')}_{tl.get('上课日期', '')}"
            tracklist_map[key] = tl
            tl_rec = LessonRecord(
                raw=tl,
                source_file=str(tracklist_file),
                line_number=int(tl.get("_source_line", "0")),
            )
            if is_old_master("", tl.get("曲目名称", "") + tl.get("备注", "")):
                tl_rec.is_old_master = True
            result.tracklist_records.append(tl_rec)

    for row in rows:
        line_no = int(row.pop("_source_line", "0"))
        rec = LessonRecord(
            raw=dict(row),
            source_file=str(lesson_file),
            line_number=line_no,
            auth_note=auth_note,
        )

        student = row.get("学生姓名", "").strip()
        lesson_date = row.get("上课日期", "").strip()
        notes = row.get("备注", "")

        if is_old_master(row.get("音频文件", ""), notes):
            rec.is_old_master = True

        if "作废" in notes or "取消" in notes:
            rec.is_skipped = True
            rec.skip_reason = f"备注标记: {notes}"
            result.records.append(rec)
            continue

        bad, reason = is_bad_row(row, required_cols)
        if bad:
            rec.is_bad_row = True
            rec.bad_reason = reason
            result.records.append(rec)
            continue

        if audio_dir:
            rec.audio_file = find_audio_file(audio_dir, student, lesson_date)

        key = f"{student}_{lesson_date}"
        if key in tracklist_map:
            tl = tracklist_map[key]
            rec.progress_notes = tl.get("进度备注", "")
            rec.raw["_曲目表_曲目"] = tl.get("曲目名称", "")
            rec.raw["_曲目表_进度"] = tl.get("进度备注", "")

        result.records.append(rec)

    result.final_records = [
        r for r in result.records
        if not r.is_bad_row and not r.is_skipped
    ]

    return result
