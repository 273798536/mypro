import pandas as pd


class HistoryComparator:
    def __init__(self):
        pass

    def compare(self, loaded_data):
        result = {
            'comparisons': {},
            'conflicts': [],
            'summary': {
                'total_historical': 0,
                'matched': 0,
                'mismatched': 0,
                'no_source': 0
            },
            'source_trail': []
        }

        questions = loaded_data.get('questions', pd.DataFrame())
        historical = loaded_data.get('historical_answers', pd.DataFrame())
        constraints = loaded_data.get('constraints', pd.DataFrame())

        if historical.empty:
            result['note'] = '未提供历史答案数据，跳过历史对比'
            return result

        result['summary']['total_historical'] = len(historical)

        for idx, h_row in historical.iterrows():
            qid = str(h_row.get('question_id', ''))
            if not qid or qid == 'nan':
                continue

            h_answer = h_row.get('historical_answer', '')
            source = str(h_row.get('source', '')) if pd.notna(h_row.get('source', '')) else ''
            version = str(h_row.get('version', '')) if pd.notna(h_row.get('version', '')) else ''

            if not source:
                result['summary']['no_source'] += 1

            q_match = questions[questions['question_id'].astype(str) == qid] if not questions.empty else pd.DataFrame()

            comparison = {
                'question_id': qid,
                'historical_answer': str(h_answer),
                'source': source,
                'version': version,
                'has_question_match': not q_match.empty,
                'answer_match': None,
                'numeric_difference': None,
                'constraint_violation': False,
                'trace': []
            }

            if source:
                comparison['trace'].append(f'来源材料：{source}' + (f'（版本：{version}）' if version else ''))

            if not q_match.empty:
                correct_answer = str(q_match.iloc[0].get('correct_answer', ''))
                unit = str(q_match.iloc[0].get('unit', '')) if pd.notna(q_match.iloc[0].get('unit', '')) else ''

                comparison['correct_answer'] = correct_answer
                comparison['unit'] = unit

                comparison['trace'].append(f'当前题目清单答案：{correct_answer}' + (f'（{unit}）' if unit else ''))

                if correct_answer and pd.notna(h_answer):
                    comparison['answer_match'] = correct_answer.strip() == str(h_answer).strip()
                    if comparison['answer_match']:
                        result['summary']['matched'] += 1
                        comparison['trace'].append('对比结论：历史答案与当前正确答案一致')
                    else:
                        result['summary']['mismatched'] += 1
                        comparison['trace'].append('对比结论：历史答案与当前正确答案不一致，需复核')

                        try:
                            c_num = float(correct_answer.strip())
                            h_num = float(str(h_answer).strip())
                            comparison['numeric_difference'] = round(h_num - c_num, 6)
                            comparison['trace'].append(
                                f'数值差异：{h_num} - {c_num} = {comparison["numeric_difference"]}'
                                + (f'（{unit}）' if unit else '')
                            )
                        except (ValueError, TypeError):
                            pass

            if not constraints.empty:
                q_constraints = constraints[constraints['question_id'].astype(str) == qid]
                for _, c_row in q_constraints.iterrows():
                    c_type = str(c_row.get('constraint_type', ''))
                    c_value = str(c_row.get('constraint_value', ''))
                    c_desc = str(c_row.get('description', ''))

                    if '一致' in c_value or '匹配' in c_value:
                        if comparison['answer_match'] is False:
                            comparison['constraint_violation'] = True
                            comparison['trace'].append(
                                f'违反约束：{c_type} - {c_value}（{c_desc}）'
                            )
                            result['conflicts'].append({
                                'question_id': qid,
                                'correct_answer': comparison.get('correct_answer', ''),
                                'historical_answer': str(h_answer),
                                'constraint': f'{c_type}: {c_value}',
                                'source': source
                            })

            result['comparisons'][f'{qid}_{idx}'] = comparison

            if comparison['trace']:
                result['source_trail'].append({
                    'question_id': qid,
                    'trail': ' → '.join(comparison['trace']),
                    'status': '冲突' if (comparison['answer_match'] is False or comparison['constraint_violation']) else '一致'
                })

        return result
