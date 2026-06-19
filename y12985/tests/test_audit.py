"""测试 - 搜索索引回源校验系统

包含核心功能测试、重复导入场景测试
"""

import os
import sys
import json
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from search_index_audit.storage import AuditStorage
from search_index_audit.index_analyzer import IndexAnalyzer
from search_index_audit.permission_auditor import PermissionAuditor
from search_index_audit.slow_query_attributor import SlowQueryAttributor
from search_index_audit.migration_manager import MigrationManager
from search_index_audit.backup_auditor import BackupAuditor
from search_index_audit.report_generator import ReportGenerator
from search_index_audit.models import AuditStatus, IndexType, PermissionLevel
from search_index_audit.errors import (
    MigrationScriptMissingError,
    DuplicateImportError,
    FieldDriftError,
)


class TestIndexAnalyzer(unittest.TestCase):
    """索引建议模块测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.analyzer = IndexAnalyzer(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_analyze_slow_queries(self):
        """测试从慢查询生成索引建议"""
        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE user_id = 1 AND status = 'pending'",
                "execution_time_ms": 2500.0,
                "rows_examined": 50000,
                "rows_sent": 10,
                "table_name": "orders",
            },
            {
                "query_sql": "SELECT * FROM orders WHERE user_id = 2 AND created_at > '2024-01-01'",
                "execution_time_ms": 1800.0,
                "rows_examined": 35000,
                "rows_sent": 250,
                "table_name": "orders",
            },
        ]

        suggestions = self.analyzer.analyze_slow_queries(slow_queries, "test.json")

        self.assertGreater(len(suggestions), 0)
        self.assertEqual(suggestions[0].table_name, "orders")
        self.assertIn("user_id", suggestions[0].column_names)
        self.assertGreater(suggestions[0].expected_improvement, 0)
        self.assertGreater(len(suggestions[0].sources), 0)

    def test_suggestions_have_sources_for_traceback(self):
        """测试索引建议包含溯源信息"""
        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE user_id = 1",
                "execution_time_ms": 1500.0,
                "rows_examined": 20000,
                "rows_sent": 5,
                "table_name": "orders",
            },
        ]

        suggestions = self.analyzer.analyze_slow_queries(slow_queries, "slow_logs/slow_query.log")
        suggestion = suggestions[0]

        sources = self.analyzer.trace_sources(suggestion.id)
        self.assertGreater(len(sources), 0)
        self.assertEqual(sources[0].source_path, "slow_logs/slow_query.log")


class TestPermissionAuditor(unittest.TestCase):
    """权限审计模块测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.auditor = PermissionAuditor(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_audit_permissions(self):
        """测试权限审计"""
        permissions = [
            {
                "user_id": "u1",
                "user_name": "alice",
                "table_name": "users",
                "permission_level": "owner",
                "granted_at": "2023-06-15T10:00:00",
            },
            {
                "user_id": "u2",
                "user_name": "bob",
                "table_name": "logs",
                "permission_level": "read",
                "granted_at": "2023-07-20T14:30:00",
            },
        ]

        records = self.auditor.audit_permissions(permissions, "perms.json")

        self.assertEqual(len(records), 2)

        alice_record = next(r for r in records if r.user_name == "alice")
        self.assertIn(alice_record.risk_level, ("high", "critical"))
        self.assertEqual(alice_record.status, AuditStatus.NEEDS_REVIEW)

        bob_record = next(r for r in records if r.user_name == "bob")
        self.assertEqual(bob_record.risk_level, "low")

    def test_sensitive_table_high_risk(self):
        """测试敏感表权限风险更高"""
        permissions = [
            {
                "user_id": "u1",
                "user_name": "test",
                "table_name": "users",
                "permission_level": "admin",
                "granted_at": "2023-01-01T00:00:00",
            },
        ]

        records = self.auditor.audit_permissions(permissions, "test.json")
        self.assertEqual(records[0].risk_level, "critical")

    def test_get_high_risk_permissions(self):
        """测试获取高风险权限"""
        permissions = [
            {"user_id": "u1", "user_name": "a", "table_name": "users", "permission_level": "admin", "granted_at": "2023-01-01T00:00:00"},
            {"user_id": "u2", "user_name": "b", "table_name": "logs", "permission_level": "read", "granted_at": "2023-01-01T00:00:00"},
            {"user_id": "u3", "user_name": "c", "table_name": "transactions", "permission_level": "write", "granted_at": "2023-01-01T00:00:00"},
        ]

        self.auditor.audit_permissions(permissions, "test.json")
        high_risk = self.auditor.get_high_risk_permissions()
        self.assertGreaterEqual(len(high_risk), 1)


class TestSlowQueryAttributor(unittest.TestCase):
    """慢查询归因模块测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.attributor = SlowQueryAttributor(self.storage)
        self.analyzer = IndexAnalyzer(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_import_and_attribute(self):
        """测试导入慢查询并归因"""
        batch_id = self.storage.create_batch("test_batch")

        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE user_id = 123 AND status = 'pending'",
                "execution_time_ms": 2500.0,
                "rows_examined": 50000,
                "rows_sent": 10,
                "table_name": "orders",
                "timestamp": "2024-01-15T10:00:00",
            },
        ]

        records = self.attributor.import_slow_queries(slow_queries, "slow.log", batch_id)
        self.assertEqual(len(records), 1)

        self.analyzer.analyze_slow_queries(slow_queries, "slow.log", batch_id)

        attributed = self.attributor.attribute_queries(batch_id)
        self.assertGreater(len(attributed), 0)
        self.assertIsNotNone(attributed[0].attribution)
        self.assertIsNotNone(attributed[0].related_index_suggestion_id)

    def test_attribution_summary(self):
        """测试归因统计"""
        batch_id = self.storage.create_batch("test")
        slow_queries = [
            {"query_sql": "SELECT * FROM t1 WHERE id = 1", "execution_time_ms": 100,
             "rows_examined": 100, "rows_sent": 1, "table_name": "t1", "timestamp": "2024-01-01T00:00:00"},
        ]
        self.attributor.import_slow_queries(slow_queries, "test.json", batch_id)

        summary = self.attributor.get_attribution_summary(batch_id)
        self.assertEqual(summary["total"], 1)


class TestMigrationManager(unittest.TestCase):
    """迁移脚本管理测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.manager = MigrationManager(self.storage)
        self.test_data_dir = Path(__file__).parent / "migrations"

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_scan_migrations(self):
        """测试扫描迁移脚本 - 检测到漏页会抛出异常"""
        from search_index_audit.errors import MigrationScriptMissingError

        with self.assertRaises(MigrationScriptMissingError) as ctx:
            self.manager.scan_migrations(str(self.test_data_dir))

        self.assertIn("1.1.0", str(ctx.exception))
        self.assertIn("漏页", str(ctx.exception))
        self.assertIsNotNone(ctx.exception.action_hint)

    def test_field_drift_detection(self):
        """测试字段类型漂移检测 - 使用验证接口"""
        result = self.manager.validate_migration_chain(str(self.test_data_dir))
        self.assertGreater(len(result["field_drifts"]), 0)
        self.assertTrue(any("1.2.0" in d["version"] for d in result["field_drifts"]))

    def test_validate_migration_chain(self):
        """测试验证迁移脚本链"""
        result = self.manager.validate_migration_chain(str(self.test_data_dir))

        self.assertIsInstance(result, dict)
        self.assertIn("valid", result)
        self.assertIn("total_scripts", result)
        self.assertFalse(result["valid"])
        self.assertGreater(len(result["issues"]), 0)

    def test_missing_page_has_actionable_hint(self):
        """测试漏页错误包含可操作的建议"""
        from search_index_audit.errors import MigrationScriptMissingError

        try:
            self.manager.scan_migrations(str(self.test_data_dir))
        except MigrationScriptMissingError as e:
            self.assertIsNotNone(e.action_hint)
            self.assertIn("补充", e.action_hint)
            self.assertIn("重新运行", e.action_hint)
        else:
            self.fail("应该抛出漏页异常")

    def test_get_actionable_errors(self):
        """测试获取可操作的错误提示"""
        errors = self.manager.get_actionable_errors(str(self.test_data_dir))
        self.assertIsInstance(errors, list)
        self.assertGreater(len(errors), 0)

    def test_get_field_drift_scripts(self):
        """测试获取字段漂移脚本 - 需要先注册，但漏页会阻止注册"""
        from search_index_audit.errors import MigrationScriptMissingError

        with self.assertRaises(MigrationScriptMissingError):
            self.manager.register_migrations(str(self.test_data_dir))


class TestBackupAuditor(unittest.TestCase):
    """备份审计模块测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.auditor = BackupAuditor(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_audit_backups(self):
        """测试备份审计"""
        from datetime import datetime, timedelta

        backups = [
            {
                "backup_name": "backup1",
                "backup_time": (datetime.now() - timedelta(days=5)).isoformat(),
                "backup_size_bytes": 1024 * 1024 * 100,
                "source_db": "production",
                "integrity_verified": True,
            },
            {
                "backup_name": "backup2",
                "backup_time": (datetime.now() - timedelta(days=5)).isoformat(),
                "backup_size_bytes": 1024 * 1024 * 100,
                "source_db": "staging",
                "integrity_verified": False,
            },
        ]

        records = self.auditor.audit_backups(backups, "backups.json")

        self.assertEqual(len(records), 2)
        self.assertTrue(records[0].can_use_directly)
        self.assertFalse(records[1].can_use_directly)

    def test_get_direct_use_backups(self):
        """测试获取可直接使用的备份"""
        from datetime import datetime, timedelta

        backups = [
            {
                "backup_name": "ok_backup",
                "backup_time": (datetime.now() - timedelta(days=1)).isoformat(),
                "backup_size_bytes": 1024 * 1024 * 100,
                "source_db": "prod",
                "integrity_verified": True,
            },
        ]

        self.auditor.audit_backups(backups, "test.json")
        direct = self.auditor.get_direct_use_backups()
        self.assertEqual(len(direct), 1)

    def test_get_backups_needing_review(self):
        """测试获取需复核的备份"""
        from datetime import datetime, timedelta

        backups = [
            {
                "backup_name": "review_me",
                "backup_time": (datetime.now() - timedelta(days=1)).isoformat(),
                "backup_size_bytes": 1024 * 1024 * 100,
                "source_db": "prod",
                "integrity_verified": False,
            },
        ]

        self.auditor.audit_backups(backups, "test.json")
        review = self.auditor.get_backups_needing_review()
        self.assertEqual(len(review), 1)


class TestReportGenerator(unittest.TestCase):
    """报表生成模块测试"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.generator = ReportGenerator(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_generate_report(self):
        """测试生成报告"""
        batch_id = self.storage.create_batch("test_batch")
        report = self.generator.generate_report("测试报告", batch_id)

        self.assertIsNotNone(report.id)
        self.assertEqual(report.data_batch_id, batch_id)

    def test_export_report_json(self):
        """测试导出 JSON 报告"""
        batch_id = self.storage.create_batch("test_batch")

        from search_index_audit.models import IndexSuggestion, IndexType, AuditStatus

        from search_index_audit.index_analyzer import IndexAnalyzer

        analyzer = IndexAnalyzer(self.storage)
        slow_queries = [
            {
                "query_sql": "SELECT * FROM t1 WHERE col = 1",
                "execution_time_ms": 2500.0,
                "rows_examined": 50000,
                "rows_sent": 10,
                "table_name": "t1",
            },
        ]
        analyzer.analyze_slow_queries(slow_queries, "test.json", batch_id)

        report = self.generator.generate_report("测试报告", batch_id)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            output_path = f.name

        try:
            path = self.generator.export_report_json(report.id, output_path)

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.assertIn("report", data)
            self.assertIn("summary", data)
            self.assertIn("chart_data", data)
            self.assertIn("details", data)
            self.assertIn("trace_back_links", data)
            self.assertEqual(data["data_batch_id"], batch_id)
        finally:
            os.unlink(output_path)

    def test_export_report_csv(self):
        """测试导出 CSV 报告"""
        batch_id = self.storage.create_batch("test_batch")
        report = self.generator.generate_report("测试报告", batch_id)

        with tempfile.TemporaryDirectory() as tmpdir:
            files = self.generator.export_report_csv(report.id, tmpdir)

            self.assertIn("index_suggestions", files)
            self.assertIn("permission_audits", files)
            self.assertIn("slow_queries", files)
            self.assertIn("backups", files)
            self.assertIn("summary", files)

            for path in files.values():
                self.assertTrue(os.path.exists(path))


class TestDuplicateImport(unittest.TestCase):
    """重复导入场景测试 - 避免工具看上去能跑、实际越跑越乱"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.analyzer = IndexAnalyzer(self.storage)
        self.perm_auditor = PermissionAuditor(self.storage)
        self.slow_attributor = SlowQueryAttributor(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_duplicate_slow_query_import(self):
        """测试重复导入慢查询 - 默认跳过重复项

        场景：测试路径里放一个重复导入场景，
        避免工具看上去能跑、实际越跑越乱。
        """
        batch_id = self.storage.create_batch("test_dup")

        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE id = 1",
                "execution_time_ms": 100.0,
                "rows_examined": 100,
                "rows_sent": 1,
                "table_name": "orders",
                "timestamp": "2024-01-01T00:00:00",
            },
        ]

        records1 = self.slow_attributor.import_slow_queries(slow_queries, "test.json", batch_id)
        self.assertEqual(len(records1), 1)

        records2, warnings = self.slow_attributor.validate_import(records1, batch_id, force=False)
        self.assertEqual(len(records2), 0)
        self.assertGreater(len(warnings), 0)
        self.assertIn("重复", warnings[0])

    def test_duplicate_import_with_force(self):
        """测试强制覆盖重复导入"""
        batch_id = self.storage.create_batch("test_force")

        slow_queries = [
            {
                "query_sql": "SELECT * FROM t WHERE id = 1",
                "execution_time_ms": 100.0,
                "rows_examined": 100,
                "rows_sent": 1,
                "table_name": "t",
                "timestamp": "2024-01-01T00:00:00",
            },
        ]

        self.slow_attributor.import_slow_queries(slow_queries, "test.json", batch_id)

        records = self.slow_attributor.import_slow_queries(slow_queries, "test.json", batch_id)
        valid, warnings = self.slow_attributor.validate_import(records, batch_id, force=True)

        self.assertGreater(len(warnings), 0)
        self.assertIn("覆盖", warnings[0])

    def test_different_batches_no_conflict(self):
        """测试不同批次导入不冲突

        使用数据批次隔离，避免重复导入问题
        """
        batch1 = self.storage.create_batch("batch1")
        batch2 = self.storage.create_batch("batch2")

        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE id = 1",
                "execution_time_ms": 100.0,
                "rows_examined": 100,
                "rows_sent": 1,
                "table_name": "orders",
                "timestamp": "2024-01-01T00:00:00",
            },
        ]

        records1 = self.slow_attributor.import_slow_queries(slow_queries, "test.json", batch1)
        records2 = self.slow_attributor.import_slow_queries(slow_queries, "test.json", batch2)

        self.assertEqual(len(records1), 1)
        self.assertEqual(len(records2), 1)

        q1 = self.storage.get_slow_queries(batch1)
        q2 = self.storage.get_slow_queries(batch2)

        self.assertEqual(len(q1), 1)
        self.assertEqual(len(q2), 1)


class TestSourceTraceability(unittest.TestCase):
    """溯源能力测试 - 指标报表和最终结论之间能点回去"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_index_suggestion_traceback(self):
        """测试索引建议可追溯到来源材料"""
        from search_index_audit.index_analyzer import IndexAnalyzer

        analyzer = IndexAnalyzer(self.storage)
        slow_queries = [
            {
                "query_sql": "SELECT * FROM orders WHERE user_id = 1",
                "execution_time_ms": 2000.0,
                "rows_examined": 40000,
                "rows_sent": 5,
                "table_name": "orders",
            },
        ]

        suggestions = analyzer.analyze_slow_queries(slow_queries, "/var/log/slow.log")
        suggestion = suggestions[0]

        sources = analyzer.trace_sources(suggestion.id)

        self.assertGreater(len(sources), 0)
        self.assertEqual(sources[0].source_path, "/var/log/slow.log")
        self.assertIsNotNone(sources[0].source_type)

    def test_permission_traceback(self):
        """测试权限记录可追溯"""
        from search_index_audit.permission_auditor import PermissionAuditor

        auditor = PermissionAuditor(self.storage)
        permissions = [
            {
                "user_id": "u1",
                "user_name": "test",
                "table_name": "users",
                "permission_level": "admin",
                "granted_at": "2023-01-01T00:00:00",
            },
        ]

        records = auditor.audit_permissions(permissions, "/admin/grants.sql")
        sources = auditor.trace_sources(records[0].id)

        self.assertGreater(len(sources), 0)
        self.assertIn("grants.sql", sources[0].source_path)


class TestUnifiedDataSource(unittest.TestCase):
    """统一数据源测试 - 图表、明细、下载来自同一批数据"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.storage = AuditStorage(self.db_path)
        self.generator = ReportGenerator(self.storage)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_report_same_batch_data(self):
        """测试报告的图表、明细、下载都来自同一批次

        按安全审计员使用"搜索索引回源校验"的习惯，
        图表、明细和下载结果要来自同一批数据。
        """
        batch_id = self.storage.create_batch("unified_test")

        from search_index_audit.index_analyzer import IndexAnalyzer
        from search_index_audit.permission_auditor import PermissionAuditor

        analyzer = IndexAnalyzer(self.storage)
        perm_auditor = PermissionAuditor(self.storage)

        slow_queries = [
            {
                "query_sql": "SELECT * FROM t WHERE id = 1",
                "execution_time_ms": 2500.0,
                "rows_examined": 50000,
                "rows_sent": 10,
                "table_name": "t",
            },
        ]
        analyzer.analyze_slow_queries(slow_queries, "test.json", batch_id)

        permissions = [
            {"user_id": "u1", "user_name": "a", "table_name": "t",
             "permission_level": "read", "granted_at": "2023-01-01T00:00:00"},
        ]
        perm_auditor.audit_permissions(permissions, "test.json", batch_id)

        report = self.generator.generate_report("统一数据源测试", batch_id)
        self.assertEqual(report.data_batch_id, batch_id)

        detail = self.generator.get_report_detail(report.id)
        self.assertIsNotNone(detail)
        self.assertEqual(detail["batch_id"], batch_id)
        self.assertEqual(len(detail["index_suggestions"]), report.index_suggestion_count)
        self.assertEqual(len(detail["permissions"]), report.permission_audit_count)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            json_path = f.name

        try:
            self.generator.export_report_json(report.id, json_path)

            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.assertEqual(data["data_batch_id"], batch_id)
            self.assertEqual(
                len(data["details"]["index_suggestions"]),
                report.index_suggestion_count,
            )
            self.assertEqual(
                len(data["details"]["permission_audits"]),
                report.permission_audit_count,
            )
        finally:
            os.unlink(json_path)


class TestActionableErrors(unittest.TestCase):
    """可操作错误提示测试 - 处理失败时要给可操作的话"""

    def test_migration_script_missing_error_has_hint(self):
        """测试迁移脚本缺失错误包含操作建议"""
        error = MigrationScriptMissingError(
            version="1.0.0",
            missing_pages=[2, 4],
            total_pages=5,
            script_dir="/migrations",
        )

        error_str = str(error)
        self.assertIn("操作建议", error_str)
        self.assertIn("补充缺失的第 2, 4 页", error_str)

    def test_field_drift_error_has_hint(self):
        """测试字段漂移错误包含操作建议"""
        error = FieldDriftError(
            table_name="users",
            field_name="email",
            expected_type="VARCHAR(100)",
            actual_type="TEXT",
            script_path="/migrations/V1.2.0__demo_p1.sql",
        )

        error_str = str(error)
        self.assertIn("操作建议", error_str)
        self.assertIn("检查迁移脚本", error_str)


if __name__ == "__main__":
    unittest.main()
