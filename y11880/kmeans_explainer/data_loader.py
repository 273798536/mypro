"""数据加载模块 - 负责加载客户特征数据"""

import os
import json
import yaml
import pandas as pd
from typing import Dict, Any, Optional, Tuple


class DataLoader:
    """数据加载器"""

    SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls', '.json', '.yaml', '.yml']

    def __init__(self, file_path: str, sheet_name: Optional[str] = None):
        """
        初始化数据加载器
        
        Args:
            file_path: 数据文件路径
            sheet_name: Excel文件的工作表名称
        """
        self.file_path = file_path
        self.sheet_name = sheet_name
        self.raw_data: Optional[pd.DataFrame] = None
        self.data: Optional[pd.DataFrame] = None
        self.metadata: Dict[str, Any] = {}

    def load(self) -> pd.DataFrame:
        """
        加载数据文件
        
        Returns:
            加载后的DataFrame
        """
        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"数据文件不存在: {self.file_path}")

        file_ext = os.path.splitext(self.file_path)[1].lower()

        if file_ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的文件格式: {file_ext}，支持格式: {self.SUPPORTED_FORMATS}")

        if file_ext == '.csv':
            self.raw_data = pd.read_csv(self.file_path)
        elif file_ext in ['.xlsx', '.xls']:
            self.raw_data = pd.read_excel(self.file_path, sheet_name=self.sheet_name)
        elif file_ext == '.json':
            self.raw_data = pd.read_json(self.file_path)
        elif file_ext in ['.yaml', '.yml']:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            self.raw_data = pd.DataFrame(data)

        self.metadata['row_count'] = len(self.raw_data)
        self.metadata['column_count'] = len(self.raw_data.columns)
        self.metadata['columns'] = list(self.raw_data.columns)
        self.metadata['file_path'] = self.file_path

        self.data = self.raw_data.copy()
        return self.data

    def get_feature_columns(self, exclude_columns: Optional[list] = None) -> list:
        """
        获取特征列名
        
        Args:
            exclude_columns: 要排除的列名列表
            
        Returns:
            特征列名列表
        """
        if self.data is None:
            raise ValueError("数据未加载，请先调用load()方法")

        exclude = exclude_columns or []
        feature_cols = [col for col in self.data.columns if col not in exclude]
        return feature_cols

    def get_numeric_columns(self) -> list:
        """
        获取数值型列名
        
        Returns:
            数值型列名列表
        """
        if self.data is None:
            raise ValueError("数据未加载，请先调用load()方法")

        return self.data.select_dtypes(include=['number']).columns.tolist()

    def get_categorical_columns(self) -> list:
        """
        获取分类型列名
        
        Returns:
            分类型列名列表
        """
        if self.data is None:
            raise ValueError("数据未加载，请先调用load()方法")

        return self.data.select_dtypes(include=['object', 'category']).columns.tolist()

    def validate_features(self, required_features: list) -> Tuple[bool, list]:
        """
        验证数据是否包含必需的特征
        
        Args:
            required_features: 必需的特征列表
            
        Returns:
            (是否有效, 缺失的特征列表)
        """
        if self.data is None:
            raise ValueError("数据未加载，请先调用load()方法")

        missing_features = [f for f in required_features if f not in self.data.columns]
        return len(missing_features) == 0, missing_features

    def get_data_summary(self) -> Dict[str, Any]:
        """
        获取数据摘要信息
        
        Returns:
            数据摘要字典
        """
        if self.data is None:
            raise ValueError("数据未加载，请先调用load()方法")

        summary = {
            'row_count': len(self.data),
            'column_count': len(self.data.columns),
            'numeric_columns': self.get_numeric_columns(),
            'categorical_columns': self.get_categorical_columns(),
            'missing_values': self.data.isnull().sum().to_dict(),
            'basic_stats': self.data.describe().to_dict() if len(self.get_numeric_columns()) > 0 else {}
        }
        return summary

    def save_metadata(self, output_path: str):
        """
        保存元数据到文件
        
        Args:
            output_path: 输出文件路径
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
