"""命令行接口 - KMeans分群审计工具"""

import os
import sys
import traceback
from typing import Optional, List
import click
from tabulate import tabulate

from .pipeline import KMeansAuditPipeline
from .audit import AuditTrail
from .config import Constants
from .exceptions import KMeansAuditError


@click.group()
@click.version_option(version="1.0.0", prog_name="kmeans-audit")
def cli():
    """KMeans分群审计工具 - 用于聚类结果的审计和分析

    典型用法:
    kmeans-audit run --data customer_data.csv --clusters 5 --output report.xlsx
    """
    pass


@cli.command()
@click.option("--data", "-d", required=True, type=click.Path(exists=True), help="客户特征数据文件 (CSV/Excel)")
@click.option("--sheet", "-s", default=None, help="Excel工作表名")
@click.option("--clusters", "-k", required=True, type=int, help="聚类数量")
@click.option("--output", "-o", required=True, type=click.Path(), help="输出报告路径")
@click.option("--format", "-f", default=None, type=click.Choice(["xlsx", "csv", "html", "json", "md"]), help="输出格式 (默认根据扩展名自动识别)")
@click.option("--features", "-feat", default=None, help="指定使用的特征列，用逗号分隔")
@click.option("--exclude", "-ex", default=None, help="指定排除的特征列，用逗号分隔")
@click.option("--customer-id", "-id", default=None, help="客户ID列名，用于去重检查")
@click.option("--scaling", "-sc", default="zscore", type=click.Choice(Constants.STANDARDIZATION_METHODS), help="标准化方法 (默认: zscore)")
@click.option("--missing", "-m", default="mean", type=click.Choice(Constants.MISSING_VALUE_STRATEGIES), help="缺失值处理策略 (默认: mean)")
@click.option("--outlier", "-ol", default="iqr", type=click.Choice(Constants.OUTLIER_DETECTION_METHODS), help="异常值检测方法 (默认: iqr)")
@click.option("--exclude-outliers", is_flag=True, help="聚类时排除异常值")
@click.option("--importance", "-imp", default="f_value", type=click.Choice(Constants.FEATURE_IMPORTANCE_METHODS), help="特征重要性计算方法 (默认: f_value)")
@click.option("--config", "-c", default=None, type=click.Path(exists=True), help="标准化规则配置文件")
@click.option("--anomalies", "-a", default=None, type=click.Path(exists=True), help="已知异常客户记录文件")
@click.option("--remarks", "-r", default=None, type=click.Path(exists=True), help="标签备注文件")
@click.option("--previous", "-p", default=None, type=click.Path(exists=True), help="历史分群报告用于对比")
@click.option("--include-audit/--no-audit", default=True, help="是否包含审计追踪 (默认: 包含)")
@click.option("--include-raw/--no-raw", default=False, help="是否包含原始数据 (默认: 不包含)")
@click.option("--continue-on-error", is_flag=True, help="遇到错误时继续执行 (默认: 停止)")
@click.option("--quiet", "-q", is_flag=True, help="安静模式，仅输出错误")
def run(
    data: str,
    sheet: Optional[str],
    clusters: int,
    output: str,
    format: Optional[str],
    features: Optional[str],
    exclude: Optional[str],
    customer_id: Optional[str],
    scaling: str,
    missing: str,
    outlier: str,
    exclude_outliers: bool,
    importance: str,
    config: Optional[str],
    anomalies: Optional[str],
    remarks: Optional[str],
    previous: Optional[str],
    include_audit: bool,
    include_raw: bool,
    continue_on_error: bool,
    quiet: bool,
):
    """运行KMeans分群审计流程"""

    if not quiet:
        click.echo("🔍 KMeans分群审计工具 启动")
        click.echo(f"📊 数据文件: {data}")
        click.echo(f"🎯 聚类数: {clusters}")
        click.echo(f"📤 输出到: {output}")
        click.echo("")

    feature_columns = None
    exclude_columns = None

    if features:
        feature_columns = [f.strip() for f in features.split(",")]
    if exclude:
        exclude_columns = [f.strip() for f in exclude.split(",")]

    audit_trail = AuditTrail()

    try:
        pipeline = KMeansAuditPipeline(
            data_file=data,
            sheet_name=sheet,
            config_file=config,
            anomaly_file=anomalies,
            remarks_file=remarks,
            previous_report_file=previous,
            audit_trail=audit_trail,
        )

        if not quiet:
            click.echo("⏳ 正在执行审计流程...")

        result = pipeline.run(
            n_clusters=clusters,
            feature_columns=feature_columns,
            exclude_columns=exclude_columns,
            customer_id_col=customer_id,
            standardization_method=scaling,
            handle_missing=missing,
            outlier_method=outlier,
            exclude_outliers=exclude_outliers,
            feature_importance_method=importance,
            stop_on_error=not continue_on_error,
        )

        if not quiet:
            _print_summary(result)

        if not quiet:
            click.echo("\n📝 正在生成报告...")

        output_path = pipeline.export_report(
            output_path=output,
            format=format,
            include_audit_trail=include_audit,
            include_raw_data=include_raw,
        )

        if not quiet:
            click.echo(f"\n✅ 报告已生成: {output_path}")

            if result["warnings"]:
                click.echo(f"\n⚠️  警告 ({len(result['warnings'])} 条):")
                for warning in result["warnings"][:10]:
                    click.echo(f"   - {warning}")
                if len(result["warnings"]) > 10:
                    click.echo(f"   ... 还有 {len(result['warnings']) - 10} 条警告未显示")

            if result["corrections"] > 0:
                click.echo(f"\n🔧 数据修正: {result['corrections']} 处")

            click.echo("\n🎉 审计完成!")

        sys.exit(0)

    except KMeansAuditError as e:
        click.echo(f"\n❌ 错误: {str(e)}", err=True)
        _print_error_context(e)
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n❌ 未预期的错误: {str(e)}", err=True)
        if not quiet:
            click.echo("\n堆栈追踪:", err=True)
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.option("--data", "-d", required=True, type=click.Path(exists=True), help="数据文件")
@click.option("--sheet", "-s", default=None, help="Excel工作表名")
@click.option("--features", "-feat", default=None, help="指定检查的特征列")
@click.option("--customer-id", "-id", default=None, help="客户ID列名")
@click.option("--clusters", "-k", type=int, default=3, help="预期聚类数，用于样本量检查")
def validate(data: str, sheet: Optional[str], features: Optional[str], customer_id: Optional[str], clusters: int):
    """仅验证数据，不执行聚类"""
    click.echo(f"🔍 正在验证数据: {data}")

    from .data_loader import DataLoader
    from .validator import DataValidator
    from .audit import AuditTrail

    try:
        audit_trail = AuditTrail()
        loader = DataLoader(audit_trail)
        data_source = loader.load(data, sheet_name=sheet)

        feature_columns = None
        if features:
            feature_columns = [f.strip() for f in features.split(",")]

        validator = DataValidator(data_source, audit_trail)
        result = validator.validate_all(
            feature_columns=feature_columns,
            customer_id_col=customer_id,
            n_clusters=clusters,
        )

        _print_validation_result(result)

        if result.has_errors():
            sys.exit(1)
        else:
            click.echo("\n✅ 数据验证通过!")
            sys.exit(0)

    except KMeansAuditError as e:
        click.echo(f"\n❌ 错误: {str(e)}", err=True)
        sys.exit(1)


@cli.command()
def list_methods():
    """列出所有支持的方法和参数"""
    click.echo("📋 支持的标准化方法:")
    for method in Constants.STANDARDIZATION_METHODS:
        click.echo(f"  - {method}")

    click.echo("\n📋 支持的异常值检测方法:")
    for method in Constants.OUTLIER_DETECTION_METHODS:
        click.echo(f"  - {method}")

    click.echo("\n📋 支持的缺失值处理策略:")
    for strategy in Constants.MISSING_VALUE_STRATEGIES:
        click.echo(f"  - {strategy}")

    click.echo("\n📋 支持的特征重要性方法:")
    for method in Constants.FEATURE_IMPORTANCE_METHODS:
        click.echo(f"  - {method}")

    click.echo("\n📋 支持的输入格式:")
    for fmt in Constants.SUPPORTED_INPUT_FORMATS:
        click.echo(f"  - {fmt}")

    click.echo("\n📋 支持的输出格式:")
    for fmt in Constants.SUPPORTED_OUTPUT_FORMATS:
        click.echo(f"  - {fmt}")


@cli.command()
@click.option("--output", "-o", default="sample_data.csv", help="样本数据输出路径")
@click.option("--samples", "-n", default=100, type=int, help="样本数量")
@click.option("--features", "-f", default=5, type=int, help="特征数量")
@click.option("--clusters", "-k", default=3, type=int, help="真实聚类数")
@click.option("--add-outliers", is_flag=True, help="添加异常值")
@click.option("--add-missing", is_flag=True, help="添加缺失值")
def generate_sample(output: str, samples: int, features: int, clusters: int, add_outliers: bool, add_missing: bool):
    """生成样本测试数据"""
    import numpy as np
    import pandas as pd

    click.echo(f"🎲 正在生成样本数据: {output}")

    np.random.seed(42)

    X = np.zeros((samples, features))
    y = np.zeros(samples, dtype=int)

    samples_per_cluster = samples // clusters
    for i in range(clusters):
        start = i * samples_per_cluster
        end = start + samples_per_cluster if i < clusters - 1 else samples
        y[start:end] = i

        for j in range(features):
            mean = (i + 1) * (j + 1) * 2
            std = 1 + j * 0.5
            X[start:end, j] = np.random.normal(mean, std, end - start)

    feature_names = [f"feature_{i+1}" for i in range(features)]
    df = pd.DataFrame(X, columns=feature_names)
    df["customer_id"] = range(1001, 1001 + samples)
    df["true_cluster"] = y

    if add_outliers:
        n_outliers = int(samples * 0.05)
        outlier_indices = np.random.choice(samples, n_outliers, replace=False)
        for idx in outlier_indices:
            for j in range(features):
                df.iloc[idx, j] *= 10

    if add_missing:
        n_missing = int(samples * features * 0.02)
        for _ in range(n_missing):
            row = np.random.randint(samples)
            col = np.random.randint(features)
            df.iloc[row, col] = None

    if output.endswith(".csv"):
        df.to_csv(output, index=False, encoding="utf-8-sig")
    elif output.endswith(".xlsx"):
        df.to_excel(output, index=False)

    click.echo(f"✅ 样本数据已生成: {output}")
    click.echo(f"   样本数: {samples}")
    click.echo(f"   特征数: {features}")
    click.echo(f"   聚类数: {clusters}")
    if add_outliers:
        click.echo(f"   已添加异常值: ~{int(samples * 0.05)} 个")
    if add_missing:
        click.echo(f"   已添加缺失值: ~{int(samples * features * 0.02)} 个")


def _print_summary(result: dict):
    """打印结果摘要"""
    click.echo("\n" + "=" * 60)
    click.echo("📋 审计结果摘要")
    click.echo("=" * 60)

    table_data = [
        ["总样本数", result["n_samples"]],
        ["特征数", result["n_features"]],
        ["聚类数", result["n_clusters"]],
        ["标准化方法", result["scaling_method"]],
        ["轮廓系数", f"{result['silhouette_score']:.4f}" if result["silhouette_score"] is not None else "N/A"],
        ["CH指数", f"{result['calinski_harabasz_score']:.4f}" if result["calinski_harabasz_score"] is not None else "N/A"],
        ["DB指数", f"{result['davies_bouldin_score']:.4f}" if result["davies_bouldin_score"] is not None else "N/A"],
        ["整体质量", result["quality_assessment"]],
        ["异常值数", result["outlier_count"]],
        ["修正数", result["corrections"]],
    ]

    click.echo(tabulate(table_data, tablefmt="simple"))

    if result["cluster_sizes"]:
        click.echo("\n📊 各簇大小:")
        cluster_data = []
        for cid, size in sorted(result["cluster_sizes"].items()):
            percentage = size / result["n_samples"] * 100 if result["n_samples"] > 0 else 0
            cluster_data.append([f"簇 {cid}", size, f"{percentage:.2f}%"])
        click.echo(tabulate(cluster_data, headers=["簇ID", "样本数", "占比"], tablefmt="simple"))

    if result["top_features"]:
        click.echo("\n🔑 最重要的特征:")
        for i, feat in enumerate(result["top_features"], 1):
            click.echo(f"   {i}. {feat}")


def _print_validation_result(result):
    """打印验证结果"""
    click.echo("\n" + "=" * 60)
    click.echo("🔍 验证结果")
    click.echo("=" * 60)

    if result.has_errors():
        click.echo(f"\n❌ 错误 ({len(result.errors)} 条):")
        for i, error in enumerate(result.errors, 1):
            loc = f" ({error['location']})" if error.get("location") else ""
            click.echo(f"   {i}. {error['message']}{loc}")

    if result.has_warnings():
        click.echo(f"\n⚠️  警告 ({len(result.warnings)} 条):")
        for i, warning in enumerate(result.warnings, 1):
            loc = f" ({warning['location']})" if warning.get("location") else ""
            click.echo(f"   {i}. {warning['message']}{loc}")

    if result.has_corrections():
        click.echo(f"\n🔧 建议修正 ({len(result.corrections)} 条):")
        for i, correction in enumerate(result.corrections, 1):
            loc = f" ({correction['location']})" if correction.get("location") else ""
            click.echo(f"   {i}. {correction['message']}{loc}")


def _print_error_context(error: KMeansAuditError):
    """打印错误上下文信息"""
    if hasattr(error, "extra_info") and error.extra_info:
        click.echo("\n📝 错误详情:", err=True)
        for key, value in error.extra_info.items():
            if key != "location":
                click.echo(f"   {key}: {value}", err=True)

    if hasattr(error, "location") and error.location:
        click.echo(f"\n📍 错误位置: {error.location}", err=True)


def main():
    """主入口函数"""
    try:
        cli()
    except KeyboardInterrupt:
        click.echo("\n\n⏹️  用户中断操作")
        sys.exit(130)


if __name__ == "__main__":
    main()
