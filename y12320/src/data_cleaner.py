import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class AnomalyReport:
    anomaly_type: str
    count: int
    affected_indices: List[int]
    description: str
    impact: str


@dataclass
class CleanResult:
    cleaned_data: pd.DataFrame
    anomalies: List[AnomalyReport]
    original_row_count: int
    cleaned_row_count: int


class DataCleaner:
    def __init__(self, iqr_threshold: float = 1.5, min_sample_per_price: int = 5,
                 large_customer_threshold: Optional[float] = None):
        self.iqr_threshold = iqr_threshold
        self.min_sample_per_price = min_sample_per_price
        self.large_customer_threshold = large_customer_threshold

    def detect_outliers_iqr(self, df: pd.DataFrame, column: str) -> Tuple[List[int], np.ndarray]:
        q1 = df[column].quantile(0.25)
        q3 = df[column].quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - self.iqr_threshold * iqr
        upper_bound = q3 + self.iqr_threshold * iqr
        
        outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)].index.tolist()
        bounds = np.array([lower_bound, upper_bound])
        return outliers, bounds

    def detect_large_customers(self, df: pd.DataFrame) -> Tuple[List[int], float]:
        if self.large_customer_threshold is None:
            threshold = df['customer_size'].quantile(0.95)
        else:
            threshold = self.large_customer_threshold
        
        large_customers = df[df['customer_size'] > threshold].index.tolist()
        return large_customers, threshold

    def detect_discount_records(self, df: pd.DataFrame) -> List[int]:
        if 'discount' in df.columns:
            discount_indices = df[df['discount'] > 0].index.tolist()
            return discount_indices
        
        price_stats = df.groupby('price')['customer_size'].transform('mean')
        normalized_size = df['customer_size'] / price_stats
        potential_discounts = df[
            (normalized_size > 1.5) & 
            (df['converted'] == 1)
        ].index.tolist()
        return potential_discounts

    def detect_sparse_price_points(self, df: pd.DataFrame) -> Tuple[List[int], List[float]]:
        price_counts = df['price'].value_counts()
        sparse_prices = price_counts[price_counts < self.min_sample_per_price].index.tolist()
        sparse_indices = df[df['price'].isin(sparse_prices)].index.tolist()
        return sparse_indices, sparse_prices

    def detect_conversion_outliers(self, df: pd.DataFrame) -> List[int]:
        price_conversion = df.groupby('price')['converted'].agg(['mean', 'count'])
        global_mean = df['converted'].mean()
        
        anomalous_prices = []
        for price, row in price_conversion.iterrows():
            if row['count'] >= 10:
                se = np.sqrt(global_mean * (1 - global_mean) / row['count'])
                if abs(row['mean'] - global_mean) > 3 * se:
                    anomalous_prices.append(price)
        
        outlier_indices = df[df['price'].isin(anomalous_prices)].index.tolist()
        return outlier_indices

    def clean_data(self, df: pd.DataFrame, exclude_large_customers: bool = False,
                   exclude_discounts: bool = False, exclude_sparse: bool = False) -> CleanResult:
        anomalies = []
        original_count = len(df)
        cleaned_df = df.copy()
        excluded_indices = set()

        large_customer_indices, large_cust_threshold = self.detect_large_customers(df)
        if large_customer_indices:
            impact = self._calculate_impact(df, large_customer_indices)
            anomalies.append(AnomalyReport(
                anomaly_type='异常大客户',
                count=len(large_customer_indices),
                affected_indices=large_customer_indices,
                description=f'客户规模超过阈值 {large_cust_threshold:.1f} 的记录',
                impact=impact
            ))
            if exclude_large_customers:
                excluded_indices.update(large_customer_indices)

        discount_indices = self.detect_discount_records(df)
        if discount_indices:
            impact = self._calculate_impact(df, discount_indices)
            anomalies.append(AnomalyReport(
                anomaly_type='折扣记录',
                count=len(discount_indices),
                affected_indices=discount_indices,
                description='疑似享受折扣优惠的转化记录',
                impact=impact
            ))
            if exclude_discounts:
                excluded_indices.update(discount_indices)

        sparse_indices, sparse_prices = self.detect_sparse_price_points(df)
        if sparse_indices:
            impact = self._calculate_impact(df, sparse_indices)
            anomalies.append(AnomalyReport(
                anomaly_type='稀疏价格点',
                count=len(sparse_indices),
                affected_indices=sparse_indices,
                description=f'样本数少于 {self.min_sample_per_price} 的价格点: {sparse_prices}',
                impact=impact
            ))
            if exclude_sparse:
                excluded_indices.update(sparse_indices)

        price_outlier_indices = self.detect_outliers_iqr(df, 'price')[0]
        if price_outlier_indices:
            impact = self._calculate_impact(df, price_outlier_indices)
            anomalies.append(AnomalyReport(
                anomaly_type='价格异常值',
                count=len(price_outlier_indices),
                affected_indices=price_outlier_indices,
                description='通过IQR方法检测到的价格异常值',
                impact=impact
            ))

        if excluded_indices:
            cleaned_df = df.drop(index=list(excluded_indices))

        return CleanResult(
            cleaned_data=cleaned_df,
            anomalies=anomalies,
            original_row_count=original_count,
            cleaned_row_count=len(cleaned_df)
        )

    def _calculate_impact(self, df: pd.DataFrame, indices: List[int]) -> str:
        if not indices:
            return "无影响"
        
        affected = df.loc[indices]
        overall_conv = df['converted'].mean()
        affected_conv = affected['converted'].mean()
        conv_diff = affected_conv - overall_conv
        
        pct_total = len(indices) / len(df) * 100
        
        return (f"占总样本 {pct_total:.1f}%, "
                f"转化率 {'+' if conv_diff >= 0 else ''}{conv_diff:.1%} 于整体水平")

    def get_anomaly_summary(self, anomalies: List[AnomalyReport]) -> pd.DataFrame:
        return pd.DataFrame([
            {
                '异常类型': a.anomaly_type,
                '记录数': a.count,
                '影响描述': a.impact,
                '详细说明': a.description
            }
            for a in anomalies
        ])
