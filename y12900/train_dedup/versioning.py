"""版本追踪模块"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    AuditAction,
    AuditEntry,
    DatasetSnapshot,
    DedupRecord,
    LeakageRecord,
    Sample,
    VersionInfo,
)


class VersionManager:
    """版本管理器"""

    def __init__(self, repo_path: str | os.PathLike):
        self.repo_path = Path(repo_path)
        self.versions_dir = self.repo_path / "versions"
        self.meta_file = self.repo_path / "versions_meta.json"
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        self.versions_dir.mkdir(parents=True, exist_ok=True)
        if not self.meta_file.exists():
            self.meta_file.write_text(
                json.dumps({"versions": [], "latest": None}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def _load_meta(self) -> dict:
        return json.loads(self.meta_file.read_text(encoding="utf-8"))

    def _save_meta(self, meta: dict) -> None:
        self.meta_file.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def list_versions(self) -> list[dict]:
        meta = self._load_meta()
        return meta["versions"]

    def get_latest_version_id(self) -> Optional[str]:
        meta = self._load_meta()
        return meta.get("latest")

    def create_version(
        self,
        samples: list[Sample],
        dedup_records: Optional[list[DedupRecord]] = None,
        leakage_records: Optional[list[LeakageRecord]] = None,
        audit_log: Optional[list[AuditEntry]] = None,
        description: str = "",
        parent_version_id: Optional[str] = None,
        created_by: str = "system",
    ) -> VersionInfo:
        """创建新版本"""
        version_id = f"v{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        dedup_records = dedup_records or []
        leakage_records = leakage_records or []
        audit_log = audit_log or []

        version = VersionInfo(
            version_id=version_id,
            parent_version_id=parent_version_id or self.get_latest_version_id(),
            description=description,
            sample_count=len(samples),
            dedup_record_count=len(dedup_records),
            leakage_record_count=len(leakage_records),
            audit_count=len(audit_log),
            created_by=created_by,
        )

        snapshot = DatasetSnapshot(
            version=version,
            samples=samples,
            dedup_records=dedup_records,
            leakage_records=leakage_records,
            audit_log=audit_log,
        )

        snapshot_json = snapshot.to_json()
        version.compute_checksum(snapshot_json)

        version_file = self.versions_dir / f"{version_id}.json"
        version_file.write_text(snapshot_json, encoding="utf-8")

        meta = self._load_meta()
        meta["versions"].insert(0, version.to_dict())
        meta["latest"] = version_id
        self._save_meta(meta)

        return version

    def load_version(self, version_id: str) -> DatasetSnapshot:
        """加载指定版本"""
        version_file = self.versions_dir / f"{version_id}.json"
        if not version_file.exists():
            raise FileNotFoundError(f"版本 {version_id} 不存在")
        data = json.loads(version_file.read_text(encoding="utf-8"))
        return self._dict_to_snapshot(data)

    def load_latest(self) -> Optional[DatasetSnapshot]:
        """加载最新版本"""
        vid = self.get_latest_version_id()
        if not vid:
            return None
        return self.load_version(vid)

    def _dict_to_snapshot(self, data: dict) -> DatasetSnapshot:
        from .models import (
            AuditAction,
            SplitType,
            SourceRef,
        )

        version = VersionInfo(**data["version"])
        samples = []
        for s in data["samples"]:
            src = None
            if s.get("source_ref"):
                src = SourceRef(**s["source_ref"])
            s_clean = {k: v for k, v in s.items() if k != "source_ref" and k != "content_hash"}
            if "split" in s_clean and isinstance(s_clean["split"], str):
                s_clean["split"] = SplitType(s_clean["split"])
            samples.append(Sample(source_ref=src, **s_clean))

        dedup_records = [DedupRecord(**r) for r in data["dedup_records"]]
        leakage_records = [LeakageRecord(**r) for r in data["leakage_records"]]
        audit_log = []
        for a in data["audit_log"]:
            a_clean = dict(a)
            if "action" in a_clean and isinstance(a_clean["action"], str):
                a_clean["action"] = AuditAction(a_clean["action"])
            audit_log.append(AuditEntry(**a_clean))

        return DatasetSnapshot(
            version=version,
            samples=samples,
            dedup_records=dedup_records,
            leakage_records=leakage_records,
            audit_log=audit_log,
        )

    def diff_versions(self, version_id_a: str, version_id_b: str) -> dict:
        """比较两个版本的差异"""
        sa = self.load_version(version_id_a)
        sb = self.load_version(version_id_b)
        ids_a = {s.sample_id for s in sa.samples}
        ids_b = {s.sample_id for s in sb.samples}
        return {
            "added": list(ids_b - ids_a),
            "removed": list(ids_a - ids_b),
            "common": list(ids_a & ids_b),
            "sample_count_a": len(sa.samples),
            "sample_count_b": len(sb.samples),
            "dedup_count_a": len(sa.dedup_records),
            "dedup_count_b": len(sb.dedup_records),
            "leakage_count_a": len(sa.leakage_records),
            "leakage_count_b": len(sb.leakage_records),
        }
