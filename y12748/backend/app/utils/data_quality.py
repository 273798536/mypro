import pandas as pd
import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class DataQualityIssue:
    row_index: Optional[int]
    question_id: Optional[str]
    issue_type: str
    field_name: Optional[str]
    description: str
    old_value: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class DataQualityReport:
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    issues: List[DataQualityIssue] = field(default_factory=list)
    duplicates: List[Tuple[int, int, str]] = field(default_factory=list)


class DataQualityChecker:

    REQUIRED_FIELDS = ['question_id', 'material_name']
    NUMERIC_FIELDS = ['stress_level', 'temperature', 'lifetime_hours']
    UNIT_KEYWORDS = ['小时', 'h', 'H', '小时', '时', '秒', 's', 'S', '分钟', 'min', '天', 'd', '年', 'year']

    @staticmethod
    def check_empty_values(df: pd.DataFrame, report: DataQualityReport) -> None:
        for col in DataQualityChecker.REQUIRED_FIELDS:
            if col in df.columns:
                empty_mask = df[col].isna() | (df[col].astype(str).str.strip() == '')
                for idx in df[empty_mask].index:
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(df.iloc[idx].get('question_id', '')) if 'question_id' in df.columns else None,
                        issue_type='empty_value',
                        field_name=col,
                        description=f'必填字段 {col} 为空',
                        old_value=str(df.iloc[idx].get(col, ''))
                    ))
                    report.invalid_records += 1

        for col in DataQualityChecker.NUMERIC_FIELDS:
            if col in df.columns:
                empty_mask = df[col].isna() | (df[col].astype(str).str.strip() == '')
                for idx in df[empty_mask].index:
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(df.iloc[idx].get('question_id', '')) if 'question_id' in df.columns else None,
                        issue_type='empty_value',
                        field_name=col,
                        description=f'数值字段 {col} 为空，计算可能受影响',
                        old_value=str(df.iloc[idx].get(col, ''))
                    ))

    @staticmethod
    def check_unit_issues(df: pd.DataFrame, report: DataQualityReport) -> None:
        if 'unit' not in df.columns:
            return

        for idx, row in df.iterrows():
            unit_val = str(row.get('unit', '')).strip()
            lifetime_val = str(row.get('lifetime_hours', '')).strip()

            if not unit_val and lifetime_val:
                has_unit_in_lifetime = any(kw in lifetime_val for kw in DataQualityChecker.UNIT_KEYWORDS)
                if has_unit_in_lifetime:
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(row.get('question_id', '')),
                        issue_type='unit_missing',
                        field_name='unit',
                        description='寿命字段包含单位但单位列为空，单位与数值混写',
                        old_value=f'lifetime={lifetime_val}, unit={unit_val}'
                    ))
                else:
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(row.get('question_id', '')),
                        issue_type='unit_missing',
                        field_name='unit',
                        description='单位缺失，无法确定寿命计量单位',
                        old_value=f'lifetime={lifetime_val}'
                    ))

    @staticmethod
    def check_mixed_remark(df: pd.DataFrame, report: DataQualityReport) -> None:
        mixed_patterns = [
            r'^[\d\.]+[\s\S]*[^\d\.\s]',
            r'[^\d\.\s][\s\S]*[\d\.]+$'
        ]

        for col in DataQualityChecker.NUMERIC_FIELDS + ['unit']:
            if col not in df.columns:
                continue
            for idx, row in df.iterrows():
                val = str(row.get(col, '')).strip()
                if not val or val.lower() in ['nan', 'none']:
                    continue

                has_number = bool(re.search(r'\d+\.?\d*', val))
                has_text = bool(re.search(r'[^\d\.\s,;:，。；：]+', val))

                if has_number and has_text:
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(row.get('question_id', '')),
                        issue_type='mixed_remark',
                        field_name=col,
                        description=f'字段 {col} 数值与备注混写，需要拆分',
                        old_value=val,
                        suggestion='请将数值与备注信息分开填写'
                    ))

    @staticmethod
    def check_duplicates(df: pd.DataFrame, report: DataQualityReport) -> None:
        if 'question_id' not in df.columns:
            return

        qid_groups = {}
        for idx, row in df.iterrows():
            qid = str(row.get('question_id', '')).strip()
            if not qid or qid.lower() in ['nan', 'none']:
                continue
            if qid not in qid_groups:
                qid_groups[qid] = []
            qid_groups[qid].append(int(idx))

        for qid, indices in qid_groups.items():
            if len(indices) > 1:
                report.duplicates.append((indices[0], indices[1:], qid))
                for dup_idx in indices[1:]:
                    report.issues.append(DataQualityIssue(
                        row_index=dup_idx,
                        question_id=qid,
                        issue_type='duplicate',
                        field_name='question_id',
                        description=f'题目编号 {qid} 重复，与第 {indices[0]} 行重复',
                        old_value=qid
                    ))

    @staticmethod
    def check_conflicts(df: pd.DataFrame, report: DataQualityReport) -> None:
        check_fields = ['material_name', 'stress_level', 'temperature', 'lifetime_hours']

        if 'question_id' not in df.columns:
            return

        qid_groups = df.groupby('question_id')
        for qid, group in qid_groups:
            if len(group) <= 1:
                continue
            for field in check_fields:
                if field not in group.columns:
                    continue
                values = group[field].dropna().unique()
                if len(values) > 1:
                    for idx in group.index:
                        report.issues.append(DataQualityIssue(
                            row_index=int(idx),
                            question_id=str(qid),
                            issue_type='conflict',
                            field_name=field,
                            description=f'同一题目 {field} 存在多个不同值: {values}',
                            old_value=str(group.loc[idx, field])
                        ))

    @staticmethod
    def check_numeric_validity(df: pd.DataFrame, report: DataQualityReport) -> None:
        for col in DataQualityChecker.NUMERIC_FIELDS:
            if col not in df.columns:
                continue
            for idx, val in df[col].items():
                if pd.isna(val) or str(val).strip() == '':
                    continue
                try:
                    num_val = float(val)
                    if num_val < 0:
                        report.issues.append(DataQualityIssue(
                            row_index=int(idx),
                            question_id=str(df.iloc[idx].get('question_id', '')) if 'question_id' in df.columns else None,
                            issue_type='invalid_numeric',
                            field_name=col,
                            description=f'字段 {col} 值为负数: {val}',
                            old_value=str(val)
                        ))
                except (ValueError, TypeError):
                    report.issues.append(DataQualityIssue(
                        row_index=int(idx),
                        question_id=str(df.iloc[idx].get('question_id', '')) if 'question_id' in df.columns else None,
                        issue_type='invalid_numeric',
                        field_name=col,
                        description=f'字段 {col} 不是有效数值: {val}',
                        old_value=str(val)
                    ))

    @staticmethod
    def analyze(df: pd.DataFrame) -> DataQualityReport:
        report = DataQualityReport()
        report.total_records = len(df)
        report.valid_records = len(df)

        DataQualityChecker.check_empty_values(df, report)
        DataQualityChecker.check_numeric_validity(df, report)
        DataQualityChecker.check_unit_issues(df, report)
        DataQualityChecker.check_mixed_remark(df, report)
        DataQualityChecker.check_duplicates(df, report)
        DataQualityChecker.check_conflicts(df, report)

        seen_invalid = set()
        for issue in report.issues:
            if issue.row_index is not None and issue.issue_type in ['empty_value', 'invalid_numeric']:
                if issue.row_index not in seen_invalid:
                    report.invalid_records += 1
                    seen_invalid.add(issue.row_index)

        report.valid_records = max(0, report.total_records - report.invalid_records)

        return report

    @staticmethod
    def get_record_flags(issue_list: List[DataQualityIssue], row_idx: int) -> Dict[str, Any]:
        row_issues = [i for i in issue_list if i.row_index == row_idx]
        issue_types = [i.issue_type for i in row_issues]
        return {
            'has_unit_issue': 'unit_missing' in issue_types,
            'has_empty_value': 'empty_value' in issue_types,
            'has_mixed_remark': 'mixed_remark' in issue_types,
            'has_conflict': 'conflict' in issue_types,
            'is_duplicate': 'duplicate' in issue_types,
            'conflict_detail': '; '.join([i.description for i in row_issues if i.issue_type == 'conflict']) or None
        }
