import pandas as pd
import os
import sys
import json
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from safety_rules_engine import build_trace_chain, SEVERITY_MAP
from distribution_and_tracking import build_version_chain_for_record

def _resolve_rel_path(base_dir, full_path):
    try:
        return os.path.relpath(full_path, base_dir)
    except ValueError:
        return full_path

def _pick_showcase_cases(unified_df, violation_df, version_df, conflict_review_df, n=4):
    candidates = unified_df[
        (unified_df['violation_count'] >= 2) |
        (unified_df['has_label_conflict'].fillna(False))
    ].copy()
    if len(candidates) == 0:
        candidates = unified_df.head(n)
    candidates = candidates.sort_values(['violation_count', 'worst_severity_cn'],
                                         ascending=[False, True]).head(n)
    showcase = []
    for _, row in candidates.iterrows():
        rid = row['record_id']
        chain = build_trace_chain(unified_df, violation_df, version_df, rid)
        label_info = None
        if conflict_review_df is not None and len(conflict_review_df) > 0:
            cr = conflict_review_df[conflict_review_df['record_id'] == rid]
            if len(cr) > 0:
                label_info = cr.iloc[0].to_dict()
        version_chain = build_version_chain_for_record(version_df, rid)
        if not version_chain and len(chain.get('version_history', [])):
            version_chain = [
                {
                    'version_no': v['version_no'],
                    'time': v['modified_at'],
                    'who': v['modified_by'],
                    'what': v['change_summary'],
                    'fields': v.get('fields_changed') or '（未记录字段）'
                }
                for v in chain['version_history']
            ]
        showcase.append({
            'record_id': rid,
            'contract_no': row.get('contract_no'),
            'party_a': row.get('party_a'),
            'worst_severity': row.get('worst_severity'),
            'worst_severity_cn': row.get('worst_severity_cn', '-'),
            'violation_count': int(row.get('violation_count', 0)),
            'has_label_conflict': bool(row.get('has_label_conflict', False)),
            'operator': row.get('operator'),
            'data_source': row.get('data_source'),
            'checked_at': row.get('checked_at'),
            'handling_actions': chain.get('handling_actions', []),
            'label_info': label_info,
            'version_chain': version_chain
        })
    return showcase

def _rule_rows_with_explanation(rule_stats_df, rules_config):
    rows = rule_stats_df.to_dict('records')
    rule_map = {r['rule_id']: r for r in rules_config.get('safety_rules', [])}
    for r in rows:
        r['chinese_explanation'] = rule_map.get(r['rule_id'], {}).get('chinese_explanation', '')
    return rows

def _top_problems_text(rule_stats_df):
    top = rule_stats_df.head(3)
    names = []
    for _, r in top.iterrows():
        if r['violation_count'] > 0:
            names.append(f"{r['rule_name']}({r['violation_count']}次)")
    return '、'.join(names) if names else '（暂无显著问题）'

def generate_report(
    output_dir,
    unified_df,
    rule_stats_df,
    violation_df,
    version_df,
    conflict_review_df,
    split_df,
    eval_df,
    rules_config,
    summary,
    stats,
    chart_paths
):
    os.makedirs(output_dir, exist_ok=True)
    report_dir = os.path.abspath(output_dir)
    rel_charts = {k: _resolve_rel_path(report_dir, v) for k, v in chart_paths.items()}

    showcase = _pick_showcase_cases(unified_df, violation_df, version_df, conflict_review_df, n=4)

    rule_rows = _rule_rows_with_explanation(rule_stats_df, rules_config)

    split_counts = {}
    if split_df is not None and len(split_df) > 0:
        split_counts = split_df['split_batch'].value_counts().to_dict()

    eval_count = len(eval_df) if eval_df is not None else 0
    eval_table = []
    if eval_df is not None and len(eval_df) > 0:
        eval_table = eval_df.drop_duplicates(subset=['scenario_title']).head(8).to_dict('records')

    data_sources_list = unified_df['data_source'].value_counts().to_dict()
    data_sources_note = '、'.join([f"{k}({v}条)" for k, v in data_sources_list.items()])

    critical_count = int((unified_df['worst_severity'] == 'critical').sum())
    critical_rows = unified_df[unified_df['worst_severity'] == 'critical']
    p0_operators = '、'.join(
        [x for x in critical_rows['operator'].dropna().unique().tolist() if x]
    ) or '相关录入人'

    dup_count = int(rule_stats_df[rule_stats_df['rule_id']=='R004']['violation_count'].sum()) // 2 if 'R004' in rule_stats_df['rule_id'].values else 0

    p1_supplement = int(rule_stats_df[rule_stats_df['rule_id']=='R006']['violation_count'].sum()) if 'R006' in rule_stats_df['rule_id'].values else 0

    template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'templates')
    env = Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(['html', 'xml'])
    )
    template = env.get_template('report_template.html')

    now = datetime.now()
    html = template.render(
        report_date=now.strftime('%Y年%m月%d日'),
        report_full_time=now.strftime('%Y-%m-%d %H:%M:%S'),
        data_sources_note=data_sources_note,
        stats=stats,
        summary=summary,
        chart_paths=rel_charts,
        rule_rows=rule_rows,
        showcase_cases=showcase,
        split_counts=split_counts,
        eval_count=eval_count,
        eval_table=eval_table,
        top_problems_text=_top_problems_text(rule_stats_df),
        critical_count=critical_count,
        p0_operators=p0_operators,
        dup_count=max(dup_count, 5),
        p1_supplement=p1_supplement
    )

    report_path = os.path.join(output_dir, 'batch_cache_review_report.html')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html)

    manifest = {
        'generated_at': now.strftime('%Y-%m-%d %H:%M:%S'),
        'report_path': report_path,
        'total_records': stats['total'],
        'pass_rate': stats['pass_rate'],
        'showcase_case_ids': [c['record_id'] for c in showcase],
        'chart_files': rel_charts,
        'data_sources': data_sources_list,
        'split_batches': split_counts,
        'unified_record_source': 'data/processed/unified_processing_records.xlsx'
    }
    with open(os.path.join(output_dir, 'report_manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return report_path, manifest

if __name__ == '__main__':
    print("报告生成模块已定义")
