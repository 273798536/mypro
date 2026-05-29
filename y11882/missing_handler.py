"""
缺失值检测与处理模块
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class MissingMethod(Enum):
    DROP = 'drop'
    FILL_ZERO = 'fill_zero'
    FILL_MEAN = 'fill_mean'
    FILL_MEDIAN = 'fill_median'
    INTERPOLATE = 'interpolate'


@dataclass
class MissingAssetInfo:
    asset_name: str
    missing_count: int
    total_count: int
    missing_ratio: float
    blocked: bool
    block_reason: str = ""


@dataclass
class MissingAnalysisResult:
    assets: List[MissingAssetInfo]
    blocked_assets: List[str]
    valid_assets: List[str]
    overall_missing_ratio: float
    handling_method: MissingMethod
    data_after_handling: Optional[pd.DataFrame] = None


class MissingHandler:
    def __init__(self, missing_threshold: float = 0.3, min_non_missing_obs: int = 10):
        self.missing_threshold = missing_threshold
        self.min_non_missing_obs = min_non_missing_obs

    def analyze_missing(self, df: pd.DataFrame) -> MissingAnalysisResult:
        assets_info: List[MissingAssetInfo] = []
        blocked_assets: List[str] = []
        valid_assets: List[str] = []
        
        total_cells = df.size
        total_missing = df.isna().sum().sum()
        overall_missing_ratio = total_missing / total_cells if total_cells > 0 else 0
        
        for asset in df.columns:
            asset_data = df[asset]
            missing_count = asset_data.isna().sum()
            total_count = len(asset_data)
            missing_ratio = missing_count / total_count if total_count > 0 else 1.0
            non_missing_count = total_count - missing_count
            
            blocked = False
            block_reason = ""
            
            if missing_ratio > self.missing_threshold:
                blocked = True
                block_reason = f"缺失率{missing_ratio:.2%}超过阈值{self.missing_threshold:.2%}"
            elif non_missing_count < self.min_non_missing_obs:
                blocked = True
                block_reason = f"有效观测数{non_missing_count}少于最小要求{self.min_non_missing_obs}"
            
            asset_info = MissingAssetInfo(
                asset_name=asset,
                missing_count=missing_count,
                total_count=total_count,
                missing_ratio=missing_ratio,
                blocked=blocked,
                block_reason=block_reason
            )
            assets_info.append(asset_info)
            
            if blocked:
                blocked_assets.append(asset)
            else:
                valid_assets.append(asset)
        
        return MissingAnalysisResult(
            assets=assets_info,
            blocked_assets=blocked_assets,
            valid_assets=valid_assets,
            overall_missing_ratio=overall_missing_ratio,
            handling_method=MissingMethod.DROP,
            data_after_handling=None
        )

    def handle_missing(self, df: pd.DataFrame, 
                       method: MissingMethod = MissingMethod.DROP,
                       drop_blocked: bool = True) -> Tuple[pd.DataFrame, MissingAnalysisResult]:
        analysis = self.analyze_missing(df)
        analysis.handling_method = method
        
        working_df = df.copy()
        
        if drop_blocked and analysis.blocked_assets:
            working_df = working_df.drop(columns=analysis.blocked_assets)
        
        if method == MissingMethod.DROP:
            handled_df = working_df.dropna()
        elif method == MissingMethod.FILL_ZERO:
            handled_df = working_df.fillna(0)
        elif method == MissingMethod.FILL_MEAN:
            handled_df = working_df.fillna(working_df.mean())
        elif method == MissingMethod.FILL_MEDIAN:
            handled_df = working_df.fillna(working_df.median())
        elif method == MissingMethod.INTERPOLATE:
            handled_df = working_df.interpolate(method='linear', limit_direction='both')
        else:
            handled_df = working_df.dropna()
        
        analysis.data_after_handling = handled_df
        
        return handled_df, analysis

    def get_blocked_report(self, analysis: MissingAnalysisResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("缺失值拦截报告")
        lines.append("=" * 60)
        lines.append(f"总体缺失率: {analysis.overall_missing_ratio:.2%}")
        lines.append(f"资产总数: {len(analysis.assets)}")
        lines.append(f"通过检查: {len(analysis.valid_assets)}")
        lines.append(f"被拦截: {len(analysis.blocked_assets)}")
        lines.append("")
        
        if analysis.blocked_assets:
            lines.append("被拦截资产详情:")
            lines.append("-" * 60)
            for asset_info in analysis.assets:
                if asset_info.blocked:
                    lines.append(f"  {asset_info.asset_name}:")
                    lines.append(f"    缺失率: {asset_info.missing_ratio:.2%} ({asset_info.missing_count}/{asset_info.total_count})")
                    lines.append(f"    拦截原因: {asset_info.block_reason}")
                    lines.append("")
        
        lines.append("通过检查资产:")
        lines.append("-" * 60)
        lines.append(f"  {', '.join(analysis.valid_assets)}")
        
        return "\n".join(lines)

    def get_blocked_assets_dataframe(self, analysis: MissingAnalysisResult) -> pd.DataFrame:
        data = []
        for asset_info in analysis.assets:
            data.append({
                '资产名称': asset_info.asset_name,
                '缺失数量': asset_info.missing_count,
                '总观测数': asset_info.total_count,
                '缺失率': f"{asset_info.missing_ratio:.2%}",
                '是否被拦截': '是' if asset_info.blocked else '否',
                '拦截原因': asset_info.block_reason
            })
        return pd.DataFrame(data)
