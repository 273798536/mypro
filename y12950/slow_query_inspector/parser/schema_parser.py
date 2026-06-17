"""SQL Schema 解析器

解析 MySQL DDL 语句，提取表、字段、索引等结构信息。
保留原始行号用于溯源。
"""

import re
import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class ColumnInfo:
    name: str
    data_type: str
    nullable: bool = True
    default: Optional[str] = None
    is_primary: bool = False
    is_auto_increment: bool = False
    comment: Optional[str] = None
    source_line: int = 0


@dataclass
class IndexInfo:
    name: str
    index_type: str  # PRIMARY, UNIQUE, INDEX, FULLTEXT
    columns: List[str] = field(default_factory=list)
    source_line: int = 0


@dataclass
class TableInfo:
    name: str
    columns: List[ColumnInfo] = field(default_factory=list)
    indexes: List[IndexInfo] = field(default_factory=list)
    engine: Optional[str] = None
    charset: Optional[str] = None
    comment: Optional[str] = None
    source_file: str = ""
    start_line: int = 0
    end_line: int = 0

    @property
    def primary_key_columns(self) -> List[str]:
        for idx in self.indexes:
            if idx.index_type == "PRIMARY":
                return idx.columns
        return []

    @property
    def column_names(self) -> List[str]:
        return [c.name for c in self.columns]

    @property
    def index_names(self) -> List[str]:
        return [idx.name for idx in self.indexes]

    def get_column(self, name: str) -> Optional[ColumnInfo]:
        for c in self.columns:
            if c.name.lower() == name.lower():
                return c
        return None

    def get_index(self, name: str) -> Optional[IndexInfo]:
        for idx in self.indexes:
            if idx.name.lower() == name.lower():
                return idx
        return None


class SchemaParser:
    """SQL Schema 解析器 - 支持 MySQL DDL"""

    CREATE_TABLE_RE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?", re.IGNORECASE)
    COLUMN_DEF_RE = re.compile(r"^\s*`(\w+)`\s+([\w]+(?:\s*\([^)]*\))?(?:\s+UNSIGNED)?(?:\s+ZEROFILL)?)", re.IGNORECASE)
    PRIMARY_KEY_RE = re.compile(r"^\s*PRIMARY\s+KEY\s*(?:\(([^)]+)\))?", re.IGNORECASE)
    UNIQUE_KEY_RE = re.compile(r"^\s*(?:UNIQUE\s+KEY|UNIQUE)\s+(?:`?(\w+)`?\s*)?\(([^)]+)\)", re.IGNORECASE)
    INDEX_KEY_RE = re.compile(r"^\s*(?:KEY|INDEX)\s+`?(\w+)?`?\s*\(([^)]+)\)", re.IGNORECASE)
    FULLTEXT_KEY_RE = re.compile(r"^\s*FULLTEXT\s+(?:KEY|INDEX)\s+`?(\w+)?`?\s*\(([^)]+)\)", re.IGNORECASE)
    ENGINE_RE = re.compile(r"\bENGINE\s*=\s*(\w+)", re.IGNORECASE)
    CHARSET_RE = re.compile(r"\b(?:DEFAULT\s+)?CHARSET\s*=\s*(\w+)", re.IGNORECASE)
    COMMENT_RE = re.compile(r"\bCOMMENT\s*=\s*'([^']*)'", re.IGNORECASE)
    AUTO_INCREMENT_RE = re.compile(r"\bAUTO_INCREMENT\b", re.IGNORECASE)
    NOT_NULL_RE = re.compile(r"\bNOT\s+NULL\b", re.IGNORECASE)
    DEFAULT_RE = re.compile(r"\bDEFAULT\s+('([^']*)'|\w+)", re.IGNORECASE)
    COLUMN_COMMENT_RE = re.compile(r"\bCOMMENT\s+'([^']*)'", re.IGNORECASE)

    def __init__(self, sql_path: str):
        self.sql_path = sql_path

    def parse(self) -> Dict[str, TableInfo]:
        """解析 SQL 文件，返回表名到表信息的映射"""
        tables = {}
        current_table = None
        in_create_table = False
        paren_depth = 0

        with open(self.sql_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("--") or stripped.startswith("/*"):
                continue

            create_match = self.CREATE_TABLE_RE.match(stripped)
            if create_match:
                table_name = create_match.group(1)
                current_table = TableInfo(
                    name=table_name,
                    source_file=self.sql_path,
                    start_line=line_num,
                    end_line=line_num,
                )
                in_create_table = True
                paren_depth = 0
                if "(" in stripped:
                    paren_depth += stripped.count("(") - stripped.count(")")
                continue

            if not in_create_table or current_table is None:
                continue

            current_table.end_line = line_num

            if "(" in stripped:
                paren_depth += stripped.count("(")
            if ")" in stripped:
                paren_depth -= stripped.count(")")

            pk_match = self.PRIMARY_KEY_RE.match(stripped)
            if pk_match and not stripped.startswith("`"):
                cols_str = pk_match.group(1) or ""
                cols = self._parse_index_columns(cols_str)
                if cols:
                    idx = IndexInfo(
                        name="PRIMARY",
                        index_type="PRIMARY",
                        columns=cols,
                        source_line=line_num,
                    )
                    current_table.indexes.append(idx)
                    for col_name in cols:
                        col = current_table.get_column(col_name)
                        if col:
                            col.is_primary = True
                continue

            uk_match = self.UNIQUE_KEY_RE.match(stripped)
            if uk_match and not stripped.startswith("`"):
                idx_name = uk_match.group(1) or f"uk_{len(current_table.indexes)}"
                cols_str = uk_match.group(2)
                cols = self._parse_index_columns(cols_str)
                idx = IndexInfo(
                    name=idx_name,
                    index_type="UNIQUE",
                    columns=cols,
                    source_line=line_num,
                )
                current_table.indexes.append(idx)
                continue

            ft_match = self.FULLTEXT_KEY_RE.match(stripped)
            if ft_match and not stripped.startswith("`"):
                idx_name = ft_match.group(1) or f"ft_{len(current_table.indexes)}"
                cols_str = ft_match.group(2)
                cols = self._parse_index_columns(cols_str)
                idx = IndexInfo(
                    name=idx_name,
                    index_type="FULLTEXT",
                    columns=cols,
                    source_line=line_num,
                )
                current_table.indexes.append(idx)
                continue

            idx_match = self.INDEX_KEY_RE.match(stripped)
            if idx_match and not stripped.startswith("`") and not stripped.upper().startswith("PRIMARY"):
                idx_name = idx_match.group(1) or f"idx_{len(current_table.indexes)}"
                cols_str = idx_match.group(2)
                cols = self._parse_index_columns(cols_str)
                idx = IndexInfo(
                    name=idx_name,
                    index_type="INDEX",
                    columns=cols,
                    source_line=line_num,
                )
                current_table.indexes.append(idx)
                continue

            col_match = self.COLUMN_DEF_RE.match(stripped)
            if col_match and stripped.startswith("`"):
                col_name = col_match.group(1)
                data_type = col_match.group(2).strip()

                is_nullable = not self.NOT_NULL_RE.search(stripped)
                is_auto_inc = bool(self.AUTO_INCREMENT_RE.search(stripped))

                default_val = None
                default_match = self.DEFAULT_RE.search(stripped)
                if default_match:
                    default_val = default_match.group(2) if default_match.group(2) is not None else default_match.group(1)

                comment = None
                comment_match = self.COLUMN_COMMENT_RE.search(stripped)
                if comment_match:
                    comment = comment_match.group(1)

                col = ColumnInfo(
                    name=col_name,
                    data_type=data_type,
                    nullable=is_nullable,
                    default=default_val,
                    is_auto_increment=is_auto_inc,
                    comment=comment,
                    source_line=line_num,
                )
                current_table.columns.append(col)
                continue

            engine_match = self.ENGINE_RE.search(stripped)
            if engine_match:
                current_table.engine = engine_match.group(1)

            charset_match = self.CHARSET_RE.search(stripped)
            if charset_match:
                current_table.charset = charset_match.group(1)

            comment_match = self.COMMENT_RE.search(stripped)
            if comment_match:
                current_table.comment = comment_match.group(1)

            if paren_depth <= 0 and stripped.endswith(";"):
                tables[current_table.name] = current_table
                in_create_table = False
                current_table = None

        return tables

    def _parse_index_columns(self, cols_str: str) -> List[str]:
        if not cols_str:
            return []
        cols = []
        for part in cols_str.split(","):
            part = part.strip()
            part = part.strip("`")
            if "(" in part:
                part = part.split("(")[0]
            if part:
                cols.append(part)
        return cols

    def table_summary(self, tables: Dict[str, TableInfo]) -> dict:
        total_tables = len(tables)
        total_columns = sum(len(t.columns) for t in tables.values())
        total_indexes = sum(len(t.indexes) for t in tables.values())
        return {
            "total_tables": total_tables,
            "total_columns": total_columns,
            "total_indexes": total_indexes,
            "table_names": sorted(tables.keys()),
        }
