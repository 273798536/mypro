import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import warnings


class DataValidator:
    """数据验证器 - 检查输入数据的质量问题"""
    
    MIN_WINDOW_DAYS = 252
    WARNING_WINDOW_DAYS = 504
    
    def __init__(self):
        self.warnings: List[Dict] = []
        self.errors: List[Dict] = []
    
    def validate_all(self, returns: pd.DataFrame, weights: Dict[str, float], 
                    confidence_level: float, window_days: int, 
                    stress_days: List[str] = None) -> Dict:
        """执行所有验证检查"""
        self.warnings = []
        self.errors = []
        
        self._validate_window_size(window_days)
        self._validate_confidence_level(confidence_level)
        self._validate_weights(weights, returns)
        self._validate_returns_data(returns, window_days)
        self._validate_stress_days(returns, stress_days)
        self._check_extreme_days_duplication(returns, window_days)
        
        return {
            "warnings": self.warnings,
            "errors": self.errors,
            "is_valid": len(self.errors) == 0,
            "has_warnings": len(self.warnings) > 0
        }
    
    def _validate_window_size(self, window_days: int):
        """验证历史窗口大小"""
        if window_days < self.MIN_WINDOW_DAYS:
            self.errors.append({
                "type": "window_too_short",
                "severity": "error",
                "message": f"历史窗口过短: {window_days}天",
                "detail": f"建议最小窗口为{self.MIN_WINDOW_DAYS}天(1年)，当前窗口仅为{window_days}天，结果可能不可靠",
                "recommendation": f"建议使用至少{self.MIN_WINDOW_DAYS}天的数据，理想为{self.WARNING_WINDOW_DAYS}天(2年)"
            })
        elif window_days < self.WARNING_WINDOW_DAYS:
            self.warnings.append({
                "type": "window_below_recommended",
                "severity": "warning",
                "message": f"历史窗口低于推荐值: {window_days}天",
                "detail": f"推荐窗口至少为{self.WARNING_WINDOW_DAYS}天(2年)以获得更稳定的VaR估计",
                "recommendation": "考虑扩展历史数据窗口"
            })
    
    def _validate_confidence_level(self, confidence_level: float):
        """验证置信度水平"""
        if confidence_level <= 0 or confidence_level >= 1:
            self.errors.append({
                "type": "invalid_confidence",
                "severity": "error",
                "message": f"置信度无效: {confidence_level}",
                "detail": "置信度必须在(0, 1)区间内",
                "recommendation": "常用置信度: 0.95, 0.99, 0.999"
            })
        elif confidence_level < 0.9:
            self.warnings.append({
                "type": "low_confidence",
                "severity": "warning",
                "message": f"置信度较低: {confidence_level}",
                "detail": "风控场景通常使用较高的置信度",
                "recommendation": "风控常用置信度: 0.95或0.99"
            })
    
    def _validate_weights(self, weights: Dict[str, float], returns: pd.DataFrame):
        """验证资产权重"""
        assets = returns.columns.tolist()
        
        for asset in assets:
            if asset not in weights:
                self.errors.append({
                    "type": "missing_weight",
                    "severity": "error",
                    "message": f"缺少资产权重: {asset}",
                    "detail": f"收益率数据包含资产{asset}，但权重配置中未提供",
                    "recommendation": "请为所有资产提供权重"
                })
        
        weight_sum = sum(weights.values())
        if not np.isclose(weight_sum, 1.0, rtol=1e-3):
            self.warnings.append({
                "type": "weights_unbalanced",
                "severity": "warning",
                "message": f"资产权重和不为1: {weight_sum:.4f}",
                "detail": f"所有权重之和应为1，当前为{weight_sum:.4f}",
                "recommendation": "系统将自动归一化权重，请验证是否符合预期"
            })
        
        negative_weights = [k for k, v in weights.items() if v < 0]
        if negative_weights:
            self.warnings.append({
                "type": "negative_weights",
                "severity": "warning",
                "message": f"存在负权重（空头）: {', '.join(negative_weights)}",
                "detail": "负权重表示空头头寸，这是允许的但需要确认",
                "recommendation": "请确认空头头寸设置是否正确"
            })
    
    def _validate_returns_data(self, returns: pd.DataFrame, window_days: int):
        """验证收益率数据"""
        if returns.shape[0] < window_days:
            self.errors.append({
                "type": "insufficient_data",
                "severity": "error",
                "message": f"可用数据不足: {returns.shape[0]}天 < {window_days}天",
                "detail": f"请求的窗口为{window_days}天，但只有{returns.shape[0]}天数据可用",
                "recommendation": "请扩展历史数据或减小窗口大小"
            })
        
        for col in returns.columns:
            na_count = returns[col].isna().sum()
            if na_count > 0:
                self.warnings.append({
                    "type": "missing_data",
                    "severity": "warning",
                    "message": f"资产{col}存在缺失值: {na_count}个",
                    "detail": f"缺失值比例: {na_count/len(returns)*100:.2f}%",
                    "recommendation": "系统将使用前向填充或删除包含缺失值的行"
                })
        
        for col in returns.columns:
            zero_ratio = (returns[col] == 0).mean()
            if zero_ratio > 0.1:
                self.warnings.append({
                    "type": "too_many_zeros",
                    "severity": "warning",
                    "message": f"资产{col}零收益率过多: {zero_ratio*100:.1f}%",
                    "detail": "大量零收益率可能表示数据质量问题或资产流动性差",
                    "recommendation": "请检查数据源质量"
                })
    
    def _validate_stress_days(self, returns: pd.DataFrame, stress_days: List[str]):
        """验证压力日数据"""
        if not stress_days:
            return
        
        for day in stress_days:
            if day not in returns.index:
                self.warnings.append({
                    "type": "stress_day_not_found",
                    "severity": "warning",
                    "message": f"压力日不在数据中: {day}",
                    "detail": f"指定的压力日{day}在收益率数据中不存在",
                    "recommendation": "请检查日期格式，应为YYYY-MM-DD"
                })
    
    def _check_extreme_days_duplication(self, returns: pd.DataFrame, window_days: int):
        """检查极端日重复问题"""
        recent_data = returns.tail(window_days)
        
        for col in returns.columns:
            col_returns = recent_data[col].dropna()
            
            sorted_returns = col_returns.sort_values()
            lowest_10 = sorted_returns.head(10)
            
            duplicates = lowest_10.duplicated()
            if duplicates.any():
                dup_values = lowest_10[duplicates].unique()
                self.warnings.append({
                    "type": "extreme_day_duplication",
                    "severity": "warning",
                    "message": f"资产{col}极端收益率存在重复",
                    "detail": f"最差10个收益率中有重复值: {dup_values.tolist()}",
                    "recommendation": "这可能影响历史模拟法的准确性，请检查数据是否有重复"
                })
    
    def print_validation_report(self, result: Dict):
        """打印验证报告"""
        print("\n" + "="*60)
        print("📊 数据质量验证报告")
        print("="*60)
        
        if result["errors"]:
            print("\n❌ 错误 (必须修复):")
            for i, err in enumerate(result["errors"], 1):
                print(f"\n  {i}. [{err['type']}]")
                print(f"     消息: {err['message']}")
                print(f"     详情: {err['detail']}")
                print(f"     建议: {err['recommendation']}")
        
        if result["warnings"]:
            print("\n⚠️  警告 (需要关注):")
            for i, warn in enumerate(result["warnings"], 1):
                print(f"\n  {i}. [{warn['type']}]")
                print(f"     消息: {warn['message']}")
                print(f"     详情: {warn['detail']}")
                print(f"     建议: {warn['recommendation']}")
        
        if not result["errors"] and not result["warnings"]:
            print("\n✅ 数据验证通过，未发现问题")
        
        print("\n" + "="*60 + "\n")
