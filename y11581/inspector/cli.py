import click
import json
import os
import functools
from datetime import datetime
from tabulate import tabulate
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from .database import (
    init_db, get_db, User, ImportBatch, RawRecord,
    RechargeRecord, RefundRecord, ShiftRecord, StoreHandover,
    MemberBalanceHistory, BalanceGap
)
from .permissions import (
    Role, has_permission, can_view_field, can_modify_field,
    filter_fields_by_role, get_role_config
)
from .importer import (
    import_recharge_data, import_refund_data,
    import_shift_data, import_handover_data
)
from .balance_tracker import (
    build_balance_history_from_records, detect_balance_gaps,
    check_cross_store_consistency, check_revoke_consistency
)
from .dirty_checker import DIRTY_TYPE_NAMES


class Context:
    def __init__(self):
        self.db = next(get_db())
        self.current_user = None
        self.current_role = None


pass_ctx = click.make_pass_decorator(Context, ensure=True)


def require_permission(action: str):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(ctx: Context, *args, **kwargs):
            if not ctx.current_role:
                click.echo("请使用 -u <用户名> 指定用户后再执行此命令")
                raise click.Abort()
            if not has_permission(ctx.current_role, action):
                role_config = get_role_config(ctx.current_role)
                click.echo(f"权限不足: 当前角色[{role_config['name']}]无权限执行此操作")
                raise click.Abort()
            return f(ctx, *args, **kwargs)
        return wrapper
    return decorator


@click.group(invoke_without_command=True)
@click.option("--user", "-u", help="用户名")
@pass_ctx
def cli(ctx: Context, user: str):
    """门店会员储值多源导入巡检工具 CLI"""
    if user:
        db_user = ctx.db.query(User).filter(User.username == user).first()
        if not db_user:
            click.echo(f"用户不存在: {user}")
            click.echo("请先使用 init 命令初始化系统并创建用户")
            raise click.Abort()
        ctx.current_user = db_user.username
        ctx.current_role = db_user.role
        role_config = get_role_config(db_user.role)
        click.echo(f"登录用户: {ctx.current_user} (角色: {role_config['name']})")


@click.command()
@click.option("--reset", is_flag=True, help="重置数据库")
def init(reset: bool):
    """初始化数据库和默认用户"""
    if reset and os.path.exists("inspector.db"):
        os.remove("inspector.db")

    init_db()
    click.echo("数据库初始化完成")

    db = next(get_db())

    default_users = [
        ("entry_clerk", Role.DATA_ENTRY.value, "录入员张三"),
        ("reviewer", Role.REVIEWER.value, "复核员李四"),
        ("supervisor", Role.SUPERVISOR.value, "财务主管王五"),
        ("viewer", Role.READ_ONLY.value, "只读用户赵六"),
    ]

    created = []
    for username, role, name in default_users:
        existing = db.query(User).filter(User.username == username).first()
        if not existing:
            db_user = User(username=username, role=role)
            db.add(db_user)
            created.append(f"{username}({role})")

    db.commit()
    if created:
        click.echo(f"创建默认用户: {', '.join(created)}")
    else:
        click.echo("用户已存在，跳过创建")

    click.echo("\n可用用户:")
    for u in db.query(User).all():
        role_config = get_role_config(u.role)
        click.echo(f"  -u {u.username}  # {role_config['name']}")


cli.add_command(init)


@cli.command("import")
@click.argument("source_type", type=click.Choice(["recharge", "refund", "shift", "handover"]))
@click.argument("filepath", type=click.Path(exists=True))
@pass_ctx
@require_permission("import_data")
def import_cmd(ctx: Context, source_type: str, filepath: str):
    """导入数据: recharge/refund/shift/handover"""
    click.echo(f"正在导入 {source_type} 数据: {filepath}")

    import_funcs = {
        "recharge": import_recharge_data,
        "refund": import_refund_data,
        "shift": import_shift_data,
        "handover": import_handover_data,
    }

    try:
        batch, valid, dirty = import_funcs[source_type](
            ctx.db, filepath, ctx.current_user, source_type
        )
        click.echo(f"导入批次 #{batch.id}: {batch.file_name}")
        click.echo(f"总计: {batch.total_rows}, 有效: {valid}, 脏记录: {dirty}")
    except Exception as e:
        click.echo(f"导入失败: {str(e)}")
        raise click.Abort()


@cli.command("list")
@click.option("--source-type", type=click.Choice(["recharge", "refund", "shift", "handover", "all"]), default="all")
@pass_ctx
@require_permission("view_list")
def list_batches(ctx: Context, source_type: str):
    """列出导入批次"""
    query = ctx.db.query(ImportBatch)
    if source_type != "all":
        query = query.filter(ImportBatch.source_type == source_type)

    batches = query.order_by(ImportBatch.created_at.desc()).all()

    if not batches:
        click.echo("暂无导入批次")
        return

    table_data = []
    for b in batches:
        table_data.append([
            b.id, b.source_type, b.file_name, b.imported_by,
            b.total_rows, b.valid_rows, b.dirty_rows,
            b.status, b.created_at.strftime("%Y-%m-%d %H:%M")
        ])

    headers = ["ID", "类型", "文件名", "导入人", "总计", "有效", "脏记录", "状态", "创建时间"]
    click.echo(tabulate(table_data, headers=headers, tablefmt="simple"))


@cli.command()
@click.argument("record_id", type=int, required=False)
@click.option("--batch-id", type=int, help="按批次筛选")
@click.option("--dirty-only", is_flag=True, help="仅显示脏记录")
@click.option("--source-type", type=click.Choice(["recharge", "refund", "shift", "handover"]))
@pass_ctx
@require_permission("view_raw")
def check(ctx: Context, record_id: int, batch_id: int, dirty_only: bool, source_type: str):
    """检查脏记录"""
    query = ctx.db.query(RawRecord)

    if record_id:
        record = query.filter(RawRecord.id == record_id).first()
        if not record:
            click.echo(f"记录不存在: {record_id}")
            return
        display_single_record(ctx, record)
        return

    if batch_id:
        query = query.filter(RawRecord.batch_id == batch_id)
    if source_type:
        query = query.filter(RawRecord.source_type == source_type)
    if dirty_only:
        query = query.filter(RawRecord.is_dirty == True)

    records = query.order_by(RawRecord.id).limit(100).all()

    if not records:
        click.echo("未找到匹配的记录")
        return

    table_data = []
    for r in records:
        dirty_name = DIRTY_TYPE_NAMES.get(r.dirty_type, "-") if r.is_dirty else "-"
        status = "已修正" if r.is_fixed else ("脏记录" if r.is_dirty else "正常")
        table_data.append([
            r.id, r.batch_id, r.source_type, r.original_row,
            status, dirty_name, r.fixed_at.strftime("%H:%M") if r.fixed_at else "-"
        ])

    headers = ["ID", "批次", "类型", "原始行号", "状态", "脏类型", "修正时间"]
    click.echo(tabulate(table_data, headers=headers, tablefmt="simple"))
    click.echo(f"\n显示 {len(records)} 条记录，使用 check <ID> 查看详情")


def display_single_record(ctx: Context, record: RawRecord):
    """显示单条记录详情"""
    click.echo(f"\n=== 记录 #{record.id} ===")
    click.echo(f"批次ID: {record.batch_id}")
    click.echo(f"数据类型: {record.source_type}")
    click.echo(f"原始行号: {record.original_row}")
    click.echo(f"是否脏记录: {'是' if record.is_dirty else '否'}")

    if record.is_dirty:
        dirty_name = DIRTY_TYPE_NAMES.get(record.dirty_type, record.dirty_type)
        click.echo(f"脏类型: {dirty_name}")
        click.echo(f"问题描述: {record.dirty_reason}")
        click.echo(f"修复建议: {record.fix_suggestion}")

    click.echo(f"\n原始数据:")
    try:
        raw_data = json.loads(record.raw_data)
        for k, v in raw_data.items():
            if can_view_field(ctx.current_role, "raw_records", k):
                click.echo(f"  {k}: {v}")
    except:
        click.echo(f"  {record.raw_data}")

    if record.is_fixed and record.fixed_data:
        click.echo(f"\n修正后数据:")
        try:
            fixed_data = json.loads(record.fixed_data)
            for k, v in fixed_data.items():
                click.echo(f"  {k}: {v}")
        except:
            click.echo(f"  {record.fixed_data}")
        click.echo(f"修正人: {record.fixed_by}")
        click.echo(f"修正时间: {record.fixed_at}")


@cli.command()
@click.argument("record_id", type=int)
@click.option("--field", "-f", multiple=True, help="要修正的字段: key=value")
@click.option("--data", "-d", help="JSON格式的修正数据")
@pass_ctx
@require_permission("apply_fix")
def fix(ctx: Context, record_id: int, field, data: str):
    """修正脏记录"""
    record = ctx.db.query(RawRecord).filter(RawRecord.id == record_id).first()
    if not record:
        click.echo(f"记录不存在: {record_id}")
        return

    if not record.is_dirty:
        click.echo("该记录不是脏记录，无需修正")
        return

    try:
        raw_data = json.loads(record.raw_data)
        fixed_data = raw_data.copy()
    except:
        fixed_data = {}

    if data:
        try:
            json_data = json.loads(data)
            fixed_data.update(json_data)
        except json.JSONDecodeError as e:
            click.echo(f"JSON格式错误: {e}")
            return

    for f in field:
        if "=" in f:
            k, v = f.split("=", 1)
            fixed_data[k] = v

    record.fixed_data = json.dumps(fixed_data, ensure_ascii=False)
    record.is_fixed = True
    record.is_dirty = False
    record.fixed_by = ctx.current_user
    record.fixed_at = datetime.utcnow()

    update_fixed_record(ctx.db, record)
    ctx.db.commit()

    click.echo(f"记录 #{record_id} 已修正")
    click.echo("修正后数据:")
    for k, v in fixed_data.items():
        click.echo(f"  {k}: {v}")


def update_fixed_record(db: Session, raw: RawRecord):
    """更新修正后的业务记录"""
    try:
        fixed_data = json.loads(raw.fixed_data)
    except:
        return

    if raw.source_type == "recharge":
        record = db.query(RechargeRecord).filter(
            RechargeRecord.batch_id == raw.batch_id,
            RechargeRecord.original_row == raw.original_row
        ).first()
        if record:
            record.member_id = str(fixed_data.get("member_id", record.member_id))
            record.member_name = str(fixed_data.get("member_name", record.member_name))
            record.recharge_amount = float(fixed_data.get("recharge_amount", record.recharge_amount) or 0)
            record.store_name = str(fixed_data.get("store_name", record.store_name))
            record.is_dirty = False
            record.dirty_type = None

    elif raw.source_type == "refund":
        record = db.query(RefundRecord).filter(
            RefundRecord.batch_id == raw.batch_id,
            RefundRecord.original_row == raw.original_row
        ).first()
        if record:
            record.member_id = str(fixed_data.get("member_id", record.member_id))
            record.member_name = str(fixed_data.get("member_name", record.member_name))
            record.refund_amount = float(fixed_data.get("refund_amount", record.refund_amount) or 0)
            record.is_dirty = False
            record.dirty_type = None

    elif raw.source_type == "shift":
        record = db.query(ShiftRecord).filter(
            ShiftRecord.batch_id == raw.batch_id,
            ShiftRecord.original_row == raw.original_row
        ).first()
        if record:
            record.is_dirty = False
            record.dirty_type = None

    elif raw.source_type == "handover":
        record = db.query(StoreHandover).filter(
            StoreHandover.batch_id == raw.batch_id,
            StoreHandover.original_row == raw.original_row
        ).first()
        if record:
            record.is_dirty = False
            record.dirty_type = None


@cli.command()
@click.option("--member-id", help="会员ID")
@click.option("--build", is_flag=True, help="重建余额历史")
@pass_ctx
@require_permission("view_history")
def history(ctx: Context, member_id: str, build: bool):
    """查看会员余额历史"""
    if build:
        click.echo("正在重建余额历史...")
        ctx.db.query(MemberBalanceHistory).delete()
        records = build_balance_history_from_records(ctx.db)
        for r in records:
            ctx.db.add(r)
        ctx.db.commit()
        click.echo(f"重建完成，共 {len(records)} 条余额记录")
        return

    if not member_id:
        click.echo("请指定 --member-id <会员ID> 或使用 --build 重建历史")
        return

    records = (
        ctx.db.query(MemberBalanceHistory)
        .filter(MemberBalanceHistory.member_id == member_id)
        .order_by(MemberBalanceHistory.transaction_time)
        .all()
    )

    if not records:
        click.echo(f"未找到会员 {member_id} 的余额历史")
        return

    table_data = []
    for r in records:
        tx_type = {
            "recharge": "充值",
            "refund": "退款",
            "consume": "消费",
            "revoke": "撤销",
            "cross_store_consume": "跨店消费",
            "manual_adjust": "手工调整",
        }.get(r.transaction_type, r.transaction_type)

        flags = []
        if r.is_cross_store:
            flags.append("跨店")
        if r.is_revoked:
            flags.append("撤销")

        table_data.append([
            r.id, tx_type, r.store_name,
            f"{r.amount:+.2f}", f"{r.balance_before:.2f}", f"{r.balance_after:.2f}",
            ",".join(flags) or "-",
            r.transaction_time.strftime("%Y-%m-%d %H:%M")
        ])

    headers = ["ID", "类型", "门店", "变动", "变动前", "变动后", "标记", "时间"]
    click.echo(tabulate(table_data, headers=headers, tablefmt="simple"))


@cli.command()
@click.option("--gaps", is_flag=True, help="检查余额断点")
@click.option("--cross-store", is_flag=True, help="检查跨店消费")
@click.option("--revoke", is_flag=True, help="检查撤销交易")
@pass_ctx
@require_permission("view_gaps")
def check_gaps(ctx: Context, gaps: bool, cross_store: bool, revoke: bool):
    """检查余额断点和异常交易"""
    if gaps:
        click.echo("=== 检查余额断点 ===")
        gap_records = detect_balance_gaps(ctx.db)
        if gap_records:
            click.echo(f"发现 {len(gap_records)} 个余额断点:")
            for g in gap_records:
                click.echo(f"  会员{g.member_id}: 预期{g.expected_balance:.2f}, 实际{g.actual_balance:.2f}, 差{g.difference:+.2f}")
                click.echo(f"    {g.notes}")
        else:
            click.echo("未发现余额断点")

    if cross_store:
        click.echo("\n=== 检查跨店消费 ===")
        issues = check_cross_store_consistency(ctx.db)
        if issues:
            click.echo(f"发现 {len(issues)} 个跨店消费问题:")
            for issue in issues:
                click.echo(f"  会员{issue['member_id']}: {issue['issue']}")
        else:
            click.echo("未发现跨店消费问题")

    if revoke:
        click.echo("\n=== 检查撤销交易 ===")
        issues = check_revoke_consistency(ctx.db)
        if issues:
            click.echo(f"发现 {len(issues)} 个撤销交易问题:")
            for issue in issues:
                click.echo(f"  会员{issue['member_id']}: {issue['issue']}")
        else:
            click.echo("未发现撤销交易问题")

    if not any([gaps, cross_store, revoke]):
        click.echo("请指定检查类型: --gaps, --cross-store, --revoke")


@cli.command()
@click.argument("report_type", type=click.Choice(["batch", "dirty", "failures", "summary"]), default="summary")
@click.option("--batch-id", type=int, help="指定批次ID")
@pass_ctx
def report(ctx: Context, report_type: str, batch_id: int):
    """生成巡检报告"""
    if not ctx.current_role:
        click.echo("请使用 -u <用户名> 指定用户后再执行此命令")
        raise click.Abort()

    permissions = {
        "summary": "view_summary",
        "batch": "view_report",
        "dirty": "view_report",
        "failures": "view_failures",
    }

    required_perm = permissions.get(report_type, "view_all")
    if not has_permission(ctx.current_role, required_perm):
        role_config = get_role_config(ctx.current_role)
        click.echo(f"权限不足: 当前角色[{role_config['name']}]无权限查看此报告")
        raise click.Abort()

    if report_type == "summary":
        generate_summary_report(ctx)
    elif report_type == "dirty":
        generate_dirty_report(ctx, batch_id)
    elif report_type == "failures":
        generate_failures_report(ctx, batch_id)
    elif report_type == "batch":
        generate_batch_report(ctx, batch_id)


def generate_summary_report(ctx: Context):
    """生成汇总报告"""
    click.echo("\n" + "=" * 60)
    click.echo("门店会员储值多源导入巡检 - 汇总报告")
    click.echo("=" * 60)

    total_batches = ctx.db.query(ImportBatch).count()
    total_records = ctx.db.query(RawRecord).count()
    dirty_records = ctx.db.query(RawRecord).filter(RawRecord.is_dirty == True).count()
    fixed_records = ctx.db.query(RawRecord).filter(RawRecord.is_fixed == True).count()
    pending_fix = dirty_records

    click.echo(f"\n导入批次总数: {total_batches}")
    click.echo(f"记录总数: {total_records}")
    click.echo(f"脏记录累计: {dirty_records + fixed_records}")
    click.echo(f"  - 已修正: {fixed_records}")
    click.echo(f"  - 待处理: {pending_fix}")

    by_source = ctx.db.query(
        RawRecord.source_type,
        func.count(RawRecord.id),
        func.sum(case((RawRecord.is_dirty == True, 1), else_=0))
    ).group_by(RawRecord.source_type).all()

    click.echo("\n按数据类型统计:")
    for source_type, total, dirty in by_source:
        click.echo(f"  {source_type}: 总计{total}, 脏记录{dirty}")

    gaps = ctx.db.query(BalanceGap).count()
    click.echo(f"\n余额断点: {gaps} 个")
    click.echo("=" * 60)


def generate_failures_report(ctx: Context, batch_id: int):
    """生成失败清单报告 - 财务主管关注"""
    click.echo("\n" + "=" * 60)
    click.echo("门店会员储值多源导入巡检 - 失败清单")
    click.echo("=" * 60)

    query = ctx.db.query(RawRecord).filter(RawRecord.is_dirty == True)
    if batch_id:
        query = query.filter(RawRecord.batch_id == batch_id)

    failures = query.order_by(RawRecord.batch_id, RawRecord.original_row).all()

    if not failures:
        click.echo("\n没有失败记录")
        return

    click.echo(f"\n共 {len(failures)} 条失败记录:\n")

    table_data = []
    for f in failures:
        dirty_name = DIRTY_TYPE_NAMES.get(f.dirty_type, f.dirty_type)
        status = "已修正" if f.is_fixed else "待处理"
        table_data.append([
            f.batch_id, f.original_row, f.source_type,
            dirty_name, f.dirty_reason[:40], status
        ])

    headers = ["批次ID", "原始行号", "数据类型", "脏类型", "问题简述", "状态"]
    click.echo(tabulate(table_data, headers=headers, tablefmt="grid"))

    click.echo("\n* 注: 原始行号保留以方便追溯数据源文件")
    click.echo("=" * 60)


def generate_dirty_report(ctx: Context, batch_id: int):
    """生成脏记录报告"""
    click.echo("\n" + "=" * 60)
    click.echo("门店会员储值多源导入巡检 - 脏记录详情")
    click.echo("=" * 60)

    query = ctx.db.query(
        RawRecord.dirty_type,
        func.count(RawRecord.id)
    ).filter(RawRecord.is_dirty == True)

    if batch_id:
        query = query.filter(RawRecord.batch_id == batch_id)

    by_type = query.group_by(RawRecord.dirty_type).all()

    click.echo("\n按脏类型统计:")
    for dirty_type, count in by_type:
        name = DIRTY_TYPE_NAMES.get(dirty_type, dirty_type)
        click.echo(f"  {name}: {count} 条")

    click.echo("=" * 60)


def generate_batch_report(ctx: Context, batch_id: int):
    """生成批次报告"""
    if not batch_id:
        click.echo("请使用 --batch-id 指定批次")
        return

    batch = ctx.db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        click.echo(f"批次不存在: {batch_id}")
        return

    click.echo("\n" + "=" * 60)
    click.echo(f"批次 #{batch.id} 详细报告")
    click.echo("=" * 60)
    click.echo(f"数据类型: {batch.source_type}")
    click.echo(f"文件名称: {batch.file_name}")
    click.echo(f"导入用户: {batch.imported_by}")
    click.echo(f"导入时间: {batch.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo(f"记录总数: {batch.total_rows}")
    click.echo(f"有效记录: {batch.valid_rows}")
    click.echo(f"原始脏记录数: {batch.dirty_rows}")

    current_dirty = ctx.db.query(RawRecord).filter(
        RawRecord.batch_id == batch_id,
        RawRecord.is_dirty == True
    ).count()
    current_fixed = ctx.db.query(RawRecord).filter(
        RawRecord.batch_id == batch_id,
        RawRecord.is_fixed == True
    ).count()
    click.echo(f"当前脏记录数: {current_dirty}")
    click.echo(f"已修正: {current_fixed}")

    dirty_records = ctx.db.query(RawRecord).filter(
        RawRecord.batch_id == batch_id,
        RawRecord.is_dirty == True
    ).all()

    if dirty_records:
        click.echo(f"\n脏记录清单:")
        for r in dirty_records:
            dirty_name = DIRTY_TYPE_NAMES.get(r.dirty_type, r.dirty_type)
            status = "已修正" if r.is_fixed else "待处理"
            click.echo(f"  [行{r.original_row}] {dirty_name}: {r.dirty_reason} ({status})")

    click.echo("=" * 60)


@cli.command()
@click.argument("export_type", type=click.Choice(["failures", "fixed", "balance", "all"]))
@click.option("--output", "-o", default="export", help="输出目录")
@click.option("--format", "-f", "fmt", type=click.Choice(["csv", "json", "xlsx"]), default="csv")
@pass_ctx
@require_permission("export_data")
def export(ctx: Context, export_type: str, output: str, fmt: str):
    """导出数据"""
    import pandas as pd

    os.makedirs(output, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if export_type in ["failures", "all"]:
        failures = ctx.db.query(RawRecord).filter(RawRecord.is_dirty == True).all()
        if failures:
            data = []
            for f in failures:
                try:
                    raw = json.loads(f.raw_data)
                except:
                    raw = {}
                data.append({
                    "批次ID": f.batch_id,
                    "原始行号": f.original_row,
                    "数据类型": f.source_type,
                    "脏类型": DIRTY_TYPE_NAMES.get(f.dirty_type, f.dirty_type),
                    "问题描述": f.dirty_reason,
                    "修复建议": f.fix_suggestion,
                    "是否已修正": "是" if f.is_fixed else "否",
                    "原始数据": f.raw_data,
                })
            df = pd.DataFrame(data)
            path = f"{output}/failures_{timestamp}.{fmt}"
            if fmt == "csv":
                df.to_csv(path, index=False, encoding="utf-8-sig")
            elif fmt == "xlsx":
                df.to_excel(path, index=False)
            else:
                df.to_json(path, orient="records", force_ascii=False)
            click.echo(f"失败清单已导出: {path}")

    if export_type in ["fixed", "all"]:
        fixed = ctx.db.query(RawRecord).filter(RawRecord.is_fixed == True).all()
        if fixed:
            data = []
            for f in fixed:
                data.append({
                    "批次ID": f.batch_id,
                    "原始行号": f.original_row,
                    "数据类型": f.source_type,
                    "脏类型": DIRTY_TYPE_NAMES.get(f.dirty_type, f.dirty_type),
                    "原始数据": f.raw_data,
                    "修正后数据": f.fixed_data,
                    "修正人": f.fixed_by,
                    "修正时间": f.fixed_at.strftime("%Y-%m-%d %H:%M:%S") if f.fixed_at else "",
                })
            df = pd.DataFrame(data)
            path = f"{output}/fixed_{timestamp}.{fmt}"
            if fmt == "csv":
                df.to_csv(path, index=False, encoding="utf-8-sig")
            elif fmt == "xlsx":
                df.to_excel(path, index=False)
            else:
                df.to_json(path, orient="records", force_ascii=False)
            click.echo(f"修正记录已导出: {path}")

    if export_type in ["balance", "all"]:
        balance_records = ctx.db.query(MemberBalanceHistory).all()
        if balance_records:
            data = []
            for b in balance_records:
                data.append({
                    "会员ID": b.member_id,
                    "会员名称": b.member_name,
                    "门店ID": b.store_id,
                    "门店名称": b.store_name,
                    "交易类型": b.transaction_type,
                    "交易ID": b.transaction_id,
                    "变动金额": b.amount,
                    "变动前余额": b.balance_before,
                    "变动后余额": b.balance_after,
                    "交易时间": b.transaction_time.strftime("%Y-%m-%d %H:%M:%S") if b.transaction_time else "",
                    "是否跨店": "是" if b.is_cross_store else "否",
                    "是否撤销": "是" if b.is_revoked else "否",
                })
            df = pd.DataFrame(data)
            path = f"{output}/balance_{timestamp}.{fmt}"
            if fmt == "csv":
                df.to_csv(path, index=False, encoding="utf-8-sig")
            elif fmt == "xlsx":
                df.to_excel(path, index=False)
            else:
                df.to_json(path, orient="records", force_ascii=False)
            click.echo(f"余额历史已导出: {path}")

    click.echo(f"\n导出完成，输出目录: {output}/")


if __name__ == "__main__":
    cli()
