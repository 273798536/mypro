"""慢查询归因模块 - 将慢查询结论追溯回来源材料"""

import uuid
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from .models import (
    SlowQueryRecord,
    IndexSuggestion,
    SourceReference,
    RecordSource,
)
from .storage import AuditStorage
from .errors import SourceNotFoundError


class SlowQueryAttributor:
    """慢查询归因器 - 把结论拉回来源材料"""

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def import_slow_queries(
        self,
        queries: List[dict],
        source_path: str,
        batch_id: Optional[str] = None,
    ) -> List[SlowQueryRecord]:
        """
        导入慢查询记录

        Args:
            queries: 慢查询列表
            source_path: 来源文件路径（用于溯源）
            batch_id: 数据批次 ID

        Returns:
            慢查询记录列表
        """
        records: List[SlowQueryRecord] = []

        for idx, q in enumerate(queries):
            record_id = str(uuid.uuid4())
            table_name = q.get("table_name") or self._extract_table_name(q["query_sql"])

            sources = [
                SourceReference(
                    source_type=RecordSource.SLOW_QUERY_LOG,
                    source_id=f"slow_query_{idx}",
                    source_path=source_path,
                    line_number=q.get("line_number"),
                    details=f"原始慢查询记录 #{idx}",
                )
            ]

            record = SlowQueryRecord(
                id=record_id,
                query_sql=q["query_sql"],
                execution_time_ms=q["execution_time_ms"],
                rows_examined=q.get("rows_examined", 0),
                rows_sent=q.get("rows_sent", 0),
                timestamp=datetime.fromisoformat(q["timestamp"]) if isinstance(q.get("timestamp"), str) else q.get("timestamp", datetime.now()),
                table_name=table_name,
                sources=sources,
            )

            self.storage.add_slow_query(record, batch_id)
            records.append(record)

        return records

    def attribute_queries(
        self,
        batch_id: Optional[str] = None,
    ) -> List[SlowQueryRecord]:
        """
        对慢查询进行归因分析，关联到索引建议

        Args:
            batch_id: 数据批次 ID

        Returns:
            归因后的慢查询记录
        """
        queries = self.storage.get_slow_queries(batch_id)
        suggestions = self.storage.get_index_suggestions(batch_id)

        suggestion_by_table: Dict[str, List[IndexSuggestion]] = {}
        for s in suggestions:
            suggestion_by_table.setdefault(s.table_name, []).append(s)

        attributed: List[SlowQueryRecord] = []

        for query in queries:
            if not query.table_name:
                continue

            table_suggestions = suggestion_by_table.get(query.table_name, [])
            if not table_suggestions:
                continue

            best_match = None
            best_match_score = 0

            for suggestion in table_suggestions:
                score = self._calculate_match_score(query, suggestion)
                if score > best_match_score:
                    best_match_score = score
                    best_match = suggestion

            if best_match and best_match_score > 0:
                query.related_index_suggestion_id = best_match.id
                query.attribution = self._determine_attribution(query, best_match)
                query.attribution_details = (
                    f"匹配索引建议 {best_match.id}，"
                    f"匹配度: {best_match_score:.0f}%，"
                    f"建议列: {', '.join(best_match.column_names)}"
                )

            attributed.append(query)

        return attributed

    def _calculate_match_score(
        self, query: SlowQueryRecord, suggestion: IndexSuggestion
    ) -> float:
        """计算慢查询与索引建议的匹配度"""
        query_columns = self._extract_columns_from_where(query.query_sql)
        suggestion_columns = set(suggestion.column_names)

        if not query_columns:
            return 0

        matched = query_columns & suggestion_columns
        if not matched:
            return 0

        coverage = len(matched) / len(query_columns) * 100

        if query.execution_time_ms > 1000:
            coverage = min(coverage * 1.2, 100)

        return coverage

    def _determine_attribution(
        self, query: SlowQueryRecord, suggestion: IndexSuggestion
    ) -> str:
        """确定归因结论"""
        ratio = query.rows_examined / max(query.rows_sent, 1)

        if ratio > 100 and query.execution_time_ms > 500:
            return "严重性能问题 - 缺少有效索引导致全表扫描"
        elif ratio > 10 and query.execution_time_ms > 100:
            return "性能瓶颈 - 索引覆盖不足"
        elif query.execution_time_ms > 50:
            return "潜在优化点 - 添加索引可进一步提升"
        else:
            return "轻度慢查询 - 建议监控"

    def _extract_table_name(self, sql: str) -> Optional[str]:
        """从 SQL 提取表名"""
        match = re.search(r"FROM\s+([\w]+)", sql, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

    def _extract_columns_from_where(self, sql: str) -> set:
        """从 WHERE 子句提取列名"""
        columns = set()
        where_match = re.search(
            r"WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|HAVING|$)",
            sql,
            re.IGNORECASE | re.DOTALL,
        )
        if not where_match:
            return columns

        where_clause = where_match.group(1)

        where_clause = re.sub(r"'[^']*'", "?", where_clause)
        where_clause = re.sub(r'"[^"]*"', "?", where_clause)

        col_pattern = re.compile(
            r"(?:^|\s)([\w]+)\s*(?:=|>|<|>=|<=|!=|LIKE|IN|BETWEEN)\s",
            re.IGNORECASE,
        )
        for match in col_pattern.finditer(where_clause):
            col = match.group(1)
            if col.upper() not in ("AND", "OR", "NOT", "NULL", "IS", "TRUE", "FALSE", "WHERE", "HAVING"):
                columns.add(col)

        return columns

    def trace_query_sources(self, query_id: str) -> List[SourceReference]:
        """
        追溯慢查询的来源材料

        Args:
            query_id: 慢查询 ID

        Returns:
            来源引用列表

        Raises:
            SourceNotFoundError: 未找到查询记录
        """
        queries = self.storage.get_slow_queries()
        for q in queries:
            if q.id == query_id:
                return q.sources

        raise SourceNotFoundError(
            source_type="slow_query",
            source_id=query_id,
        )

    def get_attribution_summary(
        self,
        batch_id: Optional[str] = None,
    ) -> Dict[str, int]:
        """获取归因统计摘要"""
        queries = self.storage.get_slow_queries(batch_id)

        summary = {
            "total": len(queries),
            "attributed": 0,
            "by_type": {},
            "by_table": {},
        }

        for q in queries:
            if q.attribution:
                summary["attributed"] += 1
                summary["by_type"][q.attribution] = summary["by_type"].get(q.attribution, 0) + 1

            if q.table_name:
                summary["by_table"][q.table_name] = summary["by_table"].get(q.table_name, 0) + 1

        return summary

    def validate_import(
        self,
        records: List[SlowQueryRecord],
        batch_id: Optional[str] = None,
        force: bool = False,
    ) -> Tuple[List[SlowQueryRecord], List[str]]:
        """
        验证慢查询导入，检测重复

        Returns:
            (可导入的记录, 警告信息列表)
        """
        existing = self.storage.get_slow_queries(batch_id)
        existing_sqls = {q.query_sql for q in existing}

        warnings: List[str] = []
        valid_records: List[SlowQueryRecord] = []
        duplicates = 0

        for r in records:
            if r.query_sql in existing_sqls:
                duplicates += 1
                if force:
                    valid_records.append(r)
                else:
                    continue
            else:
                valid_records.append(r)

        if duplicates > 0:
            if force:
                warnings.append(f"检测到 {duplicates} 条重复慢查询，已覆盖")
            else:
                warnings.append(f"检测到 {duplicates} 条重复慢查询，已跳过（使用 --force 覆盖）")

        return valid_records, warnings
