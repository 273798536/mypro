import pandas as pd
import re
import os
import json
from datetime import datetime

try:
    import yaml
except ImportError:
    yaml = None

SEVERITY_MAP = {
    'critical': ('严重', '#dc2626'),
    'high': ('高', '#ea580c'),
    'medium': ('中', '#d97706'),
    'low': ('低', '#65a30d')
}

FIELD_CN_MAP = {
    'contract_no': '合同编号',
    'sign_date': '签署日期',
    'start_date': '开始日期',
    'end_date': '结束日期',
    'record_date': '录入日期',
    'party_a': '甲方名称',
    'party_b': '乙方名称',
    'contract_amount': '合同金额',
    'payment_amount': '付款金额',
    'penalty_amount': '违约金',
    'contract_duration_years': '合同期限(年)',
    'record_status': '记录状态',
    'supplement_reason': '补录原因',
    'contact_name': '联系人',
    'contact_phone': '联系电话',
    'biz_tag_1': '主业务标签',
    'biz_tag_2': '次业务标签',
    'biz_tag_3': '辅助标签',
    'data_source': '数据来源',
    'operator': '录入人'
}

def load_rules(config_path):
    if yaml and config_path.endswith('.yaml'):
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    yaml_path = config_path.replace('.json', '.yaml')
    if yaml and os.path.exists(yaml_path):
        with open(yaml_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _is_empty(v):
    if v is None:
        return True
    if isinstance(v, float) and pd.isna(v):
        return True
    if isinstance(v, str) and (v.strip() == '' or v.lower() == 'nan'):
        return True
    return False

def _extract_cn_fields(fields_list):
    return '、'.join([FIELD_CN_MAP.get(f, f) for f in fields_list])

def check_unit_not_empty(row, rule):
    violated_fields = []
    for field in rule['affected_fields']:
        val = row.get(field)
        if not _is_empty(val):
            s = str(val).strip()
            if not any(u in s for u in ['元', '万', '亿']):
                violated_fields.append(field)
    return violated_fields

def check_date_format_yyyy_mm_dd(row, rule):
    violated_fields = []
    pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
    for field in rule['affected_fields']:
        val = row.get(field)
        if not _is_empty(val):
            s = str(val).strip()
            if not pattern.match(s):
                violated_fields.append(field)
    return violated_fields

def check_paired_fields_not_empty(row, rule):
    name_field, phone_field = rule['affected_fields'][0], rule['affected_fields'][1]
    name_val = row.get(name_field)
    phone_val = row.get(phone_field)
    if not _is_empty(name_val) and _is_empty(phone_val):
        return [phone_field]
    if not _is_empty(phone_val) and _is_empty(name_val):
        return [name_field]
    return []

def check_unique_within_batch(df, row_idx, rule):
    field = rule['affected_fields'][0]
    target_val = df.iloc[row_idx].get(field)
    if _is_empty(target_val):
        return [field]
    dup_count = (df[field].astype(str) == str(target_val)).sum()
    if dup_count > 1:
        return [field]
    return []

def check_at_least_one_not_empty(row, rule):
    for field in rule['affected_fields']:
        if not _is_empty(row.get(field)):
            return []
    return rule['affected_fields']

def check_conditional_required(row, rule):
    condition = rule.get('condition', '')
    cond_field, cond_val = None, None
    m = re.match(r"(\w+)\s*==\s*'(.+)'", condition)
    if m:
        cond_field, cond_val = m.group(1), m.group(2)
    if cond_field and str(row.get(cond_field)) == cond_val:
        target_field = rule['affected_fields'][1]
        if _is_empty(row.get(target_field)):
            return [target_field]
    return []

def check_numeric_range(row, rule):
    field = rule['affected_fields'][0]
    val = row.get(field)
    if _is_empty(val):
        return []
    try:
        num = float(str(val).strip())
    except (ValueError, TypeError):
        return [field]
    mn = rule.get('min_value')
    mx = rule.get('max_value')
    if mn is not None and num < mn:
        return [field]
    if mx is not None and num > mx:
        return [field]
    return []

def check_required_not_empty(row, rule):
    violated = []
    for field in rule['affected_fields']:
        if _is_empty(row.get(field)):
            violated.append(field)
    return violated

CHECK_FN = {
    'unit_not_empty': ('row', check_unit_not_empty),
    'date_format_yyyy_mm_dd': ('row', check_date_format_yyyy_mm_dd),
    'paired_fields_not_empty': ('row', check_paired_fields_not_empty),
    'unique_within_batch': ('df', check_unique_within_batch),
    'at_least_one_not_empty': ('row', check_at_least_one_not_empty),
    'conditional_required': ('row', check_conditional_required),
    'numeric_range': ('row', check_numeric_range),
    'required_not_empty': ('row', check_required_not_empty),
}

def _plain_reason(rule, violated_fields, row=None, df=None, row_idx=None):
    logic = rule['check_logic']
    field_cn = _extract_cn_fields(violated_fields) if violated_fields else _extract_cn_fields(rule['affected_fields'])
    if logic == 'unit_not_empty':
        return f"{field_cn}里只写了数字，没写是\"元\"、\"万元\"还是\"亿元\"，别人拿不准到底是多少钱。"
    if logic == 'date_format_yyyy_mm_dd':
        bad_vals = []
        for f in violated_fields:
            v = row.get(f) if row is not None else ''
            if not _is_empty(v):
                bad_vals.append(f"{FIELD_CN_MAP.get(f,f)}写成了\"{v}\"")
        if bad_vals:
            return '；'.join(bad_vals) + '，要统一写成YYYY-MM-DD格式才能识别。'
        return f"{field_cn}格式不规范，要写成类似2024-03-15这种格式。"
    if logic == 'paired_fields_not_empty':
        return f"只写了{FIELD_CN_MAP.get(violated_fields[0], violated_fields[0])}的一半信息，另一半没填，出了事找不到对接人。"
    if logic == 'unique_within_batch':
        val = str(df.iloc[row_idx].get(rule['affected_fields'][0])) if (df is not None and row_idx is not None) else ''
        return f"合同编号\"{val}\"出现了不止一次，要么是重复录入，要么编号写错了，得查原始合同。"
    if logic == 'at_least_one_not_empty':
        return f"三个业务标签全空着，这条数据没分类，后面做业务统计的时候找不到归属。"
    if logic == 'conditional_required':
        status_val = str(row.get('record_status')) if row is not None else ''
        return f"这条记录标的是\"{status_val}\"状态，按规定必须写清楚补录原因，审计的时候要能说清来龙去脉。"
    if logic == 'numeric_range':
        val = row.get(rule['affected_fields'][0]) if row is not None else ''
        return f"合同期限填的是{val}年，明显超出正常范围（0-50年），大概率是多写了个零或者单位搞错了。"
    if logic == 'required_not_empty':
        return f"{field_cn}这些是核心必填项，空着的话这条合同记录基本没法用，得对照原始单据补齐。"
    return rule.get('chinese_explanation', rule.get('description', ''))

def run_checks(df, rules_config, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    rules = rules_config.get('safety_rules', [])
    processing_records = []
    violation_summary = []
    rule_stats = {r['rule_id']: {'rule_name': r['rule_name'], 'violation_count': 0, 'severity': r['severity']} for r in rules}
    for idx, row in df.iterrows():
        record_id = row.get('record_id', f'UNK{idx:04d}')
        row_violations = []
        for rule in rules:
            rid = rule['rule_id']
            logic = rule['check_logic']
            scope, fn = CHECK_FN.get(logic, (None, None))
            if fn is None:
                continue
            if scope == 'row':
                violated = fn(row, rule)
            elif scope == 'df':
                violated = fn(df, idx, rule)
            else:
                violated = []
            if violated:
                row_violations.append({
                    'rule_id': rid,
                    'rule_name': rule['rule_name'],
                    'severity': rule['severity'],
                    'violated_fields': violated,
                    'plain_reason': _plain_reason(rule, violated, row=row, df=df, row_idx=idx),
                    'chinese_explanation': rule.get('chinese_explanation', '')
                })
                rule_stats[rid]['violation_count'] += 1
        passed = len(row_violations) == 0
        worst_sev = None
        if row_violations:
            sev_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
            row_violations.sort(key=lambda x: sev_order.get(x['severity'], 9))
            worst_sev = row_violations[0]['severity']
        processing_records.append({
            'record_id': record_id,
            'contract_no': row.get('contract_no'),
            'party_a': row.get('party_a'),
            'check_passed': passed,
            'violation_count': len(row_violations),
            'worst_severity': worst_sev,
            'worst_severity_cn': SEVERITY_MAP.get(worst_sev, ('-', '#888'))[0] if worst_sev else '-',
            'violation_rules': ';'.join([v['rule_id'] for v in row_violations]),
            'violation_summary_text': ' | '.join([f"[{v['rule_id']}]{v['plain_reason']}" for v in row_violations]),
            'data_source': row.get('data_source'),
            'operator': row.get('operator'),
            'checked_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        for v in row_violations:
            violation_summary.append({
                'record_id': record_id,
                'contract_no': row.get('contract_no'),
                'party_a': row.get('party_a'),
                'party_b': row.get('party_b'),
                'rule_id': v['rule_id'],
                'rule_name': v['rule_name'],
                'severity': v['severity'],
                'severity_cn': SEVERITY_MAP.get(v['severity'], ('-', '#888'))[0],
                'severity_color': SEVERITY_MAP.get(v['severity'], ('-', '#888'))[1],
                'violated_fields_cn': _extract_cn_fields(v['violated_fields']),
                'plain_reason': v['plain_reason'],
                'chinese_explanation': v['chinese_explanation'],
                'handling_suggestion': _suggest_handling(v['severity'], v['rule_id']),
                'data_source': row.get('data_source'),
                'operator': row.get('operator')
            })
    proc_df = pd.DataFrame(processing_records)
    viol_df = pd.DataFrame(violation_summary)
    stats_df = pd.DataFrame([
        {
            'rule_id': rid,
            'rule_name': info['rule_name'],
            'severity': info['severity'],
            'severity_cn': SEVERITY_MAP.get(info['severity'], ('-',''))[0],
            'violation_count': info['violation_count'],
            'violation_rate_pct': round(info['violation_count'] / max(len(df),1) * 100, 1)
        } for rid, info in rule_stats.items()
    ]).sort_values('violation_count', ascending=False).reset_index(drop=True)
    proc_df.to_excel(os.path.join(output_dir, 'processing_records.xlsx'), index=False)
    viol_df.to_excel(os.path.join(output_dir, 'violation_details.xlsx'), index=False)
    stats_df.to_excel(os.path.join(output_dir, 'rule_violation_stats.xlsx'), index=False)
    return proc_df, viol_df, stats_df

def _suggest_handling(severity, rule_id):
    if severity == 'critical':
        return '立即驳回，退回录入人补齐核心字段，不允许进入下一环节'
    if severity == 'high':
        return '限期整改，24小时内修正后重新提交复核'
    if severity == 'medium':
        return '标注提醒，可先流转但需在本周内完成修正'
    return '记录在案，下轮复核时重点关注即可'

def build_trace_chain(proc_df, viol_df, version_df, record_id):
    proc_row = proc_df[proc_df['record_id'] == record_id]
    viols = viol_df[viol_df['record_id'] == record_id]
    vers = version_df[version_df['record_id'] == record_id].sort_values('modified_at') if version_df is not None else pd.DataFrame()
    chain = {
        'record_id': record_id,
        'processing_snapshot': proc_row.to_dict('records')[0] if len(proc_row) else {},
        'safety_rule_violations': viols.to_dict('records'),
        'version_history': vers.to_dict('records'),
        'handling_actions': []
    }
    for _, v in viols.iterrows():
        chain['handling_actions'].append({
            'rule_id': v['rule_id'],
            'rule_name': v['rule_name'],
            'severity_cn': v['severity_cn'],
            'why_it_failed': v['plain_reason'],
            'what_the_rule_means': v['chinese_explanation'],
            'suggested_fix': v['handling_suggestion']
        })
    return chain

if __name__ == '__main__':
    print("模块已定义")
