from pathlib import Path
from typing import Tuple, List, Optional
import pandas as pd

from .models import VoicePart, LineStatus


def _read_table(file_path: str) -> pd.DataFrame:
    ext = Path(file_path).suffix.lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str, keep_default_na=False)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(file_path, dtype=str, keep_default_na=False)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def parse_voice_parts(file_path: str) -> Tuple[List[VoicePart], List[dict], List[dict]]:
    df = _read_table(file_path)
    df.columns = [c.strip() for c in df.columns]

    parts: List[VoicePart] = []
    bad_records: List[dict] = []
    skipped_records: List[dict] = []

    required_cols = ["曲目编号", "声部", "演唱者", "时码"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"缺少必要列: {', '.join(missing)}")

    for idx, row in df.iterrows():
        row_num = idx + 2
        track_no = str(row.get("曲目编号", "")).strip()
        part_name = str(row.get("声部", "")).strip()
        singer = str(row.get("演唱者", "")).strip()
        timecode = str(row.get("时码", "")).strip()
        remark = str(row.get("备注", "")).strip()
        status_str = str(row.get("状态", "")).strip()
        timecode_dev = str(row.get("时码偏差", "")).strip() or str(row.get("时码偏半拍", "")).strip()

        if not track_no or not part_name or not singer:
            bad_records.append({
                "行号": row_num,
                "曲目编号": track_no,
                "声部": part_name,
                "演唱者": singer,
                "原因": "缺少关键字段（曲目编号/声部/演唱者）"
            })
            continue

        if status_str in ("跳过", "skip", "SKIP"):
            skipped_records.append({
                "行号": row_num,
                "曲目编号": track_no,
                "声部": part_name,
                "演唱者": singer,
                "原因": remark or "标记为跳过"
            })
            continue

        part = VoicePart(
            track_no=track_no,
            part_name=part_name,
            singer=singer,
            timecode=timecode,
            remark=remark,
        )

        if timecode_dev:
            part.timecode_deviation = timecode_dev
            part.status = LineStatus.TIMECODE_OFF

        parts.append(part)

    return parts, bad_records, skipped_records


def parse_authorization_note(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read().strip()

    df = _read_table(file_path)
    df.columns = [c.strip() for c in df.columns]

    note_cols = ["授权备注", "授权说明", "授权期限", "备注"]
    for col in note_cols:
        if col in df.columns:
            values = [str(v).strip() for v in df[col] if str(v).strip()]
            if values:
                return "；".join(values)

    return ""


def parse_manual_adjudication(file_path: str) -> dict:
    df = _read_table(file_path)
    df.columns = [c.strip() for c in df.columns]

    key_cols = ["曲目编号", "声部"]
    missing = [c for c in key_cols if c not in df.columns]
    if missing:
        return {}

    has_singer = "演唱者" in df.columns

    adjudications = {}
    for _, row in df.iterrows():
        track_no = str(row.get("曲目编号", "")).strip()
        part_name = str(row.get("声部", "")).strip()
        singer = str(row.get("演唱者", "")).strip() if has_singer else ""
        if not track_no or not part_name:
            continue
        key_parts = [track_no, part_name]
        if singer:
            key_parts.append(singer)
        key = "|".join(key_parts)
        adjudications[key] = {
            "new_status": str(row.get("改判状态", "")).strip(),
            "note": str(row.get("改判说明", "")).strip() or str(row.get("人工备注", "")).strip(),
            "has_singer": bool(singer),
        }
    return adjudications
