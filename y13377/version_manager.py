from __future__ import annotations

import copy
import json
from typing import Any, Dict, List, Optional, Tuple

from models import (
    InfluenceLevel,
    MaterialType,
    NoteEntry,
    NoteSource,
    SampleRecord,
    TimelineEntry,
    VersionSnapshot,
)


class VersionRegistry:
    def __init__(self) -> None:
        self._versions: Dict[str, VersionSnapshot] = {}
        self._alias_map: Dict[str, str] = {}

    def register(self, snapshot: VersionSnapshot) -> None:
        self._versions[snapshot.version_id] = snapshot
        if snapshot.alias:
            self._alias_map[snapshot.alias] = snapshot.version_id

    def resolve(self, version_ref: str) -> Optional[VersionSnapshot]:
        if version_ref in self._versions:
            snap = self._versions[version_ref]
            return self._resolve_alias(snap)
        if version_ref in self._alias_map:
            real_id = self._alias_map[version_ref]
            return self._versions.get(real_id)
        return None

    def _resolve_alias(self, snap: VersionSnapshot) -> VersionSnapshot:
        if snap.alias and snap.alias in self._alias_map:
            real_id = self._alias_map[snap.alias]
            resolved = self._versions.get(real_id)
            if resolved:
                snap.resolved_version_id = real_id
                snap.is_legacy = True
                return resolved
        return snap

    def list_versions(self) -> List[VersionSnapshot]:
        return list(self._versions.values())

    def get_lineage(self, version_id: str) -> List[VersionSnapshot]:
        chain: List[VersionSnapshot] = []
        current = self._versions.get(version_id)
        while current:
            chain.append(current)
            if current.parent_version_id:
                current = self._versions.get(current.parent_version_id)
            else:
                break
        return chain


class FeatureSnapshotManager:
    def __init__(self, registry: VersionRegistry) -> None:
        self._registry = registry

    def load_snapshot(self, version_ref: str) -> Optional[Dict[str, Any]]:
        snap = self._registry.resolve(version_ref)
        if snap is None:
            return None
        return copy.deepcopy(snap.feature_snapshot)

    def compare_snapshots(
        self, version_ref_a: str, version_ref_b: str
    ) -> List[Dict[str, Any]]:
        snap_a = self._registry.resolve(version_ref_a)
        snap_b = self._registry.resolve(version_ref_b)
        if snap_a is None or snap_b is None:
            return []
        fa = snap_a.feature_snapshot
        fb = snap_b.feature_snapshot
        diffs: List[Dict[str, Any]] = []
        all_keys = sorted(set(list(fa.keys()) + list(fb.keys())))
        for key in all_keys:
            va = fa.get(key, "<MISSING>")
            vb = fb.get(key, "<MISSING>")
            if va != vb:
                diffs.append(
                    {
                        "feature": key,
                        "old_value": va,
                        "new_value": vb,
                        "version_old": snap_a.version_id,
                        "version_new": snap_b.version_id,
                    }
                )
        return diffs

    def identify_source(
        self, version_ref: str
    ) -> Dict[str, Any]:
        snap = self._registry.resolve(version_ref)
        if snap is None:
            return {"error": f"version {version_ref} not found"}
        result: Dict[str, Any] = {
            "version_id": snap.version_id,
            "is_legacy": snap.is_legacy,
            "alias_chain": [],
        }
        if snap.alias:
            result["alias_chain"].append(
                {"alias": snap.alias, "resolves_to": snap.resolved_version_id or snap.version_id}
            )
        lineage = self._registry.get_lineage(snap.version_id)
        result["lineage"] = [v.version_id for v in lineage]
        return result
