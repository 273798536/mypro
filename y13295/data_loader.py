import csv
import json
import os
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from models import RawPointRecord, DataSource


class DataLoader:
    def __init__(self):
        self._record_counter = 0

    def _next_id(self, prefix: str = "REC") -> str:
        self._record_counter += 1
        return f"{prefix}{datetime.now().strftime('%Y%m%d')}{self._record_counter:04d}"

    def load_from_csv(self, file_path: str, source: DataSource = DataSource.APPROVAL_LEDGER) -> List[RawPointRecord]:
        records = []
        if not os.path.exists(file_path):
            return records

        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = self._parse_row(row, source)
                if record:
                    records.append(record)
        return records

    def load_from_json(self, file_path: str, source: DataSource = DataSource.CHAT_RECORD) -> List[RawPointRecord]:
        records = []
        if not os.path.exists(file_path):
            return records

        with open(file_path, mode='r', encoding='utf-8') as f:
            data = json.load(f)
            items = data if isinstance(data, list) else data.get('records', [])
            for item in items:
                record = self._parse_dict(item, source)
                if record:
                    records.append(record)
        return records

    def load_chat_records(self, file_path: str) -> List[RawPointRecord]:
        records = []
        if not os.path.exists(file_path):
            return records

        with open(file_path, mode='r', encoding='utf-8') as f:
            content = f.read()
            parsed_items = self._parse_chat_text(content)
            for item in parsed_items:
                record = self._parse_dict(item, DataSource.CHAT_RECORD)
                if record:
                    records.append(record)
        return records

    def _parse_chat_text(self, text: str) -> List[Dict[str, Any]]:
        results = []
        raw_blocks = re.split(r'\n\s*---+\s*\n', text)

        for block in raw_blocks:
            lines = [l.strip() for l in block.strip().split('\n') if l.strip()]
            if not lines:
                continue

            current_item = {}
            date_pattern = re.compile(r'\[(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2})\]')
            speaker_pattern = re.compile(r'\[\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*\d{1,2}:\d{2}\]\s*([^:：]+)[:：]')
            location_pattern = re.compile(r'(位置|地点|地址|原始说法)[:：]\s*(.+)')
            content_pattern = re.compile(r'(内容|投诉|问题|建议)[:：]\s*(.+)')
            approval_pattern = re.compile(r'(审批编号|台账编号|SP\d{4}-\d{3,}-\d{3,})')

            for line in lines:
                date_match = date_pattern.search(line)
                if date_match and 'complaint_time' not in current_item:
                    current_item['complaint_time'] = date_match.group(1)

                speaker_match = speaker_pattern.search(line)
                if speaker_match and 'complainant' not in current_item:
                    current_item['complainant'] = speaker_match.group(1).strip()

                loc_match = location_pattern.search(line)
                if loc_match:
                    loc_text = loc_match.group(2).strip()
                    current_item['original_location_text'] = loc_text

                content_match = content_pattern.search(line)
                if content_match:
                    cont_text = content_match.group(2).strip()
                    if 'complaint_content' in current_item:
                        current_item['complaint_content'] += '；' + cont_text
                    else:
                        current_item['complaint_content'] = cont_text

                approval_match = approval_pattern.search(line)
                if approval_match and 'approval_number' not in current_item:
                    current_item['approval_number'] = approval_match.group(1)

            if 'original_location_text' in current_item:
                results.append(current_item)

        return results

    def _parse_row(self, row: Dict[str, str], source: DataSource) -> Optional[RawPointRecord]:
        raw_data = dict(row)
        return self._build_record(raw_data, source)

    def _parse_dict(self, data: Dict[str, Any], source: DataSource) -> Optional[RawPointRecord]:
        raw_data = dict(data)
        return self._build_record(raw_data, source)

    def _build_record(self, raw_data: Dict[str, Any], source: DataSource) -> Optional[RawPointRecord]:
        location = self._extract_location(raw_data)
        if not location:
            return None

        record_id = raw_data.get('record_id') or raw_data.get('id') or self._next_id()

        complaint_time = self._parse_datetime(
            raw_data.get('complaint_time') or
            raw_data.get('时间') or
            raw_data.get('投诉时间') or
            raw_data.get('提交时间')
        )

        longitude = self._safe_float(
            raw_data.get('longitude') or
            raw_data.get('经度') or
            raw_data.get('lng')
        )
        latitude = self._safe_float(
            raw_data.get('latitude') or
            raw_data.get('纬度') or
            raw_data.get('lat')
        )

        return RawPointRecord(
            record_id=str(record_id),
            source=source,
            original_location_text=location,
            normalized_location=None,
            longitude=longitude,
            latitude=latitude,
            complaint_content=raw_data.get('complaint_content') or raw_data.get('内容') or raw_data.get('投诉内容'),
            complaint_time=complaint_time,
            complainant=raw_data.get('complainant') or raw_data.get('投诉人') or raw_data.get('发言人'),
            approval_number=raw_data.get('approval_number') or raw_data.get('审批编号') or raw_data.get('台账编号'),
            raw_data=raw_data,
            notes=None
        )

    def _extract_location(self, data: Dict[str, Any]) -> Optional[str]:
        candidates = [
            data.get('original_location_text'),
            data.get('location'),
            data.get('位置'),
            data.get('地点'),
            data.get('地址'),
            data.get('点位'),
            data.get('座椅位置'),
        ]
        for c in candidates:
            if c and str(c).strip():
                return str(c).strip()
        return None

    @staticmethod
    def _parse_datetime(value: Any) -> Optional[datetime]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value

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
                return datetime.strptime(str(value).strip(), fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        if not value:
            return None
        try:
            return float(str(value).strip())
        except (ValueError, TypeError):
            return None

    def load_all_from_directory(self, dir_path: str) -> List[RawPointRecord]:
        all_records = []
        directory = Path(dir_path)
        if not directory.exists():
            return all_records

        for file_path in directory.rglob('*.csv'):
            source = DataSource.APPROVAL_LEDGER if '审批' in file_path.stem or '台账' in file_path.stem else DataSource.OTHER
            if '投诉' in file_path.stem:
                source = DataSource.COMPLAINT_RECORD
            all_records.extend(self.load_from_csv(str(file_path), source))

        for file_path in directory.rglob('*.json'):
            source = DataSource.OTHER
            if '聊天' in file_path.stem or 'chat' in file_path.stem.lower():
                source = DataSource.CHAT_RECORD
            elif '投诉' in file_path.stem:
                source = DataSource.COMPLAINT_RECORD
            all_records.extend(self.load_from_json(str(file_path), source))

        for file_path in directory.rglob('*.txt'):
            if '聊天' in file_path.stem or 'chat' in file_path.stem.lower():
                all_records.extend(self.load_chat_records(str(file_path)))

        return all_records
