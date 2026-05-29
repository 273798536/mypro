import click
import os
import sys
from pathlib import Path

from .data_loader import load_all_data
from .engine import InsuranceCalculator
from .report import format_terminal_summary, format_human_report, format_machine_readable
from .persistence import ResultPersistence
from . import __version__


@click.group()
@click.version_option(__version__, prog_name="agri-ins")
def main():
    """农险灾损赔付测算命令行工具"""
    pass


@main.command()
@click.option('--farmers', '-f', required=True, type=click.Path(exists=True), help='农户档案文件路径 (YAML/JSON/CSV)')
@click.option('--parcels', '-p', required=True, type=click.Path(exists=True), help='地块图斑文件路径 (YAML/JSON)')
@click.option('--signatures', '-s', required=True, type=click.Path(exists=True), help='签字表文件路径 (YAML/JSON/CSV)')
@click.option('--no-dedup', is_flag=True, help='不执行面积去重')
@click.option('--output-dir', '-o', default='output', type=click.Path(), help='输出目录，默认 ./output')
@click.option('--show-traces', '-t', 'show_traces_flag', is_flag=True, help='显示详细溯源追踪')
@click.option('--save-output/--no-save-output', default=True, help='是否保存输出文件')
@click.option('--human-report', default=None, type=click.Path(), help='人类可读报告输出路径')
@click.option('--machine-json', default=None, type=click.Path(), help='机器可读JSON输出路径')
def calculate(farmers, parcels, signatures, no_dedup, output_dir, show_traces_flag, save_output, human_report, machine_json):
    """执行农险灾损赔付测算"""
    try:
        click.echo(click.style("▶ 正在加载数据...", fg="cyan"))
        farmers_data, parcels_data, signatures_data = load_all_data(farmers, parcels, signatures)
        click.echo(click.style(f"  ✓ 加载农户档案: {len(farmers_data)} 户", fg="green"))
        click.echo(click.style(f"  ✓ 加载地块图斑: {len(parcels_data)} 块", fg="green"))
        click.echo(click.style(f"  ✓ 加载签字表: {len(signatures_data)} 份", fg="green"))

        click.echo(click.style("\n▶ 正在执行测算...", fg="cyan"))
        calculator = InsuranceCalculator(
            farmers_data,
            parcels_data,
            signatures_data,
            apply_dedup=not no_dedup
        )
        result = calculator.run()
        click.echo(click.style("  ✓ 测算完成", fg="green"))

        click.echo("\n" + "=" * 60)
        format_terminal_summary(result, show_traces=show_traces_flag)

        if save_output:
            click.echo(click.style("\n▶ 正在保存输出文件...", fg="cyan"))
            persistence = ResultPersistence(output_dir=output_dir)
            paths = persistence.save_all(result)

            if human_report:
                format_human_report(result, human_report)
                paths['custom_report'] = human_report
            if machine_json:
                format_machine_readable(result, machine_json)
                paths['custom_json'] = machine_json

            click.echo(click.style("  ✓ 已生成以下文件:", fg="green"))
            for key, path in paths.items():
                click.echo(f"    - {key}: {path}")

        if result.level_changes:
            click.echo(click.style(f"\n⚠  检测到 {len(result.level_changes)} 处等级变更，请查看 output 目录下的 level_changes_*.csv 文件", fg="yellow"))

        if result.dedup_results:
            click.echo(click.style(f"⚠  检测到 {len(result.dedup_results)} 处图斑重叠，已自动去重，请查看待办事项", fg="yellow"))

        if result.missing_signatures:
            click.echo(click.style(f"⚠  检测到 {len(result.missing_signatures)} 份缺失签字的记录，请联系村干部补签", fg="red"))

        if result.action_items:
            click.echo(click.style(f"\n📋 共有 {len(result.action_items)} 项待办事项，详见 actions_*.csv 文件", fg="yellow"))

        return result

    except Exception as e:
        click.echo(click.style(f"\n✗ 执行失败: {str(e)}", fg="red"))
        import traceback
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.option('--result', '-r', required=True, type=click.Path(exists=True), help='机器可读JSON结果文件路径')
@click.option('--filter-status', type=click.Choice(['待审核', '已核实', '有争议', '已驳回', '已通过']), help='按凭证状态筛选')
@click.option('--filter-farmer', help='按农户姓名筛选')
@click.option('--show-traces', '-t', is_flag=True, help='显示详细溯源')
def view(result, filter_status, filter_farmer, show_traces):
    """查看已保存的测算结果"""
    from .persistence import ResultPersistence

    try:
        persistence = ResultPersistence()
        calc_result = persistence.load_result(result)

        if filter_status or filter_farmer:
            from .models import CalculationResult, VoucherRecord
            filtered_vouchers = []
            for v in calc_result.vouchers:
                if filter_status and v.status.value != filter_status:
                    continue
                if filter_farmer and filter_farmer not in v.farmer_name:
                    continue
                filtered_vouchers.append(v)
            calc_result.vouchers = filtered_vouchers
            calc_result.total_farmers = len(filtered_vouchers)

        format_terminal_summary(calc_result, show_traces=show_traces)

    except Exception as e:
        click.echo(click.style(f"✗ 查看失败: {str(e)}", fg="red"))
        sys.exit(1)


@main.command()
@click.option('--result', '-r', required=True, type=click.Path(exists=True), help='机器可读JSON结果文件路径')
@click.option('--output', '-o', default='output', type=click.Path(), help='输出目录')
def export(result, output):
    """从已有结果重新导出所有文件"""
    from .persistence import ResultPersistence

    try:
        click.echo(click.style("▶ 正在重新导出文件...", fg="cyan"))
        persistence = ResultPersistence(output_dir=output)
        calc_result = persistence.load_result(result)
        paths = persistence.save_all(calc_result)

        click.echo(click.style("  ✓ 已重新生成以下文件:", fg="green"))
        for key, path in paths.items():
            click.echo(f"    - {key}: {path}")

    except Exception as e:
        click.echo(click.style(f"✗ 导出失败: {str(e)}", fg="red"))
        sys.exit(1)


@main.command()
@click.option('--result', '-r', required=True, type=click.Path(exists=True), help='机器可读JSON结果文件路径')
def list_changes(result):
    """查看等级变更记录"""
    from .persistence import ResultPersistence
    from rich.console import Console
    from rich.table import Table

    try:
        persistence = ResultPersistence()
        calc_result = persistence.load_result(result)

        console = Console()

        if not calc_result.level_changes:
            click.echo(click.style("未检测到等级变更记录", fg="green"))
            return

        table = Table(title="等级变更记录", show_header=True, header_style="bold yellow")
        table.add_column("农户", style="cyan")
        table.add_column("原等级")
        table.add_column("→")
        table.add_column("新等级")
        table.add_column("变更原因")
        table.add_column("责任方")
        table.add_column("需修改文件")

        for lc in calc_result.level_changes:
            table.add_row(
                lc.farmer_name,
                lc.original_level.value,
                "→",
                f"[bold]{lc.new_level.value}[/bold]",
                lc.reason,
                lc.action_item.responsible_person,
                lc.action_item.file_to_modify
            )

        console.print(table)
        console.print(f"\n共 {len(calc_result.level_changes)} 处等级变更")

    except Exception as e:
        click.echo(click.style(f"✗ 查询失败: {str(e)}", fg="red"))
        sys.exit(1)


@main.command()
def sample_paths():
    """显示样例数据路径"""
    sample_dir = Path(__file__).parent.parent.parent / "samples"
    click.echo("样例数据位于:")
    click.echo(f"  农户档案: {sample_dir / 'farmers.yaml'}")
    click.echo(f"  地块图斑: {sample_dir / 'parcels.yaml'}")
    click.echo(f"  签字表:   {sample_dir / 'signatures.yaml'}")
    click.echo("\n使用样例数据运行:")
    click.echo(f"  agri-ins calculate -f {sample_dir / 'farmers.yaml'} -p {sample_dir / 'parcels.yaml'} -s {sample_dir / 'signatures.yaml'}")


if __name__ == '__main__':
    main()
