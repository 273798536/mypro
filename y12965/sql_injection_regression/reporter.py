import json
import html
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from .config import RunConfig, SourceRef
from .version_manager import VersionManager
from .models import (
    RegressionReport,
    SlowQueryFinding,
    RollbackRecord,
    IndexSuggestion,
    MigrationScript,
    MaterialVersion,
)


class ReportGenerator:
    def __init__(self, config: RunConfig, version_manager: VersionManager):
        self.config = config
        self.version_manager = version_manager
        self._report_id = f"report_{uuid.uuid4().hex[:8]}"

    def generate(self, report_data: RegressionReport) -> Path:
        report_dir = self.config.output_dir / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"sql_regression_{report_data.case_id}_{timestamp}"

        json_path = report_dir / f"{base_name}.json"
        html_path = report_dir / f"{base_name}.html"

        json_path.write_text(
            json.dumps(
                report_data.model_dump(mode="json"),
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        html_content = self._generate_html(report_data)
        html_path.write_text(html_content, encoding="utf-8")

        latest_link = self.config.output_dir / "latest_report.html"
        if latest_link.exists():
            latest_link.unlink()
        latest_link.symlink_to(html_path)

        return html_path

    def _generate_html(self, report: RegressionReport) -> str:
        safe_findings, review_findings = self._split_by_review_status(report)

        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL注入规则回归报告 - {report.case_id}</title>
    {self._generate_css()}
</head>
<body>
    {self._generate_header(report)}
    {self._generate_executive_summary(report, safe_findings, review_findings)}
    {self._generate_material_versions(report.material_versions)}
    {self._generate_safe_to_use_section(safe_findings)}
    {self._generate_needs_review_section(review_findings)}
    {self._generate_slow_queries_section(report.slow_query_findings)}
    {self._generate_rollbacks_section(report.rollback_records)}
    {self._generate_index_suggestions_section(report.index_suggestions)}
    {self._generate_migrations_section(report.migration_scripts)}
    {self._generate_footer(report)}
    {self._generate_javascript()}
</body>
</html>
"""

    def _generate_css(self) -> str:
        return """
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header .meta { opacity: 0.9; font-size: 14px; }
        .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .section h2 { font-size: 20px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e8e8e8; display: flex; align-items: center; gap: 8px; }
        .badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-safe { background: #d4edda; color: #155724; }
        .badge-review { background: #fff3cd; color: #856404; }
        .badge-critical { background: #f8d7da; color: #721c24; }
        .badge-high { background: #ffeaa7; color: #d35400; }
        .badge-medium { background: #d6eaf8; color: #2874a6; }
        .badge-low { background: #e8f8f5; color: #138d75; }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .card .number { font-size: 36px; font-weight: bold; color: #667eea; }
        .card .label { font-size: 14px; color: #666; margin-top: 4px; }
        .card.safe .number { color: #27ae60; }
        .card.review .number { color: #f39c12; }
        .finding-card { border: 1px solid #e8e8e8; border-radius: 8px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; }
        .finding-card:hover { border-color: #667eea; box-shadow: 0 4px 12px rgba(102,126,234,0.15); }
        .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .finding-title { font-weight: 600; font-size: 15px; }
        .source-ref { font-size: 12px; color: #888; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px; }
        .source-ref a { color: #667eea; text-decoration: none; }
        .source-ref a:hover { text-decoration: underline; }
        .sql-code { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-family: 'Monaco', 'Consolas', monospace; font-size: 13px; overflow-x: auto; margin: 8px 0; }
        .sql-code .keyword { color: #569cd6; }
        .sql-code .string { color: #ce9178; }
        .sql-code .function { color: #dcdcaa; }
        .evidence-list { margin-left: 20px; margin-top: 8px; }
        .evidence-list li { font-size: 13px; color: #666; margin-bottom: 4px; }
        .material-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .material-table th, .material-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        .material-table th { background: #f8f9fa; font-weight: 600; }
        .material-table tr:hover { background: #f8f9fa; }
        .link-back { color: #667eea; text-decoration: none; font-size: 12px; margin-left: 8px; }
        .link-back:hover { text-decoration: underline; }
        .toggle-btn { background: none; border: none; color: #667eea; cursor: pointer; font-size: 13px; padding: 4px 8px; }
        .collapsible { transition: max-height 0.3s ease; overflow: hidden; }
        .collapsible.collapsed { max-height: 0; }
        .severity-bar { height: 4px; background: #e8e8e8; border-radius: 2px; overflow: hidden; margin-top: 8px; }
        .severity-bar-fill { height: 100%; background: linear-gradient(90deg, #27ae60, #f39c12, #e74c3c); }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        .jump-target { scroll-margin-top: 80px; }
    </style>
"""

    def _generate_header(self, report: RegressionReport) -> str:
        return f"""
    <div class="container">
        <div class="header">
            <h1>🔍 SQL注入规则回归分析报告</h1>
            <div class="meta">
                <strong>案例ID:</strong> {report.case_id} | 
                <strong>生成时间:</strong> {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')} | 
                <strong>报告ID:</strong> {report.report_id}
            </div>
        </div>
"""

    def _generate_executive_summary(
        self,
        report: RegressionReport,
        safe_findings: List,
        review_findings: List,
    ) -> str:
        s = report.summary
        return f"""
        <div class="section">
            <h2>📊 执行摘要</h2>
            <div class="summary-cards">
                <div class="card">
                    <div class="number">{s.total_findings}</div>
                    <div class="label">总发现数</div>
                </div>
                <div class="card safe">
                    <div class="number">{s.safe_to_use_count}</div>
                    <div class="label">✓ 可直接使用</div>
                </div>
                <div class="card review">
                    <div class="number">{s.needs_sre_review_count}</div>
                    <div class="label">⚠ 需SRE复核</div>
                </div>
                <div class="card">
                    <div class="number">{s.slow_queries_analyzed}</div>
                    <div class="label">慢查询分析</div>
                </div>
                <div class="card">
                    <div class="number">{s.rollbacks_found}</div>
                    <div class="label">回滚记录</div>
                </div>
                <div class="card">
                    <div class="number">{s.index_suggestions_count}</div>
                    <div class="label">索引建议</div>
                </div>
                <div class="card">
                    <div class="number">{s.migrations_reviewed}</div>
                    <div class="label">迁移脚本</div>
                </div>
            </div>
        </div>
"""

    def _split_by_review_status(self, report: RegressionReport):
        all_items = []

        for sq in report.slow_query_findings:
            all_items.append(("slow_query", sq))
        for rb in report.rollback_records:
            all_items.append(("rollback", rb))
        for idx in report.index_suggestions:
            all_items.append(("index_suggestion", idx))

        safe = [(t, item) for t, item in all_items if not item.sre_review_required]
        review = [(t, item) for t, item in all_items if item.sre_review_required]

        return safe, review

    def _generate_material_versions(
        self, versions: List[MaterialVersion]
    ) -> str:
        rows = []
        for v in versions:
            mat_path = self.version_manager.get_material_path(v.version_id)
            mat_link = (
                f'<a href="#material-{v.version_id}" class="link-back">查看内容</a>'
                if mat_path
                else ""
            )
            rows.append(f"""
                <tr id="material-ref-{v.version_id}" class="jump-target">
                    <td><code>{v.version_id}</code></td>
                    <td>{v.file_name}</td>
                    <td><span class="badge badge-medium">{v.material_type.value}</span></td>
                    <td>{v.imported_at.strftime('%Y-%m-%d %H:%M:%S')}</td>
                    <td><code>{v.material_hash[:16]}...</code></td>
                    <td>{mat_link}</td>
                </tr>
            """)

        return f"""
        <div class="section">
            <h2>📦 材料版本清单</h2>
            <p style="color:#666; margin-bottom:12px; font-size:14px;">
                所有材料均已归档，版本自动追踪。点击"查看内容"可跳转至原始材料。
            </p>
            <table class="material-table">
                <thead>
                    <tr>
                        <th>版本ID</th>
                        <th>文件名</th>
                        <th>类型</th>
                        <th>导入时间</th>
                        <th>内容哈希</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(rows)}
                </tbody>
            </table>
        </div>
"""

    def _generate_safe_to_use_section(self, safe_findings: List) -> str:
        if not safe_findings:
            return ""

        items_html = []
        for item_type, item in safe_findings:
            items_html.append(self._render_finding_card(item_type, item))

        return f"""
        <div class="section">
            <h2>✅ 可直接使用 <span class="badge badge-safe">{len(safe_findings)} 项</span></h2>
            <p style="color:#27ae60; margin-bottom:16px; font-size:14px;">
                以下结论置信度高、风险低，业务同事可直接参考使用。
            </p>
            {''.join(items_html)}
        </div>
"""

    def _generate_needs_review_section(self, review_findings: List) -> str:
        if not review_findings:
            return ""

        items_html = []
        for item_type, item in review_findings:
            items_html.append(self._render_finding_card(item_type, item))

        return f"""
        <div class="section">
            <h2>⚠️ 需SRE值班复核 <span class="badge badge-review">{len(review_findings)} 项</span></h2>
            <p style="color:#d35400; margin-bottom:16px; font-size:14px;">
                以下结论需要SRE值班同事复核确认后再使用。
            </p>
            {''.join(items_html)}
        </div>
"""

    def _render_finding_card(self, item_type: str, item) -> str:
        if item_type == "slow_query":
            return self._render_slow_query_card(item)
        elif item_type == "rollback":
            return self._render_rollback_card(item)
        elif item_type == "index_suggestion":
            return self._render_index_suggestion_card(item)
        return ""

    def _render_slow_query_card(self, sq: SlowQueryFinding) -> str:
        severity_badge = self._get_severity_badge(sq.severity)
        review_badge = (
            '<span class="badge badge-review">需SRE复核</span>'
            if sq.sre_review_required
            else '<span class="badge badge-safe">可直接使用</span>'
        )
        confidence_pct = int(sq.confidence * 100)

        source_link = self._render_source_link(sq.source_ref, sq.finding_id)

        migration_link = ""
        if sq.related_migration:
            migration_link = f' | <a href="#migration-{sq.related_migration}" class="link-back">🔗 关联迁移脚本</a>'

        return f"""
        <div class="finding-card jump-target" id="finding-{sq.finding_id}">
            <div class="finding-header">
                <span class="finding-title">🐢 慢查询 - {sq.root_cause}</span>
                <span>{severity_badge} {review_badge}</span>
            </div>
            <div class="sql-code">{self._highlight_sql(sq.query)}</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 12px 0;">
                <div><strong>执行时间:</strong> {sq.execution_time_ms:.0f}ms</div>
                <div><strong>扫描行数:</strong> {sq.rows_examined:,}</div>
                <div><strong>归因置信度:</strong> {confidence_pct}%</div>
                <div class="severity-bar"><div class="severity-bar-fill" style="width:{confidence_pct}%"></div></div>
            </div>
            <div class="source-ref">
                <strong>来源:</strong> {source_link}{migration_link}
            </div>
        </div>
"""

    def _render_rollback_card(self, rb: RollbackRecord) -> str:
        review_badge = (
            '<span class="badge badge-review">需SRE复核</span>'
            if rb.sre_review_required
            else '<span class="badge badge-safe">可直接使用</span>'
        )

        source_link = self._render_source_link(rb.source_ref, rb.record_id)

        migration_link = f' | <a href="#migration-{rb.migration_script_id}" class="link-back">🔗 关联迁移脚本</a>'

        affected_queries_html = ""
        if rb.affected_queries:
            queries_html = "<br>".join(
                f'<div class="sql-code" style="font-size:11px; margin:4px 0;">{self._highlight_sql(q)}</div>'
                for q in rb.affected_queries[:5]
            )
            more_msg = (
                f"<br><em>...还有 {len(rb.affected_queries) - 5} 条查询</em>"
                if len(rb.affected_queries) > 5
                else ""
            )
            affected_queries_html = f"<div><strong>影响的查询:</strong>{queries_html}{more_msg}</div>"

        rollback_time_str = (
            rb.rollback_time.strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(rb.rollback_time, datetime)
            else str(rb.rollback_time)
        )

        return f"""
        <div class="finding-card jump-target" id="finding-{rb.record_id}">
            <div class="finding-header">
                <span class="finding-title">↩️ 回滚记录</span>
                <span><span class="badge badge-critical">回滚</span> {review_badge}</span>
            </div>
            <div style="margin: 8px 0;">
                <div><strong>回滚原因:</strong> {rb.rollback_reason}</div>
                <div><strong>回滚时间:</strong> {rollback_time_str}</div>
                <div><strong>关联脚本ID:</strong> <code>{rb.migration_script_id}</code></div>
                {affected_queries_html}
            </div>
            <div class="source-ref">
                <strong>来源:</strong> {source_link}{migration_link}
            </div>
        </div>
"""

    def _render_index_suggestion_card(self, sugg: IndexSuggestion) -> str:
        review_badge = (
            '<span class="badge badge-review">需SRE复核</span>'
            if sugg.sre_review_required
            else '<span class="badge badge-safe">可直接使用</span>'
        )

        source_link = self._render_source_link(sugg.source_ref, sugg.suggestion_id)

        evidence_html = ""
        if sugg.evidence_source_refs:
            evidence_items = []
            for i, ref in enumerate(sugg.evidence_source_refs, 1):
                evidence_items.append(
                    f"<li>{i}. {self._render_source_link(ref, f'{sugg.suggestion_id}-ev-{i}')}</li>"
                )
            evidence_html = f"""
                <div style="margin-top: 12px;">
                    <strong>📎 证据来源 (点击跳转原始材料):</strong>
                    <ul class="evidence-list">{''.join(evidence_items)}</ul>
                </div>
            """

        return f"""
        <div class="finding-card jump-target" id="finding-{sugg.suggestion_id}">
            <div class="finding-header">
                <span class="finding-title">📈 索引建议 - {sugg.table_name}</span>
                <span>{review_badge}</span>
            </div>
            <div class="sql-code">{self._highlight_sql(sugg.suggested_index)}</div>
            <div style="margin: 8px 0;">
                <div><strong>表名:</strong> <code>{sugg.table_name}</code></div>
                <div><strong>预期收益:</strong> {sugg.benefit_description}</div>
                <div><strong>证据条数:</strong> {len(sugg.evidence_source_refs)} 条</div>
            </div>
            {evidence_html}
            <div class="source-ref">
                <strong>来源:</strong> {source_link}
            </div>
        </div>
"""

    def _generate_slow_queries_section(
        self, findings: List[SlowQueryFinding]
    ) -> str:
        if not findings:
            return ""

        cards = [self._render_slow_query_card(f) for f in findings]
        return f"""
        <div class="section" id="slow-queries">
            <h2>🐢 慢查询归因分析 <span class="badge badge-medium">{len(findings)}</span></h2>
            {''.join(cards)}
        </div>
"""

    def _generate_rollbacks_section(
        self, rollbacks: List[RollbackRecord]
    ) -> str:
        if not rollbacks:
            return ""

        cards = [self._render_rollback_card(r) for r in rollbacks]
        return f"""
        <div class="section" id="rollbacks">
            <h2>↩️ 回滚记录追踪 <span class="badge badge-critical">{len(rollbacks)}</span></h2>
            {''.join(cards)}
        </div>
"""

    def _generate_index_suggestions_section(
        self, suggestions: List[IndexSuggestion]
    ) -> str:
        if not suggestions:
            return ""

        cards = [self._render_index_suggestion_card(s) for s in suggestions]
        return f"""
        <div class="section" id="index-suggestions">
            <h2>📈 索引建议 <span class="badge badge-medium">{len(suggestions)}</span></h2>
            <p style="color:#666; margin-bottom:16px; font-size:14px;">
                每条建议都链接回原始证据材料，可追溯到具体的慢查询日志行。
            </p>
            {''.join(cards)}
        </div>
"""

    def _generate_migrations_section(
        self, migrations: List[MigrationScript]
    ) -> str:
        if not migrations:
            return ""

        cards = []
        for mig in migrations:
            linked_findings_links = []
            for fid in mig.linked_findings:
                linked_findings_links.append(
                    f'<a href="#finding-{fid}" class="link-back">🔗 慢查询发现 {fid[:8]}</a>'
                )

            linked_rollbacks_links = []
            for rid in mig.linked_rollbacks:
                linked_rollbacks_links.append(
                    f'<a href="#finding-{rid}" class="link-back">↩️ 回滚记录 {rid[:8]}</a>'
                )

            source_link = self._render_source_link(mig.source_ref, mig.script_id)

            preview_sql = mig.sql_content[:500] + ("..." if len(mig.sql_content) > 500 else "")

            links_html = ""
            if linked_findings_links:
                links_html += f"<div><strong>关联发现:</strong> {' | '.join(linked_findings_links)}</div>"
            if linked_rollbacks_links:
                links_html += f"<div><strong>关联回滚:</strong> {' | '.join(linked_rollbacks_links)}</div>"

            cards.append(f"""
            <div class="finding-card jump-target" id="migration-{mig.script_id}">
                <div class="finding-header">
                    <span class="finding-title">📜 迁移脚本 - {mig.version}</span>
                    <span class="badge badge-medium">{mig.file_name}</span>
                </div>
                <div class="sql-code">{self._highlight_sql(preview_sql)}</div>
                <div style="margin: 8px 0;">
                    <div><strong>版本:</strong> <code>{mig.version}</code></div>
                    {links_html}
                </div>
                <div class="source-ref">
                    <strong>来源:</strong> {source_link}
                </div>
            </div>
            """)

        return f"""
        <div class="section" id="migrations">
            <h2>📜 迁移脚本清单 <span class="badge badge-medium">{len(migrations)}</span></h2>
            <p style="color:#666; margin-bottom:16px; font-size:14px;">
                点击关联链接可跳转到对应的慢查询发现或回滚记录。
            </p>
            {''.join(cards)}
        </div>
"""

    def _generate_footer(self, report: RegressionReport) -> str:
        materials_html = []
        for v in report.material_versions:
            mat_path = self.version_manager.get_material_path(v.version_id)
            if mat_path:
                content = mat_path.read_text(encoding="utf-8", errors="replace")
                materials_html.append(f"""
                <div class="section jump-target" id="material-{v.version_id}">
                    <div class="finding-header">
                        <span class="finding-title">📦 原始材料: {v.file_name}</span>
                        <a href="#material-ref-{v.version_id}" class="link-back">↑ 返回版本清单</a>
                    </div>
                    <p style="color:#666; margin-bottom:12px;">
                        版本ID: <code>{v.version_id}</code> | 
                        类型: {v.material_type.value} | 
                        导入时间: {v.imported_at.strftime('%Y-%m-%d %H:%M:%S')}
                    </p>
                    <div class="sql-code">{html.escape(content)}</div>
                </div>
                """)

        return f"""
        <div class="section">
            <h2>📚 原始材料归档</h2>
            <p style="color:#666; margin-bottom:16px; font-size:14px;">
                所有材料的原始内容都已归档在此，便于复盘时直接查阅。
            </p>
            {''.join(materials_html)}
        </div>
        <div class="footer">
            SQL注入规则回归工具 v{self._get_version()} | 报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </div>
"""

    def _generate_javascript(self) -> str:
        return """
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        target.style.backgroundColor = '#fff3cd';
                        setTimeout(() => {
                            target.style.backgroundColor = '';
                        }, 2000);
                    }
                });
            });
        });
    </script>
"""

    def _render_source_link(self, ref: SourceRef, element_id: str) -> str:
        link_text = ref.to_display()
        material_version = self.version_manager.find_version_by_file(ref.file_name)
        if material_version:
            return f'<a href="#material-{material_version.version_id}" title="{ref.to_display()}">📄 {link_text}</a>'
        return f"📄 {link_text}"

    def _highlight_sql(self, sql: str) -> str:
        keywords = [
            "SELECT", "FROM", "WHERE", "AND", "OR", "JOIN", "LEFT", "RIGHT", "INNER",
            "OUTER", "ON", "GROUP", "BY", "ORDER", "LIMIT", "INSERT", "INTO", "VALUES",
            "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "INDEX", "DROP", "ALTER",
            "UNION", "ALL", "DISTINCT", "AS", "COUNT", "SUM", "AVG", "MAX", "MIN",
            "LIKE", "IN", "IS", "NULL", "NOT", "BETWEEN", "EXISTS", "CASE", "WHEN",
            "THEN", "ELSE", "END", "HAVING", "OFFSET",
        ]

        result = html.escape(sql)

        for kw in keywords:
            pattern = r"\b" + kw + r"\b"
            result = re.sub(
                pattern,
                f'<span class="keyword">{kw}</span>',
                result,
                flags=re.IGNORECASE,
            )

        result = re.sub(
            r"'([^']*)'",
            r'<span class="string">\1</span>',
            result,
        )

        result = re.sub(
            r"`([^`]*)`",
            r'<span class="function">\1</span>',
            result,
        )

        return result

    def _get_severity_badge(self, severity: str) -> str:
        mapping = {
            "critical": '<span class="badge badge-critical">严重</span>',
            "high": '<span class="badge badge-high">高</span>',
            "medium": '<span class="badge badge-medium">中</span>',
            "low": '<span class="badge badge-low">低</span>',
        }
        return mapping.get(severity, severity)

    def _get_version(self) -> str:
        try:
            from . import __version__
            return __version__
        except ImportError:
            return "0.1.0"
