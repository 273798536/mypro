"""
诊断图表与报告导出模块
"""

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Optional
from datetime import datetime

from data_reader import MergedData
from missing_handler import MissingAnalysisResult
from covariance_fixer import CovarianceResult
from error_tracker import ErrorTracker


class ReportGenerator:
    def __init__(self, output_dir: str = 'output'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        sns.set_style('whitegrid')
        plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False

    def plot_missing_heatmap(self, df: pd.DataFrame, 
                             output_filename: str = 'missing_heatmap.png'):
        fig, ax = plt.subplots(figsize=(12, 8))
        sns.heatmap(df.isnull(), yticklabels=False, cbar=False, 
                    cmap='viridis', ax=ax)
        ax.set_title('缺失值热力图')
        ax.set_xlabel('资产')
        plt.tight_layout()
        
        output_path = os.path.join(self.output_dir, output_filename)
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return output_path

    def plot_missing_bar(self, analysis: MissingAnalysisResult,
                         output_filename: str = 'missing_bar.png',
                         threshold: float = 0.3):
        asset_names = [a.asset_name for a in analysis.assets]
        missing_ratios = [a.missing_ratio for a in analysis.assets]
        blocked = [a.blocked for a in analysis.assets]
        
        colors = ['red' if b else 'steelblue' for b in blocked]
        
        fig, ax = plt.subplots(figsize=(12, 6))
        bars = ax.bar(asset_names, missing_ratios, color=colors)
        ax.axhline(y=threshold, color='orange', linestyle='--', label='拦截阈值')
        ax.set_title('各资产缺失率分布')
        ax.set_xlabel('资产')
        ax.set_ylabel('缺失率')
        ax.set_ylim([0, 1])
        ax.legend()
        plt.xticks(rotation=45, ha='right')
        
        for i, (bar, is_blocked) in enumerate(zip(bars, blocked)):
            if is_blocked:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height + 0.02,
                        '拦截', ha='center', va='bottom', color='red', fontweight='bold')
        
        plt.tight_layout()
        
        output_path = os.path.join(self.output_dir, output_filename)
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return output_path

    def plot_eigenvalue_distribution(self, cov_result: CovarianceResult,
                                     output_filename: str = 'eigenvalue_dist.png'):
        eigvals = np.sort(cov_result.eigenvalues)[::-1]
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        ax1.plot(range(1, len(eigvals) + 1), eigvals, 'b-', marker='o', markersize=4)
        ax1.axhline(y=0, color='red', linestyle='--', label='零值线')
        ax1.axhline(y=cov_result.min_eigenvalue, color='orange', linestyle=':', 
                    label=f'最小值: {cov_result.min_eigenvalue:.2e}')
        ax1.set_title('特征值分布')
        ax1.set_xlabel('特征值序号')
        ax1.set_ylabel('特征值')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        neg_eigvals = eigvals[eigvals <= 0]
        if len(neg_eigvals) > 0:
            ax2.plot(range(1, len(neg_eigvals) + 1), neg_eigvals, 'r-', marker='o')
            ax2.axhline(y=0, color='black', linestyle='--')
            ax2.set_title('非正特征值放大视图')
            ax2.set_xlabel('特征值序号')
            ax2.set_ylabel('特征值')
            ax2.grid(True, alpha=0.3)
        else:
            ax2.text(0.5, 0.5, '无负特征值\n矩阵正定!', 
                     ha='center', va='center', fontsize=14,
                     bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.5))
            ax2.set_title('正定状态')
        
        plt.tight_layout()
        
        output_path = os.path.join(self.output_dir, output_filename)
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return output_path

    def plot_covariance_heatmap(self, matrix: pd.DataFrame, 
                                output_filename: str = 'covariance_heatmap.png',
                                title: str = '协方差矩阵热力图'):
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(matrix, annot=False, cmap='coolwarm', center=0,
                    ax=ax, cbar_kws={'label': '协方差'})
        ax.set_title(title)
        plt.tight_layout()
        
        output_path = os.path.join(self.output_dir, output_filename)
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return output_path

    def generate_text_report(self, merged_data: MergedData,
                             missing_analysis: MissingAnalysisResult,
                             cov_result: CovarianceResult,
                             error_tracker: ErrorTracker,
                             output_filename: str = 'diagnostic_report.txt') -> str:
        lines = []
        lines.append("=" * 80)
        lines.append("协方差矩阵修复器 - 诊断报告")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)
        lines.append("")
        
        lines.append("一、数据来源概览")
        lines.append("-" * 80)
        lines.append(f"输入文件总数: {len(merged_data.sources)}")
        lines.append(f"成功读取: {sum(1 for s in merged_data.sources if s.read_success)}")
        lines.append(f"读取失败: {sum(1 for s in merged_data.sources if not s.read_success)}")
        lines.append(f"合并后资产数: {len(merged_data.asset_universe)}")
        lines.append(f"合并后时间点数: {len(merged_data.returns)}")
        lines.append("")
        
        if merged_data.asset_order_changes:
            lines.append("资产顺序变化提示:")
            for source, changes in merged_data.asset_order_changes.items():
                if isinstance(changes, dict):
                    lines.append(f"  文件 [{source}]: 资产顺序已调整")
            lines.append("")
        
        lines.append("二、缺失值检查报告")
        lines.append("-" * 80)
        lines.append(f"总体缺失率: {missing_analysis.overall_missing_ratio:.2%}")
        lines.append(f"资产总数: {len(missing_analysis.assets)}")
        lines.append(f"通过检查: {len(missing_analysis.valid_assets)}")
        lines.append(f"被拦截: {len(missing_analysis.blocked_assets)}")
        lines.append("")
        
        if missing_analysis.blocked_assets:
            lines.append("【重要】被拦截资产详情:")
            for asset_info in missing_analysis.assets:
                if asset_info.blocked:
                    lines.append(f"  ✗ {asset_info.asset_name}:")
                    lines.append(f"    缺失率: {asset_info.missing_ratio:.2%} ({asset_info.missing_count}/{asset_info.total_count})")
                    lines.append(f"    拦截原因: {asset_info.block_reason}")
            lines.append("")
        
        lines.append("三、协方差矩阵正定检查")
        lines.append("-" * 80)
        lines.append(f"矩阵维度: {cov_result.original_matrix.shape}")
        lines.append(f"原始是否正定: {'是 ✓' if cov_result.is_positive_definite else '否 ✗'}")
        lines.append(f"原始最小特征值: {cov_result.min_eigenvalue:.6e}")
        lines.append(f"负特征值数量: {sum(1 for e in cov_result.eigenvalues if e <= 0)}")
        lines.append("")
        
        if cov_result.fix_method_used is not None:
            lines.append(f"修复方法: {cov_result.fix_method_used.value}")
            lines.append(f"修复后是否正定: {'是 ✓' if cov_result.fix_success else '否 ✗'}")
            if cov_result.fix_success:
                lines.append(f"修复后最小特征值: {cov_result.fix_details.get('min_eigenvalue_after', 'N/A'):.6e}")
                lines.append(f"矩阵变化量(F范数): {cov_result.fix_details.get('frobenius_norm_diff', 'N/A'):.6e}")
        lines.append("")
        
        lines.append("四、错误记录汇总")
        lines.append("-" * 80)
        error_summary = error_tracker.get_error_summary()
        if error_summary:
            for err_type, count in error_summary.items():
                lines.append(f"  {err_type}: {count} 个")
        else:
            lines.append("  无错误记录 ✓")
        lines.append("")
        
        lines.append("=" * 80)
        lines.append("关键结论")
        lines.append("=" * 80)
        
        conclusions = []
        if missing_analysis.blocked_assets:
            conclusions.append(f"⚠ 缺失过多拦截: {len(missing_analysis.blocked_assets)} 个资产因缺失率过高被移除")
        else:
            conclusions.append("✓ 缺失检查通过: 所有资产缺失率均在可接受范围内")
        
        if cov_result.is_positive_definite:
            conclusions.append("✓ 正定检查通过: 协方差矩阵原本即为正定")
        elif cov_result.fix_success:
            conclusions.append(f"⚠ 正定修复成功: 矩阵已通过{cov_result.fix_method_used.value}方法修复为正定")
        else:
            conclusions.append("✗ 正定修复失败: 矩阵修复后仍非正定")
        
        if error_summary:
            conclusions.append(f"⚠ 存在错误: 共记录 {len(error_tracker.errors)} 个错误")
        else:
            conclusions.append("✓ 无错误: 处理过程未记录错误")
        
        for conclusion in conclusions:
            lines.append(conclusion)
        
        lines.append("")
        lines.append("=" * 80)
        lines.append("量化工程师转述提示:")
        lines.append("  - 缺失过多问题: 检查数据源完整性或调整缺失率阈值")
        lines.append("  - 矩阵非正定: 通常由高度相关资产或数据质量问题导致")
        lines.append("  - 资产顺序变化: 合并后顺序可能影响下游应用, 请确认")
        lines.append("=" * 80)
        
        report_content = "\n".join(lines)
        
        output_path = os.path.join(self.output_dir, output_filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return output_path

    def export_to_excel(self, merged_data: MergedData,
                        missing_analysis: MissingAnalysisResult,
                        cov_result: CovarianceResult,
                        error_tracker: ErrorTracker,
                        missing_handler,
                        output_filename: str = 'complete_report.xlsx') -> str:
        output_path = os.path.join(self.output_dir, output_filename)
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            if cov_result.fixed_matrix is not None:
                cov_result.fixed_matrix.to_excel(writer, sheet_name='修复后协方差矩阵')
            
            missing_df = missing_handler.get_blocked_assets_dataframe(missing_analysis)
            missing_df.to_excel(writer, sheet_name='缺失值检查', index=False)
            
            if merged_data.sources:
                source_data = []
                for source in merged_data.sources:
                    source_data.append({
                        '文件名': source.file_name,
                        '读取成功': '是' if source.read_success else '否',
                        '资产数量': len(source.asset_names),
                        '错误信息': source.error_message
                    })
                pd.DataFrame(source_data).to_excel(writer, sheet_name='数据来源', index=False)
            
            errors_df = error_tracker.export_errors_to_dataframe()
            if not errors_df.empty:
                errors_df.to_excel(writer, sheet_name='错误记录', index=False)
            
            asset_tags_df = error_tracker.export_asset_tags_to_dataframe()
            if not asset_tags_df.empty:
                asset_tags_df.to_excel(writer, sheet_name='资产标签追踪', index=False)
            
            summary_data = {
                '项目': ['处理时间', '输入文件数', '成功读取', '资产总数',
                        '被拦截资产数', '有效资产数', '原始矩阵正定',
                        '修复方法', '修复后正定', '错误总数'],
                '值': [
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    len(merged_data.sources),
                    sum(1 for s in merged_data.sources if s.read_success),
                    len(missing_analysis.assets),
                    len(missing_analysis.blocked_assets),
                    len(missing_analysis.valid_assets),
                    '是' if cov_result.is_positive_definite else '否',
                    cov_result.fix_method_used.value if cov_result.fix_method_used else '无需修复',
                    '是' if cov_result.fix_success else '否',
                    len(error_tracker.errors)
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='处理摘要', index=False)
        
        return output_path

    def generate_all_plots(self, merged_data: MergedData,
                           missing_analysis: MissingAnalysisResult,
                           cov_result: CovarianceResult,
                           missing_handler) -> dict:
        plots = {}
        
        plots['missing_heatmap'] = self.plot_missing_heatmap(merged_data.returns)
        plots['missing_bar'] = self.plot_missing_bar(
            missing_analysis, 
            threshold=missing_handler.missing_threshold
        )
        plots['eigenvalue_dist'] = self.plot_eigenvalue_distribution(cov_result)
        
        if cov_result.fixed_matrix is not None:
            plots['cov_heatmap_original'] = self.plot_covariance_heatmap(
                cov_result.original_matrix, 
                'covariance_heatmap_original.png',
                '原始协方差矩阵'
            )
            plots['cov_heatmap_fixed'] = self.plot_covariance_heatmap(
                cov_result.fixed_matrix,
                'covariance_heatmap_fixed.png',
                '修复后协方差矩阵'
            )
        
        return plots
