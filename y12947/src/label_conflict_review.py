import pandas as pd
import os
import random
from datetime import datetime

TAG_NAME_MAP = {
    'BT01': '采购合同', 'BT02': '服务外包', 'BT03': '工程建设',
    'BT04': '技术合作', 'BT05': '咨询服务',
    'ST01': '紧急', 'ST02': '常规', 'ST03': '年度框架', 'ST04': '单次执行'
}

def _tag_name(code):
    if not code or (isinstance(code, float) and pd.isna(code)):
        return '未标注'
    return TAG_NAME_MAP.get(str(code).strip(), str(code))

def detect_conflicts_from_records(df, rules_config):
    conflicts = []
    tag_defs = rules_config.get('tag_definitions', {})
    primary_codes = [t['code'] for t in tag_defs.get('primary_tags', [])]
    secondary_codes = [t['code'] for t in tag_defs.get('secondary_tags', [])]
    for idx, row in df.iterrows():
        record_id = row.get('record_id')
        tag1 = row.get('biz_tag_1')
        tag2 = row.get('biz_tag_2')
        tag3 = row.get('biz_tag_3')
        if tag1 and tag2 and str(tag1).strip() and str(tag2).strip():
            t1, t2 = str(tag1).strip(), str(tag2).strip()
            if t1 != t2 and t1 in primary_codes and t2 in primary_codes:
                conflicts.append({
                    'record_id': record_id,
                    'contract_no': row.get('contract_no'),
                    'conflict_type': '主业务标签冲突',
                    'tag_a_code': t1,
                    'tag_a_name': _tag_name(t1),
                    'tag_b_code': t2,
                    'tag_b_name': _tag_name(t2),
                    'source': '同一记录多主标',
                    'annotator_a': row.get('operator'),
                    'annotator_b': row.get('operator')
                })
        if tag3 and str(tag3).strip() and str(tag3).strip() in primary_codes:
            conflicts.append({
                'record_id': record_id,
                'contract_no': row.get('contract_no'),
                'conflict_type': '辅助标签误用',
                'tag_a_code': str(tag3).strip(),
                'tag_a_name': _tag_name(str(tag3).strip()),
                'tag_b_code': '（应使用次标区）',
                'tag_b_name': '辅助标签区应放紧急/常规等',
                'source': '标签层级错位',
                'annotator_a': row.get('operator'),
                'annotator_b': '规则引擎'
            })
    return pd.DataFrame(conflicts)

def merge_conflicts(auto_df, manual_df):
    if len(auto_df) == 0:
        return manual_df.copy() if manual_df is not None else pd.DataFrame()
    if manual_df is None or len(manual_df) == 0:
        return auto_df.copy()
    manual_slim = manual_df.rename(columns={
        'annotator_A_tag': 'tag_a_code', 'annotator_B_tag': 'tag_b_code',
        'annotator_A': 'annotator_a', 'annotator_B': 'annotator_b'
    }).copy()
    manual_slim['tag_a_name'] = manual_slim['tag_a_code'].apply(_tag_name)
    manual_slim['tag_b_name'] = manual_slim['tag_b_code'].apply(_tag_name)
    manual_slim['source'] = '双人标注差异'
    keep_cols = ['record_id','contract_no','conflict_type','tag_a_code','tag_a_name','tag_b_code','tag_b_name','source','annotator_a','annotator_b']
    for c in keep_cols:
        if c not in manual_slim.columns:
            manual_slim[c] = None
    merged = pd.concat([auto_df[keep_cols], manual_slim[keep_cols]], ignore_index=True)
    return merged

def auto_review(conflict_df, contract_df):
    results = []
    contract_indexed = contract_df.set_index('record_id') if 'record_id' in contract_df.columns else contract_df
    reviewers = ['复核主管-李明', '复核主管-王芳', '资深标注-赵刚']
    for idx, row in conflict_df.iterrows():
        rid = row.get('record_id')
        contract_row = contract_indexed.loc[rid] if rid in contract_indexed.index else None
        suggested, confidence, reason = _resolve_one(row, contract_row)
        results.append({
            'record_id': rid,
            'contract_no': row.get('contract_no'),
            'conflict_type': row.get('conflict_type'),
            'tag_a': f"{row.get('tag_a_code')}({row.get('tag_a_name')})",
            'tag_b': f"{row.get('tag_b_code')}({row.get('tag_b_name')})",
            'source': row.get('source'),
            'suggested_final_tag_code': suggested,
            'suggested_final_tag_name': _tag_name(suggested),
            'confidence_level': confidence,
            'reviewer_assigned': random.choice(reviewers),
            'auto_review_reason': reason,
            'needs_manual_escalation': confidence in ['低', '中低'],
            'review_status': '待人工确认' if confidence in ['低', '中低'] else '建议采纳',
            'reviewed_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    return pd.DataFrame(results)

def _resolve_one(row, contract_row):
    rtype = row.get('conflict_type', '')
    a_code = str(row.get('tag_a_code', '')).strip()
    b_code = str(row.get('tag_b_code', '')).strip()
    party_b = ''
    amount = ''
    if contract_row is not None:
        party_b = str(contract_row.get('party_b', '') or '')
        amount = str(contract_row.get('contract_amount', '') or '')
    if rtype == '辅助标签误用':
        return None, '高', '辅助标签位放置了主业务标签，需改为"紧急/常规/年度框架/单次执行"之一，建议直接修正。'
    is_tech_b = any(k in party_b for k in ['技术', '软件', '开发', '数据', '网络安全', '智慧'])
    is_service_b = any(k in party_b for k in ['咨询', '律师', '会计', '人力', '策划', '标注'])
    is_engineering_b = any(k in party_b for k in ['工程', '建筑', '设计', '环保', '新能源'])
    is_procurement_amount = '万' in amount and ('亿' not in amount)
    if is_tech_b and 'BT04' in [a_code, b_code]:
        return 'BT04', '中高', f'乙方"{party_b}"明显属于技术类，建议标为"技术合作(BT04)"。'
    if is_service_b and 'BT05' in [a_code, b_code]:
        return 'BT05', '中高', f'乙方"{party_b}"属于咨询/服务机构，建议标为"咨询服务(BT05)"。'
    if is_engineering_b and 'BT03' in [a_code, b_code]:
        return 'BT03', '中高', f'乙方"{party_b}"从事工程/建设相关，建议标为"工程建设(BT03)"。'
    if is_procurement_amount and 'BT01' in [a_code, b_code]:
        return 'BT01', '中', f'合同金额模式符合采购特征，倾向"采购合同(BT01)"，建议人工结合合同内容确认。'
    return a_code, '低', '缺少强判断依据，需人工打开原始合同文本核对后裁定。'

def reconcile_with_processing(conflict_review_df, processing_df, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    conflict_agg = conflict_review_df.copy()
    if len(conflict_agg) > 0:
        order_map = {'高': 0, '中高': 1, '中': 2, '低': 3}
        conflict_agg['_rank'] = conflict_agg['confidence_level'].map(order_map).fillna(9)
        conflict_agg = conflict_agg.sort_values('_rank')
        def _agg_one(g):
            r = g.iloc[0].copy()
            r['conflict_type'] = '；'.join([str(x) for x in g['conflict_type'].dropna().unique().tolist()]) or r['conflict_type']
            r['auto_review_reason'] = ' | '.join([str(x) for x in g['auto_review_reason'].dropna().unique().tolist()]) or r['auto_review_reason']
            r['needs_manual_escalation'] = bool(g['needs_manual_escalation'].fillna(False).any())
            r['review_status'] = '待人工确认' if r['needs_manual_escalation'] else r['review_status']
            return r
        conflict_agg = conflict_agg.groupby('record_id', as_index=False).apply(_agg_one).reset_index(drop=True)
        conflict_agg = conflict_agg.drop(columns=['_rank'])
    merged = processing_df.merge(
        conflict_agg[['record_id','conflict_type','suggested_final_tag_code','suggested_final_tag_name',
                      'confidence_level','review_status','needs_manual_escalation','auto_review_reason']],
        on='record_id', how='left'
    )
    merged['has_label_conflict'] = merged['conflict_type'].notna()
    summary = {
        'total_records': len(processing_df),
        'with_safety_violations': int((processing_df['violation_count'] > 0).sum()),
        'with_label_conflicts': int(merged['has_label_conflict'].sum()),
        'both_issues': int(((processing_df['violation_count'] > 0) & merged['has_label_conflict']).sum()),
        'clean_records': int(((processing_df['violation_count'] == 0) & ~merged['has_label_conflict']).sum()),
        'conflict_high_confidence_resolve': int((merged['confidence_level'].isin(['高','中高'])).sum()),
        'conflict_need_manual': int(merged['needs_manual_escalation'].fillna(False).sum())
    }
    merged.to_excel(os.path.join(output_dir, 'unified_processing_records.xlsx'), index=False)
    return merged, summary

if __name__ == '__main__':
    print("模块已定义")
