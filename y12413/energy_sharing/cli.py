from __future__ import annotations

from datetime import datetime

import click
from rich.console import Console
from rich.table import Table

from .alerts import AlertManager
from .audit import AuditTrail
from .calculator import SavingsCalculator
from .models import (
    BaselineAdjustment,
    MaintenanceRecord,
    MeterReading,
    ProjectContract,
    SharingRatioEntry,
    SharingRatioVersion,
    SourceRef,
)
from .storage import DataStore

console = Console()
store = DataStore()
audit = AuditTrail(store)
alerts = AlertManager(store)
calculator = SavingsCalculator(store)


@click.group()
def cli():
    """合同能源收益分成管理工具"""
    pass


@cli.group()
def project():
    """项目合同管理"""
    pass


@project.command("create")
@click.option("--name", required=True, help="项目名称，例如：XX大厦节能改造项目")
@click.option("--start", required=True, help="合同开始日期，格式：YYYY-MM-DD")
@click.option("--end", required=True, help="合同结束日期，格式：YYYY-MM-DD")
@click.option("--baseline", type=float, required=True, help="基准电量（kwh/月），来自合同约定")
@click.option("--baseline-source", default="", help="基准电量来源，例如：合同附件3-2023年用电明细")
@click.option("--unit-price", type=float, required=True, help="电价（元/kwh）")
@click.option("--operator", default="", help="操作人")
def project_create(name, start, end, baseline, baseline_source, unit_price, operator):
    """创建项目合同

    示例：
      energy-sharing project create \\
        --name "XX大厦照明节能改造" \\
        --start 2024-01-01 \\
        --end 2026-12-31 \\
        --baseline 50000 \\
        --baseline-source "合同附件3-2023年用电明细" \\
        --unit-price 0.85
    """
    project = ProjectContract(
        name=name,
        contract_start=datetime.strptime(start, "%Y-%m-%d").date(),
        contract_end=datetime.strptime(end, "%Y-%m-%d").date(),
        baseline_kwh=baseline,
        baseline_source=baseline_source,
        unit_price=unit_price,
    )
    store.save_project(project)
    audit.log_project_create(project.project_id, name, operator)

    console.print(f"✅ 项目已创建：[bold green]{project.name}[/bold green]")
    console.print(f"   项目ID：{project.project_id}")
    console.print(f"   合同期：{start} ~ {end}")
    console.print(f"   基准电量：{baseline:,.0f} kwh/月")
    console.print(f"   电价：{unit_price:.2f} 元/kwh")


@project.command("ratio")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--party", multiple=True, required=True, help="分成方，格式：名称:百分比，可多次指定")
@click.option("--effective-from", required=True, help="生效月份，格式：YYYY-MM")
@click.option("--contract-ref", default="", help="合同引用，例如：合同第5.2条")
@click.option("--note", default="", help="备注说明")
@click.option("--operator", default="", help="操作人")
def project_ratio(project_id, party, effective_from, contract_ref, note, operator):
    """设置收益分成比例

    示例：
      energy-sharing project ratio \\
        --project-id abc123 \\
        --party "业主方:40" \\
        --party "节能服务公司:60" \\
        --effective-from 2024-01 \\
        --contract-ref "合同第5.2条"
    """
    project = store.load_project(project_id)
    if not project:
        console.print(f"❌ 项目不存在：{project_id}")
        return

    entries = []
    for p in party:
        name, percent = p.split(":")
        entries.append(SharingRatioEntry(party=name, percentage=float(percent)))

    total = sum(e.percentage for e in entries)
    if total != 100:
        console.print(f"❌ 分成比例合计必须为100%，当前为 {total}%")
        return

    old_version = max((r.version for r in project.sharing_ratios), default=0)
    new_version = old_version + 1

    ratio = SharingRatioVersion(
        version=new_version,
        effective_from=datetime.strptime(effective_from, "%Y-%m").date(),
        entries=entries,
        contract_ref=contract_ref,
        note=note,
    )
    project.sharing_ratios.append(ratio)
    store.save_project(project)
    audit.log_ratio_update(project_id, old_version, new_version, note or "更新分成比例", operator)

    console.print(f"✅ 分成比例已设置（版本 {new_version}）")
    for e in entries:
        console.print(f"   {e.party}: {e.percentage}%")
    console.print(f"   生效自：{effective_from}")


@project.command("baseline-adjust")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--month", required=True, help="调整月份，格式：YYYY-MM")
@click.option("--new-kwh", type=float, required=True, help="调整后的基准电量（kwh）")
@click.option("--reason", required=True, help="调整原因，例如：新增大型设备、季节调整等")
@click.option("--source-ref", default="", help="来源引用，例如：设备采购单编号XXX")
@click.option("--operator", default="", help="操作人")
def project_baseline_adjust(project_id, month, new_kwh, reason, source_ref, operator):
    """调整月度基准电量

    示例：
      energy-sharing project baseline-adjust \\
        --project-id abc123 \\
        --month 2024-07 \\
        --new-kwh 55000 \\
        --reason "夏季高温，中央空调用电增加" \\
        --source-ref "运营部2024-07-15通知"
    """
    project = store.load_project(project_id)
    if not project:
        console.print(f"❌ 项目不存在：{project_id}")
        return

    existing = next((a for a in project.baseline_adjustments if a.month == month), None)
    old_kwh = existing.adjusted_kwh if existing else project.baseline_kwh

    adjustment = BaselineAdjustment(
        month=month,
        original_kwh=project.baseline_kwh,
        adjusted_kwh=new_kwh,
        reason=reason,
        source_refs=[SourceRef(entity_type="Document", entity_id=source_ref, field="", description=reason)] if source_ref else [],
    )

    if existing:
        project.baseline_adjustments = [a for a in project.baseline_adjustments if a.month != month]
    project.baseline_adjustments.append(adjustment)
    store.save_project(project)

    audit.log_baseline_adjust(project_id, month, old_kwh, new_kwh, reason, adjustment.adjustment_id, operator)

    console.print(f"✅ 基准电量已调整")
    console.print(f"   月份：{month}")
    console.print(f"   原值：{old_kwh:,.0f} kwh")
    console.print(f"   新值：{new_kwh:,.0f} kwh")
    console.print(f"   调整：{new_kwh - old_kwh:+,.0f} kwh")
    console.print(f"   原因：{reason}")


@project.command("list")
def project_list():
    """列出所有项目"""
    projects = store.list_projects()
    if not projects:
        console.print("暂无项目")
        return

    table = Table(title="项目列表")
    table.add_column("项目ID")
    table.add_column("项目名称")
    table.add_column("合同期")
    table.add_column("基准电量")
    table.add_column("电价")
    table.add_column("分成版本")

    for p in projects:
        table.add_row(
            p.project_id,
            p.name,
            f"{p.contract_start} ~ {p.contract_end}",
            f"{p.baseline_kwh:,.0f} kwh",
            f"{p.unit_price:.2f} 元",
            f"v{len(p.sharing_ratios)}",
        )

    console.print(table)


@cli.group()
def meter():
    """电表读数管理"""
    pass


@meter.command("add")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--month", required=True, help="读数月份，格式：YYYY-MM")
@click.option("--kwh", type=float, required=True, help="当月用电量（kwh）")
@click.option("--meter-id", default="", help="电表编号")
@click.option("--source-ref", default="", help="来源引用，例如：电表照片编号、抄表记录ID")
@click.option("--backfill", is_flag=True, help="是否为补录历史数据")
@click.option("--backfill-reason", default="", help="补录原因，例如：上月电表故障")
@click.option("--operator", default="", help="操作人")
def meter_add(project_id, month, kwh, meter_id, source_ref, backfill, backfill_reason, operator):
    """录入电表读数

    正常录入：
      energy-sharing meter add \\
        --project-id abc123 \\
        --month 2024-01 \\
        --kwh 35000 \\
        --source-ref "抄表记录2024-02-05"

    补录历史数据：
      energy-sharing meter add \\
        --project-id abc123 \\
        --month 2024-01 \\
        --kwh 35000 \\
        --backfill \\
        --backfill-reason "上月电表故障"
    """
    reading = MeterReading(
        project_id=project_id,
        meter_id=meter_id,
        month=month,
        kwh=kwh,
        is_backfilled=backfill,
        backfill_reason=backfill_reason,
        source_ref=source_ref,
    )
    store.save_reading(reading)
    audit.log_meter_reading(project_id, reading.reading_id, month, kwh, backfill, backfill_reason, operator)

    tag = "[yellow][补录][/yellow] " if backfill else ""
    console.print(f"✅ {tag}电表读数已录入")
    console.print(f"   月份：{month}")
    console.print(f"   用电量：{kwh:,.0f} kwh")
    if backfill:
        console.print(f"   补录原因：{backfill_reason}")


@meter.command("list")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--month", default="", help="指定月份，格式：YYYY-MM（可选）")
def meter_list(project_id, month):
    """查看电表读数"""
    readings = store.load_readings(project_id)
    if month:
        readings = [r for r in readings if r.month == month]

    if not readings:
        console.print("暂无电表读数")
        return

    table = Table(title=f"电表读数 - {project_id}")
    table.add_column("读数ID")
    table.add_column("月份")
    table.add_column("用电量(kwh)")
    table.add_column("电表编号")
    table.add_column("是否补录")
    table.add_column("来源")

    for r in sorted(readings, key=lambda x: x.month):
        table.add_row(
            r.reading_id,
            r.month,
            f"{r.kwh:,.0f}",
            r.meter_id or "-",
            "是" if r.is_backfilled else "否",
            r.source_ref or "-",
        )

    console.print(table)


@cli.group()
def maintenance():
    """设备检修管理"""
    pass


@maintenance.command("add")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--start", required=True, help="检修开始日期，格式：YYYY-MM-DD")
@click.option("--end", required=True, help="检修结束日期，格式：YYYY-MM-DD")
@click.option("--description", required=True, help="检修描述，例如：冷却塔大修")
@click.option("--excluded-kwh", type=float, default=0.0, help="剔除用电量（kwh），检修期间不参与节电计算")
@click.option("--exclusion-reason", default="", help="剔除原因，例如：检修期间设备全部停机")
@click.option("--source-ref", default="", help="来源引用，例如：检修工单编号XXX")
@click.option("--operator", default="", help="操作人")
def maintenance_add(project_id, start, end, description, excluded_kwh, exclusion_reason, source_ref, operator):
    """添加检修记录

    示例：
      energy-sharing maintenance add \\
        --project-id abc123 \\
        --start 2024-03-15 \\
        --end 2024-03-20 \\
        --description "冷却塔年度大修" \\
        --excluded-kwh 5000 \\
        --exclusion-reason "检修期间设备全部停机" \\
        --source-ref "工单WO-2024-0315"
    """
    record = MaintenanceRecord(
        project_id=project_id,
        start_date=datetime.strptime(start, "%Y-%m-%d").date(),
        end_date=datetime.strptime(end, "%Y-%m-%d").date(),
        description=description,
        excluded_kwh=excluded_kwh,
        exclusion_reason=exclusion_reason,
        source_ref=source_ref,
    )
    store.save_maintenance(record)
    audit.log_maintenance(project_id, record.record_id, start, end, excluded_kwh, operator)

    console.print(f"✅ 检修记录已添加")
    console.print(f"   期间：{start} ~ {end}")
    console.print(f"   描述：{description}")
    console.print(f"   剔用电量：{excluded_kwh:,.0f} kwh")


@maintenance.command("list")
@click.option("--project-id", required=True, help="项目ID")
def maintenance_list(project_id):
    """查看检修记录"""
    records = store.load_maintenance(project_id)
    if not records:
        console.print("暂无检修记录")
        return

    table = Table(title=f"检修记录 - {project_id}")
    table.add_column("记录ID")
    table.add_column("开始日期")
    table.add_column("结束日期")
    table.add_column("描述")
    table.add_column("剔用电量(kwh)")

    for r in sorted(records, key=lambda x: x.start_date):
        table.add_row(
            r.record_id,
            str(r.start_date),
            str(r.end_date),
            r.description,
            f"{r.excluded_kwh:,.0f}",
        )

    console.print(table)


@cli.command("calculate")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--period-start", required=True, help="计算开始月份，格式：YYYY-MM")
@click.option("--period-end", required=True, help="计算结束月份，格式：YYYY-MM")
@click.option("--trigger-reason", default="", help="触发原因，例如：补录电表读数、新增检修记录等")
@click.option("--operator", default="", help="操作人")
def calculate(project_id, period_start, period_end, trigger_reason, operator):
    """计算收益分成（自动追加新版本，不覆盖历史）

    每次计算会生成新版本的结果，历史版本保留可查。

    示例：
      energy-sharing calculate \\
        --project-id abc123 \\
        --period-start 2024-01 \\
        --period-end 2024-06 \\
        --trigger-reason "补录2024-03电表读数"
    """
    try:
        result = calculator.calculate(project_id, period_start, period_end, trigger_reason, operator)
        audit.log_calculation(project_id, result.result_id, result.version, trigger_reason, operator)

        console.print(f"✅ 收益分成已计算（版本 v{result.version:03d}）")
        console.print(f"   计算期间：{period_start} ~ {period_end}")
        console.print(f"   使用比例版本：v{result.ratio_version}")
        console.print(f"   触发原因：{trigger_reason or '正常计算'}")
        console.print("")
        console.print(f"   [bold]节电量汇总：[/bold] {result.total_savings_kwh:,.0f} kwh")
        console.print(f"   [bold]节电收益：[/bold] {result.total_revenue:,.2f} 元")
        console.print("")

        if result.exclusions:
            console.print(f"   [yellow]检修剔除（{len(result.exclusions)} 项）：[/yellow]")
            for e in result.exclusions:
                console.print(f"     {e.month}: {e.excluded_kwh:,.0f} kwh - {e.reason}")
            console.print("")

        console.print("   [bold]收益分成：[/bold]")
        for share in result.sharing_breakdown:
            console.print(f"     {share['party']}: {share['amount']:,.2f} 元 ({share['percentage']}%)")

    except ValueError as e:
        console.print(f"❌ {e}")


@cli.command("results")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--detail", is_flag=True, help="显示明细数据")
def results(project_id, detail):
    """查看收益分成计算历史版本"""
    results_list = store.load_results(project_id)
    if not results_list:
        console.print("暂无计算结果")
        return

    console.print(f"[bold]计算历史（共 {len(results_list)} 个版本）：[/bold]")
    console.print("")

    for r in results_list:
        console.print(f"[cyan]v{r.version:03d}[/cyan] - {r.calculation_time.strftime('%Y-%m-%d %H:%M')}")
        console.print(f"  期间：{r.period_start} ~ {r.period_end}")
        console.print(f"  触发：{r.trigger_reason or '正常计算'}")
        console.print(f"  节电量：{r.total_savings_kwh:,.0f} kwh | 收益：{r.total_revenue:,.2f} 元")

        if detail:
            console.print("  月度明细：")
            for d in r.savings_details:
                missing = " [red][缺读数][/red]" if d.missing_reading else ""
                adj = f" [yellow][基准调整 {d.baseline_adjustment_kwh:+,.0f}][/yellow]" if d.baseline_adjustment_kwh != 0 else ""
                excl = f" [yellow][检修剔除 {d.maintenance_exclusion_kwh:,.0f}][/yellow]" if d.maintenance_exclusion_kwh > 0 else ""
                console.print(f"    {d.month}: 基准={d.baseline_kwh:,.0f} | 实际={d.actual_kwh:,.0f} | 节电={d.savings_kwh:,.0f}{missing}{adj}{excl}")
        console.print("")


@cli.command("diff")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--v1", type=int, required=True, help="版本1")
@click.option("--v2", type=int, required=True, help="版本2")
def results_diff(project_id, v1, v2):
    """对比两个计算版本的差异"""
    results_list = store.load_results(project_id)
    r1 = next((r for r in results_list if r.version == v1), None)
    r2 = next((r for r in results_list if r.version == v2), None)

    if not r1 or not r2:
        console.print("❌ 指定版本不存在")
        return

    table = Table(title=f"版本对比 v{v1:03d} vs v{v2:03d}")
    table.add_column("项目")
    table.add_column(f"v{v1:03d}")
    table.add_column(f"v{v2:03d}")
    table.add_column("差异")

    diff_kwh = r2.total_savings_kwh - r1.total_savings_kwh
    diff_rev = r2.total_revenue - r1.total_revenue

    table.add_row("总节电量(kwh)", f"{r1.total_savings_kwh:,.0f}", f"{r2.total_savings_kwh:,.0f}", f"{diff_kwh:+,.0f}")
    table.add_row("总收益(元)", f"{r1.total_revenue:,.2f}", f"{r2.total_revenue:,.2f}", f"{diff_rev:+,.2f}")

    console.print(table)

    console.print("")
    console.print("[bold]月度差异：[/bold]")
    details1 = {d.month: d for d in r1.savings_details}
    details2 = {d.month: d for d in r2.savings_details}

    all_months = sorted(set(details1.keys()) | set(details2.keys()))
    for month in all_months:
        d1 = details1.get(month)
        d2 = details2.get(month)
        if d1 and d2 and abs(d1.savings_kwh - d2.savings_kwh) > 0.01:
            diff = d2.savings_kwh - d1.savings_kwh
            console.print(f"  {month}: {diff:+,.0f} kwh")


@cli.group()
def audit():
    """审计追踪"""
    pass


@audit.command("history")
@click.option("--project-id", required=True, help="项目ID")
def audit_history(project_id):
    """查看项目操作历史，追踪何时改、为何改、影响了哪些结果"""
    history = audit.get_project_history(project_id)
    if not history:
        console.print("暂无操作记录")
        return

    table = Table(title="操作历史")
    table.add_column("时间")
    table.add_column("类型")
    table.add_column("操作")
    table.add_column("原因")
    table.add_column("操作人")
    table.add_column("影响结果")

    for h in history:
        table.add_row(
            h["时间"],
            h["操作类型"],
            h["操作"],
            h["原因"],
            h["操作人"] or "-",
            ", ".join(h["影响结果"]) if h["影响结果"] else "-",
        )

    console.print(table)


@cli.group()
def check():
    """分阶段检查提醒"""
    pass


@check.command("initial")
@click.option("--project-id", required=True, help="项目ID")
def check_initial(project_id):
    """初始阶段检查：分成比例、基准调整

    项目合同刚签完时检查
    """
    alerts_list = alerts.check_initial_phase(project_id)
    _show_alerts(alerts_list, "初始阶段")


@check.command("monthly")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--month", default=None, help="检查月份，格式：YYYY-MM（默认当月）")
def check_monthly(project_id, month):
    """月度检查：电表读数、检修记录

    月底核对时使用，暴露读数缺月和检修剔除问题
    """
    if month is None:
        month = datetime.now().strftime("%Y-%m")
    alerts_list = alerts.check_monthly_phase(project_id, month)
    _show_alerts(alerts_list, f"月度检查 - {month}")


@check.command("final")
@click.option("--project-id", required=True, help="项目ID")
@click.option("--period-start", required=True, help="汇总开始月份")
@click.option("--period-end", required=True, help="汇总结束月份")
def check_final(project_id, period_start, period_end):
    """最终汇总检查

    收益分成汇总前检查数据完整性
    """
    alerts_list = alerts.check_final_phase(project_id, period_start, period_end)
    _show_alerts(alerts_list, f"最终汇总 - {period_start} ~ {period_end}")


@check.command("all")
@click.option("--project-id", required=True, help="项目ID")
def check_all(project_id):
    """运行所有阶段检查"""
    alerts_list = alerts.check_all(project_id)
    _show_alerts(alerts_list, "全部检查")


def _show_alerts(alerts_list, title):
    if not alerts_list:
        console.print(f"✅ {title}检查通过，无问题")
        return

    console.print(f"⚠️  {title}发现 {len(alerts_list)} 个问题：")
    console.print("")

    for a in alerts_list:
        level_color = {
            "critical": "red",
            "warning": "yellow",
            "info": "blue",
        }.get(a.level, "white")

        console.print(f"  [{level_color}][{a.level.upper()}][/{level_color}] {a.title}")
        console.print(f"      {a.message}")
        if a.source_refs:
            console.print(f"      来源：")
            for ref in a.source_refs[:3]:
                console.print(f"        - {ref.description}")
            if len(a.source_refs) > 3:
                console.print(f"        ... 等 {len(a.source_refs)} 项")
        console.print("")


if __name__ == "__main__":
    cli()
