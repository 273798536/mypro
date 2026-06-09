import pandas as pd
import io
import os
from datetime import datetime


class ResultExporter:
    def __init__(self):
        pass

    def export(self, data, export_type='full', format_type='xlsx'):
        if format_type == 'csv':
            return self._export_csv(data, export_type)
        else:
            return self._export_xlsx(data, export_type)

    def _export_xlsx(self, data, export_type):
        output = io.BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')

        self._write_summary_sheet(writer, data)

        self._write_operations_sheet(writer, data)

        self._write_research_sheet(writer, data)

        if export_type == 'full':
            self._write_validation_sheet(writer, data)
            self._write_metrics_sheet(writer, data)
            self._write_history_sheet(writer, data)

        writer.close()
        output.seek(0)
        return output.getvalue()

    def _write_summary_sheet(self, writer, data):
        rows = []
        anomalies = data.get('anomalies', {})
        summary = anomalies.get('summary', {})
        metrics = data.get('metrics_result', {}).get('summary', {})
        validation = data.get('validation_report', {}).get('summary', {})

        rows.append({'项目': '数据概览', '数值': '', '说明': ''})
        rows.append({'项目': '题目总数', '数值': summary.get('total_count', 0), '说明': ''})
        rows.append({'项目': '可用题目', '数值': summary.get('available_count', 0), '说明': '可直接使用'})
        rows.append({'项目': '暂缓题目', '数值': summary.get('pending_count', 0), '说明': '需投研助理复核'})
        rows.append({'项目': '需重采题目', '数值': summary.get('recapture_count', 0), '说明': '必须重新采集或修正'})
        rows.append({'项目': '可用率', '数值': f"{summary.get('available_rate', 0)}%", '说明': ''})
        rows.append({'项目': '', '数值': '', '说明': ''})

        rows.append({'项目': '校验结果', '数值': '', '说明': ''})
        rows.append({'项目': '严重问题', '数值': validation.get('total_critical', 0), '说明': '必须处理'})
        rows.append({'项目': '警告', '数值': validation.get('total_warning', 0), '说明': '建议处理'})
        rows.append({'项目': '提示', '数值': validation.get('total_info', 0), '说明': ''})
        rows.append({'项目': '整体状态', '数值': validation.get('status_text', ''), '说明': ''})
        rows.append({'项目': '', '数值': '', '说明': ''})

        rows.append({'项目': '计算指标（整体）', '数值': '', '说明': ''})
        rows.append({'项目': '数值样本数', '数值': metrics.get('total_numeric_samples', 0), '说明': ''})
        rows.append({'项目': '整体MSE', '数值': metrics.get('overall_MSE', 'N/A'), '说明': '均方误差'})
        rows.append({'项目': '整体RMSE', '数值': metrics.get('overall_RMSE', 'N/A'), '说明': '均方根误差'})
        rows.append({'项目': '整体MAE', '数值': metrics.get('overall_MAE', 'N/A'), '说明': '平均绝对误差'})
        rows.append({'项目': '整体R²', '数值': metrics.get('overall_R2', 'N/A'), '说明': '决定系数'})
        rows.append({'项目': '离散样本数', '数值': metrics.get('total_discrete_samples', 0), '说明': ''})
        rows.append({'项目': '整体准确率', '数值': f"{metrics.get('overall_accuracy', 'N/A')}%" if metrics.get('overall_accuracy') else 'N/A', '说明': ''})

        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name='总览', index=False)

    def _write_operations_sheet(self, writer, data):
        rows = []
        per_question = data.get('anomalies', {}).get('per_question', {})

        for qid, q_data in per_question.items():
            rows.append({
                '题目编号': qid,
                '题目内容': q_data.get('question_content', ''),
                '数据状态': q_data.get('status_label', ''),
                '运营使用建议': q_data.get('for_operations', ''),
                '可用数据': '、'.join(q_data.get('available_data', [])),
                '暂缓数据': '、'.join(q_data.get('pending_data', [])),
                '需重采数据': '、'.join(q_data.get('recapture_data', [])),
                '备注': '；'.join(q_data.get('reasons', []))[:200]
            })

        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name='运营视图', index=False)

    def _write_research_sheet(self, writer, data):
        rows = []
        per_question = data.get('anomalies', {}).get('per_question', {})
        metrics_per_q = data.get('metrics_result', {}).get('per_question', {})

        for qid, q_data in per_question.items():
            m = metrics_per_q.get(qid, {})
            metrics_vals = m.get('metrics', {})

            row = {
                '题目编号': qid,
                '题目内容': q_data.get('question_content', ''),
                '数据状态': q_data.get('status_label', ''),
                '下一步动作': q_data.get('next_action', ''),
                '问题原因': '；'.join(q_data.get('reasons', [])),
                'Excel行号': q_data.get('excel_row', ''),
                '正确答案': m.get('correct_answer', ''),
                '单位': m.get('unit', ''),
                '满分': m.get('full_score', ''),
                '学生数': q_data.get('student_count', 0),
                'MSE': '',
                'RMSE': '',
                'MAE': '',
                'R²': '',
                '准确率(%)': '',
                '得分偏差率(%)': '',
                '历史答案数': len(m.get('historical_answers', []))
            }

            for key, target in [('MSE', 'MSE'), ('RMSE', 'RMSE'), ('MAE', 'MAE'), ('R2', 'R²'),
                                ('accuracy', '准确率(%)'), ('score_deviation', '得分偏差率(%)')]:
                v = metrics_vals.get(key, {})
                if v.get('status') == 'ok':
                    row[target] = v.get('value', '')

            rows.append(row)

        df = pd.DataFrame(rows)
        df.to_excel(writer, sheet_name='投研视图', index=False)

        action_rows = []
        for item in data.get('anomalies', {}).get('action_items', []):
            action_rows.append({
                '题目编号': item.get('question_id', ''),
                '紧急程度': '高' if item.get('status') == 'recapture' else '中',
                '下一步动作': item.get('next_action', ''),
                '原因': '；'.join(item.get('reasons', []))
            })
        if action_rows:
            pd.DataFrame(action_rows).to_excel(writer, sheet_name='待办事项', index=False)

    def _write_validation_sheet(self, writer, data):
        rows = []
        validation = data.get('validation_report', {})

        for sheet_name, issues in validation.items():
            if sheet_name == 'summary':
                continue
            if isinstance(issues, list):
                for issue in issues:
                    rows.append({
                        '数据文件': sheet_name,
                        '严重程度': {
                            'critical': '严重',
                            'warning': '警告',
                            'info': '提示'
                        }.get(issue.get('severity', ''), ''),
                        '问题类型': issue.get('type', ''),
                        '问题描述': issue.get('message', ''),
                        '涉及行号': ','.join(map(str, issue.get('rows', []))) if issue.get('rows') else '',
                        '建议动作': issue.get('action', '')
                    })

        if rows:
            df = pd.DataFrame(rows)
            df.to_excel(writer, sheet_name='校验明细', index=False)

    def _write_metrics_sheet(self, writer, data):
        formula_rows = [
            {'指标名称': 'MSE', '中文名称': '均方误差', '公式': 'MSE = (1/n) * Σ(yᵢ - ŷᵢ)²',
             '单位': '原始单位的平方', '适用范围': '数值型答案，惩罚大误差'},
            {'指标名称': 'RMSE', '中文名称': '均方根误差', '公式': 'RMSE = √[(1/n) * Σ(yᵢ - ŷᵢ)²]',
             '单位': '与原始数据一致', '适用范围': 'MSE的平方根，更直观'},
            {'指标名称': 'MAE', '中文名称': '平均绝对误差', '公式': 'MAE = (1/n) * Σ|yᵢ - ŷᵢ|',
             '单位': '与原始数据一致', '适用范围': '对异常值不敏感'},
            {'指标名称': 'R²', '中文名称': '决定系数', '公式': 'R² = 1 - Σ(yᵢ - ŷᵢ)² / Σ(yᵢ - ȳ)²',
             '单位': '无单位[-∞,1]', '适用范围': '衡量拟合优度，1为完美拟合'},
            {'指标名称': 'Accuracy', '中文名称': '准确率', '公式': '正确匹配数 / 总样本数 × 100%',
             '单位': '百分比', '适用范围': '离散型答案精确匹配'},
            {'指标名称': '得分偏差率', '中文名称': '得分偏差率', '公式': '(实际得分 - 满分) / 满分 × 100%',
             '单位': '百分比', '适用范围': '单题得分与满分的偏离程度'}
        ]
        pd.DataFrame(formula_rows).to_excel(writer, sheet_name='公式说明', index=False)

    def _write_history_sheet(self, writer, data):
        history = data.get('history_result', {})
        trails = history.get('source_trail', [])
        if trails:
            rows = []
            for t in trails:
                rows.append({
                    '题目编号': t.get('question_id', ''),
                    '状态': t.get('status', ''),
                    '追溯路径': t.get('trail', '')
                })
            pd.DataFrame(rows).to_excel(writer, sheet_name='历史追溯', index=False)

        conflicts = history.get('conflicts', [])
        if conflicts:
            rows = []
            for c in conflicts:
                rows.append({
                    '题目编号': c.get('question_id', ''),
                    '正确答案': c.get('correct_answer', ''),
                    '历史答案': c.get('historical_answer', ''),
                    '违反约束': c.get('constraint', ''),
                    '来源': c.get('source', '')
                })
            pd.DataFrame(rows).to_excel(writer, sheet_name='冲突清单', index=False)

    def _export_csv(self, data, export_type):
        rows = []
        per_question = data.get('anomalies', {}).get('per_question', {})

        for qid, q_data in per_question.items():
            rows.append({
                '题目编号': qid,
                '题目内容': q_data.get('question_content', ''),
                '数据状态': q_data.get('status_label', ''),
                '运营建议': q_data.get('for_operations', ''),
                '下一步动作': q_data.get('next_action', ''),
                '可用数据': '、'.join(q_data.get('available_data', [])),
                '暂缓数据': '、'.join(q_data.get('pending_data', [])),
                '需重采数据': '、'.join(q_data.get('recapture_data', [])),
                '问题原因': '；'.join(q_data.get('reasons', []))
            })

        df = pd.DataFrame(rows)
        output = io.BytesIO()
        df.to_csv(output, index=False, encoding='utf-8-sig')
        output.seek(0)
        return output.getvalue()
