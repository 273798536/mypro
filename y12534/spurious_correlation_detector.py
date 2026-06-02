import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import pearsonr


class SpuriousCorrelationDetector:
    def __init__(self, correlation_analyzer):
        self.ca = correlation_analyzer
        self.dm = correlation_analyzer.dm
        self.detection_results = {}
        self.audit_trail = {}
    
    def detect_spurious_correlations(self, corr_diff_threshold=0.2, leverage_threshold=0.1, 
                                      cooks_d_threshold=0.5, influence_ratio_threshold=0.3):
        df = self.dm.get_combined_data()
        if df is None:
            return None
        
        metric_cols = self.dm.get_metric_columns()
        id_col = self.dm.metadata['id_column']
        
        results = []
        audit_records = {}
        
        for i, col1 in enumerate(metric_cols):
            for j, col2 in enumerate(metric_cols):
                if i >= j:
                    continue
                
                pair_key = f"{col1}_vs_{col2}"
                
                detection = self._detect_single_pair(df, col1, col2, id_col,
                                                    corr_diff_threshold, leverage_threshold,
                                                    cooks_d_threshold, influence_ratio_threshold)
                
                audit_records[pair_key] = detection['audit']
                
                if detection['is_spurious']:
                    results.append({
                        'metric1': col1,
                        'metric2': col2,
                        'spurious_type': detection['spurious_type'],
                        'risk_level': detection['risk_level'],
                        'original_corr': detection['original_corr'],
                        'clean_corr': detection['clean_corr'],
                        'corr_drop': detection['corr_drop'],
                        'key_outliers': detection['key_outliers'],
                        'outlier_count': len(detection['key_outliers']),
                        'evidence': detection['evidence']
                    })
        
        self.detection_results = {
            'spurious_pairs': results,
            'total_pairs_analyzed': len(metric_cols) * (len(metric_cols) - 1) // 2,
            'spurious_count': len(results),
            'thresholds': {
                'corr_diff_threshold': corr_diff_threshold,
                'leverage_threshold': leverage_threshold,
                'cooks_d_threshold': cooks_d_threshold,
                'influence_ratio_threshold': influence_ratio_threshold
            }
        }
        
        self.audit_trail = audit_records
        
        return self.detection_results
    
    def _detect_single_pair(self, df, col1, col2, id_col, corr_diff_threshold, 
                           leverage_threshold, cooks_d_threshold, influence_ratio_threshold):
        temp_df = df[[id_col, col1, col2]].copy()
        temp_df[col1] = pd.to_numeric(temp_df[col1], errors='coerce')
        temp_df[col2] = pd.to_numeric(temp_df[col2], errors='coerce')
        temp_df = temp_df.dropna()
        
        if len(temp_df) < 4:
            return {
                'is_spurious': False,
                'spurious_type': 'insufficient_data',
                'risk_level': 'unknown',
                'original_corr': np.nan,
                'clean_corr': np.nan,
                'corr_drop': 0,
                'key_outliers': [],
                'evidence': {},
                'audit': {}
            }
        
        orig_corr, orig_p = pearsonr(temp_df[col1], temp_df[col2])
        
        leverage = self._calculate_leverage(temp_df[col1], temp_df[col2])
        cooks_d = self._calculate_cooks_d(temp_df[col1], temp_df[col2])
        dffits = self._calculate_dffits(temp_df[col1], temp_df[col2])
        
        temp_df['leverage'] = leverage
        temp_df['cooks_d'] = cooks_d
        temp_df['dffits'] = dffits
        
        high_leverage_idx = temp_df['leverage'] > leverage_threshold
        high_cooks_idx = temp_df['cooks_d'] > cooks_d_threshold
        
        influential_mask = high_leverage_idx | high_cooks_idx
        influential_points = temp_df[influential_mask].copy()
        
        audit = {
            'original_correlation': float(orig_corr),
            'original_p_value': float(orig_p),
            'n_samples': len(temp_df),
            'leverage_values': temp_df['leverage'].tolist(),
            'cooks_d_values': temp_df['cooks_d'].tolist(),
            'influential_sample_ids': influential_points[id_col].tolist(),
            'influential_data': influential_points.to_dict('records')
        }
        
        if len(influential_points) == 0:
            return {
                'is_spurious': False,
                'spurious_type': 'none',
                'risk_level': 'low',
                'original_corr': orig_corr,
                'clean_corr': orig_corr,
                'corr_drop': 0,
                'key_outliers': [],
                'evidence': {
                    'no_influential_points': True
                },
                'audit': audit
            }
        
        clean_df = temp_df[~influential_mask]
        if len(clean_df) >= 3:
            clean_corr, clean_p = pearsonr(clean_df[col1], clean_df[col2])
        else:
            clean_corr = 0
            clean_p = 1.0
        
        corr_drop = abs(orig_corr) - abs(clean_corr)
        influence_ratio = len(influential_points) / len(temp_df)
        
        audit['clean_correlation'] = float(clean_corr)
        audit['clean_p_value'] = float(clean_p)
        audit['correlation_drop'] = float(corr_drop)
        audit['influence_ratio'] = influence_ratio
        
        evidence = {
            'correlation_drop': corr_drop,
            'influence_ratio': influence_ratio,
            'max_leverage': temp_df['leverage'].max(),
            'max_cooks_d': temp_df['cooks_d'].max(),
            'significance_changed': (orig_p < 0.05) != (clean_p < 0.05)
        }
        
        is_spurious = False
        spurious_type = 'none'
        risk_level = 'low'
        
        if corr_drop > corr_diff_threshold:
            is_spurious = True
            if influence_ratio < influence_ratio_threshold:
                spurious_type = '少数异常点拉高'
                risk_level = 'high'
            else:
                spurious_type = '多异常点影响'
                risk_level = 'medium'
        elif evidence['significance_changed']:
            is_spurious = True
            spurious_type = '显著性由异常点驱动'
            risk_level = 'medium'
        elif (high_leverage_idx & high_cooks_idx).any():
            risk_level = 'medium'
        
        key_outliers = influential_points.nlargest(5, 'cooks_d')[id_col].tolist()
        
        return {
            'is_spurious': is_spurious,
            'spurious_type': spurious_type,
            'risk_level': risk_level,
            'original_corr': orig_corr,
            'clean_corr': clean_corr,
            'corr_drop': corr_drop,
            'key_outliers': key_outliers,
            'evidence': evidence,
            'audit': audit
        }
    
    def _calculate_leverage(self, x, y):
        x = np.array(x)
        n = len(x)
        X = np.column_stack([np.ones(n), x])
        hat_matrix = X @ np.linalg.inv(X.T @ X) @ X.T
        return np.diag(hat_matrix)
    
    def _calculate_cooks_d(self, x, y):
        x = np.array(x)
        y = np.array(y)
        n = len(x)
        
        X = np.column_stack([np.ones(n), x])
        beta = np.linalg.inv(X.T @ X) @ X.T @ y
        y_hat = X @ beta
        residuals = y - y_hat
        
        p = 2
        mse = np.sum(residuals ** 2) / (n - p)
        
        leverage = self._calculate_leverage(x, y)
        cooks_d = (residuals ** 2 * leverage) / (p * mse * (1 - leverage) ** 2)
        
        return cooks_d
    
    def _calculate_dffits(self, x, y):
        x = np.array(x)
        y = np.array(y)
        n = len(x)
        
        X = np.column_stack([np.ones(n), x])
        beta = np.linalg.inv(X.T @ X) @ X.T @ y
        y_hat = X @ beta
        residuals = y - y_hat
        
        p = 2
        leverage = self._calculate_leverage(x, y)
        
        dffits_values = []
        for i in range(n):
            X_i = np.delete(X, i, axis=0)
            y_i = np.delete(y, i)
            beta_i = np.linalg.inv(X_i.T @ X_i) @ X_i.T @ y_i
            h_ii = leverage[i]
            
            mse_i = np.sum((y_i - X_i @ beta_i) ** 2) / (n - p - 1)
            resid_i = residuals[i] * np.sqrt((n - p - 1) / (n - p - residuals[i]**2 / mse_i + 1e-10))
            
            dffits = resid_i * np.sqrt(h_ii / (1 - h_ii))
            dffits_values.append(abs(dffits))
        
        return dffits_values
    
    def get_audit_trail(self, metric1, metric2):
        pair_key = f"{metric1}_vs_{metric2}"
        reverse_key = f"{metric2}_vs_{metric1}"
        return self.audit_trail.get(pair_key) or self.audit_trail.get(reverse_key)
    
    def get_raw_data_for_pair(self, metric1, metric2, include_outliers=True):
        df = self.dm.get_combined_data()
        if df is None:
            return None
        
        id_col = self.dm.metadata['id_column']
        cols = [id_col, metric1, metric2]
        
        for group_col in self.dm.get_group_columns():
            cols.append(group_col)
        
        result = df[cols].copy()
        result[metric1] = pd.to_numeric(result[metric1], errors='coerce')
        result[metric2] = pd.to_numeric(result[metric2], errors='coerce')
        
        pair_key = f"{metric1}_vs_{metric2}"
        if pair_key in self.audit_trail:
            audit = self.audit_trail[pair_key]
            influential_ids = audit.get('influential_sample_ids', [])
            result['is_influential'] = result[id_col].isin(influential_ids)
        
        return result
    
    def get_summary(self):
        if not self.detection_results:
            return None
        
        results = self.detection_results
        spurious = results['spurious_pairs']
        
        high_risk = [p for p in spurious if p['risk_level'] == 'high']
        medium_risk = [p for p in spurious if p['risk_level'] == 'medium']
        
        return {
            'total_pairs': results['total_pairs_analyzed'],
            'spurious_count': results['spurious_count'],
            'high_risk_count': len(high_risk),
            'medium_risk_count': len(medium_risk),
            'spurious_rate': results['spurious_count'] / results['total_pairs_analyzed'] if results['total_pairs_analyzed'] > 0 else 0,
            'high_risk_pairs': high_risk,
            'medium_risk_pairs': medium_risk
        }
