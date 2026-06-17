"""重复导入测试场景

测试目的：
  验证工具在重复导入同一份数据时结果一致，避免"看上去能跑、实际越跑越乱"。

测试内容：
  1. 同一份慢查询日志解析两次，结果数量和内容一致
  2. 同一份 Schema 解析两次，表结构一致
  3. 重复运行分析，风险分级结果稳定
  4. 备份校验结果可重复
  5. 空文件/异常格式不崩溃
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parser.slow_log_parser import SlowLogParser
from parser.schema_parser import SchemaParser
from analyzer.query_analyzer import QueryAnalyzer
from analyzer.schema_diff import SchemaDiff
from validator.backup_validator import BackupValidator


class TestDuplicateImport(unittest.TestCase):
    """重复导入稳定性测试"""

    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

    def test_slow_log_parsing_idempotent(self):
        """同一份慢查询日志解析两次结果一致"""
        log_path = os.path.join(self.DATA_DIR, "sample_slow.log")
        parser1 = SlowLogParser(log_path)
        parser2 = SlowLogParser(log_path)

        result1 = parser1.parse()
        result2 = parser2.parse()

        self.assertEqual(len(result1), len(result2), "两次解析的慢查询数量不一致")

        for i, (r1, r2) in enumerate(zip(result1, result2)):
            self.assertEqual(
                r1.query_time, r2.query_time,
                f"第{i}条查询耗时不一致"
            )
            self.assertEqual(
                r1.start_line, r2.start_line,
                f"第{i}条查询起始行号不一致"
            )
            self.assertEqual(
                r1.sql_text, r2.sql_text,
                f"第{i}条查询 SQL 不一致"
            )
        print("✓ 慢查询日志解析幂等性通过")

    def test_slow_log_source_line_preserved(self):
        """慢查询日志保留原始行号"""
        log_path = os.path.join(self.DATA_DIR, "sample_slow.log")
        parser = SlowLogParser(log_path, threshold=0.1)
        entries = parser.parse()

        self.assertGreater(len(entries), 0, "应解析到慢查询")

        for entry in entries:
            self.assertGreater(entry.start_line, 0, "起始行号应为正整数")
            self.assertGreaterEqual(entry.end_line, entry.start_line, "结束行号应 >= 起始行号")
            self.assertTrue(
                entry.source_ref,
                "应包含来源引用"
            )

        first_entry = entries[0]
        with open(log_path, "r") as f:
            lines = f.readlines()
        self.assertLess(
            first_entry.start_line, len(lines),
            "起始行号不应超过文件总行数"
        )
        print("✓ 慢查询原始行号保留通过")

    def test_schema_parsing_idempotent(self):
        """同一份 Schema 解析两次结果一致"""
        schema_path = os.path.join(self.DATA_DIR, "schema_v2.sql")
        parser1 = SchemaParser(schema_path)
        parser2 = SchemaParser(schema_path)

        tables1 = parser1.parse()
        tables2 = parser2.parse()

        self.assertEqual(len(tables1), len(tables2), "两次解析的表数量不一致")
        self.assertEqual(set(tables1.keys()), set(tables2.keys()), "表名集合不一致")

        for name in tables1:
            t1 = tables1[name]
            t2 = tables2[name]
            self.assertEqual(len(t1.columns), len(t2.columns), f"表 {name} 字段数量不一致")
            self.assertEqual(len(t1.indexes), len(t2.indexes), f"表 {name} 索引数量不一致")
        print("✓ Schema 解析幂等性通过")

    def test_schema_source_line_preserved(self):
        """Schema 解析保留原始行号"""
        schema_path = os.path.join(self.DATA_DIR, "schema_v1.sql")
        parser = SchemaParser(schema_path)
        tables = parser.parse()

        self.assertGreater(len(tables), 0, "应解析到表")

        for name, tbl in tables.items():
            self.assertGreater(tbl.start_line, 0, f"表 {name} 起始行号应为正")
            self.assertGreaterEqual(tbl.end_line, tbl.start_line, f"表 {name} 结束行号应 >= 起始")

            for col in tbl.columns:
                self.assertGreater(col.source_line, 0, f"字段 {name}.{col.name} 应有行号")
            for idx in tbl.indexes:
                self.assertGreater(idx.source_line, 0, f"索引 {name}.{idx.name} 应有行号")
        print("✓ Schema 来源行号保留通过")

    def test_query_analysis_idempotent(self):
        """慢查询分析结果稳定可重复"""
        log_path = os.path.join(self.DATA_DIR, "sample_slow.log")
        schema_path = os.path.join(self.DATA_DIR, "schema_v2.sql")

        log_parser = SlowLogParser(log_path)
        schema_parser = SchemaParser(schema_path)

        queries = log_parser.parse()
        tables = schema_parser.parse()

        analyzer1 = QueryAnalyzer(queries, tables)
        analyzer2 = QueryAnalyzer(queries, tables)

        result1 = analyzer1.analyze()
        result2 = analyzer2.analyze()

        self.assertEqual(result1["total"], result2["total"], "分析总数不一致")
        self.assertEqual(result1["red_count"], result2["red_count"], "红色风险数量不一致")
        self.assertEqual(result1["yellow_count"], result2["yellow_count"], "黄色风险数量不一致")
        self.assertEqual(result1["green_count"], result2["green_count"], "绿色风险数量不一致")

        for i, (a1, a2) in enumerate(zip(result1["all"], result2["all"])):
            self.assertEqual(
                a1.risk_level, a2.risk_level,
                f"第{i}条查询风险等级不一致"
            )
            self.assertEqual(
                len(a1.risk_reasons), len(a2.risk_reasons),
                f"第{i}条查询风险原因数量不一致"
            )
        print("✓ 慢查询分析结果稳定性通过")

    def test_backup_validation_idempotent(self):
        """备份校验结果稳定可重复"""
        backup_path = os.path.join(self.DATA_DIR, "backup_schema.sql")
        current_path = os.path.join(self.DATA_DIR, "schema_v2.sql")

        backup_parser = SchemaParser(backup_path)
        current_parser = SchemaParser(current_path)
        backup_tables = backup_parser.parse()
        current_tables = current_parser.parse()

        validator1 = BackupValidator(backup_tables, current_tables, backup_path, current_path)
        validator2 = BackupValidator(backup_tables, current_tables, backup_path, current_path)

        result1 = validator1.validate()
        result2 = validator2.validate()

        self.assertAlmostEqual(result1["match_rate"], result2["match_rate"], places=2)
        self.assertEqual(len(result1["matched_tables"]), len(result2["matched_tables"]))
        self.assertEqual(len(result1["mismatched_tables"]), len(result2["mismatched_tables"]))
        print("✓ 备份校验结果稳定性通过")

    def test_empty_file_handling(self):
        """空文件不崩溃，返回空结果"""
        import tempfile
        with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
            f.write("")
            temp_path = f.name

        try:
            parser = SlowLogParser(temp_path)
            result = parser.parse()
            self.assertEqual(len(result), 0, "空日志应返回空列表")
            print("✓ 空日志文件处理通过")
        finally:
            os.unlink(temp_path)

    def test_schema_diff_stable(self):
        """Schema 对比结果稳定"""
        base_path = os.path.join(self.DATA_DIR, "schema_v1.sql")
        curr_path = os.path.join(self.DATA_DIR, "schema_v2.sql")

        base_parser = SchemaParser(base_path)
        curr_parser = SchemaParser(curr_path)
        base_tables = base_parser.parse()
        curr_tables = curr_parser.parse()

        diff1 = SchemaDiff(base_tables, curr_tables)
        diff2 = SchemaDiff(base_tables, curr_tables)

        result1 = diff1.compare()
        result2 = diff2.compare()

        self.assertEqual(result1["total_changes"], result2["total_changes"])
        self.assertEqual(len(result1["added_tables"]), len(result2["added_tables"]))
        self.assertEqual(len(result1["removed_tables"]), len(result2["removed_tables"]))
        self.assertEqual(len(result1["modified_tables"]), len(result2["modified_tables"]))
        print("✓ Schema 对比结果稳定性通过")

    def test_source_traceability(self):
        """所有分析结果均可追溯到源文件行号"""
        log_path = os.path.join(self.DATA_DIR, "sample_slow.log")
        schema_path = os.path.join(self.DATA_DIR, "schema_v2.sql")

        log_parser = SlowLogParser(log_path)
        schema_parser = SchemaParser(schema_path)
        queries = log_parser.parse()
        tables = schema_parser.parse()

        analyzer = QueryAnalyzer(queries, tables)
        result = analyzer.analyze()

        for analysis in result["all"]:
            self.assertTrue(hasattr(analysis, "source_ref"), "分析结果应包含来源引用")
            self.assertTrue(analysis.source_ref, "来源引用不应为空")
            self.assertIn(":", analysis.source_ref, "来源引用应包含文件名和行号")

        base_path = os.path.join(self.DATA_DIR, "schema_v1.sql")
        base_parser = SchemaParser(base_path)
        base_tables = base_parser.parse()
        diff = SchemaDiff(base_tables, tables)
        diff_result = diff.compare()

        for tbl in diff_result["added_tables"]:
            self.assertGreater(tbl.source_new_line, 0, "新增表应标注来源行号")
        for tbl in diff_result["removed_tables"]:
            self.assertGreater(tbl.source_old_line, 0, "删除表应标注来源行号")
        for tbl in diff_result["modified_tables"]:
            self.assertGreater(tbl.source_old_line, 0, "变更表应标注基线行号")
            self.assertGreater(tbl.source_new_line, 0, "变更表应标注当前行号")

        print("✓ 分析结果来源可追溯性通过")


def run_all_tests():
    """运行所有重复导入测试"""
    print("=" * 60)
    print("  重复导入稳定性测试")
    print("  测试目的：确保工具不会越跑越乱")
    print("=" * 60)
    print()

    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestDuplicateImport)
    runner = unittest.TextTestRunner(verbosity=0)
    result = runner.run(suite)

    print()
    print("=" * 60)
    print(f"  测试完成：运行 {result.testsRun} 个用例")
    if result.wasSuccessful():
        print("  状态：全部通过 ✓")
        print("  结论：工具可重复导入，结果稳定")
    else:
        print(f"  失败：{len(result.failures)} 个失败，{len(result.errors)} 个错误")
        print("  结论：存在稳定性问题，需修复")
    print("=" * 60)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
