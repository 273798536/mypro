"""合并差异检测模块 - 检测特征数据和标准化规则的差异"""

import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class DiffType(Enum):
    """差异类型枚举"""
    FEATURE_MISSING_IN_RULES = "feature_missing_in_rules"
    FEATURE_MISSING_IN_DATA = "feature_missing_in_data"
    METHOD_CONFLICT = "method_conflict"
    PARAMETER_CONFLICT = "parameter_conflict"
    DATA_TYPE_MISMATCH = "data_type_mismatch"


class ConflictResolution(Enum):
    """冲突解决策略枚举"""
    USE_DATA = "use_data"
    USE_RULES = "use_rules"
    INTERACTIVE = "interactive"
    MERGE = "merge"


@dataclass
class DiffItem:
    """差异项"""
    diff_type: DiffType
    feature: str
    data_value: Any
    rule_value: Any
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'diff_type': self.diff_type.value,
            'feature': self.feature,
            'data_value': str(self.data_value),
            'rule_value': str(self.rule_value),
            'description': self.description
        }


class MergeDiffDetector:
    """合并差异检测器"""

    def __init__(self, data: pd.DataFrame, standardization_manager):
        """
        初始化合并差异检测器
        
        Args:
            data: 特征数据DataFrame
            standardization_manager: 标准化规则管理器
        """
        self.data = data
        self.std_manager = standardization_manager
        self.diffs: List[DiffItem] = []
        self.resolved_rules: Dict[str, Any] = {}

    def detect_all(self) -> List[DiffItem]:
        """
        检测所有差异
        
        Returns:
            差异项列表
        """
        self.diffs = []
        self._detect_feature_missing_diffs()
        self._detect_method_conflicts()
        self._detect_data_type_mismatches()
        return self.diffs

    def _detect_feature_missing_diffs(self):
        """检测特征缺失差异"""
        data_features = set(self.data.select_dtypes(include=['number']).columns)
        rule_features = set(self.std_manager.get_features_with_rules())

        missing_in_rules = data_features - rule_features
        for feature in missing_in_rules:
            self.diffs.append(DiffItem(
                diff_type=DiffType.FEATURE_MISSING_IN_RULES,
                feature=feature,
                data_value=f"存在（{self.data[feature].dtype}）",
                rule_value="不存在",
                description=f"数据中有特征 '{feature}'，但标准化规则中未定义"
            ))

        missing_in_data = rule_features - data_features
        for feature in missing_in_data:
            self.diffs.append(DiffItem(
                diff_type=DiffType.FEATURE_MISSING_IN_DATA,
                feature=feature,
                data_value="不存在",
                rule_value=f"存在（{self.std_manager.rules[feature].method}）",
                description=f"标准化规则中有特征 '{feature}'，但数据中不存在"
            ))

    def _detect_method_conflicts(self):
        """检测方法冲突（当自动推断和规则不一致时）"""
        common_features = set(self.data.columns) & set(self.std_manager.get_features_with_rules())

        for feature in common_features:
            if feature not in self.data.select_dtypes(include=['number']).columns:
                continue

            col_data = self.data[feature].dropna()
            if len(col_data) == 0:
                continue

            suggested_method = self._suggest_standardization_method(col_data)
            rule_method = self.std_manager.rules[feature].method

            if suggested_method != rule_method and rule_method != 'none':
                data_range = col_data.max() - col_data.min()
                skewness = col_data.skew()

                self.diffs.append(DiffItem(
                    diff_type=DiffType.METHOD_CONFLICT,
                    feature=feature,
                    data_value=f"建议: {suggested_method}（范围:{data_range:.2f}, 偏度:{skewness:.2f}）",
                    rule_value=f"规则: {rule_method}",
                    description=f"特征 '{feature}' 的数据特征建议使用 {suggested_method}，但规则使用 {rule_method}"
                ))

    def _suggest_standardization_method(self, data: pd.Series) -> str:
        """根据数据特征建议标准化方法"""
        data_range = data.max() - data.min()
        skewness = abs(data.skew())
        has_outliers = self._has_outliers(data)

        if skewness > 2 and (data > 0).all():
            return 'log'
        elif has_outliers:
            return 'robust'
        elif data_range < 10 and data.min() >= 0:
            return 'minmax'
        else:
            return 'standard'

    def _has_outliers(self, data: pd.Series) -> bool:
        """检测是否有异常值"""
        q1 = data.quantile(0.25)
        q3 = data.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        return ((data < lower_bound) | (data > upper_bound)).any()

    def _detect_data_type_mismatches(self):
        """检测数据类型不匹配"""
        rule_features = self.std_manager.get_features_with_rules()

        for feature in rule_features:
            if feature not in self.data.columns:
                continue

            data_dtype = self.data[feature].dtype
            if data_dtype == 'object':
                self.diffs.append(DiffItem(
                    diff_type=DiffType.DATA_TYPE_MISMATCH,
                    feature=feature,
                    data_value=f"{data_dtype}（非数值）",
                    rule_value="需要数值型",
                    description=f"特征 '{feature}' 在数据中是非数值类型，无法应用标准化"
                ))

    def get_diff_summary(self) -> Dict[str, Any]:
        """
        获取差异摘要
        
        Returns:
            差异摘要字典
        """
        summary = {
            'total_diffs': len(self.diffs),
            'by_type': {},
            'details': [diff.to_dict() for diff in self.diffs]
        }

        for diff_type in DiffType:
            type_diffs = [d for d in self.diffs if d.diff_type == diff_type]
            summary['by_type'][diff_type.value] = len(type_diffs)

        return summary

    def resolve_conflicts(self, strategy: ConflictResolution = ConflictResolution.MERGE) -> Dict[str, Any]:
        """
        解决冲突并返回合并后的规则
        
        Args:
            strategy: 冲突解决策略
            
        Returns:
            合并后的规则配置字典
        """
        merged_rules = {}

        data_features = set(self.data.select_dtypes(include=['number']).columns)
        rule_features = set(self.std_manager.get_features_with_rules())
        all_features = data_features | rule_features

        for feature in all_features:
            if strategy == ConflictResolution.USE_DATA:
                if feature in data_features:
                    method = self._suggest_standardization_method(self.data[feature].dropna())
                    merged_rules[feature] = {'method': method}
            elif strategy == ConflictResolution.USE_RULES:
                if feature in rule_features:
                    rule = self.std_manager.rules[feature]
                    merged_rules[feature] = {'method': rule.method}
            elif strategy == ConflictResolution.MERGE:
                if feature in rule_features:
                    rule = self.std_manager.rules[feature]
                    merged_rules[feature] = {'method': rule.method}
                elif feature in data_features:
                    method = self._suggest_standardization_method(self.data[feature].dropna())
                    merged_rules[feature] = {'method': method}

        self.resolved_rules = merged_rules
        return merged_rules

    def interactive_resolve(self) -> Dict[str, Any]:
        """
        交互式解决冲突
        
        Returns:
            合并后的规则配置字典
        """
        merged_rules = {}

        data_features = set(self.data.select_dtypes(include=['number']).columns)
        rule_features = set(self.std_manager.get_features_with_rules())
        all_features = data_features | rule_features

        for feature in sorted(all_features):
            in_data = feature in data_features
            in_rules = feature in rule_features

            if in_data and in_rules:
                rule = self.std_manager.rules[feature]
                suggested = self._suggest_standardization_method(self.data[feature].dropna())
                choice = input(
                    f"\n特征 '{feature}':\n"
                    f"  - 规则方法: {rule.method}\n"
                    f"  - 建议方法: {suggested}\n"
                    f"请选择 (1=使用规则, 2=使用建议, 3=跳过): "
                )
                if choice == '1':
                    merged_rules[feature] = {'method': rule.method}
                elif choice == '2':
                    merged_rules[feature] = {'method': suggested}
            elif in_data:
                suggested = self._suggest_standardization_method(self.data[feature].dropna())
                choice = input(
                    f"\n特征 '{feature}'（仅在数据中）:\n"
                    f"  - 建议方法: {suggested}\n"
                    f"请选择 (1=添加规则, 2=跳过): "
                )
                if choice == '1':
                    merged_rules[feature] = {'method': suggested}
            elif in_rules:
                rule = self.std_manager.rules[feature]
                choice = input(
                    f"\n特征 '{feature}'（仅在规则中）:\n"
                    f"  - 规则方法: {rule.method}\n"
                    f"请选择 (1=保留规则, 2=删除): "
                )
                if choice == '1':
                    merged_rules[feature] = {'method': rule.method}

        self.resolved_rules = merged_rules
        return merged_rules

    def print_diff_report(self):
        """打印差异报告到终端"""
        print("\n" + "=" * 80)
        print("「合并差异检测报告」")
        print("=" * 80)

        if not self.diffs:
            print("✅ 未检测到差异，数据特征和标准化规则完全一致")
            return

        summary = self.get_diff_summary()
        print(f"\n📊 总差异数: {summary['total_diffs']}")

        print("\n📋 按类型统计:")
        for diff_type, count in summary['by_type'].items():
            if count > 0:
                print(f"  - {diff_type}: {count} 处")

        print("\n📝 详细差异:")
        for i, diff in enumerate(summary['details'], 1):
            print(f"\n  [{i}] {diff['feature']}")
            print(f"      类型: {diff['diff_type']}")
            print(f"      数据: {diff['data_value']}")
            print(f"      规则: {diff['rule_value']}")
            print(f"      说明: {diff['description']}")

        print("\n" + "=" * 80 + "\n")
