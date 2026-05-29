"""命令行接口 - 报价阶梯反推器"""

import click
import sys
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from .data_loader import DataLoader
from .engine import QuoteBacktester
from .output import OutputFormatter


console = Console()


@click.group()
@click.version_option(version="1.0.0", prog_name="报价阶梯反推器")
def cli():
    """
    报价阶梯反推器 - 从最终报价反查折扣阶梯、审批级别和舍入口径
    
    解决销售经理的痛点：临时改一条记录后，反推原始报价依据。
    """
    pass


@cli.command()
@click.option("--quotes", "-q", required=True, help="报价单文件路径 (CSV/JSON)")
@click.option("--tiers", "-t", required=True, help="折扣阶梯配置文件路径 (CSV/JSON)")
@click.option("--customers", "-c", required=True, help="客户等级配置文件路径 (CSV/JSON)")
@click.option("--approvals", "-a", required=True, help="审批级别配置文件路径 (CSV/JSON)")
@click.option("--mode", "-m", type=click.Choice(["daily", "review"]), default="daily",
              help="运行模式: daily=日常操作(规则反推+误差容忍), review=月底复盘(异常定位+报告导出)")
@click.option("--tolerance", "-tol", default=0.01, help="舍入误差容忍阈值 (元), 默认0.01")
@click.option("--decimal-places", "-d", default=2, help="价格小数位数, 默认2")
@click.option("--output-dir", "-o", default=None, help="报告输出目录, 不指定则仅终端输出")
@click.option("--filter-customer", default=None, help="按客户名称筛选")
@click.option("--filter-salesperson", default=None, help="按销售人员筛选")
@click.option("--only-problems", is_flag=True, help="仅输出有异常/警告的记录")
def backtrace(
    quotes: str, tiers: str, customers: str, approvals: str,
    mode: str, tolerance: float, decimal_places: int,
    output_dir: Optional[str], filter_customer: Optional[str],
    filter_salesperson: Optional[str], only_problems: bool
):
    """
    反推报价记录 - 核心功能
    
    日常模式(daily): 快速反推折扣阶梯、审批级别、舍入口径，适当容忍误差
    复盘模式(review): 深度异常定位，导出详细报告用于月底复盘
    """
    
    if mode == "review" and output_dir is None:
        output_dir = "./reports"
        console.print(f"[yellow]复盘模式自动设置输出目录: {output_dir}[/yellow]")
    
    if mode == "daily":
        tolerance = max(tolerance, 0.05)
        console.print(f"[dim]日常模式，误差容忍放宽至 {tolerance} 元[/dim]")
    elif mode == "review":
        tolerance = min(tolerance, 0.01)
        console.print(f"[dim]复盘模式，误差容忍收紧至 {tolerance} 元[/dim]")
    
    try:
        console.print(Panel.fit(
            Text("📊 报价阶梯反推器 - 开始分析", style="bold blue"),
            border_style="blue"
        ))
        
        with console.status("[bold green]加载数据中..."):
            quote_items = DataLoader.load_quote_items(quotes)
            discount_tiers = DataLoader.load_discount_tiers(tiers)
            customer_levels = DataLoader.load_customer_levels(customers)
            approval_levels = DataLoader.load_approval_levels(approvals)
            
            console.print(f"  ✓ 加载报价单: {len(quote_items)} 条")
            console.print(f"  ✓ 加载折扣阶梯: {len(discount_tiers)} 条")
            console.print(f"  ✓ 加载客户等级: {len(customer_levels)} 条")
            console.print(f"  ✓ 加载审批级别: {len(approval_levels)} 条")
        
        if filter_customer:
            quote_items = [q for q in quote_items if filter_customer in q.customer_name]
            console.print(f"[dim]按客户筛选后剩余: {len(quote_items)} 条[/dim]")
        
        if filter_salesperson:
            quote_items = [q for q in quote_items if filter_salesperson in q.salesperson]
            console.print(f"[dim]按销售人员筛选后剩余: {len(quote_items)} 条[/dim]")
        
        if not quote_items:
            console.print("[red]❌ 没有符合条件的报价记录[/red]")
            sys.exit(1)
        
        with console.status("[bold green]反推分析中..."):
            backtester = QuoteBacktester(
                discount_tiers=discount_tiers,
                customer_levels=customer_levels,
                approval_levels=approval_levels,
                tolerance=tolerance,
                rounding_decimal_places=decimal_places,
                run_mode=mode
            )
            
            results, summary = backtester.backtrace_batch(quote_items)
        
        if only_problems:
            results = [r for r in results if r.anomalies or r.warnings]
            console.print(f"[dim]仅显示问题记录: {len(results)} 条[/dim]")
        
        with console.status("[bold green]生成输出中..."):
            formatter = OutputFormatter(console=console)
            machine_readable = formatter.format_all(
                results=results,
                summary=summary,
                output_dir=output_dir
            )
        
        if summary.records_with_anomalies > 0 and mode == "review":
            sys.exit(2)
        
        if summary.records_with_anomalies > 0:
            console.print(f"\n[yellow]⚠️  发现 {summary.records_with_anomalies} 条异常记录，建议核查[/yellow]")
        else:
            console.print(f"\n[green]✅ 所有记录核查通过[/green]")
            
    except FileNotFoundError as e:
        console.print(f"[red]❌ 文件未找到: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ 执行出错: {e}[/red]")
        import traceback
        console.print(f"[dim]{traceback.format_exc()}[/dim]")
        sys.exit(1)


@cli.command()
@click.option("--tiers", "-t", required=True, help="折扣阶梯配置文件路径")
@click.option("--output-dir", "-o", default="./reports", help="报告输出目录")
def check_tiers(tiers: str, output_dir: str):
    """单独检查折扣阶梯配置 - 快速发现重叠问题"""
    
    try:
        console.print(Panel.fit(
            Text("🔍 折扣阶梯配置检查", style="bold magenta"),
            border_style="magenta"
        ))
        
        discount_tiers = DataLoader.load_discount_tiers(tiers)
        active_tiers = [t for t in discount_tiers if t.is_active]
        
        console.print(f"共加载 {len(discount_tiers)} 条阶梯配置，其中 {len(active_tiers)} 条生效")
        
        from .engine import QuoteBacktester
        
        backtester = QuoteBacktester(
            discount_tiers=discount_tiers,
            customer_levels=[],
            approval_levels=[],
            run_mode="daily"
        )
        
        overlapping_groups = backtester._detect_overlapping_tiers(active_tiers)
        
        if overlapping_groups:
            console.print(f"\n[red]❌ 发现 {len(overlapping_groups)} 组阶梯重叠:[/red]")
            for i, group in enumerate(overlapping_groups, 1):
                tier_names = "、".join(f"「{t.tier_name}」" for t in group)
                console.print(f"  组{i}: {tier_names}")
                for tier in group:
                    max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "∞"
                    console.print(f"    - 「{tier.tier_name}」: [{tier.min_amount:.2f}, {max_str}) 折扣{tier.discount_rate*100:.1f}%")
            
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = output_path / f"阶梯检查报告_{timestamp}.txt"
            
            lines = []
            lines.append("折扣阶梯配置检查报告")
            lines.append("=" * 50)
            lines.append(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            lines.append(f"总阶梯数: {len(discount_tiers)}")
            lines.append(f"生效阶梯数: {len(active_tiers)}")
            lines.append(f"重叠组数: {len(overlapping_groups)}")
            lines.append("")
            lines.append("核心问题：阶梯重叠有没有被拦住？")
            if overlapping_groups:
                lines.append(f"  发现{len(overlapping_groups)}组重叠，未被拦住，需人工处理")
                for i, group in enumerate(overlapping_groups, 1):
                    lines.append(f"  组{i}:")
                    for tier in group:
                        max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "∞"
                        lines.append(f"    - 「{tier.tier_name}」: [{tier.min_amount:.2f}, {max_str}) 折扣{tier.discount_rate*100:.1f}%")
            else:
                lines.append("  无阶梯重叠，配置正常")
            
            with open(report_file, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
            
            console.print(f"\n[green]报告已导出: {report_file}[/green]")
            sys.exit(1)
        else:
            console.print("\n[green]✅ 阶梯配置正常，无重叠[/green]")
            
    except Exception as e:
        console.print(f"[red]❌ 执行出错: {e}[/red]")
        sys.exit(1)


@cli.command()
def init_samples():
    """生成示例数据文件 - 快速开始使用"""
    
    samples_dir = Path("./sample_data")
    samples_dir.mkdir(parents=True, exist_ok=True)
    
    quote_samples = [
        {
            "item_name": "企业版SaaS服务",
            "item_code": "SAAS-ENT-001",
            "list_price": 12000.00,
            "final_price": 9600.00,
            "quantity": 1,
            "customer_name": "腾讯科技",
            "customer_level_raw": "战略客户",
            "salesperson": "张三",
            "approval_level_raw": "销售总监",
            "quoted_discount": 0.20,
            "notes": "年度合同"
        },
        {
            "item_name": "企业版SaaS服务",
            "item_code": "SAAS-ENT-001",
            "list_price": 12000.00,
            "final_price": 10200.00,
            "quantity": 1,
            "customer_name": "阿里巴巴",
            "customer_level_raw": "VIP客户",
            "salesperson": "李四",
            "approval_level_raw": "销售经理",
            "quoted_discount": 0.15,
            "notes": "季度合同"
        },
        {
            "item_name": "基础版SaaS服务",
            "item_code": "SAAS-BASE-001",
            "list_price": 3000.00,
            "final_price": 2850.00,
            "quantity": 2,
            "customer_name": "创业公司A",
            "customer_level_raw": "普通客户",
            "salesperson": "王五",
            "approval_level_raw": "销售代表",
            "quoted_discount": 0.05,
            "notes": "月度合同"
        },
        {
            "item_name": "企业版SaaS服务",
            "item_code": "SAAS-ENT-001",
            "list_price": 12000.00,
            "final_price": 7800.00,
            "quantity": 3,
            "customer_name": "字节跳动",
            "customer_level_raw": "战略客户",
            "salesperson": "张三",
            "approval_level_raw": "销售经理",
            "quoted_discount": 0.35,
            "notes": "越权审批测试案例"
        },
        {
            "item_name": "专业版SaaS服务",
            "item_code": "SAAS-PRO-001",
            "list_price": 6000.00,
            "final_price": 5099.99,
            "quantity": 1,
            "customer_name": "美团点评",
            "customer_level_raw": "VIP客户",
            "salesperson": "李四",
            "approval_level_raw": "销售经理",
            "quoted_discount": 0.15,
            "notes": "舍入误差测试案例"
        }
    ]
    
    tier_samples = [
        {
            "tier_name": "小额散单档",
            "min_amount": 0,
            "max_amount": 5000,
            "discount_rate": 0.05,
            "required_approval_level": "销售代表",
            "applicable_customer_levels": "普通客户,VIP客户,战略客户"
        },
        {
            "tier_name": "普通订单档",
            "min_amount": 5000,
            "max_amount": 20000,
            "discount_rate": 0.15,
            "required_approval_level": "销售经理",
            "applicable_customer_levels": "普通客户,VIP客户,战略客户"
        },
        {
            "tier_name": "大额订单档",
            "min_amount": 15000,
            "max_amount": 50000,
            "discount_rate": 0.20,
            "required_approval_level": "销售总监",
            "applicable_customer_levels": "VIP客户,战略客户"
        },
        {
            "tier_name": "战略客户档",
            "min_amount": 20000,
            "max_amount": "",
            "discount_rate": 0.30,
            "required_approval_level": "总经理",
            "applicable_customer_levels": "战略客户"
        }
    ]
    
    customer_samples = [
        {
            "level_name": "普通客户",
            "level_code": "C001",
            "base_discount_rate": 0.05,
            "max_allowed_discount_rate": 0.10,
            "description": "新注册或消费较少的客户"
        },
        {
            "level_name": "VIP客户",
            "level_code": "C002",
            "base_discount_rate": 0.10,
            "max_allowed_discount_rate": 0.20,
            "description": "有一定消费历史的优质客户"
        },
        {
            "level_name": "战略客户",
            "level_code": "C003",
            "base_discount_rate": 0.20,
            "max_allowed_discount_rate": 0.35,
            "description": "重点合作的大客户"
        }
    ]
    
    approval_samples = [
        {
            "level_name": "销售代表",
            "level_order": 1,
            "max_discount_allowed": 0.10,
            "max_amount_allowed": 5000,
            "approver_title": "销售代表"
        },
        {
            "level_name": "销售经理",
            "level_order": 2,
            "max_discount_allowed": 0.20,
            "max_amount_allowed": 20000,
            "approver_title": "销售经理"
        },
        {
            "level_name": "销售总监",
            "level_order": 3,
            "max_discount_allowed": 0.30,
            "max_amount_allowed": 50000,
            "approver_title": "销售总监"
        },
        {
            "level_name": "总经理",
            "level_order": 4,
            "max_discount_allowed": 0.50,
            "max_amount_allowed": "",
            "approver_title": "总经理"
        }
    ]
    
    import csv
    import json
    
    for name, data, fields in [
        ("报价单示例", quote_samples, ["item_name", "item_code", "list_price", "final_price", 
                                        "quantity", "customer_name", "customer_level_raw",
                                        "salesperson", "approval_level_raw", "quoted_discount", "notes"]),
        ("折扣阶梯示例", tier_samples, ["tier_name", "min_amount", "max_amount", "discount_rate",
                                          "required_approval_level", "applicable_customer_levels"]),
        ("客户等级示例", customer_samples, ["level_name", "level_code", "base_discount_rate",
                                             "max_allowed_discount_rate", "description"]),
        ("审批级别示例", approval_samples, ["level_name", "level_order", "max_discount_allowed",
                                              "max_amount_allowed", "approver_title"])
    ]:
        csv_file = samples_dir / f"{name}.csv"
        with open(csv_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(data)
        
        json_file = samples_dir / f"{name}.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        console.print(f"[green]✓ 已生成: {csv_file} 和 {json_file}[/green]")
    
    console.print()
    console.print(Panel.fit(
        Text("📋 下一步操作建议", style="bold green"),
        border_style="green"
    ))
    console.print("1. 日常模式（快速反推）:")
    console.print("   [cyan]python -m quote_backtester backtrace -q sample_data/报价单示例.csv -t sample_data/折扣阶梯示例.csv -c sample_data/客户等级示例.csv -a sample_data/审批级别示例.csv -m daily[/cyan]")
    console.print()
    console.print("2. 复盘模式（导出报告）:")
    console.print("   [cyan]python -m quote_backtester backtrace -q sample_data/报价单示例.csv -t sample_data/折扣阶梯示例.csv -c sample_data/客户等级示例.csv -a sample_data/审批级别示例.csv -m review -o ./reports[/cyan]")
    console.print()
    console.print("3. 单独检查阶梯配置:")
    console.print("   [cyan]python -m quote_backtester check-tiers -t sample_data/折扣阶梯示例.csv[/cyan]")


def main():
    cli()


if __name__ == "__main__":
    main()
