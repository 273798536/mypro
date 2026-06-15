import os
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from .models import BoothStatus, ProcessingResult
from .config import Config
from .storage import BoothStorage


class BoothExporter:
    def __init__(self, config: Config, storage: BoothStorage):
        self.config = config
        self.storage = storage
        self.export_dir = config["export_dir"]
        os.makedirs(self.export_dir, exist_ok=True)

    def export_all(self, fmt: str = "json", only: str = "all") -> ProcessingResult:
        fmt = fmt.lower()
        records = self.storage.get_all()

        if only == "anomalies":
            records = [r for r in records if any(not a.resolved for a in r.anomalies)]
        elif only == "pending":
            records = [r for r in records if r.status in (BoothStatus.NEED_EVIDENCE, BoothStatus.NEED_REVIEW, BoothStatus.CONFLICT)]
        elif only == "passed":
            records = [r for r in records if r.status == BoothStatus.PASSED]

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"booth_export_{only}_{timestamp}.{fmt}"
        fpath = os.path.join(self.export_dir, fname)

        if fmt == "json":
            return self._export_json(records, fpath, only)
        elif fmt == "csv":
            return self._export_csv(records, fpath, only)
        else:
            return ProcessingResult(
                success=False,
                code="UNSUPPORTED_FORMAT",
                message=f"不支持的导出格式：{fmt}，仅支持 json/csv",
                errors=[f"仅支持 json 或 csv"],
                params_used={"format": fmt, "only": only}
            )

    def _export_json(self, records, fpath: str, only: str) -> ProcessingResult:
        data = [r.to_dict() for r in records]
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return ProcessingResult(
            success=True,
            code="OK",
            message=f"JSON 导出完成：{len(records)} 条",
            data={"file_path": fpath, "record_count": len(records)},
            params_used={"format": "json", "only": only, "output": fpath}
        )

    def _export_csv(self, records, fpath: str, only: str) -> ProcessingResult:
        headers = [
            "摊位号", "摊位名", "演出方", "联系方式",
            "授权期限", "授权可见", "曲目表齐全",
            "时码偏差(ms)", "状态", "未解决异常数",
            "异常类型", "异常级别", "异常描述",
            "版本来源", "版本ID", "创建时间", "更新时间"
        ]
        rows = []
        for r in records:
            unresolved = [a for a in r.anomalies if not a.resolved]
            anomaly_types = "、".join(a.type.value for a in unresolved)
            anomaly_levels = "、".join(a.level.value for a in unresolved)
            anomaly_descs = " | ".join(f"{a.type.value}:{a.description}" for a in unresolved)
            rows.append([
                r.booth_id,
                r.booth_name,
                r.performer,
                r.contact,
                r.authorization_period,
                "是" if r.authorization_visible else "否",
                "是" if r.setlist_complete else "否",
                r.timing_offset_ms,
                r.status.value,
                len(unresolved),
                anomaly_types,
                anomaly_levels,
                anomaly_descs,
                r.version.source,
                r.version.version_id[:8],
                r.created_at,
                r.updated_at
            ])
        with open(fpath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        return ProcessingResult(
            success=True,
            code="OK",
            message=f"CSV 导出完成：{len(records)} 条",
            data={"file_path": fpath, "record_count": len(records)},
            params_used={"format": "csv", "only": only, "output": fpath}
        )
