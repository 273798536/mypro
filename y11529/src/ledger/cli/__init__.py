import sys
import json
import click
from datetime import datetime
from typing import Optional

from ledger.database import SessionLocal, init_db
from ledger.models import RecordType, RecordStatus, Role, ChangeReason
from ledger.services import (
    RecordService, ImportService, ExportService, AuditService,
    StateTransitionError, RecordFrozenError
)

EXIT_SUCCESS = 0
EXIT_ERROR = 1
EXIT_NOT_FOUND = 2
EXIT_INVALID_STATE = 3
EXIT_FROZEN = 4
EXIT_DUPLICATE = 5


def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """跨境小包清关权限追责台账 CLI"""
    init_db()


@cli.group()
def record():
    """台账记录管理"""
    pass


@record.command("create")
@click.option("--type", "record_type", required=True, type=click.Choice([t.value for t in RecordType]), help="记录类型")
@click.option("--tracking", required=True, help="运单号")
@click.option("--package", help="包裹号")
@click.option("--customs", help="海关编号")
@click.option("--by", "created_by", required=True, help="创建人")
@click.option("--role", "created_by_role", required=True, type=click.Choice([r.value for r in Role]), help="创建人角色")
@click.option("--hs-code", help="HS编码")
@click.option("--goods", "goods_description", help="商品名称")
@click.option("--value", "declared_value", type=float, default=0, help="申报价值")
@click.option("--tax", "tax_amount", type=float, default=0, help="税费")
@click.option("--exception", "is_exception", is_flag=True, help="是否异常")
@click.option("--exception-owner", help="异常责任人")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def record_create(record_type, tracking, package, customs, created_by, created_by_role,
                  hs_code, goods_description, declared_value, tax_amount, is_exception, exception_owner, json_output):
    """创建台账记录"""
    db = get_db()
    try:
        service = RecordService(db)
        record = service.create_record(
            record_type=RecordType(record_type),
            tracking_no=tracking,
            package_no=package,
            customs_no=customs,
            created_by=created_by,
            created_by_role=Role(created_by_role),
            hs_code=hs_code,
            goods_description=goods_description,
            declared_value=declared_value,
            tax_amount=tax_amount,
            is_exception=is_exception,
            exception_owner=exception_owner,
        )

        if json_output:
            click.echo(json.dumps({
                "id": record.id,
                "record_no": record.record_no,
                "status": record.status.value,
            }, ensure_ascii=False))
        else:
            click.echo(f"✓ 记录创建成功: {record.record_no} (ID: {record.id})")

        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"✗ 错误: {e}", err=True)
        sys.exit(EXIT_ERROR)


@record.command("list")
@click.option("--status", type=click.Choice([s.value for s in RecordStatus]), help="状态筛选")
@click.option("--type", "record_type", type=click.Choice([t.value for t in RecordType]), help="类型筛选")
@click.option("--tracking", help="运单号筛选")
@click.option("--limit", type=int, default=20, help="显示数量")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def record_list(status, record_type, tracking, limit, json_output):
    """列出台账记录"""
    db = get_db()
    service = RecordService(db)
    records = service.list_records(
        status=RecordStatus(status) if status else None,
        record_type=RecordType(record_type) if record_type else None,
        tracking_no=tracking,
        limit=limit,
    )

    if json_output:
        result = [{
            "id": r.id,
            "record_no": r.record_no,
            "type": r.record_type.value,
            "status": r.status.value,
            "tracking_no": r.tracking_no,
            "version": r.version,
        } for r in records]
        click.echo(json.dumps(result, ensure_ascii=False))
    else:
        if not records:
            click.echo("没有找到记录")
            sys.exit(EXIT_SUCCESS)

        click.echo(f"共找到 {len(records)} 条记录:")
        click.echo("-" * 80)
        for r in records:
            click.echo(f"{r.record_no} | {r.status.value:10s} | {r.record_type.value:12s} | {r.tracking_no or '-':20s} | v{r.version}")

    sys.exit(EXIT_SUCCESS)


@record.command("show")
@click.argument("record_id", type=int)
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def record_show(record_id, json_output):
    """显示台账记录详情"""
    db = get_db()
    service = RecordService(db)
    record = service.get_record(record_id)

    if not record:
        click.echo(f"✗ 记录 {record_id} 不存在", err=True)
        sys.exit(EXIT_NOT_FOUND)

    data = {
        "id": record.id,
        "record_no": record.record_no,
        "version": record.version,
        "type": record.record_type.value,
        "status": record.status.value,
        "is_frozen": record.is_frozen,
        "tracking_no": record.tracking_no,
        "package_no": record.package_no,
        "customs_no": record.customs_no,
        "current_handler": record.current_handler,
        "final_handler": record.final_handler,
        "change_reason": record.change_reason.value if record.change_reason else None,
        "change_reason_note": record.change_reason_note,
        "import_source": record.import_source_id,
        "import_row": record.import_row_number,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }

    if record.declaration:
        data.update({
            "declaration_no": record.declaration.declaration_no,
            "hs_code": record.declaration.hs_code,
            "goods_description": record.declaration.goods_description,
            "declared_value": record.declaration.declared_value,
            "tax_amount": record.declaration.tax_amount,
            "is_exception": record.declaration.is_exception,
            "exception_owner": record.declaration.exception_owner,
        })

    if json_output:
        click.echo(json.dumps(data, ensure_ascii=False))
    else:
        click.echo(f"记录详情: {record.record_no}")
        click.echo("-" * 40)
        for key, value in data.items():
            click.echo(f"{key:20s}: {value}")

    sys.exit(EXIT_SUCCESS)


@record.command("submit")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--note", help="备注")
def record_submit(record_id, action_by, action_by_role, note):
    """提交记录审核"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.submit_record(
            record_id=record_id,
            submitted_by=action_by,
            submitted_by_role=Role(action_by_role),
            note=note,
        )
        click.echo(f"✓ 记录 {record.record_no} 已提交审核")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except StateTransitionError as e:
        click.echo(f"✗ 状态错误: {e}", err=True)
        sys.exit(EXIT_INVALID_STATE)
    except RecordFrozenError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_FROZEN)


@record.command("reject")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--reason", required=True, help="驳回原因")
def record_reject(record_id, action_by, action_by_role, reason):
    """驳回记录"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.reject_record(
            record_id=record_id,
            rejected_by=action_by,
            rejected_by_role=Role(action_by_role),
            rejection_reason=reason,
        )
        click.echo(f"✓ 记录 {record.record_no} 已驳回")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except StateTransitionError as e:
        click.echo(f"✗ 状态错误: {e}", err=True)
        sys.exit(EXIT_INVALID_STATE)


@record.command("confirm")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--note", help="备注")
def record_confirm(record_id, action_by, action_by_role, note):
    """二次确认记录"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.confirm_record(
            record_id=record_id,
            confirmed_by=action_by,
            confirmed_by_role=Role(action_by_role),
            note=note,
        )
        click.echo(f"✓ 记录 {record.record_no} 已确认")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except StateTransitionError as e:
        click.echo(f"✗ 状态错误: {e}", err=True)
        sys.exit(EXIT_INVALID_STATE)


@record.command("recall")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--reason", required=True, help="撤回原因")
def record_recall(record_id, action_by, action_by_role, reason):
    """撤回记录"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.recall_record(
            record_id=record_id,
            recalled_by=action_by,
            recalled_by_role=Role(action_by_role),
            reason=reason,
        )
        click.echo(f"✓ 记录 {record.record_no} 已撤回")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except StateTransitionError as e:
        click.echo(f"✗ 状态错误: {e}", err=True)
        sys.exit(EXIT_INVALID_STATE)


@record.command("freeze")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--reason", required=True, help="冻结原因")
def record_freeze(record_id, action_by, action_by_role, reason):
    """冻结记录（导出前）"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.freeze_record(
            record_id=record_id,
            frozen_by=action_by,
            frozen_by_role=Role(action_by_role),
            reason=reason,
        )
        click.echo(f"✓ 记录 {record.record_no} 已冻结")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except StateTransitionError as e:
        click.echo(f"✗ 状态错误: {e}", err=True)
        sys.exit(EXIT_INVALID_STATE)


@record.command("unfreeze")
@click.argument("record_id", type=int)
@click.option("--by", "action_by", required=True, help="操作人")
@click.option("--role", "action_by_role", required=True, type=click.Choice([r.value for r in Role]), help="操作人角色")
@click.option("--reason", required=True, help="解冻原因")
def record_unfreeze(record_id, action_by, action_by_role, reason):
    """解冻记录"""
    db = get_db()
    service = RecordService(db)
    try:
        record = service.unfreeze_record(
            record_id=record_id,
            unfrozen_by=action_by,
            unfrozen_by_role=Role(action_by_role),
            reason=reason,
        )
        click.echo(f"✓ 记录 {record.record_no} 已解冻")
        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)


@record.command("history")
@click.argument("record_id", type=int)
@click.option("--desensitize", is_flag=True, help="敏感字段脱敏")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def record_history(record_id, desensitize, json_output):
    """查看记录变更历史"""
    db = get_db()
    service = AuditService(db)
    try:
        history = service.get_record_history(record_id, desensitize=desensitize)

        if json_output:
            result = [h.to_dict(desensitize) for h in history]
            click.echo(json.dumps(result, ensure_ascii=False))
        else:
            if not history:
                click.echo("没有变更历史")
                sys.exit(EXIT_SUCCESS)

            click.echo(f"记录 {record_id} 的变更历史:")
            click.echo("-" * 60)
            for h in history:
                h_dict = h.to_dict(desensitize)
                click.echo(f"[{h_dict['action_time']}] {h_dict['action']} by {h_dict['action_by']} ({h_dict['action_by_role']})")
                click.echo(f"  版本: {h_dict['version_before']} -> {h_dict['version_after']}")
                if h_dict['action_note']:
                    click.echo(f"  备注: {h_dict['action_note']}")
                for diff in h_dict['diffs']:
                    click.echo(f"  - {diff['field_name']}: {diff['old_value']} -> {diff['new_value']}")
                click.echo()

        sys.exit(EXIT_SUCCESS)
    except ValueError as e:
        click.echo(f"✗ {e}", err=True)
        sys.exit(EXIT_NOT_FOUND)


@cli.group()
def import_cmd():
    """数据导入"""
    pass


@import_cmd.command("file")
@click.argument("filepath")
@click.option("--type", "record_type", default="declaration", type=click.Choice([t.value for t in RecordType]), help="记录类型")
@click.option("--by", "imported_by", required=True, help="导入人")
@click.option("--role", "imported_by_role", required=True, type=click.Choice([r.value for r in Role]), help="导入人角色")
@click.option("--sheet", help="Excel工作表名称")
@click.option("--force", is_flag=True, help="忽略重复导入检查")
def import_file(filepath, record_type, imported_by, imported_by_role, sheet, force):
    """从文件导入数据"""
    db = get_db()
    service = ImportService(db)

    try:
        with open(filepath, "rb") as f:
            content = f.read()

        if not force:
            file_hash = service._calculate_file_hash(content)
            existing = service.check_duplicate_import(file_hash)
            if existing:
                click.echo(f"! 警告: 文件已在 {existing.created_at} 导入过", err=True)
                click.echo(f"  如需强制导入，请使用 --force 参数", err=True)
                sys.exit(EXIT_DUPLICATE)

        import_source, result = service.import_from_file(
            filename=filepath,
            file_content=content,
            record_type=RecordType(record_type),
            imported_by=imported_by,
            imported_by_role=Role(imported_by_role),
            sheet_name=sheet,
        )

        click.echo(f"✓ 导入完成: {filepath}")
        click.echo(f"  导入来源ID: {import_source.id}")
        click.echo(f"  总行数: {import_source.total_rows}")
        click.echo(f"  成功: {result.success_count}")
        click.echo(f"  失败: {result.failed_count}")

        if result.errors:
            click.echo()
            click.echo("错误详情:")
            for err in result.errors:
                click.echo(f"  第{err['row_number']}行: {err['error']}")

        sys.exit(EXIT_SUCCESS if result.failed_count == 0 else EXIT_ERROR)
    except FileNotFoundError:
        click.echo(f"✗ 文件不存在: {filepath}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    except Exception as e:
        click.echo(f"✗ 导入失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@import_cmd.command("status")
@click.argument("source_id", type=int)
def import_status(source_id):
    """查看导入状态"""
    db = get_db()
    service = ImportService(db)
    source = service.get_import_source(source_id)

    if not source:
        click.echo(f"✗ 导入来源 {source_id} 不存在", err=True)
        sys.exit(EXIT_NOT_FOUND)

    records = service.get_records_by_source(source_id)

    click.echo(f"导入来源: {source.filename}")
    click.echo(f"上传时间: {source.created_at}")
    click.echo(f"上传人: {source.uploaded_by}")
    click.echo(f"总行数: {source.total_rows}")
    click.echo(f"成功: {source.success_rows}")
    click.echo(f"失败: {source.failed_rows}")
    click.echo(f"生成记录数: {len(records)}")

    sys.exit(EXIT_SUCCESS)


@cli.group()
def export():
    """数据导出"""
    pass


@export.command("excel")
@click.argument("output_path")
@click.option("--status", type=click.Choice([s.value for s in RecordStatus]), help="状态筛选")
@click.option("--type", "record_type", type=click.Choice([t.value for t in RecordType]), help="类型筛选")
@click.option("--include-history", is_flag=True, help="包含变更历史")
@click.option("--desensitize", is_flag=True, help="敏感字段脱敏")
@click.option("--role", type=click.Choice([r.value for r in Role]), help="角色视图筛选")
def export_excel(output_path, status, record_type, include_history, desensitize, role):
    """导出为 Excel"""
    db = get_db()
    service = ExportService(db)

    try:
        _, count = service.export_to_excel(
            output_path=output_path,
            status=RecordStatus(status) if status else None,
            record_type=RecordType(record_type) if record_type else None,
            include_history=include_history,
            desensitize=desensitize,
            role=Role(role) if role else None,
        )

        click.echo(f"✓ 导出成功: {output_path}")
        click.echo(f"  导出记录数: {count}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"✗ 导出失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@export.command("json")
@click.argument("output_path")
@click.option("--status", type=click.Choice([s.value for s in RecordStatus]), help="状态筛选")
@click.option("--type", "record_type", type=click.Choice([t.value for t in RecordType]), help="类型筛选")
@click.option("--include-history", is_flag=True, help="包含变更历史")
@click.option("--desensitize", is_flag=True, help="敏感字段脱敏")
@click.option("--role", type=click.Choice([r.value for r in Role]), help="角色视图筛选")
def export_json(output_path, status, record_type, include_history, desensitize, role):
    """导出为 JSON"""
    db = get_db()
    service = ExportService(db)

    try:
        data = service.export_records(
            status=RecordStatus(status) if status else None,
            record_type=RecordType(record_type) if record_type else None,
            include_history=include_history,
            desensitize=desensitize,
            role=Role(role) if role else None,
        )

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        click.echo(f"✓ 导出成功: {output_path}")
        click.echo(f"  导出记录数: {len(data)}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"✗ 导出失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.group()
def report():
    """报表生成"""
    pass


@report.command("exceptions")
@click.option("--desensitize", is_flag=True, help="敏感字段脱敏")
@click.option("--role", type=click.Choice([r.value for r in Role]), help="角色视图")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def report_exceptions(desensitize, role, json_output):
    """异常件报表"""
    db = get_db()
    service = ExportService(db)

    report_data = service.generate_exception_report(
        desensitize=desensitize,
        role=Role(role) if role else None,
    )

    if json_output:
        click.echo(json.dumps(report_data, ensure_ascii=False))
    else:
        click.echo("=" * 50)
        click.echo("异常件报表")
        click.echo("=" * 50)
        click.echo(f"异常总数: {report_data['total_exceptions']}")
        click.echo()
        click.echo("按责任人统计:")
        for owner, count in report_data['exception_by_owner'].items():
            click.echo(f"  {owner}: {count}")
        click.echo()
        click.echo(f"生成时间: {report_data['generated_at']}")

    sys.exit(EXIT_SUCCESS)


@report.command("dashboard")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def report_dashboard(json_output):
    """经理仪表盘"""
    db = get_db()
    service = ExportService(db)

    dashboard_data = service.generate_manager_dashboard()

    if json_output:
        click.echo(json.dumps(dashboard_data, ensure_ascii=False))
    else:
        click.echo("=" * 50)
        click.echo("经理仪表盘")
        click.echo("=" * 50)
        click.echo(f"记录总数: {dashboard_data['total_records']}")
        click.echo()
        click.echo("按状态统计:")
        for status, count in dashboard_data['status_summary'].items():
            click.echo(f"  {status}: {count}")
        click.echo()
        click.echo("按类型统计:")
        for rtype, count in dashboard_data['type_summary'].items():
            click.echo(f"  {rtype}: {count}")
        click.echo()
        click.echo(f"总申报价值: {dashboard_data['total_declared_value']:,}")
        click.echo(f"总税费: {dashboard_data['total_tax_amount']:,}")
        click.echo()
        click.echo(f"生成时间: {dashboard_data['generated_at']}")

    sys.exit(EXIT_SUCCESS)


@cli.group()
def audit():
    """审计查询"""
    pass


@audit.command("logs")
@click.option("--by", "action_by", help="操作人筛选")
@click.option("--action", help="操作类型筛选")
@click.option("--limit", type=int, default=50, help="显示数量")
@click.option("--json-output", is_flag=True, help="JSON格式输出")
def audit_logs(action_by, action, limit, json_output):
    """审计日志查询"""
    db = get_db()
    service = AuditService(db)

    logs = service.get_audit_trail(
        action_by=action_by,
        skip=0,
        limit=limit,
    )

    if json_output:
        click.echo(json.dumps(logs, ensure_ascii=False))
    else:
        if not logs:
            click.echo("没有审计日志")
            sys.exit(EXIT_SUCCESS)

        click.echo(f"审计日志 (显示最近 {len(logs)} 条):")
        click.echo("-" * 80)
        for log in logs:
            click.echo(f"{log['action_time']} | {log['action']:10s} | {log['action_by']:15s} | {log['action_by_role'] or '-':12s} | {log['action_note'] or ''}")

    sys.exit(EXIT_SUCCESS)


if __name__ == "__main__":
    cli()
