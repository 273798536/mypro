from typing import Any, Dict, List, Optional, Union
"""CLI entry point for nonlinear pricing fitting tool."""

import os
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path

import click
import numpy as np
import pandas as pd

from .data_loader import DataLoader
from .fitting import PricingFitter
from .anomaly_detection import AnomalyDetector
from .sensitivity import SensitivityAnalyzer
from .correction import CorrectionManager
from .reporting import ReportGenerator


RANDOM_SEED = 42


def set_random_seeds(seed: int = RANDOM_SEED) -> None:
    np.random.seed(seed)
    import random
    random.seed(seed)


def get_run_hash(params: dict, data_hash: str) -> str:
    hash_input = json.dumps(params, sort_keys=True) + data_hash
    return hashlib.md5(hash_input.encode()).hexdigest()[:12]


def load_previous_run(output_dir: Path) -> Optional[Dict]:
    prev_results_file = output_dir / "latest_results.json"
    if prev_results_file.exists():
        with open(prev_results_file) as f:
            return json.load(f)
    return None


def save_results(output_dir: Path, results: dict, run_hash: str) -> None:
    run_dir = output_dir / f"run_{run_hash}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    
    with open(run_dir / "results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    latest_link = output_dir / "latest_results.json"
    if latest_link.exists() or latest_link.is_symlink():
        latest_link.unlink()
    shutil.copy(run_dir / "results.json", latest_link)
    
    results["run_dir"] = str(run_dir)


@click.group()
@click.version_option(version="1.0.0")
def cli() -> None:
    """非线性定价拟合工具 - SaaS商业分析师专用"""
    set_random_seeds()


@cli.command()
@click.option("--input-dir", "-i", required=True, type=click.Path(exists=True, file_okay=False),
              help="输入数据目录，包含套餐价格和转化记录")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False),
              help="输出结果目录")
@click.option("--stage", type=click.Choice(["stage1", "stage2"]), default="stage1",
              help="运行阶段：stage1=仅套餐价格+转化记录，stage2=补充试用时长")
@click.option("--sensitivity-range", default=0.2, type=float,
              help="敏感度分析范围（默认±20%）")
@click.option("--outlier-threshold", default=3.0, type=float,
              help="异常值检测阈值（标准差倍数，默认3.0）")
@click.option("--group-by", default=None, type=str,
              help="分组对比字段，如 customer_segment, region")
@click.option("--force", is_flag=True, help="强制重新运行，即使参数和数据未变化")
def fit(input_dir: str, output_dir: str, stage: str, sensitivity_range: float,
        outlier_threshold: float, group_by: Optional[str], force: bool) -> None:
    """运行非线性定价拟合分析"""
    input_path = Path(input_dir).resolve()
    output_path = Path(output_dir).resolve()
    output_path.mkdir(parents=True, exist_ok=True)
    
    click.echo("=" * 80)
    click.echo("非线性定价拟合分析工具")
    click.echo("=" * 80)
    click.echo(f"运行阶段: {stage}")
    click.echo(f"输入目录: {input_path}")
    click.echo(f"输出目录: {output_path}")
    click.echo(f"敏感度范围: ±{sensitivity_range*100:.0f}%")
    click.echo(f"异常值阈值: {outlier_threshold}σ")
    click.echo("")
    
    params = {
        "stage": stage,
        "sensitivity_range": sensitivity_range,
        "outlier_threshold": outlier_threshold,
        "group_by": group_by,
        "seed": RANDOM_SEED,
        "input_dir": str(input_path),
    }
    
    loader = DataLoader(input_path)
    click.echo("📥 正在加载数据...")
    
    try:
        data = loader.load(stage)
    except Exception as e:
        click.echo(f"❌ 数据加载失败: {e}", err=True)
        raise click.Abort()
    
    data_hash = loader.get_data_hash(stage)
    run_hash = get_run_hash(params, data_hash)
    
    prev_run = load_previous_run(output_path)
    if prev_run and prev_run.get("run_hash") == run_hash and not force:
        click.echo(f"ℹ️  检测到相同参数和数据的历史运行 (hash: {run_hash})")
        click.echo(f"   使用 --force 可强制重新运行")
        click.echo("")
        click.echo("📊 历史结果摘要:")
        _print_summary(prev_run)
        return
    
    click.echo(f"✅ 数据加载完成")
    click.echo(f"   套餐数量: {len(data['packages'])}")
    click.echo(f"   转化记录: {len(data['conversions'])}")
    if stage == "stage2" and "trials" in data:
        click.echo(f"   试用记录: {len(data['trials'])}")
    click.echo("")
    
    prev_results = None
    if prev_run and prev_run.get("stage") != stage:
        prev_results = prev_run
        click.echo(f"🔄 检测到阶段变化: {prev_run.get('stage')} → {stage}")
        click.echo("   将生成前后变化对比报告")
        click.echo("")
    
    click.echo("🔍 正在检测异常和大客户...")
    detector = AnomalyDetector(threshold=outlier_threshold)
    anomaly_report = detector.detect(data)
    _print_anomaly_report(anomaly_report)
    
    click.echo("📈 正在执行非线性定价拟合...")
    fitter = PricingFitter(random_seed=RANDOM_SEED)
    fit_results = fitter.fit(data, anomaly_report)
    _print_fit_results(fit_results)
    
    click.echo("📊 正在执行敏感度分析和分组对比...")
    analyzer = SensitivityAnalyzer(range_pct=sensitivity_range)
    sensitivity_results = analyzer.analyze(data, fit_results, anomaly_report, group_by)
    
    if anomaly_report["outliers"]:
        click.echo("🧹 正在执行异常剔除后重拟合...")
        clean_data = detector.remove_outliers(data, anomaly_report)
        clean_anomaly = {
            "outliers": [],
            "large_customers": [],
            "discount_records": [],
            "sparse_groups": [],
        }
        clean_fit = fitter.fit(clean_data, clean_anomaly)
        sensitivity_results["clean_fit"] = clean_fit
        sensitivity_results["outlier_impact"] = _calculate_outlier_impact(fit_results, clean_fit)
    
    original_data = {
        "packages": data["packages"].to_dict("records"),
        "conversions": data["conversions"].to_dict("records"),
    }
    if "trials" in data:
        original_data["trials"] = data["trials"].to_dict("records")
    
    results = {
        "run_hash": run_hash,
        "timestamp": datetime.now().isoformat(),
        "stage": stage,
        "params": params,
        "original_data": original_data,
        "data_summary": loader.get_summary(data),
        "anomaly_report": anomaly_report,
        "fit_results": fit_results,
        "sensitivity_results": sensitivity_results,
        "previous_stage": prev_results,
        "stage_changes": _calculate_stage_changes(prev_results, fit_results) if prev_results else None,
    }
    
    save_results(output_path, results, run_hash)
    
    click.echo("📄 正在生成报告...")
    reporter = ReportGenerator(output_path)
    report_files = reporter.generate(results, stage)
    
    click.echo("")
    click.echo("=" * 80)
    click.echo("📊 分析完成 - 终端摘要")
    click.echo("=" * 80)
    _print_summary(results)
    
    if results["stage_changes"]:
        click.echo("")
        click.echo("🔄 阶段变化对比:")
        _print_stage_changes(results["stage_changes"])
    
    click.echo("")
    click.echo("📁 生成的报告文件:")
    for name, path in report_files.items():
        click.echo(f"   📄 {name}: {path}")
    
    click.echo("")
    click.echo(f"💾 运行结果已保存至: {results['run_dir']}")
    click.echo(f"   运行哈希: {run_hash}")
    click.echo("")
    click.echo("💡 提示: 使用 'pricing-fit correct --output-dir ...' 进行手动修正")
    click.echo("💡 提示: 使用 'pricing-fit compare --output-dir ...' 查看新旧对比")


@cli.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(exists=True, file_okay=False),
              help="输出结果目录（包含历史运行结果）")
@click.option("--record-id", required=True, type=str,
              help="要修正的转化记录ID")
@click.option("--field", required=True, type=str,
              help="要修正的字段名（如 converted, price, quantity, discount）")
@click.option("--new-value", required=True, type=str,
              help="新的字段值")
@click.option("--reason", default="手动修正", type=str,
              help="修正原因")
def correct(output_dir: str, record_id: str, field: str, new_value: str, reason: str) -> None:
    """手动修正转化记录，支持新旧结果并排对比"""
    output_path = Path(output_dir).resolve()
    
    click.echo("=" * 80)
    click.echo("手动修正入口")
    click.echo("=" * 80)
    click.echo(f"输出目录: {output_path}")
    click.echo(f"记录ID: {record_id}")
    click.echo(f"修正字段: {field}")
    click.echo(f"新值: {new_value}")
    click.echo(f"原因: {reason}")
    click.echo("")
    
    manager = CorrectionManager(output_path)
    
    click.echo("🔍 正在查找原始记录...")
    original_record = manager.find_record(record_id)
    if not original_record:
        click.echo(f"❌ 未找到记录ID: {record_id}", err=True)
        raise click.Abort()
    
    click.echo(f"✅ 找到原始记录:")
    for k, v in original_record.items():
        click.echo(f"   {k}: {v}")
    click.echo("")
    
    click.echo("✏️  应用修正...")
    corrected_data = manager.apply_correction(record_id, field, new_value, reason)
    correction_log = manager.get_correction_log()
    
    click.echo("✅ 修正已应用")
    click.echo(f"   修正序号: #{len(correction_log)}")
    click.echo("")
    
    click.echo("🔄 使用修正后的数据重新拟合...")
    input_path = Path(corrected_data["meta"]["input_dir"])
    loader = DataLoader(input_path)
    
    try:
        data = loader.load(corrected_data["meta"]["stage"])
        data["conversions"] = corrected_data["conversions"]
    except Exception as e:
        click.echo(f"❌ 数据加载失败: {e}", err=True)
        raise click.Abort()
    
    params = corrected_data["meta"]["params"]
    detector = AnomalyDetector(threshold=params["outlier_threshold"])
    anomaly_report = detector.detect(data)
    
    fitter = PricingFitter(random_seed=RANDOM_SEED)
    fit_results = fitter.fit(data, anomaly_report)
    
    analyzer = SensitivityAnalyzer(range_pct=params["sensitivity_range"])
    sensitivity_results = analyzer.analyze(data, fit_results, anomaly_report, params["group_by"])
    
    new_results = {
        "run_hash": f"corrected_{len(correction_log)}_{get_run_hash(params, str(datetime.now()))}",
        "timestamp": datetime.now().isoformat(),
        "stage": params["stage"],
        "params": params,
        "is_corrected": True,
        "correction_info": {
            "record_id": record_id,
            "field": field,
            "old_value": str(original_record.get(field, "")),
            "new_value": new_value,
            "reason": reason,
            "correction_number": len(correction_log),
        },
        "data_summary": loader.get_summary(data),
        "anomaly_report": anomaly_report,
        "fit_results": fit_results,
        "sensitivity_results": sensitivity_results,
        "original_results": corrected_data["original_results"],
    }
    
    run_hash = new_results["run_hash"]
    save_results(output_path, new_results, run_hash)
    
    click.echo("📄 正在生成新旧对比报告...")
    reporter = ReportGenerator(output_path)
    report_files = reporter.generate_comparison(
        corrected_data["original_results"],
        new_results,
        f"correction_{len(correction_log)}"
    )
    
    click.echo("")
    click.echo("=" * 80)
    click.echo("📊 修正完成 - 新旧结果并排对比")
    click.echo("=" * 80)
    
    _print_comparison(corrected_data["original_results"], new_results)
    
    click.echo("")
    click.echo("📁 生成的对比报告:")
    for name, path in report_files.items():
        click.echo(f"   📄 {name}: {path}")
    
    click.echo("")
    click.echo("✅ 修正流程完成")
    click.echo(f"   修正编号: {len(correction_log)}")
    click.echo(f"   结果目录: {new_results['run_dir']}")


@cli.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(exists=True, file_okay=False),
              help="输出结果目录（包含历史运行结果）")
@click.option("--run1", default="latest_original", type=str,
              help="第一个运行结果的哈希或 'latest_original', 'latest_corrected'")
@click.option("--run2", default="latest_corrected", type=str,
              help="第二个运行结果的哈希")
def compare(output_dir: str, run1: str, run2: str) -> None:
    """并排对比两个运行结果"""
    output_path = Path(output_dir).resolve()
    
    click.echo("=" * 80)
    click.echo("结果对比工具")
    click.echo("=" * 80)
    click.echo(f"输出目录: {output_path}")
    click.echo(f"对比: {run1} vs {run2}")
    click.echo("")
    
    manager = CorrectionManager(output_path)
    
    click.echo("🔍 正在查找运行结果...")
    results1 = manager.load_run(run1)
    results2 = manager.load_run(run2)
    
    if not results1:
        click.echo(f"❌ 未找到运行结果: {run1}", err=True)
        raise click.Abort()
    if not results2:
        click.echo(f"❌ 未找到运行结果: {run2}", err=True)
        raise click.Abort()
    
    click.echo(f"✅ 找到两个运行结果:")
    click.echo(f"   结果1: {results1.get('run_hash', run1)} ({results1.get('timestamp', 'N/A')})")
    if results1.get("is_corrected"):
        click.echo(f"          修正 #{results1['correction_info']['correction_number']}")
    click.echo(f"   结果2: {results2.get('run_hash', run2)} ({results2.get('timestamp', 'N/A')})")
    if results2.get("is_corrected"):
        click.echo(f"          修正 #{results2['correction_info']['correction_number']}")
    click.echo("")
    
    click.echo("📄 正在生成对比报告...")
    reporter = ReportGenerator(output_path)
    report_files = reporter.generate_comparison(results1, results2, f"{run1[:8]}_vs_{run2[:8]}")
    
    click.echo("")
    click.echo("=" * 80)
    click.echo("📊 并排对比结果")
    click.echo("=" * 80)
    
    _print_comparison(results1, results2)
    
    click.echo("")
    click.echo("📁 生成的对比报告:")
    for name, path in report_files.items():
        click.echo(f"   📄 {name}: {path}")


@cli.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(exists=True, file_okay=False),
              help="输出结果目录")
def list(output_dir: str) -> None:
    """列出所有历史运行结果"""
    output_path = Path(output_dir).resolve()
    
    click.echo("=" * 80)
    click.echo("历史运行记录")
    click.echo("=" * 80)
    click.echo(f"目录: {output_path}")
    click.echo("")
    
    manager = CorrectionManager(output_path)
    runs = manager.list_all_runs()
    
    if not runs:
        click.echo("ℹ️  暂无运行记录")
        return
    
    click.echo(f"{'序号':<4} {'哈希':<14} {'阶段':<8} {'类型':<12} {'时间':<20} {'修正#':<6}")
    click.echo("-" * 70)
    
    for i, run in enumerate(runs, 1):
        run_type = "修正" if run.get("is_corrected") else "原始"
        corr_num = run.get("correction_info", {}).get("correction_number", "")
        ts = run.get("timestamp", "N/A")[:19].replace("T", " ")
        click.echo(f"{i:<4} {run.get('run_hash', 'N/A'):<14} {run.get('stage', 'N/A'):<8} "
                   f"{run_type:<12} {ts:<20} {str(corr_num):<6}")
    
    click.echo("")
    click.echo(f"共 {len(runs)} 条运行记录")
    click.echo("")
    click.echo("💡 使用 'pricing-fit compare --run1 <哈希1> --run2 <哈希2>' 进行对比")


def _print_anomaly_report(report: dict) -> None:
    click.echo(f"   异常值检测: {len(report['outliers'])} 条")
    for outlier in report["outliers"][:3]:
        zs = f", z-score: {outlier['z_score']:.2f}" if outlier.get('z_score') is not None else ""
        click.echo(f"     - {outlier['record_id']}: {outlier['reason']}{zs}")
    if len(report["outliers"]) > 3:
        click.echo(f"     ... 还有 {len(report['outliers']) - 3} 条")
    
    click.echo(f"   异常大客户: {len(report['large_customers'])} 个")
    for lc in report["large_customers"][:3]:
        arpu = lc.get('arpu', 0)
        qty = lc.get('quantity', 0)
        click.echo(f"     - {lc['customer_id']}: ARPU={arpu:.0f}, 用量={qty:.0f}")
    if len(report["large_customers"]) > 3:
        click.echo(f"     ... 还有 {len(report['large_customers']) - 3} 个")
    
    click.echo(f"   折扣混入: {len(report['discount_records'])} 条")
    if report["sparse_groups"]:
        click.echo(f"   样本稀疏组: {len(report['sparse_groups'])} 个")
        for sg in report["sparse_groups"][:3]:
            click.echo(f"     - {sg['group']}: {sg['count']} 条样本")
    click.echo("")


def _print_fit_results(results: dict) -> None:
    click.echo(f"   拟合模型: {results.get('model_type', 'N/A')}")
    click.echo(f"   R² 分数: {results.get('r2_score', 0):.4f}")
    click.echo(f"   RMSE: {results.get('rmse', 0):.2f}")
    if "parameters" in results:
        click.echo("   模型参数:")
        for k, v in results["parameters"].items():
            if isinstance(v, (int, float)):
                click.echo(f"     - {k}: {v:.4f}")
    click.echo("")


def _print_summary(results: dict) -> None:
    fit = results.get("fit_results", {})
    anomaly = results.get("anomaly_report", {})
    sens = results.get("sensitivity_results", {})
    
    click.echo(f"📈 拟合质量:")
    click.echo(f"   模型: {fit.get('model_type', 'N/A')}")
    click.echo(f"   R²: {fit.get('r2_score', 0):.4f}  |  RMSE: {fit.get('rmse', 0):.2f}")
    
    click.echo(f"🔍 数据质量:")
    click.echo(f"   转化记录: {results['data_summary']['conversion_count']}")
    click.echo(f"   套餐数: {results['data_summary']['package_count']}")
    click.echo(f"   异常值: {len(anomaly.get('outliers', []))}  |  大客户: {len(anomaly.get('large_customers', []))}")
    click.echo(f"   折扣记录: {len(anomaly.get('discount_records', []))}  |  稀疏组: {len(anomaly.get('sparse_groups', []))}")
    
    if "sensitivity" in sens:
        click.echo(f"📊 敏感度分析:")
        for param, impact in list(sens["sensitivity"].items())[:3]:
            click.echo(f"   {param}: ±{impact*100:.1f}% 影响")
    
    if "outlier_impact" in sens:
        click.echo(f"🧹 异常剔除影响:")
        oi = sens["outlier_impact"]
        click.echo(f"   R² 变化: {oi.get('r2_change', 0):+.4f}  |  RMSE 变化: {oi.get('rmse_change', 0):+.2f}")


def _print_stage_changes(changes: dict) -> None:
    for metric, change in changes.items():
        if isinstance(change, dict) and "old" in change and "new" in change:
            diff = change["new"] - change["old"]
            pct = (diff / change["old"] * 100) if change["old"] != 0 else float("inf")
            click.echo(f"   {metric}: {change['old']:.4f} → {change['new']:.4f} ({diff:+.4f}, {pct:+.1f}%)")


def _print_comparison(results1: dict, results2: dict) -> None:
    fit1 = results1.get("fit_results", {})
    fit2 = results2.get("fit_results", {})
    anom1 = results1.get("anomaly_report", {})
    anom2 = results2.get("anomaly_report", {})
    
    click.echo(f"{'指标':<25} {'结果1':<15} {'结果2':<15} {'变化':<15}")
    click.echo("-" * 70)
    
    metrics = [
        ("模型类型", fit1.get("model_type"), fit2.get("model_type"), False),
        ("R² 分数", fit1.get("r2_score"), fit2.get("r2_score"), True),
        ("RMSE", fit1.get("rmse"), fit2.get("rmse"), True),
        ("异常值数量", len(anom1.get("outliers", [])), len(anom2.get("outliers", [])), True),
        ("大客户数量", len(anom1.get("large_customers", [])), len(anom2.get("large_customers", [])), True),
        ("折扣记录数", len(anom1.get("discount_records", [])), len(anom2.get("discount_records", [])), True),
    ]
    
    for name, v1, v2, numeric in metrics:
        if numeric and v1 is not None and v2 is not None:
            diff = v2 - v1
            pct = (diff / v1 * 100) if v1 != 0 else float("inf")
            change_str = f"{diff:+.4f} ({pct:+.1f}%)"
        else:
            change_str = "→" if v1 != v2 else "="
        
        click.echo(f"{name:<25} {str(v1):<15} {str(v2):<15} {change_str:<15}")
    
    if results2.get("is_corrected"):
        ci = results2["correction_info"]
        click.echo("")
        click.echo(f"📝 修正详情:")
        click.echo(f"   记录ID: {ci['record_id']}")
        click.echo(f"   字段: {ci['field']}")
        click.echo(f"   原值 → 新值: {ci['old_value']} → {ci['new_value']}")
        click.echo(f"   原因: {ci['reason']}")


def _calculate_outlier_impact(original: dict, clean: dict) -> dict:
    return {
        "r2_change": clean.get("r2_score", 0) - original.get("r2_score", 0),
        "rmse_change": clean.get("rmse", 0) - original.get("rmse", 0),
        "outliers_removed": len(original.get("data", {}).get("outliers", [])),
    }


def _calculate_stage_changes(prev: Optional[Dict], current: Dict) -> Optional[Dict]:
    if not prev:
        return None
    
    prev_fit = prev.get("fit_results", {})
    curr_fit = current
    
    return {
        "r2_score": {"old": prev_fit.get("r2_score", 0), "new": curr_fit.get("r2_score", 0)},
        "rmse": {"old": prev_fit.get("rmse", 0), "new": curr_fit.get("rmse", 0)},
    }



