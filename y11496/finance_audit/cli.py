import click
import json
import sys
from pathlib import Path
from typing import Optional
from tabulate import tabulate
from datetime import datetime

from .storage import AuditStorage
from .audit_engine import AuditEngine
from .models import (
    ReimbursementRecord,
    RecordStatus,
    SourceType,
    SourceEvidence,
    IssueType,
    generate_record_id
)
from .importers import get_importer, detect_source_type


@click.group()
@click.option('--data-dir', default='.audit-data', help='数据目录路径')
@click.pass_context
def cli(ctx, data_dir):
    ctx.ensure_object(dict)
    ctx.obj['storage'] = AuditStorage(data_dir)
    ctx.obj['engine'] = AuditEngine(ctx.obj['storage'])


@cli.command()
@click.pass_context
def init(ctx):
    storage = ctx.obj['storage']
    if storage.init():
        click.echo(f"✓ 稽核系统已初始化，数据目录: {storage.base_path}")
    else:
        click.echo(f"✗ 稽核系统已存在，无需重复初始化")
        sys.exit(1)


@cli.command('import')
@click.argument('file_path')
@click.option('--source-type', type=click.Choice(['invoice_pdf', 'travel_request', 'payment_flow', 'supervisor_note']),
              help='数据源类型，自动检测时可省略')
@click.option('--trip-id', help='共享行程ID，用于关联多人共用行程')
@click.option('--operator', default='cli_user', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='导入后创建快照')
@click.pass_context
def import_cmd(ctx, file_path, source_type, trip_id, operator, snapshot):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    if source_type:
        st = SourceType(source_type)
    else:
        st = detect_source_type(file_path)
        if not st:
            click.echo("✗ 无法自动检测数据源类型，请使用 --source-type 指定")
            sys.exit(1)
        click.echo(f"自动检测数据源类型: {st.value}")

    if st == SourceType.SUPERVISOR_NOTE:
        _import_supervisor_notes(ctx, file_path, operator)
        return

    importer = get_importer(st)
    records_data, errors = importer.parse(file_path)

    click.echo(f"\n解析结果: {len(records_data)} 条记录, {len(errors)} 条错误")

    imported_count = 0
    updated_count = 0

    for data in records_data:
        record = _find_or_create_record(storage, data, st, trip_id)

        evidence = SourceEvidence(
            source_type=st,
            source_file=data["source_file"],
            original_line=data["original_line"],
            raw_value=data["raw_value"],
            parsed_value=data
        )
        record.add_evidence(evidence)

        if trip_id:
            record.shared_trip_id = trip_id
        elif st in [SourceType.INVOICE_PDF, SourceType.PAYMENT_FLOW]:
            _auto_link_trip_id(storage, record, data)

        if record.status == RecordStatus.PENDING:
            record.update_status(RecordStatus.IMPORTED, operator, f"Imported from {file_path}")
            imported_count += 1
        else:
            updated_count += 1

        storage.save_record(record)

    if errors:
        click.echo(f"\n✗ 导入错误 ({len(errors)} 条):")
        for err in errors[:10]:
            click.echo(f"  行 {err['line']}: {err['error']}")
        if len(errors) > 10:
            click.echo(f"  ... 还有 {len(errors) - 10} 条错误")
        sys.exit(1)

    click.echo(f"✓ 导入完成: 新增 {imported_count} 条, 更新 {updated_count} 条")

    if snapshot:
        snap_id = storage.create_snapshot(f"After import: {file_path}", operator)
        click.echo(f"✓ 已创建快照: {snap_id}")


def _import_supervisor_notes(ctx, file_path, operator):
    storage = ctx.obj['storage']
    importer = get_importer(SourceType.SUPERVISOR_NOTE)
    notes_data, errors = importer.parse(file_path)

    click.echo(f"\n解析主管批注: {len(notes_data)} 条, {len(errors)} 条错误")

    applied = 0
    not_found = 0
    all_records = storage.load_all_records()
    
    for note in notes_data:
        record_id = note.get("record_id")
        match_criteria = note.get("match_criteria")
        
        record = None
        
        if record_id:
            record = storage.load_record(record_id)
        
        if not record and match_criteria:
            mc = match_criteria
            for rec in all_records:
                if (mc.get("employee_name") and rec.employee_name == mc["employee_name"] and
                    mc.get("expense_type") and rec.expense_type == mc["expense_type"]):
                    if mc.get("expense_date") and str(rec.expense_date) != str(mc["expense_date"]):
                        continue
                    if mc.get("amount") is not None and abs(rec.amount - mc["amount"]) > 0.01:
                        continue
                    record = rec
                    break

        if not record:
            if record_id:
                click.echo(f"  警告: 记录 {record_id} 不存在")
            elif match_criteria:
                click.echo(f"  警告: 未找到匹配记录 {match_criteria}")
            not_found += 1
            continue

        evidence = SourceEvidence(
            source_type=SourceType.SUPERVISOR_NOTE,
            source_file=note["source_file"],
            original_line=note["original_line"],
            raw_value=note["raw_value"],
            parsed_value=note
        )
        record.add_evidence(evidence)

        approval_status = note.get("approval_status", "").lower()
        if approval_status in ["approved", "通过", "同意"]:
            record.update_status(RecordStatus.APPROVED, operator, note.get("note", "Supervisor approval"))
        elif approval_status in ["rejected", "拒绝", "驳回"]:
            record.update_status(RecordStatus.REJECTED, operator, note.get("note", "Supervisor rejection"))

        storage.save_record(record)
        applied += 1

    if errors or not_found > 0:
        if errors:
            click.echo(f"\n✗ 解析错误 ({len(errors)} 条):")
            for err in errors[:10]:
                click.echo(f"  行 {err['line']}: {err['error']}")
        if not_found > 0:
            click.echo(f"\n✗ 有 {not_found} 条记录不存在，无法应用批注")
        sys.exit(1)

    click.echo(f"✓ 批注应用完成: {applied} 条记录已更新")


def _find_or_create_record(storage, data, source_type, trip_id=None):
    all_records = storage.load_all_records()
    
    if source_type == SourceType.INVOICE_PDF:
        return ReimbursementRecord(
            record_id=generate_record_id(),
            employee_id=str(data.get("employee_id", "UNKNOWN")),
            employee_name=str(data.get("employee_name", "未知")),
            expense_type=str(data.get("expense_type", "其他")),
            amount=float(data.get("amount", 0)),
            currency=str(data.get("currency", "CNY")),
            expense_date=str(data.get("expense_date", datetime.now().strftime('%Y-%m-%d'))),
            status=RecordStatus.PENDING,
            shared_trip_id=trip_id
        )
    
    key_fields = {
        "employee_id": data.get("employee_id"),
        "amount": data.get("amount"),
        "expense_date": data.get("expense_date")
    }

    for record in all_records:
        if (str(record.employee_id) == str(key_fields["employee_id"]) and
            abs(record.amount - float(key_fields["amount"])) < 0.01 and
            record.expense_date[:10] == str(key_fields["expense_date"])[:10]):
            if trip_id and not record.shared_trip_id:
                record.shared_trip_id = trip_id
            return record

    return ReimbursementRecord(
        record_id=generate_record_id(),
        employee_id=str(data.get("employee_id", "UNKNOWN")),
        employee_name=str(data.get("employee_name", "未知")),
        expense_type=str(data.get("expense_type", "其他")),
        amount=float(data.get("amount", 0)),
        currency=str(data.get("currency", "CNY")),
        expense_date=str(data.get("expense_date", datetime.now().strftime('%Y-%m-%d'))),
        status=RecordStatus.PENDING,
        shared_trip_id=trip_id
    )


def _auto_link_trip_id(storage, record, data):
    if record.shared_trip_id:
        return
    
    all_records = storage.load_all_records()
    expense_date = str(data.get("expense_date", ""))[:10]
    employee_id = str(data.get("employee_id", ""))
    
    for r in all_records:
        if (r.shared_trip_id and 
            str(r.employee_id) == employee_id and
            r.status not in [RecordStatus.WITHDRAWN, RecordStatus.REJECTED]):
            trip_start = None
            trip_end = None
            for src_type, evidence in r.evidences.items():
                parsed = evidence.parsed_value
                if isinstance(parsed, dict):
                    trip_start = parsed.get("start_date") or parsed.get("start_date")
                    trip_end = parsed.get("end_date") or parsed.get("end_date")
            
            if trip_start and trip_end:
                from datetime import datetime as dt
                try:
                    start_dt = dt.strptime(str(trip_start)[:10], "%Y-%m-%d")
                    end_dt = dt.strptime(str(trip_end)[:10], "%Y-%m-%d")
                    expense_dt = dt.strptime(expense_date, "%Y-%m-%d")
                    if start_dt <= expense_dt <= end_dt:
                        record.shared_trip_id = r.shared_trip_id
                        return
                except (ValueError, TypeError):
                    pass


@cli.command()
@click.option('--record-id', help='只检查指定记录ID')
@click.option('--operator', default='cli_user', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='检查后创建快照')
@click.pass_context
def check(ctx, record_id, operator, snapshot):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    if record_id:
        result = engine.check_single_record(record_id)
        if "error" in result:
            click.echo(f"✗ {result['error']}")
            sys.exit(1)
        click.echo(f"✓ 记录 {record_id} 检查完成")
        click.echo(f"  新增问题: {result['new_issues']} 个")
    else:
        result = engine.check_all_records()
        click.echo(f"\n✓ 稽核检查完成")
        click.echo(f"  检查记录数: {result['checked_count']}")
        click.echo(f"  标记异常: {result['flagged_count']} 条")
        click.echo(f"  发现问题: {len(result['issues_found'])} 个")

        if result['duplicate_groups']:
            click.echo(f"\n  重复提交组: {len(result['duplicate_groups'])} 组")
        if result['withdrawn_resubmitted']:
            click.echo(f"  撤回重提交: {len(result['withdrawn_resubmitted'])} 条")

    if snapshot:
        snap_id = storage.create_snapshot("After audit check", operator)
        click.echo(f"\n✓ 已创建快照: {snap_id}")


@cli.command()
@click.argument('record_id')
@click.option('--issue-index', type=int, help='指定问题序号（从0开始），不指定则标记所有问题')
@click.option('--resolution', required=True, help='修复说明')
@click.option('--operator', default='cli_user', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='修复后创建快照')
@click.pass_context
def fix(ctx, record_id, issue_index, resolution, operator, snapshot):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    record = storage.load_record(record_id)
    if not record:
        click.echo(f"✗ 记录 {record_id} 不存在")
        sys.exit(1)

    if issue_index is not None:
        if engine.mark_issue_resolved(record_id, issue_index, operator, resolution):
            click.echo(f"✓ 问题 {issue_index} 已标记为已解决")
        else:
            click.echo(f"✗ 问题索引无效或记录已冻结")
            sys.exit(1)
    else:
        for i in range(len(record.issues)):
            engine.mark_issue_resolved(record_id, i, operator, resolution)
        click.echo(f"✓ 所有问题已标记为已解决")

    if snapshot:
        snap_id = storage.create_snapshot(f"After fix: {record_id}", operator)
        click.echo(f"✓ 已创建快照: {snap_id}")


@cli.command()
@click.argument('record_id')
@click.option('--reason', required=True, help='改判原因')
@click.option('--status', type=click.Choice(['approved', 'rejected', 'fixed']), default='approved',
              help='改判后的状态')
@click.option('--operator', default='manager', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='改判后创建快照')
@click.pass_context
def override(ctx, record_id, reason, status, operator, snapshot):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    new_status = RecordStatus(status)
    if engine.apply_manual_override(record_id, operator, reason, new_status):
        click.echo(f"✓ 记录 {record_id} 已人工改判为 {status}")
        click.echo(f"  原因: {reason}")
    else:
        click.echo(f"✗ 改判失败：记录不存在或已冻结")
        sys.exit(1)

    if snapshot:
        snap_id = storage.create_snapshot(f"After override: {record_id}", operator)
        click.echo(f"✓ 已创建快照: {snap_id}")


@cli.command()
@click.argument('record_id')
@click.option('--reason', required=True, help='冻结原因')
@click.option('--operator', default='manager', help='操作人')
@click.pass_context
def freeze(ctx, record_id, reason, operator):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    if engine.freeze_record(record_id, operator, reason):
        click.echo(f"✓ 记录 {record_id} 已冻结")
        click.echo(f"  原因: {reason}")
    else:
        click.echo(f"✗ 冻结失败：记录不存在")
        sys.exit(1)


@cli.command()
@click.argument('record_id')
@click.option('--operator', default='manager', help='操作人')
@click.pass_context
def unfreeze(ctx, record_id, operator):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    if engine.unfreeze_record(record_id, operator):
        click.echo(f"✓ 记录 {record_id} 已解冻")
    else:
        click.echo(f"✗ 解冻失败：记录不存在")
        sys.exit(1)


@cli.command()
@click.argument('record_id')
@click.option('--reason', required=True, help='撤回原因')
@click.option('--operator', default='employee', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='撤回后创建快照')
@click.pass_context
def withdraw(ctx, record_id, reason, operator, snapshot):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    record = storage.load_record(record_id)
    if not record:
        click.echo(f"✗ 记录 {record_id} 不存在")
        sys.exit(1)

    if record.is_frozen:
        click.echo(f"✗ 记录已冻结，无法撤回")
        sys.exit(1)

    record.update_status(RecordStatus.WITHDRAWN, operator, reason)
    storage.save_record(record)
    click.echo(f"✓ 记录 {record_id} 已撤回")
    click.echo(f"  原因: {reason}")

    if snapshot:
        snap_id = storage.create_snapshot(f"After withdraw: {record_id}", operator)
        click.echo(f"✓ 已创建快照: {snap_id}")


@cli.command()
@click.argument('file_path')
@click.option('--parent-record-id', required=True, help='原撤回记录ID')
@click.option('--operator', default='employee', help='操作人')
@click.option('--snapshot/--no-snapshot', default=True, help='提交后创建快照')
@click.pass_context
def resubmit(ctx, file_path, parent_record_id, operator, snapshot):
    storage = ctx.obj['storage']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    parent_record = storage.load_record(parent_record_id)
    if not parent_record:
        click.echo(f"✗ 原记录 {parent_record_id} 不存在")
        sys.exit(1)

    if parent_record.status != RecordStatus.WITHDRAWN:
        click.echo(f"✗ 原记录状态为 {parent_record.status.value}，只有 withdrawn 状态才能重新提交")
        sys.exit(1)

    from finance_audit.importers import get_importer
    importer = get_importer(SourceType.INVOICE_PDF)
    records_data, errors = importer.parse(file_path)

    if errors:
        click.echo(f"✗ 解析错误 ({len(errors)} 条):")
        for err in errors[:5]:
            click.echo(f"  行 {err['line']}: {err['error']}")
        sys.exit(1)

    if not records_data:
        click.echo(f"✗ 未解析到有效记录")
        sys.exit(1)

    new_data = records_data[0]
    new_record = ReimbursementRecord(
        record_id=generate_record_id(),
        employee_id=parent_record.employee_id,
        employee_name=parent_record.employee_name,
        expense_type=str(new_data.get("expense_type", parent_record.expense_type)),
        amount=float(new_data.get("amount", parent_record.amount)),
        expense_date=str(new_data.get("expense_date", parent_record.expense_date)),
        currency=str(new_data.get("currency", parent_record.currency)),
        status=RecordStatus.PENDING,
        parent_record_id=parent_record_id
    )

    evidence = SourceEvidence(
        source_type=SourceType.INVOICE_PDF,
        source_file=Path(file_path).name,
        original_line=new_data.get("original_line", 1),
        raw_value=new_data.get("raw_value", ""),
        parsed_value=new_data
    )
    new_record.add_evidence(evidence)
    new_record.update_status(RecordStatus.IMPORTED, operator, f"Resubmitted after withdraw of {parent_record_id}")
    storage.save_record(new_record)

    click.echo(f"✓ 重新提交成功")
    click.echo(f"  新记录ID: {new_record.record_id}")
    click.echo(f"  原记录ID: {parent_record_id}")

    if snapshot:
        snap_id = storage.create_snapshot(f"After resubmit: {new_record.record_id}", operator)
        click.echo(f"✓ 已创建快照: {snap_id}")


@cli.command()
@click.option('--format', type=click.Choice(['table', 'json', 'brief']), default='table', help='报告格式')
@click.option('--show-failures/--no-failures', default=True, help='显示失败清单')
@click.option('--show-evidence/--no-evidence', default=False, help='显示原始证据行号')
@click.pass_context
def report(ctx, format, show_failures, show_evidence):
    storage = ctx.obj['storage']
    engine = ctx.obj['engine']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    records = storage.load_all_records()
    failures = engine.get_failure_list()

    summary = {
        "total_records": len(records),
        "by_status": {},
        "total_failures": failures["total_failures"],
        "by_severity": failures["by_severity"],
        "frozen_count": sum(1 for r in records if r.is_frozen),
        "manual_override_count": sum(1 for r in records if r.manual_override)
    }

    for r in records:
        status = r.status.value
        summary["by_status"][status] = summary["by_status"].get(status, 0) + 1

    if format == 'json':
        output = {
            "summary": summary,
            "failures": failures["failures"] if show_failures else []
        }
        click.echo(json.dumps(output, indent=2, ensure_ascii=False))
    elif format == 'brief':
        click.echo("\n=== 稽核报告摘要 ===")
        click.echo(f"总记录数: {summary['total_records']}")
        click.echo(f"异常记录: {summary['total_failures']}")
        click.echo(f"已冻结: {summary['frozen_count']}")
        click.echo(f"人工改判: {summary['manual_override_count']}")
    else:
        click.echo("\n" + "=" * 60)
        click.echo("财务报销稽核报告")
        click.echo("=" * 60)

        click.echo("\n【汇总统计】")
        click.echo(f"  总记录数: {summary['total_records']}")
        click.echo(f"  异常记录: {summary['total_failures']} (高: {summary['by_severity']['high']}, 中: {summary['by_severity']['medium']}, 低: {summary['by_severity']['low']})")
        click.echo(f"  已冻结: {summary['frozen_count']}")
        click.echo(f"  人工改判: {summary['manual_override_count']}")

        click.echo("\n【状态分布】")
        for status, count in summary["by_status"].items():
            click.echo(f"  {status}: {count}")

        if show_failures and failures["failures"]:
            click.echo("\n【失败清单】")
            table_data = []
            for f in failures["failures"]:
                issues_desc = "; ".join([f"{i['type']}({i['severity']})" for i in f["issues"]])
                original_lines = ""
                if show_evidence:
                    lines = []
                    for src_type, line in f["issues"][0]["original_lines"].items() if f["issues"] else []:
                        lines.append(f"{src_type}:行{line}")
                    original_lines = " | ".join(lines)
                table_data.append([
                    f["record_id"],
                    f["employee_name"],
                    f["expense_type"],
                    f"{f['amount']:.2f}",
                    f["expense_date"],
                    issues_desc,
                    "是" if f["is_frozen"] else "否",
                    original_lines
                ])

            headers = ["记录ID", "员工", "类型", "金额", "日期", "问题", "冻结", "原始行号"]
            if not show_evidence:
                headers.pop()
                for row in table_data:
                    row.pop()
            click.echo(tabulate(table_data, headers=headers, tablefmt="simple"))


@cli.command()
@click.argument('record_id', required=False)
@click.option('--snap1', help='第一个快照ID')
@click.option('--snap2', help='第二个快照ID')
@click.option('--list-snapshots', is_flag=True, help='列出所有快照')
@click.pass_context
def history(ctx, record_id, snap1, snap2, list_snapshots):
    storage = ctx.obj['storage']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    if list_snapshots:
        snapshots = storage.list_snapshots()
        if not snapshots:
            click.echo("暂无快照")
            return
        click.echo("\n快照列表:")
        for snap in snapshots:
            click.echo(f"  {snap['snapshot_id']} - {snap['description']} ({snap['operator']} at {snap['created_at']})")
        return

    if snap1 and snap2:
        diff = storage.compare_snapshots(snap1, snap2)
        click.echo(f"\n快照对比: {snap1} vs {snap2}")
        click.echo(f"  新增: {diff['summary']['added_count']} 条")
        click.echo(f"  删除: {diff['summary']['removed_count']} 条")
        click.echo(f"  修改: {diff['summary']['modified_count']} 条")

        if diff['added']:
            click.echo(f"\n  新增记录: {', '.join(diff['added'])}")
        if diff['removed']:
            click.echo(f"  删除记录: {', '.join(diff['removed'])}")
        if diff['modified']:
            click.echo("\n  修改记录:")
            for m in diff['modified']:
                click.echo(f"    {m['record_id']}:")
                for c in m['changes']:
                    click.echo(f"      {c['field']}: {c['old_value']} -> {c['new_value']}")
        return

    if record_id:
        history = storage.get_record_history(record_id)
        if not history:
            click.echo(f"✗ 记录 {record_id} 不存在")
            sys.exit(1)

        click.echo(f"\n记录 {record_id} 历史:")
        click.echo(f"  当前状态: {history['current_status']}")
        click.echo(f"\n  审计日志:")
        for log in history['audit_log']:
            click.echo(f"    [{log['timestamp']}] {log['action']}: {log['previous_status']} -> {log['new_status']} ({log['operator']})")
            if log.get('comment'):
                click.echo(f"      备注: {log['comment']}")

        if history['snapshot_versions']:
            click.echo(f"\n  快照版本:")
            for v in history['snapshot_versions']:
                click.echo(f"    {v['snapshot_id']} - {v['snapshot_description']}")
    else:
        records = storage.load_all_records()
        click.echo(f"\n共 {len(records)} 条记录:")
        for r in records:
            click.echo(f"  {r.record_id} | {r.employee_name} | {r.expense_type} | {r.amount:.2f} | {r.status.value} | {'冻结' if r.is_frozen else ''}")


@cli.command()
@click.option('--record-ids', help='要导出的记录ID，逗号分隔')
@click.option('--status', type=click.Choice([s.value for s in RecordStatus]), help='按状态筛选导出')
@click.option('--format', type=click.Choice(['json', 'csv']), default='json', help='导出格式')
@click.option('--include-frozen/--exclude-frozen', default=False, help='是否包含冻结记录')
@click.option('--operator', default='exporter', help='操作人')
@click.option('--mark-exported/--no-mark', default=True, help='标记记录为已导出')
@click.pass_context
def export(ctx, record_ids, status, format, include_frozen, operator, mark_exported):
    storage = ctx.obj['storage']

    if not storage.is_initialized():
        click.echo("✗ 系统未初始化，请先运行 init 命令")
        sys.exit(1)

    records = storage.load_all_records()

    if record_ids:
        ids = [r.strip() for r in record_ids.split(',')]
        records = [r for r in records if r.record_id in ids]
    elif status:
        records = [r for r in records if r.status.value == status]

    if not include_frozen:
        frozen_count = sum(1 for r in records if r.is_frozen)
        if frozen_count > 0:
            click.echo(f"⚠  跳过 {frozen_count} 条已冻结记录")
        records = [r for r in records if not r.is_frozen]

    if not records:
        click.echo("✗ 没有符合条件的记录可导出")
        sys.exit(1)

    export_id, output_file = storage.export_records(
        [r.record_id for r in records],
        export_format=format
    )

    if mark_exported:
        storage.mark_exported([r.record_id for r in records], export_id, operator)

    click.echo(f"✓ 导出完成: {export_id}")
    click.echo(f"  导出记录: {len(records)} 条")
    click.echo(f"  输出文件: {output_file}")


if __name__ == '__main__':
    cli()
