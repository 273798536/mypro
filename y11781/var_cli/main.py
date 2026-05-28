import click
import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

from .validator import DataValidator
from .calculator import VaRCalculator
from .reporter import ReportGenerator


def load_returns(file_path: str) -> pd.DataFrame:
    """加载收益率数据"""
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path, index_col=0, parse_dates=True)
    elif file_path.endswith('.xlsx') or file_path.endswith('.xls'):
        df = pd.read_excel(file_path, index_col=0, parse_dates=True)
    else:
        raise ValueError(f"不支持的文件格式: {file_path}")
    
    df.index = df.index.strftime('%Y-%m-%d')
    return df


def load_weights(file_path: str) -> Dict[str, float]:
    """加载资产权重"""
    if file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    elif file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
        return dict(zip(df.iloc[:, 0], df.iloc[:, 1]))
    else:
        raise ValueError(f"不支持的文件格式: {file_path}")


def load_stress_days(file_path: str) -> List[str]:
    """加载压力日列表"""
    if file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    elif file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
        return df.iloc[:, 0].astype(str).tolist()
    else:
        raise ValueError(f"不支持的文件格式: {file_path}")


def save_scheme(output_dir: str, config: Dict, results: Dict, 
               validation_result: Dict) -> str:
    """保存计算方案"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    scheme_path = os.path.join(output_dir, f"scheme_{timestamp}.json")
    
    scheme_data = {
        "version": "1.0",
        "timestamp": timestamp,
        "created_at": datetime.now().isoformat(),
        "config": config,
        "validation_result": validation_result,
        "results": {
            "historical_simulation": {
                "method": results['hs_result'].method,
                "confidence_level": results['hs_result'].confidence_level,
                "window_days": results['hs_result'].window_days,
                "var_value": results['hs_result'].var_value,
                "var_percent": results['hs_result'].var_percent,
                "portfolio_value": results['hs_result'].portfolio_value,
                "expected_shortfall": results['hs_result'].expected_shortfall,
                "details": results['hs_result'].details,
                "source_trace": results['hs_result'].source_trace
            },
            "parametric": {
                "method": results['param_result'].method,
                "confidence_level": results['param_result'].confidence_level,
                "window_days": results['param_result'].window_days,
                "var_value": results['param_result'].var_value,
                "var_percent": results['param_result'].var_percent,
                "portfolio_value": results['param_result'].portfolio_value,
                "expected_shortfall": results['param_result'].expected_shortfall,
                "details": results['param_result'].details,
                "source_trace": results['param_result'].source_trace
            }
        }
    }
    
    with open(scheme_path, 'w', encoding='utf-8') as f:
        json.dump(scheme_data, f, ensure_ascii=False, indent=2)
    
    return scheme_path


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """风险价值VaR试算 CLI工具
    
    用于演示不同置信度和历史窗口对VaR结果的影响
    """
    pass


@cli.command()
@click.option('--input-dir', '-i', default='./input', help='输入数据目录')
@click.option('--output-dir', '-o', default='./output', help='输出结果目录')
@click.option('--returns', '-r', default='returns.csv', help='收益率数据文件名')
@click.option('--weights', '-w', default='weights.json', help='资产权重文件名')
@click.option('--confidence', '-c', type=float, default=0.95, help='置信度 (0-1)')
@click.option('--window', '-d', type=int, default=252, help='历史窗口天数')
@click.option('--portfolio-value', '-p', type=float, default=1000000, help='组合市值')
@click.option('--stress-days', '-s', default=None, help='压力日文件名')
@click.option('--no-charts', is_flag=True, help='不生成图表')
@click.option('--force', '-f', is_flag=True, help='忽略验证错误继续计算')
def calculate(input_dir, output_dir, returns, weights, confidence, window, 
              portfolio_value, stress_days, no_charts, force):
    """计算VaR并生成报告"""
    
    click.echo("\n" + "="*60)
    click.echo("           风险价值 (VaR) 试算工具")
    click.echo("="*60 + "\n")
    
    returns_path = os.path.join(input_dir, returns)
    weights_path = os.path.join(input_dir, weights)
    
    if not os.path.exists(returns_path):
        click.echo(f"❌ 收益率文件不存在: {returns_path}", err=True)
        return
    
    if not os.path.exists(weights_path):
        click.echo(f"❌ 权重文件不存在: {weights_path}", err=True)
        return
    
    click.echo(f"📂 输入目录: {input_dir}")
    click.echo(f"📂 输出目录: {output_dir}")
    click.echo(f"📊 收益率数据: {returns}")
    click.echo(f"⚖️  资产权重: {weights}")
    click.echo(f"📈 置信度: {confidence:.2%}")
    click.echo(f"📅 历史窗口: {window} 天")
    click.echo(f"💰 组合市值: {portfolio_value:,.0f} 元")
    click.echo("")
    
    returns_df = load_returns(returns_path)
    weights_dict = load_weights(weights_path)
    
    stress_days_list = None
    if stress_days:
        stress_path = os.path.join(input_dir, stress_days)
        if os.path.exists(stress_path):
            stress_days_list = load_stress_days(stress_path)
            click.echo(f"🔴 压力日: {len(stress_days_list)} 天")
        else:
            click.echo(f"⚠️  压力日文件不存在: {stress_path}")
    
    click.echo(f"\n✅ 数据加载完成:")
    click.echo(f"   - 收益率: {returns_df.shape[0]} 天 × {returns_df.shape[1]} 资产")
    click.echo(f"   - 资产: {list(returns_df.columns)}")
    click.echo(f"   - 日期范围: {returns_df.index[0]} 至 {returns_df.index[-1]}")
    
    validator = DataValidator()
    validation_result = validator.validate_all(
        returns_df, weights_dict, confidence, window, stress_days_list
    )
    validator.print_validation_report(validation_result)
    
    if not validation_result["is_valid"] and not force:
        click.echo("❌ 存在验证错误，使用 --force 选项可强制继续计算")
        return
    
    click.echo("🔄 开始计算VaR...")
    
    calculator = VaRCalculator(portfolio_value=portfolio_value)
    
    hs_result = calculator.historical_simulation(
        returns_df, weights_dict, confidence, window, stress_days_list
    )
    
    param_result = calculator.parametric(
        returns_df, weights_dict, confidence, window
    )
    
    click.echo("\n" + "-"*60)
    click.echo("📊 VaR 计算结果")
    click.echo("-"*60)
    
    click.echo("\n  【历史模拟法】")
    click.echo(f"    VaR (绝对): {hs_result.var_value:,.2f} 元")
    click.echo(f"    VaR (相对): {hs_result.var_percent:.4f}%")
    click.echo(f"    期望亏空: {hs_result.expected_shortfall:,.2f} 元")
    
    click.echo("\n  【参数法】")
    click.echo(f"    VaR (绝对): {param_result.var_value:,.2f} 元")
    click.echo(f"    VaR (相对): {param_result.var_percent:.4f}%")
    click.echo(f"    期望亏空: {param_result.expected_shortfall:,.2f} 元")
    
    diff_pct = abs(hs_result.var_value - param_result.var_value) / hs_result.var_value * 100
    click.echo(f"\n  【方法差异】: {diff_pct:.2f}%")
    
    reporter = ReportGenerator(output_dir)
    
    config = {
        "portfolio_value": portfolio_value,
        "confidence_level": confidence,
        "window_days": window,
        "weights": weights_dict,
        "stress_days": stress_days_list
    }
    
    report_path = reporter.generate_text_report(
        hs_result, param_result, validation_result, config
    )
    click.echo(f"\n📄 文本报告已生成: {report_path}")
    
    if not no_charts:
        click.echo("📈 正在生成图表...")
        chart_paths = reporter.generate_charts(
            returns_df, weights_dict, hs_result, param_result, config
        )
        for name, path in chart_paths.items():
            click.echo(f"   ✓ {name}: {path}")
    
    results = {
        "hs_result": hs_result,
        "param_result": param_result
    }
    scheme_path = save_scheme(output_dir, config, results, validation_result)
    click.echo(f"💾 方案已保存: {scheme_path}")
    
    click.echo("\n" + "="*60)
    click.echo("✅ 计算完成！所有结果已保存到输出目录")
    click.echo("="*60 + "\n")


@cli.command()
@click.option('--input-dir', '-i', default='./input', help='输入数据目录')
@click.option('--output-dir', '-o', default='./output', help='输出结果目录')
@click.option('--returns', '-r', default='returns.csv', help='收益率数据文件名')
@click.option('--weights', '-w', default='weights.json', help='资产权重文件名')
@click.option('--portfolio-value', '-p', type=float, default=1000000, help='组合市值')
@click.option('--stress-days', '-s', default=None, help='压力日文件名')
def sensitivity(input_dir, output_dir, returns, weights, portfolio_value, stress_days):
    """敏感性分析：不同窗口和置信度的VaR对比"""
    
    click.echo("\n" + "="*60)
    click.echo("        VaR 敏感性分析 (多参数对比)")
    click.echo("="*60 + "\n")
    
    returns_path = os.path.join(input_dir, returns)
    weights_path = os.path.join(input_dir, weights)
    
    returns_df = load_returns(returns_path)
    weights_dict = load_weights(weights_path)
    
    stress_days_list = None
    if stress_days:
        stress_path = os.path.join(input_dir, stress_days)
        if os.path.exists(stress_path):
            stress_days_list = load_stress_days(stress_path)
    
    windows = [60, 120, 252, 504]
    confidences = [0.90, 0.95, 0.99, 0.999]
    
    results = []
    
    with click.progressbar(windows, label='计算不同窗口...') as bar:
        for window in bar:
            if window > len(returns_df):
                continue
            for conf in confidences:
                calculator = VaRCalculator(portfolio_value=portfolio_value)
                hs = calculator.historical_simulation(
                    returns_df, weights_dict, conf, window
                )
                param = calculator.parametric(
                    returns_df, weights_dict, conf, window
                )
                
                results.append({
                    "window": window,
                    "confidence": conf,
                    "hs_var": hs.var_value,
                    "hs_var_pct": hs.var_percent,
                    "param_var": param.var_value,
                    "param_var_pct": param.var_percent,
                    "diff_pct": abs(hs.var_value - param.var_value) / hs.var_value * 100
                })
    
    click.echo("\n" + "-"*80)
    click.echo(f"{'窗口':>6} {'置信度':>8} {'历史模拟VaR(%)':>16} {'参数法VaR(%)':>14} {'差异(%)':>10}")
    click.echo("-"*80)
    
    for r in results:
        click.echo(
            f"{r['window']:>6} {r['confidence']:>8.1%} "
            f"{r['hs_var_pct']:>16.4f} {r['param_var_pct']:>14.4f} "
            f"{r['diff_pct']:>10.2f}"
        )
    
    output_path = os.path.join(output_dir, f"sensitivity_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    pd.DataFrame(results).to_csv(output_path, index=False)
    click.echo(f"\n💾 敏感性分析结果已保存: {output_path}")
    click.echo("")


@cli.command()
@click.argument('scheme_file')
def show(scheme_file):
    """查看历史方案详情"""
    
    if not os.path.exists(scheme_file):
        click.echo(f"❌ 方案文件不存在: {scheme_file}", err=True)
        return
    
    with open(scheme_file, 'r', encoding='utf-8') as f:
        scheme = json.load(f)
    
    click.echo("\n" + "="*60)
    click.echo("           VaR 计算方案详情")
    click.echo("="*60)
    click.echo(f"\n📅 创建时间: {scheme.get('created_at', 'N/A')}")
    click.echo(f"📋 版本: {scheme.get('version', 'N/A')}")
    
    config = scheme.get('config', {})
    click.echo("\n" + "-"*60)
    click.echo("⚙️  配置参数")
    click.echo("-"*60)
    click.echo(f"  组合市值: {config.get('portfolio_value', 0):,.0f} 元")
    click.echo(f"  置信度: {config.get('confidence_level', 0):.2%}")
    click.echo(f"  历史窗口: {config.get('window_days', 0)} 天")
    click.echo(f"  资产权重: {config.get('weights', {})}")
    
    results = scheme.get('results', {})
    hs = results.get('historical_simulation', {})
    param = results.get('parametric', {})
    
    click.echo("\n" + "-"*60)
    click.echo("📊 计算结果")
    click.echo("-"*60)
    
    click.echo("\n  【历史模拟法】")
    click.echo(f"    VaR: {hs.get('var_value', 0):,.2f} 元 ({hs.get('var_percent', 0):.4f}%)")
    click.echo(f"    期望亏空: {hs.get('expected_shortfall', 0):,.2f} 元")
    
    click.echo("\n  【参数法】")
    click.echo(f"    VaR: {param.get('var_value', 0):,.2f} 元 ({param.get('var_percent', 0):.4f}%)")
    click.echo(f"    期望亏空: {param.get('expected_shortfall', 0):,.2f} 元")
    
    click.echo("\n" + "-"*60)
    click.echo("🔍 来源追踪 (历史模拟法)")
    click.echo("-"*60)
    for i, trace in enumerate(hs.get('source_trace', []), 1):
        click.echo(f"  {i}. {trace}")
    
    click.echo("\n" + "="*60 + "\n")


@cli.command()
@click.option('--output-dir', '-o', default='./input', help='示例数据输出目录')
def demo(output_dir):
    """生成示例数据"""
    
    click.echo("\n" + "="*60)
    click.echo("           生成示例数据")
    click.echo("="*60 + "\n")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    dates = pd.date_range(start='2022-01-01', end='2024-12-31', freq='B')
    np.random.seed(42)
    
    n = len(dates)
    returns_data = {
        '股票A': np.random.normal(0.0005, 0.02, n),
        '股票B': np.random.normal(0.0003, 0.015, n),
        '债券C': np.random.normal(0.0001, 0.005, n),
        '商品D': np.random.normal(0.0002, 0.025, n),
    }
    
    crash_idx = dates.get_loc('2022-03-15')
    for key in returns_data:
        returns_data[key][crash_idx] -= 0.08
    
    crash_idx2 = dates.get_loc('2023-09-22')
    for key in returns_data:
        returns_data[key][crash_idx2] -= 0.06
    
    returns_df = pd.DataFrame(returns_data, index=dates)
    returns_df.index = returns_df.index.strftime('%Y-%m-%d')
    
    returns_path = os.path.join(output_dir, 'returns.csv')
    returns_df.to_csv(returns_path)
    click.echo(f"✅ 收益率数据: {returns_path}")
    click.echo(f"   - {len(returns_df)} 天 × {len(returns_df.columns)} 资产")
    
    weights = {
        '股票A': 0.40,
        '股票B': 0.30,
        '债券C': 0.20,
        '商品D': 0.10
    }
    
    weights_path = os.path.join(output_dir, 'weights.json')
    with open(weights_path, 'w', encoding='utf-8') as f:
        json.dump(weights, f, ensure_ascii=False, indent=2)
    click.echo(f"✅ 资产权重: {weights_path}")
    click.echo(f"   - {weights}")
    
    stress_days = ['2022-03-15', '2023-09-22']
    stress_path = os.path.join(output_dir, 'stress_days.json')
    with open(stress_path, 'w', encoding='utf-8') as f:
        json.dump(stress_days, f, ensure_ascii=False, indent=2)
    click.echo(f"✅ 压力日数据: {stress_path}")
    click.echo(f"   - {stress_days}")
    
    click.echo("\n🚀 现在可以运行: var-cli calculate")
    click.echo("   查看更多帮助: var-cli --help")
    click.echo("\n" + "="*60 + "\n")


if __name__ == '__main__':
    cli()
