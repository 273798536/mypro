from __future__ import annotations

from datetime import datetime
from typing import List, Dict, Optional, Tuple

from .models import NoisePoint, PointStatus, generate_id


class VersionTracker:
    def __init__(self):
        self.point_history: Dict[str, List[NoisePoint]] = {}

    def _find_existing(self, new_point: NoisePoint, existing_points: List[NoisePoint]) -> Optional[NoisePoint]:
        for p in existing_points:
            if p.point_id == new_point.point_id and p.status != PointStatus.SUPERSEDED:
                return p
            if p.name == new_point.name and abs(p.gis_x - new_point.gis_x) < 0.001 and abs(p.gis_y - new_point.gis_y) < 0.001:
                if p.status != PointStatus.SUPERSEDED:
                    return p
        return None

    def merge_points(
        self,
        new_points: List[NoisePoint],
        existing_points: List[NoisePoint],
        replace_existing: bool = False,
    ) -> Tuple[List[NoisePoint], List[str]]:
        merged = existing_points.copy()
        changelog: List[str] = []

        for new_p in new_points:
            existing = self._find_existing(new_p, merged)

            if existing is None:
                merged.append(new_p)
                changelog.append(f"[新增] {new_p.name} (ID: {new_p.point_id}) 来源: {new_p.source.source_file}:{new_p.source.source_row}")
                continue

            if existing.noise_level == new_p.noise_level and existing.impact_range == new_p.impact_range:
                changelog.append(f"[跳过] {new_p.name} 数据无变化，已保留旧版 (v{existing.version})")
                continue

            if replace_existing:
                new_p.point_id = existing.point_id
                new_p.version = existing.version + 1
                new_p.created_at = existing.created_at
                new_p.updated_at = datetime.now().isoformat()
                new_p.evidence_notes = existing.evidence_notes + f" | v{existing.version}→v{new_p.version}: 来源 {new_p.source.source_file}"

                existing.status = PointStatus.SUPERSEDED
                existing.superseded_by = new_p.point_id
                existing.updated_at = datetime.now().isoformat()

                old_val = f"{existing.noise_level}dB"
                new_val = f"{new_p.noise_level}dB"
                changelog.append(
                    f"[取代] {new_p.name} v{existing.version}→v{new_p.version} "
                    f"噪声:{old_val}→{new_val} | 旧版保留可追溯 "
                    f"(旧版来源: {existing.source.source_file}:{existing.source.source_row})"
                )
                merged.append(new_p)
            else:
                new_p.point_id = existing.point_id
                new_p.version = existing.version + 1
                changelog.append(
                    f"[并存] {new_p.name} 新增版本 v{new_p.version} (与v{existing.version}共存) "
                    f"旧版来源: {existing.source.source_file}:{existing.source.source_row} "
                    f"新版来源: {new_p.source.source_file}:{new_p.source.source_row}"
                )
                merged.append(new_p)

        return merged, changelog

    def get_point_history(self, point_id: str, all_points: List[NoisePoint]) -> List[NoisePoint]:
        history = [p for p in all_points if p.point_id == point_id]
        return sorted(history, key=lambda x: x.version)

    def get_latest_points(self, all_points: List[NoisePoint]) -> List[NoisePoint]:
        latest_map: Dict[str, NoisePoint] = {}
        for p in all_points:
            if p.status == PointStatus.SUPERSEDED:
                continue
            if p.point_id not in latest_map or p.version > latest_map[p.point_id].version:
                latest_map[p.point_id] = p
        return list(latest_map.values())
