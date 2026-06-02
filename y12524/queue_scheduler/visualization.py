import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import seaborn as sns
from typing import List, Dict, Optional
from datetime import datetime

from .models import SimulationResult, IntervalStats
from .errors import MissingDataError

sns.set_style("whitegrid")
plt.rcParams['font.sans-serif'] = ['PingFang SC', 'Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False


class Visualizer:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _save_figure(self, fig, filename: str) -> str:
        filepath = os.path.join(self.output_dir, filename)
        fig.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        return filepath

    def plot_wait_time_distribution(self, wait_times: List[float],
                                    target_wait: float = 20.0,
                                    filename: str = "wait_time_distribution.png") -> str:
        if not wait_times:
            raise MissingDataError(
                "没有等待时间数据可用于绘图",
                suggestion="请先运行排队模拟生成数据"
            )

        wait_times = np.array(wait_times)
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        mask = wait_times <= np.percentile(wait_times, 99)
        plot_data = wait_times[mask]

        ax1.hist(plot_data, bins=30, density=True, alpha=0.7, color='#3498db', edgecolor='white')
        ax1.axvline(target_wait, color='#e74c3c', linestyle='--', linewidth=2,
                    label=f'目标等待时间: {target_wait}秒')
        ax1.axvline(np.mean(wait_times), color='#2ecc71', linestyle='--', linewidth=2,
                    label=f'平均等待: {np.mean(wait_times):.1f}秒')
        ax1.set_xlabel('等待时间 (秒)', fontsize=12)
        ax1.set_ylabel('概率密度', fontsize=12)
        ax1.set_title('客户等待时间分布', fontsize=14, fontweight='bold')
        ax1.legend(fontsize=10)
        ax1.grid(alpha=0.3)

        percentiles = [50, 75, 80, 85, 90, 95, 99]
        pct_values = [np.percentile(wait_times, p) for p in percentiles]

        colors = ['#2ecc71' if v <= target_wait else '#e74c3c' for v in pct_values]
        bars = ax2.bar([f'P{p}' for p in percentiles], pct_values, color=colors, alpha=0.8)
        ax2.axhline(target_wait, color='#e74c3c', linestyle='--', linewidth=2,
                    label=f'目标: {target_wait}秒')

        for bar, val in zip(bars, pct_values):
            ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
                    f'{val:.0f}s', ha='center', va='bottom', fontsize=9)

        ax2.set_xlabel('百分位数', fontsize=12)
        ax2.set_ylabel('等待时间 (秒)', fontsize=12)
        ax2.set_title('等待时间百分位数分布', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(alpha=0.3, axis='y')

        fig.tight_layout()
        return self._save_figure(fig, filename)

    def plot_service_level_by_interval(self, intervals: List[IntervalStats],
                                       target_sl: float = 0.80,
                                       filename: str = "service_level_timeline.png") -> str:
        if not intervals:
            raise MissingDataError(
                "没有时段数据可用于绘图",
                suggestion="请先运行排队模拟生成数据"
            )

        df = pd.DataFrame([{
            'time': i.interval_start.strftime('%H:%M'),
            'service_level': i.service_level * 100,
            'avg_wait': i.avg_wait_time,
            'agents': i.num_agents
        } for i in intervals])

        fig, ax1 = plt.subplots(figsize=(14, 6))

        x = np.arange(len(df))
        width = 0.35

        bars = ax1.bar(x - width/2, df['service_level'], width,
                       label='服务水平 (%)', color='#3498db', alpha=0.8)
        ax1.axhline(target_sl * 100, color='#e74c3c', linestyle='--', linewidth=2,
                    label=f'目标: {target_sl*100:.0f}%')

        for bar, val in zip(bars, df['service_level']):
            color = '#2ecc71' if val >= target_sl * 100 else '#e74c3c'
            ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
                    f'{val:.0f}%', ha='center', va='bottom', fontsize=8, color=color, fontweight='bold')

        ax2 = ax1.twinx()
        ax2.plot(x, df['avg_wait'], color='#f39c12', marker='o', linewidth=2,
                 markersize=6, label='平均等待 (秒)')

        for i, (wait, agents) in enumerate(zip(df['avg_wait'], df['agents'])):
            ax2.annotate(f'{agents}人', xy=(i, wait), xytext=(0, 10),
                        textcoords='offset points', ha='center', fontsize=8,
                        color='#7f8c8d', fontweight='bold')

        ax1.set_xlabel('时段', fontsize=12)
        ax1.set_ylabel('服务水平 (%)', fontsize=12, color='#3498db')
        ax2.set_ylabel('平均等待 (秒)', fontsize=12, color='#f39c12')

        ax1.set_title('各时段服务水平与等待时间', fontsize=14, fontweight='bold')
        ax1.set_xticks(x)
        ax1.set_xticklabels(df['time'], rotation=45, fontsize=9)
        ax1.tick_params(axis='y', labelcolor='#3498db')
        ax2.tick_params(axis='y', labelcolor='#f39c12')

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=10)

        ax1.grid(alpha=0.3, axis='y')
        fig.tight_layout()
        return self._save_figure(fig, filename)

    def plot_agent_comparison(self, scenarios: List[Dict],
                              base_agents: int,
                              target_sl: float = 0.80,
                              filename: str = "agent_comparison.png") -> str:
        if not scenarios:
            raise MissingDataError(
                "没有坐席方案对比数据可用于绘图",
                suggestion="请先运行坐席方案对比分析"
            )

        df = pd.DataFrame(scenarios)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        colors = ['#2ecc71' if s['meets_target'] else '#e74c3c' for _, s in df.iterrows()]
        ax1.bar(df['agents'], df['service_level'] * 100, color=colors, alpha=0.8)
        ax1.axhline(target_sl * 100, color='#e74c3c', linestyle='--', linewidth=2,
                    label=f'目标: {target_sl*100:.0f}%')
        ax1.axvline(base_agents, color='#3498db', linestyle=':', linewidth=2,
                    label=f'当前坐席: {base_agents}人')

        for i, row in df.iterrows():
            ax1.text(row['agents'], row['service_level'] * 100 + 1,
                    f"{row['service_level']*100:.0f}%", ha='center', va='bottom', fontsize=9)

        ax1.set_xlabel('坐席数量', fontsize=12)
        ax1.set_ylabel('服务水平 (%)', fontsize=12)
        ax1.set_title('不同坐席数下的服务水平', fontsize=14, fontweight='bold')
        ax1.legend(fontsize=10)
        ax1.set_xticks(df['agents'])
        ax1.grid(alpha=0.3, axis='y')

        ax2.bar(df['agents'], df['avg_wait_seconds'], color=colors, alpha=0.8)
        ax2.axvline(base_agents, color='#3498db', linestyle=':', linewidth=2,
                    label=f'当前坐席: {base_agents}人')

        for i, row in df.iterrows():
            if pd.notna(row['wait_reduction_vs_base']) and row['agents'] != base_agents:
                pct = row['wait_reduction_vs_base'] * 100
                if abs(pct) > 1:
                    text = f"{row['avg_wait_seconds']:.0f}s\n({'+' if pct > 0 else ''}{pct:.0f}%)"
                else:
                    text = f"{row['avg_wait_seconds']:.0f}s"
            else:
                text = f"{row['avg_wait_seconds']:.0f}s"
            ax2.text(row['agents'], row['avg_wait_seconds'] + 1, text,
                    ha='center', va='bottom', fontsize=8)

        ax2.set_xlabel('坐席数量', fontsize=12)
        ax2.set_ylabel('平均等待时间 (秒)', fontsize=12)
        ax2.set_title('不同坐席数下的平均等待时间', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.set_xticks(df['agents'])
        ax2.grid(alpha=0.3, axis='y')

        fig.tight_layout()
        return self._save_figure(fig, filename)

    def plot_daily_summary(self, result: SimulationResult,
                           filename: str = "daily_summary.png") -> str:
        if not result.intervals:
            raise MissingDataError(
                "没有模拟结果可用于绘图",
                suggestion="请先运行排队模拟"
            )

        df = pd.DataFrame([i.to_dict() for i in result.intervals])

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('每日排班效果汇总', fontsize=16, fontweight='bold', y=0.995)

        axes[0, 0].plot(df['时段'], df['坐席数'], marker='o', color='#3498db', linewidth=2)
        axes[0, 0].set_title('在岗坐席数', fontsize=12, fontweight='bold')
        axes[0, 0].set_ylabel('坐席数')
        axes[0, 0].tick_params(axis='x', rotation=45, labelsize=7)
        axes[0, 0].grid(alpha=0.3)

        axes[0, 1].bar(df['时段'], df['来电数'], color='#9b59b6', alpha=0.7, label='来电')
        axes[0, 1].bar(df['时段'], df['接听数'], color='#2ecc71', alpha=0.7, label='接听')
        axes[0, 1].set_title('来电与接听数量', fontsize=12, fontweight='bold')
        axes[0, 1].set_ylabel('电话数')
        axes[0, 1].legend(fontsize=8)
        axes[0, 1].tick_params(axis='x', rotation=45, labelsize=7)
        axes[0, 1].grid(alpha=0.3, axis='y')

        sl_color = ['#2ecc71' if sl >= result.config.target_service_level * 100 else '#e74c3c'
                    for sl in df['服务水平']]
        axes[1, 0].bar(df['时段'], df['服务水平'], color=sl_color, alpha=0.8)
        axes[1, 0].axhline(result.config.target_service_level * 100, color='#e74c3c',
                          linestyle='--', linewidth=2,
                          label=f'目标: {result.config.target_service_level*100:.0f}%')
        axes[1, 0].set_title('服务水平达标情况', fontsize=12, fontweight='bold')
        axes[1, 0].set_ylabel('服务水平 (%)')
        axes[1, 0].legend(fontsize=8)
        axes[1, 0].tick_params(axis='x', rotation=45, labelsize=7)
        axes[1, 0].grid(alpha=0.3, axis='y')

        axes[1, 1].plot(df['时段'], df['平均等待(秒)'], color='#f39c12', marker='o',
                       linewidth=2, label='平均')
        axes[1, 1].fill_between(df['时段'], 0, df['平均等待(秒)'], alpha=0.3, color='#f39c12')
        axes[1, 1].plot(df['时段'], df['最大等待(秒)'], color='#e74c3c', marker='x',
                       linewidth=2, linestyle='--', label='最大')
        axes[1, 1].axhline(result.config.target_wait_seconds, color='#2ecc71',
                          linestyle='--', linewidth=2,
                          label=f'目标: {result.config.target_wait_seconds:.0f}s')
        axes[1, 1].set_title('等待时间趋势', fontsize=12, fontweight='bold')
        axes[1, 1].set_ylabel('等待时间 (秒)')
        axes[1, 1].legend(fontsize=8)
        axes[1, 1].tick_params(axis='x', rotation=45, labelsize=7)
        axes[1, 1].grid(alpha=0.3)

        fig.tight_layout()
        return self._save_figure(fig, filename)

    def plot_call_pattern_heatmap(self, call_patterns: pd.DataFrame,
                                  filename: str = "call_pattern_heatmap.png") -> str:
        if call_patterns.empty:
            raise MissingDataError(
                "没有来电规律数据可用于绘图",
                suggestion="请先导入来电记录并分析"
            )

        pivot = call_patterns.pivot(index='星期', columns='hour', values='call_count')
        weekday_order = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        pivot = pivot.reindex(weekday_order)

        fig, ax = plt.subplots(figsize=(14, 6))
        sns.heatmap(pivot, annot=True, fmt='.0f', cmap='YlOrRd',
                   linewidths=0.5, ax=ax, cbar_kws={'label': '平均来电数'})

        ax.set_xlabel('小时', fontsize=12)
        ax.set_ylabel('星期', fontsize=12)
        ax.set_title('一周各时段平均来电数热力图', fontsize=14, fontweight='bold')

        hour_labels = [f'{int(h):02d}' for h in pivot.columns]
        ax.set_xticklabels(hour_labels, rotation=0)

        fig.tight_layout()
        return self._save_figure(fig, filename)
