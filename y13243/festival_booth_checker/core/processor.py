from typing import List, Tuple, Dict, Any

from .models import BoothRecord, BoothStatus, ProcessingResult, AnomalyRecord
from .config import Config
from .storage import BoothStorage
from .scanner import FileScanner
from .detector import AnomalyDetector


class BoothProcessor:
    def __init__(self, config: Config):
        self.config = config
        self.storage = BoothStorage(config)
        self.scanner = FileScanner(config, self.storage)
        self.detector = AnomalyDetector(config)

    def scan_and_process(self, input_dir: str = None, operator: str = "system",
                         force: bool = False) -> ProcessingResult:
        records, scan_errors = self.scanner.scan_directory(input_dir)
        if scan_errors:
            return ProcessingResult(
                success=False,
                code="SCAN_ERROR",
                message="扫描文件出错",
                errors=scan_errors,
                params_used={"input_dir": input_dir or self.config["input_dir"]}
            )

        if not records:
            return ProcessingResult(
                success=True,
                code="NO_RECORDS",
                message="未发现任何可处理记录",
                data={"count": 0},
                params_used={"input_dir": input_dir or self.config["input_dir"]}
            )

        processed = []
        skipped = []
        conflicts = []
        all_screenshots = []

        for rec in records:
            anomalies = self.detector.detect(rec)
            new_status = self.detector.determine_status(rec, anomalies)

            existing = self.storage.get(rec.booth_id)
            if existing and not force:
                if self.storage._is_older_version(rec.version, existing.version):
                    conf = self.storage.get_version_info(rec.booth_id)
                    conflicts.append({
                        "booth_id": rec.booth_id,
                        "booth_name": rec.booth_name,
                        "current_source": existing.version.source,
                        "current_version": existing.version.version_id[:8],
                        "incoming_source": rec.version.source,
                        "incoming_version": rec.version.version_id[:8],
                        "suggestion": conf["suggestion"] if conf else "请人工确认"
                    })
                    skipped.append(rec.booth_id)
                    continue

            rec.anomalies = anomalies
            rec.status = new_status

            ok, msg = self.storage.upsert(rec, operator)
            if not ok:
                conflicts.append({"booth_id": rec.booth_id, "message": msg})
                skipped.append(rec.booth_id)
            else:
                if existing and existing.status.value != new_status.value:
                    pass
                processed.append({
                    "booth_id": rec.booth_id,
                    "booth_name": rec.booth_name,
                    "status": new_status.value,
                    "anomalies": [a.to_dict() for a in anomalies],
                    "anomaly_count": len(anomalies)
                })
                for a in anomalies:
                    if a.screenshot_hint and a.screenshot_hint not in all_screenshots:
                        all_screenshots.append(a.screenshot_hint)

        code = "PARTIAL" if skipped else "OK"
        success = len(processed) > 0

        return ProcessingResult(
            success=success,
            code=code,
            message=f"处理完成：成功 {len(processed)}，跳过 {len(skipped)}，冲突 {len(conflicts)}",
            data={
                "processed": processed,
                "skipped": skipped,
                "conflicts": conflicts,
                "totals": {
                    "input_total": len(records),
                    "processed": len(processed),
                    "skipped": len(skipped),
                    "conflicts": len(conflicts)
                }
            },
            errors=scan_errors,
            screenshot_hints=all_screenshots,
            params_used={
                "input_dir": input_dir or self.config["input_dir"],
                "operator": operator,
                "force": force
            }
        )

    def get_dashboard(self) -> ProcessingResult:
        status_groups: Dict[str, List[Dict[str, Any]]] = {}
        priority = self.config["status_priority"]
        for s in priority:
            status_groups[s] = []
        status_groups["全部"] = []

        all_records = self.storage.get_all()
        need_evidence = []
        anomaly_locations = []

        for rec in all_records:
            item = {
                "booth_id": rec.booth_id,
                "booth_name": rec.booth_name,
                "performer": rec.performer,
                "status": rec.status.value,
                "unresolved_anomalies": len([a for a in rec.anomalies if not a.resolved]),
                "version_source": rec.version.source
            }
            status_groups[rec.status.value].append(item)
            status_groups["全部"].append(item)

            if rec.status == BoothStatus.NEED_EVIDENCE:
                need_evidence.append(item)
            for a in rec.anomalies:
                if not a.resolved and a.location:
                    anomaly_locations.append({
                        "booth_id": rec.booth_id,
                        "booth_name": rec.booth_name,
                        "type": a.type.value,
                        "level": a.level.value,
                        "location": a.location,
                        "description": a.description
                    })

        status_summary = {k: len(v) for k, v in status_groups.items() if k != "全部"}

        return ProcessingResult(
            success=True,
            code="OK",
            message="状态看板已生成",
            data={
                "status_summary": status_summary,
                "status_groups": status_groups,
                "need_evidence_list": need_evidence,
                "anomaly_locations": anomaly_locations,
                "handled_count": status_summary.get("已通过", 0) + status_summary.get("已驳回", 0),
                "pending_count": status_summary.get("待处理", 0) + status_summary.get("处理中", 0),
                "action_needed_count": status_summary.get("待补证据", 0) + status_summary.get("版本冲突", 0) + status_summary.get("待复核", 0)
            }
        )

    def get_summary_for_alan(self) -> ProcessingResult:
        dash = self.get_dashboard().data
        return ProcessingResult(
            success=True,
            code="OK",
            message="演出统筹接班摘要",
            data={
                "样例目录": self.config["sample_dir"],
                "导出目录": self.config["export_dir"],
                "状态文件": self.config["state_file"],
                "异常位置": dash.get("anomaly_locations", []),
                "待补证据": dash.get("need_evidence_list", []),
                "导出命令参考": {
                    "导出全部CSV": "python3 booth_checker.py export --format csv --only all",
                    "导出异常明细JSON": "python3 booth_checker.py export --format json --only anomalies",
                    "导出待处理CSV": "python3 booth_checker.py export --format csv --only pending",
                    "导出已通过JSON": "python3 booth_checker.py export --format json --only passed"
                },
                "统计": {
                    "待处理": dash.get("pending_count", 0),
                    "需行动": dash.get("action_needed_count", 0),
                    "已完成": dash.get("handled_count", 0)
                }
            }
        )
