"""CLI入口 - 简洁命令:导入/计算/报告/历史"""
from __future__ import annotations

import json
import sys
from datetime import date, datetime
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import __version__
from .models import (
    Bond, BondMetrics, CorrectionRecord, Rating, ScenarioConfig,
    SourceInfo, YieldCurve, YieldCurvePoint,
)
from .pricer import BondPricer
from .anomaly import AnomalyDetector
from .attribution import AttributionAnalyzer, ScenarioRunner
from .report import ReportGenerator
from .storage import DataStore

console = Console()
store = DataStore()


def _print_banner():
    console.print(Panel.fit(
        f"[bold blue]债券久期敏感性分析 CLI[/bold blue]  v{__version__}\n"
        "[dim]快速定位拖累最大的券 | 现金流折现 | 情景对比 | 异常标记[/dim]",
        border_style="blue",
    ))


# ──────────────────────────────────────────────────────
# 主命令组
# ──────────────────────────────────────────────────────

@click.group()
@click.version_option(__version__, prog_name="bdcli")
def main():
    """债券久期敏感性分析工具"""
    pass


# ──────────────────────────────────────────────────────
# 导入命令: 导入样例/曲线/持仓
# ──────────────────────────────────────────────────────

@main.group("import")
def import_cmd():
    """导入数据"""
    pass


@import_cmd.command("sample")
def import_sample():
    """导入样例组合与收益率曲线"""
    _print_banner()

    source = SourceInfo(
        source_name="样例组合",
        source_type="sample",
        description="内置演示用债券组合与收益率曲线",
    )
    store.save_source(source)

    bonds = _sample_bonds()
    store.save_bonds(bonds, source.source_id)

    curve = _sample_curve()
    store.save_curve(curve, source.source_id)

    console.print(f"[green]✓ 样例导入成功[/green]")
    console.print(f"  来源ID: {source.source_id}")
    console.print(f"  债券数量: {len(bonds)}")
    console.print(f"  曲线: {curve.name} ({curve.curve_id})")


def _sample_bonds() -> list[Bond]:
    today = date.today()
    return [
        Bond(
            bond_id="CN001", name="24国开01", issuer="国开行",
            face_value=100, coupon_rate=0.023, coupon_frequency=1,
            issue_date=date(today.year - 1, 1, 5),
            maturity_date=date(today.year + 9, 1, 5),
            rating=Rating.AAA, position=50_000_000,
        ),
        Bond(
            bond_id="CN002", name="23农发05", issuer="农发行",
            face_value=100, coupon_rate=0.0265, coupon_frequency=1,
            issue_date=date(today.year - 2, 5, 10),
            maturity_date=date(today.year + 3, 5, 10),
            rating=Rating.AAA, position=30_000_000,
        ),
        Bond(
            bond_id="CN003", name="22进出10", issuer="进出口行",
            face_value=100, coupon_rate=0.0305, coupon_frequency=2,
            issue_date=date(today.year - 3, 10, 20),
            maturity_date=date(today.year + 6, 10, 20),
            rating=Rating.AAA, position=40_000_000,
        ),
        Bond(
            bond_id="CN004", name="21万科01", issuer="万科",
            face_value=100, coupon_rate=0.038, coupon_frequency=1,
            issue_date=date(today.year - 4, 3, 15),
            maturity_date=date(today.year + 1, 3, 15),
            rating=Rating.AA_PLUS, position=20_000_000,
        ),
        Bond(
            bond_id="CN005", name="20中铁可续期债", issuer="中铁集团",
            face_value=100, coupon_rate=0.042, coupon_frequency=1,
            issue_date=date(today.year - 5, 7, 1),
            maturity_date=date(today.year + 5, 7, 1),
            embedded_option="callable",
            call_date=date(today.year + 0, 7, 1),
            rating=Rating.AAA, position=25_000_000,
        ),
    ]


def _sample_curve() -> YieldCurve:
    return YieldCurve(
        name="国债收益率曲线",
        currency="CNY",
        as_of_date=date.today(),
        points=[
            YieldCurvePoint(tenor="1M", days=30, yield_rate=0.0145),
            YieldCurvePoint(tenor="3M", days=91, yield_rate=0.0168),
            YieldCurvePoint(tenor="6M", days=182, yield_rate=0.0192),
            YieldCurvePoint(tenor="1Y", days=365, yield_rate=0.0215),
            YieldCurvePoint(tenor="2Y", days=730, yield_rate=0.0238),
            YieldCurvePoint(tenor="3Y", days=1095, yield_rate=0.0252),
            YieldCurvePoint(tenor="5Y", days=1825, yield_rate=0.0271),
            YieldCurvePoint(tenor="7Y", days=2555, yield_rate=0.0285),
            YieldCurvePoint(tenor="10Y", days=3650, yield_rate=0.0298),
            YieldCurvePoint(tenor="15Y", days=5475, yield_rate=0.0315),
            YieldCurvePoint(tenor="20Y", days=7300, yield_rate=0.0328),
            YieldCurvePoint(tenor="30Y", days=10950, yield_rate=0.0342),
        ],
    )


# ──────────────────────────────────────────────────────
# 计算命令
# ──────────────────────────────────────────────────────

@main.command()
@click.option("--curve-id", "-c", default=None, help="收益率曲线ID(默认使用最新)")
@click.option("--portfolio-id", "-p", default=None, help="组合来源ID(默认使用最新)")
@click.option("--scenario", "-s", is_flag=True, help="启用情景对比")
@click.option("--top", "-t", default=5, help="显示Top N拖累券")
def calc(curve_id, portfolio_id, scenario, top):
    """计算组合久期与归因"""
    _print_banner()

    # 自动选最新数据
    if not portfolio_id:
        portfolios = store.list_portfolios()
        if not portfolios:
            console.print("[red]✗ 没有找到组合数据,请先运行 `bdcli import sample`[/red]")
            return
        portfolio_id = portfolios[0]["source_id"]
        console.print(f"[dim]自动选择组合: {portfolio_id}[/dim]")

    if not curve_id:
        curves = store.list_curves()
        if not curves:
            console.print("[red]✗ 没有找到收益率曲线[/red]")
            return
        curve_id = curves[0]["curve_id"]
        console.print(f"[dim]自动选择曲线: {curve_id}[/dim]")

    # 加载数据
    bonds = store.load_bonds(portfolio_id)
    curve = store.load_curve(curve_id)
    if not bonds or not curve:
        console.print("[red]✗ 数据加载失败[/red]")
        return

    # 计算
    console.print(f"\n[blue]━ 正在计算...[/blue]")

    if scenario:
        scenarios = [
            ScenarioConfig(name="rate_up_25bp", shift_bp=25),
            ScenarioConfig(name="rate_up_100bp", shift_bp=100),
            ScenarioConfig(name="rate_down_50bp", shift_bp=-50),
        ]
        results = ScenarioRunner.run_comparison(bonds, curve, scenarios)
        for r in results:
            store.save_result({
                "result_id": r.result_id,
                "created_at": r.created_at.isoformat(),
                "scenario_name": r.scenario_name,
                "curve_id": r.curve_id,
                "portfolio": {
                    "total_pv": r.portfolio.total_pv,
                    "total_dv01": r.portfolio.total_dv01,
                    "weighted_duration": r.portfolio.weighted_duration,
                },
            })
        _print_scenario_table(results, top)
    else:
        pricer = BondPricer(curve)
        metrics = {b.bond_id: pricer.price_bond(b) for b in bonds}
        detector = AnomalyDetector(curve)
        anomalies = detector.detect_all(bonds, metrics)
        attribution = AttributionAnalyzer(bonds, metrics).compute()

        result = {
            "result_id": f"RES_{datetime.now():%Y%m%d_%H%M%S}",
            "created_at": datetime.now().isoformat(),
            "scenario_name": "base",
            "curve_id": curve_id,
            "bond_metrics": {k: json.loads(v.json()) for k, v in metrics.items()},
            "portfolio": json.loads(attribution.json()),
            "anomalies": anomalies,
        }
        store.save_result(result)
        _print_result(bonds, metrics, attribution, anomalies, top)


def _print_result(bonds, metrics, attribution, anomalies, top_n):
    bond_map = {b.bond_id: b for b in bonds}

    # 组合摘要
    t = Table(title="组合摘要", show_header=False)
    t.add_column("指标", style="cyan")
    t.add_column("数值", justify="right")
    t.add_row("总PV", f"{attribution.total_pv:,.2f} 元")
    t.add_row("总DV01", f"{attribution.total_dv01:,.2f} 元/bp")
    t.add_row("加权久期", f"{attribution.weighted_duration:.4f} 年")
    t.add_row("加权凸性", f"{attribution.weighted_convexity:.4f}")
    console.print(t)

    # 拖累最大的券
    t2 = Table(title=f"Top {top_n} 久期拖累最大")
    t2.add_column("排名", justify="center")
    t2.add_column("代码")
    t2.add_column("名称")
    t2.add_column("久期", justify="right")
    t2.add_column("DV01", justify="right")
    t2.add_column("贡献", justify="right")
    for item in attribution.worst_contributors[:top_n]:
        style = "red" if item["rank"] <= 3 else ""
        t2.add_row(
            str(item["rank"]), item["bond_id"], item["name"],
            f"{item['modified_duration']:.2f}",
            f"{item['dv01']:,.0f}",
            f"{item['contribution_pct']:.1f}%",
            style=style,
        )
    console.print(t2)

    # 异常提示
    if anomalies:
        err_count = sum(1 for a in anomalies if a["severity"] == "error")
        warn_count = sum(1 for a in anomalies if a["severity"] == "warning")
        console.print(f"\n[bold yellow]⚠ 发现 {err_count} 个错误, {warn_count} 个警告:[/bold yellow]")
        for a in anomalies:
            color = "red" if a["severity"] == "error" else "yellow"
            console.print(f"  [{color}]●[/{color}] [{a['severity']}] {a['message']}")


def _print_scenario_table(results, top_n):
    t = Table(title="情景对比")
    t.add_column("情景", style="cyan")
    t.add_column("总PV", justify="right")
    t.add_column("总DV01", justify="right")
    t.add_column("加权久期", justify="right")
    for r in results:
        style = "red" if r.scenario_name == "base" else ""
        t.add_row(
            r.scenario_name,
            f"{r.portfolio.total_pv:,.0f}",
            f"{r.portfolio.total_dv01:,.0f}",
            f"{r.portfolio.weighted_duration:.4f}",
            style=style,
        )
    console.print(t)


# ──────────────────────────────────────────────────────
# 报告命令
# ──────────────────────────────────────────────────────

@main.command()
@click.option("--result-id", "-r", default=None, help="结果ID")
@click.option("--output", "-o", default="reports", help="输出目录")
@click.option("--format", "-f", "fmt", default="all", help="格式: csv/json/all")
def report(result_id, output, fmt):
    """导出分析报告"""
    _print_banner()

    if not result_id:
        results = store.list_results()
        if not results:
            console.print("[red]✗ 没有计算结果,请先运行 `bdcli calc`[/red]")
            return
        result_id = results[0]["result_id"]
        console.print(f"[dim]自动选择结果: {result_id}[/dim]")

    result_data = store.load_result(result_id)
    if not result_data:
        console.print("[red]✗ 结果不存在[/red]")
        return

    # 找对应的债券
    portfolios = store.list_portfolios()
    bonds = store.load_bonds(portfolios[0]["source_id"]) if portfolios else []

    gen = ReportGenerator(output_dir=output)
    exported = []

    if fmt in ("csv", "all"):
        if "bond_metrics" not in result_data:
            console.print("[yellow]! 该结果为情景对比结果,仅支持JSON导出[/yellow]")
        else:
            from .models import AnalysisResult, PortfolioSummary, BondMetrics
            metrics = {k: BondMetrics(**v) for k, v in result_data["bond_metrics"].items()}
            portfolio = PortfolioSummary(**result_data["portfolio"])
            result_obj = AnalysisResult(
                result_id=result_id,
                created_at=datetime.fromisoformat(result_data["created_at"]),
                scenario_name=result_data["scenario_name"],
                curve_id=result_data["curve_id"],
                bond_metrics=metrics,
                portfolio=portfolio,
                anomalies=result_data.get("anomalies", []),
            )
            exported.append(gen.export_metrics_csv(result_obj, bonds))
            exported.append(gen.export_summary_csv(result_obj, bonds))
            exported.append(gen.export_anomalies_csv(result_obj))

    if fmt in ("json", "all"):
        exported.append(Path(output) / f"report_{result_id}.json")
        with open(exported[-1], "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)

    if fmt in ("chart", "all"):
        # 简单导出敏感性图(需要多结果对比)
        pass

    console.print(f"[green]✓ 报告已导出到 {output}/[/green]")
    for p in exported:
        console.print(f"  - {p.name}")


# ──────────────────────────────────────────────────────
# 历史命令
# ──────────────────────────────────────────────────────

@main.command()
@click.option("--limit", "-n", default=20, help="显示条数")
def history(limit):
    """查看操作历史"""
    _print_banner()

    hist = store.get_history(limit)
    if not hist:
        console.print("[dim]暂无历史记录[/dim]")
        return

    t = Table(title=f"操作历史 (最近{limit}条)")
    t.add_column("时间")
    t.add_column("类型", style="cyan")
    t.add_column("ID")
    t.add_column("动作")
    for h in reversed(hist[-limit:]):
        t.add_row(
            h["timestamp"][:19], h["type"], h["id"], h["action"],
        )
    console.print(t)


# ──────────────────────────────────────────────────────
# 修正命令
# ──────────────────────────────────────────────────────

@main.command()
@click.argument("target")
@click.argument("field")
@click.argument("old_value")
@click.argument("new_value")
@click.option("--reason", "-r", required=True, help="修正原因")
def correct(target, field, old_value, new_value, reason):
    """记录数据修正(保留痕迹)"""
    _print_banner()

    corr = CorrectionRecord(
        target=target, field=field,
        old_value=old_value, new_value=new_value,
        reason=reason, corrected_by="analyst",
    )
    store.save_correction(corr)
    console.print(f"[green]✓ 修正已记录: {corr.correction_id}[/green]")
    console.print(f"  对象: {target}")
    console.print(f"  字段: {field}")
    console.print(f"  {old_value} → {new_value}")
    console.print(f"  原因: {reason}")


@main.command("list-corrections")
@click.option("--target", "-t", default=None, help="过滤对象")
def list_corrections(target):
    """列出修正记录"""
    _print_banner()
    corrs = store.list_corrections(target)
    if not corrs:
        console.print("[dim]暂无修正记录[/dim]")
        return
    t = Table(title="修正记录")
    t.add_column("时间")
    t.add_column("对象")
    t.add_column("字段")
    t.add_column("原值→新值")
    t.add_column("原因")
    for c in corrs:
        t.add_row(
            c["corrected_at"][:16], c["target"], c["field"],
            f"{c['old_value']} → {c['new_value']}", c["reason"],
        )
    console.print(t)


# ──────────────────────────────────────────────────────
# 列表命令
# ──────────────────────────────────────────────────────

@main.command()
def ls():
    """列出所有数据"""
    _print_banner()

    console.print("\n[bold]组合[/bold]")
    for p in store.list_portfolios():
        console.print(f"  {p['source_id']} ({p['bond_count']}只, {p['total_position']:,.0f}元)")

    console.print("\n[bold]收益率曲线[/bold]")
    for c in store.list_curves():
        console.print(f"  {c['curve_id']} - {c['name']} ({c['as_of_date']})")

    console.print("\n[bold]计算结果[/bold]")
    for r in store.list_results()[:5]:
        console.print(f"  {r['result_id']} - {r['scenario']}, DV01={r['total_dv01']:,.0f}")

    console.print("\n[dim]使用 --help 查看命令详情[/dim]")
