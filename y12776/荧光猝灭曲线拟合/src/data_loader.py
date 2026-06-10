import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')


class DataLoader:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.raw_data = None
        self.clean_data = None
        self.issues = {
            'time_missing': [],
            'duplicate_batches': [],
            'unit_missing': [],
            'abnormal_intensity': [],
            'supplementary_records': [],
            'inconsistent_time': [],
            'mixed_materials': []
        }

    def load(self) -> pd.DataFrame:
        try:
            self.raw_data = pd.read_excel(self.file_path, sheet_name=0)
            print(f'[数据加载] 成功读取 {len(self.raw_data)} 条记录')
            print(f'[数据加载] 列名: {list(self.raw_data.columns)}')
            return self.raw_data
        except Exception as e:
            raise RuntimeError(f'数据加载失败: {str(e)}')

    def _standardize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        col_mapping = {}
        for col in df.columns:
            col_lower = str(col).strip()
            if '批号' in col_lower or 'batch' in col_lower.lower():
                col_mapping[col] = 'batch_no'
            elif '材料' in col_lower or '名称' in col_lower:
                col_mapping[col] = 'material'
            elif '浓度' in col_lower and '猝灭' in col_lower:
                col_mapping[col] = 'concentration'
            elif '浓度单位' in col_lower:
                col_mapping[col] = 'conc_unit'
            elif '荧光强度' in col_lower:
                col_mapping[col] = 'intensity'
            elif '反应时间' in col_lower:
                col_mapping[col] = 'reaction_time'
            elif '时间单位' in col_lower:
                col_mapping[col] = 'time_unit'
            elif '日期' in col_lower:
                col_mapping[col] = 'test_date'
            elif '操作员' in col_lower:
                col_mapping[col] = 'operator'
            elif '备注' in col_lower:
                col_mapping[col] = 'remark'
            elif '序号' in col_lower:
                col_mapping[col] = 'idx'

        df = df.rename(columns=col_mapping)

        required = ['batch_no', 'concentration', 'intensity']
        for r in required:
            if r not in df.columns:
                raise ValueError(f'缺少必要列: {r}')

        for opt in ['material', 'conc_unit', 'reaction_time', 'time_unit',
                    'test_date', 'operator', 'remark', 'idx']:
            if opt not in df.columns:
                df[opt] = '' if opt in ['remark', 'operator', 'material',
                                        'conc_unit', 'time_unit', 'test_date'] else None

        df['_row_id'] = range(1, len(df) + 1)
        return df

    def _detect_time_missing(self, df: pd.DataFrame) -> None:
        if 'reaction_time' not in df.columns:
            return

        for _, row in df.iterrows():
            rt = row['reaction_time']
            is_missing = False
            if pd.isna(rt):
                is_missing = True
            elif isinstance(rt, str) and rt.strip() == '':
                is_missing = True
            elif rt == 0 or rt is None:
                is_missing = True

            if is_missing:
                self.issues['time_missing'].append({
                    'row_id': int(row['_row_id']),
                    'idx': row.get('idx', ''),
                    'batch_no': row['batch_no'],
                    'material': row.get('material', ''),
                    'remark': str(row.get('remark', ''))
                })

    def _detect_duplicate_batches(self, df: pd.DataFrame) -> None:
        batch_counts = df.groupby('batch_no').size()
        duplicates = batch_counts[batch_counts > 1]

        for batch, count in duplicates.items():
            rows = df[df['batch_no'] == batch]
            self.issues['duplicate_batches'].append({
                'batch_no': batch,
                'count': int(count),
                'row_ids': rows['_row_id'].tolist(),
                'idxs': rows.get('idx', pd.Series(dtype=str)).tolist(),
                'materials': rows.get('material', pd.Series(dtype=str)).tolist(),
                'concentrations': rows['concentration'].tolist()
            })

    def _detect_unit_missing(self, df: pd.DataFrame) -> None:
        for _, row in df.iterrows():
            unit = str(row.get('conc_unit', '')).strip()
            if unit == '' or unit == 'nan' or unit.lower() == 'none':
                self.issues['unit_missing'].append({
                    'row_id': int(row['_row_id']),
                    'idx': row.get('idx', ''),
                    'batch_no': row['batch_no'],
                    'material': row.get('material', ''),
                    'remark': str(row.get('remark', ''))
                })

    def _detect_abnormal_intensity(self, df: pd.DataFrame) -> None:
        intensities = pd.to_numeric(df['intensity'], errors='coerce').dropna()
        if len(intensities) < 3:
            return

        q1 = intensities.quantile(0.25)
        q3 = intensities.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 3 * iqr
        upper = q3 + 3 * iqr

        mean_val = intensities.mean()
        std_val = intensities.std()
        z_upper = mean_val + 3 * std_val
        z_lower = mean_val - 3 * std_val

        for _, row in df.iterrows():
            try:
                val = float(row['intensity'])
                is_abnormal = False
                reason = []
                if val < lower or val > upper:
                    is_abnormal = True
                    reason.append(f'IQR异常(范围[{lower:.1f}, {upper:.1f}])')
                if val < z_lower or val > z_upper:
                    is_abnormal = True
                    reason.append(f'Z-score异常(均值{mean_val:.1f}, 标准差{std_val:.1f})')

                if is_abnormal:
                    self.issues['abnormal_intensity'].append({
                        'row_id': int(row['_row_id']),
                        'idx': row.get('idx', ''),
                        'batch_no': row['batch_no'],
                        'material': row.get('material', ''),
                        'intensity': val,
                        'reasons': reason
                    })
            except (ValueError, TypeError):
                self.issues['abnormal_intensity'].append({
                    'row_id': int(row['_row_id']),
                    'idx': row.get('idx', ''),
                    'batch_no': row['batch_no'],
                    'material': row.get('material', ''),
                    'intensity': row['intensity'],
                    'reasons': ['非数值']
                })

    def _detect_supplementary(self, df: pd.DataFrame) -> None:
        for _, row in df.iterrows():
            remark = str(row.get('remark', '')).strip()
            keywords = ['补录', '补', '丢失', '后补', '找回', '旧表', '后填']
            if any(kw in remark for kw in keywords):
                self.issues['supplementary_records'].append({
                    'row_id': int(row['_row_id']),
                    'idx': row.get('idx', ''),
                    'batch_no': row['batch_no'],
                    'material': row.get('material', ''),
                    'remark': remark
                })

    def _detect_inconsistent_time(self, df: pd.DataFrame) -> None:
        times = pd.to_numeric(df['reaction_time'], errors='coerce').dropna()
        if len(times) <= 1:
            return

        unique_times = times.unique()
        if len(unique_times) > 1:
            mode_time = times.mode().iloc[0] if len(times.mode()) > 0 else unique_times[0]
            for _, row in df.iterrows():
                try:
                    rt = float(row['reaction_time'])
                    if rt != mode_time and not pd.isna(rt):
                        self.issues['inconsistent_time'].append({
                            'row_id': int(row['_row_id']),
                            'idx': row.get('idx', ''),
                            'batch_no': row['batch_no'],
                            'material': row.get('material', ''),
                            'reaction_time': rt,
                            'standard_time': mode_time
                        })
                except (ValueError, TypeError):
                    pass

    def _detect_mixed_materials(self, df: pd.DataFrame) -> None:
        if 'material' not in df.columns:
            return
        materials = df['material'].dropna().astype(str).unique()
        materials = [m for m in materials if m.strip() != '' and m.lower() != 'nan']
        if len(materials) > 1:
            self.issues['mixed_materials'] = list(materials)

    def clean(self) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        if self.raw_data is None:
            self.load()

        df = self._standardize_columns(self.raw_data.copy())

        df['concentration'] = pd.to_numeric(df['concentration'], errors='coerce')
        df['intensity'] = pd.to_numeric(df['intensity'], errors='coerce')
        df['reaction_time'] = pd.to_numeric(df['reaction_time'], errors='coerce')

        self._detect_time_missing(df)
        self._detect_duplicate_batches(df)
        self._detect_unit_missing(df)
        self._detect_abnormal_intensity(df)
        self._detect_supplementary(df)
        self._detect_inconsistent_time(df)
        self._detect_mixed_materials(df)

        self.clean_data = df.copy()
        self.clean_data['is_time_missing'] = self.clean_data['_row_id'].isin(
            [x['row_id'] for x in self.issues['time_missing']]
        )
        self.clean_data['is_abnormal'] = self.clean_data['_row_id'].isin(
            [x['row_id'] for x in self.issues['abnormal_intensity']]
        )
        self.clean_data['is_supplementary'] = self.clean_data['_row_id'].isin(
            [x['row_id'] for x in self.issues['supplementary_records']]
        )

        return self.clean_data, self.issues

    def get_issue_summary(self) -> str:
        lines = []
        lines.append('=' * 60)
        lines.append('数据质量检查报告')
        lines.append('=' * 60)
        lines.append(f'总记录数: {len(self.raw_data) if self.raw_data is not None else 0}')

        if self.issues['time_missing']:
            lines.append(f'\n【警告】反应时间漏记 ({len(self.issues["time_missing"])} 条):')
            for item in self.issues['time_missing']:
                extra = f'，备注: {item["remark"]}' if item['remark'] else ''
                lines.append(
                    f'  → 第{item["row_id"]}行 | 批号: {item["batch_no"]} | '
                    f'材料: {item["material"]}{extra}'
                )

        if self.issues['duplicate_batches']:
            lines.append(f'\n【警告】批号重复 ({len(self.issues["duplicate_batches"])} 组):')
            for item in self.issues['duplicate_batches']:
                lines.append(
                    f'  → 批号 {item["batch_no"]} 出现 {item["count"]} 次, '
                    f'行号: {item["row_ids"]}, 浓度: {item["concentrations"]}'
                )

        if self.issues['unit_missing']:
            lines.append(f'\n【警告】浓度单位漏填 ({len(self.issues["unit_missing"])} 条):')
            for item in self.issues['unit_missing']:
                extra = f'，备注: {item["remark"]}' if item['remark'] else ''
                lines.append(
                    f'  → 第{item["row_id"]}行 | 批号: {item["batch_no"]} | '
                    f'材料: {item["material"]}{extra}'
                )

        if self.issues['abnormal_intensity']:
            lines.append(f'\n【严重】异常荧光强度 ({len(self.issues["abnormal_intensity"])} 条):')
            for item in self.issues['abnormal_intensity']:
                reasons = '; '.join(item['reasons'])
                lines.append(
                    f'  → 第{item["row_id"]}行 | 批号: {item["batch_no"]} | '
                    f'强度值: {item["intensity"]} | {reasons}'
                )

        if self.issues['supplementary_records']:
            lines.append(f'\n【提示】补录/旧表数据 ({len(self.issues["supplementary_records"])} 条):')
            for item in self.issues['supplementary_records']:
                lines.append(
                    f'  → 第{item["row_id"]}行 | 批号: {item["batch_no"]} | '
                    f'备注: {item["remark"]}'
                )

        if self.issues['inconsistent_time']:
            lines.append(f'\n【警告】反应时间不一致 ({len(self.issues["inconsistent_time"])} 条):')
            for item in self.issues['inconsistent_time']:
                lines.append(
                    f'  → 第{item["row_id"]}行 | 批号: {item["batch_no"]} | '
                    f'当前: {item["reaction_time"]}min, 标准: {item["standard_time"]}min'
                )

        if self.issues['mixed_materials']:
            lines.append(f'\n【提示】混合材料检测:')
            lines.append(f'  → 检测到 {len(self.issues["mixed_materials"])} 种材料: '
                         f'{", ".join(self.issues["mixed_materials"])}')

        total_issues = (len(self.issues['time_missing']) +
                        len(self.issues['duplicate_batches']) +
                        len(self.issues['unit_missing']) +
                        len(self.issues['abnormal_intensity']))
        lines.append('')
        lines.append(f'问题总数: {total_issues} 处')
        lines.append('=' * 60)
        return '\n'.join(lines)
