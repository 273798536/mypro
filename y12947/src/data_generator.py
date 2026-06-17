import pandas as pd
import numpy as np
import random
import os
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

PARTY_A_LIST = [
    '北京星辰科技有限公司', '上海云启信息技术有限公司', '深圳智联数据服务有限公司',
    '广州智造产业集团', '杭州新网电子商务有限公司', '成都飞跃软件开发有限公司',
    '南京绿洲环保科技有限公司', '武汉恒泰建筑工程有限公司', '西安丝路贸易有限公司',
    '重庆山城物流集团有限公司'
]

PARTY_B_LIST = [
    '锐思咨询管理有限公司', '明德会计师事务所', '华信律师事务所',
    '蓝图工程设计有限公司', '众包人力资源服务有限公司', '云端网络安全科技有限公司',
    '智慧城市场景解决方案有限公司', '金典品牌策划有限公司', '绿能新能源技术有限公司',
    '精准数据标注服务有限公司'
]

CONTRACT_TYPES = ['采购合同', '服务外包', '工程建设', '技术合作', '咨询服务']
STATUS_LIST = ['正常', '补录', '待确认', '作废']
BIZ_TAGS = ['BT01', 'BT02', 'BT03', 'BT04', 'BT05', None]
SECONDARY_TAGS = ['ST01', 'ST02', 'ST03', 'ST04', None]
PERSONS = ['张伟', '李娜', '王磊', '刘洋', '陈静', '杨帆', '赵敏', '周强', '吴芳', '郑涛', None]

def _random_date(start_year=2022, end_year=2024):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    days = (end - start).days
    return start + timedelta(days=random.randint(0, days))

def _dirty_date_format(date_val):
    r = random.random()
    if r < 0.15:
        return f"{date_val.month}月{date_val.day}号"
    elif r < 0.25:
        return date_val.strftime('%Y.%m.%d')
    elif r < 0.30:
        return date_val.strftime('%Y/%m/%d')
    elif r < 0.33:
        return None
    else:
        return date_val.strftime('%Y-%m-%d')

def _dirty_amount_with_unit():
    base = round(random.uniform(5, 5000), 2)
    r = random.random()
    if r < 0.20:
        return f"{base}"
    elif r < 0.30:
        return f"{base} 元"
    elif r < 0.55:
        return f"{base}万元"
    elif r < 0.75:
        return f"{base} 万元"
    elif r < 0.90:
        return f"{base}亿元"
    else:
        return None

def _dirty_phone():
    r = random.random()
    if r < 0.15:
        return None
    elif r < 0.25:
        return '138' + ''.join([str(random.randint(0,9)) for _ in range(5)])
    elif r < 0.30:
        return '座机:010-8888' + str(random.randint(1000,9999))
    else:
        return '1' + random.choice(['3','5','7','8','9']) + ''.join([str(random.randint(0,9)) for _ in range(9)])

def generate_base_contracts(n=120):
    records = []
    for i in range(n):
        contract_no = f"HT{20240000 + i}"
        sign_date = _random_date()
        start_date = sign_date + timedelta(days=random.randint(0, 30))
        duration = random.randint(1, 60)
        end_date = start_date + timedelta(days=duration * 30)
        party_a = random.choice(PARTY_A_LIST)
        party_b = random.choice(PARTY_B_LIST)
        amount = _dirty_amount_with_unit()
        payment = _dirty_amount_with_unit()
        penalty = _dirty_amount_with_unit()
        status = np.random.choice(STATUS_LIST, p=[0.65, 0.15, 0.12, 0.08])
        contact_name = np.random.choice(PERSONS, p=[0.09]*9 + [0.08, 0.11])
        contact_phone = _dirty_phone() if contact_name else (random.random() < 0.05 and _dirty_phone() or None)
        tag1 = random.choice(BIZ_TAGS)
        tag2 = random.choice(BIZ_TAGS) if random.random() < 0.4 else None
        tag3 = random.choice(SECONDARY_TAGS) if random.random() < 0.3 else None
        duration_val = random.randint(1, 70) if random.random() < 0.88 else None
        supplement = None
        if status == '补录':
            r = random.random()
            if r < 0.55:
                supplement = random.choice([
                    '3月归档时遗漏，5月盘点发现补录',
                    '原合同在旧系统，迁移时漏了',
                    '财务对账发现缺少，从纸质合同补录',
                    '业务部门6月补充提交', None
                ])
        record_date = _dirty_date_format(_random_date(2024, 2024))
        records.append({
            'record_id': f'REC{i+1:04d}',
            'contract_no': contract_no,
            'sign_date': _dirty_date_format(sign_date),
            'start_date': _dirty_date_format(start_date),
            'end_date': _dirty_date_format(end_date),
            'record_date': record_date,
            'party_a': party_a if random.random() > 0.05 else None,
            'party_b': party_b if random.random() > 0.04 else None,
            'contract_amount': amount,
            'payment_amount': payment if random.random() > 0.1 else None,
            'penalty_amount': penalty if random.random() > 0.35 else None,
            'contract_duration_years': duration_val,
            'record_status': status,
            'supplement_reason': supplement,
            'contact_name': contact_name,
            'contact_phone': contact_phone,
            'biz_tag_1': tag1,
            'biz_tag_2': tag2,
            'biz_tag_3': tag3,
            'data_source': np.random.choice(['旧表迁移', '人工录入', '接口同步'], p=[0.35, 0.45, 0.20]),
            'operator': random.choice(['李晓红', '王建国', '陈志明', '刘美玲', '张军'])
        })
    return pd.DataFrame(records)

def inject_duplicates(df):
    dup_indices = random.sample(range(len(df)), 5)
    dup_rows = df.iloc[dup_indices].copy()
    dup_rows['record_id'] = [f'REC{len(df)+i+1:04d}' for i in range(len(dup_rows))]
    dup_rows['data_source'] = '重复录入-人工复核发现'
    for i in range(len(dup_rows)):
        if random.random() < 0.6:
            dup_rows.iloc[i, dup_rows.columns.get_loc('contract_amount')] = _dirty_amount_with_unit()
    return pd.concat([df, dup_rows], ignore_index=True)

def inject_old_format_records(df, n=15):
    old_records = []
    for i in range(n):
        old_records.append({
            'record_id': f'OLD{i+1:04d}',
            'contract_no': f'[旧]{20220000 + random.randint(100,999)}' if random.random() < 0.7 else None,
            'sign_date': f"{random.randint(2020,2023)}年{random.randint(1,12)}月",
            'start_date': None,
            'end_date': None,
            'record_date': '见备注',
            'party_a': random.choice(PARTY_A_LIST) if random.random() > 0.1 else '（见附件）',
            'party_b': random.choice(PARTY_B_LIST),
            'contract_amount': f"约{random.randint(50,800)}万" if random.random() < 0.8 else None,
            'payment_amount': None,
            'penalty_amount': None,
            'contract_duration_years': None,
            'record_status': '补录',
            'supplement_reason': None,
            'contact_name': random.choice(PERSONS) if random.random() > 0.4 else None,
            'contact_phone': None,
            'biz_tag_1': None,
            'biz_tag_2': None,
            'biz_tag_3': None,
            'data_source': '旧表迁移-Excel2003版',
            'operator': '历史数据'
        })
    old_df = pd.DataFrame(old_records)
    return pd.concat([df, old_df], ignore_index=True)

def generate_split_list():
    items = []
    for batch in ['A批次', 'B批次', 'C批次']:
        for i in range(1, 51):
            items.append({
                'split_batch': batch,
                'record_ref': f'REC{((ord(batch[0])-65)*50 + i):04d}',
                'split_category': np.random.choice(['训练集', '验证集', '测试集'], p=[0.6, 0.2, 0.2]),
                'annotator': random.choice(['标注员甲', '标注员乙', '标注员丙', '标注员丁']),
                'deadline': (datetime(2024, 6, 25) + timedelta(days=random.randint(-5, 3))).strftime('%Y-%m-%d')
            })
    return pd.DataFrame(items)

def generate_eval_questions():
    questions = []
    scenarios = [
        ('金额漏填单位', '合同金额写着"320"，后面没写万元还是元', 'R001'),
        ('日期写成中文', '签署日期写的"3月15号"不是标准格式', 'R002'),
        ('只填名字没电话', '写了联系人张伟，但手机号那栏空着', 'R003'),
        ('合同编号重复', '同一批里两份合同都是HT20240015', 'R004'),
        ('没打业务标签', '三个业务标签全空着', 'R005'),
        ('补录没写原因', '标了补录但补录原因没填', 'R006'),
        ('期限超过合理值', '合同期限写了99年', 'R007'),
        ('甲方名称空着', '甲方那栏没填公司名', 'R008'),
    ]
    for idx, (title, desc, rule) in enumerate(scenarios):
        for diff in ['简单', '中等', '困难']:
            questions.append({
                'qid': f'EVAL-{idx+1:02d}-{diff[0]}',
                'scenario_title': title,
                'scenario_description': desc,
                'related_rule': rule,
                'difficulty': diff,
                'correct_action': random.choice(['驳回修正', '通过并备注', '转交业务确认']),
                'in_batch': random.choice(['A批次', 'B批次', 'C批次'])
            })
    return pd.DataFrame(questions)

def generate_label_conflict_samples(df):
    conflicts = []
    candidate_idx = random.sample(list(df[df['biz_tag_1'].notna()].index), min(18, len(df)))
    for idx in candidate_idx:
        row = df.iloc[idx]
        tag_choices = ['BT01', 'BT02', 'BT03', 'BT04', 'BT05']
        tag_choices.remove(row['biz_tag_1']) if row['biz_tag_1'] in tag_choices else None
        other_tag = random.choice(tag_choices)
        conflicts.append({
            'record_id': row['record_id'],
            'contract_no': row['contract_no'],
            'annotator_A_tag': row['biz_tag_1'],
            'annotator_B_tag': other_tag,
            'annotator_A': '标注员甲',
            'annotator_B': '标注员乙',
            'conflict_type': '业务标签不一致',
            'review_result': None,
            'reviewer': None,
            'review_comment': None
        })
    return pd.DataFrame(conflicts)

def generate_version_history(df):
    versions = []
    for idx, row in df.iterrows():
        n_versions = random.randint(1, 4)
        for v in range(1, n_versions + 1):
            versions.append({
                'record_id': row['record_id'],
                'version_no': f'V{v}.0',
                'modified_at': (datetime(2024, 5, 1) + timedelta(days=random.randint(0,45), hours=random.randint(8,20))).strftime('%Y-%m-%d %H:%M'),
                'modified_by': random.choice(['李晓红', '王建国', '陈志明', '刘美玲', '张军', '系统自动']),
                'change_summary': random.choice([
                    '首次录入', '修正金额单位', '补充签署日期',
                    '更新业务标签', '添加补录原因', '修正合同编号',
                    '补充联系方式', '更新合同期限', '复核通过'
                ]),
                'fields_changed': random.choice([
                    'contract_amount', 'sign_date,start_date', 'biz_tag_1,biz_tag_2',
                    'supplement_reason', 'contract_no', 'contact_phone',
                    'contract_duration_years', 'record_status', None
                ])
            })
    return pd.DataFrame(versions)

def generate_all(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    base_df = generate_base_contracts(120)
    base_df = inject_duplicates(base_df)
    base_df = inject_old_format_records(base_df, 15)
    split_df = generate_split_list()
    eval_df = generate_eval_questions()
    conflict_df = generate_label_conflict_samples(base_df)
    version_df = generate_version_history(base_df)
    base_df.to_excel(os.path.join(output_dir, 'contract_records.xlsx'), index=False)
    split_df.to_excel(os.path.join(output_dir, 'split_list.xlsx'), index=False)
    eval_df.to_excel(os.path.join(output_dir, 'eval_questions.xlsx'), index=False)
    conflict_df.to_excel(os.path.join(output_dir, 'label_conflicts.xlsx'), index=False)
    version_df.to_excel(os.path.join(output_dir, 'version_history.xlsx'), index=False)
    manifest = {
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'contract_records_count': len(base_df),
        'split_list_count': len(split_df),
        'eval_questions_count': len(eval_df),
        'label_conflicts_count': len(conflict_df),
        'version_history_count': len(version_df),
        'batches_included': 'A批次+B批次+C批次（切分清单、评测题库、脏样本同在本轮复核）',
        'special_notes': '包含旧表迁移不规范格式、补录未填原因、漏填金额单位、重复合同编号、标签冲突等日常常见问题'
    }
    import json
    with open(os.path.join(output_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return base_df, split_df, eval_df, conflict_df, version_df, manifest

if __name__ == '__main__':
    generate_all('/Users/mac/pro/solo/workspaces/y12947/data/raw')
    print("模拟数据已生成")
