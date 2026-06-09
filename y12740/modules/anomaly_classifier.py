import pandas as pd


class AnomalyClassifier:
    def __init__(self):
        self.status_levels = {
            'available': {
                'label': '可用',
                'color': '#52c41a',
                'bg_color': '#f6ffed',
                'border_color': '#b7eb8f',
                'for_ops': '直接使用'
            },
            'pending': {
                'label': '暂缓',
                'color': '#faad14',
                'bg_color': '#fffbe6',
                'border_color': '#ffe58f',
                'for_ops': '找投研助理复核'
            },
            'recapture': {
                'label': '需重采',
                'color': '#ff4d4f',
                'bg_color': '#fff2f0',
                'border_color': '#ffccc7',
                'for_ops': '暂停使用，需重新采集'
            }
        }

    def classify_all(self, loaded_data, validation_report, metrics_result):
        classifications = {
            'per_question': {},
            'summary': {
                'available_count': 0,
                'pending_count': 0,
                'recapture_count': 0,
                'total_count': 0
            },
            'action_items': []
        }

        questions = loaded_data.get('questions', pd.DataFrame())
        if questions.empty:
            return classifications

        critical_issues = {}
        warning_issues = {}

        for file_type, issues in validation_report.items():
            if file_type == 'summary':
                continue
            if isinstance(issues, list):
                for issue in issues:
                    rows = issue.get('rows', [])
                    severity = issue.get('severity', 'info')
                    issue_type = issue.get('type', '')
                    action = issue.get('action', '')

                    for row in rows:
                        key = f'row_{row}'
                        if severity == 'critical':
                            critical_issues.setdefault(key, []).append({
                                'type': issue_type,
                                'message': issue.get('message', ''),
                                'action': action
                            })
                        elif severity == 'warning':
                            warning_issues.setdefault(key, []).append({
                                'type': issue_type,
                                'message': issue.get('message', ''),
                                'action': action
                            })

        per_question_metrics = metrics_result.get('per_question', {})

        for idx, q_row in questions.iterrows():
            excel_row = idx + 2
            qid = str(q_row.get('question_id', f'unknown_{idx}'))

            q_metrics = per_question_metrics.get(qid, {})
            q_warnings = q_metrics.get('warnings', [])
            metrics = q_metrics.get('metrics', {})

            row_issues = critical_issues.get(f'row_{excel_row}', []) + warning_issues.get(f'row_{excel_row}', [])

            status, reasons, next_action = self._determine_status(
                q_row, q_metrics, q_warnings, row_issues, metrics
            )

            status_info = self.status_levels[status]

            classifications['per_question'][qid] = {
                'question_id': qid,
                'question_content': str(q_row.get('question_content', ''))[:80],
                'status': status,
                'status_label': status_info['label'],
                'status_color': status_info['color'],
                'status_bg_color': status_info['bg_color'],
                'status_border_color': status_info['border_color'],
                'for_operations': status_info['for_ops'],
                'reasons': reasons,
                'next_action': next_action,
                'available_data': self._list_available_data(q_row, q_metrics, status),
                'pending_data': self._list_pending_data(q_row, q_metrics, status),
                'recapture_data': self._list_recapture_data(q_row, q_metrics, status, row_issues),
                'excel_row': excel_row,
                'has_student_data': q_metrics.get('student_count', 0) > 0,
                'has_historical_data': len(q_metrics.get('historical_answers', [])) > 0
            }

            classifications['summary'][f'{status}_count'] += 1
            classifications['summary']['total_count'] += 1

            if status != 'available' and next_action:
                classifications['action_items'].append({
                    'question_id': qid,
                    'status': status,
                    'next_action': next_action,
                    'reasons': reasons[:2]
                })

        classifications['summary']['available_rate'] = round(
            classifications['summary']['available_count'] / max(classifications['summary']['total_count'], 1) * 100, 1
        )

        cross_issues = validation_report.get('cross_file', [])
        for issue in cross_issues:
            if issue.get('severity') in ['critical', 'warning']:
                classifications['action_items'].append({
                    'question_id': '跨文件',
                    'status': 'pending' if issue.get('severity') == 'warning' else 'recapture',
                    'next_action': issue.get('action', '复核'),
                    'reasons': [issue.get('message', '')]
                })

        return classifications

    def _determine_status(self, q_row, q_metrics, q_warnings, row_issues, metrics):
        reasons = []
        status = 'available'
        next_action = None

        has_critical = any(i for i in row_issues if i.get('type') in [
            'duplicate_question_id', 'null_question_id', 'missing_columns'
        ])
        if has_critical:
            status = 'recapture'
            next_action = '改口径'
            for i in row_issues:
                if i.get('type') in ['duplicate_question_id', 'null_question_id']:
                    reasons.append(i.get('message', '存在严重数据问题'))

        correct_answer = q_row.get('correct_answer')
        if correct_answer is None or (isinstance(correct_answer, float) and pd.isna(correct_answer)):
            if status != 'recapture':
                status = 'recapture'
                next_action = '补材料'
            reasons.append('正确答案为空')

        score = q_row.get('score')
        try:
            score_val = float(score) if score is not None and not (isinstance(score, float) and pd.isna(score)) else None
        except (ValueError, TypeError):
            score_val = None

        if score_val is None or score_val <= 0:
            if status == 'available':
                status = 'pending'
                next_action = '改口径'
            reasons.append('分值无效或为空')

        unit = q_row.get('unit')
        if unit is None or (isinstance(unit, float) and pd.isna(unit)) or str(unit).strip() == '':
            if status == 'available':
                status = 'pending'
                next_action = '补材料'
            reasons.append('单位缺失，物理量纲不明确')

        student_count = q_metrics.get('student_count', 0)
        if student_count == 0:
            if status == 'available':
                status = 'pending'
                next_action = '补材料'
            reasons.append('无学生作答数据，无法计算误差指标')

        valid_numeric = q_metrics.get('valid_numeric_count', 0)
        if student_count > 0 and valid_numeric == 0:
            if status == 'available':
                status = 'pending'
                next_action = '改口径'
            reasons.append('学生答案无法转换为数值，数值类指标不可用')

        for warning in q_warnings:
            if '单位缺失' in warning:
                if status == 'available':
                    status = 'pending'
                    next_action = '补材料'
                reasons.append(warning)

        historical_answers = q_metrics.get('historical_answers', [])
        if historical_answers:
            mismatches = [h for h in historical_answers if h.get('matches_correct') is False]
            if mismatches:
                if status == 'available':
                    status = 'pending'
                    next_action = '复核'
                reasons.append(f'存在 {len(mismatches)} 个历史答案与正确答案不一致')

        if not reasons:
            reasons.append('数据完整，校验通过')

        return status, reasons, next_action

    def _list_available_data(self, q_row, q_metrics, status):
        available = []
        if q_row.get('question_content') is not None:
            available.append('题目内容')
        if q_row.get('correct_answer') is not None:
            available.append('正确答案')
        metrics = q_metrics.get('metrics', {})
        for m, v in metrics.items():
            if v.get('status') == 'ok':
                available.append(f'{m} 计算结果')
        if q_metrics.get('student_count', 0) > 0:
            available.append(f'学生作答数据（{q_metrics["student_count"]}条）')
        return available

    def _list_pending_data(self, q_row, q_metrics, status):
        pending = []
        unit = q_row.get('unit')
        if unit is None or (isinstance(unit, float) and pd.isna(unit)):
            pending.append('单位（待补充）')
        metrics = q_metrics.get('metrics', {})
        for m, v in metrics.items():
            if v.get('status') == 'skipped':
                pending.append(f'{m}（{v.get("message", "条件不满足")}）')
        if q_metrics.get('valid_numeric_count', 0) == 0 and q_metrics.get('student_count', 0) > 0:
            pending.append('数值误差指标（答案格式不匹配）')
        return pending

    def _list_recapture_data(self, q_row, q_metrics, status, row_issues):
        recapture = []
        for issue in row_issues:
            if issue.get('type') == 'duplicate_question_id':
                recapture.append('题目编号（重复冲突）')
            if issue.get('type') == 'null_question_id':
                recapture.append('题目编号（缺失）')
        if q_row.get('correct_answer') is None or (isinstance(q_row.get('correct_answer'), float) and pd.isna(q_row.get('correct_answer'))):
            recapture.append('正确答案（缺失）')
        return recapture
