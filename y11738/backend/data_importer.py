import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Tuple
import uuid


class DataCleaner:
    PLATE_PATTERN = r'^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{4,5}[A-Z0-9挂学警港澳]?$'
    PLATE_PATTERN_NEW = r'^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}$'

    @staticmethod
    def clean_plate(plate: str) -> str:
        if not plate:
            return ''
        plate = str(plate).strip().upper()
        plate = re.sub(r'[\s\-·.，。]', '', plate)
        plate = plate.replace('O', '0').replace('I', '1')
        if re.match(DataCleaner.PLATE_PATTERN, plate) or re.match(DataCleaner.PLATE_PATTERN_NEW, plate):
            return plate
        return plate

    @staticmethod
    def validate_plate(plate: str) -> bool:
        if not plate:
            return False
        plate = DataCleaner.clean_plate(plate)
        return bool(re.match(DataCleaner.PLATE_PATTERN, plate) or 
                    re.match(DataCleaner.PLATE_PATTERN_NEW, plate))

    @staticmethod
    def clean_driver_name(name: str) -> str:
        if not name:
            return ''
        name = str(name).strip()
        name = re.sub(r'[\s\-·.，。]', '', name)
        return name

    @staticmethod
    def clean_fuel_type(fuel: str) -> str:
        if not fuel:
            return ''
        fuel = str(fuel).strip().upper()
        fuel = fuel.replace('＃', '#').replace('号', '#')
        fuel_map = {
            '92#': '92#', '92': '92#', 'E92#': '92#',
            '95#': '95#', '95': '95#', 'E95#': '95#',
            '98#': '98#', '98': '98#',
            '0#': '0#', '0': '0#', '0#柴油': '0#',
            '-10#': '-10#', '-10': '-10#', '-10#柴油': '-10#',
            '-20#': '-20#', '-20': '-20#',
            '92#汽油': '92#', '95#汽油': '95#', '柴油': '0#',
            'GASOLINE': '92#', 'DIESEL': '0#'
        }
        return fuel_map.get(fuel, fuel)

    @staticmethod
    def clean_amount(amount) -> float:
        if amount is None or amount == '':
            return 0.0
        if isinstance(amount, (int, float)):
            return float(amount)
        amount_str = str(amount).strip()
        amount_str = re.sub(r'[,\s￥$¥]', '', amount_str)
        try:
            return float(amount_str)
        except ValueError:
            return 0.0

    @staticmethod
    def clean_date(date_val):
        if date_val is None or date_val == '':
            return None
        if isinstance(date_val, datetime):
            return date_val
        if isinstance(date_val, pd.Timestamp):
            return date_val.to_pydatetime()
        date_str = str(date_val).strip()
        date_formats = [
            '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d',
            '%Y/%m/%d %H:%M:%S', '%Y/%m/%d %H:%M', '%Y/%m/%d',
            '%Y年%m月%d日 %H:%M:%S', '%Y年%m月%d日',
            '%m/%d/%Y %H:%M:%S', '%m/%d/%Y',
            '%d-%m-%Y %H:%M:%S', '%d-%m-%Y'
        ]
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None


class DataImporter:
    @staticmethod
    def _allowed_file(filename):
        return '.' in filename and \
            filename.rsplit('.', 1)[1].lower() in {'xlsx', 'xls', 'csv'}

    EXPECTED_COLUMNS = {
        'transaction_date': ['交易时间', '时间', '日期', '加油时间', '消费日期'],
        'card_number': ['卡号', '加油卡号', '卡编号', '油卡号'],
        'plate_number': ['车牌号', '车牌', '车号', '车辆牌照'],
        'driver_name': ['司机', '司机姓名', '驾驶员', '加油员', '经办人'],
        'fuel_type': ['油品', '油品类型', '燃油类型', '加油类型', '品号'],
        'quantity': ['数量', '加油量', '升数', '加油数量'],
        'unit_price': ['单价', '油价', '价格', '每升价格'],
        'total_amount': ['金额', '总金额', '消费金额', '合计', '应付金额'],
        'station_name': ['加油站', '油站', '站点', '加油站名称'],
        'remark': ['备注', '说明', '注释', '摘要']
    }

    def __init__(self):
        self.cleaner = DataCleaner()

    def read_file(self, file_path: str) -> pd.DataFrame:
        if file_path.endswith('.csv'):
            return pd.read_csv(file_path, dtype=str)
        else:
            return pd.read_excel(file_path, dtype=str)

    def detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        column_mapping = {}
        df_columns = [col.strip() for col in df.columns]
        
        for standard_name, possible_names in self.EXPECTED_COLUMNS.items():
            for df_col in df_columns:
                if df_col in possible_names or any(name in df_col for name in possible_names):
                    column_mapping[standard_name] = df_col
                    break
        
        return column_mapping

    def clean_dataframe(self, df: pd.DataFrame, column_mapping: Dict[str, str]) -> List[Dict]:
        cleaned_records = []
        batch_id = str(uuid.uuid4())[:8]

        for idx, row in df.iterrows():
            record = {
                'batch_id': batch_id,
                'row_number': idx + 2,
                'warnings': [],
                'errors': []
            }

            for standard_name, df_col in column_mapping.items():
                raw_value = row.get(df_col, '')
                record[f'raw_{standard_name}'] = raw_value

                if standard_name == 'transaction_date':
                    cleaned = self.cleaner.clean_date(raw_value)
                    if cleaned is None:
                        record['errors'].append(f'日期格式错误: {raw_value}')
                    record[standard_name] = cleaned
                elif standard_name == 'plate_number':
                    cleaned = self.cleaner.clean_plate(raw_value)
                    if not self.cleaner.validate_plate(cleaned):
                        record['warnings'].append(f'车牌格式异常: {raw_value}')
                    record[standard_name] = cleaned
                elif standard_name == 'driver_name':
                    record[standard_name] = self.cleaner.clean_driver_name(raw_value)
                elif standard_name == 'fuel_type':
                    record[standard_name] = self.cleaner.clean_fuel_type(raw_value)
                elif standard_name in ['quantity', 'unit_price', 'total_amount']:
                    cleaned = self.cleaner.clean_amount(raw_value)
                    if cleaned < 0:
                        record['errors'].append(f'{standard_name}为负数: {raw_value}')
                    record[standard_name] = cleaned
                else:
                    record[standard_name] = str(raw_value).strip() if raw_value else ''

            if 'quantity' in record and 'unit_price' in record and 'total_amount' in record:
                calc_amount = record['quantity'] * record['unit_price']
                if abs(calc_amount - record['total_amount']) > 0.01 and record['total_amount'] > 0:
                    record['warnings'].append(
                        f'金额校验不通过: 数量×单价={calc_amount:.2f}, 实际金额={record["total_amount"]:.2f}'
                    )

            cleaned_records.append(record)

        return cleaned_records

    def import_file(self, file_path: str, source_file: str = None) -> Tuple[List[Dict], Dict]:
        df = self.read_file(file_path)
        column_mapping = self.detect_columns(df)
        
        missing_cols = []
        for required in ['transaction_date', 'plate_number', 'fuel_type', 'quantity', 'total_amount']:
            if required not in column_mapping:
                missing_cols.append(required)
        
        if missing_cols:
            raise ValueError(f'缺少必要列: {", ".join(missing_cols)}')

        cleaned_records = self.clean_dataframe(df, column_mapping)
        
        stats = {
            'total_records': len(cleaned_records),
            'has_errors': sum(1 for r in cleaned_records if r['errors']),
            'has_warnings': sum(1 for r in cleaned_records if r['warnings'] and not r['errors']),
            'clean_records': sum(1 for r in cleaned_records if not r['errors'] and not r['warnings']),
            'column_mapping': column_mapping,
            'source_file': source_file or file_path
        }

        return cleaned_records, stats
