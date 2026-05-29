import pandas as pd
from typing import Tuple, List, Dict
import warnings


class DataValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def validate_ingredients(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str], List[str]]:
        self.errors = []
        self.warnings = []
        validated_rows = []

        required_columns = ['原料名称', '价格(元/吨)', '粗蛋白(%)', '消化能(兆卡/公斤)', '库存(吨)']
        
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            self.errors.append(f"缺少必要列: {', '.join(missing_cols)}")
            return pd.DataFrame(), self.errors, self.warnings

        for idx, row in df.iterrows():
            row_errors = []
            name = str(row.get('原料名称', f'第{idx+1}行'))

            if pd.isna(row['原料名称']) or str(row['原料名称']).strip() == '':
                row_errors.append("原料名称为空")

            if pd.isna(row['价格(元/吨)']) or row['价格(元/吨)'] < 0:
                row_errors.append(f"价格异常: {row['价格(元/吨)']}")

            if pd.isna(row['粗蛋白(%)']) or row['粗蛋白(%)'] < 0 or row['粗蛋白(%)'] > 100:
                row_errors.append(f"粗蛋白异常: {row['粗蛋白(%)']}%")

            if pd.isna(row['消化能(兆卡/公斤)']) or row['消化能(兆卡/公斤)'] < 0:
                row_errors.append(f"消化能异常: {row['消化能(兆卡/公斤)']}")

            if pd.isna(row['库存(吨)']) or row['库存(吨)'] < 0:
                row_errors.append(f"库存异常: {row['库存(吨)']}吨")

            min_col = '最低比例(%)'
            max_col = '最高比例(%)'
            if min_col in df.columns and max_col in df.columns:
                min_val = row[min_col] if not pd.isna(row[min_col]) else 0
                max_val = row[max_col] if not pd.isna(row[max_col]) else 100
                if min_val > max_val:
                    row_errors.append(f"比例冲突: 最低{min_val}% > 最高{max_val}%")
                if min_val < 0 or max_val > 100:
                    row_errors.append(f"比例范围异常: {min_val}%-{max_val}%")

            if row_errors:
                self.errors.append(f"{name}: {'; '.join(row_errors)}")
            else:
                validated_rows.append(row)

        validated_df = pd.DataFrame(validated_rows)
        
        if not validated_df.empty:
            if validated_df['价格(元/吨)'].max() / validated_df['价格(元/吨)'].min() > 10:
                self.warnings.append("价格差异超过10倍,请检查是否单位有误")
            
            zero_stock = validated_df[validated_df['库存(吨)'] == 0]['原料名称'].tolist()
            if zero_stock:
                self.warnings.append(f"以下原料库存为0: {', '.join(zero_stock)}")

        return validated_df, self.errors, self.warnings

    def validate_nutrition_constraints(self, constraints: Dict) -> Tuple[bool, List[str]]:
        errors = []
        
        if '目标产量' not in constraints or constraints['目标产量'] <= 0:
            errors.append("目标产量必须大于0")
        
        if '粗蛋白最低' in constraints and '粗蛋白最高' in constraints:
            if constraints['粗蛋白最低'] > constraints['粗蛋白最高']:
                errors.append("粗蛋白最低要求大于最高要求")
        
        if '消化能最低' in constraints and '消化能最高' in constraints:
            if constraints['消化能最低'] > constraints['消化能最高']:
                errors.append("消化能最低要求大于最高要求")

        return len(errors) == 0, errors

    def has_errors(self) -> bool:
        return len(self.errors) > 0
