"""CLI 主入口 - 试剂盒批间差分析日常工具

用法：
    kit-batch run --input ./input --output ./output
    kit-batch init-samples --dir ./input
    kit-batch show-state --output ./output
"""

import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console

from .config import AppConfig
from .data_loader import DataLoader
from .validation import ValidationEngine
from .idempotency import IdempotencyOrchestrator
from .review import ReviewIntegrator, AnomalyClassifier
from .exporter import ReportExporter
from . import console_ui
from . import sample_data

console = Console()


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(package_name="kit-batch-analysis", prog_name="kit-batch")
def main() -> None:
    """🧪 试剂盒批间差分析 - 实验室日常工具版

    打开即用，处理试剂台账/反应时间漏记/空白对照缺失等日常问题。
    同一批材料重复运行不会越跑越乱，批次追踪可持续判断。
    """
    pass


@main.command("run")
@click.option("--input", "-i", "input_dir", type=click.Path(path_type=Path, file_okay=False),
              default=Path("./input"), show_default=True,
              help="输入目录（放试剂台账/实验记录/称量单/反应时间/温度曲线 Excel）")
@click.option("--output", "-o", "output_dir", type=click.Path(path_type=Path, file_okay=False),
              default=Path("./output"), show_default=True,
              help="输出目录（报告/异常清单/复核清单/状态文件）")
@click.option("--config", "-c", "config_path", type=click.Path(path_type=Path, dir_okay=False),
              default=None,
              help="可选：自定义 YAML 配置文件路径")
@click.option("--verbose/--quiet", default=True, show_default=True,
              help="是否输出详细过程")
def run_analysis(input_dir: Path, output_dir: Path,
                 config_path: Optional[Path], verbose: bool) -> None:
    """运行批间差分析（日常工具入口）"""
    try:
        cfg = AppConfig.load(config_path)
        cfg.input_dir = Path(input_dir).resolve()
        cfg.output_dir = Path(output_dir).resolve()
        cfg.output_dir.mkdir(parents=True, exist_ok=True)

        if verbose:
            ts = cfg.output_dir / "config_effective.yaml"
            try:
                import yaml
                with open(ts, "w", encoding="utf-8") as f:
                    yaml.safe_dump(cfg.to_dict(), f, allow_unicode=True, sort_keys=False)
            except Exception:
                pass

        _run_pipeline(cfg, verbose=verbose)
    except Exception as e:
        console.print(f"[bold red]❌ 运行失败：[/bold red]{type(e).__name__}: {e}")
        if "--verbose" in sys.argv or "-v" in sys.argv:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def _run_pipeline(cfg: AppConfig, verbose: bool = True) -> None:
    from datetime import datetime

    # ── 1. 加载数据 ─────────────────────────────────────
    loader = DataLoader(cfg)
    dataset = loader.load_all()
    ts = dataset.analysis_timestamp.strftime("%Y-%m-%d %H:%M:%S")

    if verbose:
        console_ui.print_header(dataset.analysis_run_id, ts)

    # ── 2. 幂等 + 批次追踪：前置恢复 ───────────────────
    orchestrator = IdempotencyOrchestrator(cfg, dataset)
    pre_info = orchestrator.run_pre_analysis()

    if verbose:
        console_ui.print_load_summary(
            len(dataset.reagent_ledgers),
            len(dataset.experiment_records),
            len(dataset.weighing_sheets),
            len(dataset.reaction_times),
            len(dataset.temp_curves),
            len(dataset.get_batch_numbers()),
            pre_info.get("historical_runs", 0),
            pre_info.get("fresh_supplements", {}),
        )

    # ── 3. 核心校验引擎 ────────────────────────────────
    engine = ValidationEngine(cfg, dataset)
    engine.run_all()

    # ── 4. 幂等：去重 + 批次追踪：刷新 + 保存状态 ─────
    post_info = orchestrator.run_post_analysis()

    # ── 5. 复核整合 + 异常分类 ─────────────────────────
    integrator = ReviewIntegrator(cfg, dataset)
    checklist = integrator.build()

    classifier = AnomalyClassifier(dataset)
    class_result = classifier.classify()

    # ── 6. 控制台输出 ──────────────────────────────────
    if verbose:
        console_ui.print_anomaly_dashboard(
            class_result.get("total_unresolved", 0),
            class_result.get("total_resolved", 0),
            class_result.get("by_severity", {}),
            class_result.get("by_action", {}),
            (post_info.get("anomaly_original", 0), post_info.get("anomaly_deduped", 0)),
        )
        console_ui.print_per_batch(checklist)
        console_ui.print_blank_control_blocking_detail(dataset)
        console_ui.print_cv_summary(dataset.cv_results)
        console_ui.print_next_step_hints(pre_info.get("fresh_supplements", {}))

    # ── 7. 报告导出 ────────────────────────────────────
    exporter = ReportExporter(cfg, dataset)
    out_paths = exporter.export_all(
        checklist=checklist,
        classifier_result=class_result,
        fresh_supplements=pre_info.get("fresh_supplements", {}),
    )

    if verbose:
        console_ui.print_output_paths(out_paths)
        console_ui.print_footer(
            batch_count=len(dataset.get_batch_numbers()),
            unresolved_count=class_result.get("total_unresolved", 0),
        )


@main.command("init-samples")
@click.option("--dir", "-d", "target_dir",
              type=click.Path(path_type=Path, file_okay=False),
              default=Path("./input"), show_default=True,
              help="生成样例数据的目标目录")
@click.option("--scenario", "-s",
              type=click.Choice(["typical", "blank-missing", "all-ok", "temp-issues"],
                                case_sensitive=False),
              default="typical", show_default=True,
              help="样例场景：typical=典型问题组合 / blank-missing=空白对照缺失 / all-ok=全通过 / temp-issues=温度曲线超差")
def init_samples(target_dir: Path, scenario: str) -> None:
    """生成样例数据（实验记录+称量单+反应时间+试剂台账+温度曲线）"""
    target = Path(target_dir).resolve()
    target.mkdir(parents=True, exist_ok=True)
    paths = sample_data.generate_samples(target, scenario=scenario)
    console.print(f"[green]✅ 样例数据已生成至：[/green]{target}")
    names = {
        "reagent_ledger": "试剂台账",
        "experiment_record": "实验记录",
        "reaction_time": "反应时间",
        "weighing_sheet": "称量单",
        "temp_curve": "温度曲线",
    }
    for k, p in paths.items():
        console.print(f"  · {names.get(k, k)} → [cyan]{p}[/cyan]")
    console.print()
    console.print(f"[dim]💡 下一步运行：[/dim] kit-batch run -i {target} -o {target.parent / 'output'}")


@main.command("show-state")
@click.option("--output", "-o", "output_dir",
              type=click.Path(path_type=Path, file_okay=False),
              default=Path("./output"), show_default=True,
              help="状态文件所在的输出目录")
def show_state(output_dir: Path) -> None:
    """显示输出目录中的批次追踪状态概览"""
    import json
    state_path = Path(output_dir).resolve() / ".analysis_state.json"
    if not state_path.exists():
        console.print(f"[yellow]⚠️  未找到状态文件：[/yellow]{state_path}")
        console.print("[dim]提示：先运行 kit-batch run 生成分析结果[/dim]")
        return
    try:
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)
    except json.JSONDecodeError:
        console.print(f"[red]❌ 状态文件损坏：[/red]{state_path}")
        return
    from rich.table import Table
    from rich.panel import Panel
    runs = state.get("runs", [])
    bts = state.get("batch_tracking", {})
    anom = state.get("anomalies", {})
    t = Table(title=f"状态概览 · {state_path}", box=console_ui.box.ROUNDED,
              header_style="bold blue")
    t.add_column("维度")
    t.add_column("数值", justify="right")
    t.add_row("历史分析轮次", str(len(runs)))
    t.add_row("最近一次 Run", state.get("last_run_id", "-"))
    t.add_row("最近分析时间", state.get("last_run_timestamp", "-"))
    t.add_row("追踪中的批次", str(len(bts)))
    t.add_row("已知异常签名", str(len(anom)))
    console.print(Panel(t, border_style="cyan", expand=False))
    if bts:
        bt = Table(title="批次追踪明细", box=console_ui.box.SIMPLE,
                   header_style="bold magenta")
        bt.add_column("批次号", style="cyan")
        bt.add_column("试剂盒")
        bt.add_column("分析次数", justify="right")
        bt.add_column("当前状态", overflow="fold")
        bt.add_column("复测建议", overflow="fold")
        for bn, info in sorted(bts.items()):
            bt.add_row(
                bn,
                info.get("kit_name", ""),
                str(info.get("analysis_count", 0)),
                info.get("current_status", ""),
                "、".join(info.get("recheck_suggestions", [])) or "-",
            )
        console.print(bt)


if __name__ == "__main__":
    main()
