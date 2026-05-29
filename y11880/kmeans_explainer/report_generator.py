"""报告生成模块 - 终端摘要、人类可读报告、机器可读结果"""

import os
import json
import yaml
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
from tabulate import tabulate


class ReportGenerator:
    """报告生成器"""

    def __init__(self, output_dir: str = "output"):
        """
        初始化报告生成器
        
        Args:
            output_dir: 输出目录
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_terminal_summary(
        self,
        cluster_summary: Dict[str, Any],
        quality_metrics: Dict[str, Any],
        cluster_explanations: Dict[int, list],
        boundary_issues: Optional[Dict[str, Any]] = None
    ):
        """
        生成终端摘要输出
        
        Args:
            cluster_summary: 聚类摘要
            quality_metrics: 质量指标
            cluster_explanations: 聚类解释
            boundary_issues: 边界问题（可选）
        """
        print("\n" + "=" * 100)
        print("📊「 KMeans分群讲解台 - 终端摘要 」")
        print("=" * 100)

        print(f"\n📈 基本信息:")
        print(f"  总样本数: {cluster_summary.get('total_samples', 'N/A')}")
        print(f"  有效样本: {cluster_summary.get('cleaned_samples', 'N/A')}")
        print(f"  异常样本: {cluster_summary.get('outliers_detected', 'N/A')}")
        print(f"  聚类数量: {cluster_summary.get('n_clusters', 'N/A')}")
        print(f"  随机种子: {cluster_summary.get('random_state', 'N/A')} (确保可重复)")

        print(f"\n👥 各簇大小:")
        cluster_sizes = cluster_summary.get('cluster_sizes', {})
        total = sum(cluster_sizes.values()) if cluster_sizes else 1
        for cluster_id, size in sorted(cluster_sizes.items()):
            percentage = (size / total) * 100
            bar = "█" * int(percentage / 2)
            print(f"  簇 {cluster_id}: {size:5d} 人 ({percentage:5.1f}%) {bar}")

        print(f"\n🎯 聚类质量:")
        interpretation = quality_metrics.get('interpretation', {})
        if quality_metrics.get('silhouette_score') is not None:
            print(f"  轮廓系数: {quality_metrics['silhouette_score']:.4f}")
            print(f"    {interpretation.get('silhouette', '')}")
        if quality_metrics.get('calinski_harabasz_score') is not None:
            print(f"  CH指数: {quality_metrics['calinski_harabasz_score']:.4f}")
        if quality_metrics.get('davies_bouldin_score') is not None:
            print(f"  DB指数: {quality_metrics['davies_bouldin_score']:.4f}")
            print(f"    {interpretation.get('davies_bouldin', '')}")

        print(f"\n💡 聚类形成原因（特征偏离均值）:")
        for cluster_id, features in sorted(cluster_explanations.items()):
            print(f"\n  「簇 {cluster_id}」形成原因:")
            for feat in features[:3]:
                direction = "↑" if feat['direction'] == '高于均值' else "↓"
                print(f"    {direction} {feat['feature']}: {feat['difference']:+.4f} ({feat['direction']})")

        if boundary_issues and boundary_issues.get('total_issues', 0) > 0:
            print(f"\n⚠️  边界问题: {boundary_issues['total_issues']} 个")
            print(f"   严重: {boundary_issues['by_severity'].get('high', 0)} | "
                  f"中等: {boundary_issues['by_severity'].get('medium', 0)}")

        print("\n" + "=" * 100 + "\n")

    def generate_human_readable_report(
        self,
        filename: str,
        data: pd.DataFrame,
        cluster_summary: Dict[str, Any],
        quality_metrics: Dict[str, Any],
        cluster_explanations: Dict[int, list],
        boundary_issues: Optional[Dict[str, Any]] = None,
        diff_report: Optional[Dict[str, Any]] = None,
        standardization_rules: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        生成人类可读的Markdown报告
        
        Args:
            filename: 输出文件名
            data: 原始数据
            cluster_summary: 聚类摘要
            quality_metrics: 质量指标
            cluster_explanations: 聚类解释
            boundary_issues: 边界问题（可选）
            diff_report: 差异报告（可选）
            standardization_rules: 标准化规则（可选）
            
        Returns:
            报告文件路径
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        report_content = f"""# KMeans分群讲解台 - 详细分析报告

**生成时间**: {timestamp}

---

## 📊 基本信息

| 指标 | 值 |
|------|-----|
| 总样本数 | {cluster_summary.get('total_samples', 'N/A')} |
| 有效样本 | {cluster_summary.get('cleaned_samples', 'N/A')} |
| 异常样本 | {cluster_summary.get('outliers_detected', 'N/A')} |
| 聚类数量 | {cluster_summary.get('n_clusters', 'N/A')} |
| 随机种子 | {cluster_summary.get('random_state', 'N/A')} |
| Inertia | {cluster_summary.get('inertia', 'N/A'):.4f} |

---

## 👥 客户分群分布

"""

        cluster_sizes = cluster_summary.get('cluster_sizes', {})
        total = sum(cluster_sizes.values()) if cluster_sizes else 1
        for cluster_id, size in sorted(cluster_sizes.items()):
            percentage = (size / total) * 100
            report_content += f"- **簇 {cluster_id}**: {size} 人 ({percentage:.1f}%)\n"

        report_content += """
---

## 🎯 聚类质量评估

"""

        interpretation = quality_metrics.get('interpretation', {})
        if quality_metrics.get('silhouette_score') is not None:
            report_content += f"""### 轮廓系数 (Silhouette Score)
- **得分**: {quality_metrics['silhouette_score']:.4f}
- **解释**: {interpretation.get('silhouette', 'N/A')}

"""

        if quality_metrics.get('calinski_harabasz_score') is not None:
            report_content += f"""### Calinski-Harabasz 指数
- **得分**: {quality_metrics['calinski_harabasz_score']:.4f}
- **解释**: 数值越高，聚类越密集、分离度越好

"""

        if quality_metrics.get('davies_bouldin_score') is not None:
            report_content += f"""### Davies-Bouldin 指数
- **得分**: {quality_metrics['davies_bouldin_score']:.4f}
- **解释**: {interpretation.get('davies_bouldin', 'N/A')}

"""

        cluster_sil_scores = quality_metrics.get('cluster_silhouette_scores', {})
        if cluster_sil_scores:
            report_content += "### 各簇轮廓系数\n\n"
            report_content += "| 簇 | 轮廓系数 |\n|----|----------|\n"
            for cluster, score in sorted(cluster_sil_scores.items()):
                report_content += f"| {cluster} | {score:.4f} |\n"
            report_content += "\n"

        report_content += """---

## 💡 聚类形成原因解释

每个簇的关键特征（与整体均值的偏差）：

"""

        for cluster_id, features in sorted(cluster_explanations.items()):
            report_content += f"### 簇 {cluster_id} 形成原因\n\n"
            report_content += "| 特征 | 偏差值 | 方向 |\n|------|--------|------|\n"
            for feat in features:
                report_content += f"| {feat['feature']} | {feat['difference']:+.4f} | {feat['direction']} |\n"
            report_content += "\n"

        if diff_report and diff_report.get('total_diffs', 0) > 0:
            report_content += """---

## ⚠️  数据与规则差异检测

"""
            report_content += f"- **总差异数**: {diff_report['total_diffs']}\n\n"
            report_content += "### 详细差异\n\n"
            for i, diff in enumerate(diff_report.get('details', []), 1):
                report_content += f"{i}. **{diff['feature']}** ({diff['diff_type']})\n"
                report_content += f"   - 数据: {diff['data_value']}\n"
                report_content += f"   - 规则: {diff['rule_value']}\n"
                report_content += f"   - 说明: {diff['description']}\n\n"

        if boundary_issues and boundary_issues.get('total_issues', 0) > 0:
            report_content += """---

## 🚨 边界问题检测

"""
            report_content += f"- **总问题数**: {boundary_issues['total_issues']}\n"
            report_content += f"- **严重问题**: {boundary_issues['by_severity'].get('high', 0)}\n"
            report_content += f"- **中等问题**: {boundary_issues['by_severity'].get('medium', 0)}\n\n"

            report_content += "### 详细问题\n\n"
            for i, issue in enumerate(boundary_issues.get('issues', []), 1):
                severity_icon = "🔴" if issue['severity'] == 'high' else "🟡"
                report_content += f"{i}. {severity_icon} **{issue['type']}** - {issue['feature']}\n"
                report_content += f"   - 说明: {issue['description']}\n\n"

        if standardization_rules:
            report_content += """---

## 🔧 标准化规则

"""
            rules = standardization_rules.get('rules', {})
            report_content += "| 特征 | 标准化方法 |\n|------|----------|\n"
            for feature, rule in sorted(rules.items()):
                method = rule.get('method', 'N/A') if isinstance(rule, dict) else rule
                report_content += f"| {feature} | {method} |\n"
            report_content += "\n"

        report_content += """---

*报告由 KMeans分群讲解台 自动生成*
"""

        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_content)

        return filepath

    def generate_machine_readable_result(
        self,
        filename: str,
        cluster_details: pd.DataFrame,
        cluster_summary: Dict[str, Any],
        quality_metrics: Dict[str, Any],
        cluster_explanations: Dict[int, list],
        boundary_issues: Optional[Dict[str, Any]] = None,
        standardization_rules: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        生成机器可读的JSON结果
        
        Args:
            filename: 输出文件名
            cluster_details: 聚类详情DataFrame
            cluster_summary: 聚类摘要
            quality_metrics: 质量指标
            cluster_explanations: 聚类解释
            boundary_issues: 边界问题（可选）
            standardization_rules: 标准化规则（可选）
            
        Returns:
            结果文件路径
        """
        result = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': '1.0.0'
            },
            'cluster_summary': cluster_summary,
            'quality_metrics': quality_metrics,
            'cluster_explanations': {str(k): v for k, v in cluster_explanations.items()},
            'cluster_assignments': cluster_details['cluster'].tolist(),
            'outlier_mask': cluster_details['is_outlier'].tolist(),
            'boundary_issues': boundary_issues,
            'standardization_rules': standardization_rules
        }

        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return filepath

    def save_cluster_details_csv(
        self,
        filename: str,
        cluster_details: pd.DataFrame
    ) -> str:
        """
        保存聚类详情到CSV
        
        Args:
            filename: 输出文件名
            cluster_details: 聚类详情DataFrame
            
        Returns:
            CSV文件路径
        """
        filepath = os.path.join(self.output_dir, filename)
        cluster_details.to_csv(filepath, index=False, encoding='utf-8-sig')
        return filepath

    def save_cluster_centers(
        self,
        filename: str,
        centers_df: pd.DataFrame
    ) -> str:
        """
        保存聚类中心到文件
        
        Args:
            filename: 输出文件名
            centers_df: 聚类中心DataFrame
            
        Returns:
            文件路径
        """
        filepath = os.path.join(self.output_dir, filename)
        centers_df.to_csv(filepath, encoding='utf-8-sig')
        return filepath

    def generate_all_reports(
        self,
        base_name: str,
        cluster_details: pd.DataFrame,
        cluster_summary: Dict[str, Any],
        quality_metrics: Dict[str, Any],
        cluster_explanations: Dict[int, list],
        centers_df: pd.DataFrame,
        boundary_issues: Optional[Dict[str, Any]] = None,
        diff_report: Optional[Dict[str, Any]] = None,
        standardization_rules: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        生成所有类型的报告
        
        Args:
            base_name: 基础文件名
            cluster_details: 聚类详情DataFrame
            cluster_summary: 聚类摘要
            quality_metrics: 质量指标
            cluster_explanations: 聚类解释
            centers_df: 聚类中心DataFrame
            boundary_issues: 边界问题（可选）
            diff_report: 差异报告（可选）
            standardization_rules: 标准化规则（可选）
            
        Returns:
            各报告文件路径字典
        """
        self.generate_terminal_summary(
            cluster_summary, quality_metrics, cluster_explanations, boundary_issues
        )

        report_file = self.generate_human_readable_report(
            f"{base_name}_report.md",
            cluster_details,
            cluster_summary,
            quality_metrics,
            cluster_explanations,
            boundary_issues,
            diff_report,
            standardization_rules
        )

        result_file = self.generate_machine_readable_result(
            f"{base_name}_result.json",
            cluster_details,
            cluster_summary,
            quality_metrics,
            cluster_explanations,
            boundary_issues,
            standardization_rules
        )

        csv_file = self.save_cluster_details_csv(
            f"{base_name}_details.csv",
            cluster_details
        )

        centers_file = self.save_cluster_centers(
            f"{base_name}_centers.csv",
            centers_df
        )

        return {
            'report': report_file,
            'result': result_file,
            'csv': csv_file,
            'centers': centers_file
        }
