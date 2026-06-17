import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import os
from datetime import datetime
from collections import Counter

plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'PingFang SC', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

SEV_COLORS = {'严重': '#dc2626', '高': '#ea580c', '中': '#d97706', '低': '#65a30d', '-': '#9ca3af'}
SEV_ORDER = ['严重', '高', '中', '低']

def _save(fig, path, dpi=120):
    fig.tight_layout()
    fig.savefig(path, dpi=dpi, bbox_inches='tight', facecolor='white')
    plt.close(fig)

def compute_basic_stats(unified_df, rule_stats_df, violation_df, version_df):
    stats = {}
    stats['total'] = len(unified_df)
    stats['pass_rate'] = round((unified_df['check_passed']).sum() / stats['total'] * 100, 1)
    sev_dist = unified_df['worst_severity_cn'].value_counts().reindex(SEV_ORDER + ['-']).fillna(0).astype(int).to_dict()
    stats['severity_distribution'] = sev_dist
    by_source = unified_df.groupby('data_source').agg(
        count=('record_id', 'count'),
        viol_count=('violation_count', lambda s: (s>0).sum())
    ).reset_index()
    by_source['viol_rate_pct'] = round(by_source['viol_count'] / by_source['count'] * 100, 1)
    stats['by_source'] = by_source.to_dict('records')
    by_operator = unified_df.groupby('operator').agg(
        count=('record_id','count'),
        avg_violations=('violation_count','mean')
    ).reset_index().sort_values('avg_violations', ascending=False)
    by_operator['avg_violations'] = round(by_operator['avg_violations'], 2)
    stats['by_operator'] = by_operator.to_dict('records')
    top_rules = rule_stats_df.head(5).to_dict('records')
    stats['top_violated_rules'] = top_rules
    if len(version_df):
        version_df['date'] = pd.to_datetime(version_df['modified_at']).dt.date
        v_trend = version_df.groupby('date').size().reset_index(name='changes')
        stats['version_trend'] = v_trend.to_dict('records')
    else:
        stats['version_trend'] = []
    change_types = version_df['change_summary'].value_counts().head(8) if len(version_df) else pd.Series()
    stats['top_change_types'] = change_types.to_dict()
    return stats

def plot_severity_distribution(unified_df, output_path):
    data = unified_df['worst_severity_cn'].value_counts().reindex(SEV_ORDER + ['-']).fillna(0)
    data = data[data > 0]
    colors = [SEV_COLORS.get(k, '#9ca3af') for k in data.index]
    fig, ax = plt.subplots(figsize=(7, 5))
    wedges, texts, autotexts = ax.pie(data, labels=data.index, autopct='%1.1f%%',
                                       colors=colors, startangle=90,
                                       wedgeprops={'edgecolor': 'white', 'linewidth': 2})
    for t in autotexts:
        t.set_color('white')
        t.set_fontweight('bold')
    ax.set_title('记录最高违规严重程度分布', fontsize=14, fontweight='bold', pad=15)
    ax.legend(wedges, [f'{k}：{v}条' for k, v in data.items()],
              title="严重等级", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    _save(fig, output_path)

def plot_rule_violation_bar(rule_stats_df, output_path):
    top = rule_stats_df.sort_values('violation_count', ascending=True)
    fig, ax = plt.subplots(figsize=(9, 5.5))
    color_map = {'critical': '#dc2626', 'high': '#ea580c', 'medium': '#d97706', 'low': '#65a30d'}
    colors = [color_map.get(s, '#9ca3af') for s in top['severity']]
    bars = ax.barh(top['rule_id'] + ' ' + top['rule_name'], top['violation_count'], color=colors, edgecolor='white')
    for bar, val, pct in zip(bars, top['violation_count'], top['violation_rate_pct']):
        ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
                f'{val}次 ({pct}%)', va='center', fontsize=10)
    ax.set_xlabel('违规次数')
    ax.set_title('各安全规则违规情况排行', fontsize=14, fontweight='bold', pad=12)
    ax.grid(axis='x', linestyle='--', alpha=0.3)
    from matplotlib.patches import Patch
    legend_handles = [Patch(facecolor=c, label=n) for n, c in
                      [('严重', '#dc2626'), ('高', '#ea580c'), ('中', '#d97706'), ('低', '#65a30d')]]
    ax.legend(handles=legend_handles, title='严重等级', loc='lower right')
    _save(fig, output_path)

def plot_source_comparison(unified_df, output_path):
    g = unified_df.groupby('data_source').agg(
        总数=('record_id', 'count'),
        有违规=('violation_count', lambda s: (s>0).sum()),
        无违规=('violation_count', lambda s: (s==0).sum())
    ).reset_index()
    fig, ax = plt.subplots(figsize=(9, 5))
    x = np.arange(len(g))
    w = 0.35
    b1 = ax.bar(x - w/2, g['无违规'], w, label='通过校验', color='#22c55e', edgecolor='white')
    b2 = ax.bar(x + w/2, g['有违规'], w, label='存在违规', color='#ef4444', edgecolor='white')
    for bars in [b1, b2]:
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, h + 0.2, str(int(h)),
                    ha='center', va='bottom', fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels(g['data_source'])
    ax.set_ylabel('记录数')
    ax.set_title('不同数据来源的校验通过情况对比', fontsize=14, fontweight='bold', pad=12)
    ax.legend()
    ax.grid(axis='y', linestyle='--', alpha=0.3)
    _save(fig, output_path)

def plot_label_conflict(unified_df, output_path):
    if 'confidence_level' not in unified_df.columns:
        return
    conf = unified_df['confidence_level'].dropna()
    if len(conf) == 0:
        return
    order = ['高', '中高', '中', '低']
    counts = conf.value_counts().reindex(order).fillna(0).astype(int)
    counts = counts[counts > 0]
    color_list = {'高': '#16a34a', '中高': '#22c55e', '中': '#eab308', '低': '#ef4444'}
    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(counts.index, counts.values,
                  color=[color_list.get(k, '#9ca3af') for k in counts.index],
                  edgecolor='white', width=0.6)
    for bar, val in zip(bars, counts.values):
        ax.text(bar.get_x() + bar.get_width()/2, val + 0.2, str(val),
                ha='center', fontsize=11, fontweight='bold')
    ax.set_ylabel('冲突条数')
    ax.set_xlabel('自动复核置信度')
    ax.set_title('标签冲突自动复核置信度分布', fontsize=14, fontweight='bold', pad=12)
    ax.grid(axis='y', linestyle='--', alpha=0.3)
    _save(fig, output_path)

def plot_version_trend(version_df, output_path):
    if len(version_df) == 0:
        return
    v = version_df.copy()
    v['dt'] = pd.to_datetime(v['modified_at']).dt.date
    trend = v.groupby('dt').size().reset_index(name='count')
    trend = trend.sort_values('dt')
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(trend['dt'].astype(str), trend['count'], marker='o', linewidth=2.5,
            color='#2563eb', markersize=8, markerfacecolor='white', markeredgewidth=2)
    ax.fill_between(trend['dt'].astype(str), trend['count'], alpha=0.15, color='#2563eb')
    for i, row in trend.iterrows():
        ax.text(str(row['dt']), row['count'] + 0.3, str(row['count']),
                ha='center', fontsize=10)
    ax.set_ylabel('修改次数')
    ax.set_title('5-6月数据修改量变化趋势', fontsize=14, fontweight='bold', pad=12)
    ax.tick_params(axis='x', rotation=45)
    ax.grid(axis='y', linestyle='--', alpha=0.3)
    _save(fig, output_path)

def plot_operator_performance(unified_df, output_path):
    g = unified_df.groupby('operator').agg(
        count=('record_id', 'count'),
        viol_rate=('violation_count', lambda s: round((s>0).sum()/len(s)*100, 1))
    ).reset_index().sort_values('viol_rate')
    fig, ax1 = plt.subplots(figsize=(9, 5.5))
    bars = ax1.barh(g['operator'], g['count'], color='#60a5fa', alpha=0.7, label='处理条数', edgecolor='white')
    ax1.set_xlabel('处理条数')
    ax2 = ax1.twiny()
    ax2.plot(g['viol_rate'], g['operator'], marker='D', color='#dc2626', linewidth=2, label='违规率%', markersize=7)
    ax2.set_xlabel('违规率 (%)', color='#dc2626')
    ax2.tick_params(axis='x', colors='#dc2626')
    for i, (rate, cnt) in enumerate(zip(g['viol_rate'], g['count'])):
        ax2.text(rate + 0.3, i, f'{rate}%', va='center', color='#dc2626', fontsize=10)
    ax1.set_title('各录入人处理量与违规率对比', fontsize=14, fontweight='bold', pad=12)
    lines, labels = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines + lines2, labels + labels2, loc='lower right')
    ax1.grid(axis='x', linestyle='--', alpha=0.3)
    _save(fig, output_path)

def generate_all_plots(unified_df, rule_stats_df, version_df, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    paths = {}
    paths['severity_pie'] = os.path.join(output_dir, 'chart_severity_distribution.png')
    paths['rules_bar'] = os.path.join(output_dir, 'chart_rule_violations.png')
    paths['source_compare'] = os.path.join(output_dir, 'chart_source_comparison.png')
    paths['label_conflict'] = os.path.join(output_dir, 'chart_label_conflict.png')
    paths['version_trend'] = os.path.join(output_dir, 'chart_version_trend.png')
    paths['operator_perf'] = os.path.join(output_dir, 'chart_operator_performance.png')
    plot_severity_distribution(unified_df, paths['severity_pie'])
    plot_rule_violation_bar(rule_stats_df, paths['rules_bar'])
    plot_source_comparison(unified_df, paths['source_compare'])
    plot_label_conflict(unified_df, paths['label_conflict'])
    plot_version_trend(version_df, paths['version_trend'])
    plot_operator_performance(unified_df, paths['operator_perf'])
    return paths

def build_version_chain_for_record(version_df, record_id):
    v = version_df[version_df['record_id'] == record_id].sort_values('modified_at')
    chain = []
    for _, row in v.iterrows():
        chain.append({
            'version_no': row['version_no'],
            'time': row['modified_at'],
            'who': row['modified_by'],
            'what': row['change_summary'],
            'fields': row['fields_changed'] if pd.notna(row['fields_changed']) else '（未记录字段）'
        })
    return chain

if __name__ == '__main__':
    print("模块已定义")
