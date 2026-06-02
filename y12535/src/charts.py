import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass

from .data_loader import LoadedDataset
from .filter_sync import FilteredResult
from .quality_check import QualityReport, IssueType
from .numerical_integration import METHOD_NAMES, METHOD_DESCRIPTIONS

plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


@dataclass
class ChartOutput:
    file_path: str
    chart_type: str
    title: str
    description: str


def create_raw_vs_processed_chart(dataset: LoadedDataset,
                                  filtered_result: Optional[FilteredResult] = None,
                                  quality_report: Optional[QualityReport] = None,
                                  output_dir: str = 'output/charts',
                                  figsize: Tuple[int, int] = (14, 8)) -> List[ChartOutput]:
    os.makedirs(output_dir, exist_ok=True)
    outputs = []

    time_col = dataset.time_column
    reading_cols = dataset.reading_columns

    df_raw = dataset.raw_df.sort_values(time_col)
    df_processed = filtered_result.dataset.processed_df.sort_values(time_col) if filtered_result else df_raw.copy()

    quality_markers = {}
    if quality_report:
        for issue in quality_report.issues:
            if issue.issue_type == IssueType.NEGATIVE_READING and issue.row_indices:
                quality_markers['negative'] = {
                    'indices': issue.row_indices,
                    'color': 'red',
                    'marker': 'o',
                    'label': '负值读数',
                }
            elif issue.issue_type == IssueType.MISSING_SAMPLE and issue.details.get('missing_gaps'):
                quality_markers['missing'] = {
                    'gaps': issue.details['missing_gaps'],
                    'color': 'orange',
                    'label': '采样缺失区间',
                }
            elif issue.issue_type == IssueType.TIME_OUT_OF_ORDER and issue.row_indices:
                quality_markers['out_of_order'] = {
                    'indices': issue.row_indices,
                    'color': 'purple',
                    'marker': 'x',
                    'label': '时间乱序',
                }

    for col in reading_cols:
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=figsize, sharex=True)

        times_raw = df_raw[time_col]
        values_raw = df_raw[col]

        times_proc = df_processed[time_col]
        values_proc = df_processed[col]

        ax1.plot(times_raw, values_raw, label='原始曲线', color='#2196F3', linewidth=1.5, alpha=0.8)
        ax1.set_ylabel(f'{col} (原始单位)')
        ax1.set_title(f'{col} - 原始用电曲线')
        ax1.legend(loc='upper right')
        ax1.grid(True, alpha=0.3)

        show_negative = (
            'negative' in quality_markers
            and quality_report is not None
            and quality_report.has_issue_type(IssueType.NEGATIVE_READING)
            and col in quality_report.get_issues_by_type(IssueType.NEGATIVE_READING)[0].affected_columns
        )
        if show_negative:
            neg_times = df_raw.iloc[quality_markers['negative']['indices']][time_col]
            neg_values = df_raw.iloc[quality_markers['negative']['indices']][col]
            ax1.scatter(neg_times, neg_values, color='red', s=50, zorder=5, label='负值读数', marker='o')

        if 'out_of_order' in quality_markers:
            ooo_times = df_raw.iloc[quality_markers['out_of_order']['indices']][time_col]
            ooo_values = df_raw.iloc[quality_markers['out_of_order']['indices']][col]
            ax1.scatter(ooo_times, ooo_values, color='purple', s=50, zorder=5, label='时间乱序', marker='x')

        if 'missing' in quality_markers:
            for gap in quality_markers['missing']['gaps']:
                ax1.axvspan(
                    pd.Timestamp(gap['gap_start']),
                    pd.Timestamp(gap['gap_end']),
                    alpha=0.2,
                    color='orange',
                    label='采样缺失' if gap == quality_markers['missing']['gaps'][0] else ""
                )

        ax2.plot(times_proc, values_proc, label='处理后曲线', color='#4CAF50', linewidth=1.5, alpha=0.8)
        ax2.fill_between(times_proc, values_proc, alpha=0.3, color='#81C784')
        ax2.set_ylabel(f'{col} (标准单位)')
        ax2.set_xlabel('时间')
        ax2.set_title(f'{col} - 处理后曲线（用于数值积分）')

        if filtered_result:
            unit_result = filtered_result.unit_report.results.get(col)
            unit = unit_result.standardized_unit if unit_result else 'kW'
            integ_result = filtered_result.integration_report.results.get(col)
            total_energy = integ_result.total_energy if integ_result else 0
            energy_unit = filtered_result.unit_report.target_energy_unit
            method = METHOD_NAMES.get(filtered_result.integration_report.method_used, '梯形法')

            ax2.text(0.02, 0.95,
                     f'积分结果: {total_energy:,.2f} {energy_unit}\n计算方法: {method}',
                     transform=ax2.transAxes,
                     bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                     verticalalignment='top',
                     fontsize=10)

        ax2.legend(loc='upper right')
        ax2.grid(True, alpha=0.3)

        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d %H:%M'))
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d %H:%M'))
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')

        if quality_markers:
            legend_elements = [Patch(facecolor=v['color'], alpha=0.3 if k == 'missing' else 1, label=v['label'])
                             for k, v in quality_markers.items()]
            ax1.legend(handles=ax1.get_legend_handles_labels()[0] + legend_elements,
                      loc='upper right')

        if filtered_result:
            filter_desc = filtered_result.filter_description
            fig.suptitle(f'能耗曲线对比 - {col}\n筛选条件: {filter_desc}', fontsize=14, y=1.02)

        plt.tight_layout()

        safe_col = col.replace('/', '_').replace('\\', '_')
        file_path = os.path.join(output_dir, f'{safe_col}_raw_vs_processed.png')
        plt.savefig(file_path, dpi=150, bbox_inches='tight')
        plt.close()

        outputs.append(ChartOutput(
            file_path=file_path,
            chart_type='raw_vs_processed',
            title=f'{col} 原始曲线 vs 处理后曲线',
            description=f'展示{col}的原始用电曲线和经过清洗/标准化后的处理曲线，以及数值积分结果。'
        ))

    return outputs


def create_integration_result_chart(filtered_result: FilteredResult,
                                    output_dir: str = 'output/charts',
                                    figsize: Tuple[int, int] = (12, 6)) -> List[ChartOutput]:
    os.makedirs(output_dir, exist_ok=True)
    outputs = []

    integration_report = filtered_result.integration_report
    unit_report = filtered_result.unit_report
    energy_unit = unit_report.target_energy_unit

    if not integration_report.results:
        return outputs

    has_groups = any(r.group_results for r in integration_report.results.values())

    if has_groups:
        fig, ax = plt.subplots(figsize=figsize)

        x_pos = np.arange(len(integration_report.results))
        width = 0.35

        for i, (col, result) in enumerate(integration_report.results.items()):
            if result.group_results:
                groups = list(result.group_results.keys())
                values = list(result.group_results.values())
                x = np.arange(len(groups))

                bar = ax.bar(x + i * width / len(integration_report.results),
                           values,
                           width / len(integration_report.results),
                           label=f'{col} ({result.final_unit})',
                           alpha=0.8)

                for rect, val in zip(bar, values):
                    height = rect.get_height()
                    ax.text(rect.get_x() + rect.get_width() / 2., height,
                           f'{val:,.1f}', ha='center', va='bottom', fontsize=8)

        ax.set_xlabel('分组')
        ax.set_ylabel(f'能耗 ({energy_unit})')
        ax.set_title(f'能耗积分结果 - 按{filtered_result.config.to_dict()["group_by_name"]}分组')
        ax.set_xticks(x + width / 2)
        ax.set_xticklabels(groups if 'groups' in locals() else [], rotation=45, ha='right')
        ax.legend()
        ax.grid(True, alpha=0.3, axis='y')

        method = METHOD_NAMES.get(integration_report.method_used, '梯形法')
        method_desc = METHOD_DESCRIPTIONS.get(integration_report.method_used, '')
        ax.text(0.02, 0.95,
                f'计算方法: {method}\n{method_desc}',
                transform=ax.transAxes,
                bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8),
                verticalalignment='top',
                fontsize=9)

        plt.tight_layout()
        file_path = os.path.join(output_dir, 'integration_by_group.png')
        plt.savefig(file_path, dpi=150, bbox_inches='tight')
        plt.close()

        outputs.append(ChartOutput(
            file_path=file_path,
            chart_type='grouped_integration',
            title='分组能耗积分结果',
            description='展示按时间分组的能耗积分结果，便于对比不同时段的能耗情况。'
        ))

    fig, ax = plt.subplots(figsize=figsize)
    cols = list(integration_report.results.keys())
    totals = [r.total_energy for r in integration_report.results.values()]

    colors = plt.cm.Set3(np.linspace(0, 1, len(cols)))
    bars = ax.bar(cols, totals, color=colors, alpha=0.8)

    for bar, val, col in zip(bars, totals, cols):
        height = bar.get_height()
        result = integration_report.results[col]
        ax.text(bar.get_x() + bar.get_width() / 2., height,
               f'{val:,.2f} {result.final_unit}',
               ha='center', va='bottom', fontsize=10)

    ax.set_ylabel(f'总能耗 ({energy_unit})')
    ax.set_title('各通道总能耗对比')
    ax.grid(True, alpha=0.3, axis='y')

    total = integration_report.total_energy_all_columns
    ax.text(0.98, 0.95,
            f'合计: {total:,.2f} {energy_unit}',
            transform=ax.transAxes,
            ha='right',
            bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8),
            fontsize=11)

    plt.tight_layout()
    file_path = os.path.join(output_dir, 'total_energy_by_channel.png')
    plt.savefig(file_path, dpi=150, bbox_inches='tight')
    plt.close()

    outputs.append(ChartOutput(
        file_path=file_path,
        chart_type='total_energy',
        title='各通道总能耗对比',
        description='展示各通道的总能耗积分结果。'
    ))

    if len(cols) > 1:
        fig, ax = plt.subplots(figsize=figsize)
        non_zero_totals = [(c, t) for c, t in zip(cols, totals) if t > 0]
        if non_zero_totals:
            pie_cols, pie_totals = zip(*non_zero_totals)
            wedges, texts, autotexts = ax.pie(
                pie_totals,
                labels=pie_cols,
                autopct='%1.1f%%',
                colors=plt.cm.Set3(np.linspace(0, 1, len(pie_cols))),
                startangle=90
            )
            ax.set_title('各通道能耗占比')

            for text in texts:
                text.set_fontsize(9)
            for autotext in autotexts:
                autotext.set_fontsize(9)

            plt.tight_layout()
            file_path = os.path.join(output_dir, 'energy_pie_chart.png')
            plt.savefig(file_path, dpi=150, bbox_inches='tight')
            plt.close()

            outputs.append(ChartOutput(
                file_path=file_path,
                chart_type='pie_chart',
                title='各通道能耗占比',
                description='展示各通道在总能耗中的占比情况。'
            ))

    return outputs


def create_quality_summary_chart(quality_report: QualityReport,
                                 output_dir: str = 'output/charts',
                                 figsize: Tuple[int, int] = (10, 6)) -> Optional[ChartOutput]:
    if not quality_report.issues:
        return None

    os.makedirs(output_dir, exist_ok=True)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)

    issue_types = list(quality_report.summary['issues_by_type'].keys())
    issue_counts = list(quality_report.summary['issues_by_type'].values())

    colors_map = {
        '缺采样': '#FF9800',
        '时间乱序': '#9C27B0',
        '负值读数': '#F44336',
        '空值读数': '#FFC107',
    }
    colors = [colors_map.get(t, '#9E9E9E') for t in issue_types]

    bars = ax1.bar(issue_types, issue_counts, color=colors, alpha=0.8)
    for bar, val in zip(bars, issue_counts):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2., height,
                str(val), ha='center', va='bottom')
    ax1.set_ylabel('问题数量')
    ax1.set_title('数据质量问题 - 按类型')
    ax1.grid(True, alpha=0.3, axis='y')
    plt.setp(ax1.xaxis.get_majorticklabels(), rotation=30, ha='right')

    severity_counts = quality_report.summary['issues_by_severity']
    if severity_counts:
        severities = list(severity_counts.keys())
        counts = list(severity_counts.values())
        sev_colors = {'错误': '#F44336', '警告': '#FF9800', '提示': '#2196F3'}
        colors = [sev_colors.get(s, '#9E9E9E') for s in severities]

        wedges, texts, autotexts = ax2.pie(
            counts,
            labels=severities,
            autopct='%1.1f%%',
            colors=colors,
            startangle=90
        )
        ax2.set_title('数据质量问题 - 按严重程度')

    fig.suptitle(f'数据质量评分: {quality_report.data_quality_score:.1f}/100',
                 fontsize=14, y=1.05)
    plt.tight_layout()

    file_path = os.path.join(output_dir, 'quality_summary.png')
    plt.savefig(file_path, dpi=150, bbox_inches='tight')
    plt.close()

    return ChartOutput(
        file_path=file_path,
        chart_type='quality_summary',
        title='数据质量问题汇总',
        description='展示各类数据质量问题的分布和严重程度。'
    )


def generate_all_charts(dataset: LoadedDataset,
                        filtered_result: FilteredResult,
                        quality_report: Optional[QualityReport] = None,
                        output_dir: str = 'output/charts') -> Dict[str, List[ChartOutput]]:
    all_outputs = {}

    all_outputs['raw_vs_processed'] = create_raw_vs_processed_chart(
        dataset, filtered_result, quality_report, output_dir
    )

    all_outputs['integration'] = create_integration_result_chart(
        filtered_result, output_dir
    )

    quality_chart = create_quality_summary_chart(quality_report, output_dir)
    if quality_chart:
        all_outputs['quality'] = [quality_chart]

    return all_outputs
