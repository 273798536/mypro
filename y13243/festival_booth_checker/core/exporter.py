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

    def _filter_records(self, only: str) -> List:
        all_recs = self.storage.get_all()
        if only == "anomalies":
            return [r for r in all_recs if any(not a.resolved for a in r.anomalies)]
        if only == "pending":
            return [r for r in all_recs if r.status in (
                BoothStatus.NEED_EVIDENCE,
                BoothStatus.NEED_REVIEW,
                BoothStatus.CONFLICT,
                BoothStatus.PENDING,
                BoothStatus.PROCESSING,
            )]
        if only == "passed":
            return [r for r in all_recs if r.status in (BoothStatus.PASSED, BoothStatus.REJECTED)]
        return all_recs

    def _dashboard_summary(self) -> Dict[str, Any]:
        all_recs = self.storage.get_all()
        status_counts: Dict[str, int] = {}
        for r in all_recs:
            status_counts[r.status.value] = status_counts.get(r.status.value, 0) + 1
        anomaly_locations = []
        need_evidence = []
        for r in all_recs:
            for a in r.anomalies:
                if not a.resolved:
                    anomaly_locations.append({
                        "booth_id": r.booth_id,
                        "booth_name": r.booth_name,
                        "type": a.type.value,
                        "level": a.level.value,
                        "location": a.location,
                        "description": a.description,
                        "screenshot_hint": a.screenshot_hint
                    })
            if r.status == BoothStatus.NEED_EVIDENCE:
                need_evidence.append({
                    "booth_id": r.booth_id,
                    "booth_name": r.booth_name,
                    "performer": r.performer,
                    "version_source": r.version.source,
                    "unresolved_anomalies": len([a for a in r.anomalies if not a.resolved])
                })
        return {
            "generated_at": datetime.now().isoformat(),
            "status_counts": status_counts,
            "handled_count": status_counts.get("已通过", 0) + status_counts.get("已驳回", 0),
            "pending_count": status_counts.get("待处理", 0) + status_counts.get("处理中", 0),
            "action_needed_count": (
                status_counts.get("待补证据", 0)
                + status_counts.get("版本冲突", 0)
                + status_counts.get("待复核", 0)
            ),
            "anomaly_locations": anomaly_locations,
            "need_evidence_list": need_evidence
        }

    def export_all(self, fmt: str = "json", only: str = "all") -> ProcessingResult:
        fmt = fmt.lower()
        records = self._filter_records(only)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"booth_export_{only}_{timestamp}.{fmt}"
        fpath = os.path.join(self.export_dir, fname)

        if fmt == "json":
            return self._export_json(records, fpath, only)
        if fmt == "csv":
            return self._export_csv(records, fpath, only)
        return ProcessingResult(
            success=False,
            code="UNSUPPORTED_FORMAT",
            message=f"不支持的导出格式：{fmt}，仅支持 json/csv",
            errors=[f"仅支持 json 或 csv"],
            params_used={"format": fmt, "only": only}
        )

    def _export_json(self, records, fpath: str, only: str) -> ProcessingResult:
        payload = {
            "summary": self._dashboard_summary(),
            "filter": {"only": only},
            "record_count": len(records),
            "records": [r.to_dict() for r in records]
        }
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return ProcessingResult(
            success=True,
            code="OK",
            message=f"JSON 导出完成：{len(records)} 条（含 dashboard 摘要）",
            data={
                "file_path": fpath,
                "record_count": len(records),
                "summary": payload["summary"]
            },
            params_used={"format": "json", "only": only, "output": fpath}
        )

    def _export_csv(self, records, fpath: str, only: str) -> ProcessingResult:
        headers = [
            "摊位号", "摊位名", "演出方", "联系方式",
            "授权期限", "授权可见", "曲目表齐全",
            "时码偏差(ms)", "状态", "未解决异常数",
            "异常类型", "异常级别", "异常定位", "异常描述", "需补截图提示",
            "版本来源", "版本ID", "创建时间", "更新时间"
        ]
        rows = []
        for r in records:
            unresolved = [a for a in r.anomalies if not a.resolved]
            if unresolved:
                types = "；".join(a.type.value for a in unresolved)
                levels = "；".join(a.level.value for a in unresolved)
                locations = "；".join((a.location or "-") for a in unresolved)
                descs = "；".join(f"{a.type.value}-{a.description}" for a in unresolved)
                screenshots = "；".join((a.screenshot_hint or "-") for a in unresolved)
            else:
                types = levels = locations = descs = screenshots = ""
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
                types,
                levels,
                locations,
                descs,
                screenshots,
                r.version.source,
                r.version.version_id[:8],
                r.created_at,
                r.updated_at
            ])
        with open(fpath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
            writer.writerow(headers)
            writer.writerows(rows)
        summary = self._dashboard_summary()
        return ProcessingResult(
            success=True,
            code="OK",
            message=f"CSV 导出完成：{len(records)} 条（UTF-8 BOM + CRLF，可直接用 Excel/Numbers 打开）",
            data={
                "file_path": fpath,
                "record_count": len(records),
                "column_count": len(headers),
                "summary": summary
            },
            params_used={"format": "csv", "only": only, "output": fpath}
        )
