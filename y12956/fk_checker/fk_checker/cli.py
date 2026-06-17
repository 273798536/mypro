import os
import sys
import click
from tabulate import tabulate

from .db import Database, DBConfig
from .core import FKChecker
from .sample_data import get_sample_sql, SAMPLE_BROKEN_LINKS_DESC
from .backup_check import BackupChecker
from .gap_handler import GapHandler, GapStatus
from .report import ReportManager
from .index_suggest import IndexAnalyzer


DEFAULT_DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
}


def get_db_config(host, port, user, password, database):
    return DBConfig(
        host=host or os.environ.get("FK_DB_HOST", DEFAULT_DB_CONFIG["host"]),
        port=port or int(os.environ.get("FK_DB_PORT", DEFAULT_DB_CONFIG["port"])),
        user=user or os.environ.get("FK_DB_USER", DEFAULT_DB_CONFIG["user"]),
        password=password if password is not None else os.environ.get("FK_DB_PASSWORD", DEFAULT_DB_CONFIG["password"]),
        database=database or os.environ.get("FK_DB_DATABASE", ""),
    )


@click.group()
@click.option("--host", help="数据库主机地址", default=None)
@click.option("--port", help="数据库端口", type=int, default=None)
@click.option("--user", help="数据库用户名", default=None)
@click.option("--password", help="数据库密码", default=None)
@click.option("--database", "-d", help="数据库名", default=None)
@click.pass_context
def cli(ctx, host, port, user, password, database):
    """外键断链排查器 - 数据库外键完整性检测与分析工具

    日常排查命令示例：

    \b
      # 检查整个库的外键断链
      fk-checker -d mydb check

    \b
      # 只检查订单相关的几张表
      fk-checker -d mydb check --table orders,order_items

    \b
      # 检查完存一份快照，以后可以对比
      fk-checker -d mydb check --save-snapshot --notes "日常巡检"
    """
    ctx.ensure_object(dict)
    ctx.obj["db_config"] = get_db_config(host, port, user, password, database)


@cli.command()
@click.option("--table", "-t", "tables", help="只检查指定表，多个用逗号分隔", default=None)
@click.option("--save-snapshot", is_flag=True, help="保存检测快照，用于后续对比")
@click.option("--notes", help="快照备注", default="")
@click.option("--sample-limit", help="每个断链最多显示多少条样例ID", default=5, type=int)
@click.pass_context
def check(ctx, tables, save_snapshot, notes, sample_limit):
    """检查数据库中的外键断链

    示例：
      fk-checker -d fk_demo check
      fk-checker -d fk_demo check --table orders,order_items
      fk-checker -d fk_demo check --save-snapshot --notes "2024年Q1巡检"
    """
    db_cfg = ctx.obj["db_config"]
    schema = db_cfg.database
    if not schema:
        click.echo(click.style("错误: 请通过 -d 或环境变量 FK_DB_DATABASE 指定数据库名", fg="red"))
        sys.exit(1)

    db = Database(db_cfg)
    checker = FKChecker(db)

    table_list = [t.strip() for t in tables.split(",")] if tables else None

    click.echo(f"正在检查数据库 [{schema}] 的外键断链...")
    if table_list:
        click.echo(f"指定表: {', '.join(table_list)}")
    click.echo("")

    try:
        result = checker.run_full_check(schema, table_list)

        click.echo(click.style("=" * 70, fg="cyan"))
        click.echo(click.style(f"  外键断链检测结果 - {schema}", fg="cyan", bold=True))
        click.echo(click.style("=" * 70, fg="cyan"))
        click.echo("")

        click.echo(f"  外键总数: {result.fk_total}")
        click.echo(f"  已检查:   {result.fk_checked}")
        click.echo(f"  断链数:   {result.broken_count}")
        click.echo(f"  影响行数: {result.total_broken_rows}")
        click.echo("")

        if result.broken_count > 0:
            click.echo(click.style("  [断链明细]", fg="yellow", bold=True))
            click.echo("-" * 70)

            rows_data = []
            for i, bl in enumerate(result.broken_links, 1):
                samples = ", ".join(str(s) for s in bl.sample_ids[:sample_limit])
                rows_data.append([
                    i,
                    f"{bl.table_name}.{bl.column_name}",
                    bl.referenced_table,
                    bl.broken_count,
                    samples,
                ])

            headers = ["#", "外键列", "引用表", "断链数", "样例值"]
            click.echo(tabulate(rows_data, headers=headers, tablefmt="simple"))
            click.echo("")

            for i, bl in enumerate(result.broken_links, 1):
                click.echo(f"  [{i}] {bl.table_name} 表的 {bl.column_name} 列")
                click.echo(f"      引用: {bl.referenced_table}.{bl.referenced_column}")
                click.echo(f"      异常值示例: {bl.broken_value}（共 {bl.broken_count} 条）")
                if bl.sample_ids:
                    samples_str = ", ".join(str(s) for s in bl.sample_ids[:sample_limit])
                    click.echo(f"      样例主键: {samples_str}")
                click.echo("")
        else:
            click.echo(click.style("  ✓ 所有外键完好，未发现断链", fg="green", bold=True))
            click.echo("")

        if result.error_messages:
            click.echo(click.style(f"  检查过程中遇到 {len(result.error_messages)} 个错误:", fg="red"))
            for err in result.error_messages:
                click.echo(f"    - {err}")
            click.echo("")

        if save_snapshot:
            report_mgr = ReportManager()
            snapshot = report_mgr.create_snapshot(schema, result, notes)
            click.echo(click.style(f"  ✓ 已保存快照: {snapshot.snapshot_id}", fg="green"))
            click.echo(f"    可用以下命令进行对比:")
            click.echo(f"    fk-checker -d {schema} report diff {snapshot.snapshot_id} <新快照ID>")
            click.echo("")

    except Exception as e:
        click.echo(click.style(f"检测失败: {str(e)}", fg="red"))
        sys.exit(1)
    finally:
        db.close()


@cli.group()
def sample():
    """样例数据相关命令

    用内置的样例数据快速体验工具，包含真实场景的"坏数据"。
    """
    pass


@sample.command("init")
@click.option("--schema", default="fk_demo", help="样例数据库名，默认 fk_demo")
@click.option("--drop-if-exists", is_flag=True, help="如果数据库已存在则先删除")
@click.pass_context
def sample_init(ctx, schema, drop_if_exists):
    """初始化样例数据库（含真实坏数据）

    样例数据中故意混入了几类日常常见的"小麻烦"：
    - 商品引用不存在的分类
    - 订单引用已删除的用户
    - 订单项引用已删除的商品
    - 审计日志引用不存在的用户
    - 订单ID跳号（数据迁移常见问题）
    """
    db_cfg = ctx.obj["db_config"]
    db_cfg.database = ""
    db = Database(db_cfg)

    click.echo(f"正在初始化样例数据库 [{schema}]...")
    click.echo("")

    try:
        if drop_if_exists:
            db.execute(f"DROP DATABASE IF EXISTS `{schema}`")
            click.echo(f"  已删除旧数据库 {schema}")

        sql_script = get_sample_sql()

        statements = [s.strip() for s in sql_script.split(";") if s.strip()]
        for stmt in statements:
            if stmt.upper().startswith("USE "):
                db.execute(stmt)
            elif stmt.strip():
                try:
                    db.execute(stmt)
                except Exception as e:
                    pass

        db_cfg.database = schema
        db2 = Database(db_cfg)
        tables = db2.execute("SHOW TABLES")
        table_count = len(tables)
        table_names = [list(t.values())[0] for t in tables]

        click.echo(click.style("  ✓ 样例数据库初始化完成", fg="green", bold=True))
        click.echo(f"    数据库名: {schema}")
        click.echo(f"    表数量:   {table_count}")
        click.echo(f"    表列表:   {', '.join(table_names)}")
        click.echo("")
        click.echo(click.style("  样例数据包含的断链类型：", fg="yellow"))
        click.echo(SAMPLE_BROKEN_LINKS_DESC)
        click.echo("")
        click.echo("  快速体验命令：")
        click.echo(f"    fk-checker -d {schema} check")
        click.echo("")

    except Exception as e:
        click.echo(click.style(f"初始化失败: {str(e)}", fg="red"))
        sys.exit(1)
    finally:
        db.close()


@sample.command("describe")
def sample_describe():
    """显示样例数据说明（有哪些故意埋的坏数据）
    """
    click.echo(click.style("样例数据说明", fg="cyan", bold=True))
    click.echo("=" * 60)
    click.echo(SAMPLE_BROKEN_LINKS_DESC)


@cli.group()
def backup():
    """备份校验相关命令

    检查备份缺口、ID 跳号等数据完整性问题。
    """
    pass


@backup.command("check")
@click.option("--table", "-t", "tables", help="只检查指定表，多个用逗号分隔", default=None)
@click.option("--save-result", is_flag=True, help="保存检查结果，用于后续对比")
@click.option("--result-id", help="保存结果的标识名", default=None)
@click.pass_context
def backup_check(ctx, tables, save_result, result_id):
    """检查备份缺口（ID 跳号、数据缺失等）

    示例：
      fk-checker -d fk_demo backup check
      fk-checker -d fk_demo backup check -t orders,products
      fk-checker -d fk_demo backup check --save-result --result-id before_fix
    """
    db_cfg = ctx.obj["db_config"]
    schema = db_cfg.database
    if not schema:
        click.echo(click.style("错误: 请指定数据库名", fg="red"))
        sys.exit(1)

    db = Database(db_cfg)
    checker = BackupChecker(db)

    table_list = [t.strip() for t in tables.split(",")] if tables else None
    if not table_list:
        rows = db.execute("SHOW TABLES")
        table_list = [list(r.values())[0] for r in rows]

    click.echo(f"正在检查 [{schema}] 的备份缺口...")
    click.echo(f"检查表数量: {len(table_list)}")
    click.echo("")

    fk_checker = FKChecker(db)
    fks = fk_checker.discover_foreign_keys(schema)

    result = checker.run_backup_check(schema, table_list, fks)

    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo(click.style(f"  备份缺口检查结果 - {schema}", fg="cyan", bold=True))
    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo("")
    click.echo(f"  总结: {result.summary}")
    click.echo(f"  检查时间: {result.check_time}")
    click.echo("")

    if result.gaps:
        click.echo(click.style("  [缺口明细]", fg="yellow", bold=True))
        click.echo("-" * 70)

        rows_data = []
        for i, g in enumerate(result.gaps, 1):
            severity_colors = {"high": "red", "medium": "yellow", "low": "cyan"}
            color = severity_colors.get(g.severity, "white")
            rows_data.append([
                i,
                g.table_name,
                g.gap_type,
                click.style(g.severity.upper(), fg=color),
                g.gap_size,
                g.description[:50] + "..." if len(g.description) > 50 else g.description,
            ])

        headers = ["#", "表名", "类型", "严重度", "缺口数", "说明"]
        click.echo(tabulate(rows_data, headers=headers, tablefmt="simple"))
        click.echo("")

        for i, g in enumerate(result.gaps, 1):
            click.echo(f"  [{i}] {g.table_name} - {g.gap_type} ({g.severity.upper()})")
            click.echo(f"      {g.description}")
            if g.sample_ids:
                samples = ", ".join(str(s) for s in g.sample_ids[:5])
                click.echo(f"      样例ID: {samples}")
            click.echo("")

    if save_result:
        import os
        os.makedirs("./backup_results", exist_ok=True)
        rid = result_id or f"backup_check_{schema}_{result.check_time.replace(':', '-')}"
        filepath = f"./backup_results/{rid}.json"
        checker.save_result(result, filepath)
        click.echo(click.style(f"  ✓ 结果已保存: {filepath}", fg="green"))
        click.echo(f"    对比命令: fk-checker -d {schema} backup diff {rid} <新结果ID>")
        click.echo("")

    db.close()


@backup.command("diff")
@click.argument("old_result")
@click.argument("new_result")
@click.pass_context
def backup_diff(ctx, old_result, new_result):
    """对比两次备份检查的结果，看有什么变化

    示例：
      fk-checker -d fk_demo backup diff before_fix after_fix
    """
    checker = BackupChecker(None)

    old_path = f"./backup_results/{old_result}.json"
    new_path = f"./backup_results/{new_result}.json"

    if not os.path.exists(old_path):
        click.echo(click.style(f"错误: 旧结果文件不存在: {old_path}", fg="red"))
        sys.exit(1)
    if not os.path.exists(new_path):
        click.echo(click.style(f"错误: 新结果文件不存在: {new_path}", fg="red"))
        sys.exit(1)

    old = checker.load_result(old_path)
    new = checker.load_result(new_path)

    diff = checker.compare_results(old, new)

    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo(click.style("  备份缺口对比结果", fg="cyan", bold=True))
    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo("")
    click.echo(f"  旧结果: {old_result}  ({old.check_time})")
    click.echo(f"  新结果: {new_result}  ({new.check_time})")
    click.echo("")
    click.echo(f"  旧缺口总数: {diff['old_total']}  →  新缺口总数: {diff['new_total']}")
    click.echo(f"  新增: {len(diff['added'])}  |  解决: {len(diff['removed'])}  |  变化: {len(diff['changed'])}")
    click.echo("")

    if diff["added"]:
        click.echo(click.style("  [新增缺口]", fg="red", bold=True))
        for g in diff["added"]:
            click.echo(f"    - {g.table_name} ({g.gap_type}): {g.description}")
        click.echo("")

    if diff["removed"]:
        click.echo(click.style("  [已解决缺口]", fg="green", bold=True))
        for g in diff["removed"]:
            click.echo(f"    - {g.table_name} ({g.gap_type}): {g.description}")
        click.echo("")

    if diff["changed"]:
        click.echo(click.style("  [数量变化的缺口]", fg="yellow", bold=True))
        for c in diff["changed"]:
            change = c["diff"]
            arrow = "↑" if change > 0 else "↓"
            color = "red" if change > 0 else "green"
            click.echo(f"    - {c['table_name']} ({c['gap_type']}): "
                       f"{c['old_size']} → {c['new_size']} "
                       f"({click.style(f'{arrow}{abs(change)}', fg=color)})")
        click.echo("")

    click.echo(f"  旧总结: {diff['old_summary']}")
    click.echo(f"  新总结: {diff['new_summary']}")
    click.echo("")


@cli.group()
def gap():
    """备份缺口处理（三部曲：复检 → 补录 → 人工确认）

    发现备份缺口后，按三步处理：
      1. recheck  重复运行，确认不是偶发问题
      2. supplement 补录信息，记录调查过程
      3. confirm  人工确认，最终结论
    """
    pass


@gap.command("list")
@click.option("--status", help="按状态过滤: open/rechecking/supplemented/confirmed/resolved/dismissed", default=None)
def gap_list(status):
    """列出所有缺口记录

    示例：
      fk-checker gap list
      fk-checker gap list --status open
      fk-checker gap list --status confirmed
    """
    handler = GapHandler()
    status_enum = GapStatus(status) if status else None
    records = handler.list_gaps(status_enum)

    if not records:
        click.echo("暂无缺口记录")
        return

    click.echo(click.style(f"共 {len(records)} 条缺口记录", fg="cyan", bold=True))
    click.echo("")

    rows_data = []
    for r in records:
        status_colors = {
            "open": "red",
            "rechecking": "yellow",
            "supplemented": "cyan",
            "confirmed": "green",
            "resolved": "green",
            "dismissed": "white",
        }
        color = status_colors.get(r.status.value, "white")
        rows_data.append([
            r.id[:30] + "..." if len(r.id) > 30 else r.id,
            r.table_name,
            r.gap_type,
            click.style(r.status.value, fg=color),
            r.gap_size,
            r.recheck_count,
            r.first_detected[:19],
        ])

    headers = ["记录ID", "表名", "类型", "状态", "缺口数", "复检次数", "首次发现"]
    click.echo(tabulate(rows_data, headers=headers, tablefmt="simple"))
    click.echo("")


@gap.command("create")
@click.option("--table", required=True, help="表名")
@click.option("--gap-type", "gap_type", required=True, help="缺口类型: id_gap/broken_fk/other")
@click.option("--desc", "description", required=True, help="缺口描述")
@click.option("--size", type=int, required=True, help="缺口数量")
@click.option("--severity", type=click.Choice(["low", "medium", "high"]), default="medium", help="严重度")
def gap_create(table, gap_type, description, size, severity):
    """手动创建一条缺口记录

    示例：
      fk-checker gap create --table orders --gap-type id_gap \\
          --desc "订单ID跳号" --size 5 --severity high
    """
    handler = GapHandler()
    record = handler.create_gap(table, gap_type, description, size, severity)
    click.echo(click.style(f"✓ 已创建缺口记录: {record.id}", fg="green"))
    click.echo(f"  表名: {record.table_name}")
    click.echo(f"  类型: {record.gap_type}")
    click.echo(f"  描述: {record.description}")
    click.echo(f"  缺口数: {record.gap_size}")
    click.echo(f"  严重度: {record.severity}")
    click.echo("")
    click.echo("  接下来可以执行的三步处理：")
    click.echo(f"    1. fk-checker gap recheck {record.id} --new-size 3")
    click.echo(f"    2. fk-checker gap supplement {record.id} --note \"已核对迁移日志\"")
    click.echo(f"    3. fk-checker gap confirm {record.id} --note \"确认是迁移时丢失\" --by dba")
    click.echo("")
    click.echo("  或者一键执行三部曲：")
    click.echo(f"    fk-checker gap trilogy {record.id} --new-size 3 \\")
    click.echo(f"        --supplement \"已核对迁移日志\" --confirm \"确认是迁移时丢失\"")
    click.echo("")


@gap.command("recheck")
@click.argument("record_id")
@click.option("--new-size", type=int, required=True, help="复检后的缺口数量")
@click.option("--note", help="复检备注", default="")
def gap_recheck(record_id, new_size, note):
    """第一步：复检，重复运行确认缺口是否还在

    示例：
      fk-checker gap recheck orders_id_gap_1234567890 --new-size 3
      fk-checker gap recheck orders_id_gap_1234567890 --new-size 0 --note "数据补回来了"
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    result = handler.recheck(record, new_size, note)

    click.echo(click.style("✓ 复检完成", fg="green", bold=True))
    click.echo(f"  记录ID: {record_id}")
    click.echo(f"  原缺口数: {result['old_gap_size']} → 新缺口数: {result['new_gap_size']}")
    click.echo(f"  状态: {result['status_before']} → {result['status_after']}")
    click.echo(f"  已复检 {result['recheck_count']} 次")

    if result.get("auto_resolved"):
        click.echo(click.style("  ✓ 缺口为0，已自动标记为已解决", fg="green"))
    click.echo("")
    if not result.get("auto_resolved"):
        click.echo("  下一步: fk-checker gap supplement <记录ID> --note \"补录说明\"")
    click.echo("")


@gap.command("supplement")
@click.argument("record_id")
@click.option("--note", required=True, help="补录的调查说明")
def gap_supplement(record_id, note):
    """第二步：补录，记录调查过程和发现

    示例：
      fk-checker gap supplement orders_id_gap_1234567890 \\
          --note "核对迁移日志，确认是2023-06-15那次迁移丢了3条订单"
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    result = handler.supplement(record, note)

    click.echo(click.style("✓ 补录完成", fg="green", bold=True))
    click.echo(f"  记录ID: {record_id}")
    click.echo(f"  状态: {result['status_before']} → {result['status_after']}")
    click.echo(f"  补录内容: {note}")
    click.echo(f"  已补录 {result['supplement_count']} 次")
    click.echo("")
    click.echo("  下一步: fk-checker gap confirm <记录ID> --note \"最终结论\" --by dba")
    click.echo("")


@gap.command("confirm")
@click.argument("record_id")
@click.option("--note", required=True, help="人工确认的结论")
@click.option("--by", "confirmed_by", default="dba", help="确认人，默认 dba")
def gap_confirm(record_id, note, confirmed_by):
    """第三步：人工确认，给出最终结论

    示例：
      fk-checker gap confirm orders_id_gap_1234567890 \\
          --note "确认是迁移丢失，已补录，不影响业务" --by dba_zhang
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    result = handler.confirm(record, note, confirmed_by)

    click.echo(click.style("✓ 人工确认完成", fg="green", bold=True))
    click.echo(f"  记录ID: {record_id}")
    click.echo(f"  状态: {result['status_before']} → {result['status_after']}")
    click.echo(f"  确认人: {confirmed_by}")
    click.echo(f"  确认结论: {note}")
    click.echo(f"  已确认 {result['confirm_count']} 次")
    click.echo("")
    click.echo(click.style("  三部曲处理完成！", fg="green", bold=True))
    click.echo("")


@gap.command("trilogy")
@click.argument("record_id")
@click.option("--new-size", type=int, required=True, help="复检后的缺口数量")
@click.option("--supplement", "supplement_note", required=True, help="补录说明")
@click.option("--confirm", "confirm_note", required=True, help="确认结论")
@click.option("--by", "confirmed_by", default="dba", help="确认人")
def gap_trilogy(record_id, new_size, supplement_note, confirm_note, confirmed_by):
    """一键执行三部曲：复检 → 补录 → 人工确认

    三步一次走完，适合处理明确的缺口。

    示例：
      fk-checker gap trilogy orders_id_gap_1234567890 \\
          --new-size 3 \\
          --supplement "核对迁移日志，确认是2023-06-15迁移丢失" \\
          --confirm "确认是迁移丢失，已补录，不影响业务" \\
          --by dba_zhang
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    result = handler.run_triology(record_id, new_size, supplement_note, confirm_note, confirmed_by)

    click.echo(click.style("=" * 60, fg="cyan"))
    click.echo(click.style("  三部曲处理结果", fg="cyan", bold=True))
    click.echo(click.style("=" * 60, fg="cyan"))
    click.echo("")

    click.echo(click.style("  第一步：复检", fg="yellow", bold=True))
    r = result.recheck_result
    if r.get("skipped"):
        click.echo(f"    跳过: {r.get('reason')}")
    else:
        click.echo(f"    缺口数: {r['old_gap_size']} → {r['new_gap_size']}")
        if r.get("auto_resolved"):
            click.echo("    状态: 自动解决")
    click.echo("")

    click.echo(click.style("  第二步：补录", fg="yellow", bold=True))
    r = result.supplement_result
    if r.get("skipped"):
        click.echo(f"    跳过: {r.get('reason')}")
    else:
        click.echo(f"    补录内容: {supplement_note}")
    click.echo("")

    click.echo(click.style("  第三步：人工确认", fg="yellow", bold=True))
    r = result.confirm_result
    if r.get("skipped"):
        click.echo(f"    跳过: {r.get('reason')}")
    else:
        click.echo(f"    确认人: {confirmed_by}")
        click.echo(f"    确认结论: {confirm_note}")
    click.echo("")

    if result.all_completed:
        click.echo(click.style("  ✓ 三部曲全部完成！", fg="green", bold=True))
    else:
        click.echo(click.style("  ⚠ 部分步骤被跳过", fg="yellow"))
    click.echo("")


@gap.command("show")
@click.argument("record_id")
def gap_show(record_id):
    """查看一条缺口记录的详细信息（含历史）

    示例：
      fk-checker gap show orders_id_gap_1234567890
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    click.echo(click.style("=" * 60, fg="cyan"))
    click.echo(click.style(f"  缺口记录详情 - {record_id}", fg="cyan", bold=True))
    click.echo(click.style("=" * 60, fg="cyan"))
    click.echo("")
    click.echo(f"  表名:     {record.table_name}")
    click.echo(f"  类型:     {record.gap_type}")
    click.echo(f"  严重度:   {record.severity.upper()}")
    click.echo(f"  状态:     {record.status.value}")
    click.echo(f"  缺口数:   {record.gap_size}")
    click.echo(f"  复检次数: {record.recheck_count}")
    click.echo(f"  首次发现: {record.first_detected}")
    click.echo(f"  最近检查: {record.last_checked}")
    click.echo(f"  描述:     {record.description}")
    click.echo("")

    if record.supplement_notes:
        click.echo(click.style("  [补录记录]", fg="yellow", bold=True))
        for i, note in enumerate(record.supplement_notes, 1):
            click.echo(f"    {i}. {note}")
        click.echo("")

    if record.confirm_notes:
        click.echo(click.style("  [确认记录]", fg="green", bold=True))
        for i, c in enumerate(record.confirm_notes, 1):
            click.echo(f"    {i}. [{c['confirmed_by']}] {c['note']} ({c['time']})")
        click.echo("")

    if record.history:
        click.echo(click.style("  [操作历史]", fg="cyan", bold=True))
        for h in record.history:
            click.echo(f"    {h['time']} - {h['action']}: {h.get('detail', '')}")
        click.echo("")


@gap.command("dismiss")
@click.argument("record_id")
@click.option("--reason", required=True, help="忽略原因")
def gap_dismiss(record_id, reason):
    """忽略一条缺口记录（标记为 dismissed）

    示例：
      fk-checker gap dismiss orders_id_gap_1234567890 --reason "ID跳号是业务正常现象"
    """
    handler = GapHandler()
    record = handler.load(record_id)
    if not record:
        click.echo(click.style(f"错误: 缺口记录不存在: {record_id}", fg="red"))
        sys.exit(1)

    result = handler.dismiss(record, reason)

    click.echo(click.style("✓ 已忽略该缺口记录", fg="yellow"))
    click.echo(f"  记录ID: {record_id}")
    click.echo(f"  原因: {reason}")
    click.echo("")


@cli.group()
def report():
    """报表与快照对比

    保存检测快照，改动指标后对比看差异。
    """
    pass


@report.command("list")
@click.option("--schema", help="按数据库过滤", default=None)
def report_list(schema):
    """列出所有保存的快照

    示例：
      fk-checker report list
      fk-checker report list --schema fk_demo
    """
    mgr = ReportManager()
    snapshots = mgr.list_snapshots(schema)

    if not snapshots:
        click.echo("暂无快照")
        return

    click.echo(click.style(f"共 {len(snapshots)} 个快照", fg="cyan", bold=True))
    click.echo("")

    rows_data = []
    for s in snapshots:
        rows_data.append([
            s.snapshot_id,
            s.schema_name,
            s.fk_total,
            s.broken_count,
            s.total_broken_rows,
            s.created_at[:19],
            s.notes[:20] if s.notes else "",
        ])

    headers = ["快照ID", "数据库", "外键总数", "断链数", "影响行数", "创建时间", "备注"]
    click.echo(tabulate(rows_data, headers=headers, tablefmt="simple"))
    click.echo("")


@report.command("show")
@click.argument("snapshot_id")
def report_show(snapshot_id):
    """查看某个快照的详细内容

    示例：
      fk-checker report show fk_demo_20240101_120000
    """
    mgr = ReportManager()
    snap = mgr.load_snapshot(snapshot_id)
    if not snap:
        click.echo(click.style(f"错误: 快照不存在: {snapshot_id}", fg="red"))
        sys.exit(1)

    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo(click.style(f"  快照详情 - {snapshot_id}", fg="cyan", bold=True))
    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo("")
    click.echo(f"  数据库:   {snap.schema_name}")
    click.echo(f"  创建时间: {snap.created_at}")
    click.echo(f"  备注:     {snap.notes}")
    click.echo("")
    click.echo(f"  外键总数: {snap.fk_total}")
    click.echo(f"  断链数:   {snap.broken_count}")
    click.echo(f"  影响行数: {snap.total_broken_rows}")
    click.echo("")

    if snap.broken_links:
        click.echo(click.style("  [断链明细]", fg="yellow", bold=True))
        click.echo("-" * 70)
        for i, bl in enumerate(snap.broken_links, 1):
            click.echo(f"  [{i}] {bl['table_name']}.{bl['column_name']}")
            click.echo(f"      → {bl['referenced_table']}.{bl['referenced_column']}")
            click.echo(f"      断链数: {bl['broken_count']}")
            samples = ", ".join(bl["sample_ids"][:5])
            if samples:
                click.echo(f"      样例主键: {samples}")
            click.echo("")


@report.command("diff")
@click.argument("old_snapshot")
@click.argument("new_snapshot")
def report_diff(old_snapshot, new_snapshot):
    """并排对比两个快照，看指标改动后的影响

    示例：
      fk-checker report diff fk_demo_20240101_120000 fk_demo_20240102_120000
    """
    mgr = ReportManager()

    try:
        output = mgr.format_side_by_side(old_snapshot, new_snapshot)
        click.echo(output)
    except ValueError as e:
        click.echo(click.style(f"错误: {str(e)}", fg="red"))
        sys.exit(1)


@cli.group()
def index():
    """索引建议

    分析外键列的索引情况，给出优化建议。
    """
    pass


@index.command("suggest")
@click.pass_context
def index_suggest(ctx):
    """分析外键列，给出索引建议

    示例：
      fk-checker -d fk_demo index suggest
    """
    db_cfg = ctx.obj["db_config"]
    schema = db_cfg.database
    if not schema:
        click.echo(click.style("错误: 请指定数据库名", fg="red"))
        sys.exit(1)

    db = Database(db_cfg)
    analyzer = IndexAnalyzer(db)
    fk_checker = FKChecker(db)
    fks = fk_checker.discover_foreign_keys(schema)

    result = analyzer.analyze_foreign_key_indexes(schema, fks)

    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo(click.style(f"  外键索引分析 - {schema}", fg="cyan", bold=True))
    click.echo(click.style("=" * 70, fg="cyan"))
    click.echo("")
    click.echo(f"  外键总数: {len(fks)}")
    click.echo(f"  建议优化: {len(result.suggestions)} 个")
    click.echo("")

    if result.suggestions:
        click.echo(click.style("  [索引建议]", fg="yellow", bold=True))
        click.echo("-" * 70)
        for i, s in enumerate(result.suggestions, 1):
            click.echo(f"  [{i}] {s.table_name}.{s.column_name}")
            click.echo(f"      建议添加索引: {s.index_name}")
            click.echo(f"      原因: {s.reason}")
            click.echo(f"      预期收益: {s.estimated_benefit}")
            click.echo(f"      SQL: CREATE INDEX `{s.index_name}` ON `{s.table_name}` (`{s.column_name}`);")
            click.echo("")
    else:
        click.echo(click.style("  ✓ 所有外键列都有索引，无需优化", fg="green"))
        click.echo("")

    db.close()


if __name__ == "__main__":
    cli()
