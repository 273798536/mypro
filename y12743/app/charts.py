import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams
from config import Config

try:
    rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
    rcParams['axes.unicode_minus'] = False
except Exception:
    pass


def generate_summary_charts(store, prefix=''):
    charts = {}
    
    summary = store.get_all_records_summary()
    
    charts['status_distribution'] = _plot_status_distribution(summary, prefix)
    charts['issue_distribution'] = _plot_issue_distribution(summary, prefix)
    charts['score_distribution'] = _plot_score_distribution(store, prefix)
    charts['extrapolation_scatter'] = _plot_extrapolation_scatter(store, prefix)
    
    return charts


def _plot_status_distribution(summary, prefix):
    labels_map = {
        'available': '可用',
        'pending': '暂缓',
        'recollect': '需重新采集',
        'unclassified': '未分类'
    }
    
    data = summary.get('by_status', {})
    labels = [labels_map.get(k, k) for k in data.keys()]
    values = list(data.values())
    
    colors = ['#4CAF50', '#FF9800', '#F44336', '#9E9E9E']
    
    fig, ax = plt.subplots(figsize=(8, 5))
    if values:
        bars = ax.bar(labels, values, color=colors[:len(values)])
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                    str(val), ha='center', va='bottom', fontweight='bold')
    
    ax.set_title('数据状态分布', fontsize=14, fontweight='bold')
    ax.set_ylabel('记录数')
    ax.set_xlabel('状态')
    plt.tight_layout()
    
    filename = f'{prefix}status_distribution.png'
    filepath = os.path.join(Config.CHARTS_FOLDER, filename)
    plt.savefig(filepath, dpi=100, bbox_inches='tight')
    plt.close()
    return f'/static/charts/{filename}'


def _plot_issue_distribution(summary, prefix):
    labels_map = {
        'sorting_unstable': '排序不稳定',
        'extrapolation_out_of_bounds': '外推越界',
        'data_missing': '数据缺失',
        'data_abnormal': '异常值'
    }
    
    data = summary.get('by_issue_type', {})
    labels = [labels_map.get(k, k) for k in data.keys()]
    values = list(data.values())
    
    colors = ['#E91E63', '#2196F3', '#FFC107', '#9C27B0']
    
    fig, ax = plt.subplots(figsize=(8, 5))
    if values:
        wedges, texts, autotexts = ax.pie(
            values, labels=labels, colors=colors[:len(values)],
            autopct='%1.1f%%', startangle=90
        )
        for t in autotexts:
            t.set_color('white')
            t.set_fontweight('bold')
    
    ax.set_title('问题类型分布', fontsize=14, fontweight='bold')
    plt.tight_layout()
    
    filename = f'{prefix}issue_distribution.png'
    filepath = os.path.join(Config.CHARTS_FOLDER, filename)
    plt.savefig(filepath, dpi=100, bbox_inches='tight')
    plt.close()
    return f'/static/charts/{filename}'


def _plot_score_distribution(store, prefix):
    scores = []
    for rec in store.records.values():
        s = rec.get('data', {}).get('score')
        if s is not None and not pd.isna(s):
            scores.append(float(s))
    
    fig, ax = plt.subplots(figsize=(8, 5))
    if scores:
        ax.hist(scores, bins=20, color='#2196F3', alpha=0.7, edgecolor='white')
        ax.axvline(np.mean(scores), color='#F44336', linestyle='--', 
                   linewidth=2, label=f'均值: {np.mean(scores):.2f}')
        ax.axvline(np.median(scores), color='#4CAF50', linestyle='--',
                   linewidth=2, label=f'中位数: {np.median(scores):.2f}')
        ax.legend()
    
    ax.set_title('分数分布直方图', fontsize=14, fontweight='bold')
    ax.set_xlabel('分数')
    ax.set_ylabel('频次')
    plt.tight_layout()
    
    filename = f'{prefix}score_distribution.png'
    filepath = os.path.join(Config.CHARTS_FOLDER, filename)
    plt.savefig(filepath, dpi=100, bbox_inches='tight')
    plt.close()
    return f'/static/charts/{filename}'


def _plot_extrapolation_scatter(store, prefix):
    hist_vals = []
    extrap_vals = []
    colors = []
    oob_indices = []
    
    issues = store.get_issues_by_type('extrapolation_out_of_bounds')
    oob_record_ids = {i['record_id'] for i in issues}
    
    for rec_id, rec in store.records.items():
        h = rec.get('data', {}).get('historical_value')
        e = rec.get('data', {}).get('extrapolated_value')
        if h is not None and e is not None and not pd.isna(h) and not pd.isna(e):
            hist_vals.append(float(h))
            extrap_vals.append(float(e))
            if rec_id in oob_record_ids:
                colors.append('#F44336')
                oob_indices.append(len(hist_vals) - 1)
            else:
                colors.append('#2196F3')
    
    fig, ax = plt.subplots(figsize=(8, 6))
    lim = 110
    if hist_vals:
        ax.scatter(hist_vals, extrap_vals, c=colors, alpha=0.7, s=50)
        
        lim = max(max(hist_vals), max(extrap_vals), 100) + 10
        ax.plot([0, lim], [0, lim], 'k--', alpha=0.5, label='y=x 参考线')
        ax.axhline(100, color='#F44336', linestyle=':', label='上界 100')
        ax.axhline(0, color='#F44336', linestyle=':', label='下界 0')
        
        if oob_indices:
            for idx in oob_indices[:3]:
                ax.annotate(
                    f'({hist_vals[idx]:.1f}, {extrap_vals[idx]:.1f})',
                    (hist_vals[idx], extrap_vals[idx]),
                    textcoords="offset points", xytext=(5, 5), fontsize=9,
                    color='#F44336', fontweight='bold'
                )
        
        ax.legend()
    
    ax.set_title('历史值 vs 外推值', fontsize=14, fontweight='bold')
    ax.set_xlabel('历史值')
    ax.set_ylabel('外推值')
    ax.set_xlim(-5, lim)
    ax.set_ylim(-20, lim + 20)
    plt.tight_layout()
    
    filename = f'{prefix}extrapolation_scatter.png'
    filepath = os.path.join(Config.CHARTS_FOLDER, filename)
    plt.savefig(filepath, dpi=100, bbox_inches='tight')
    plt.close()
    return f'/static/charts/{filename}'


def generate_sorting_chart(store, prefix=''):
    issues = store.get_issues_by_type('sorting_unstable')
    if not issues:
        return None
    
    record_ids = [i['record_id'] for i in issues[:10]]
    qids = set()
    for rid in record_ids:
        qid = store.records.get(rid, {}).get('data', {}).get('question_id')
        if qid:
            qids.add(qid)
    
    if not qids:
        return None
    
    target_qid = list(qids)[0]
    batches = []
    means = []
    stds = []
    
    all_data = []
    for rec in store.records.values():
        d = rec.get('data', {})
        if d.get('question_id') == target_qid:
            all_data.append(d)
    
    df_q = pd.DataFrame(all_data)
    if 'batch_id' in df_q.columns:
        for batch, grp in df_q.groupby('batch_id'):
            batches.append(str(batch))
            means.append(grp['score'].mean())
            stds.append(grp['score'].std())
    
    fig, ax = plt.subplots(figsize=(8, 5))
    if batches:
        x = range(len(batches))
        ax.bar(x, means, yerr=stds, capsize=5, color='#9C27B0', alpha=0.7)
        ax.set_xticks(x)
        ax.set_xticklabels(batches)
        for i, (m, s) in enumerate(zip(means, stds)):
            ax.text(i, m + s + 1, f'{m:.1f}', ha='center', fontweight='bold')
    
    ax.set_title(f'题目 {target_qid} 各批次分数对比（排序不稳定）', fontsize=14, fontweight='bold')
    ax.set_ylabel('平均分')
    ax.set_xlabel('批次')
    plt.tight_layout()
    
    filename = f'{prefix}sorting_unstable.png'
    filepath = os.path.join(Config.CHARTS_FOLDER, filename)
    plt.savefig(filepath, dpi=100, bbox_inches='tight')
    plt.close()
    return f'/static/charts/{filename}'
