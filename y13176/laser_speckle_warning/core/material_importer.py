from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .models import (
    Material,
    MaterialSource,
    MaterialStatus,
    SitePhoto,
)

STANDARD_NAMES = {
    "激光散斑采样照片A区",
    "激光散斑采样照片B区",
    "激光散斑采样照片C区",
    "激光散斑采样照片D区",
    "激光散斑阈值参数表",
    "现场检测记录单",
}

OLD_VERSION_PATTERNS = [
    re.compile(r"(旧版|legacy|v0\.[0-9]|2023|2022)", re.IGNORECASE),
    re.compile(r"(archive|backup|_old|_bak)", re.IGNORECASE),
]

NAME_MISMATCH_PATTERNS = [
    re.compile(r"(照片|采样|散斑)"),
]


def _detect_status(name: str, source: MaterialSource, raw: dict[str, Any]) -> tuple[MaterialStatus, Optional[str]]:
    if source == MaterialSource.VERBAL_NOTE:
        return MaterialStatus.VERBAL, "口头备注未经过标准化录入，需人工确认其对结论的影响权重"

    combined = f"{name} {json.dumps(raw, ensure_ascii=False)}"

    for pattern in OLD_VERSION_PATTERNS:
        if pattern.search(combined):
            return MaterialStatus.OLD_VERSION, "检测到旧版标识或归档后缀，该材料参数可能已被新版覆盖，需确认是否仍适用于本次预警"

    if name not in STANDARD_NAMES:
        match_count = sum(bool(p.search(name)) for p in NAME_MISMATCH_PATTERNS)
        if match_count > 0:
            matched = _find_closest_standard(name)
            desc = f"材料名称「{name}」不在标准清单中"
            if matched:
                desc += f"，建议匹配为「{matched}」"
            desc += "，需确认命名差异是否影响参数取值"
            return MaterialStatus.NAME_MISMATCH, desc

    return MaterialStatus.NORMAL, None


def _find_closest_standard(name: str) -> Optional[str]:
    tokens = set(re.findall(r"[\u4e00-\u9fa5A-Za-z0-9]+", name))
    best: Optional[str] = None
    best_score = 0
    for std in STANDARD_NAMES:
        std_tokens = set(re.findall(r"[\u4e00-\u9fa5A-Za-z0-9]+", std))
        score = len(tokens & std_tokens)
        if score > best_score:
            best_score = score
            best = std
    return best if best_score >= 2 else None


def _detect_source(raw: dict[str, Any], file_name: str) -> MaterialSource:
    if raw.get("source") == "verbal" or "口头" in file_name:
        return MaterialSource.VERBAL_NOTE
    if raw.get("kind") == "photo" or raw.get("speckle_intensity") is not None or "照片" in file_name:
        return MaterialSource.SITE_PHOTO
    return MaterialSource.DOCUMENT


def _detect_version(raw: dict[str, Any], file_name: str) -> str:
    for key in ("version", "版本", "ver"):
        if raw.get(key):
            return str(raw[key])
    m = re.search(r"v(\d+\.\d+)", file_name, re.IGNORECASE)
    if m:
        return f"v{m.group(1)}"
    return "v1.0"


def load_materials_from_dir(material_dir: Path) -> tuple[list[Material], list[SitePhoto]]:
    material_dir = Path(material_dir)
    materials: list[Material] = []
    photos: list[SitePhoto] = []

    json_files = sorted(material_dir.glob("**/*.json"))
    idx = 0
    photo_idx = 0

    for fp in json_files:
        try:
            raw = json.loads(fp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

        name = raw.get("name") or raw.get("材料名称") or fp.stem
        source = _detect_source(raw, fp.name)
        status, issue = _detect_status(name, source, raw)
        version = _detect_version(raw, fp.name)
        matched_std = _find_closest_standard(name) if status == MaterialStatus.NAME_MISMATCH else None

        captured_at = None
        if raw.get("captured_at") or raw.get("拍摄时间"):
            try:
                captured_at = datetime.fromisoformat(str(raw.get("captured_at") or raw.get("拍摄时间")))
            except ValueError:
                captured_at = None

        mat = Material(
            material_id=f"MAT-{idx:04d}",
            name=name,
            source=source,
            status=status,
            version=version,
            captured_at=captured_at,
            file_path=str(fp),
            raw_content=raw,
            matched_standard_name=matched_std,
            issue_description=issue,
        )
        materials.append(mat)
        idx += 1

        if source == MaterialSource.SITE_PHOTO and "speckle_intensity" in raw:
            photos.append(SitePhoto(
                photo_id=f"PHO-{photo_idx:04d}",
                file_path=str(fp),
                material_id=mat.material_id,
                sample_index=int(raw.get("sample_index", photo_idx)),
                position_label=raw.get("position_label", f"位置{photo_idx + 1}"),
                speckle_intensity=float(raw["speckle_intensity"]),
                has_sampling_gap=bool(raw.get("has_sampling_gap", False)),
                gap_info=raw.get("gap_info"),
                captured_at=captured_at,
            ))
            photo_idx += 1

    return materials, photos


def summarize_material_impact(materials: list[Material]) -> dict[str, list[dict[str, Any]]]:
    buckets: dict[str, list[dict[str, Any]]] = {
        "影响结论": [],
        "待确认": [],
        "正常": [],
    }
    for m in materials:
        trace = m.to_impact_trace()
        if m.status in (MaterialStatus.OLD_VERSION, MaterialStatus.NAME_MISMATCH):
            buckets["影响结论"].append(trace)
        elif m.status == MaterialStatus.VERBAL:
            buckets["待确认"].append(trace)
        else:
            buckets["正常"].append(trace)
    return buckets
