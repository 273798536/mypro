import os
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

from .models import BoothRecord, VersionInfo, AnomalyRecord, BoothStatus, AnomalyType, AnomalyLevel
from .config import Config
from .storage import BoothStorage


class FileScanner:
    SUPPORTED_EXT = {".json", ".csv", ".txt"}

    def __init__(self, config: Config, storage: BoothStorage):
        self.config = config
        self.storage = storage

    def scan_directory(self, dir_path: Optional[str] = None) -> Tuple[List[BoothRecord], List[str]]:
        target = dir_path or self.config["input_dir"]
        records: List[BoothRecord] = []
        errors: List[str] = []

        if not os.path.isdir(target):
            errors.append(f"目录不存在：{target}")
            return records, errors

        for root, _, files in os.walk(target):
            for fname in sorted(files):
                fpath = os.path.join(root, fname)
                ext = Path(fname).suffix.lower()
                if ext not in self.SUPPORTED_EXT:
                    continue
                try:
                    parsed = self._parse_file(fpath)
                    for p in parsed:
                        records.append(p)
                except Exception as e:
                    errors.append(f"解析失败 {fname}: {str(e)}")

        return records, errors

    def _parse_file(self, fpath: str) -> List[BoothRecord]:
        ext = Path(fpath).suffix.lower()
        file_hash = BoothStorage.compute_file_hash(fpath)
        version = VersionInfo(
            file_path=fpath,
            file_hash=file_hash,
            source=os.path.basename(fpath),
            note=f"扫描时间 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )

        if ext == ".json":
            return self._parse_json(fpath, version)
        elif ext == ".csv":
            return self._parse_csv(fpath, version)
        else:
            return self._parse_text(fpath, version)

    def _parse_json(self, fpath: str, version: VersionInfo) -> List[BoothRecord]:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        items = data if isinstance(data, list) else data.get("records", [data])
        result = []
        for item in items:
            bid = str(item.get("booth_id") or item.get("摊位号") or item.get("id") or f"auto_{abs(hash(str(item))) % 100000}")
            forced_time = item.get("_imported_at") or item.get("_forced_imported_at")
            rec_version = VersionInfo(
                file_path=version.file_path,
                file_hash=version.file_hash,
                source=version.source,
                imported_at=forced_time if forced_time else version.imported_at,
                note=version.note
            )
            rec = BoothRecord(
                booth_id=bid,
                booth_name=item.get("booth_name") or item.get("摊位名", ""),
                performer=item.get("performer") or item.get("演出方", ""),
                contact=item.get("contact") or item.get("联系方式", ""),
                authorization_period=item.get("authorization_period") or item.get("授权期限", ""),
                authorization_visible=item.get("authorization_visible", True),
                setlist_complete=not item.get("setlist_pending", False),
                timing_offset_ms=int(item.get("timing_offset_ms", item.get("时码偏差", 0)) or 0),
                raw_data=item,
                version=rec_version
            )
            self._check_authorization_visibility(rec, item)
            result.append(rec)
        return result

    def _parse_csv(self, fpath: str, version: VersionInfo) -> List[BoothRecord]:
        result = []
        with open(fpath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                bid = row.get("booth_id") or row.get("摊位号") or row.get("id") or f"auto_{abs(hash(str(row))) % 100000}"
                rec = BoothRecord(
                    booth_id=str(bid),
                    booth_name=row.get("booth_name", row.get("摊位名", "")),
                    performer=row.get("performer", row.get("演出方", "")),
                    contact=row.get("contact", row.get("联系方式", "")),
                    authorization_period=row.get("authorization_period", row.get("授权期限", "")),
                    setlist_complete=not (row.get("setlist_pending", "") == "1" or "待补" in (row.get("备注", "") or "")),
                    timing_offset_ms=int(row.get("timing_offset_ms", row.get("时码偏差", 0)) or 0),
                    raw_data=dict(row),
                    version=version
                )
                self._check_authorization_visibility(rec, row)
                result.append(rec)
        return result

    def _parse_text(self, fpath: str, version: VersionInfo) -> List[BoothRecord]:
        with open(fpath, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        result = []
        for i, line in enumerate(lines):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 2:
                bid = parts[0] or f"line_{i+1}"
                rec = BoothRecord(
                    booth_id=bid,
                    booth_name=parts[1] if len(parts) > 1 else "",
                    performer=parts[2] if len(parts) > 2 else "",
                    authorization_period="|".join(parts[3:]) if len(parts) > 3 else "",
                    raw_data={"line": line, "line_no": i + 1},
                    version=version
                )
                self._check_authorization_visibility(rec, {"raw": line})
                result.append(rec)
        return result

    def _check_authorization_visibility(self, rec: BoothRecord, raw: Dict[str, Any]):
        keywords = self.config["anomaly_keywords"]["authorization_hidden"]
        remark = raw.get("remark") or raw.get("备注") or raw.get("note") or ""
        auth = rec.authorization_period
        date_indicators = ["至", "到", "-", "有效", "起止", "起", "止", "年", "月", "日"]
        note_has_auth_date = (
            any(x in remark for x in ["授权", "期限", "许可", "核准"])
            and any(d in remark for d in date_indicators)
        )
        if not auth:
            if note_has_auth_date:
                rec.authorization_visible = False
            return
        auth_in_remark = any(kw in remark for kw in ["授权", "期限", "至", "到"]) and auth in remark
        remark_in_auth = any(kw in auth for kw in keywords)
        if auth_in_remark or remark_in_auth or note_has_auth_date:
            rec.authorization_visible = False
