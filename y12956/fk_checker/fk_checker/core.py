from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .db import Database


@dataclass
class ForeignKeyInfo:
    constraint_name: str
    table_name: str
    column_name: str
    referenced_table_name: str
    referenced_column_name: str


@dataclass
class BrokenLinkRecord:
    table_name: str
    column_name: str
    referenced_table: str
    referenced_column: str
    broken_value: Any
    broken_count: int
    sample_ids: List[Any] = field(default_factory=list)


@dataclass
class CheckResult:
    fk_total: int = 0
    fk_checked: int = 0
    broken_links: List[BrokenLinkRecord] = field(default_factory=list)
    error_messages: List[str] = field(default_factory=list)

    @property
    def broken_count(self) -> int:
        return len(self.broken_links)

    @property
    def total_broken_rows(self) -> int:
        return sum(bl.broken_count for bl in self.broken_links)


class FKChecker:
    def __init__(self, db: Database):
        self.db = db

    def discover_foreign_keys(self, schema: str) -> List[ForeignKeyInfo]:
        sql = """
            SELECT
                CONSTRAINT_NAME,
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM
                information_schema.KEY_COLUMN_USAGE
            WHERE
                TABLE_SCHEMA = %s
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY
                TABLE_NAME, CONSTRAINT_NAME
        """
        rows = self.db.execute(sql, (schema,))
        return [
            ForeignKeyInfo(
                constraint_name=row["CONSTRAINT_NAME"],
                table_name=row["TABLE_NAME"],
                column_name=row["COLUMN_NAME"],
                referenced_table_name=row["REFERENCED_TABLE_NAME"],
                referenced_column_name=row["REFERENCED_COLUMN_NAME"],
            )
            for row in rows
        ]

    def check_foreign_key(self, fk: ForeignKeyInfo, schema: str, limit_samples: int = 10) -> Optional[BrokenLinkRecord]:
        try:
            sql = f"""
                SELECT
                    t.`{fk.column_name}` AS broken_value,
                    COUNT(*) AS broken_count
                FROM
                    `{schema}`.`{fk.table_name}` t
                LEFT JOIN
                    `{schema}`.`{fk.referenced_table_name}` r
                    ON t.`{fk.column_name}` = r.`{fk.referenced_column_name}`
                WHERE
                    r.`{fk.referenced_column_name}` IS NULL
                    AND t.`{fk.column_name}` IS NOT NULL
                GROUP BY
                    t.`{fk.column_name}`
                ORDER BY
                    broken_count DESC
            """
            rows = self.db.execute(sql)
            if not rows:
                return None

            sample_sql = f"""
                SELECT * FROM `{schema}`.`{fk.table_name}`
                WHERE `{fk.column_name}` = %s
                LIMIT {limit_samples}
            """
            sample_ids = []
            if rows:
                sample_rows = self.db.execute(sample_sql, (rows[0]["broken_value"],))
                pk_col = self._get_primary_key(fk.table_name, schema)
                if pk_col:
                    sample_ids = [r[pk_col] for r in sample_rows]

            total_broken = sum(r["broken_count"] for r in rows)
            first_value = rows[0]["broken_value"]

            return BrokenLinkRecord(
                table_name=fk.table_name,
                column_name=fk.column_name,
                referenced_table=fk.referenced_table_name,
                referenced_column=fk.referenced_column_name,
                broken_value=first_value,
                broken_count=total_broken,
                sample_ids=sample_ids,
            )
        except Exception as e:
            raise RuntimeError(f"检查外键 {fk.constraint_name} 失败: {str(e)}")

    def _get_primary_key(self, table_name: str, schema: str) -> Optional[str]:
        sql = """
            SELECT COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = %s
              AND CONSTRAINT_NAME = 'PRIMARY'
            ORDER BY ORDINAL_POSITION
            LIMIT 1
        """
        row = self.db.execute_one(sql, (schema, table_name))
        return row["COLUMN_NAME"] if row else None

    def run_full_check(self, schema: str, tables: Optional[List[str]] = None) -> CheckResult:
        result = CheckResult()
        all_fks = self.discover_foreign_keys(schema)
        result.fk_total = len(all_fks)

        if tables:
            all_fks = [fk for fk in all_fks if fk.table_name in tables]

        for fk in all_fks:
            try:
                broken = self.check_foreign_key(fk, schema)
                if broken:
                    result.broken_links.append(broken)
                result.fk_checked += 1
            except Exception as e:
                result.error_messages.append(str(e))

        return result
