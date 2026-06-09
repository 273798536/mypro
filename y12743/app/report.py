import os
import json
from datetime import datetime
from config import Config
from app.charts import generate_summary_charts, generate_sorting_chart


STATUS_LABELS = {
    'available': '数据可用',
    'pending': '数据暂缓',
    'recollect': '需要重新采集'
}

STATUS_DESC = {
    'available': '该记录通过所有校验，可直接用于后续分析与输出。',
    'pending': '该记录存在瑕疵或存疑，需教研编辑人工确认后再决定是否使用。',
    'recollect': '该记录数据质量问题严重，当前值不可用，需安排重新抽样或采集。'
}

ISSUE_LABELS = {
    'sorting_unstable': '排序不稳定',
    'extrapolation_out_of_bounds': '外推越界',
    'data_missing': '数据缺失',
    'data_abnormal': '异常值'
}


def generate_review_report(store, rule_engine):
    summary = store.get_all_records_summary()
    charts = generate_summary_charts(store)
    sorting_chart = generate_sorting_chart(store)
    if sorting_chart:
        charts['sorting_unstable'] = sorting_chart
    
    issues_by_type = {}
    for itype in ISSUE_LABELS:
        issues_by_type[itype] = store.get_issues_by_type(itype)
    
    records_with_issues = []
    for issue in store.get_issues_by_type():
        rid = issue['record_id']
        if rid in store.records and rid not in [r['record_id'] for r in records_with_issues]:
            rec_detail = store.get_record_with_trace(rid)
            records_with_issues.append(rec_detail)
    
    report = {
        'report_id': f'report_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
        'generated_at': datetime.now().isoformat(),
        'summary': summary,
        'status_explanations': {
            k: {'label': STATUS_LABELS.get(k, k), 'description': STATUS_DESC.get(k, '')}
            for k in ['available', 'pending', 'recollect']
        },
        'issue_types': ISSUE_LABELS,
        'charts': charts,
        'issues_by_type': {
            k: {
                'label': ISSUE_LABELS.get(k, k),
                'count': len(v),
                'samples': _enrich_issue_samples(store, v[:10])
            }
            for k, v in issues_by_type.items()
        },
        'flagged_records': records_with_issues[:50],
        'rule_descriptions': rule_engine.get_rule_descriptions()
    }
    
    report_path = os.path.join(Config.REPORTS_FOLDER, f"{report['report_id']}.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    
    return report


def _enrich_issue_samples(store, issues):
    enriched = []
    for issue in issues:
        rid = issue['record_id']
        rec = store.records.get(rid, {})
        item = dict(issue)
        item['record_data'] = rec.get('data', {})
        item['record_status'] = rec.get('data_status')
        enriched.append(item)
    return enriched


def build_text_summary(report):
    s = report['summary']
    lines = []
    lines.append("=" * 50)
    lines.append("抽样偏差修正器 — 约束校验复核报告")
    lines.append(f"生成时间: {report['generated_at']}")
    lines.append("=" * 50)
    lines.append("")
    
    lines.append(f"总记录数: {s['total']}")
    lines.append(f"检出问题数: {s['issues_count']}")
    lines.append("")
    
    lines.append("【数据可用性判定】")
    for st, cnt in s.get('by_status', {}).items():
        label = STATUS_LABELS.get(st, st)
        desc = STATUS_DESC.get(st, '')
        lines.append(f"  • {label}: {cnt} 条 — {desc}")
    lines.append("")
    
    lines.append("【问题分布】")
    for itype, data in report['issues_by_type'].items():
        lines.append(f"  • {data['label']}: {data['count']} 条")
    lines.append("")
    
    lines.append("【重点关注记录（最多展示5条）】")
    for rec in report['flagged_records'][:5]:
        rid = rec['record_id']
        qid = rec.get('data', {}).get('question_id', 'N/A')
        st = rec.get('data_status') or 'unclassified'
        lines.append(f"  记录 {rid} (题目 {qid}) → {STATUS_LABELS.get(st, st)}")
        for issue in rec.get('issues_detail', []):
            lines.append(f"    - {issue['rule_name']}: {issue['details']}")
    lines.append("")
    
    lines.append("【图表清单】")
    for cname, cpath in report['charts'].items():
        lines.append(f"  - {cname}: {cpath}")
    
    return "\n".join(lines)
