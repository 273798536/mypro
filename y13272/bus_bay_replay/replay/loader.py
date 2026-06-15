import os
import csv
import re
from datetime import datetime
from typing import List, Tuple
from pathlib import Path

from .models import ComplaintRecord, MeetingMinute, ComplaintStatus


class DataLoader:
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)

    def load_all(self) -> Tuple[List[ComplaintRecord], List[MeetingMinute]]:
        records = self.load_complaints()
        minutes = self.load_meeting_minutes()
        return records, minutes

    def load_complaints(self) -> List[ComplaintRecord]:
        records = []
        csv_files = list(self.data_dir.glob("complaints*.csv")) + list(self.data_dir.glob("*投诉*.csv"))
        xlsx_files = list(self.data_dir.glob("complaints*.xlsx")) + list(self.data_dir.glob("*投诉*.xlsx"))

        for f in csv_files:
            records.extend(self._load_complaints_csv(f))
        for f in xlsx_files:
            records.extend(self._load_complaints_excel(f))

        return records

    def load_meeting_minutes(self) -> List[MeetingMinute]:
        minutes = []
        md_files = list(self.data_dir.glob("*minute*.md")) + list(self.data_dir.glob("*纪要*.md"))
        for f in md_files:
            minutes.extend(self._parse_minutes_md(f))
        return minutes

    def _load_complaints_csv(self, filepath: Path) -> List[ComplaintRecord]:
        records = []
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = self._row_to_complaint(row)
                if record:
                    records.append(record)
        return records

    def _load_complaints_excel(self, filepath: Path) -> List[ComplaintRecord]:
        try:
            import pandas as pd
        except ImportError:
            return []

        df = pd.read_excel(filepath)
        records = []
        for _, row in df.iterrows():
            record = self._row_to_complaint(row.to_dict())
            if record:
                records.append(record)
        return records

    def _row_to_complaint(self, row: dict) -> ComplaintRecord:
        def get(key, default=""):
            for alias in [key, key.lower(), key.upper()]:
                if alias in row and row[alias]:
                    return str(row[alias]).strip()
            return default

        complaint_id = get("complaint_id", get("投诉编号", get("id", "")))
        if not complaint_id:
            return None

        status_str = get("status", get("状态", "")).strip()
        status = self._parse_status(status_str)

        submit_time_str = get("submit_time", get("提交时间", get("时间", "")))
        submit_time = self._parse_datetime(submit_time_str)

        handle_time_str = get("handle_time", get("处理时间", ""))
        handle_time = self._parse_datetime(handle_time_str) if handle_time_str else None

        return ComplaintRecord(
            complaint_id=complaint_id,
            bay_name=get("bay_name", get("港湾名称", get("站点名", ""))),
            bay_address=get("bay_address", get("地址", get("位置", ""))),
            complaint_type=get("complaint_type", get("投诉类型", get("类型", ""))),
            description=get("description", get("投诉描述", get("描述", ""))),
            submitter=get("submitter", get("提交人", get("投诉人", ""))),
            submit_time=submit_time,
            status=status,
            handler=get("handler", get("处理人", "")),
            handle_result=get("handle_result", get("处理结果", "")),
            handle_time=handle_time,
        )

    def _parse_status(self, status_str: str) -> ComplaintStatus:
        mapping = {
            "待现场看": ComplaintStatus.PENDING_SITE,
            "待现场": ComplaintStatus.PENDING_SITE,
            "待核实": ComplaintStatus.PENDING_SITE,
            "已处理": ComplaintStatus.PROCESSED,
            "已完成": ComplaintStatus.PROCESSED,
            "已解决": ComplaintStatus.PROCESSED,
            "冲突": ComplaintStatus.CONFLICT,
            "冲突记录": ComplaintStatus.CONFLICT,
            "待复核": ComplaintStatus.PENDING_REVIEW,
        }
        return mapping.get(status_str, ComplaintStatus.PENDING_SITE)

    def _parse_datetime(self, s: str) -> datetime:
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(s.strip(), fmt)
            except (ValueError, AttributeError):
                continue
        return datetime.now()

    def _parse_minutes_md(self, filepath: Path) -> List[MeetingMinute]:
        minutes_list = []
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        raw_source = content
        sections = re.split(r"\n---+\n", content)

        parsed_sections = []
        for i, section in enumerate(sections):
            minute = self._parse_minute_section(section, filepath.name, i)
            if minute:
                minute.raw_source = section.strip()
                parsed_sections.append(minute)

        if not parsed_sections and content.strip():
            minute = self._parse_minute_section(content, filepath.name, 0)
            if minute:
                minute.raw_source = content.strip()
                parsed_sections.append(minute)

        base_names = {}
        for minute in parsed_sections:
            base = self._extract_base_title(minute.meeting_title)
            if base not in base_names:
                base_names[base] = []
            base_names[base].append(minute)

        file_stem = filepath.stem
        for base_idx, (base_name, versions) in enumerate(base_names.items(), 1):
            base_id = f"MIN-{file_stem}-{base_idx:03d}"
            for v in versions:
                v.minute_id = base_id
                minutes_list.append(v)

        return minutes_list

    def _extract_base_title(self, title: str) -> str:
        base = re.sub(r"\s*v\d+.*$", "", title, flags=re.IGNORECASE)
        base = re.sub(r"\s*版本\s*\d+.*$", "", base)
        base = re.sub(r"\s*[-—]\s*(补录|追加|最终|修订|修改).*$", "", base)
        return base.strip()

    def _parse_minute_section(self, section: str, filename: str, idx: int) -> MeetingMinute:
        lines = section.strip().split("\n")
        if not lines:
            return None

        title = ""
        meeting_time = datetime.now()
        recorder = ""
        is_appendum = False
        appendum_note = None
        screenshot_refs = []
        related_ids = []
        body_lines = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if line.startswith("# "):
                title = line[2:].strip()
                if "补" in title or "追加" in title or "append" in title.lower():
                    is_appendum = True
            elif line.startswith("## "):
                subtitle = line[3:].strip()
                if not title:
                    title = subtitle
                if "补" in subtitle or "追加" in subtitle:
                    is_appendum = True
            elif line.startswith("**时间") or line.startswith("时间：") or line.startswith("时间:"):
                time_str = re.sub(r"^[^：:]*[：:]\s*", "", line).strip()
                meeting_time = self._parse_datetime(time_str)
            elif line.startswith("**记录") or line.startswith("记录人") or line.startswith("记录："):
                recorder = re.sub(r"^[^：:]*[：:]\s*", "", line).strip().strip("**")
            elif line.startswith("备注") or line.startswith("**备注"):
                appendum_note = re.sub(r"^[^：:]*[：:]\s*", "", line).strip().strip("**")
                is_appendum = True
            elif line.startswith("![") or line.startswith("截图"):
                match = re.search(r"!\[.*?\]\((.*?)\)", line)
                if match:
                    screenshot_refs.append(match.group(1))
                else:
                    match2 = re.search(r"[：:]\s*(.+)", line)
                    if match2:
                        screenshot_refs.append(match2.group(1).strip())
            elif "投诉编号" in line or "complaint" in line.lower():
                ids = re.findall(r"[A-Za-z]?\d{4,}", line)
                related_ids.extend(ids)
            else:
                body_lines.append(line)

        if not title:
            title = f"{filename} - 第{idx+1}条"

        minute_id = f"MIN-{filename.split('.')[0]}-{idx+1:03d}"

        version = 1
        v_match = re.search(r"v(\d+)|版本\s*(\d+)", title, re.IGNORECASE)
        if v_match:
            version = int(v_match.group(1) or v_match.group(2))

        return MeetingMinute(
            minute_id=minute_id,
            meeting_time=meeting_time,
            meeting_title=title,
            content="\n".join(body_lines),
            recorder=recorder,
            version=version,
            is_appendum=is_appendum,
            appendum_note=appendum_note,
            screenshot_refs=screenshot_refs,
            related_complaint_ids=related_ids,
        )
