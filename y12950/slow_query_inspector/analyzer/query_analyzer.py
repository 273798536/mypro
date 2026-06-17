"""慢查询分析器

对慢查询进行静态分析，判断索引失效风险，给出风险分级。
风险等级：
  - green (可直接用): 有明确索引命中，扫描行数合理
  - yellow (建议关注): 有优化空间，但影响可控
  - red (需工程师复核): 明确索引失效或全表扫描风险高
"""

import re
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from parser.slow_log_parser import SlowQueryEntry
from parser.schema_parser import TableInfo


@dataclass
class QueryAnalysis:
    entry: SlowQueryEntry
    risk_level: str  # green, yellow, red
    risk_reasons: List[str] = field(default_factory=list)
    tables_involved: List[str] = field(default_factory=list)
    where_columns: List[str] = field(default_factory=list)
    available_indexes: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    can_use_directly: bool = False
    scan_efficiency: float = 0.0  # rows_sent / rows_examined

    @property
    def source_ref(self) -> str:
        return self.entry.source_ref

    @property
    def sql_summary(self) -> str:
        return self.entry.sql_summary


class QueryAnalyzer:
    """慢查询分析器"""

    SELECT_TABLE_RE = re.compile(r"FROM\s+([\w`.,\s]+?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+LIMIT|\s+HAVING|\s*$)", re.IGNORECASE | re.DOTALL)
    UPDATE_TABLE_RE = re.compile(r"UPDATE\s+([\w`.,\s]+?)(?:\s+SET|\s+WHERE|\s*$)", re.IGNORECASE | re.DOTALL)
    DELETE_TABLE_RE = re.compile(r"DELETE\s+FROM\s+([\w`.,\s]+?)(?:\s+WHERE|\s*$)", re.IGNORECASE | re.DOTALL)
    WHERE_CLAUSE_RE = re.compile(r"WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s+HAVING|\s*;?\s*$)", re.IGNORECASE | re.DOTALL)
    WHERE_COLUMN_RE = re.compile(r"(\b\w+\b)\s*(?:=|!=|<>|>=|<=|>|<|LIKE|IN\s*\(|NOT\s+IN|BETWEEN|IS)", re.IGNORECASE)
    FUNCTION_COLUMN_RE = re.compile(r"(\w+)\s*\(\s*`?(\w+)`?\s*\)", re.IGNORECASE)
    LIKE_PREFIX_RE = re.compile(r"\b(\w+)\s+LIKE\s+['\"]%", re.IGNORECASE)

    def __init__(self, slow_queries: List[SlowQueryEntry], tables: Dict[str, TableInfo]):
        self.slow_queries = slow_queries
        self.tables = tables

    def analyze(self) -> dict:
        """分析所有慢查询，返回聚合结果"""
        analyses = []
        for entry in self.slow_queries:
            analysis = self._analyze_one(entry)
            analyses.append(analysis)

        green = [a for a in analyses if a.risk_level == "green"]
        yellow = [a for a in analyses if a.risk_level == "yellow"]
        red = [a for a in analyses if a.risk_level == "red"]

        return {
            "total": len(analyses),
            "green_count": len(green),
            "yellow_count": len(yellow),
            "red_count": len(red),
            "index_risk_count": len(red) + len(yellow),
            "need_review_count": len(red),
            "green": green,
            "yellow": yellow,
            "red": red,
            "all": analyses,
            "top_by_time": sorted(analyses, key=lambda a: a.entry.query_time, reverse=True),
            "by_table": self._group_by_table(analyses),
        }

    def _analyze_one(self, entry: SlowQueryEntry) -> QueryAnalysis:
        sql = entry.sql_text
        analysis = QueryAnalysis(
            entry=entry,
            risk_level="green",
            scan_efficiency=0.0,
        )

        if entry.rows_examined > 0:
            analysis.scan_efficiency = entry.rows_sent / entry.rows_examined

        tables = self._extract_tables(sql)
        analysis.tables_involved = tables

        where_cols = self._extract_where_columns(sql)
        analysis.where_columns = where_cols

        available_idx = []
        for tbl_name in tables:
            tbl = self.tables.get(tbl_name)
            if tbl:
                for idx in tbl.indexes:
                    available_idx.append(f"{tbl_name}.{idx.name}({', '.join(idx.columns)})")
        analysis.available_indexes = available_idx

        risk_score = 0
        reasons = []
        suggestions = []

        if entry.rows_examined > 10000 and entry.rows_sent < entry.rows_examined * 0.01:
            risk_score += 3
            reasons.append(f"扫描效率极低：扫描 {entry.rows_examined} 行，仅返回 {entry.rows_sent} 行")
            suggestions.append("建议检查 WHERE 条件是否能命中索引")

        if entry.query_time > 10.0:
            risk_score += 2
            reasons.append(f"查询耗时较长：{entry.query_time:.2f}s")

        if entry.rows_examined > 100000:
            risk_score += 2
            reasons.append(f"扫描行数过大：{entry.rows_examined} 行")

        like_prefix_cols = self._check_like_prefix(sql)
        for col in like_prefix_cols:
            risk_score += 2
            reasons.append(f"LIKE 前缀通配导致索引失效: {col}")
            suggestions.append(f"建议将 {col} 的 LIKE '%...' 改为全文索引或反转存储")

        func_cols = self._check_function_on_index(sql, tables)
        for fc in func_cols:
            risk_score += 2
            reasons.append(f"对索引列使用函数: {fc}")
            suggestions.append(f"建议避免在 WHERE 条件中对 {fc} 使用函数，考虑建立计算列索引")

        if not where_cols and entry.rows_examined > 1000:
            risk_score += 3
            reasons.append("无 WHERE 条件的全表扫描")
            suggestions.append("建议添加过滤条件或确认是否为统计类查询")

        if where_cols and tables:
            has_index_match = False
            for tbl_name in tables:
                tbl = self.tables.get(tbl_name)
                if not tbl:
                    continue
                for idx in tbl.indexes:
                    first_col = idx.columns[0].lower() if idx.columns else ""
                    for wc in where_cols:
                        if wc.lower() == first_col:
                            has_index_match = True
                            break
                    if has_index_match:
                        break
                if has_index_match:
                    break

            if not has_index_match and entry.rows_examined > 1000:
                risk_score += 2
                reasons.append("WHERE 条件列与现有索引前缀不匹配")
                suggestions.append("建议评估是否需要新增索引或调整查询写法")

        or_risk = self._check_or_without_index(sql, tables)
        if or_risk:
            risk_score += 1
            reasons.append("OR 条件可能导致索引失效")
            suggestions.append("建议考虑拆分查询或使用 UNION 替代")

        not_in_risk = self._check_not_in(sql)
        if not_in_risk:
            risk_score += 1
            reasons.append("NOT IN 可能导致索引失效")
            suggestions.append("建议评估是否可用 LEFT JOIN ... IS NULL 替代")

        if risk_score >= 5:
            analysis.risk_level = "red"
            analysis.can_use_directly = False
        elif risk_score >= 2:
            analysis.risk_level = "yellow"
            analysis.can_use_directly = True
        else:
            analysis.risk_level = "green"
            analysis.can_use_directly = True

        analysis.risk_reasons = reasons
        analysis.suggestions = suggestions

        return analysis

    def _extract_tables(self, sql: str) -> List[str]:
        tables = set()

        patterns = [self.SELECT_TABLE_RE, self.UPDATE_TABLE_RE, self.DELETE_TABLE_RE]
        for pattern in patterns:
            m = pattern.search(sql)
            if m:
                table_str = m.group(1)
                for part in re.split(r",", table_str):
                    part = part.strip().strip("`")
                    part = re.split(r"\s+", part)[0] if part else ""
                    if part and not part.upper().startswith("("):
                        tables.add(part)

        join_matches = re.findall(r"JOIN\s+`?(\w+)`?", sql, re.IGNORECASE)
        for t in join_matches:
            tables.add(t)

        return sorted(tables)

    def _extract_where_columns(self, sql: str) -> List[str]:
        m = self.WHERE_CLAUSE_RE.search(sql)
        if not m:
            return []

        where_clause = m.group(1)
        cols = set()

        for match in self.WHERE_COLUMN_RE.finditer(where_clause):
            col = match.group(1)
            if col.upper() not in ("AND", "OR", "NOT", "NULL", "IS", "IN", "LIKE", "BETWEEN", "WHERE", "ON"):
                cols.add(col)

        return sorted(cols)

    def _check_like_prefix(self, sql: str) -> List[str]:
        cols = []
        for m in self.LIKE_PREFIX_RE.finditer(sql):
            cols.append(m.group(1))
        return cols

    def _check_function_on_index(self, sql: str, tables: List[str]) -> List[str]:
        cols = []
        where_match = self.WHERE_CLAUSE_RE.search(sql)
        if not where_match:
            return cols

        where_clause = where_match.group(1)
        func_uses = self.FUNCTION_COLUMN_RE.findall(where_clause)

        indexed_cols = set()
        for tbl_name in tables:
            tbl = self.tables.get(tbl_name)
            if tbl:
                for idx in tbl.indexes:
                    for col in idx.columns:
                        indexed_cols.add(col.lower())

        for func_name, col_name in func_uses:
            if col_name.lower() in indexed_cols:
                cols.append(f"{func_name}({col_name})")

        return cols

    def _check_or_without_index(self, sql: str, tables: List[str]) -> bool:
        where_match = self.WHERE_CLAUSE_RE.search(sql)
        if not where_match:
            return False

        where_clause = where_match.group(1)
        return " OR " in where_clause.upper()

    def _check_not_in(self, sql: str) -> bool:
        where_match = self.WHERE_CLAUSE_RE.search(sql)
        if not where_match:
            return False

        where_upper = where_match.group(1).upper()
        return "NOT IN" in where_upper

    def _group_by_table(self, analyses: List[QueryAnalysis]) -> Dict[str, List[QueryAnalysis]]:
        groups = {}
        for a in analyses:
            for tbl in a.tables_involved:
                if tbl not in groups:
                    groups[tbl] = []
                groups[tbl].append(a)
        return groups
