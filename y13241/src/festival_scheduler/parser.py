from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from .models import (
    AudioFile,
    HistoryAction,
    HistoryEntry,
    ItemStatus,
    ProcessingResult,
    ScheduleItem,
    Timecode,
)


class DataParser:
    def __init__(self, result: Optional[ProcessingResult] = None):
        self.result = result or ProcessingResult()

    def parse_schedule(self, file_path: str) -> Tuple[List[ScheduleItem], List[Dict[str, Any]], List[Dict[str, Any]]]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Schedule file not found: {file_path}")

        items: List[ScheduleItem] = []
        bad_rows: List[Dict[str, Any]] = []
        skipped_rows: List[Dict[str, Any]] = []

        if path.suffix.lower() in [".csv"]:
            items, bad_rows, skipped_rows = self._parse_csv_schedule(path)
        elif path.suffix.lower() in [".json", ".jsonl"]:
            items, bad_rows, skipped_rows = self._parse_json_schedule(path)
        else:
            raise ValueError(f"Unsupported schedule format: {path.suffix}")

        for item in items:
            self.result.history.append(
                HistoryEntry(
                    action=HistoryAction.CREATED,
                    item_id=item.id,
                    details={"source": file_path, "track_id": item.track_id},
                    new_value=item.model_dump(),
                )
            )

        return items, bad_rows, skipped_rows

    def _parse_csv_schedule(self, path: Path) -> Tuple[List[ScheduleItem], List[Dict[str, Any]], List[Dict[str, Any]]]:
        items: List[ScheduleItem] = []
        bad_rows: List[Dict[str, Any]] = []
        skipped_rows: List[Dict[str, Any]] = []

        df = pd.read_csv(path, dtype=str).fillna("")

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                row_dict = row.to_dict()

                if not self._is_valid_row(row_dict):
                    skipped_rows.append({"row": row_num, "data": row_dict, "reason": "missing_required_fields"})
                    continue

                start_time = self._parse_timecode(row_dict.get("start_time", ""))
                end_time = self._parse_timecode(row_dict.get("end_time", ""))

                item = ScheduleItem(
                    track_id=row_dict["track_id"],
                    title=row_dict.get("title", "").strip(),
                    artist=row_dict.get("artist", "").strip(),
                    start_time=start_time,
                    end_time=end_time,
                    expected_filename=row_dict.get("expected_filename", "").strip(),
                    booth=row_dict.get("booth", "").strip(),
                    day=int(row_dict.get("day", 1)),
                    status=ItemStatus.PENDING,
                )
                items.append(item)

            except Exception as e:
                bad_rows.append({"row": row_num, "data": row.to_dict(), "error": str(e)})

        return items, bad_rows, skipped_rows

    def _parse_json_schedule(self, path: Path) -> Tuple[List[ScheduleItem], List[Dict[str, Any]], List[Dict[str, Any]]]:
        items: List[ScheduleItem] = []
        bad_rows: List[Dict[str, Any]] = []
        skipped_rows: List[Dict[str, Any]] = []

        if path.suffix == ".jsonl":
            with open(path, "r", encoding="utf-8") as f:
                records = [json.loads(line) for line in f if line.strip()]
        else:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                records = data if isinstance(data, list) else [data]

        for idx, record in enumerate(records):
            line_num = idx + 1
            try:
                if not self._is_valid_row(record):
                    skipped_rows.append({"line": line_num, "data": record, "reason": "missing_required_fields"})
                    continue

                start_time = self._parse_timecode(record.get("start_time", ""))
                end_time = self._parse_timecode(record.get("end_time", ""))

                item = ScheduleItem(
                    track_id=record["track_id"],
                    title=record.get("title", "").strip(),
                    artist=record.get("artist", "").strip(),
                    start_time=start_time,
                    end_time=end_time,
                    expected_filename=record.get("expected_filename", "").strip(),
                    booth=record.get("booth", "").strip(),
                    day=int(record.get("day", 1)),
                    status=ItemStatus.PENDING,
                )
                items.append(item)

            except Exception as e:
                bad_rows.append({"line": line_num, "data": record, "error": str(e)})

        return items, bad_rows, skipped_rows

    def _is_valid_row(self, row: Dict[str, Any]) -> bool:
        required_fields = ["track_id"]
        return all(row.get(field, "").strip() for field in required_fields)

    def _parse_timecode(self, tc_str: str) -> Optional[Timecode]:
        if not tc_str or not tc_str.strip():
            return None
        try:
            return Timecode.from_string(tc_str.strip())
        except ValueError:
            return None

    def scan_audio_files(self, directory: str) -> List[AudioFile]:
        dir_path = Path(directory)
        if not dir_path.exists():
            raise FileNotFoundError(f"Audio directory not found: {directory}")

        audio_files: List[AudioFile] = []

        for file_path in dir_path.rglob("*"):
            if file_path.is_file():
                try:
                    audio_file = self._parse_audio_file(file_path)
                    audio_files.append(audio_file)

                    self.result.history.append(
                        HistoryEntry(
                            action=HistoryAction.CREATED,
                            item_id=audio_file.id,
                            details={"source": str(file_path), "type": "audio_file"},
                            new_value=audio_file.model_dump(),
                        )
                    )

                except Exception as e:
                    self.result.bad_rows.append(
                        {"file": str(file_path), "error": f"Failed to parse audio file: {e}"}
                    )

        return audio_files

    def _parse_audio_file(self, file_path: Path) -> AudioFile:
        stat = file_path.stat()
        filename = file_path.name

        is_screenshot = filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))
        is_note = filename.lower().endswith((".md", ".txt"))

        track_id = None
        title = None
        timecode = None

        tc_match = re.search(r"(\d{2}:\d{2}:\d{2}:\d{2})", filename)
        if tc_match:
            try:
                timecode = Timecode.from_string(tc_match.group(1))
            except ValueError:
                pass

        track_match = re.search(r"(TRK[A-Z0-9]+)", filename, re.IGNORECASE)
        if track_match:
            track_id = track_match.group(1).upper()

        name_part = filename
        for ext in [".wav", ".mp3", ".flac", ".aac", ".ogg", ".m4a", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".md", ".txt"]:
            name_part = name_part.lower().replace(ext, "")

        if " - " in name_part:
            parts = name_part.split(" - ")
            if len(parts) >= 2:
                title = parts[1].strip().title()

        return AudioFile(
            filename=filename,
            file_path=str(file_path),
            file_size=stat.st_size,
            created_at=datetime.fromtimestamp(stat.st_birthtime),
            modified_at=datetime.fromtimestamp(stat.st_mtime),
            track_id=track_id,
            title=title,
            timecode=timecode,
            is_screenshot=is_screenshot,
            is_note=is_note,
            metadata={"extension": file_path.suffix.lower().lstrip(".")},
        )
