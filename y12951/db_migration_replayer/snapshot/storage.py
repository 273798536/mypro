"""快照存储管理。

支持文件系统和元数据库双重存储：
- 文件系统：JSON 格式，便于人工查看
- 元数据库：便于历史查询和审计
"""
import os
import json
from typing import List, Optional

from ..config import get_config
from ..metadb import get_conn, now_iso
from .collector import Snapshot


class SnapshotStorage:
    """快照存储管理器。"""

    def __init__(self, storage_dir: Optional[str] = None):
        cfg = get_config()
        self.storage_dir = storage_dir or os.path.join(cfg.output_dir, "snapshots")
        os.makedirs(self.storage_dir, exist_ok=True)

    def _snapshot_path(self, name: str, version: str) -> str:
        return os.path.join(self.storage_dir, f"{name}_v{version}.json")

    def save(self, snapshot: Snapshot) -> str:
        """保存快照，返回文件路径。"""
        path = self._snapshot_path(snapshot.name, snapshot.version)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snapshot.to_dict(), f, indent=2, ensure_ascii=False)

        self._save_to_metadb(snapshot)
        return path

    def _save_to_metadb(self, snapshot: Snapshot):
        """保存元数据到内部数据库（幂等）。"""
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT OR REPLACE INTO snapshots
                (name, version, snapshot_json, created_at, created_by)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    snapshot.name,
                    snapshot.version,
                    json.dumps(snapshot.to_dict(), ensure_ascii=False),
                    snapshot.created_at,
                    snapshot.created_by,
                ),
            )

    def load(self, name: str, version: str) -> Optional[Snapshot]:
        """加载快照。"""
        path = self._snapshot_path(name, version)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Snapshot.from_dict(data)

    def list(self, name: Optional[str] = None) -> List[dict]:
        """列出所有快照元数据。"""
        with get_conn() as conn:
            cur = conn.cursor()
            if name:
                cur.execute(
                    "SELECT name, version, created_at, created_by FROM snapshots WHERE name = ? ORDER BY version",
                    (name,),
                )
            else:
                cur.execute(
                    "SELECT name, version, created_at, created_by FROM snapshots ORDER BY name, version"
                )
            return [dict(row) for row in cur.fetchall()]

    def list_versions(self, name: str) -> List[str]:
        """列出某个快照的所有版本。"""
        items = self.list(name)
        return [item["version"] for item in items]

    def latest_version(self, name: str) -> Optional[str]:
        """获取最新版本号。"""
        versions = self.list_versions(name)
        return versions[-1] if versions else None


def save_snapshot(snapshot: Snapshot) -> str:
    return SnapshotStorage().save(snapshot)


def load_snapshot(name: str, version: str) -> Optional[Snapshot]:
    return SnapshotStorage().load(name, version)


def list_snapshots(name: Optional[str] = None) -> List[dict]:
    return SnapshotStorage().list(name)
