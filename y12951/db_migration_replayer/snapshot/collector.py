"""表结构快照采集器。

从 SQLite 数据库（可扩展到其他数据库）采集表结构信息，生成结构化快照。
"""
import sqlite3
import json
from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional
from datetime import datetime


@dataclass
class ColumnInfo:
    """列信息。"""

    name: str
    type: str
    nullable: bool
    default: Optional[str]
    pk: int  # 主键序号，0 表示非主键


@dataclass
class IndexInfo:
    """索引信息。"""

    name: str
    columns: List[str]
    unique: bool


@dataclass
class TableInfo:
    """表结构信息。"""

    name: str
    columns: List[ColumnInfo]
    indexes: List[IndexInfo]
    row_count: int


@dataclass
class Snapshot:
    """表结构快照。"""

    name: str
    version: str
    created_at: str
    created_by: str
    tables: Dict[str, TableInfo]
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "created_at": self.created_at,
            "created_by": self.created_by,
            "description": self.description,
            "tables": {
                name: {
                    "name": tbl.name,
                    "row_count": tbl.row_count,
                    "columns": [asdict(c) for c in tbl.columns],
                    "indexes": [asdict(idx) for idx in tbl.indexes],
                }
                for name, tbl in self.tables.items()
            },
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Snapshot":
        tables = {}
        for tname, tdata in data["tables"].items():
            columns = [ColumnInfo(**c) for c in tdata["columns"]]
            indexes = [IndexInfo(**idx) for idx in tdata["indexes"]]
            tables[tname] = TableInfo(
                name=tdata["name"],
                columns=columns,
                indexes=indexes,
                row_count=tdata["row_count"],
            )
        return cls(
            name=data["name"],
            version=data["version"],
            created_at=data["created_at"],
            created_by=data["created_by"],
            description=data.get("description", ""),
            tables=tables,
        )


class SnapshotCollector:
    """从 SQLite 数据库采集表结构快照。"""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def collect(
        self,
        snapshot_name: str,
        version: str,
        created_by: str = "system",
        description: str = "",
    ) -> Snapshot:
        """采集快照。"""
        conn = sqlite3.connect(self.db_path)
        try:
            tables = self._collect_tables(conn)
        finally:
            conn.close()

        return Snapshot(
            name=snapshot_name,
            version=version,
            created_at=datetime.now().isoformat(timespec="seconds"),
            created_by=created_by,
            description=description,
            tables=tables,
        )

    def _collect_tables(self, conn: sqlite3.Connection) -> Dict[str, TableInfo]:
        cur = conn.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        table_names = [row[0] for row in cur.fetchall()]

        tables = {}
        for tname in table_names:
            tables[tname] = self._collect_table(conn, tname)
        return tables

    def _collect_table(self, conn: sqlite3.Connection, table_name: str) -> TableInfo:
        cur = conn.cursor()

        cur.execute(f"PRAGMA table_info('{table_name}')")
        columns = []
        for row in cur.fetchall():
            # cid, name, type, notnull, dflt_value, pk
            columns.append(
                ColumnInfo(
                    name=row[1],
                    type=row[2],
                    nullable=row[3] == 0,
                    default=row[4],
                    pk=row[5],
                )
            )

        cur.execute(f"PRAGMA index_list('{table_name}')")
        indexes = []
        for row in cur.fetchall():
            # seq, name, unique, origin, partial
            idx_name = row[1]
            is_unique = row[2] == 1
            cur.execute(f"PRAGMA index_info('{idx_name}')")
            idx_cols = [r[2] for r in cur.fetchall()]
            indexes.append(IndexInfo(name=idx_name, columns=idx_cols, unique=is_unique))

        cur.execute(f"SELECT COUNT(*) FROM '{table_name}'")
        row_count = cur.fetchone()[0]

        return TableInfo(
            name=table_name, columns=columns, indexes=indexes, row_count=row_count
        )


def collect_snapshot(
    db_path: str,
    snapshot_name: str,
    version: str,
    created_by: str = "system",
    description: str = "",
) -> Snapshot:
    """快捷函数：采集快照。"""
    collector = SnapshotCollector(db_path)
    return collector.collect(snapshot_name, version, created_by, description)
