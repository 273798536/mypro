"""索引建议模块 - 分析索引使用情况，给出优化建议"""

import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    IndexSuggestion,
    IndexType,
    AuditStatus,
    SourceReference,
    RecordSource,
)
from .storage import AuditStorage


class IndexAnalyzer:
    """索引分析器"""

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def analyze_slow_queries(
        self,
        slow_queries: List[dict],
        source_path: str,
        batch_id: Optional[str] = None,
    ) -> List[IndexSuggestion]:
        """
        从慢查询日志中分析索引建议

        Args:
            slow_queries: 慢查询列表，每项包含 query_sql, execution_time_ms, rows_examined, rows_sent, table_name
            source_path: 来源文件路径，用于溯源
            batch_id: 数据批次 ID

        Returns:
            索引建议列表
        """
        table_analysis: Dict[str, Dict] = defaultdict(
            lambda: {
                "slow_query_count": 0,
                "total_time_ms": 0,
                "columns": defaultdict(int),
                "queries": [],
                "avg_rows_examined": 0,
                "avg_rows_sent": 0,
            }
        )

        for q in slow_queries:
            table = q.get("table_name") or self._extract_table_name(q["query_sql"])
            if not table:
                continue

            analysis = table_analysis[table]
            analysis["slow_query_count"] += 1
            analysis["total_time_ms"] += q["execution_time_ms"]
            analysis["queries"].append(q)
            analysis["avg_rows_examined"] += q.get("rows_examined", 0)
            analysis["avg_rows_sent"] += q.get("rows_sent", 0)

            columns = self._extract_columns_from_where(q["query_sql"])
            for col in columns:
                analysis["columns"][col] += 1

        suggestions: List[IndexSuggestion] = []

        for table_name, analysis in table_analysis.items():
            if analysis["slow_query_count"] == 0:
                continue

            avg_time = analysis["total_time_ms"] / analysis["slow_query_count"]
            avg_rows_examined = analysis["avg_rows_examined"] / analysis["slow_query_count"]
            avg_rows_sent = analysis["avg_rows_sent"] / analysis["slow_query_count"]

            if avg_time < 50 or (analysis["slow_query_count"] < 2 and avg_time < 500):
                continue

            sorted_columns = sorted(
                analysis["columns"].items(), key=lambda x: x[1], reverse=True
            )

            if not sorted_columns:
                continue

            top_columns = [col for col, _ in sorted_columns[:3]]

            improvement_ratio = min(avg_rows_examined / max(avg_rows_sent, 1), 100)

            if improvement_ratio < 1.5:
                continue

            suggestion_id = str(uuid.uuid4())

            sources = [
                SourceReference(
                    source_type=RecordSource.SLOW_QUERY_LOG,
                    source_id=f"slow_query_{q.get('id', idx)}",
                    source_path=source_path,
                    line_number=None,
                    details=f"慢查询: {q['query_sql'][:100]}...",
                )
                for idx, q in enumerate(analysis["queries"][:5])
            ]

            suggestion = IndexSuggestion(
                id=suggestion_id,
                table_name=table_name,
                column_names=top_columns,
                index_type=IndexType.B_TREE,
                suggestion_reason=self._generate_reason(
                    analysis["slow_query_count"], avg_time, avg_rows_examined, avg_rows_sent
                ),
                expected_improvement=round(improvement_ratio, 2),
                current_index_count=0,
                status=AuditStatus.PENDING,
                sources=sources,
            )

            self.storage.add_index_suggestion(suggestion, batch_id)
            suggestions.append(suggestion)

        return suggestions

    def _extract_table_name(self, sql: str) -> Optional[str]:
        """从 SQL 中提取表名"""
        import re

        match = re.search(r"FROM\s+([\w]+)", sql, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

    def _extract_columns_from_where(self, sql: str) -> List[str]:
        """从 SQL 的 WHERE 子句中提取列名"""
        import re

        columns = []
        where_match = re.search(r"WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)", sql, re.IGNORECASE | re.DOTALL)
        if not where_match:
            return columns

        where_clause = where_match.group(1)

        where_clause = re.sub(r"'[^']*'", "?", where_clause)
        where_clause = re.sub(r'"[^"]*"', "?", where_clause)

        col_pattern = re.compile(
            r"(?:^|\s)([\w]+)\s*(?:=|>|<|>=|<=|!=|LIKE|IN)\s",
            re.IGNORECASE,
        )
        for match in col_pattern.finditer(where_clause):
            col = match.group(1)
            if col.upper() not in ("AND", "OR", "NOT", "NULL", "IS", "WHERE", "HAVING"):
                columns.append(col)

        return list(set(columns))

    def _generate_reason(
        self,
        query_count: int,
        avg_time_ms: float,
        avg_rows_examined: float,
        avg_rows_sent: float,
    ) -> str:
        """生成建议原因"""
        return (
            f"该表有 {query_count} 条慢查询，平均执行时间 {avg_time_ms:.1f}ms，"
            f"平均扫描 {avg_rows_examined:.0f} 行但仅返回 {avg_rows_sent:.0f} 行，"
            f"扫描/返回比为 {avg_rows_examined/max(avg_rows_sent, 1):.1f}x，"
            f"建议添加索引优化查询性能"
        )

    def validate_import(
        self,
        suggestions: List[IndexSuggestion],
        batch_id: Optional[str] = None,
        force: bool = False,
    ) -> Tuple[List[IndexSuggestion], List[str]]:
        """
        验证索引建议导入，检测重复导入

        Args:
            suggestions: 待导入的索引建议
            batch_id: 数据批次 ID
            force: 是否强制覆盖

        Returns:
            (可导入的建议, 警告信息列表)
        """
        existing = self.storage.get_index_suggestions(batch_id)
        existing_ids = {s.id for s in existing}

        warnings: List[str] = []
        valid_suggestions: List[IndexSuggestion] = []

        for s in suggestions:
            if s.id in existing_ids:
                if force:
                    warnings.append(f"索引建议 {s.id} 已存在，将被覆盖")
                    valid_suggestions.append(s)
                else:
                    warnings.append(f"索引建议 {s.id} 已存在，跳过（使用 --force 覆盖）")
            else:
                valid_suggestions.append(s)

        return valid_suggestions, warnings

    def get_index_suggestions(
        self,
        batch_id: Optional[str] = None,
        status: Optional[AuditStatus] = None,
    ) -> List[IndexSuggestion]:
        """获取索引建议"""
        suggestions = self.storage.get_index_suggestions(batch_id)
        if status:
            suggestions = [s for s in suggestions if s.status == status]
        return suggestions

    def trace_sources(self, suggestion_id: str) -> List[SourceReference]:
        """
        追溯索引建议的来源材料

        Args:
            suggestion_id: 索引建议 ID

        Returns:
            来源引用列表
        """
        suggestions = self.storage.get_index_suggestions()
        for s in suggestions:
            if s.id == suggestion_id:
                return s.sources
        return []
