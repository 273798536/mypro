import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import pearsonr, spearmanr, kendalltau
from data_manager import DataManager


class CorrelationAnalyzer:
    def __init__(self, data_manager):
        self.dm = data_manager
        self.corr_results = {}
        self.outlier_records = {}
    
    def detect_outliers(self, series, method='iqr', threshold=1.5):
        series = pd.to_numeric(series, errors='coerce')
        series = series.dropna()
        
        if len(series) < 4:
            return []
        
        if method == 'iqr':
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - threshold * iqr
            upper_bound = q3 + threshold * iqr
            outliers = series[(series < lower_bound) | (series > upper_bound)]
        elif method == 'zscore':
            z_scores = np.abs(stats.zscore(series))
            outliers = series[z_scores > threshold]
        elif method == 'mad':
            median = series.median()
            mad = np.median(np.abs(series - median))
            if mad == 0:
                return []
            modified_z_scores = 0.6745 * (series - median) / mad
            outliers = series[np.abs(modified_z_scores) > threshold]
        else:
            raise ValueError(f"未知的异常检测方法: {method}")
        
        return outliers.index.tolist()
    
    def calculate_correlation(self, x, y, method='pearson'):
        x = pd.to_numeric(x, errors='coerce')
        y = pd.to_numeric(y, errors='coerce')
        
        mask = ~(np.isnan(x) | np.isnan(y))
        x = x[mask]
        y = y[mask]
        
        if len(x) < 3:
            return {
                'correlation': np.nan,
                'p_value': np.nan,
                'n': len(x),
                'significant': False
            }
        
        if method == 'pearson':
            corr, p_value = pearsonr(x, y)
        elif method == 'spearman':
            corr, p_value = spearmanr(x, y)
        elif method == 'kendall':
            corr, p_value = kendalltau(x, y)
        else:
            raise ValueError(f"未知的相关方法: {method}")
        
        return {
            'correlation': corr,
            'p_value': p_value,
            'n': len(x),
            'significant': p_value < 0.05
        }
    
    def analyze_all_pairs(self, method='pearson', outlier_method='iqr', group_col=None, subset=None):
        df = self.dm.get_combined_data()
        if df is None:
            return None
        
        metric_cols = self.dm.get_metric_columns()
        if len(metric_cols) < 2:
            return None
        
        if subset:
            df = df[subset].copy()
        
        results = []
        outlier_summary = {}
        
        for col in metric_cols:
            outliers = self.detect_outliers(df[col], method=outlier_method)
            outlier_summary[col] = {
                'outlier_count': len(outliers),
                'outlier_indices': df.iloc[outliers][self.dm.metadata['id_column']].tolist() if len(outliers) > 0 else []
            }
        
        if group_col and group_col in df.columns:
            groups = df[group_col].unique()
            for group in groups:
                group_df = df[df[group_col] == group].copy()
                results.extend(self._analyze_subset(group_df, metric_cols, method, f"{group_col}={group}"))
        else:
            results.extend(self._analyze_subset(df, metric_cols, method, "all"))
        
        self.corr_results = {
            'pairs': results,
            'outliers': outlier_summary,
            'method': method,
            'group_col': group_col
        }
        
        return self.corr_results
    
    def _analyze_subset(self, df, metric_cols, method, subset_name):
        results = []
        n_metrics = len(metric_cols)
        
        for i in range(n_metrics):
            for j in range(i + 1, n_metrics):
                col1, col2 = metric_cols[i], metric_cols[j]
                
                corr_result = self.calculate_correlation(df[col1], df[col2], method)
                
                corr_without_outliers = self._calc_corr_without_outliers(df, col1, col2, method)
                
                results.append({
                    'metric1': col1,
                    'metric2': col2,
                    'subset': subset_name,
                    'correlation': corr_result['correlation'],
                    'p_value': corr_result['p_value'],
                    'n_samples': corr_result['n'],
                    'significant': corr_result['significant'],
                    'corr_without_outliers': corr_without_outliers['correlation'],
                    'p_value_without_outliers': corr_without_outliers['p_value'],
                    'correlation_diff': abs(corr_result['correlation']) - abs(corr_without_outliers['correlation'])
                })
        
        return results
    
    def _calc_corr_without_outliers(self, df, col1, col2, method):
        temp_df = df[[col1, col2]].copy()
        for col in [col1, col2]:
            outliers = self.detect_outliers(temp_df[col])
            if outliers:
                temp_df = temp_df.drop(temp_df.index[outliers])
        
        return self.calculate_correlation(temp_df[col1], temp_df[col2], method)
    
    def get_outlier_details(self, metric_name=None):
        if 'outliers' not in self.corr_results:
            return None
        
        if metric_name:
            return self.corr_results['outliers'].get(metric_name)
        return self.corr_results['outliers']
    
    def get_significant_pairs(self, threshold=0.05, min_corr=0.0):
        if 'pairs' not in self.corr_results:
            return []
        
        return [
            p for p in self.corr_results['pairs'] 
            if p['significant'] and abs(p['correlation']) >= min_corr
        ]
    
    def get_high_risk_pairs(self, diff_threshold=0.2):
        if 'pairs' not in self.corr_results:
            return []
        
        return [
            p for p in self.corr_results['pairs'] 
            if p['correlation_diff'] > diff_threshold
        ]
