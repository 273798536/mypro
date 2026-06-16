import base64
from io import BytesIO
from typing import List, Dict, Optional
from collections import defaultdict
from dataclasses import asdict
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

from .data_models import AnalysisRecord, DifficultyLevel, ConflictType
from .sample_data import get_conflict_type_descriptions


sns.set_style("whitegrid")
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False


class Visualizer:
    def __init__(self):
        self.color_map = {
            "简单": "#22c55e",
            "中等": "#f59e0b",
            "困难": "#ef4444",
            "极难": "#7c3aed"
        }
        self.conflict_colors = {
            "标签不一致": "#ef4444",
            "安全规则漏配": "#f59e0b",
            "单位漏填": "#3b82f6",
            "旧表格式": "#8b5cf6",
            "补录备注": "#10b981",
            "重复样本": "#ec4899"
        }
    
    def _fig_to_base64(self, fig) -> str:
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_str
    
    def create_difficulty_pie_chart(self, difficulty_dist: Dict[str, int]) -> str:
        fig, ax = plt.subplots(figsize=(8, 6))
        
        labels = list(difficulty_dist.keys())
        sizes = list(difficulty_dist.values())
        colors = [self.color_map.get(label, "#9ca3af") for label in labels]
        
        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            colors=colors,
            autopct='%1.1f%%',
            startangle=90,
            textprops={'fontsize': 12}
        )
        
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
        
        ax.set_title('样本难度分布', fontsize=16, fontweight='bold', pad=20)
        
        return self._fig_to_base64(fig)
    
    def create_conflict_bar_chart(self, conflict_dist: Dict[str, int]) -> str:
        fig, ax = plt.subplots(figsize=(10, 6))
        
        conflicts = list(conflict_dist.keys())
        counts = list(conflict_dist.values())
        colors = [self.conflict_colors.get(c, "#9ca3af") for c in conflicts]
        
        bars = ax.bar(conflicts, counts, color=colors, edgecolor='white', linewidth=2)
        
        for bar in bars:
            height = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width()/2.,
                height + 0.1,
                f'{int(height)}',
                ha='center',
                va='bottom',
                fontsize=11,
                fontweight='bold'
            )
        
        ax.set_xlabel('问题类型', fontsize=12)
        ax.set_ylabel('出现次数', fontsize=12)
        ax.set_title('各类问题出现频次', fontsize=16, fontweight='bold', pad=20)
        ax.tick_params(axis='x', rotation=15)
        ax.set_ylim(0, max(counts) * 1.2 if counts else 1)
        
        return self._fig_to_base64(fig)
    
    def create_difficulty_score_chart(self, records: List[AnalysisRecord]) -> str:
        fig, ax = plt.subplots(figsize=(12, 6))
        
        data = []
        for record in records:
            data.append({
                '样本编号': record.sample_id,
                '难度分值': record.difficulty_score,
                '难度等级': record.difficulty.value,
                '问题数量': len(record.conflicts)
            })
        
        df = pd.DataFrame(data)
        df = df.sort_values('难度分值', ascending=True)
        
        colors = [self.color_map.get(level, "#9ca3af") for level in df['难度等级']]
        
        bars = ax.barh(df['样本编号'], df['难度分值'], color=colors, edgecolor='white', linewidth=1)
        
        for i, row in enumerate(df.itertuples()):
            score = row.难度分值
            level = row.难度等级
            n_conflicts = row.问题数量
            ax.text(
                score + 1,
                i,
                f' {level} ({n_conflicts}个问题)',
                va='center',
                fontsize=10
            )
        
        ax.axvline(x=20, color='gray', linestyle='--', alpha=0.7, label='简单/中等分界')
        ax.axvline(x=40, color='orange', linestyle='--', alpha=0.7, label='中等/困难分界')
        ax.axvline(x=65, color='red', linestyle='--', alpha=0.7, label='困难/极难分界')
        
        ax.set_xlabel('难度分值（0-100，越高越难）', fontsize=12)
        ax.set_ylabel('样本编号', fontsize=12)
        ax.set_title('各样本难度分值明细', fontsize=16, fontweight='bold', pad=20)
        ax.legend(loc='lower right', fontsize=10)
        ax.set_xlim(0, 105)
        
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def create_label_conflict_sankey(self, records: List[AnalysisRecord]) -> str:
        conflict_records = [r for r in records if r.label_conflict_sources]
        
        if not conflict_records:
            return ""
        
        fig, ax = plt.subplots(figsize=(12, len(conflict_records) * 1.5 + 3))
        
        y_positions = []
        labels = []
        colors = []
        
        for i, record in enumerate(conflict_records):
            y = len(conflict_records) - i - 0.5
            y_positions.append(y)
            
            sample_id = record.sample_id
            training_label = record.raw_data['training_sample']['label']
            model_prediction = record.raw_data['model_log']['prediction']
            
            ax.plot([0, 1], [y, y], '#e5e7eb', linewidth=1, zorder=1)
            ax.plot([1, 2], [y, y], '#e5e7eb', linewidth=1, zorder=1)
            
            ax.scatter(0, y, s=500, color='#3b82f6', zorder=2, edgecolors='white', linewidth=2)
            ax.scatter(1, y, s=500, color='#22c55e', zorder=2, edgecolors='white', linewidth=2)
            ax.scatter(2, y, s=500, color='#ef4444', zorder=2, edgecolors='white', linewidth=2)
            
            ax.annotate(sample_id, xy=(0, y), xytext=(-0.3, y), 
                       ha='right', va='center', fontsize=11, fontweight='bold', color='#1e3a8a')
            ax.annotate(training_label[:15] + ('...' if len(training_label) > 15 else ''), 
                       xy=(1, y), xytext=(1, y + 0.25), 
                       ha='center', va='bottom', fontsize=9, color='#166534')
            ax.annotate(model_prediction[:15] + ('...' if len(model_prediction) > 15 else ''), 
                       xy=(2, y), xytext=(2.3, y), 
                       ha='left', va='center', fontsize=9, color='#991b1b')
        
        ax.set_xlim(-0.5, 3.5)
        ax.set_ylim(-0.5, len(conflict_records))
        
        ax.set_xticks([0, 1, 2])
        ax.set_xticklabels(['训练样本', '人工标注', '模型判断'], fontsize=12, fontweight='bold')
        ax.set_yticks([])
        
        for spine in ['top', 'right', 'left']:
            ax.spines[spine].set_visible(False)
        ax.spines['bottom'].set_position(('data', -0.3))
        
        ax.set_title('标签冲突溯源图（绿色=人工标注，红色=模型判断）', 
                    fontsize=16, fontweight='bold', pad=20)
        
        legend_elements = [
            plt.scatter([], [], s=200, color='#3b82f6', label='样本编号', edgecolors='white', linewidth=2),
            plt.scatter([], [], s=200, color='#22c55e', label='人工标注', edgecolors='white', linewidth=2),
            plt.scatter([], [], s=200, color='#ef4444', label='模型判断', edgecolors='white', linewidth=2)
        ]
        ax.legend(handles=legend_elements, loc='upper right', fontsize=11)
        
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def create_dedup_comparison_chart(self, 
                                   before_counts: Dict[str, int],
                                   after_counts: Dict[str, int]) -> str:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        
        all_levels = ["简单", "中等", "困难", "极难"]
        
        before_values = [before_counts.get(level, 0) for level in all_levels]
        after_values = [after_counts.get(level, 0) for level in all_levels]
        colors = [self.color_map[level] for level in all_levels]
        
        axes[0].pie(before_values, labels=all_levels, colors=colors, autopct='%1.1f%%', startangle=90)
        axes[0].set_title('去重前难度分布', fontsize=14, fontweight='bold')
        
        axes[1].pie(after_values, labels=all_levels, colors=colors, autopct='%1.1f%%', startangle=90)
        axes[1].set_title('去重后难度分布', fontsize=14, fontweight='bold')
        
        fig.suptitle('样本去重前后难度分布对比', fontsize=16, fontweight='bold')
        
        return self._fig_to_base64(fig)
    
    def create_conflict_timeline(self, records: List[AnalysisRecord]) -> str:
        fig, ax = plt.subplots(figsize=(12, 4))
        
        data = []
        for record in records:
            timestamp = record.raw_data['training_sample']['annotation_time']
            for conflict in record.conflicts:
                data.append({
                    '时间': timestamp,
                    '问题类型': conflict.value,
                    '样本': record.sample_id
                })
        
        if data:
            df = pd.DataFrame(data)
            df['时间'] = pd.to_datetime(df['时间'])
            df = df.sort_values('时间')
            
            for conflict_type in df['问题类型'].unique():
                subset = df[df['问题类型'] == conflict_type]
                ax.scatter(
                    subset['时间'], 
                    [conflict_type] * len(subset),
                    s=200,
                    label=conflict_type,
                    alpha=0.7,
                    edgecolors='white',
                    linewidth=2
                )
            
            ax.set_xlabel('标注时间', fontsize=12)
            ax.set_ylabel('问题类型', fontsize=12)
            ax.set_title('问题类型时间分布', fontsize=16, fontweight='bold', pad=20)
            ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=15)
            
            plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def create_safety_rule_coverage_chart(self, records: List[AnalysisRecord]) -> str:
        rule_data = defaultdict(lambda: {"matched": 0, "missing": 0})
        
        for record in records:
            for rule in record.safety_rule_matches:
                rule_data[rule]["matched"] += 1
            for rule in record.safety_rule_missing:
                rule_data[rule]["missing"] += 1
        
        if not rule_data:
            return ""
        
        rules = list(rule_data.keys())
        matched = [rule_data[r]["matched"] for r in rules]
        missing = [rule_data[r]["missing"] for r in rules]
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        x = np.arange(len(rules))
        width = 0.35
        
        bars1 = ax.bar(x - width/2, matched, width, label='规则已匹配', color='#22c55e', edgecolor='white')
        bars2 = ax.bar(x + width/2, missing, width, label='规则漏配', color='#ef4444', edgecolor='white')
        
        ax.set_xlabel('安全规则名称', fontsize=12)
        ax.set_ylabel('样本数量', fontsize=12)
        ax.set_title('安全规则匹配情况', fontsize=16, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(rules, rotation=15, ha='right')
        ax.legend()
        
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                if height > 0:
                    ax.text(
                        bar.get_x() + bar.get_width()/2.,
                        height + 0.05,
                        f'{int(height)}',
                        ha='center',
                        va='bottom',
                        fontsize=10
                    )
        
        plt.tight_layout()
        
        return self._fig_to_base64(fig)


def create_all_charts(analysis_result: Dict) -> Dict[str, str]:
    visualizer = Visualizer()
    
    charts = {}
    
    charts['difficulty_pie'] = visualizer.create_difficulty_pie_chart(
        analysis_result['difficulty_distribution']
    )
    
    charts['conflict_bar'] = visualizer.create_conflict_bar_chart(
        analysis_result['conflict_distribution']
    )
    
    charts['difficulty_score'] = visualizer.create_difficulty_score_chart(
        analysis_result['kept_records']
    )
    
    charts['label_conflict_sankey'] = visualizer.create_label_conflict_sankey(
        analysis_result['after_dedup_records']
    )
    
    before_dist = defaultdict(int)
    for r in analysis_result['before_dedup_records']:
        before_dist[r.difficulty.value] += 1
    
    charts['dedup_comparison'] = visualizer.create_dedup_comparison_chart(
        dict(before_dist),
        analysis_result['difficulty_distribution']
    )
    
    charts['conflict_timeline'] = visualizer.create_conflict_timeline(
        analysis_result['after_dedup_records']
    )
    
    charts['safety_rule_coverage'] = visualizer.create_safety_rule_coverage_chart(
        analysis_result['after_dedup_records']
    )
    
    return charts
