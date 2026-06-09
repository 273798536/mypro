import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


class MetricsCalculator:
    def __init__(self):
        self.formulas = {
            'MSE': {
                'name': '均方误差 (MSE)',
                'formula': 'MSE = (1/n) * Σ(yᵢ - ŷᵢ)²',
                'unit': '原始单位的平方',
                'scope': '适用于数值型答案的误差度量，对大误差惩罚更重',
                'failure_reasons': [
                    '正确答案或学生答案不是数值型',
                    '正确答案为空值',
                    '样本数量为0'
                ]
            },
            'RMSE': {
                'name': '均方根误差 (RMSE)',
                'formula': 'RMSE = √[(1/n) * Σ(yᵢ - ŷᵢ)²]',
                'unit': '与原始数据单位一致',
                'scope': 'MSE的平方根，与原始数据单位相同，更直观',
                'failure_reasons': [
                    'MSE计算失败',
                    'MSE结果为负数（数据异常）'
                ]
            },
            'MAE': {
                'name': '平均绝对误差 (MAE)',
                'formula': 'MAE = (1/n) * Σ|yᵢ - ŷᵢ|',
                'unit': '与原始数据单位一致',
                'scope': '对异常值不敏感，反映平均误差水平',
                'failure_reasons': [
                    '正确答案或学生答案不是数值型',
                    '正确答案为空值',
                    '样本数量为0'
                ]
            },
            'R2': {
                'name': '决定系数 (R²)',
                'formula': 'R² = 1 - Σ(yᵢ - ŷᵢ)² / Σ(yᵢ - ȳ)²',
                'unit': '无单位（取值范围 [-∞, 1]）',
                'scope': '衡量模型拟合优度，1表示完美拟合，0表示等价于均值预测',
                'failure_reasons': [
                    '正确答案方差为0（所有正确答案相同）',
                    '样本数量少于2',
                    '正确答案或学生答案不是数值型'
                ]
            },
            'accuracy': {
                'name': '准确率 (Accuracy)',
                'formula': 'Accuracy = 正确匹配数 / 总样本数',
                'unit': '百分比 (%)',
                'scope': '适用于离散型答案（选择题、填空题等精确匹配）',
                'failure_reasons': [
                    '总样本数为0',
                    '答案格式不统一无法比较'
                ]
            },
            'score_deviation': {
                'name': '得分偏差率',
                'formula': '偏差率 = (实际得分 - 满分) / 满分 × 100%',
                'unit': '百分比 (%)',
                'scope': '衡量单题得分与满分的偏离程度',
                'failure_reasons': [
                    '满分为0或空值',
                    '得分数据为空或无效'
                ]
            }
        }
        self.custom_formulas = {}

    def register_custom_formula(self, name, config):
        self.custom_formulas[name] = config

    def get_formula_info(self, formula_name):
        if formula_name in self.formulas:
            return {'success': True, 'data': self.formulas[formula_name]}
        elif formula_name in self.custom_formulas:
            return {'success': True, 'data': self.custom_formulas[formula_name]}
        else:
            return {'success': False, 'error': '公式不存在'}

    def calculate_all(self, loaded_data):
        result = {
            'summary': {},
            'per_question': {},
            'errors': [],
            'formula_reference': {k: v['name'] for k, v in self.formulas.items()}
        }

        questions = loaded_data.get('questions', pd.DataFrame())
        student_errors = loaded_data.get('student_errors', pd.DataFrame())
        historical = loaded_data.get('historical_answers', pd.DataFrame())

        if questions.empty:
            result['errors'].append('题目清单为空，无法进行计算')
            return result

        numeric_questions = []
        numeric_pairs = []
        discrete_pairs = []

        for _, q_row in questions.iterrows():
            qid = str(q_row.get('question_id', ''))
            if not qid or qid == 'nan':
                continue

            correct_answer = q_row.get('correct_answer', None)
            correct_num = self._to_number(correct_answer)

            unit = q_row.get('unit', '')
            score = q_row.get('score', None)
            score_num = self._to_number(score)

            q_result = {
                'question_id': qid,
                'question_content': str(q_row.get('question_content', ''))[:50],
                'correct_answer': correct_answer,
                'correct_answer_numeric': correct_num,
                'unit': str(unit) if pd.notna(unit) else None,
                'full_score': score_num,
                'metrics': {},
                'warnings': []
            }

            if q_result['unit'] is None:
                q_result['warnings'].append('单位缺失，误差分析结果的物理意义不明确')

            if correct_num is None:
                q_result['warnings'].append('正确答案非数值型，仅可计算准确率等离散指标')

            q_students = student_errors[student_errors['question_id'].astype(str) == qid] if not student_errors.empty else pd.DataFrame()
            q_historical = historical[historical['question_id'].astype(str) == qid] if not historical.empty else pd.DataFrame()

            student_count = len(q_students)
            q_result['student_count'] = student_count

            if student_count > 0:
                valid_numeric_students = []
                valid_discrete_students = []

                for _, s_row in q_students.iterrows():
                    s_answer = s_row.get('student_answer', None)
                    s_num = self._to_number(s_answer)
                    s_score = s_row.get('score_got', None)
                    s_score_num = self._to_number(s_score)

                    if correct_num is not None and s_num is not None:
                        valid_numeric_students.append({
                            'correct': correct_num,
                            'predicted': s_num,
                            'score_got': s_score_num,
                            'full_score': score_num
                        })
                        numeric_pairs.append((correct_num, s_num))

                    if correct_answer is not None and pd.notna(s_answer):
                        valid_discrete_students.append({
                            'correct': str(correct_answer).strip(),
                            'predicted': str(s_answer).strip()
                        })
                        discrete_pairs.append((str(correct_answer).strip(), str(s_answer).strip()))

                q_result['valid_numeric_count'] = len(valid_numeric_students)
                q_result['valid_discrete_count'] = len(valid_discrete_students)

                if valid_numeric_students:
                    corrs = [x['correct'] for x in valid_numeric_students]
                    preds = [x['predicted'] for x in valid_numeric_students]

                    try:
                        mse = mean_squared_error(corrs, preds)
                        q_result['metrics']['MSE'] = {
                            'value': round(mse, 6),
                            'status': 'ok'
                        }
                    except Exception as e:
                        q_result['metrics']['MSE'] = {'status': 'error', 'message': str(e)}

                    try:
                        rmse = np.sqrt(max(mse, 0))
                        q_result['metrics']['RMSE'] = {
                            'value': round(rmse, 6),
                            'status': 'ok'
                        }
                    except Exception as e:
                        q_result['metrics']['RMSE'] = {'status': 'error', 'message': str(e)}

                    try:
                        mae = mean_absolute_error(corrs, preds)
                        q_result['metrics']['MAE'] = {
                            'value': round(mae, 6),
                            'status': 'ok'
                        }
                    except Exception as e:
                        q_result['metrics']['MAE'] = {'status': 'error', 'message': str(e)}

                    try:
                        if len(set(corrs)) > 1 and len(corrs) >= 2:
                            r2 = r2_score(corrs, preds)
                            q_result['metrics']['R2'] = {
                                'value': round(r2, 6),
                                'status': 'ok'
                            }
                        else:
                            q_result['metrics']['R2'] = {'status': 'skipped', 'message': '正确答案无方差或样本太少'}
                    except Exception as e:
                        q_result['metrics']['R2'] = {'status': 'error', 'message': str(e)}

                    if score_num and score_num > 0:
                        valid_scores = [x for x in valid_numeric_students if x['score_got'] is not None]
                        if valid_scores:
                            deviations = [(x['score_got'] - x['full_score']) / x['full_score'] * 100 for x in valid_scores]
                            avg_deviation = np.mean(deviations)
                            q_result['metrics']['score_deviation'] = {
                                'value': round(avg_deviation, 2),
                                'status': 'ok'
                            }

                if valid_discrete_students:
                    matches = sum(1 for x in valid_discrete_students if x['correct'] == x['predicted'])
                    accuracy = matches / len(valid_discrete_students) * 100
                    q_result['metrics']['accuracy'] = {
                        'value': round(accuracy, 2),
                        'status': 'ok',
                        'matches': matches,
                        'total': len(valid_discrete_students)
                    }

            if not q_historical.empty:
                q_result['historical_answers'] = []
                for _, h_row in q_historical.iterrows():
                    h_answer = h_row.get('historical_answer', '')
                    h_source = h_row.get('source', '')
                    h_num = self._to_number(h_answer)

                    comparison = {
                        'historical_answer': h_answer,
                        'source': str(h_source) if pd.notna(h_source) else '未知来源',
                        'matches_correct': None,
                        'numeric_diff': None
                    }

                    if correct_answer is not None and pd.notna(h_answer):
                        comparison['matches_correct'] = str(correct_answer).strip() == str(h_answer).strip()

                    if correct_num is not None and h_num is not None:
                        comparison['numeric_diff'] = round(h_num - correct_num, 6)

                    q_result['historical_answers'].append(comparison)

            result['per_question'][qid] = q_result

        if numeric_pairs:
            corrs_all = [x[0] for x in numeric_pairs]
            preds_all = [x[1] for x in numeric_pairs]

            result['summary']['total_numeric_samples'] = len(numeric_pairs)
            try:
                result['summary']['overall_MSE'] = round(mean_squared_error(corrs_all, preds_all), 6)
                result['summary']['overall_RMSE'] = round(np.sqrt(max(result['summary']['overall_MSE'], 0)), 6)
                result['summary']['overall_MAE'] = round(mean_absolute_error(corrs_all, preds_all), 6)
            except Exception as e:
                result['errors'].append(f'整体数值指标计算失败: {e}')

            try:
                if len(set(corrs_all)) > 1 and len(corrs_all) >= 2:
                    result['summary']['overall_R2'] = round(r2_score(corrs_all, preds_all), 6)
            except Exception as e:
                result['errors'].append(f'整体R²计算失败: {e}')

        if discrete_pairs:
            matches_all = sum(1 for c, p in discrete_pairs if c == p)
            result['summary']['total_discrete_samples'] = len(discrete_pairs)
            result['summary']['overall_accuracy'] = round(matches_all / len(discrete_pairs) * 100, 2)

        result['summary']['total_questions'] = len(result['per_question'])
        result['summary']['questions_with_students'] = sum(1 for q in result['per_question'].values() if q.get('student_count', 0) > 0)
        result['summary']['questions_with_numeric_metrics'] = sum(1 for q in result['per_question'].values() if 'MSE' in q.get('metrics', {}))
        result['summary']['questions_missing_unit'] = sum(1 for q in result['per_question'].values() if q.get('unit') is None)

        return result

    def _to_number(self, val):
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return None
        try:
            s = str(val).strip()
            if not s:
                return None
            for unit in ['%', '元', '个', '人', '天', '米', '千克', '克', '°', '℃']:
                if s.endswith(unit):
                    s = s[:-len(unit)].strip()
                    break
            return float(s)
        except (ValueError, TypeError):
            return None
