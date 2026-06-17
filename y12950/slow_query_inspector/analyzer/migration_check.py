"""迁移状态检查模块

检查迁移脚本与当前 Schema 的对应关系，判断迁移执行状态。
支持 Flyway 风格命名: V1__init.sql, V2__add_index.sql
"""

import re
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from parser.schema_parser import TableInfo, SchemaParser


@dataclass
class MigrationScript:
    version: str
    description: str
    file_name: str
    file_path: str
    version_num: int = 0


@dataclass
class MigrationStatus:
    script: MigrationScript
    status: str  # applied, pending, failed, unknown
    evidence: List[str] = field(default_factory=list)
    confidence: float = 0.0  # 0.0 - 1.0


class MigrationChecker:
    """迁移状态检查器"""

    VERSION_RE = re.compile(r"^V(\d+)__([^.]+)\.sql$", re.IGNORECASE)

    def __init__(self, migrations_dir: str, current_tables: Dict[str, TableInfo]):
        self.migrations_dir = migrations_dir
        self.current_tables = current_tables

    def check(self) -> dict:
        scripts = self._scan_migrations()
        statuses = []

        for script in scripts:
            status = self._check_script_status(script)
            statuses.append(status)

        applied = [s for s in statuses if s.status == "applied"]
        pending = [s for s in statuses if s.status == "pending"]
        failed = [s for s in statuses if s.status == "failed"]

        return {
            "total_migrations": len(statuses),
            "applied_count": len(applied),
            "pending_count": len(pending),
            "failed_count": len(failed),
            "applied": applied,
            "pending": pending,
            "failed": failed,
            "all_statuses": statuses,
            "latest_version": max([s.script.version_num for s in statuses]) if statuses else 0,
        }

    def _scan_migrations(self) -> List[MigrationScript]:
        scripts = []
        if not os.path.isdir(self.migrations_dir):
            return scripts

        for file_name in os.listdir(self.migrations_dir):
            if not file_name.lower().endswith(".sql"):
                continue

            m = self.VERSION_RE.match(file_name)
            if m:
                version_num = int(m.group(1))
                script = MigrationScript(
                    version=f"V{m.group(1)}",
                    description=m.group(2).replace("_", " "),
                    file_name=file_name,
                    file_path=os.path.join(self.migrations_dir, file_name),
                    version_num=version_num,
                )
                scripts.append(script)

        scripts.sort(key=lambda s: s.version_num)
        return scripts

    def _check_script_status(self, script: MigrationScript) -> MigrationStatus:
        status = MigrationStatus(script=script, status="pending", confidence=0.0)

        try:
            with open(script.file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            status.status = "unknown"
            status.evidence.append("无法读取迁移脚本")
            return status

        content_lower = content.lower()
        evidence = []
        score = 0.0

        create_tables = re.findall(r"create\s+table\s+(?:if\s+not\s+exists\s+)?`?(\w+)`?", content_lower)
        for tbl in create_tables:
            if tbl in self.current_tables:
                evidence.append(f"表 {tbl} 已存在")
                score += 0.3
            else:
                evidence.append(f"表 {tbl} 不存在")

        alter_tables = re.findall(r"alter\s+table\s+`?(\w+)`?", content_lower)
        for tbl in set(alter_tables):
            if tbl in self.current_tables:
                evidence.append(f"表 {tbl} 存在 (ALTER 目标)")
                score += 0.1

        add_columns = re.findall(r"add\s+(?:column\s+)?`?(\w+)`?\s+", content_lower)
        for alter_tbl in set(alter_tables):
            if alter_tbl in self.current_tables:
                tbl_info = self.current_tables[alter_tbl]
                for col in add_columns:
                    if tbl_info.get_column(col):
                        evidence.append(f"字段 {alter_tbl}.{col} 已存在")
                        score += 0.15

        add_indexes = re.findall(r"add\s+(?:index|key|unique|primary key)\s+(?:`?(\w+)`?\s*)?\(", content_lower)
        for alter_tbl in set(alter_tables):
            if alter_tbl in self.current_tables:
                tbl_info = self.current_tables[alter_tbl]
                for idx_name in add_indexes:
                    if idx_name and tbl_info.get_index(idx_name):
                        evidence.append(f"索引 {alter_tbl}.{idx_name} 已存在")
                        score += 0.2

        drop_tables = re.findall(r"drop\s+table\s+(?:if\s+exists\s+)?`?(\w+)`?", content_lower)
        for tbl in drop_tables:
            if tbl not in self.current_tables:
                evidence.append(f"表 {tbl} 已删除")
                score += 0.3
            else:
                evidence.append(f"表 {tbl} 仍存在 (DROP 未执行?)")

        if score >= 0.4:
            status.status = "applied"
        elif len(drop_tables) > 0 and score > 0:
            status.status = "applied"
        elif score >= 0.15:
            status.status = "applied"
        else:
            status.status = "pending"

        status.confidence = min(score, 1.0)
        status.evidence = evidence[:5]

        return status

    def summary_table_data(self, result: dict) -> List[dict]:
        """生成摘要表格数据"""
        rows = []
        for status in result["all_statuses"]:
            rows.append({
                "version": status.script.version,
                "description": status.script.description,
                "file": status.script.file_name,
                "status": status.status,
                "confidence": f"{status.confidence:.0%}",
                "evidence": "; ".join(status.evidence[:2]) if status.evidence else "",
            })
        return rows
