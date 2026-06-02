import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from models import (
    AudioMaterial,
    ProjectUsage,
    AuditReport,
    AuditDataset,
)


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"]:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return datetime.now()


def import_materials(file_path: str) -> Dict[str, AudioMaterial]:
    materials: Dict[str, AudioMaterial] = {}
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"音频素材文件不存在: {file_path}")

    if path.suffix == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data:
            mat = AudioMaterial(
                material_id=item["material_id"],
                title=item["title"],
                duration=float(item["duration"]),
                source_tags=item.get("source_tags", []),
                manual_tags=item.get("manual_tags", []),
                merged_tags=item.get("merged_tags", []),
                file_hash=item.get("file_hash", ""),
                source_file=item.get("source_file", ""),
                import_time=_parse_datetime(item.get("import_time")),
                merge_history=item.get("merge_history", []),
            )
            materials[mat.material_id] = mat

    elif path.suffix == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                mat = AudioMaterial(
                    material_id=row["material_id"],
                    title=row["title"],
                    duration=float(row["duration"]),
                    source_tags=[t.strip() for t in row.get("source_tags", "").split("|") if t.strip()],
                    manual_tags=[t.strip() for t in row.get("manual_tags", "").split("|") if t.strip()],
                    merged_tags=[t.strip() for t in row.get("merged_tags", "").split("|") if t.strip()],
                    file_hash=row.get("file_hash", ""),
                    source_file=row.get("source_file", ""),
                    import_time=_parse_datetime(row.get("import_time")),
                )
                materials[mat.material_id] = mat

    return materials


def import_usages(file_path: str) -> Dict[str, ProjectUsage]:
    usages: Dict[str, ProjectUsage] = {}
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"项目用途文件不存在: {file_path}")

    if path.suffix == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data:
            usage = ProjectUsage(
                usage_id=item["usage_id"],
                project_name=item["project_name"],
                scene_desc=item["scene_desc"],
                required_mood=item.get("required_mood", []),
                assigned_material_ids=item.get("assigned_material_ids", []),
                usage_context=item.get("usage_context", ""),
                assigned_time=_parse_datetime(item.get("assigned_time")),
                auditor_notes=item.get("auditor_notes", ""),
            )
            usages[usage.usage_id] = usage

    elif path.suffix == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                usage = ProjectUsage(
                    usage_id=row["usage_id"],
                    project_name=row["project_name"],
                    scene_desc=row["scene_desc"],
                    required_mood=[t.strip() for t in row.get("required_mood", "").split("|") if t.strip()],
                    assigned_material_ids=[t.strip() for t in row.get("assigned_material_ids", "").split("|") if t.strip()],
                    usage_context=row.get("usage_context", ""),
                    assigned_time=_parse_datetime(row.get("assigned_time")),
                    auditor_notes=row.get("auditor_notes", ""),
                )
                usages[usage.usage_id] = usage

    return usages


def import_reports(file_path: str) -> Dict[str, AuditReport]:
    reports: Dict[str, AuditReport] = {}
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"审计报告文件不存在: {file_path}")

    if path.suffix == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data:
            report = AuditReport(
                report_id=item["report_id"],
                material_id=item["material_id"],
                auditor_tags=item.get("auditor_tags", []),
                auditor_comments=item.get("auditor_comments", ""),
                audit_time=_parse_datetime(item.get("audit_time")),
                auditor=item.get("auditor", ""),
                merge_suggestions=item.get("merge_suggestions", []),
            )
            reports[report.report_id] = report

    elif path.suffix == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                report = AuditReport(
                    report_id=row["report_id"],
                    material_id=row["material_id"],
                    auditor_tags=[t.strip() for t in row.get("auditor_tags", "").split("|") if t.strip()],
                    auditor_comments=row.get("auditor_comments", ""),
                    audit_time=_parse_datetime(row.get("audit_time")),
                    auditor=row.get("auditor", ""),
                    merge_suggestions=[t.strip() for t in row.get("merge_suggestions", "").split("|") if t.strip()],
                )
                reports[report.report_id] = report

    return reports


def import_all(
    materials_path: str,
    usages_path: str,
    reports_path: str,
) -> AuditDataset:
    dataset = AuditDataset()
    dataset.materials = import_materials(materials_path)
    dataset.usages = import_usages(usages_path)
    dataset.reports = import_reports(reports_path)
    return dataset
