#!/usr/bin/env python3
"""慢查询归因巡检工具 - 主入口

用于仓储系统慢查询日志的归因分析、Schema 对比、迁移状态检查
和备份校验，生成统一的 HTML 巡检报告。
"""

import argparse
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parser.slow_log_parser import SlowLogParser
from parser.schema_parser import SchemaParser
from analyzer.query_analyzer import QueryAnalyzer
from analyzer.schema_diff import SchemaDiff
from analyzer.migration_check import MigrationChecker
from validator.backup_validator import BackupValidator
from reporter.html_reporter import HtmlReporter


def main():
    parser = argparse.ArgumentParser(
        description="慢查询归因巡检工具 - 仓储系统专用",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例：
  # 基础巡检
  python cli.py --slow-log data/sample_slow.log --schema-baseline data/schema_v1.sql --schema-current data/schema_v2.sql

  # 含迁移和备份校验
  python cli.py -s data/slow.log -b data/schema_old.sql -c data/schema_new.sql -m data/migrations -d data/backup.sql

  # 指定输出
  python cli.py -s slow.log -b v1.sql -c v2.sql -o report_202406.html
        """,
    )

    parser.add_argument("-s", "--slow-log", required=True, help="慢查询日志文件路径 (MySQL slow.log 格式)")
    parser.add_argument("-b", "--schema-baseline", required=True, help="基线 Schema SQL 文件")
    parser.add_argument("-c", "--schema-current", required=True, help="当前 Schema SQL 文件")
    parser.add_argument("-m", "--migrations", default=None, help="迁移脚本目录路径 (可选)")
    parser.add_argument("-d", "--backup-schema", default=None, help="备份 Schema 文件，用于来源校验 (可选)")
    parser.add_argument("-o", "--output", default=None, help="输出 HTML 报告路径 (默认自动生成)")
    parser.add_argument("--top-n", type=int, default=20, help="Top N 慢查询展示数量 (默认 20)")
    parser.add_argument("--threshold", type=float, default=1.0, help="慢查询阈值，单位秒 (默认 1.0)")

    args = parser.parse_args()

    print("=" * 60)
    print("  慢查询归因巡检工具")
    print("=" * 60)
    print(f"  开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    if not os.path.exists(args.slow_log):
        print(f"[错误] 慢查询日志文件不存在: {args.slow_log}")
        sys.exit(1)
    if not os.path.exists(args.schema_baseline):
        print(f"[错误] 基线 Schema 文件不存在: {args.schema_baseline}")
        sys.exit(1)
    if not os.path.exists(args.schema_current):
        print(f"[错误] 当前 Schema 文件不存在: {args.schema_current}")
        sys.exit(1)

    print("[1/6] 解析慢查询日志...")
    log_parser = SlowLogParser(args.slow_log, threshold=args.threshold)
    slow_queries = log_parser.parse()
    print(f"      共解析到 {len(slow_queries)} 条慢查询 (阈值: {args.threshold}s)")

    print("[2/6] 解析 Schema...")
    schema_parser_base = SchemaParser(args.schema_baseline)
    schema_parser_curr = SchemaParser(args.schema_current)
    baseline_tables = schema_parser_base.parse()
    current_tables = schema_parser_curr.parse()
    print(f"      基线 Schema: {len(baseline_tables)} 张表")
    print(f"      当前 Schema: {len(current_tables)} 张表")

    print("[3/6] 慢查询分析与索引失效判断...")
    analyzer = QueryAnalyzer(slow_queries, current_tables)
    analysis_result = analyzer.analyze()
    print(f"      索引失效风险: {analysis_result['index_risk_count']} 条")
    print(f"      需工程师复核: {analysis_result['need_review_count']} 条")

    print("[4/6] Schema 对比...")
    schema_diff = SchemaDiff(baseline_tables, current_tables)
    diff_result = schema_diff.compare()
    print(f"      新增表: {len(diff_result['added_tables'])} 张")
    print(f"      删除表: {len(diff_result['removed_tables'])} 张")
    print(f"      结构变化: {len(diff_result['modified_tables'])} 张")

    migration_result = None
    if args.migrations and os.path.isdir(args.migrations):
        print("[5/6] 迁移状态检查...")
        mig_checker = MigrationChecker(args.migrations, current_tables)
        migration_result = mig_checker.check()
        print(f"      迁移脚本: {migration_result['total_migrations']} 个")
        print(f"      已执行: {migration_result['applied_count']} 个")
        print(f"      待执行: {migration_result['pending_count']} 个")
    else:
        print("[5/6] 迁移状态检查 (跳过，未提供迁移目录)")

    backup_result = None
    if args.backup_schema and os.path.exists(args.backup_schema):
        print("[6/6] 备份校验...")
        backup_parser = SchemaParser(args.backup_schema)
        backup_tables = backup_parser.parse()
        backup_validator = BackupValidator(backup_tables, current_tables, args.backup_schema, args.schema_current)
        backup_result = backup_validator.validate()
        print(f"      备份表数量: {backup_result['backup_table_count']}")
        print(f"      校验通过率: {backup_result['match_rate']:.1f}%")
    else:
        print("[6/6] 备份校验 (跳过，未提供备份文件)")

    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"report_{timestamp}.html")

    print()
    print("生成 HTML 报告...")
    reporter = HtmlReporter()
    reporter.generate(
        output_path=output_path,
        slow_queries=slow_queries,
        analysis_result=analysis_result,
        diff_result=diff_result,
        migration_result=migration_result,
        backup_result=backup_result,
        source_files={
            "slow_log": args.slow_log,
            "schema_baseline": args.schema_baseline,
            "schema_current": args.schema_current,
            "migrations": args.migrations,
            "backup_schema": args.backup_schema,
        },
        top_n=args.top_n,
    )
    print(f"报告已生成: {output_path}")
    print()
    print("=" * 60)
    print(f"  完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
