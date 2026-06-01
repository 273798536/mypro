import click
from pathlib import Path

from .models import SimulationConfig
from .data_loader import DataLoader
from .conflict_detector import ConflictDetector
from .simulator import MonteCarloSimulator
from .report_generator import ReportGenerator
from .charts import ChartGenerator


@click.group()
def cli():
    pass


@cli.command()
@click.option("--input-dir", "-i", required=True, help="输入数据目录路径")
@click.option("--output-dir", "-o", required=True, help="输出结果目录路径")
@click.option("--simulations", "-n", default=10000, help="蒙特卡洛模拟次数")
@click.option("--seed", "-s", default=42, help="随机种子")
def run(input_dir, output_dir, simulations, seed):
    click.echo("=" * 70)
    click.echo("  蒙特卡洛亏损沙盘 - 启动")
    click.echo("=" * 70)
    click.echo(f"  输入目录: {input_dir}")
    click.echo(f"  输出目录: {output_dir}")
    click.echo(f"  模拟次数: {simulations}")
    click.echo(f"  随机种子: {seed}")
    click.echo("")

    input_path = Path(input_dir)
    if not input_path.exists():
        click.echo(f"错误: 输入目录不存在 - {input_dir}", err=True)
        return

    click.echo("[1/5] 加载数据...")
    loader = DataLoader(input_dir)
    policies, loss_distributions, expense_rates, deductible_rules = loader.load_all()
    click.echo(f"       - 保单样本: {len(policies)} 条")
    click.echo(f"       - 赔付分布: {len(loss_distributions)} 条")
    click.echo(f"       - 费用率配置: {len(expense_rates)} 条")
    click.echo(f"       - 免赔规则: {len(deductible_rules)} 条")

    click.echo("[2/5] 冲突检测与留痕...")
    detector = ConflictDetector()
    conflicts, timeline = detector.detect_all_conflicts(
        policies, loss_distributions, expense_rates, deductible_rules
    )
    click.echo(f"       - 发现冲突: {len(conflicts)} 个")

    click.echo("[3/5] 执行蒙特卡洛模拟...")
    config = SimulationConfig(
        num_simulations=simulations,
        random_seed=seed,
    )
    simulator = MonteCarloSimulator(config)
    result = simulator.run_simulation(
        policies, loss_distributions, expense_rates, deductible_rules
    )
    click.echo(f"       - 完成 {simulations} 次模拟")

    click.echo("[4/5] 敏感性分析...")
    sensitivity = simulator.run_sensitivity_analysis(
        policies, loss_distributions, expense_rates, deductible_rules
    )

    click.echo("[5/5] 生成报告和图表...")
    reporter = ReportGenerator(output_dir)
    chart_gen = ChartGenerator(output_dir)

    chart_files = chart_gen.generate_all_charts(
        result, sensitivity, policies, loss_distributions
    )
    click.echo(f"       - 生成图表: {len(chart_files)} 张")

    report = reporter.generate_full_report(
        result,
        conflicts,
        timeline,
        policies,
        loss_distributions,
        expense_rates,
        deductible_rules,
        sensitivity,
        chart_files,
    )

    console_summary = reporter.generate_console_summary(
        result,
        conflicts,
        timeline,
        policies,
        loss_distributions,
        expense_rates,
        deductible_rules,
    )

    click.echo("")
    click.echo(console_summary)
    click.echo("")
    click.echo(f"完整报告已保存至: {output_dir}/simulation_report.json")
    click.echo(f"图表已保存至: {output_dir}/charts/")


@cli.command()
@click.option("--output-dir", "-o", required=True, help="示例数据输出目录")
def init_example(output_dir):
    click.echo("生成示例数据...")
    import json
    import csv
    from datetime import datetime, timedelta

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    policies = [
        {
            "policy_id": f"POL{i:04d}",
            "insured_amount": 1_000_000 + (i % 10) * 500_000,
            "policy_type": "车险" if i % 2 == 0 else "企财险",
            "effective_date": "2026-01-01T00:00:00",
            "expiry_date": "2027-01-01T00:00:00",
            "region": "北京" if i % 3 == 0 else "上海",
            "industry": "金融" if i % 2 == 0 else "制造",
            "deductible": 5000 if i % 2 == 0 else 10000,
            "limit": 5_000_000,
        }
        for i in range(1, 51)
    ]

    with open(output_path / "policies.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=policies[0].keys())
        writer.writeheader()
        writer.writerows(policies)

    loss_distributions = [
        {
            "policy_type": "车险",
            "distribution_type": "lognormal",
            "params": {"mean": 8.0, "sigma": 1.5},
            "sample_size": 50,
            "confidence_level": 0.95,
        },
        {
            "policy_type": "企财险",
            "distribution_type": "lognormal",
            "params": {"mean": 10.0, "sigma": 2.5},
            "sample_size": 500,
            "confidence_level": 0.95,
        },
    ]

    with open(output_path / "loss_distributions.json", "w", encoding="utf-8") as f:
        json.dump(loss_distributions, f, ensure_ascii=False, indent=2)

    expense_rates = [
        {
            "policy_type": "车险",
            "expense_rate": 0.25,
            "acquisition_cost": 0.15,
            "administrative_cost": 0.10,
        },
        {
            "policy_type": "企财险",
            "expense_rate": 0.20,
            "acquisition_cost": 0.12,
            "administrative_cost": 0.08,
        },
    ]

    with open(output_path / "expense_rates.json", "w", encoding="utf-8") as f:
        json.dump(expense_rates, f, ensure_ascii=False, indent=2)

    effective_dt = datetime.now() - timedelta(days=30)
    received_dt = effective_dt + timedelta(hours=12)

    deductible_rules = [
        {
            "policy_type": "车险",
            "deductible_amount": 5000,
            "effective_date": effective_dt.isoformat(),
            "received_date": received_dt.isoformat(),
        },
        {
            "policy_type": "企财险",
            "deductible_amount": 20000,
            "effective_date": effective_dt.isoformat(),
            "received_date": effective_dt.isoformat(),
        },
    ]

    with open(output_path / "deductible_rules.json", "w", encoding="utf-8") as f:
        json.dump(deductible_rules, f, ensure_ascii=False, indent=2)

    click.echo(f"示例数据已生成至: {output_dir}")
    click.echo("")
    click.echo("文件清单:")
    click.echo("  - policies.csv          (50条保单样本)")
    click.echo("  - loss_distributions.json  (2类赔付分布)")
    click.echo("  - expense_rates.json       (2类费用率)")
    click.echo("  - deductible_rules.json    (2类免赔规则, 车险晚到12小时)")
    click.echo("")
    click.echo("使用示例:")
    click.echo(f"  mc-sandbox run -i {output_dir} -o ./results")


def main():
    cli()


if __name__ == "__main__":
    main()
