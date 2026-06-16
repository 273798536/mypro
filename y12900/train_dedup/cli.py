"""训练集近重复清洗 CLI 入口"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from . import __version__
from .dedup import run_dedup
from .io_utils import (
    load_samples,
    write_report,
    write_samples_csv,
    write_samples_jsonl,
)
from .leakage import detect_leakage, filter_leaked
from .safety import build_report_lines, safety_gate, trace_source, format_source_trace
from .versioning import VersionManager

console = Console()


@click.group()
@click.version_option(__version__, prog_name="train-dedup")
def cli() -> None:
    """训练集近重复清洗 CLI - AI/ML 工作流工具

    负责样本去重、版本追踪、训练验证泄漏检测与安全拦截。
    """
    pass


@cli.command()
@click.argument("input_files", nargs=-1, type=click.Path(exists=True))
@click.option("--threshold", "-t", default=0.85, show_default=True, help="近重复相似度阈值")
@click.option("--review-threshold", default=0.95, show_default=True,
              help="待复核阈值：组内平均相似度低于此值时标记为待人工复核")
@click.option("--method", "-m", type=click.Choice(["hybrid", "jaccard", "sequence", "exact"]),
              default="hybrid", show_default=True, help="去重算法")
@click.option("--output", "-o", type=click.Path(), default="dedup_result.csv", show_default=True, help="输出 CSV 路径")
@click.option("--format", "fmt", type=click.Choice(["csv", "jsonl"]), default="csv", show_default=True, help="输出格式")
@click.option("--report", "-r", type=click.Path(), default=None, help="生成可读报告文件")
@click.option("--no-batch", is_flag=True, help="禁用 TF-IDF 批量模式，强制两两比较")
@click.option("--keep-strategy", type=click.Choice(["first", "longest", "newest"]),
              default="first", show_default=True, help="保留策略")
@click.option("--by-split/--no-by-split", default=True, show_default=True,
              help="按 split 分组去重（推荐），跨 split 的相似会被视为泄漏而非重复")
@click.option("--require-source-ref", is_flag=True, help="要求所有样本必须有来源引用")
def dedup(
    input_files,
    threshold,
    review_threshold,
    method,
    output,
    fmt,
    report,
    no_batch,
    keep_strategy,
    by_split,
    require_source_ref,
) -> None:
    """对训练样本执行近重复检测与清洗"""
    if not input_files:
        console.print("[red]错误: 请指定至少一个输入文件[/red]")
        sys.exit(1)

    console.print(f"[bold cyan]训练集近重复清洗[/bold cyan] v{__version__}")
    console.print(f"输入文件: {len(input_files)} 个")
    console.print(f"算法: {method} | 阈值: {threshold} | 复核阈值: {review_threshold}")
    console.print(f"保留策略: {keep_strategy} | 按 split 分组: {by_split}")

    samples = load_samples(input_files)
    console.print(f"共加载 [bold]{len(samples)}[/bold] 条样本")

    result = run_dedup(
        samples,
        threshold=threshold,
        review_threshold=review_threshold,
        method=method,
        use_tfidf_batch=not no_batch,
        keep_strategy=keep_strategy,
        by_split=by_split,
    )

    all_samples = result.all_samples
    gate = safety_gate(
        all_samples,
        operator="cli-dedup",
        require_source_ref=require_source_ref,
    )

    table = Table(title="去重结果总览")
    table.add_column("类别", style="cyan")
    table.add_column("数量", justify="right", style="bold")
    table.add_row("✅ 可直接使用（clean）", str(len(result.clean_samples)))
    table.add_row("⚠️  待复核（needs_review）", str(len(result.needs_review_samples)))
    table.add_row("🔁 近重复（duplicate）", str(len(result.duplicate_samples)))
    table.add_row("❌ 坏数据（bad）", str(len(result.bad_samples)))
    table.add_row("📝 去重记录", str(len(result.dedup_records)))
    console.print(table)

    if fmt == "csv":
        write_samples_csv(all_samples, output)
    else:
        write_samples_jsonl(all_samples, output)
    console.print(f"💾 结果已写入 [green]{output}[/green]")

    if report:
        lines = build_report_lines(gate, include_content=True)
        write_report(lines, report)
        console.print(f"📄 报告已写入 [green]{report}[/green]")
    else:
        lines = build_report_lines(gate, include_content=False)
        console.print("\n".join(lines))


@cli.command()
@click.argument("input_files", nargs=-1, type=click.Path(exists=True))
@click.option("--threshold", "-t", default=0.80, show_default=True, help="泄漏相似度阈值")
@click.option("--output", "-o", type=click.Path(), default="leakage_result.csv", show_default=True,
              help="输出 CSV 路径（标注泄漏状态）")
@click.option("--report", "-r", type=click.Path(), default=None, help="生成可读报告文件")
@click.option("--filter-output", "-f", type=click.Path(), default=None,
              help="过滤泄漏后的安全样本输出路径")
@click.option("--remove-from", type=click.Choice(["val", "train", "both"]), default="val",
              show_default=True, help="从哪一侧移除泄漏样本")
def leakage(
    input_files,
    threshold,
    output,
    report,
    filter_output,
    remove_from,
) -> None:
    """检测训练集与验证/测试集之间的数据泄漏"""
    if not input_files:
        console.print("[red]错误: 请指定至少一个输入文件[/red]")
        sys.exit(1)

    console.print("[bold cyan]训练验证泄漏检测[/bold cyan]")
    console.print(f"阈值: {threshold} | 移除策略: 从 {remove_from} 移除泄漏")

    samples = load_samples(input_files)
    console.print(f"共加载 [bold]{len(samples)}[/bold] 条样本")

    train_count = sum(1 for s in samples if s.split.value == "train")
    val_count = sum(1 for s in samples if s.split.value in ("val", "test"))
    console.print(f"训练集: {train_count} | 验证/测试集: {val_count}")

    result = detect_leakage(samples, threshold=threshold)

    for s in samples:
        for rec in result.leakage_records:
            if s.sample_id == rec.train_sample_id:
                s.metadata["leakage_flag"] = "train"
                s.metadata["leakage_reason"] = (
                    f"与验证样本 {rec.val_sample_id} 相似度 {rec.similarity}"
                )
            if s.sample_id == rec.val_sample_id:
                s.metadata["leakage_flag"] = "val"
                s.metadata["leakage_reason"] = (
                    f"与训练样本 {rec.train_sample_id} 相似度 {rec.similarity}"
                )

    table = Table(title="泄漏检测结果")
    table.add_column("项目", style="cyan")
    table.add_column("数量", justify="right", style="bold")
    table.add_row("⚠️  泄漏样本对", str(len(result.leakage_records)))
    table.add_row("✅ 安全训练样本", str(len(result.safe_train_samples)))
    table.add_row("✅ 安全验证样本", str(len(result.safe_val_samples)))
    console.print(table)

    write_samples_csv(samples, output)
    console.print(f"💾 标注结果已写入 [green]{output}[/green]")

    if filter_output:
        safe = filter_leaked(samples, remove_from=remove_from)
        write_samples_csv(safe, filter_output)
        console.print(f"🔒 过滤后 {len(safe)} 条安全样本已写入 [green]{filter_output}[/green]")

    if report:
        lines = ["=" * 70, "训练验证泄漏检测报告", "=" * 70]
        lines.append(f"泄漏对数量: {len(result.leakage_records)}")
        lines.append(f"安全训练样本: {len(result.safe_train_samples)}")
        lines.append(f"安全验证样本: {len(result.safe_val_samples)}")
        lines.append("-" * 70)
        for rec in result.leakage_records:
            lines.append(
                f"  train={rec.train_sample_id} <-> val={rec.val_sample_id} "
                f"sim={rec.similarity} ({rec.method})"
            )
        write_report(lines, report)
        console.print(f"📄 报告已写入 [green]{report}[/green]")


@cli.group()
def version() -> None:
    """数据集版本管理（查看/创建/对比）"""
    pass


@version.command("init")
@click.option("--repo", "-r", type=click.Path(), default="./dedup_repo", show_default=True,
              help="版本仓库目录")
@click.argument("input_files", nargs=-1, type=click.Path(exists=True))
@click.option("--description", "-d", default="初始版本", show_default=True, help="版本描述")
def version_init(repo, input_files, description) -> None:
    """初始化版本仓库并创建首个版本"""
    if not input_files:
        console.print("[red]错误: 请指定至少一个输入文件[/red]")
        sys.exit(1)
    samples = load_samples(input_files)
    vm = VersionManager(repo)
    v = vm.create_version(samples, description=description, created_by="cli")
    console.print(f"✅ 版本仓库已初始化: [green]{repo}[/green]")
    console.print(f"   版本 ID: [bold cyan]{v.version_id}[/bold cyan]")
    console.print(f"   样本数: {v.sample_count}")
    console.print(f"   描述: {v.description}")


@version.command("list")
@click.option("--repo", "-r", type=click.Path(), default="./dedup_repo", show_default=True,
              help="版本仓库目录")
def version_list(repo) -> None:
    """列出所有版本"""
    vm = VersionManager(repo)
    versions = vm.list_versions()
    latest = vm.get_latest_version_id()

    if not versions:
        console.print("[yellow]暂无版本记录[/yellow]")
        return

    table = Table(title=f"版本列表（共 {len(versions)} 个）")
    table.add_column("#", style="dim")
    table.add_column("版本 ID", style="cyan")
    table.add_column("样本数", justify="right")
    table.add_column("描述", style="green")
    table.add_column("创建时间", style="yellow")
    for i, v in enumerate(versions):
        marker = " ⭐" if v["version_id"] == latest else ""
        table.add_row(
            str(i + 1),
            v["version_id"] + marker,
            str(v["sample_count"]),
            v.get("description", ""),
            v.get("created_at", ""),
        )
    console.print(table)


@version.command("snapshot")
@click.option("--repo", "-r", type=click.Path(), default="./dedup_repo", show_default=True,
              help="版本仓库目录")
@click.option("--description", "-d", default="", help="新版本描述")
@click.option("--from-version", default=None, help="基于哪个版本创建（默认最新）")
@click.option("--dedup/--no-dedup", default=True, show_default=True, help="是否执行去重")
@click.option("--check-leakage/--no-check-leakage", default=False, show_default=True,
              help="是否检测训练验证泄漏")
@click.option("--threshold", "-t", default=0.85, show_default=True, help="去重/泄漏阈值")
def version_snapshot(repo, description, from_version, dedup, check_leakage, threshold) -> None:
    """基于现有版本创建新版本快照（可串联去重/泄漏检测）"""
    vm = VersionManager(repo)
    base_id = from_version or vm.get_latest_version_id()
    if not base_id:
        console.print("[red]错误: 没有可用的基线版本，请先 init[/red]")
        sys.exit(1)

    snap = vm.load_version(base_id)
    samples = list(snap.samples)
    dedup_records = list(snap.dedup_records)
    leakage_records = list(snap.leakage_records)
    audit_log = list(snap.audit_log)

    if dedup:
        from .dedup import run_dedup as run_dedup_fn
        result = run_dedup_fn(samples, threshold=threshold)
        samples = result.clean_samples + result.needs_review_samples + result.bad_samples
        dedup_records.extend(result.dedup_records)
        from .safety import safety_gate
        gate = safety_gate(samples, operator="version-snapshot-dedup")
        audit_log.extend(gate.audit_entries)
        console.print(f"🔁 去重完成: clean={len(result.clean_samples)} "
                      f"needs_review={len(result.needs_review_samples)} "
                      f"bad={len(result.bad_samples)}")

    if check_leakage:
        from .leakage import detect_leakage as detect
        leak_result = detect(samples, threshold=threshold)
        leakage_records.extend(leak_result.leakage_records)
        for s in samples:
            for rec in leak_result.leakage_records:
                if s.sample_id in (rec.train_sample_id, rec.val_sample_id):
                    s.metadata["leakage_flag"] = True
                    s.metadata["leakage_reason"] = f"相似度 {rec.similarity}"
        console.print(f"⚠️  泄漏检测完成: {len(leak_result.leakage_records)} 对泄漏")

    v = vm.create_version(
        samples,
        dedup_records=dedup_records,
        leakage_records=leakage_records,
        audit_log=audit_log,
        description=description or f"快照（基于 {base_id}）",
        parent_version_id=base_id,
        created_by="cli-snapshot",
    )
    console.print(f"✅ 新版本已创建: [bold cyan]{v.version_id}[/bold cyan]")
    console.print(f"   样本数: {v.sample_count} | 去重记录: {v.dedup_record_count} | "
                  f"泄漏记录: {v.leakage_record_count}")


@version.command("diff")
@click.option("--repo", "-r", type=click.Path(), default="./dedup_repo", show_default=True,
              help="版本仓库目录")
@click.argument("version_a")
@click.argument("version_b")
def version_diff(repo, version_a, version_b) -> None:
    """对比两个版本的差异"""
    vm = VersionManager(repo)
    diff = vm.diff_versions(version_a, version_b)
    table = Table(title=f"版本对比: {version_a} vs {version_b}")
    table.add_column("项目", style="cyan")
    table.add_column(version_a, justify="right")
    table.add_column(version_b, justify="right")
    table.add_row("样本数", str(diff["sample_count_a"]), str(diff["sample_count_b"]))
    table.add_row("去重记录", str(diff["dedup_count_a"]), str(diff["dedup_count_b"]))
    table.add_row("泄漏记录", str(diff["leakage_count_a"]), str(diff["leakage_count_b"]))
    table.add_row("新增样本", "-", f"[green]+{len(diff['added'])}[/green]")
    table.add_row("移除样本", f"[red]-{len(diff['removed'])}[/red]", "-")
    table.add_row("共同样本", f"[cyan]{len(diff['common'])}[/cyan]", f"[cyan]{len(diff['common'])}[/cyan]")
    console.print(table)


@version.command("export")
@click.option("--repo", "-r", type=click.Path(), default="./dedup_repo", show_default=True,
              help="版本仓库目录")
@click.option("--version-id", "-v", default=None, help="导出的版本 ID（默认最新）")
@click.option("--output", "-o", type=click.Path(), default="exported.csv", show_default=True,
              help="输出文件路径")
@click.option("--format", "fmt", type=click.Choice(["csv", "jsonl"]), default="csv", show_default=True,
              help="输出格式")
@click.option("--status", "-s", multiple=True,
              type=click.Choice(["clean", "needs_review", "bad", "duplicate", "leakage", "all"]),
              default=["clean"], help="只导出指定状态的样本（可多次指定），all 表示全部")
def version_export(repo, version_id, output, fmt, status) -> None:
    """导出版本中的样本"""
    vm = VersionManager(repo)
    vid = version_id or vm.get_latest_version_id()
    if not vid:
        console.print("[red]错误: 没有可用的版本[/red]")
        sys.exit(1)
    snap = vm.load_version(vid)
    samples = snap.samples

    from .safety import classify_sample
    if "all" not in status:
        samples = [s for s in samples if classify_sample(s).value in status]

    if fmt == "csv":
        write_samples_csv(samples, output)
    else:
        write_samples_jsonl(samples, output)

    console.print(f"✅ 已导出 [bold]{len(samples)}[/bold] 条样本到 [green]{output}[/green]")


@cli.command()
@click.argument("input_files", nargs=-1, type=click.Path(exists=True))
@click.option("--threshold", "-t", default=0.85, show_default=True, help="相似度阈值")
@click.option("--review-threshold", default=0.95, show_default=True,
              help="待复核阈值：低于此值的疑似重复组标记为待人工复核")
@click.option("--output", "-o", type=click.Path(), default="final_result.csv", show_default=True,
              help="最终输出")
@click.option("--report", "-r", type=click.Path(), default="safety_report.txt", show_default=True,
              help="安全报告输出")
@click.option("--check-leakage/--no-check-leakage", default=True, show_default=True,
              help="是否同时检测训练验证泄漏")
@click.option("--by-split/--no-by-split", default=True, show_default=True,
              help="按 split 分组去重（推荐）")
def run_pipeline(input_files, threshold, review_threshold, output, report, check_leakage, by_split) -> None:
    """一键流水线：去重 + 泄漏检测 + 安全拦截 + 报告

    按算法产品经理的习惯，训练组拿到结果时能一眼分清：
    - clean：可直接用
    - needs_review：还要找算法产品经理复核
    - bad / duplicate / leakage：已拦截
    """
    if not input_files:
        console.print("[red]错误: 请指定至少一个输入文件[/red]")
        sys.exit(1)

    console.print("[bold cyan]========== 训练集近重复清洗流水线 ==========[/bold cyan]")

    samples = load_samples(input_files)
    console.print(f"📥 加载样本: {len(samples)} 条")

    console.print("\n[bold]Step 1: 近重复检测[/bold]")
    dedup_result = run_dedup(
        samples,
        threshold=threshold,
        review_threshold=review_threshold,
        by_split=by_split,
    )
    console.print(f"  clean: {len(dedup_result.clean_samples)} | "
                  f"needs_review: {len(dedup_result.needs_review_samples)} | "
                  f"duplicate: {len(dedup_result.duplicate_samples)} | "
                  f"bad: {len(dedup_result.bad_samples)}")

    all_samples = dedup_result.all_samples

    if check_leakage:
        console.print("\n[bold]Step 2: 训练验证泄漏检测[/bold]")
        leak_result = detect_leakage(all_samples, threshold=threshold)
        for s in all_samples:
            for rec in leak_result.leakage_records:
                if s.sample_id == rec.train_sample_id:
                    s.metadata["leakage_flag"] = "train"
                    s.metadata["leakage_reason"] = (
                        f"泄漏: 与验证样本 {rec.val_sample_id} 相似度 {rec.similarity}"
                    )
                if s.sample_id == rec.val_sample_id:
                    s.metadata["leakage_flag"] = "val"
                    s.metadata["leakage_reason"] = (
                        f"泄漏: 与训练样本 {rec.train_sample_id} 相似度 {rec.similarity}"
                    )
        console.print(f"  泄漏对: {len(leak_result.leakage_records)}")

    console.print("\n[bold]Step 3: 安全拦截 + 来源追溯[/bold]")
    gate = safety_gate(all_samples, operator="pipeline")
    console.print(f"  passed: {len(gate.passed)} | "
                  f"review: {len(gate.review)} | "
                  f"blocked: {len(gate.blocked)}")

    write_samples_csv(all_samples, output)
    console.print(f"\n💾 最终结果: [green]{output}[/green]")

    lines = build_report_lines(gate, include_content=True)
    write_report(lines, report)
    console.print(f"📄 安全报告: [green]{report}[/green]")

    console.print("\n[bold green]✅ 流水线完成![/bold green]")
    console.print("  训练组使用建议:")
    console.print("  - 标记为 [green]clean[/green] 的样本可直接导入训练流程")
    console.print("  - 标记为 [yellow]needs_review[/yellow] 的样本请找算法产品经理复核")
    console.print("  - 标记为 [red]bad/duplicate/leakage[/red] 的样本已拦截，不会进入训练")


if __name__ == "__main__":
    cli()
