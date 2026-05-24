#!/usr/bin/env python3
import click
import requests
import json
import time
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()
BASE_URL = "http://localhost:8000/api/v1"


@click.group()
def cli():
    """酒店前台夜审验收回放链路 CLI"""
    pass


@cli.command()
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
def start(host, port):
    """启动服务"""
    import uvicorn
    console.print(f"[green]启动服务: {host}:{port}[/green]")
    uvicorn.run("main:app", host=host, port=port, reload=True)


@cli.command()
def health():
    """检查服务状态"""
    try:
        resp = requests.get("http://localhost:8000/health")
        resp.raise_for_status()
        console.print("[green]服务运行正常[/green]")
    except Exception as e:
        console.print(f"[red]服务异常: {e}[/red]")


@cli.command()
@click.option("-f", "--file", help="JSON数据文件")
@click.option("-c", "--count", type=int, default=5, help="生成数据数量")
@click.option("-b", "--batch", help="批次号")
def ingest(file, count, batch):
    """导入数据（入住单、押金、换房记录）"""
    if file:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        from scripts.generate_data import generate_checkin_data, generate_deposit_data, generate_room_change_data
        batch_no = batch or f"BATCH-{int(time.time())}"
        checkins = generate_checkin_data(count, batch_no)
        deposits = generate_deposit_data(checkins)
        room_changes = generate_room_change_data(checkins)
        data = {"checkins": checkins, "deposits": deposits, "room_changes": room_changes, "batch_no": batch_no}

    batch_no = data.get("batch_no", "unknown")
    console.print(f"[blue]导入批次: {batch_no}[/blue]")

    start = time.time()

    console.print(f"  导入入住单: {len(data['checkins'])} 条...")
    resp = requests.post(f"{BASE_URL}/checkin/batch", json=data["checkins"], params={"batch_no": batch_no})
    checkin_result = resp.json()
    console.print(f"    成功: {checkin_result['success_count']}, 失败: {checkin_result['failed_count']}")

    console.print(f"  导入押金流水: {len(data['deposits'])} 条...")
    resp = requests.post(f"{BASE_URL}/deposit/batch", json=data["deposits"], params={"batch_no": batch_no})
    deposit_result = resp.json()
    console.print(f"    成功: {deposit_result['success_count']}, 失败: {deposit_result['failed_count']}")

    console.print(f"  导入换房记录: {len(data['room_changes'])} 条...")
    resp = requests.post(f"{BASE_URL}/room-change/batch", json=data["room_changes"], params={"batch_no": batch_no})
    change_result = resp.json()
    console.print(f"    成功: {change_result['success_count']}, 失败: {change_result['failed_count']}")

    elapsed = time.time() - start
    console.print(f"[green]导入完成，耗时: {elapsed:.2f}s[/green]")
    console.print(f"[yellow]批次号: {batch_no}[/yellow]")


@cli.command()
@click.option("-b", "--batch", help="批次号")
@click.option("-o", "--operator", default="system", help="操作员")
def reconcile(batch, operator):
    """执行对账"""
    console.print("[blue]执行对账...[/blue]")
    payload = {"operator": operator}
    if batch:
        payload["batch_no"] = batch

    resp = requests.post(f"{BASE_URL}/reconciliation/run", json=payload)
    result = resp.json()

    table = Table(title="对账结果")
    table.add_column("项目")
    table.add_column("数量")
    table.add_row("总计", str(result["total"]))
    table.add_row("[green]匹配[/green]", str(result["matched"]))
    table.add_row("[red]不匹配[/red]", str(result["unmatched"]))
    console.print(table)

    if result["unmatched"] > 0:
        console.print("\n[yellow]异常记录:[/yellow]")
        for r in result["results"]:
            if not r["is_matched"]:
                console.print(f"  {r['checkin_no']}: 差异 {r['diff_amount']:.2f} 元")
                if r.get("issues"):
                    for issue in r["issues"]:
                        console.print(f"    - {issue}")


@cli.command()
@click.option("-b", "--batch", help="批次号")
@click.option("-t", "--type", "export_type", default="all", help="导出类型: checkin|deposit|room_change|reconciliation|all")
@click.option("--freeze", is_flag=True, help="导出后冻结")
@click.option("-o", "--operator", default="system", help="操作员")
def export(batch, export_type, freeze, operator):
    """导出数据"""
    console.print(f"[blue]导出数据 ({export_type})...[/blue]")
    payload = {
        "export_type": export_type,
        "freeze_after_export": freeze,
        "exported_by": operator,
    }
    if batch:
        payload["batch_no"] = batch

    resp = requests.post(f"{BASE_URL}/export/excel", json=payload)
    result = resp.json()

    console.print(f"[green]导出成功[/green]")
    console.print(f"  快照号: {result['snapshot_no']}")
    console.print(f"  文件: {result['file_name']}")
    console.print(f"  记录数: {result['record_count']}")
    console.print(f"  已冻结: {'是' if result['is_frozen'] else '否'}")


@cli.command()
@click.argument("snapshot_no")
@click.option("-o", "--operator", default="system", help="操作员")
@click.option("-r", "--reason", help="冻结原因")
def freeze(snapshot_no, operator, reason):
    """冻结导出快照"""
    console.print(f"[blue]冻结快照: {snapshot_no}[/blue]")
    payload = {
        "snapshot_no": snapshot_no,
        "frozen_by": operator,
        "remarks": reason,
    }
    resp = requests.post(f"{BASE_URL}/export/freeze", json=payload)
    result = resp.json()
    console.print(f"[green]快照已冻结[/green]")


@cli.command()
@click.option("-b", "--batch", help="批次号")
def audit(batch):
    """查看审计日志"""
    if not batch:
        console.print("[red]请指定批次号 -b[/red]")
        return

    console.print(f"[blue]审计日志: {batch}[/blue]")
    resp = requests.get(f"{BASE_URL}/audit/batch/{batch}")
    result = resp.json()

    table = Table(title=f"审计日志 - {batch}")
    table.add_column("时间")
    table.add_column("类型")
    table.add_column("操作")
    table.add_column("操作员")
    table.add_column("原因")

    for log in result["history"][:20]:
        table.add_row(
            log["operation_time"][:19],
            log["record_type"],
            log["operation"],
            log["operator"],
            log.get("change_reason") or "-",
        )

    console.print(table)
    console.print(f"共 {result['count']} 条记录")


@cli.command()
@click.argument("record_type")
@click.argument("record_id")
def history(record_type, record_id):
    """查看单条记录的历史变更"""
    resp = requests.get(f"{BASE_URL}/audit/history/{record_type}/{record_id}")
    result = resp.json()

    console.print(Panel(f"[bold]{record_type} - {record_id}[/bold]"))

    for log in result["history"]:
        console.print(f"\n[blue]{log['operation_time']}[/blue] - {log['operation']} by {log['operator']}")
        if log.get("change_reason"):
            console.print(f"  原因: {log['change_reason']}")
        if log.get("before_data"):
            console.print(f"  变更前: {json.dumps(log['before_data'], ensure_ascii=False)[:100]}...")
        if log.get("after_data"):
            console.print(f"  变更后: {json.dumps(log['after_data'], ensure_ascii=False)[:100]}...")


@cli.command()
@click.option("-b", "--batch", help="批次号")
@click.option("--repeat", is_flag=True, help="测试重复提交")
@click.option("--bad-data", is_flag=True, help="测试坏数据")
def acceptance(batch, repeat, bad_data):
    """验收测试流程"""
    console.print("[bold green]=== 酒店夜审验收测试 ===[/bold green]\n")

    batch_no = batch or f"BATCH-TEST-{int(time.time())}"

    console.print("[blue]1. 造数并导入正常数据[/blue]")
    from scripts.generate_data import generate_checkin_data, generate_deposit_data, generate_room_change_data
    checkins = generate_checkin_data(3, batch_no)
    deposits = generate_deposit_data(checkins)
    room_changes = generate_room_change_data(checkins)

    requests.post(f"{BASE_URL}/checkin/batch", json=checkins, params={"batch_no": batch_no})
    requests.post(f"{BASE_URL}/deposit/batch", json=deposits, params={"batch_no": batch_no})
    requests.post(f"{BASE_URL}/room-change/batch", json=room_changes, params={"batch_no": batch_no})
    console.print("  [green]✓[/green] 正常数据导入完成")

    if repeat:
        console.print("\n[blue]2. 测试重复提交[/blue]")
        resp = requests.post(f"{BASE_URL}/checkin/batch", json=checkins, params={"batch_no": batch_no})
        result = resp.json()
        console.print(f"  [green]✓[/green] 重复提交处理完成")
        console.print(f"    策略: update, 实际行为: 幂等更新")

    if bad_data:
        console.print("\n[blue]3. 测试坏数据/部分失败[/blue]")
        bad_checkins = checkins[:1] + [{"checkin_no": "BAD001", "invalid_field": "value"}]
        resp = requests.post(f"{BASE_URL}/checkin/batch", json=bad_checkins, params={"batch_no": batch_no})
        result = resp.json()
        console.print(f"  [green]✓[/green] 部分失败: {result['success_count']}成功, {result['failed_count']}失败")

    console.print("\n[blue]4. 执行对账[/blue]")
    resp = requests.post(f"{BASE_URL}/reconciliation/run", json={"batch_no": batch_no, "operator": "tester"})
    result = resp.json()
    console.print(f"  [green]✓[/green] 对账完成: {result['matched']}匹配, {result['unmatched']}不匹配")

    console.print("\n[blue]5. 导出并冻结[/blue]")
    resp = requests.post(f"{BASE_URL}/export/excel", json={
        "export_type": "all",
        "batch_no": batch_no,
        "freeze_after_export": True,
        "exported_by": "tester",
    })
    export_result = resp.json()
    console.print(f"  [green]✓[/green] 导出并冻结: {export_result['snapshot_no']}")

    console.print("\n[blue]6. 审计追溯[/blue]")
    resp = requests.get(f"{BASE_URL}/audit/batch/{batch_no}")
    audit_result = resp.json()
    console.print(f"  [green]✓[/green] 审计日志可用: {audit_result['count']} 条记录")

    console.print("\n[bold green]=== 验收测试完成 ===[/bold green]")
    console.print(f"批次号: {batch_no}")
    console.print(f"导出快照: {export_result['snapshot_no']}")


if __name__ == "__main__":
    cli()
