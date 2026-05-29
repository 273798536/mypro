"""结果对比模块 - 手动修正入口和新旧结果并排对比"""

import os
import json
import yaml
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from copy import deepcopy


class ResultComparer:
    """结果对比器"""

    def __init__(self, output_dir: str = "output"):
        """
        初始化结果对比器
        
        Args:
            output_dir: 输出目录
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def load_result(self, filepath: str) -> Dict[str, Any]:
        """
        加载结果文件
        
        Args:
            filepath: 结果文件路径
            
        Returns:
            结果字典
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"结果文件不存在: {filepath}")

        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def compare_results(
        self,
        old_result: Dict[str, Any],
        new_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        对比新旧结果
        
        Args:
            old_result: 旧结果
            new_result: 新结果
            
        Returns:
            对比结果字典
        """
        comparison = {
            'cluster_changes': self._compare_cluster_assignments(
                old_result.get('cluster_assignments', []),
                new_result.get('cluster_assignments', [])
            ),
            'quality_changes': self._compare_quality_metrics(
                old_result.get('quality_metrics', {}),
                new_result.get('quality_metrics', {})
            ),
            'size_changes': self._compare_cluster_sizes(
                old_result.get('cluster_summary', {}),
                new_result.get('cluster_summary', {})
            ),
            'rule_changes': self._compare_standardization_rules(
                old_result.get('standardization_rules', {}),
                new_result.get('standardization_rules', {})
            )
        }

        return comparison

    def _compare_cluster_assignments(
        self,
        old_assignments: List[int],
        new_assignments: List[int]
    ) -> Dict[str, Any]:
        """对比聚类分配变化"""
        if len(old_assignments) != len(new_assignments):
            return {
                'error': '样本数量不一致',
                'old_count': len(old_assignments),
                'new_count': len(new_assignments)
            }

        changed_count = sum(1 for o, n in zip(old_assignments, new_assignments) if o != n)
        total_count = len(old_assignments)
        change_rate = changed_count / total_count if total_count > 0 else 0

        change_matrix = {}
        for o, n in zip(old_assignments, new_assignments):
            key = f"{o}->{n}"
            if key not in change_matrix:
                change_matrix[key] = 0
            change_matrix[key] += 1

        return {
            'changed_count': changed_count,
            'total_count': total_count,
            'change_rate': change_rate,
            'change_matrix': change_matrix
        }

    def _compare_quality_metrics(
        self,
        old_metrics: Dict[str, Any],
        new_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """对比质量指标变化"""
        changes = {}

        for metric in ['silhouette_score', 'calinski_harabasz_score', 'davies_bouldin_score']:
            old_val = old_metrics.get(metric)
            new_val = new_metrics.get(metric)

            if old_val is not None and new_val is not None:
                diff = new_val - old_val
                pct_change = (diff / old_val * 100) if old_val != 0 else float('inf')

                changes[metric] = {
                    'old': old_val,
                    'new': new_val,
                    'difference': diff,
                    'percentage_change': pct_change
                }

        return changes

    def _compare_cluster_sizes(
        self,
        old_summary: Dict[str, Any],
        new_summary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """对比聚类大小变化"""
        old_sizes = old_summary.get('cluster_sizes', {})
        new_sizes = new_summary.get('cluster_sizes', {})

        all_clusters = set(old_sizes.keys()) | set(new_sizes.keys())
        changes = {}

        for cluster in sorted(all_clusters, key=lambda x: int(x) if str(x).isdigit() else x):
            old_size = old_sizes.get(cluster, 0)
            new_size = new_sizes.get(cluster, 0)

            changes[str(cluster)] = {
                'old_size': old_size,
                'new_size': new_size,
                'difference': new_size - old_size
            }

        return changes

    def _compare_standardization_rules(
        self,
        old_rules: Dict[str, Any],
        new_rules: Dict[str, Any]
    ) -> Dict[str, Any]:
        """对比标准化规则变化"""
        old_rule_dict = old_rules.get('rules', {}) if old_rules else {}
        new_rule_dict = new_rules.get('rules', {}) if new_rules else {}

        all_features = set(old_rule_dict.keys()) | set(new_rule_dict.keys())
        changes = {
            'added': [],
            'removed': [],
            'modified': []
        }

        for feature in sorted(all_features):
            in_old = feature in old_rule_dict
            in_new = feature in new_rule_dict

            old_method = old_rule_dict.get(feature, {}).get('method', 'N/A') if in_old else None
            new_method = new_rule_dict.get(feature, {}).get('method', 'N/A') if in_new else None

            if not in_old and in_new:
                changes['added'].append({
                    'feature': feature,
                    'new_method': new_method
                })
            elif in_old and not in_new:
                changes['removed'].append({
                    'feature': feature,
                    'old_method': old_method
                })
            elif old_method != new_method:
                changes['modified'].append({
                    'feature': feature,
                    'old_method': old_method,
                    'new_method': new_method
                })

        return changes

    def print_comparison_report(
        self,
        comparison: Dict[str, Any],
        old_label: str = "旧结果",
        new_label: str = "新结果"
    ):
        """
        打印对比报告
        
        Args:
            comparison: 对比结果字典
            old_label: 旧结果标签
            new_label: 新结果标签
        """
        print("\n" + "=" * 100)
        print(f"📊「 结果对比报告: {old_label} vs {new_label} 」")
        print("=" * 100)

        cluster_changes = comparison.get('cluster_changes', {})
        if 'error' not in cluster_changes:
            print(f"\n🔄 聚类分配变化:")
            print(f"  变动样本: {cluster_changes.get('changed_count', 0)} / {cluster_changes.get('total_count', 0)}")
            print(f"  变动率: {cluster_changes.get('change_rate', 0) * 100:.1f}%")

            change_matrix = cluster_changes.get('change_matrix', {})
            if change_matrix:
                print(f"  主要变动:")
                for key, count in sorted(change_matrix.items(), key=lambda x: -x[1])[:5]:
                    if key.startswith('-1') or key.endswith('->-1'):
                        continue
                    print(f"    {key}: {count} 人")

        quality_changes = comparison.get('quality_changes', {})
        if quality_changes:
            print(f"\n📈 质量指标变化:")
            for metric, data in quality_changes.items():
                direction = "↑" if data['difference'] > 0 else "↓"
                metric_name = {
                    'silhouette_score': '轮廓系数',
                    'calinski_harabasz_score': 'CH指数',
                    'davies_bouldin_score': 'DB指数'
                }.get(metric, metric)

                if metric == 'davies_bouldin_score':
                    direction = "↑ 变差" if data['difference'] > 0 else "↓ 变好"
                else:
                    direction = "↑ 变好" if data['difference'] > 0 else "↓ 变差"

                print(f"  {metric_name}: {data['old']:.4f} → {data['new']:.4f} {direction}")

        size_changes = comparison.get('size_changes', {})
        if size_changes:
            print(f"\n👥 各簇大小变化:")
            print(f"  {'簇':<6} {'旧大小':>8} {'新大小':>8} {'变化':>8}")
            print(f"  {'-' * 34}")
            for cluster, data in sorted(size_changes.items()):
                change = data['difference']
                change_str = f"{change:+d}" if change != 0 else "0"
                print(f"  {cluster:<6} {data['old_size']:>8} {data['new_size']:>8} {change_str:>8}")

        rule_changes = comparison.get('rule_changes', {})
        if any(rule_changes.values()):
            print(f"\n🔧 标准化规则变化:")

            if rule_changes.get('added'):
                print(f"  新增规则 ({len(rule_changes['added'])}):")
                for item in rule_changes['added']:
                    print(f"    + {item['feature']}: {item['new_method']}")

            if rule_changes.get('removed'):
                print(f"  删除规则 ({len(rule_changes['removed'])}):")
                for item in rule_changes['removed']:
                    print(f"    - {item['feature']}: {item['old_method']}")

            if rule_changes.get('modified'):
                print(f"  修改规则 ({len(rule_changes['modified'])}):")
                for item in rule_changes['modified']:
                    print(f"    ~ {item['feature']}: {item['old_method']} → {item['new_method']}")

        print("\n" + "=" * 100 + "\n")

    def generate_comparison_html(
        self,
        filename: str,
        old_result: Dict[str, Any],
        new_result: Dict[str, Any],
        comparison: Dict[str, Any],
        old_label: str = "旧结果",
        new_label: str = "新结果"
    ) -> str:
        """
        生成HTML对比报告
        
        Args:
            filename: 输出文件名
            old_result: 旧结果
            new_result: 新结果
            comparison: 对比结果
            old_label: 旧结果标签
            new_label: 新结果标签
            
        Returns:
            HTML文件路径
        """
        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KMeans分群对比报告</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #333; text-align: center; }}
        h2 {{ color: #555; border-bottom: 2px solid #ddd; padding-bottom: 10px; }}
        .section {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .comparison-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        .old {{ border-left: 4px solid #ff6b6b; }}
        .new {{ border-left: 4px solid #4ecdc4; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #f8f9fa; }}
        .metric-good {{ color: #27ae60; }}
        .metric-bad {{ color: #e74c3c; }}
        .change-positive {{ color: #27ae60; }}
        .change-negative {{ color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 KMeans分群对比报告</h1>
        
        <div class="section">
            <h2>基本信息</h2>
            <div class="comparison-grid">
                <div class="old">
                    <h3>{old_label}</h3>
                    <p>聚类数: {old_result.get('cluster_summary', {}).get('n_clusters', 'N/A')}</p>
                    <p>样本数: {old_result.get('cluster_summary', {}).get('total_samples', 'N/A')}</p>
                </div>
                <div class="new">
                    <h3>{new_label}</h3>
                    <p>聚类数: {new_result.get('cluster_summary', {}).get('n_clusters', 'N/A')}</p>
                    <p>样本数: {new_result.get('cluster_summary', {}).get('total_samples', 'N/A')}</p>
                </div>
            </div>
        </div>
"""

        quality_changes = comparison.get('quality_changes', {})
        if quality_changes:
            html_content += """
        <div class="section">
            <h2>质量指标对比</h2>
            <table>
                <tr>
                    <th>指标</th>
                    <th>旧值</th>
                    <th>新值</th>
                    <th>变化</th>
                </tr>
"""
            for metric, data in quality_changes.items():
                metric_name = {
                    'silhouette_score': '轮廓系数',
                    'calinski_harabasz_score': 'CH指数',
                    'davies_bouldin_score': 'DB指数'
                }.get(metric, metric)

                if metric == 'davies_bouldin_score':
                    is_good = data['difference'] < 0
                else:
                    is_good = data['difference'] > 0

                change_class = 'metric-good' if is_good else 'metric-bad'
                change_sign = '↓' if data['difference'] < 0 else '↑'

                html_content += f"""
                <tr>
                    <td>{metric_name}</td>
                    <td>{data['old']:.4f}</td>
                    <td>{data['new']:.4f}</td>
                    <td class="{change_class}">{change_sign} {abs(data['percentage_change']):.1f}%</td>
                </tr>
"""
            html_content += "</table></div>"

        size_changes = comparison.get('size_changes', {})
        if size_changes:
            html_content += """
        <div class="section">
            <h2>各簇大小对比</h2>
            <table>
                <tr>
                    <th>簇</th>
                    <th>旧大小</th>
                    <th>新大小</th>
                    <th>变化</th>
                </tr>
"""
            for cluster, data in sorted(size_changes.items()):
                change_class = 'change-positive' if data['difference'] > 0 else 'change-negative' if data['difference'] < 0 else ''
                change_str = f"{data['difference']:+d}" if data['difference'] != 0 else "0"
                html_content += f"""
                <tr>
                    <td>{cluster}</td>
                    <td>{data['old_size']}</td>
                    <td>{data['new_size']}</td>
                    <td class="{change_class}">{change_str}</td>
                </tr>
"""
            html_content += "</table></div>"

        rule_changes = comparison.get('rule_changes', {})
        if any(rule_changes.values()):
            html_content += """
        <div class="section">
            <h2>标准化规则变化</h2>
"""
            if rule_changes.get('added'):
                html_content += f"<p><strong>新增规则 ({len(rule_changes['added'])}):</strong></p><ul>"
                for item in rule_changes['added']:
                    html_content += f"<li>{item['feature']}: {item['new_method']}</li>"
                html_content += "</ul>"

            if rule_changes.get('removed'):
                html_content += f"<p><strong>删除规则 ({len(rule_changes['removed'])}):</strong></p><ul>"
                for item in rule_changes['removed']:
                    html_content += f"<li>{item['feature']}: {item['old_method']}</li>"
                html_content += "</ul>"

            if rule_changes.get('modified'):
                html_content += f"<p><strong>修改规则 ({len(rule_changes['modified'])}):</strong></p><ul>"
                for item in rule_changes['modified']:
                    html_content += f"<li>{item['feature']}: {item['old_method']} → {item['new_method']}</li>"
                html_content += "</ul>"

            html_content += "</div>"

        html_content += """
    </div>
</body>
</html>
"""

        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filepath


class ManualEditor:
    """手动修正编辑器"""

    def __init__(self, rules_filepath: str):
        """
        初始化手动编辑器
        
        Args:
            rules_filepath: 标准化规则文件路径
        """
        self.rules_filepath = rules_filepath
        self.rules = self._load_rules()

    def _load_rules(self) -> Dict[str, Any]:
        """加载规则文件"""
        if not os.path.exists(self.rules_filepath):
            return {'rules': {}}

        file_ext = os.path.splitext(self.rules_filepath)[1].lower()

        if file_ext in ['.yaml', '.yml']:
            with open(self.rules_filepath, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {'rules': {}}
        elif file_ext == '.json':
            with open(self.rules_filepath, 'r', encoding='utf-8') as f:
                return json.load(f) or {'rules': {}}
        else:
            return {'rules': {}}

    def save_rules(self, output_path: Optional[str] = None):
        """保存规则到文件"""
        filepath = output_path or self.rules_filepath
        file_ext = os.path.splitext(filepath)[1].lower()

        with open(filepath, 'w', encoding='utf-8') as f:
            if file_ext in ['.yaml', '.yml']:
                yaml.dump(self.rules, f, default_flow_style=False, allow_unicode=True)
            else:
                json.dump(self.rules, f, ensure_ascii=False, indent=2)

    def edit_rule(self, feature: str, method: str, **kwargs):
        """
        编辑单个规则
        
        Args:
            feature: 特征名称
            method: 标准化方法
            **kwargs: 其他参数
        """
        if 'rules' not in self.rules:
            self.rules['rules'] = {}

        self.rules['rules'][feature] = {'method': method, **kwargs}

    def remove_rule(self, feature: str):
        """
        删除规则
        
        Args:
            feature: 特征名称
        """
        if 'rules' in self.rules and feature in self.rules['rules']:
            del self.rules['rules'][feature]

    def interactive_edit(self):
        """交互式编辑标准化规则"""
        print("\n" + "=" * 80)
        print("🔧「 标准化规则编辑器 」")
        print("=" * 80)

        while True:
            print("\n当前规则:")
            if 'rules' in self.rules and self.rules['rules']:
                for i, (feature, rule) in enumerate(self.rules['rules'].items(), 1):
                    method = rule.get('method', 'standard') if isinstance(rule, dict) else rule
                    print(f"  {i}. {feature}: {method}")
            else:
                print("  暂无规则")

            print("\n操作选项:")
            print("  1. 添加/修改规则")
            print("  2. 删除规则")
            print("  3. 保存并退出")
            print("  4. 取消并退出")

            choice = input("\n请选择操作 (1-4): ").strip()

            if choice == '1':
                feature = input("请输入特征名称: ").strip()
                print("可用方法: standard, minmax, robust, log, none")
                method = input("请输入标准化方法: ").strip()

                if method in ['standard', 'minmax', 'robust', 'log', 'none']:
                    self.edit_rule(feature, method)
                    print(f"✅ 已添加/修改规则: {feature} -> {method}")
                else:
                    print("❌ 无效的标准化方法")

            elif choice == '2':
                feature = input("请输入要删除的特征名称: ").strip()
                if 'rules' in self.rules and feature in self.rules['rules']:
                    self.remove_rule(feature)
                    print(f"✅ 已删除规则: {feature}")
                else:
                    print(f"❌ 未找到规则: {feature}")

            elif choice == '3':
                self.save_rules()
                print(f"✅ 规则已保存到: {self.rules_filepath}")
                break

            elif choice == '4':
                print("❌ 已取消编辑")
                break

            else:
                print("❌ 无效的选择")

        print("=" * 80 + "\n")
