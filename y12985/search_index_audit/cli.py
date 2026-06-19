"""CLI 命令行入口 - 搜索索引回源校验"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

from .storage import AuditStorage
from .index_analyzer import IndexAnalyzer
from .permission_auditor import PermissionAuditor
from .slow_query_attributor import SlowQueryAttributor
from .migration_manager import MigrationManager
from .backup_auditor import BackupAuditor
from .report_generator import ReportGenerator
from .errors import AuditError


def create_storage(args) -> AuditStorage:
    """创建存储实例"""
    return AuditStorage(db_path=args.db)


def cmd_batch(args):
    """数据批次管理"""
    storage = create_storage(args)

    if args.action == "create":
        batch_id = storage.create_batch(args.name, args.description or "")
        print(f"数据批次已创建: {batch_id}")
        print(f"  名称: {args.name}")
        if args.description:
            print(f"  描述: {args.description}")
        return 0

    elif args.action == "list":
        batches = storage.get_batch_batches()
        if not batches:
            print("暂无数据批次")
            return 0

        print(f"共 {len(batches)} 个数据批次:")
        for b in batches:
            print(f"  {b['id']} - {b['name']} ({b['created_at']})")
            if b.get("description"):
                print(f"      {b['description']}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_index(args):
    """索引建议管理"""
    storage = create_storage(args)
    analyzer = IndexAnalyzer(storage)

    if args.action == "analyze":
        if not args.input:
            print("请指定输入文件 --input")
            return 1

        with open(args.input, "r", encoding="utf-8") as f:
            slow_queries = json.load(f)

        suggestions = analyzer.analyze_slow_queries(
            slow_queries=slow_queries,
            source_path=args.input,
            batch_id=args.batch,
        )

        print(f"分析完成，生成 {len(suggestions)} 条索引建议")
        for s in suggestions:
            status_icon = "✓" if s.status.value == "passed" else "○"
            print(f"  {status_icon} [{s.id}] {s.table_name} ({', '.join(s.column_names)})")
            print(f"      预期提升: {s.expected_improvement:.1f}x | 原因: {s.suggestion_reason[:60]}...")
        return 0

    elif args.action == "list":
        suggestions = analyzer.get_index_suggestions(batch_id=args.batch)
        if not suggestions:
            print("暂无索引建议")
            return 0

        print(f"共 {len(suggestions)} 条索引建议:")
        for s in suggestions:
            status_icon = "✓" if s.status.value == "passed" else ("!" if s.status.value == "needs_review" else "○")
            print(f"  {status_icon} [{s.id}] {s.table_name} - {', '.join(s.column_names)}")
        return 0

    elif args.action == "trace":
        if not args.id:
            print("请指定索引建议 ID --id")
            return 1

        sources = analyzer.trace_sources(args.id)
        if not sources:
            print(f"未找到索引建议 {args.id} 的来源信息")
            return 1

        print(f"索引建议 {args.id} 的来源材料:")
        for i, src in enumerate(sources, 1):
            print(f"  {i}. 类型: {src.source_type.value}")
            print(f"     ID: {src.source_id}")
            print(f"     路径: {src.source_path}")
            if src.line_number:
                print(f"     行号: {src.line_number}")
            if src.details:
                print(f"     详情: {src.details}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_permission(args):
    """权限审计管理"""
    storage = create_storage(args)
    auditor = PermissionAuditor(storage)

    if args.action == "audit":
        if not args.input:
            print("请指定输入文件 --input")
            return 1

        with open(args.input, "r", encoding="utf-8") as f:
            permissions = json.load(f)

        records = auditor.audit_permissions(
            permissions=permissions,
            source_path=args.input,
            batch_id=args.batch,
        )

        high_risk = [r for r in records if r.risk_level in ("high", "critical")]
        print(f"审计完成，共 {len(records)} 条权限记录")
        print(f"  高风险: {len(high_risk)} 条")
        print(f"  需复核: {sum(1 for r in records if r.status.value == 'needs_review')} 条")

        for r in records:
            risk_icon = "🔴" if r.risk_level == "critical" else ("🟠" if r.risk_level == "high" else ("🟡" if r.risk_level == "medium" else "🟢"))
            print(f"  {risk_icon} {r.user_name} @ {r.table_name} - {r.permission_level.value} ({r.risk_level})")
            if r.risk_reason:
                print(f"      {r.risk_reason}")
        return 0

    elif args.action == "list":
        records = storage.get_permission_audits(args.batch)
        if not records:
            print("暂无权限审计记录")
            return 0

        print(f"共 {len(records)} 条权限审计记录:")
        for r in records:
            risk_icon = "🔴" if r.risk_level == "critical" else ("🟠" if r.risk_level == "high" else ("🟡" if r.risk_level == "medium" else "🟢"))
            print(f"  {risk_icon} [{r.id}] {r.user_name} - {r.table_name} ({r.permission_level.value})")
        return 0

    elif args.action == "high-risk":
        records = auditor.get_high_risk_permissions(args.batch)
        if not records:
            print("暂无高风险权限记录")
            return 0

        print(f"共 {len(records)} 条高风险权限记录:")
        for r in records:
            print(f"  [{r.id}] {r.user_name} @ {r.table_name} - {r.permission_level.value}")
            print(f"      风险等级: {r.risk_level}")
            if r.risk_reason:
                print(f"      原因: {r.risk_reason}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_slow_query(args):
    """慢查询管理"""
    storage = create_storage(args)
    attributor = SlowQueryAttributor(storage)

    if args.action == "import":
        if not args.input:
            print("请指定输入文件 --input")
            return 1

        with open(args.input, "r", encoding="utf-8") as f:
            queries = json.load(f)

        records = attributor.import_slow_queries(
            queries=queries,
            source_path=args.input,
            batch_id=args.batch,
        )

        print(f"导入完成，共 {len(records)} 条慢查询记录")
        return 0

    elif args.action == "attribute":
        attributed = attributor.attribute_queries(batch_id=args.batch)
        summary = attributor.get_attribution_summary(batch_id=args.batch)

        print(f"归因分析完成")
        print(f"  总慢查询数: {summary['total']}")
        print(f"  已归因: {summary['attributed']}")

        for q in attributed:
            if q.attribution:
                print(f"  [{q.id}] {q.table_name or '未知表'} - {q.attribution}")
                if q.attribution_details:
                    print(f"      {q.attribution_details}")
        return 0

    elif args.action == "trace":
        if not args.id:
            print("请指定慢查询 ID --id")
            return 1

        try:
            sources = attributor.trace_query_sources(args.id)
            print(f"慢查询 {args.id} 的来源材料:")
            for i, src in enumerate(sources, 1):
                print(f"  {i}. {src.source_type.value} - {src.source_path}")
                if src.details:
                    print(f"     {src.details}")
            return 0
        except AuditError as e:
            print(f"错误: {e}")
            return 1

    elif args.action == "summary":
        summary = attributor.get_attribution_summary(batch_id=args.batch)
        print(f"慢查询统计:")
        print(f"  总数: {summary['total']}")
        print(f"  已归因: {summary['attributed']}")
        if summary["by_table"]:
            print("  按表分布:")
            for table, count in sorted(summary["by_table"].items(), key=lambda x: x[1], reverse=True):
                print(f"    {table}: {count}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_migration(args):
    """迁移脚本管理"""
    storage = create_storage(args)
    manager = MigrationManager(storage)

    if args.action == "scan":
        if not args.dir:
            print("请指定迁移脚本目录 --dir")
            return 1

        try:
            scripts = manager.scan_migrations(args.dir)
            versions = set(s.version for s in scripts)
            print(f"扫描完成，共发现 {len(scripts)} 个迁移脚本，涉及 {len(versions)} 个版本")
            for s in scripts:
                drift_icon = "⚠️" if s.has_field_drift else "✓"
                print(f"  {drift_icon} V{s.version} 第{s.page_number}/{s.total_pages}页 - {Path(s.file_path).name}")
                if s.has_field_drift and s.drift_details:
                    print(f"      字段漂移: {s.drift_details}")
            return 0
        except AuditError as e:
            print(f"错误: {e}")
            return 1

    elif args.action == "validate":
        if not args.dir:
            print("请指定迁移脚本目录 --dir")
            return 1

        result = manager.validate_migration_chain(args.dir)
        if result["valid"]:
            print("✓ 迁移脚本链验证通过")
            print(f"  总脚本数: {result['total_scripts']}")
            print(f"  版本数: {result['total_versions']}")
            return 0
        else:
            print("✗ 迁移脚本链验证失败")
            for issue in result["issues"]:
                print(f"  - {issue}")
            return 1

    elif args.action == "register":
        if not args.dir:
            print("请指定迁移脚本目录 --dir")
            return 1

        try:
            scripts = manager.register_migrations(args.dir, mark_applied=args.applied)
            print(f"已注册 {len(scripts)} 个迁移脚本")
            return 0
        except AuditError as e:
            print(f"错误: {e}")
            return 1

    elif args.action == "errors":
        if not args.dir:
            print("请指定迁移脚本目录 --dir")
            return 1

        errors = manager.get_actionable_errors(args.dir)
        if not errors:
            print("✓ 未发现可操作的错误")
            return 0

        print(f"发现 {len(errors)} 个问题:")
        for i, err in enumerate(errors, 1):
            print(f"  {i}. {err}")
        return 1

    elif args.action == "drifts":
        scripts = manager.get_field_drift_scripts()
        if not scripts:
            print("未发现字段类型漂移的脚本")
            return 0

        print(f"共 {len(scripts)} 个存在字段类型漂移的脚本:")
        for s in scripts:
            print(f"  V{s.version} 第{s.page_number}页 - {s.drift_details}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_backup(args):
    """备份记录审计"""
    storage = create_storage(args)
    auditor = BackupAuditor(storage)

    if args.action == "audit":
        if not args.input:
            print("请指定输入文件 --input")
            return 1

        with open(args.input, "r", encoding="utf-8") as f:
            backups = json.load(f)

        records = auditor.audit_backups(
            backups=backups,
            source_path=args.input,
            batch_id=args.batch,
        )

        direct = sum(1 for r in records if r.can_use_directly)
        review = sum(1 for r in records if not r.can_use_directly and r.status.value == "needs_review")
        print(f"审计完成，共 {len(records)} 个备份记录")
        print(f"  可直接使用: {direct}")
        print(f"  需安全审计员复核: {review}")

        for r in records:
            status_icon = "✓" if r.can_use_directly else ("?" if r.status.value == "needs_review" else "✗")
            print(f"  {status_icon} {r.backup_name} ({r.source_db}) - {r.backup_time.isoformat()}")
            if not r.can_use_directly and r.review_reason:
                print(f"      {r.review_reason}")
        return 0

    elif args.action == "list":
        records = storage.get_backup_records(args.batch)
        if not records:
            print("暂无备份记录")
            return 0

        print(f"共 {len(records)} 个备份记录:")
        for r in records:
            status_icon = "✓" if r.can_use_directly else ("?" if r.status.value == "needs_review" else "✗")
            size_mb = r.backup_size_bytes / 1024 / 1024
            print(f"  {status_icon} [{r.id}] {r.backup_name} - {size_mb:.1f}MB - {r.source_db}")
        return 0

    elif args.action == "direct":
        records = auditor.get_direct_use_backups(args.batch)
        if not records:
            print("无可直接使用的备份")
            return 0

        print(f"共 {len(records)} 个可直接使用的备份:")
        for r in records:
            size_mb = r.backup_size_bytes / 1024 / 1024
            print(f"  ✓ {r.backup_name} - {size_mb:.1f}MB - {r.source_db}")
        return 0

    elif args.action == "review":
        records = auditor.get_backups_needing_review(args.batch)
        if not records:
            print("无需复核的备份")
            return 0

        print(f"共 {len(records)} 个需安全审计员复核的备份:")
        for r in records:
            print(f"  ? {r.backup_name} ({r.source_db})")
            if r.review_reason:
                print(f"      原因: {r.review_reason}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_report(args):
    """报表管理"""
    storage = create_storage(args)
    generator = ReportGenerator(storage)

    if args.action == "generate":
        if not args.batch:
            print("请指定数据批次 --batch")
            return 1

        report = generator.generate_report(
            name=args.name or f"审计报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            batch_id=args.batch,
            description=args.description or "",
        )

        print(f"报告已生成: {report.id}")
        print(f"  名称: {report.name}")
        print(f"  数据批次: {report.data_batch_id}")
        print(f"  索引建议: {report.index_suggestion_count} 条")
        print(f"  权限审计: {report.permission_audit_count} 条")
        print(f"  慢查询: {report.slow_query_count} 条")
        print(f"  备份: {report.backup_count} 条")
        return 0

    elif args.action == "list":
        reports = generator.list_reports()
        if not reports:
            print("暂无报告")
            return 0

        print(f"共 {len(reports)} 份报告:")
        for r in reports:
            print(f"  [{r.id}] {r.name} ({r.generated_at.isoformat()})")
            print(f"      批次: {r.data_batch_id}")
        return 0

    elif args.action == "export-json":
        if not args.id:
            print("请指定报告 ID --id")
            return 1
        if not args.output:
            print("请指定输出文件 --output")
            return 1

        path = generator.export_report_json(args.id, args.output)
        print(f"报告已导出到: {path}")
        print("  包含: 图表数据 + 明细 + 溯源链接")
        print("  注意: 所有数据均来自同一批次，确保一致性")
        return 0

    elif args.action == "export-csv":
        if not args.id:
            print("请指定报告 ID --id")
            return 1
        if not args.output:
            print("请指定输出目录 --output")
            return 1

        files = generator.export_report_csv(args.id, args.output)
        print(f"报告 CSV 已导出到目录: {args.output}")
        for name, path in files.items():
            print(f"  - {name}: {path}")
        print("  注意: 所有文件均来自同一批次数据，确保图表、明细、下载结果一致")
        return 0

    elif args.action == "detail":
        if not args.id:
            print("请指定报告 ID --id")
            return 1

        detail = generator.get_report_detail(args.id)
        if not detail:
            print(f"报告 {args.id} 不存在")
            return 1

        report = detail["report"]
        print(f"报告: {report.name}")
        print(f"  ID: {report.id}")
        print(f"  数据批次: {report.data_batch_id}")
        print(f"  生成时间: {report.generated_at.isoformat()}")
        print()
        print("  索引建议统计:")
        print(f"    总数: {report.index_suggestion_count}")
        print(f"    已通过: {report.index_suggestion_passed}")
        print()
        print("  权限审计统计:")
        print(f"    总数: {report.permission_audit_count}")
        print(f"    需复核: {report.permission_audit_needs_review}")
        print()
        print("  慢查询统计:")
        print(f"    总数: {report.slow_query_count}")
        print()
        print("  备份统计:")
        print(f"    总数: {report.backup_count}")
        print(f"    可直接使用: {report.backup_can_use_directly}")
        return 0

    else:
        print(f"未知操作: {args.action}")
        return 1


def cmd_run(args):
    """一键运行完整审计流程"""
    storage = create_storage(args)

    if not args.migration_dir and not args.slow_query and not args.permission and not args.backup:
        print("请至少指定一种输入数据（迁移脚本目录/慢查询文件/权限文件/备份文件）")
        return 1

    batch_name = args.batch_name or f"审计批次_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    batch_id = storage.create_batch(batch_name, args.description or "")

    print(f"=== 搜索索引回源校验 ===")
    print(f"数据批次: {batch_id} ({batch_name})")
    print()

    exit_code = 0

    if args.migration_dir:
        print("--- 1. 迁移脚本校验 ---")
        manager = MigrationManager(storage)
        try:
            result = manager.validate_migration_chain(args.migration_dir)
            if result["valid"]:
                print(f"✓ 迁移脚本链完整（{result['total_scripts']} 个脚本，{result['total_versions']} 个版本）")
            else:
                print("✗ 迁移脚本链存在问题")
                for issue in result["issues"]:
                    print(f"  - {issue}")
                exit_code = 1
        except Exception as e:
            print(f"✗ 迁移脚本校验失败: {e}")
            exit_code = 1
        print()

    if args.slow_query:
        print("--- 2. 索引建议分析 ---")
        analyzer = IndexAnalyzer(storage)
        try:
            with open(args.slow_query, "r", encoding="utf-8") as f:
                queries = json.load(f)
            suggestions = analyzer.analyze_slow_queries(queries, args.slow_query, batch_id)
            print(f"✓ 生成 {len(suggestions)} 条索引建议")
            for s in suggestions[:5]:
                print(f"  - {s.table_name} ({', '.join(s.column_names)}): 预期提升 {s.expected_improvement:.1f}x")
            if len(suggestions) > 5:
                print(f"  ... 还有 {len(suggestions) - 5} 条")
        except Exception as e:
            print(f"✗ 索引建议分析失败: {e}")
            exit_code = 1
        print()

        print("--- 3. 慢查询导入与归因 ---")
        attributor = SlowQueryAttributor(storage)
        try:
            with open(args.slow_query, "r", encoding="utf-8") as f:
                queries = json.load(f)
            attributor.import_slow_queries(queries, args.slow_query, batch_id)
            attributed = attributor.attribute_queries(batch_id)
            summary = attributor.get_attribution_summary(batch_id)
            print(f"✓ 导入 {summary['total']} 条慢查询，已归因 {summary['attributed']} 条")
            if attributed:
                for q in attributed[:3]:
                    if q.attribution:
                        print(f"  - {q.table_name or '未知表'}: {q.attribution}")
        except Exception as e:
            print(f"✗ 慢查询处理失败: {e}")
            exit_code = 1
        print()

    if args.permission:
        print("--- 4. 权限审计 ---")
        auditor = PermissionAuditor(storage)
        try:
            with open(args.permission, "r", encoding="utf-8") as f:
                permissions = json.load(f)
            records = auditor.audit_permissions(permissions, args.permission, batch_id)
            high_risk = [r for r in records if r.risk_level in ("high", "critical")]
            print(f"✓ 审计 {len(records)} 条权限记录")
            print(f"  高风险: {len(high_risk)} 条")
            print(f"  需复核: {sum(1 for r in records if r.status.value == 'needs_review')} 条")
        except Exception as e:
            print(f"✗ 权限审计失败: {e}")
            exit_code = 1
        print()

    if args.backup:
        print("--- 5. 备份审计 ---")
        auditor = BackupAuditor(storage)
        try:
            with open(args.backup, "r", encoding="utf-8") as f:
                backups = json.load(f)
            records = auditor.audit_backups(backups, args.backup, batch_id)
            direct = sum(1 for r in records if r.can_use_directly)
            review = sum(1 for r in records if r.status.value == "needs_review")
            print(f"✓ 审计 {len(records)} 个备份记录")
            print(f"  可直接使用: {direct}")
            print(f"  需安全审计员复核: {review}")
        except Exception as e:
            print(f"✗ 备份审计失败: {e}")
            exit_code = 1
        print()

    print("--- 6. 生成报告 ---")
    generator = ReportGenerator(storage)
    try:
        report = generator.generate_report(
            name=f"完整审计报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            batch_id=batch_id,
        )
        print(f"✓ 报告已生成: {report.id}")
        print(f"  名称: {report.name}")
        print(f"  数据批次: {report.data_batch_id}")
        print()
        print("提示: 使用 'report export-json --id <report_id> --output <file.json>' 导出完整报告")
        print("      图表、明细、下载结果均来自同一批数据，确保一致性")
        print("      每条记录都包含溯源链接，可点回来源材料")
    except Exception as e:
        print(f"✗ 报告生成失败: {e}")
        exit_code = 1

    print()
    if exit_code == 0:
        print("=== 校验完成 ===")
    else:
        print("=== 校验完成（存在问题）===")

    return exit_code


def main():
    parser = argparse.ArgumentParser(
        description="搜索索引回源校验系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
核心功能:
  1. 索引建议 - 从慢查询分析索引优化建议
  2. 权限审计 - 审计数据库权限配置
  3. 慢查询归因 - 将结论追溯回来源材料
  4. 迁移脚本校验 - 检测漏页和字段类型漂移
  5. 备份审计 - 区分可直接使用/需复核
  6. 统一报表 - 图表、明细、下载同一批数据

使用示例:
  # 一键运行完整审计
  search-index-audit run --slow-query slow.json --permission perm.json --backup backup.json --migration-dir ./migrations

  # 创建数据批次
  search-index-audit batch create --name "2024 Q1 审计"

  # 分析索引建议
  search-index-audit index analyze --input slow_queries.json --batch <batch_id>

  # 导出报告
  search-index-audit report export-json --id <report_id> --output report.json
        """,
    )

    parser.add_argument("--db", default="audit.db", help="数据库文件路径")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # run - 一键运行
    run_parser = subparsers.add_parser("run", help="一键运行完整审计流程")
    run_parser.add_argument("--slow-query", help="慢查询 JSON 文件")
    run_parser.add_argument("--permission", help="权限 JSON 文件")
    run_parser.add_argument("--backup", help="备份 JSON 文件")
    run_parser.add_argument("--migration-dir", help="迁移脚本目录")
    run_parser.add_argument("--batch-name", help="批次名称")
    run_parser.add_argument("--description", help="批次描述")
    run_parser.set_defaults(func=cmd_run)

    # batch - 数据批次管理
    batch_parser = subparsers.add_parser("batch", help="数据批次管理")
    batch_parser.add_argument("action", choices=["create", "list"], help="操作")
    batch_parser.add_argument("--name", help="批次名称")
    batch_parser.add_argument("--description", help="批次描述")
    batch_parser.set_defaults(func=cmd_batch)

    # index - 索引建议
    index_parser = subparsers.add_parser("index", help="索引建议管理")
    index_parser.add_argument("action", choices=["analyze", "list", "trace"], help="操作")
    index_parser.add_argument("--input", help="输入文件")
    index_parser.add_argument("--batch", help="数据批次 ID")
    index_parser.add_argument("--id", help="索引建议 ID")
    index_parser.set_defaults(func=cmd_index)

    # permission - 权限审计
    perm_parser = subparsers.add_parser("permission", help="权限审计管理")
    perm_parser.add_argument("action", choices=["audit", "list", "high-risk"], help="操作")
    perm_parser.add_argument("--input", help="输入文件")
    perm_parser.add_argument("--batch", help="数据批次 ID")
    perm_parser.set_defaults(func=cmd_permission)

    # slow-query - 慢查询
    sq_parser = subparsers.add_parser("slow-query", help="慢查询管理")
    sq_parser.add_argument("action", choices=["import", "attribute", "trace", "summary"], help="操作")
    sq_parser.add_argument("--input", help="输入文件")
    sq_parser.add_argument("--batch", help="数据批次 ID")
    sq_parser.add_argument("--id", help="慢查询 ID")
    sq_parser.set_defaults(func=cmd_slow_query)

    # migration - 迁移脚本
    mig_parser = subparsers.add_parser("migration", help="迁移脚本管理")
    mig_parser.add_argument("action", choices=["scan", "validate", "register", "errors", "drifts"], help="操作")
    mig_parser.add_argument("--dir", help="迁移脚本目录")
    mig_parser.add_argument("--applied", action="store_true", help="标记为已应用")
    mig_parser.set_defaults(func=cmd_migration)

    # backup - 备份审计
    backup_parser = subparsers.add_parser("backup", help="备份记录审计")
    backup_parser.add_argument("action", choices=["audit", "list", "direct", "review"], help="操作")
    backup_parser.add_argument("--input", help="输入文件")
    backup_parser.add_argument("--batch", help="数据批次 ID")
    backup_parser.set_defaults(func=cmd_backup)

    # report - 报表
    report_parser = subparsers.add_parser("report", help="报表管理")
    report_parser.add_argument("action", choices=["generate", "list", "export-json", "export-csv", "detail"], help="操作")
    report_parser.add_argument("--id", help="报告 ID")
    report_parser.add_argument("--batch", help="数据批次 ID")
    report_parser.add_argument("--name", help="报告名称")
    report_parser.add_argument("--description", help="报告描述")
    report_parser.add_argument("--output", help="输出文件/目录")
    report_parser.set_defaults(func=cmd_report)

    args = parser.parse_args()

    if not hasattr(args, "func"):
        parser.print_help()
        return 1

    try:
        return args.func(args)
    except AuditError as e:
        print(f"错误: {e}")
        return 1
    except KeyboardInterrupt:
        print("\n已取消")
        return 130


if __name__ == "__main__":
    sys.exit(main())
