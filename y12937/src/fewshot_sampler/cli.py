from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from fewshot_sampler.audit import AuditTrail
from fewshot_sampler.exporter import ResultExporter
from fewshot_sampler.feedback import FeedbackManager
from fewshot_sampler.sampler import FewShotSampler
from fewshot_sampler.schemas import FeedbackStatus, SamplingConfig
from fewshot_sampler.storage import RecordStorage

console = Console()


def _default_storage() -> str:
    return os.environ.get("FEWSHOT_STORAGE", "./.fewshot_storage")


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.option("--storage", "-s", default=None, help="存储目录路径，默认 ./.fewshot_storage 或 $FEWSHOT_STORAGE")
@click.pass_context
def main(ctx: click.Context, storage: Optional[str]) -> None:
    """少样本评测抽样器 —— MLOps 人工评测与追溯工具

    使用步骤：
      1. run      导入数据并抽样（一键完成）
      2. list     查看批次和异常
      3. feedback 录入人工反馈
      4. trace    顺着一条异常往回查
      5. export   导出结果给同事看
    """
    ctx.ensure_object(dict)
    ctx.obj["storage_root"] = storage or _default_storage()


@main.command()
@click.argument("input_file", type=click.Path(exists=True, dir_okay=False))
@click.option("--sheet", default=None, help="Excel工作表名，默认第一个")
@click.option("-n", "--num-samples", default=50, show_default=True, help="抽样总条数")
@click.option("--random-ratio", default=0.3, show_default=True, help="随机抽样比例 (0-1)")
@click.option("--anomaly-ratio", default=0.4, show_default=True, help="异常优先抽样比例 (0-1)")
@click.option("--recent-ratio", default=0.2, show_default=True, help="最近数据抽样比例 (0-1)")
@click.option("--stratify-by", default=None, help="分层抽样的字段名")
@click.option("--seed", default=42, show_default=True, help="随机种子，保证可复现")
@click.option("--desc", default="", help="本批次说明备注")
@click.pass_context
def run(
    ctx: click.Context,
    input_file: str,
    sheet: Optional[str],
    num_samples: int,
    random_ratio: float,
    anomaly_ratio: float,
    recent_ratio: float,
    stratify_by: Optional[str],
    seed: int,
    desc: str,
) -> None:
    """第一步：从数据文件中抽样并检测异常

    INPUT_FILE 支持 .csv / .xlsx / .xls

    示例：
      fewshot-sampler run sample_data/sales_dirty.csv -n 60 --desc "Q2销售数据初检"
      fewshot-sampler run data/old_export.xlsx --sheet "Sheet2" -n 100 --stratify-by "部门"
    """
    storage_root = ctx.obj["storage_root"]
    try:
        config = SamplingConfig(
            total_samples=num_samples,
            random_ratio=random_ratio,
            anomaly_ratio=anomaly_ratio,
            recent_ratio=recent_ratio,
            seed=seed,
            stratify_by=stratify_by,
        )
        config.validate()
    except ValueError as e:
        console.print(f"[red]参数错误：{e}[/red]")
        sys.exit(1)

    sampler = FewShotSampler(config)
    storage = RecordStorage(storage_root)

    input_path = Path(input_file).resolve()
    desc = desc or f"抽样自 {input_path.name}"

    with console.status(f"[bold]正在加载 {input_path.name} ..."):
        try:
            df = sampler.load_dataframe(str(input_path), sheet_name=sheet)
        except Exception as e:
            console.print(f"[red]读取文件失败：{e}[/red]")
            sys.exit(1)

    console.print(f"[green]✓[/green] 读取数据：共 {len(df)} 行，{len(df.columns)} 列")

    with console.status("[bold]正在检测异常 + 抽样 ..."):
        batch = sampler.sample(df, source_file=str(input_path), description=desc)
        save_path = storage.save_batch(batch)

    table = Table(title=f"抽样完成 · 批次 {batch.batch_id}", show_header=True, header_style="bold magenta")
    table.add_column("项目", style="cyan", width=18)
    table.add_column("数值", style="white")
    table.add_row("数据总行数", str(len(df)))
    table.add_row("抽样条数", str(batch.total_count))
    table.add_row("含异常记录数", str(batch.anomaly_count))
    table.add_row("异常占比", f"{batch.anomaly_count / max(1, batch.total_count) * 100:.1f}%")
    table.add_row("存储目录", save_path)
    console.print(table)

    if batch.anomaly_count > 0:
        anom_dist: dict = {}
        for r in batch.records:
            for a in r.anomalies:
                key = a.anomaly_type.label
                anom_dist[key] = anom_dist.get(key, 0) + 1
        dist_table = Table(title="异常类型分布", show_header=True, header_style="bold yellow")
        dist_table.add_column("异常类型", style="yellow")
        dist_table.add_column("条数", justify="right", style="white")
        for k, v in sorted(anom_dist.items(), key=lambda x: -x[1]):
            dist_table.add_row(k, str(v))
        console.print(dist_table)

    console.print()
    console.print(f"下一步：[bold]fewshot-sampler list[/bold] 查看详情，或 [bold]fewshot-sampler export {batch.batch_id}[/bold] 导出")


@main.command(name="list")
@click.argument("batch_id", required=False, default=None)
@click.option("--anomalies", "-a", is_flag=True, help="只列出异常条目")
@click.option("--limit", "-l", default=30, show_default=True, help="列表上限")
@click.pass_context
def list_cmd(ctx: click.Context, batch_id: Optional[str], anomalies: bool, limit: int) -> None:
    """第二步：查看批次列表或单批次的异常

    用法：
      fewshot-sampler list                    所有批次
      fewshot-sampler list <批次ID>           某批次抽样明细
      fewshot-sampler list <批次ID> -a        只看异常记录
    """
    storage_root = ctx.obj["storage_root"]
    storage = RecordStorage(storage_root)
    fb = FeedbackManager(storage_root)

    if batch_id is None:
        batches = storage.list_batches()
        if not batches:
            console.print("[yellow]尚无批次记录，请先执行 fewshot-sampler run[/yellow]")
            return
        table = Table(title="批次列表", show_header=True, header_style="bold blue")
        table.add_column("批次ID", style="bold cyan")
        table.add_column("描述", style="white")
        table.add_column("创建时间", style="dim")
        table.add_column("抽样/异常", justify="right")
        table.add_column("反馈数", justify="right")
        for m in batches:
            fb_stats = fb.stats(m.batch_id)
            table.add_row(
                m.batch_id,
                m.description,
                m.created_at[:19].replace("T", " "),
                f"{m.total_records} / {m.anomaly_records}",
                str(fb_stats["总反馈数"]),
            )
        console.print(table)
        return

    meta = storage.get_batch_meta(batch_id)
    if not meta:
        console.print(f"[red]未找到批次 {batch_id}[/red]")
        sys.exit(1)

    records = storage.load_records(batch_id)
    if not records:
        console.print("[yellow]该批次无记录[/yellow]")
        return

    table = Table(
        title=f"批次 {batch_id} · {meta.description}",
        show_header=True,
        header_style="bold magenta",
    )
    table.add_column("#", justify="right", style="dim", width=4)
    table.add_column("记录ID", style="cyan")
    table.add_column("行号", justify="right")
    table.add_column("抽样方式")
    table.add_column("异常数", justify="right")
    table.add_column("异常类型")
    table.add_column("评分", justify="right")
    table.add_column("反馈状态")

    display_count = 0
    for i, r in enumerate(records):
        if anomalies and not r.get("anomalies"):
            continue
        if display_count >= limit:
            break
        anom_types = " ".join(a.get("异常类型", "")[:3] for a in r.get("anomalies", [])) or "-"
        feedbacks = fb.list_by_record(batch_id, r.get("record_id", ""))
        latest = feedbacks[-1].status.label if feedbacks else "未处理"

        score_str = str(int(r.get("anomaly_score", 0) * 100))
        style = "bold red" if r.get("anomalies") else "green"
        table.add_row(
            str(i + 1),
            r.get("record_id", ""),
            str(r.get("source_row_index", -1) + 1),
            _zh(r.get("sample_source", "")),
            str(len(r.get("anomalies", []))),
            Text(anom_types, style=style),
            score_str + "分",
            latest,
        )
        display_count += 1

    console.print(table)
    console.print(f"[dim]显示 {display_count} 条。用 fewshot-sampler trace {batch_id} <记录ID> 追溯单条[/dim]")


@main.command()
@click.argument("batch_id")
@click.argument("record_id")
@click.option("--anomaly-index", "-i", default=0, show_default=True, help="该记录下第几条异常（从0开始）")
@click.pass_context
def trace(ctx: click.Context, batch_id: str, record_id: str, anomaly_index: int) -> None:
    """第三步：顺着一条异常往回查（含人工反馈 + 处理时间线）

    示例：
      fewshot-sampler trace Bxxxxxxxx abcdef123456
      fewshot-sampler trace Bxxxxxxxx abcdef123456 -i 1   # 看该记录的第2条异常
    """
    storage_root = ctx.obj["storage_root"]
    audit = AuditTrail(storage_root)

    with console.status("[bold]追溯中..."):
        node = audit.trace_anomaly(batch_id, record_id, anomaly_index)

    panel = Panel(
        node.render(),
        title=f"[bold]异常追溯链条[/bold] · {batch_id}/{record_id}#{anomaly_index + 1}",
        border_style="cyan",
    )
    console.print(panel)


@main.command()
@click.argument("batch_id")
@click.argument("record_id")
@click.option("--anomaly-index", "-i", default=None, type=int, help="关联该记录下第几条异常（可选）")
@click.option("--status", "-t", type=click.Choice(["pending", "confirmed", "false", "needinfo", "resolved"]),
              default="pending", show_default=True,
              help="状态: pending待审核 / confirmed确认异常 / false误报 / needinfo待补充 / resolved已处理")
@click.option("--comment", "-c", required=True, help="处理意见（怎么判断的）")
@click.option("--resolution", "-r", default="", help="处理结论（怎么修的/为什么不管）")
@click.option("--handler", "-u", default="", help="处理人姓名/工号")
@click.option("--tag", multiple=True, help="标签，可重复 -t 重要 -t 数据质量")
@click.pass_context
def feedback(
    ctx: click.Context,
    batch_id: str,
    record_id: str,
    anomaly_index: Optional[int],
    status: str,
    comment: str,
    resolution: str,
    handler: str,
    tag: tuple,
) -> None:
    """第四步：录入人工反馈 / 审核意见

    状态说明：
      pending   = 待审核（默认）
      confirmed = 确认异常（确实是问题）
      false     = 误报（系统标错了，没问题）
      needinfo  = 待补充信息（需要业务同事确认）
      resolved  = 已处理（修完了/决定忽略）

    示例：
      fewshot-sampler feedback Bxxx rec001 -t confirmed \\
          -c "确实缺少单位，合同里是万元" -r "已让运营补录" -u 张三
    """
    storage_root = ctx.obj["storage_root"]
    status_map = {
        "pending": FeedbackStatus.PENDING,
        "confirmed": FeedbackStatus.CONFIRMED_ANOMALY,
        "false": FeedbackStatus.FALSE_POSITIVE,
        "needinfo": FeedbackStatus.NEEDS_MORE_INFO,
        "resolved": FeedbackStatus.RESOLVED,
    }
    fb_status = status_map[status]

    storage = RecordStorage(storage_root)
    meta = storage.get_batch_meta(batch_id)
    if not meta:
        console.print(f"[red]未找到批次 {batch_id}[/red]")
        sys.exit(1)

    records = storage.load_records(batch_id)
    found = any(r.get("record_id") == record_id for r in records)
    if not found:
        console.print(f"[red]批次 {batch_id} 中未找到记录 {record_id}[/red]")
        sys.exit(1)

    mgr = FeedbackManager(storage_root)
    entry = mgr.add_feedback(
        batch_id=batch_id,
        record_id=record_id,
        status=fb_status,
        comment=comment,
        handler=handler,
        resolution=resolution,
        anomaly_index=anomaly_index,
        tags=list(tag),
    )

    storage.log_playback(
        batch_id=batch_id,
        record_id=record_id,
        action=f"人工反馈({fb_status.label})",
        user=handler,
        note=comment[:80],
    )

    if fb_status in (FeedbackStatus.CONFIRMED_ANOMALY, FeedbackStatus.FALSE_POSITIVE):
        decision = "拦截（确认异常）" if fb_status == FeedbackStatus.CONFIRMED_ANOMALY else "放行（误报）"
        storage.log_intercept(
            batch_id=batch_id,
            record_id=record_id,
            anomaly_type="人工审核结论",
            decision=decision,
            user=handler,
            reason=resolution[:200] or comment[:200],
        )

    table = Table(title="反馈已保存", show_header=False, box=None)
    table.add_column(style="cyan", width=14)
    table.add_column(style="white")
    table.add_row("反馈编号", entry.feedback_id)
    table.add_row("状态", fb_status.label)
    table.add_row("处理人", entry.handler or "(未填)")
    table.add_row("处理意见", entry.comment)
    if entry.resolution:
        table.add_row("处理结论", entry.resolution)
    if entry.tags:
        table.add_row("标签", "、".join(entry.tags))
    console.print(table)


@main.command()
@click.argument("batch_id")
@click.argument("output_file", type=click.Path(dir_okay=False))
@click.option("--format", "-f", "fmt", type=click.Choice(["xlsx", "csv"]), default="xlsx", show_default=True,
              help="导出格式：xlsx（推荐，多sheet）/ csv（仅明细）")
@click.pass_context
def export(ctx: click.Context, batch_id: str, output_file: str, fmt: str) -> None:
    """第五步：导出结果给不懂代码的同事看

    推荐 xlsx 格式，包含 5 个工作表：总览 / 抽样明细 / 异常清单 / 人工反馈 / 截断说明 / 处理时间线

    示例：
      fewshot-sampler export Bxxx 结果报告-Q2.xlsx
      fewshot-sampler export Bxxx quick_view.csv -f csv
    """
    storage_root = ctx.obj["storage_root"]
    storage = RecordStorage(storage_root)
    meta = storage.get_batch_meta(batch_id)
    if not meta:
        console.print(f"[red]未找到批次 {batch_id}[/red]")
        sys.exit(1)

    exporter = ResultExporter(storage_root)

    with console.status(f"[bold]正在导出 {fmt.upper()} ..."):
        if fmt == "xlsx":
            path = exporter.export_batch_excel(batch_id, output_file)
        else:
            records = storage.load_records(batch_id)
            from fewshot_sampler.schemas import SampleBatch
            batch = SampleBatch(batch_id=batch_id)
            for rd in records:
                batch.records.append(
                    SampleRecord(
                        record_id=rd["record_id"],
                        batch_id=batch_id,
                        source_row_index=rd["source_row_index"],
                        source_file=rd["source_file"],
                        data=rd["data"],
                        anomalies=[],
                        anomaly_score=rd["anomaly_score"],
                    )
                )
            path = exporter.export_sample_csv(batch, output_file)

    size_kb = Path(path).stat().st_size / 1024
    console.print(Panel(
        f"文件：[bold cyan]{path}[/bold cyan]\n大小：{size_kb:.1f} KB\n\n"
        f"[dim]xlsx 内容说明：[/dim]\n"
        f"  0-总览：一眼看到整体情况\n"
        f"  1-抽样明细：每行一条数据，含最重要的业务字段\n"
        f"  2-异常清单：每条异常一行，有处理建议列（直接给同事看）\n"
        f"  3-人工反馈：所有审核意见（谁、说了什么、怎么定的）\n"
        f"  4-截断说明：长文本为什么被截断（人话，不是字段缩写）\n"
        f"  5-处理时间线：评测回放和安全拦截共用同一批记录",
        title=f"[bold green]导出成功[/bold green] · {fmt.upper()}",
        border_style="green",
    ))


@main.command()
@click.option("--yes", is_flag=True, help="无需确认直接删除")
@click.argument("batch_id")
@click.pass_context
def delete(ctx: click.Context, batch_id: str, yes: bool) -> None:
    """删除某个批次的所有数据"""
    storage_root = ctx.obj["storage_root"]
    storage = RecordStorage(storage_root)
    meta = storage.get_batch_meta(batch_id)
    if not meta:
        console.print(f"[red]未找到批次 {batch_id}[/red]")
        sys.exit(1)

    if not yes:
        console.print(f"[yellow]即将删除批次：[/yellow]{batch_id}")
        console.print(f"  描述：{meta.description}")
        console.print(f"  记录数：{meta.total_records}")
        if not click.confirm("确认删除？此操作不可恢复", default=False):
            console.print("[dim]已取消[/dim]")
            return

    storage.delete_batch(batch_id)
    console.print(f"[green]✓ 已删除批次 {batch_id}[/green]")


def _zh(src: str) -> str:
    mapping = {
        "random": "随机", "stratified": "分层", "anomaly_score": "异常优先",
        "recent": "最近", "manual": "手动",
    }
    return mapping.get(src, src)


if __name__ == "__main__":
    main(obj={})
