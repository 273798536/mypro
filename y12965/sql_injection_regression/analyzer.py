import re
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from .config import RunConfig, SourceRef
from .version_manager import VersionManager
from .importer import ImportedMaterial
from .models import (
    MaterialType,
    SlowQueryFinding,
    RollbackRecord,
    IndexSuggestion,
    MigrationScript,
    RegressionReport,
    ReportSummary,
)


class RegressionAnalyzer:
    def __init__(self, config: RunConfig, version_manager: VersionManager):
        self.config = config
        self.version_manager = version_manager

    def analyze(self, materials: List[ImportedMaterial]) -> RegressionReport:
        slow_queries = self._extract_slow_queries(materials)
        rollbacks = self._extract_rollbacks(materials)
        migrations = self._extract_migrations(materials)
        index_suggestions = self._extract_index_suggestions(materials)

        self._link_slow_queries_to_migrations(slow_queries, migrations)
        self._link_rollbacks_to_migrations(rollbacks, migrations)
        self._link_index_suggestions_to_evidence(
            index_suggestions, slow_queries, materials
        )
        self._classify_sre_review(slow_queries, rollbacks, index_suggestions)

        summary = self._build_summary(
            slow_queries, rollbacks, index_suggestions, migrations
        )

        case_id = self.config.case_id or f"case_{uuid.uuid4().hex[:8]}"

        return RegressionReport(
            report_id=f"report_{uuid.uuid4().hex[:12]}",
            generated_at=datetime.now(),
            case_id=case_id,
            material_versions=[m.version for m in materials],
            slow_query_findings=slow_queries,
            rollback_records=rollbacks,
            index_suggestions=index_suggestions,
            migration_scripts=migrations,
            summary=summary,
        )

    def _extract_slow_queries(
        self, materials: List[ImportedMaterial]
    ) -> List[SlowQueryFinding]:
        findings = []

        for material in materials:
            if material.version.material_type != MaterialType.SLOW_QUERY_LOG:
                continue

            for query_data in material.parsed_data:
                root_cause, confidence = self._analyze_slow_query_root_cause(
                    query_data["query"]
                )

                source_ref = SourceRef(
                    file_name=material.version.file_name,
                    line_number=query_data.get("start_line"),
                    note=f"慢查询, 执行时间: {query_data.get('execution_time_ms', 0):.0f}ms",
                    raw_content=query_data["query"],
                )

                finding = SlowQueryFinding(
                    finding_id=f"sq_{uuid.uuid4().hex[:12]}",
                    query=query_data["query"],
                    execution_time_ms=float(query_data.get("execution_time_ms", 0)),
                    rows_examined=int(query_data.get("rows_examined", 0)),
                    root_cause=root_cause,
                    severity=self._calculate_severity(
                        query_data.get("execution_time_ms", 0),
                        query_data.get("rows_examined", 0),
                    ),
                    source_ref=source_ref,
                    confidence=confidence,
                )
                findings.append(finding)

        return findings

    def _analyze_slow_query_root_cause(
        self, query: str
    ) -> Tuple[str, float]:
        query_upper = query.upper()

        if "LIKE" in query_upper and "'%" in query:
            return "前导通配符导致索引失效", 0.95

        if "UNION" in query_upper and "SELECT" in query_upper:
            return "UNION查询可能导致性能问题", 0.8

        if "ORDER BY" in query_upper and "LIMIT" not in query_upper:
            return "全量排序未分页", 0.9

        match = re.search(r"WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)", query, re.IGNORECASE | re.DOTALL)
        if match:
            where_clause = match.group(1)
            if "OR" in where_clause.upper():
                return "OR条件可能导致索引失效", 0.85
            if re.search(r"\b\w+\s*=\s*\w+\b", where_clause):
                return "字段比较或函数操作导致索引失效", 0.75

        if "SELECT *" in query_upper:
            return "全字段查询可能不必要", 0.6

        if "JOIN" in query_upper and "ON" not in query_upper:
            return "笛卡尔积查询风险", 0.99

        return "需要进一步分析查询计划", 0.3

    def _calculate_severity(self, execution_time_ms: float, rows_examined: int) -> str:
        if execution_time_ms >= 10000 or rows_examined >= 1000000:
            return "critical"
        elif execution_time_ms >= 2000 or rows_examined >= 100000:
            return "high"
        elif execution_time_ms >= 500 or rows_examined >= 10000:
            return "medium"
        return "low"

    def _extract_rollbacks(
        self, materials: List[ImportedMaterial]
    ) -> List[RollbackRecord]:
        records = []

        for material in materials:
            if material.version.material_type != MaterialType.ROLLBACK_LOG:
                continue

            for rb_data in material.parsed_data:
                source_ref = SourceRef(
                    file_name=material.version.file_name,
                    line_number=rb_data.get("start_line"),
                    note=f"回滚记录: {rb_data.get('rollback_reason', '未知原因')}",
                    raw_content="\n".join(rb_data.get("affected_queries", [])),
                )

                record = RollbackRecord(
                    record_id=f"rb_{uuid.uuid4().hex[:12]}",
                    migration_script_id=rb_data.get("migration_script_id", "unknown"),
                    rollback_reason=rb_data.get("rollback_reason", "未知原因"),
                    rollback_time=rb_data.get("rollback_time", datetime.now()),
                    affected_queries=rb_data.get("affected_queries", []),
                    source_ref=source_ref,
                )
                records.append(record)

        return records

    def _extract_migrations(
        self, materials: List[ImportedMaterial]
    ) -> List[MigrationScript]:
        scripts = []

        for material in materials:
            if material.version.material_type != MaterialType.MIGRATION_SCRIPT:
                continue

            source_ref = SourceRef(
                file_name=material.version.file_name,
                note=f"迁移脚本版本: {material.parsed_data.get('version', 'unknown')}",
                raw_content=material.parsed_data.get("content", ""),
            )

            script = MigrationScript(
                script_id=f"mig_{uuid.uuid4().hex[:12]}",
                file_name=material.version.file_name,
                version=material.parsed_data.get("version", material.version.file_name),
                sql_content=material.parsed_data.get("content", ""),
                source_ref=source_ref,
            )
            scripts.append(script)

        return scripts

    def _extract_index_suggestions(
        self, materials: List[ImportedMaterial]
    ) -> List[IndexSuggestion]:
        suggestions = []

        for material in materials:
            if material.version.material_type != MaterialType.INDEX_SUGGESTION:
                continue

            for sugg_data in material.parsed_data:
                source_ref = SourceRef(
                    file_name=material.version.file_name,
                    line_number=sugg_data.get("start_line"),
                    note=f"索引建议: {sugg_data.get('table_name', 'unknown')}",
                    raw_content=sugg_data.get("suggested_index", ""),
                )

                suggestion = IndexSuggestion(
                    suggestion_id=f"idx_{uuid.uuid4().hex[:12]}",
                    table_name=sugg_data.get("table_name", "unknown"),
                    suggested_index=sugg_data.get("suggested_index", ""),
                    benefit_description=sugg_data.get(
                        "benefit_description", "未描述具体收益"
                    ),
                    source_ref=source_ref,
                )
                suggestions.append(suggestion)

        return suggestions

    def _link_slow_queries_to_migrations(
        self,
        slow_queries: List[SlowQueryFinding],
        migrations: List[MigrationScript],
    ):
        for sq in slow_queries:
            query_tables = self._extract_table_names(sq.query)

            for migration in migrations:
                migration_tables = self._extract_table_names(migration.sql_content)
                if query_tables & migration_tables:
                    sq.related_migration = migration.script_id
                    if sq.finding_id not in migration.linked_findings:
                        migration.linked_findings.append(sq.finding_id)

    def _link_rollbacks_to_migrations(
        self,
        rollbacks: List[RollbackRecord],
        migrations: List[MigrationScript],
    ):
        for rb in rollbacks:
            for migration in migrations:
                if rb.migration_script_id in (
                    migration.version,
                    migration.file_name,
                    migration.script_id,
                ):
                    if rb.record_id not in migration.linked_rollbacks:
                        migration.linked_rollbacks.append(rb.record_id)

    def _link_index_suggestions_to_evidence(
        self,
        index_suggestions: List[IndexSuggestion],
        slow_queries: List[SlowQueryFinding],
        materials: List[ImportedMaterial],
    ):
        for sugg in index_suggestions:
            table = sugg.table_name.lower()

            for sq in slow_queries:
                query_tables = {t.lower() for t in self._extract_table_names(sq.query)}
                if table in query_tables:
                    sugg.evidence_source_refs.append(sq.source_ref)

            for material in materials:
                if material.version.material_type == MaterialType.SLOW_QUERY_LOG:
                    for line_num, line in enumerate(material.content.splitlines(), 1):
                        if table in line.lower() and ("SELECT" in line.upper() or "WHERE" in line.upper()):
                            already_exists = any(
                                ref.line_number == line_num
                                and ref.file_name == material.version.file_name
                                for ref in sugg.evidence_source_refs
                            )
                            if not already_exists:
                                sugg.evidence_source_refs.append(
                                    SourceRef(
                                        file_name=material.version.file_name,
                                        line_number=line_num,
                                        note="查询证据",
                                        raw_content=line.strip(),
                                    )
                                )

    def _extract_table_names(self, sql: str) -> set:
        tables = set()

        from_pattern = r"FROM\s+([\w_]+(?:\s*,\s*[\w_]+)*)"
        join_pattern = r"JOIN\s+([\w_]+)"
        update_pattern = r"UPDATE\s+([\w_]+)"
        insert_pattern = r"INTO\s+([\w_]+)"
        create_pattern = r"TABLE\s+([\w_]+)"
        alter_pattern = r"TABLE\s+([\w_]+)"

        for pattern in [
            from_pattern,
            join_pattern,
            update_pattern,
            insert_pattern,
            create_pattern,
            alter_pattern,
        ]:
            matches = re.findall(pattern, sql, re.IGNORECASE)
            for match in matches:
                if isinstance(match, str):
                    tables.update(t.strip() for t in match.split(","))
                else:
                    tables.update(match)

        return {t.strip() for t in tables if t.strip()}

    def _classify_sre_review(
        self,
        slow_queries: List[SlowQueryFinding],
        rollbacks: List[RollbackRecord],
        index_suggestions: List[IndexSuggestion],
    ):
        for sq in slow_queries:
            sq.sre_review_required = self._needs_sre_review_for_slow_query(sq)

        for rb in rollbacks:
            rb.sre_review_required = self._needs_sre_review_for_rollback(rb)

        for sugg in index_suggestions:
            sugg.sre_review_required = self._needs_sre_review_for_index(sugg)

    def _needs_sre_review_for_slow_query(self, sq: SlowQueryFinding) -> bool:
        if sq.severity in ("critical", "high"):
            return True
        if sq.confidence < 0.7:
            return True
        if sq.rows_examined >= 100000:
            return True
        if "UNION" in sq.query.upper() and "SELECT" in sq.query.upper():
            return True
        return False

    def _needs_sre_review_for_rollback(self, rb: RollbackRecord) -> bool:
        if "数据丢失" in rb.rollback_reason or "数据损坏" in rb.rollback_reason:
            return True
        if len(rb.affected_queries) >= 5:
            return True
        return True

    def _needs_sre_review_for_index(self, sugg: IndexSuggestion) -> bool:
        if not sugg.evidence_source_refs:
            return True
        if "DROP" in sugg.suggested_index.upper():
            return True
        if len(sugg.evidence_source_refs) < 2:
            return True
        return False

    def _build_summary(
        self,
        slow_queries: List[SlowQueryFinding],
        rollbacks: List[RollbackRecord],
        index_suggestions: List[IndexSuggestion],
        migrations: List[MigrationScript],
    ) -> ReportSummary:
        all_findings = slow_queries + rollbacks + index_suggestions
        needs_review = [f for f in all_findings if getattr(f, "sre_review_required", False)]
        safe_to_use = [f for f in all_findings if not getattr(f, "sre_review_required", False)]

        return ReportSummary(
            total_findings=len(all_findings),
            safe_to_use_count=len(safe_to_use),
            needs_sre_review_count=len(needs_review),
            slow_queries_analyzed=len(slow_queries),
            rollbacks_found=len(rollbacks),
            index_suggestions_count=len(index_suggestions),
            migrations_reviewed=len(migrations),
        )
