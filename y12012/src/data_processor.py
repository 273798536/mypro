import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class FeeDataProcessor:
    def __init__(self):
        self.students_df: Optional[pd.DataFrame] = None
        self.payments_df: Optional[pd.DataFrame] = None
        self.merged_df: Optional[pd.DataFrame] = None
        self.conflicts: List[Dict] = []
        self.anomalies: Dict[str, List] = {}
        
    def load_students(self, filepath: str) -> None:
        self.students_df = pd.read_csv(filepath, encoding='utf-8')
        self.students_df['报名日期'] = pd.to_datetime(self.students_df['报名日期'])
        self.students_df['_来源'] = '学生名单'
        
    def load_payments(self, filepath: str) -> None:
        self.payments_df = pd.read_csv(filepath, encoding='utf-8')
        self.payments_df['缴费日期'] = pd.to_datetime(self.payments_df['缴费日期'])
        self.payments_df['_来源'] = '缴费流水'
        
    def detect_conflicts(self) -> List[Dict]:
        if self.students_df is None or self.payments_df is None:
            return []
            
        self.conflicts = []
        
        student_keys = self.students_df.groupby(['学生ID', '项目编码'])
        payment_keys = self.payments_df[self.payments_df['缴费金额'] > 0].groupby(['学生ID', '项目编码'])
        
        all_student_keys = set(student_keys.groups.keys())
        all_payment_keys = set(payment_keys.groups.keys())
        
        in_student_not_payment = all_student_keys - all_payment_keys
        in_payment_not_student = all_payment_keys - all_student_keys
        
        for student_id, project_code in in_student_not_payment:
            student_info = self.students_df[
                (self.students_df['学生ID'] == student_id) & 
                (self.students_df['项目编码'] == project_code)
            ].iloc[0]
            
            if student_info['状态'] not in ['已取消', '转班']:
                self.conflicts.append({
                    '类型': '有名单无缴费',
                    '学生ID': student_id,
                    '姓名': student_info['姓名'],
                    '项目编码': project_code,
                    '项目名称': student_info['项目名称'],
                    '应收金额': student_info['应收金额'],
                    '学生名单状态': student_info['状态'],
                    '缴费流水状态': '无记录',
                    '说明': f"学生名单中有该生报名此项目，但缴费流水中无对应缴费记录（状态：{student_info['状态']}）"
                })
        
        for student_id, project_code in in_payment_not_student:
            payment_info = self.payments_df[
                (self.payments_df['学生ID'] == student_id) & 
                (self.payments_df['项目编码'] == project_code) &
                (self.payments_df['缴费金额'] > 0)
            ].iloc[0]
            
            self.conflicts.append({
                '类型': '有缴费无名单',
                '学生ID': student_id,
                '姓名': payment_info['姓名'],
                '项目编码': project_code,
                '项目名称': payment_info['项目名称'],
                '缴费金额': payment_info['缴费金额'],
                '学生名单状态': '无记录',
                '缴费流水状态': '已缴费',
                '说明': '缴费流水中有该生缴费记录，但学生名单中无对应报名记录'
            })
            
        common_keys = all_student_keys & all_payment_keys
        for student_id, project_code in common_keys:
            student_info = self.students_df[
                (self.students_df['学生ID'] == student_id) & 
                (self.students_df['项目编码'] == project_code)
            ].iloc[0]
            
            payment_total = self.payments_df[
                (self.payments_df['学生ID'] == student_id) & 
                (self.payments_df['项目编码'] == project_code)
            ]['缴费金额'].sum()
            
            expected = student_info['应收金额']
            
            if abs(payment_total - expected) > 0.01:
                self.conflicts.append({
                    '类型': '金额不一致',
                    '学生ID': student_id,
                    '姓名': student_info['姓名'],
                    '项目编码': project_code,
                    '项目名称': student_info['项目名称'],
                    '应收金额': expected,
                    '实缴金额': payment_total,
                    '差额': payment_total - expected,
                    '说明': f"应收金额({expected}元)与实缴金额({payment_total}元)不一致，差额{payment_total - expected}元"
                })
                
        return self.conflicts
    
    def detect_anomalies(self) -> Dict[str, List]:
        if self.payments_df is None:
            return {}
            
        self.anomalies = {
            '重复缴费': [],
            '项目取消退款': [],
            '转班记录': [],
            '补缴记录': [],
            '退款记录': []
        }
        
        payments_sorted = self.payments_df.sort_values(['学生ID', '项目编码', '缴费日期'])
        
        positive_payments = payments_sorted[payments_sorted['缴费金额'] > 0]
        payment_counts = positive_payments.groupby(['学生ID', '项目编码']).size()
        duplicates = payment_counts[payment_counts > 1]
        
        for (student_id, project_code), count in duplicates.items():
            records = positive_payments[
                (positive_payments['学生ID'] == student_id) & 
                (positive_payments['项目编码'] == project_code)
            ]
            
            total_amount = records['缴费金额'].sum()
            self.anomalies['重复缴费'].append({
                '学生ID': student_id,
                '姓名': records.iloc[0]['姓名'],
                '项目编码': project_code,
                '项目名称': records.iloc[0]['项目名称'],
                '缴费次数': count,
                '总金额': total_amount,
                '流水号列表': ', '.join(records['流水号'].tolist()),
                '说明': f"该生同一项目缴费{count}次，累计{total_amount}元，需核实是否为重复缴费"
            })
        
        refunds = payments_sorted[payments_sorted['缴费金额'] < 0]
        
        for _, refund in refunds.iterrows():
            if '取消' in str(refund.get('备注', '')):
                self.anomalies['项目取消退款'].append({
                    '流水号': refund['流水号'],
                    '学生ID': refund['学生ID'],
                    '姓名': refund['姓名'],
                    '项目编码': refund['项目编码'],
                    '项目名称': refund['项目名称'],
                    '退款金额': abs(refund['缴费金额']),
                    '退款日期': refund['缴费日期'].strftime('%Y-%m-%d'),
                    '备注': refund.get('备注', ''),
                    '说明': '项目取消导致的全额退款'
                })
            elif '转班' in str(refund.get('备注', '')):
                self.anomalies['转班记录'].append({
                    '流水号': refund['流水号'],
                    '学生ID': refund['学生ID'],
                    '姓名': refund['姓名'],
                    '项目编码': refund['项目编码'],
                    '项目名称': refund['项目名称'],
                    '变动金额': refund['缴费金额'],
                    '日期': refund['缴费日期'].strftime('%Y-%m-%d'),
                    '备注': refund.get('备注', ''),
                    '说明': '转班退费记录'
                })
            else:
                self.anomalies['退款记录'].append({
                    '流水号': refund['流水号'],
                    '学生ID': refund['学生ID'],
                    '姓名': refund['姓名'],
                    '项目编码': refund['项目编码'],
                    '项目名称': refund['项目名称'],
                    '退款金额': abs(refund['缴费金额']),
                    '退款日期': refund['缴费日期'].strftime('%Y-%m-%d'),
                    '备注': refund.get('备注', '无备注'),
                    '说明': '其他原因退款'
                })
        
        supplement_payments = payments_sorted[
            (payments_sorted['缴费金额'] > 0) & 
            (payments_sorted['备注'].str.contains('补缴|补差', na=False))
        ]
        
        for _, payment in supplement_payments.iterrows():
            if '转班' in str(payment.get('备注', '')):
                self.anomalies['转班记录'].append({
                    '流水号': payment['流水号'],
                    '学生ID': payment['学生ID'],
                    '姓名': payment['姓名'],
                    '项目编码': payment['项目编码'],
                    '项目名称': payment['项目名称'],
                    '变动金额': payment['缴费金额'],
                    '日期': payment['缴费日期'].strftime('%Y-%m-%d'),
                    '备注': payment.get('备注', ''),
                    '说明': '转班补差记录'
                })
            else:
                self.anomalies['补缴记录'].append({
                    '流水号': payment['流水号'],
                    '学生ID': payment['学生ID'],
                    '姓名': payment['姓名'],
                    '项目编码': payment['项目编码'],
                    '项目名称': payment['项目名称'],
                    '补缴金额': payment['缴费金额'],
                    '补缴日期': payment['缴费日期'].strftime('%Y-%m-%d'),
                    '备注': payment.get('备注', ''),
                    '说明': '费用补缴'
                })
                
        return self.anomalies
    
    def aggregate_fees(self) -> pd.DataFrame:
        if self.payments_df is None:
            return pd.DataFrame()
            
        fee_summary = self.payments_df.groupby(['项目编码', '项目名称']).agg({
            '缴费金额': ['sum', 'count'],
            '学生ID': pd.Series.nunique
        }).reset_index()
        
        fee_summary.columns = ['项目编码', '项目名称', '实收金额', '缴费笔数', '缴费人数']
        
        if self.students_df is not None:
            student_summary = self.students_df.groupby(['项目编码', '项目名称']).agg({
                '应收金额': 'sum',
                '学生ID': 'count'
            }).reset_index()
            student_summary.columns = ['项目编码', '项目名称', '应收金额', '应缴人数']
            
            fee_summary = fee_summary.merge(student_summary, on=['项目编码', '项目名称'], how='outer')
            fee_summary = fee_summary.fillna(0)
            fee_summary['差额'] = fee_summary['实收金额'] - fee_summary['应收金额']
            
        fee_summary = fee_summary.sort_values('实收金额', ascending=False)
        
        return fee_summary
    
    def get_student_fee_detail(self, student_id: str) -> Dict:
        if self.payments_df is None or self.students_df is None:
            return {}
            
        student_payments = self.payments_df[self.payments_df['学生ID'] == student_id].copy()
        student_projects = self.students_df[self.students_df['学生ID'] == student_id].copy()
        
        if len(student_payments) == 0 and len(student_projects) == 0:
            return {}
            
        total_paid = student_payments['缴费金额'].sum()
        total_expected = student_projects[student_projects['状态'] == '在读']['应收金额'].sum()
        
        return {
            '学生ID': student_id,
            '姓名': student_payments.iloc[0]['姓名'] if len(student_payments) > 0 else student_projects.iloc[0]['姓名'],
            '报名项目': student_projects.to_dict('records'),
            '缴费记录': student_payments.to_dict('records'),
            '应缴总额': total_expected,
            '实缴总额': total_paid,
            '差额': total_paid - total_expected
        }
    
    def get_conflicts_dataframe(self) -> pd.DataFrame:
        if not self.conflicts:
            return pd.DataFrame()
        return pd.DataFrame(self.conflicts)
    
    def get_anomalies_dataframe(self, anomaly_type: str) -> pd.DataFrame:
        if anomaly_type not in self.anomalies or not self.anomalies[anomaly_type]:
            return pd.DataFrame()
        return pd.DataFrame(self.anomalies[anomaly_type])
    
    def process_all(self, students_path: str, payments_path: str) -> None:
        self.load_students(students_path)
        self.load_payments(payments_path)
        self.detect_conflicts()
        self.detect_anomalies()
