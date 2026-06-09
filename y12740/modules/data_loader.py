import pandas as pd
import os
import numpy as np


class DataLoader:
    def __init__(self):
        self.file_types = {
            'questions': '题目清单',
            'historical_answers': '历史答案',
            'student_errors': '学生错题',
            'constraints': '约束条件'
        }
        self.column_aliases = {
            'questions': {
                'question_id': ['题目编号', '题号', 'id', 'question_id', '题目ID'],
                'question_content': ['题目内容', '题干', '题目', 'content', 'question'],
                'correct_answer': ['正确答案', '答案', '标准答案', 'answer', 'correct_answer'],
                'score': ['分值', '满分', '分数', 'score', 'points'],
                'unit': ['单位', '计量单位', 'unit'],
                'difficulty': ['难度', '难度等级', 'difficulty'],
                'sort_order': ['排序', '序号', 'sort_order', 'order'],
                'remark': ['备注', '说明', 'remark', 'note', 'comment']
            },
            'historical_answers': {
                'question_id': ['题目编号', '题号', 'id', 'question_id', '题目ID'],
                'historical_answer': ['历史答案', '以往答案', 'historical_answer'],
                'source': ['来源', '出处', 'source'],
                'version': ['版本', '版次', 'version']
            },
            'student_errors': {
                'question_id': ['题目编号', '题号', 'id', 'question_id', '题目ID'],
                'student_answer': ['学生答案', '作答', 'student_answer', 'answer'],
                'error_type': ['错误类型', '错因', 'error_type'],
                'student_id': ['学生编号', '学号', 'student_id'],
                'score_got': ['得分', '实际得分', 'score_got']
            },
            'constraints': {
                'question_id': ['题目编号', '题号', 'id', 'question_id', '题目ID'],
                'constraint_type': ['约束类型', '限制条件', 'constraint_type'],
                'constraint_value': ['约束值', '约束内容', 'constraint_value'],
                'description': ['说明', '描述', 'description']
            }
        }

    def load_single(self, filepath, file_type):
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(filepath, dtype=str)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath, dtype=str)
        else:
            raise ValueError(f'不支持的文件格式: {ext}')

        df = self._normalize_columns(df, file_type)
        df = self._clean_data(df)
        return df

    def load_all(self, file_paths):
        loaded = {}
        for key, filepath in file_paths.items():
            if filepath and os.path.exists(filepath):
                try:
                    loaded[key] = self.load_single(filepath, key)
                except Exception as e:
                    loaded[key] = pd.DataFrame()
                    loaded[f'{key}_error'] = str(e)
        return loaded

    def _normalize_columns(self, df, file_type):
        aliases = self.column_aliases.get(file_type, {})
        rename_map = {}

        for std_col, alias_list in aliases.items():
            for alias in alias_list:
                for col in df.columns:
                    if str(col).strip() == alias or str(col).strip().lower() == alias.lower():
                        rename_map[col] = std_col
                        break
                if std_col in rename_map.values():
                    break

        df = df.rename(columns=rename_map)
        return df

    def _clean_data(self, df):
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].map(lambda x: x.strip() if isinstance(x, str) else x)
        df = df.replace(['', 'NA', 'N/A', 'na', 'n/a', 'None', 'none', 'null', 'NULL', 'NaN', 'nan'], np.nan)
        return df
