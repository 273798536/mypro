"""标准化规则管理模块 - 负责管理和应用标准化规则"""

import os
import json
import yaml
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler


class StandardizationRule:
    """单个标准化规则"""

    VALID_METHODS = ['standard', 'minmax', 'robust', 'log', 'none']

    def __init__(self, feature: str, method: str = 'standard', **kwargs):
        """
        初始化标准化规则
        
        Args:
            feature: 特征名称
            method: 标准化方法 (standard, minmax, robust, log, none)
            **kwargs: 其他参数
        """
        if method not in self.VALID_METHODS:
            raise ValueError(f"不支持的标准化方法: {method}，支持方法: {self.VALID_METHODS}")

        self.feature = feature
        self.method = method
        self.scaler = None
        self.params = kwargs
        self.fitted = False
        self.mean_ = None
        self.std_ = None
        self.min_ = None
        self.max_ = None

    def fit(self, data: pd.Series):
        """拟合标准化器"""
        if self.method == 'none':
            self.fitted = True
            return

        if self.method == 'standard':
            self.scaler = StandardScaler()
            self.scaler.fit(data.values.reshape(-1, 1))
            self.mean_ = float(self.scaler.mean_[0])
            self.std_ = float(np.sqrt(self.scaler.var_[0]))
        elif self.method == 'minmax':
            feature_range = self.params.get('feature_range', (0, 1))
            self.scaler = MinMaxScaler(feature_range=feature_range)
            self.scaler.fit(data.values.reshape(-1, 1))
            self.min_ = float(self.scaler.data_min_[0])
            self.max_ = float(self.scaler.data_max_[0])
        elif self.method == 'robust':
            self.scaler = RobustScaler()
            self.scaler.fit(data.values.reshape(-1, 1))
        elif self.method == 'log':
            self.mean_ = float(np.log1p(data).mean())
            self.std_ = float(np.log1p(data).std())

        self.fitted = True

    def transform(self, data: pd.Series) -> pd.Series:
        """应用标准化变换"""
        if not self.fitted and self.method != 'none':
            raise ValueError(f"标准化器未拟合，请先调用fit()方法: {self.feature}")

        if self.method == 'none':
            return data
        elif self.method == 'log':
            log_data = np.log1p(data)
            return (log_data - self.mean_) / self.std_ if self.std_ > 0 else log_data - self.mean_
        else:
            transformed = self.scaler.transform(data.values.reshape(-1, 1)).flatten()
            return pd.Series(transformed, index=data.index, name=data.name)

    def inverse_transform(self, data: pd.Series) -> pd.Series:
        """逆标准化变换"""
        if not self.fitted and self.method != 'none':
            raise ValueError(f"标准化器未拟合，请先调用fit()方法: {self.feature}")

        if self.method == 'none':
            return data
        elif self.method == 'log':
            exp_data = data * self.std_ + self.mean_ if self.std_ > 0 else data + self.mean_
            return np.expm1(exp_data)
        else:
            inverse = self.scaler.inverse_transform(data.values.reshape(-1, 1)).flatten()
            return pd.Series(inverse, index=data.index, name=data.name)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'feature': self.feature,
            'method': self.method,
            'fitted': self.fitted,
            'mean': self.mean_,
            'std': self.std_,
            'min': self.min_,
            'max': self.max_,
            'params': self.params
        }


class StandardizationManager:
    """标准化规则管理器"""

    def __init__(self):
        self.rules: Dict[str, StandardizationRule] = {}
        self.rule_source: str = "default"

    def add_rule(self, rule: StandardizationRule):
        """添加标准化规则"""
        self.rules[rule.feature] = rule

    def add_rules_from_dict(self, rules_dict: Dict[str, Dict[str, Any]]):
        """从字典批量添加规则"""
        for feature, rule_config in rules_dict.items():
            config_copy = rule_config.copy()
            method = config_copy.pop('method', 'standard')
            rule = StandardizationRule(feature=feature, method=method, **config_copy)
            self.rules[feature] = rule

    def load_rules_from_file(self, file_path: str, source: str = "file"):
        """从文件加载标准化规则"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"标准化规则文件不存在: {file_path}")

        file_ext = os.path.splitext(file_path)[1].lower()

        if file_ext in ['.yaml', '.yml']:
            with open(file_path, 'r', encoding='utf-8') as f:
                rules_data = yaml.safe_load(f)
        elif file_ext == '.json':
            with open(file_path, 'r', encoding='utf-8') as f:
                rules_data = json.load(f)
        else:
            raise ValueError(f"不支持的规则文件格式: {file_ext}")

        if 'rules' in rules_data:
            rules_data = rules_data['rules']

        self.add_rules_from_dict(rules_data)
        self.rule_source = source

    def get_features_with_rules(self) -> List[str]:
        """获取有标准化规则的特征列表"""
        return list(self.rules.keys())

    def fit(self, data: pd.DataFrame, features: Optional[List[str]] = None):
        """拟合所有标准化规则"""
        fit_features = features or self.get_features_with_rules()

        for feature in fit_features:
            if feature in self.rules and feature in data.columns:
                self.rules[feature].fit(data[feature])

    def transform(self, data: pd.DataFrame, features: Optional[List[str]] = None) -> pd.DataFrame:
        """应用标准化变换"""
        result = data.copy()
        transform_features = features or self.get_features_with_rules()

        for feature in transform_features:
            if feature in self.rules and feature in result.columns:
                result[feature] = self.rules[feature].transform(result[feature])

        return result

    def fit_transform(self, data: pd.DataFrame, features: Optional[List[str]] = None) -> pd.DataFrame:
        """拟合并应用标准化变换"""
        self.fit(data, features)
        return self.transform(data, features)

    def inverse_transform(self, data: pd.DataFrame, features: Optional[List[str]] = None) -> pd.DataFrame:
        """逆标准化变换"""
        result = data.copy()
        inverse_features = features or self.get_features_with_rules()

        for feature in inverse_features:
            if feature in self.rules and feature in result.columns:
                result[feature] = self.rules[feature].inverse_transform(result[feature])

        return result

    def get_rule_summary(self) -> Dict[str, Any]:
        """获取规则摘要"""
        summary = {
            'source': self.rule_source,
            'rule_count': len(self.rules),
            'rules': {feature: rule.to_dict() for feature, rule in self.rules.items()}
        }
        return summary

    def save_rules(self, output_path: str):
        """保存规则到文件"""
        summary = self.get_rule_summary()
        file_ext = os.path.splitext(output_path)[1].lower()

        with open(output_path, 'w', encoding='utf-8') as f:
            if file_ext in ['.yaml', '.yml']:
                yaml.dump(summary, f, default_flow_style=False, allow_unicode=True)
            else:
                json.dump(summary, f, ensure_ascii=False, indent=2)

    def detect_scale_issues(self, data: pd.DataFrame) -> Dict[str, Any]:
        """检测特征尺度问题"""
        issues = {}
        numeric_cols = data.select_dtypes(include=['number']).columns

        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue

            stats = {
                'mean': float(col_data.mean()),
                'std': float(col_data.std()),
                'min': float(col_data.min()),
                'max': float(col_data.max()),
                'range': float(col_data.max() - col_data.min()),
                'cv': float(col_data.std() / col_data.mean()) if col_data.mean() != 0 else 0
            }

            warnings = []
            if stats['range'] > 1e6:
                warnings.append('数值范围过大，可能存在尺度问题')
            if stats['std'] > 100 * abs(stats['mean']) and stats['mean'] != 0:
                warnings.append('标准差远大于均值，可能存在异常值')
            if abs(stats['mean']) > 1e4 or abs(stats['mean']) < 1e-3:
                warnings.append('均值量级异常，建议标准化')

            if warnings:
                issues[col] = {
                    'stats': stats,
                    'warnings': warnings
                }

        return issues
