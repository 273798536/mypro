"""KMeans分群讲解台 - 命令行入口"""

import os
import sys
import click
import pandas as pd
from typing import Optional

from .data_loader import DataLoader
from .standardization import StandardizationManager
from .merge_diff import MergeDiffDetector, ConflictResolution
from .kmeans_clustering import KMeansClusterer
from .boundary_detector import BoundaryDetector
from .quality_evaluator import QualityEvaluator
from .report_generator import ReportGenerator
from .result_comparer import ResultComparer, ManualEditor


@click.group()
@click.version_option(version='1.0.0', prog_name='kmeans-explainer')
def main():
    """KMeans分群讲解台 - 可解释的客户分群工具"""
    pass


@main.command()
@click.option('--data', '-d', required=True, help='客户特征数据文件路径 (CSV/Excel/JSON)')
@click.option('--rules', '-r', help='标准化规则文件路径 (YAML/JSON)')
@click.option('--clusters', '-k', default=3, type=int, help='聚类数量，默认3')
@click.option('--output', '-o', default='output', help='输出目录，默认output')
@click.option('--name', '-n', default='customer_segmentation', help='输出文件基础名称')
@click.option('--random-state', default=42, type=int, help='随机种子，确保可重复性')
@click.option('--handle-outliers/--no-handle-outliers', default=True, help='是否处理异常值')
@click.option('--find-best-k/--no-find-best-k', default=False, help='是否自动寻找最佳K值')
@click.option('--interactive/--no-interactive', default=False, help='交互式解决规则冲突')
def run(data, rules, clusters, output, name, random_state, handle_outliers, find_best_k, interactive):
    """执行KMeans分群分析"""

    click.echo("🚀 开始KMeans分群分析...")

    os.makedirs(output, exist_ok=True)

    click.echo("📂 加载数据...")
    loader = DataLoader(data)
    raw_data = loader.load()
    click.echo(f"   加载完成: {len(raw_data)} 条记录, {len(raw_data.columns)} 个特征")

    numeric_cols = loader.get_numeric_columns()
    click.echo(f"   数值特征: {len(numeric_cols)} 个")

    click.echo("🔧 加载标准化规则...")
    std_manager = StandardizationManager()
    if rules and os.path.exists(rules):
        std_manager.load_rules_from_file(rules)
        click.echo(f"   加载了 {len(std_manager.get_features_with_rules())} 条规则")
    else:
        click.echo("   未提供规则文件，将根据数据自动生成")

    click.echo("🔍 检测数据与规则差异...")
    diff_detector = MergeDiffDetector(raw_data, std_manager)
    diffs = diff_detector.detect_all()
    diff_summary = diff_detector.get_diff_summary()

    if diff_summary['total_diffs'] > 0:
        diff_detector.print_diff_report()

        if interactive:
            click.echo("🤝 开始交互式冲突解决...")
            merged_rules = diff_detector.interactive_resolve()
        else:
            click.echo("🤖 自动合并规则（优先使用已有规则）...")
            merged_rules = diff_detector.resolve_conflicts(ConflictResolution.MERGE)

        std_manager = StandardizationManager()
        std_manager.add_rules_from_dict(merged_rules)
    else:
        click.echo("✅ 数据与规则一致")

    click.echo("📊 应用标准化...")
    feature_cols = std_manager.get_features_with_rules()
    missing_features = [f for f in feature_cols if f not in raw_data.columns]
    if missing_features:
        click.echo(f"⚠️  以下特征在数据中不存在，将跳过: {missing_features}")
        feature_cols = [f for f in feature_cols if f in raw_data.columns]

    numeric_data = raw_data[feature_cols].copy()
    numeric_data = numeric_data.fillna(numeric_data.mean())

    scaled_data = std_manager.fit_transform(numeric_data)
    click.echo(f"   标准化完成: {len(feature_cols)} 个特征")

    scale_issues = std_manager.detect_scale_issues(numeric_data)
    if scale_issues:
        click.echo(f"⚠️  检测到 {len(scale_issues)} 个尺度问题")

    boundary_detector = BoundaryDetector()
    pre_issues = boundary_detector.detect_all(numeric_data)
    if pre_issues:
        boundary_detector.print_issue_report()

    if find_best_k:
        click.echo("🔍 寻找最佳K值...")
        evaluator = QualityEvaluator()
        best_k_result = evaluator.find_best_k(scaled_data.values, k_range=(2, 8))
        click.echo(f"   {best_k_result['recommendation']}")
        clusters = best_k_result.get('best_k_silhouette', clusters) or clusters
        click.echo(f"   使用K={clusters}进行聚类")

    click.echo(f"🎯 执行KMeans聚类 (K={clusters})...")
    clusterer = KMeansClusterer(
        n_clusters=clusters,
        random_state=random_state,
        handle_outliers=handle_outliers,
        ensure_reproducibility=True
    )
    clusterer.fit(scaled_data)

    cluster_summary = clusterer.get_cluster_summary()
    click.echo(f"   聚类完成: {cluster_summary['cleaned_samples']} 有效样本")
    click.echo(f"   检测到异常值: {cluster_summary['outliers_detected']}")

    click.echo("📈 计算聚类质量指标...")
    try:
        evaluator = QualityEvaluator()
        quality_metrics = evaluator.evaluate(
            clusterer.scaled_data,
            clusterer.labels_,
            sample_size=10000
        )
        evaluator.print_evaluation_report()
    except Exception as e:
        click.echo(f"⚠️  质量评估跳过: {e}")
        quality_metrics = {'silhouette_score': None, 'interpretation': {}}

    click.echo("💡 生成聚类解释...")
    explanations = clusterer.explain_cluster_reasons(top_n_features=5)

    boundary_issues = None
    try:
        post_boundary = BoundaryDetector()
        post_issues = post_boundary.detect_all(
            numeric_data[~clusterer.outlier_mask_],
            clusterer.labels_
        )
        if post_issues:
            boundary_issues = post_boundary.get_issue_summary()
    except Exception as e:
        click.echo(f"⚠️  边界检测跳过: {e}")

    click.echo("📝 生成报告...")
    reporter = ReportGenerator(output_dir=output)
    cluster_details = clusterer.get_cluster_details()
    centers_df = clusterer.get_cluster_centers_df()

    report_files = reporter.generate_all_reports(
        base_name=name,
        cluster_details=cluster_details,
        cluster_summary=cluster_summary,
        quality_metrics=quality_metrics,
        cluster_explanations=explanations,
        centers_df=centers_df,
        boundary_issues=boundary_issues,
        diff_report=diff_summary if diff_summary['total_diffs'] > 0 else None,
        standardization_rules=std_manager.get_rule_summary()
    )

    rules_output = os.path.join(output, f"{name}_rules.yaml")
    std_manager.save_rules(rules_output)
    report_files['rules'] = rules_output

    click.echo("\n🎉 分析完成! 生成的文件:")
    for file_type, filepath in report_files.items():
        click.echo(f"   📄 {file_type}: {filepath}")

    click.echo(f"\n💡 提示: 使用 `kmeans-explainer compare` 对比不同结果")
    click.echo(f"💡 提示: 使用 `kmeans-explainer edit-rules` 手动编辑规则")


@main.command()
@click.option('--old', '-o', required=True, help='旧结果JSON文件路径')
@click.option('--new', '-n', required=True, help='新结果JSON文件路径')
@click.option('--output', '-O', default='output', help='输出目录')
@click.option('--html/--no-html', default=True, help='是否生成HTML对比报告')
def compare(old, new, output, html):
    """对比两次分群结果"""

    click.echo("🔄 加载对比数据...")
    comparer = ResultComparer(output_dir=output)

    old_result = comparer.load_result(old)
    new_result = comparer.load_result(new)

    click.echo("📊 生成对比报告...")
    comparison = comparer.compare_results(old_result, new_result)
    comparer.print_comparison_report(comparison)

    if html:
        html_file = comparer.generate_comparison_html(
            'comparison_report.html',
            old_result,
            new_result,
            comparison
        )
        click.echo(f"📄 HTML对比报告: {html_file}")


@main.command()
@click.option('--rules', '-r', required=True, help='标准化规则文件路径')
def edit_rules(rules):
    """交互式编辑标准化规则"""

    click.echo("🔧 启动规则编辑器...")
    editor = ManualEditor(rules)
    editor.interactive_edit()


@main.command()
@click.option('--data', '-d', required=True, help='数据文件路径')
@click.option('--rules', '-r', help='标准化规则文件路径')
@click.option('--output', '-o', default='output', help='输出目录')
def check(data, rules, output):
    """仅检查数据和规则，不执行聚类"""

    click.echo("🔍 开始数据检查...")

    loader = DataLoader(data)
    raw_data = loader.load()
    click.echo(f"📊 数据摘要:")
    click.echo(f"   记录数: {len(raw_data)}")
    click.echo(f"   特征数: {len(raw_data.columns)}")

    std_manager = StandardizationManager()
    if rules and os.path.exists(rules):
        std_manager.load_rules_from_file(rules)
        click.echo(f"🔧 规则摘要: {len(std_manager.get_features_with_rules())} 条规则")

        diff_detector = MergeDiffDetector(raw_data, std_manager)
        diffs = diff_detector.detect_all()
        diff_detector.print_diff_report()

    boundary_detector = BoundaryDetector()
    numeric_cols = raw_data.select_dtypes(include=['number']).columns
    issues = boundary_detector.detect_all(raw_data[numeric_cols])
    if issues:
        boundary_detector.print_issue_report()
    else:
        click.echo("✅ 未检测到边界问题")

    click.echo("\n💡 检查完成!")


@main.command()
@click.option('--output', '-o', default='examples', help='示例文件输出目录')
def generate_examples(output):
    """生成示例数据和配置文件"""

    import numpy as np

    os.makedirs(output, exist_ok=True)

    click.echo("📝 生成示例数据...")
    np.random.seed(42)
    n_samples = 500

    group1 = pd.DataFrame({
        'customer_id': [f'C{i:04d}' for i in range(1, 168)],
        'age': np.random.normal(30, 5, 167),
        'income': np.random.normal(50000, 10000, 167),
        'spending_score': np.random.normal(80, 10, 167),
        'purchase_frequency': np.random.normal(20, 5, 167),
        'tenure': np.random.normal(12, 3, 167)
    })

    group2 = pd.DataFrame({
        'customer_id': [f'C{i:04d}' for i in range(168, 335)],
        'age': np.random.normal(50, 8, 167),
        'income': np.random.normal(120000, 20000, 167),
        'spending_score': np.random.normal(40, 15, 167),
        'purchase_frequency': np.random.normal(5, 2, 167),
        'tenure': np.random.normal(60, 12, 167)
    })

    group3 = pd.DataFrame({
        'customer_id': [f'C{i:04d}' for i in range(335, 501)],
        'age': np.random.normal(40, 6, 166),
        'income': np.random.normal(80000, 15000, 166),
        'spending_score': np.random.normal(60, 12, 166),
        'purchase_frequency': np.random.normal(10, 3, 166),
        'tenure': np.random.normal(36, 8, 166)
    })

    sample_data = pd.concat([group1, group2, group3], ignore_index=True)
    sample_data_path = os.path.join(output, 'sample_customers.csv')
    sample_data.to_csv(sample_data_path, index=False, encoding='utf-8-sig')

    click.echo(f"📄 示例数据: {sample_data_path}")

    click.echo("📝 生成示例规则文件...")
    sample_rules = {
        'rules': {
            'age': {'method': 'standard'},
            'income': {'method': 'log'},
            'spending_score': {'method': 'minmax'},
            'purchase_frequency': {'method': 'standard'},
            'tenure': {'method': 'robust'}
        }
    }

    import yaml
    rules_path = os.path.join(output, 'sample_rules.yaml')
    with open(rules_path, 'w', encoding='utf-8') as f:
        yaml.dump(sample_rules, f, default_flow_style=False, allow_unicode=True)

    click.echo(f"📄 示例规则: {rules_path}")

    click.echo("\n🎉 示例文件生成完成!")
    click.echo(f"\n💡 运行示例:")
    click.echo(f"   kmeans-explainer run --data {sample_data_path} --rules {rules_path} --clusters 3")


if __name__ == '__main__':
    main()
