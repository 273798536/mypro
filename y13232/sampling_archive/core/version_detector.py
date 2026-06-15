import re
from typing import List, Optional, Tuple, Dict, Any
from ..models.material import Material, MaterialStatus


class VersionDetector:
    def __init__(self):
        pass

    def parse_version(self, version_str: str) -> Tuple[int, ...]:
        if not version_str:
            return (1, 0)
        cleaned = re.sub(r'[vV]', '', version_str.strip())
        parts = cleaned.split('.')
        try:
            return tuple(int(p) for p in parts if p.isdigit())
        except ValueError:
            return (1, 0)

    def compare_versions(self, v1: str, v2: str) -> int:
        ver1 = self.parse_version(v1)
        ver2 = self.parse_version(v2)
        if ver1 > ver2:
            return 1
        elif ver1 < ver2:
            return -1
        else:
            return 0

    def is_newer(self, new_material: Material, existing: Material) -> bool:
        cmp = self.compare_versions(new_material.version, existing.version)
        if cmp > 0:
            return True
        if cmp == 0:
            if new_material.file_size > existing.file_size:
                return True
            if new_material.submitted_at and existing.submitted_at:
                return new_material.submitted_at > existing.submitted_at
        return False

    def is_older(self, new_material: Material, existing: Material) -> bool:
        cmp = self.compare_versions(new_material.version, existing.version)
        if cmp < 0:
            return True
        if cmp == 0:
            if new_material.file_size < existing.file_size:
                return True
            if new_material.submitted_at and existing.submitted_at:
                return new_material.submitted_at < existing.submitted_at
        return False

    def detect_conflict(self, new_material: Material, existing: Material) -> Optional[Dict[str, Any]]:
        if self.is_older(new_material, existing):
            return {
                "type": "older_version",
                "new_version": new_material.version,
                "existing_version": existing.version,
                "new_version_source": new_material.version_source or new_material.source,
                "existing_version_source": existing.version_source or existing.source,
                "new_submitted_by": new_material.submitted_by,
                "existing_submitted_by": existing.submitted_by,
                "new_submitted_at": new_material.submitted_at,
                "existing_submitted_at": existing.submitted_at,
                "new_file_size": new_material.file_size,
                "existing_file_size": existing.file_size,
                "recommendation": "建议保留现有版本，新版本较低。如确认是正确版本，请人工改判。",
                "suggested_action": "keep_existing"
            }
        elif self.is_newer(new_material, existing):
            return {
                "type": "newer_version",
                "new_version": new_material.version,
                "existing_version": existing.version,
                "new_version_source": new_material.version_source or new_material.source,
                "existing_version_source": existing.version_source or existing.source,
                "new_submitted_by": new_material.submitted_by,
                "existing_submitted_by": existing.submitted_by,
                "new_submitted_at": new_material.submitted_at,
                "existing_submitted_at": existing.submitted_at,
                "new_file_size": new_material.file_size,
                "existing_file_size": existing.file_size,
                "recommendation": "检测到更新版本，建议更新。请人工确认后再覆盖。",
                "suggested_action": "review_update"
            }
        else:
            return None

    def handle_version_conflict(self, new_material: Material, existing: Material, conflict_info: Dict[str, Any]) -> Material:
        new_material.status = MaterialStatus.CONFLICT
        if not new_material.raw_data:
            new_material.raw_data = {}
        new_material.raw_data["version_conflict"] = conflict_info
        if not new_material.notes:
            new_material.notes = ""
        new_material.notes += f"\n\n[版本冲突] {conflict_info['recommendation']}"
        new_material.notes += f"\n  当前版本: {existing.version} (来源: {conflict_info['existing_version_source']})"
        new_material.notes += f"\n  提交版本: {new_material.version} (来源: {conflict_info['new_version_source']})"
        return new_material
