from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .db import Database


@dataclass
class IndexSuggestion:
    table_name: str
    column_name: str
    index_name: str
    reason: str
    estimated_benefit: str = ""


@dataclass
class IndexAnalysisResult:
    existing_indexes: Dict[str, List[str]] = field(default_factory=dict)
    suggestions: List[IndexSuggestion] = field(default_factory=list)


class IndexAnalyzer:
    def __init__(self, db: Database):
        self.db = db

    def get_existing_indexes(self, schema: str, table: str) -> List[Dict[str, Any]]:
        sql = "SHOW INDEX FROM `{}`.`{}`".format(schema, table)
        return self.db.execute(sql)

    def analyze_foreign_key_indexes(self, schema: str, fks: list) -> IndexAnalysisResult:
        result = IndexAnalysisResult()

        tables_seen = set()
        for fk in fks:
            if fk.table_name not in tables_seen:
                indexes = self.get_existing_indexes(schema, fk.table_name)
                col_indexes = {}
                for idx in indexes:
                    col = idx["Column_name"]
                    key_name = idx["Key_name"]
                    if col not in col_indexes:
                        col_indexes[col] = []
                    col_indexes[col].append(key_name)
                result.existing_indexes[fk.table_name] = col_indexes
                tables_seen.add(fk.table_name)

        for fk in fks:
            col = fk.column_name
            table = fk.table_name
            col_indexes = result.existing_indexes.get(table, {})

            has_index = col in col_indexes

            if not has_index:
                suggestion = IndexSuggestion(
                    table_name=table,
                    column_name=col,
                    index_name=f"idx_{table}_{col}",
                    reason="外键列缺少索引，JOIN 查询性能差，外键检查也会变慢",
                    estimated_benefit="外键检查速度提升 5-10 倍",
                )
                result.suggestions.append(suggestion)

        return result

    def compare_index_analysis(self, old: IndexAnalysisResult, new: IndexAnalysisResult) -> Dict[str, Any]:
        old_sugs = {(s.table_name, s.column_name) for s in old.suggestions}
        new_sugs = {(s.table_name, s.column_name) for s in new.suggestions}

        return {
            "added": [s for s in new.suggestions if (s.table_name, s.column_name) not in old_sugs],
            "removed": [s for s in old.suggestions if (s.table_name, s.column_name) not in new_sugs],
            "unchanged": [s for s in new.suggestions if (s.table_name, s.column_name) in old_sugs],
            "old_count": len(old.suggestions),
            "new_count": len(new.suggestions),
        }
