import pandas as pd
import numpy as np
import re


class DataValidator:
    def __init__(self):
        self.issue_severity = {
            'critical': '严重',
            'warning': '警告',
            'info': '提示'
        }
        self.unit_patterns = [
            r'[\u4e00-\u9fff]',
            r'[a-zA-Z]+',
            r'%',
            r'°',
            r'℃',
            r'元',
            r'个',
            r'人',
            r'天',
            r'小时',
            r'分钟',
            r'秒',
            r'米',
            r'厘米',
            r'千克',
            r'克'
        ]

    def validate_all(self, loaded_data):
        report = {}

        if 'questions' in loaded_data and not loaded_data['questions'].empty:
            report['questions'] = self._validate_questions(loaded_data['questions'])

        if 'historical_answers' in loaded_data and not loaded_data['historical_answers'].empty:
            report['historical_answers'] = self._validate_historical(loaded_data['historical_answers'])

        if 'student_errors' in loaded_data and not loaded_data['student_errors'].empty:
            report['student_errors'] = self._validate_student_errors(loaded_data['student_errors'])

        if 'constraints' in loaded_data and not loaded_data['constraints'].empty:
            report['constraints'] = self._validate_constraints(loaded_data['constraints'])

        report['cross_file'] = self._cross_file_validation(loaded_data)
        report['summary'] = self._generate_summary(report)

        return report

    def _validate_questions(self, df):
        issues = []

        required_cols = ['question_id', 'question_content', 'correct_answer', 'score']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            issues.append({
                'severity': 'critical',
                'type': 'missing_columns',
                'message': f'缺少必要列: {", ".join(missing_cols)}',
                'action': '改口径'
            })

        if 'question_id' in df.columns:
            null_ids = df[df['question_id'].isna()].index.tolist()
            if null_ids:
                issues.append({
                    'severity': 'critical',
                    'type': 'null_question_id',
                    'message': f'{len(null_ids)} 条记录题目编号为空',
                    'rows': [r + 2 for r in null_ids],
                    'action': '补材料'
                })

            dup_ids = df[df.duplicated('question_id', keep=False)]
            if not dup_ids.empty:
                dup_details = []
                for qid in dup_ids['question_id'].unique():
                    rows = dup_ids[dup_ids['question_id'] == qid].index.tolist()
                    dup_details.append({'question_id': str(qid), 'rows': [r + 2 for r in rows]})
                issues.append({
                    'severity': 'critical',
                    'type': 'duplicate_question_id',
                    'message': f'{len(dup_details)} 个题目编号重复',
                    'details': dup_details,
                    'action': '改口径'
                })

        if 'correct_answer' in df.columns:
            null_answers = df[df['correct_answer'].isna()].index.tolist()
            if null_answers:
                issues.append({
                    'severity': 'warning',
                    'type': 'null_correct_answer',
                    'message': f'{len(null_answers)} 条记录正确答案为空',
                    'rows': [r + 2 for r in null_answers],
                    'action': '补材料'
                })

        if 'score' in df.columns:
            df['score_num'] = pd.to_numeric(df['score'], errors='coerce')
            null_scores = df[df['score_num'].isna()].index.tolist()
            if null_scores:
                issues.append({
                    'severity': 'warning',
                    'type': 'invalid_score',
                    'message': f'{len(null_scores)} 条记录分值无效或为空',
                    'rows': [r + 2 for r in null_scores],
                    'action': '改口径'
                })
            del df['score_num']

        if 'unit' in df.columns:
            null_units = df[df['unit'].isna()].index.tolist()
            if null_units:
                issues.append({
                    'severity': 'warning',
                    'type': 'missing_unit',
                    'message': f'{len(null_units)} 条记录单位缺失',
                    'rows': [r + 2 for r in null_units],
                    'action': '补材料'
                })
        else:
            issues.append({
                'severity': 'warning',
                'type': 'missing_unit_column',
                'message': '未提供单位列，建议补充',
                'action': '补材料'
            })

        if 'sort_order' in df.columns:
            df['sort_num'] = pd.to_numeric(df['sort_order'], errors='coerce')
            if df['sort_num'].isna().any():
                issues.append({
                    'severity': 'warning',
                    'type': 'invalid_sort_order',
                    'message': '排序序号存在无效值，排序稳定性无法保证',
                    'action': '改口径'
                })
            elif not df['sort_num'].is_monotonic_increasing:
                issues.append({
                    'severity': 'info',
                    'type': 'unsorted_order',
                    'message': '排序序号非严格递增，请注意排序逻辑',
                    'action': '改口径'
                })
            del df['sort_num']

        if 'remark' in df.columns:
            remark_in_content = []
            for idx, row in df.iterrows():
                content = str(row.get('question_content', ''))
                remark = str(row.get('remark', ''))
                if pd.notna(row.get('remark')) and len(str(row.get('remark', ''))) > 0:
                    if any(kw in str(row.get('question_content', '')) for kw in ['备注', '注：', '注:', '（注', '(注']):
                        remark_in_content.append(idx + 2)
            if remark_in_content:
                issues.append({
                    'severity': 'info',
                    'type': 'remark_mixed',
                    'message': f'{len(remark_in_content)} 条记录备注信息可能混入题干中',
                    'rows': remark_in_content,
                    'action': '改口径'
                })

        return issues

    def _validate_historical(self, df):
        issues = []

        if 'question_id' in df.columns:
            null_ids = df[df['question_id'].isna()].index.tolist()
            if null_ids:
                issues.append({
                    'severity': 'warning',
                    'type': 'null_question_id',
                    'message': f'{len(null_ids)} 条记录题目编号为空',
                    'rows': [r + 2 for r in null_ids],
                    'action': '补材料'
                })

        if 'historical_answer' in df.columns:
            null_answers = df[df['historical_answer'].isna()].index.tolist()
            if null_answers:
                issues.append({
                    'severity': 'warning',
                    'type': 'null_historical_answer',
                    'message': f'{len(null_answers)} 条记录历史答案为空',
                    'rows': [r + 2 for r in null_answers],
                    'action': '补材料'
                })

        if 'source' in df.columns:
            null_sources = df[df['source'].isna()].index.tolist()
            if null_sources:
                issues.append({
                    'severity': 'info',
                    'type': 'null_source',
                    'message': f'{len(null_sources)} 条记录来源为空，无法追溯',
                    'rows': [r + 2 for r in null_sources],
                    'action': '补材料'
                })

        return issues

    def _validate_student_errors(self, df):
        issues = []

        if 'question_id' in df.columns:
            null_ids = df[df['question_id'].isna()].index.tolist()
            if null_ids:
                issues.append({
                    'severity': 'warning',
                    'type': 'null_question_id',
                    'message': f'{len(null_ids)} 条记录题目编号为空',
                    'rows': [r + 2 for r in null_ids],
                    'action': '补材料'
                })

        if 'student_answer' in df.columns:
            null_answers = df[df['student_answer'].isna()].index.tolist()
            if null_answers:
                issues.append({
                    'severity': 'info',
                    'type': 'null_student_answer',
                    'message': f'{len(null_answers)} 条记录学生答案为空',
                    'rows': [r + 2 for r in null_answers],
                    'action': '补材料'
                })

        return issues

    def _validate_constraints(self, df):
        issues = []

        if 'question_id' in df.columns:
            null_ids = df[df['question_id'].isna()].index.tolist()
            if null_ids:
                issues.append({
                    'severity': 'warning',
                    'type': 'null_question_id',
                    'message': f'{len(null_ids)} 条记录题目编号为空',
                    'rows': [r + 2 for r in null_ids],
                    'action': '补材料'
                })

        return issues

    def _cross_file_validation(self, loaded_data):
        issues = []

        questions = loaded_data.get('questions', pd.DataFrame())
        historical = loaded_data.get('historical_answers', pd.DataFrame())
        student = loaded_data.get('student_errors', pd.DataFrame())
        constraints = loaded_data.get('constraints', pd.DataFrame())

        if not questions.empty and not historical.empty:
            if 'question_id' in questions.columns and 'question_id' in historical.columns:
                q_ids = set(questions['question_id'].dropna().astype(str))
                h_ids = set(historical['question_id'].dropna().astype(str))
                missing_in_questions = h_ids - q_ids
                if missing_in_questions:
                    issues.append({
                        'severity': 'warning',
                        'type': 'historical_id_mismatch',
                        'message': f'{len(missing_in_questions)} 个历史答案的题目编号在题目清单中不存在',
                        'details': list(missing_in_questions)[:10],
                        'action': '补材料'
                    })

        if not questions.empty and not student.empty:
            if 'question_id' in questions.columns and 'question_id' in student.columns:
                q_ids = set(questions['question_id'].dropna().astype(str))
                s_ids = set(student['question_id'].dropna().astype(str))
                missing_in_questions = s_ids - q_ids
                if missing_in_questions:
                    issues.append({
                        'severity': 'warning',
                        'type': 'student_id_mismatch',
                        'message': f'{len(missing_in_questions)} 个学生错题的题目编号在题目清单中不存在',
                        'details': list(missing_in_questions)[:10],
                        'action': '补材料'
                    })

        if not questions.empty and not constraints.empty:
            if 'question_id' in questions.columns and 'question_id' in constraints.columns:
                q_ids = set(questions['question_id'].dropna().astype(str))
                c_ids = set(constraints['question_id'].dropna().astype(str))
                missing_in_questions = c_ids - q_ids
                if missing_in_questions:
                    issues.append({
                        'severity': 'warning',
                        'type': 'constraint_id_mismatch',
                        'message': f'{len(missing_in_questions)} 个约束条件的题目编号在题目清单中不存在',
                        'details': list(missing_in_questions)[:10],
                        'action': '补材料'
                    })

        if not questions.empty and not historical.empty and not constraints.empty:
            conflict_count = 0
            conflict_details = []
            for _, c_row in constraints.iterrows():
                qid = str(c_row.get('question_id', ''))
                if not qid or qid == 'nan':
                    continue
                q_row = questions[questions['question_id'].astype(str) == qid]
                h_rows = historical[historical['question_id'].astype(str) == qid]

                if not q_row.empty and not h_rows.empty:
                    correct_answer = str(q_row.iloc[0].get('correct_answer', ''))
                    constraint_value = str(c_row.get('constraint_value', ''))

                    for _, h_row in h_rows.iterrows():
                        h_answer = str(h_row.get('historical_answer', ''))
                        if correct_answer and h_answer and correct_answer != h_answer:
                            if constraint_value and constraint_value in ['必须一致', '严格匹配']:
                                conflict_count += 1
                                conflict_details.append({
                                    'question_id': qid,
                                    'correct_answer': correct_answer,
                                    'historical_answer': h_answer,
                                    'constraint': constraint_value
                                })
            if conflict_count > 0:
                issues.append({
                    'severity': 'critical',
                    'type': 'answer_conflict',
                    'message': f'发现 {conflict_count} 处正确答案、历史答案与约束条件互相冲突',
                    'details': conflict_details[:10],
                    'action': '复核'
                })

        return issues

    def _generate_summary(self, report):
        total_critical = 0
        total_warning = 0
        total_info = 0

        for file_type, issues in report.items():
            if file_type == 'summary':
                continue
            if isinstance(issues, list):
                for issue in issues:
                    if issue.get('severity') == 'critical':
                        total_critical += 1
                    elif issue.get('severity') == 'warning':
                        total_warning += 1
                    elif issue.get('severity') == 'info':
                        total_info += 1

        overall = 'pass'
        if total_critical > 0:
            overall = 'fail'
        elif total_warning > 5:
            overall = 'caution'

        return {
            'total_critical': total_critical,
            'total_warning': total_warning,
            'total_info': total_info,
            'overall_status': overall,
            'status_text': {
                'pass': '通过校验',
                'caution': '存在警告，需人工确认',
                'fail': '存在严重问题，必须处理'
            }.get(overall, '未知状态')
        }
