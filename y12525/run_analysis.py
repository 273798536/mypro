#!/usr/bin/env python3
import click
import sys
from pathlib import Path

from monte_carlo_inventory.pipeline import run_full_analysis


@click.command()
@click.option('--sales', required=True, type=click.Path(exists=True), help='销售历史Excel文件路径')
@click.option('--supply', required=True, type=click.Path(exists=True), help='供应周期Excel文件路径')
@click.option('--inventory', required=True, type=click.Path(exists=True), help='库存状态Excel文件路径')
@click.option('--sku', required=True, help='SKU编号')
@click.option('--output', default='./output', show_default=True, type=click.Path(), help='输出目录')
@click.option('--simulations', default=5000, show_default=True, type=int, help='蒙特卡洛模拟次数')
@click.option('--horizon', default=90, show_default=True, type=int, help='预测周期（天）')
@click.option('--service-level', default=0.95, show_default=True, type=float, help='目标服务水平')
@click.option('--seed', default=42, show_default=True, type=int, help='随机种子')
@click.option('--sales-sheet', default=0, show_default=True, help='销售数据表名或索引')
@click.option('--supply-sheet', default=0, show_default=True, help='供应数据表名或索引')
@click.option('--inventory-sheet', default=0, show_default=True, help='库存数据表名或索引')
def main(
    sales, supply, inventory, sku, output,
    simulations, horizon, service_level, seed,
    sales_sheet, supply_sheet, inventory_sheet
):
    """蒙特卡洛库存风险分析系统 - 命令行接口"""
    
    try:
        analysis = run_full_analysis(
            sales_file=sales,
            supply_file=supply,
            inventory_file=inventory,
            sku=sku,
            output_dir=output,
            n_simulations=simulations,
            horizon_days=horizon,
            service_level_target=service_level,
            random_seed=seed,
            sales_sheet=sales_sheet,
            supply_sheet=supply_sheet,
            inventory_sheet=inventory_sheet
        )
        return 0 if analysis.classification is not None else 1
    except Exception as e:
        click.echo(f"\n❌ 运行出错: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
