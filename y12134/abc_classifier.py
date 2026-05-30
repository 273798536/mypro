import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import ABC_THRESHOLDS, NEW_PRODUCT_DAYS, PROMOTION_SPIKE_THRESHOLD, RETURN_IMPACT_THRESHOLD


class ABCClassifier:
    def __init__(self, sku_data, margin_data, sales_history, promotion_calendar):
        self.sku_data = sku_data
        self.margin_data = margin_data
        self.sales_history = sales_history
        self.promotion_calendar = promotion_calendar
        self.classification_results = None
        self.anomalies = []
        self.dynamic_thresholds = ABC_THRESHOLDS.copy()
        
    def preprocess_sales_data(self):
        sales = self.sales_history.copy()
        sales['date'] = pd.to_datetime(sales['date'])
        
        sales['net_quantity'] = sales['quantity'] - sales['returns']
        sales['revenue'] = 0
        
        for idx, row in self.margin_data.iterrows():
            sku_mask = sales['sku_id'] == row['sku_id']
            promo_mask = sales['is_promotion'] == True
            normal_mask = sales['is_promotion'] == False
            
            sales.loc[sku_mask & promo_mask, 'revenue'] = \
                sales.loc[sku_mask & promo_mask, 'net_quantity'] * row['promotion_price']
            sales.loc[sku_mask & normal_mask, 'revenue'] = \
                sales.loc[sku_mask & normal_mask, 'net_quantity'] * row['base_price']
        
        return sales
    
    def detect_anomalies(self, sales_data):
        anomalies = []
        
        for sku_id in sales_data['sku_id'].unique():
            sku_sales = sales_data[sales_data['sku_id'] == sku_id].copy()
            sku_sales = sku_sales.sort_values('date')
            
            normal_sales = sku_sales[sku_sales['is_promotion'] == False]['net_quantity']
            if len(normal_sales) > 0:
                mean_sales = normal_sales.mean()
                std_sales = normal_sales.std() if normal_sales.std() > 0 else mean_sales * 0.3
                
                for _, row in sku_sales.iterrows():
                    if row['is_promotion']:
                        spike_ratio = row['net_quantity'] / mean_sales if mean_sales > 0 else 0
                        if spike_ratio > PROMOTION_SPIKE_THRESHOLD:
                            anomalies.append({
                                'sku_id': sku_id,
                                'date': row['date'],
                                'type': 'promotion_spike',
                                'description': f'促销销量激增{spike_ratio:.1f}倍',
                                'value': spike_ratio,
                                'threshold': PROMOTION_SPIKE_THRESHOLD
                            })
            
            return_rate = row['returns'] / row['quantity'] if row['quantity'] > 0 else 0
            if return_rate > RETURN_IMPACT_THRESHOLD:
                anomalies.append({
                    'sku_id': sku_id,
                    'date': row['date'],
                    'type': 'high_return',
                    'description': f'退货率高达{return_rate:.1%}',
                    'value': return_rate,
                    'threshold': RETURN_IMPACT_THRESHOLD
                })
        
        return anomalies
    
    def calculate_sku_metrics(self):
        sales_data = self.preprocess_sales_data()
        self.anomalies = self.detect_anomalies(sales_data)
        
        metrics = []
        for sku_id in sales_data['sku_id'].unique():
            sku_sales = sales_data[sales_data['sku_id'] == sku_id]
            
            sku_info = self.sku_data[self.sku_data['sku_id'] == sku_id].iloc[0] \
                if len(self.sku_data[self.sku_data['sku_id'] == sku_id]) > 0 else None
            margin_info = self.margin_data[self.margin_data['sku_id'] == sku_id].iloc[0] \
                if len(self.margin_data[self.margin_data['sku_id'] == sku_id]) > 0 else None
            
            normal_sales = sku_sales[sku_sales['is_promotion'] == False]
            promo_sales = sku_sales[sku_sales['is_promotion'] == True]
            
            total_qty = sku_sales['net_quantity'].sum()
            total_revenue = sku_sales['revenue'].sum()
            avg_daily_sales = sku_sales['net_quantity'].mean()
            
            launch_date = pd.to_datetime(sku_info['launch_date']) if sku_info is not None else None
            days_on_shelf = (datetime.now() - launch_date).days if launch_date else None
            is_new_product = days_on_shelf is not None and days_on_shelf <= NEW_PRODUCT_DAYS
            
            normal_qty = normal_sales['net_quantity'].sum() if len(normal_sales) > 0 else 0
            promo_qty = promo_sales['net_quantity'].sum() if len(promo_sales) > 0 else 0
            promo_ratio = promo_qty / total_qty if total_qty > 0 else 0
            
            total_returns = sku_sales['returns'].sum()
            return_rate = total_returns / (total_qty + total_returns) if (total_qty + total_returns) > 0 else 0
            
            gross_margin_pct = margin_info['gross_margin_pct'] if margin_info is not None else 0
            gross_profit = total_revenue * gross_margin_pct
            
            metrics.append({
                'sku_id': sku_id,
                'sku_name': sku_info['sku_name'] if sku_info is not None else '',
                'category': sku_info['category'] if sku_info is not None else '',
                'total_quantity': total_qty,
                'normal_quantity': normal_qty,
                'promo_quantity': promo_qty,
                'promo_ratio': promo_ratio,
                'total_revenue': total_revenue,
                'gross_profit': gross_profit,
                'gross_margin_pct': gross_margin_pct,
                'avg_daily_sales': avg_daily_sales,
                'total_returns': total_returns,
                'return_rate': return_rate,
                'days_on_shelf': days_on_shelf,
                'is_new_product': is_new_product,
                'launch_date': launch_date
            })
        
        return pd.DataFrame(metrics)
    
    def classify(self, by='gross_profit'):
        metrics = self.calculate_sku_metrics()
        
        if by not in ['gross_profit', 'total_revenue', 'total_quantity']:
            raise ValueError(f"不支持的分类依据: {by}")
        
        metrics = metrics.sort_values(by=by, ascending=False).reset_index(drop=True)
        
        total_value = metrics[by].sum()
        metrics['value_pct'] = metrics[by] / total_value if total_value > 0 else 0
        metrics['cumulative_pct'] = metrics['value_pct'].cumsum()
        
        def assign_class(cumulative_pct):
            if cumulative_pct <= self.dynamic_thresholds['A']['cumulative_pct']:
                return 'A'
            elif cumulative_pct <= self.dynamic_thresholds['B']['cumulative_pct']:
                return 'B'
            else:
                return 'C'
        
        metrics['abc_class'] = metrics['cumulative_pct'].apply(assign_class)
        
        metrics['classification_basis'] = by
        metrics['threshold_A'] = self.dynamic_thresholds['A']['cumulative_pct']
        metrics['threshold_B'] = self.dynamic_thresholds['B']['cumulative_pct']
        
        sku_anomalies = {}
        for anomaly in self.anomalies:
            sku_id = anomaly['sku_id']
            if sku_id not in sku_anomalies:
                sku_anomalies[sku_id] = []
            sku_anomalies[sku_id].append(anomaly['type'])
        
        metrics['anomaly_types'] = metrics['sku_id'].map(
            lambda x: ','.join(set(sku_anomalies.get(x, [])))
        )
        metrics['has_anomaly'] = metrics['sku_id'].isin(sku_anomalies.keys())
        
        self.classification_results = metrics
        return metrics
    
    def adjust_thresholds(self, a_pct=None, b_pct=None):
        if a_pct is not None:
            self.dynamic_thresholds['A']['cumulative_pct'] = a_pct
        if b_pct is not None:
            self.dynamic_thresholds['B']['cumulative_pct'] = b_pct
        
        if self.classification_results is not None:
            return self.classify(by=self.classification_results['classification_basis'].iloc[0])
        return None
    
    def get_sku_trace(self, sku_id):
        if self.classification_results is None:
            return None
        
        sku_result = self.classification_results[self.classification_results['sku_id'] == sku_id]
        if len(sku_result) == 0:
            return None
        
        sku_result = sku_result.iloc[0]
        
        sku_anomalies = [a for a in self.anomalies if a['sku_id'] == sku_id]
        
        return {
            'basic_info': {
                'sku_id': sku_result['sku_id'],
                'sku_name': sku_result['sku_name'],
                'category': sku_result['category'],
                'abc_class': sku_result['abc_class'],
                'classification_basis': sku_result['classification_basis']
            },
            'metrics': {
                'gross_profit': sku_result['gross_profit'],
                'total_revenue': sku_result['total_revenue'],
                'total_quantity': sku_result['total_quantity'],
                'gross_margin_pct': sku_result['gross_margin_pct'],
                'return_rate': sku_result['return_rate']
            },
            'classification_details': {
                'value_percentage': sku_result['value_pct'],
                'cumulative_percentage': sku_result['cumulative_pct'],
                'threshold_A': sku_result['threshold_A'],
                'threshold_B': sku_result['threshold_B']
            },
            'flags': {
                'is_new_product': sku_result['is_new_product'],
                'has_anomaly': sku_result['has_anomaly'],
                'promo_ratio': sku_result['promo_ratio']
            },
            'anomalies': sku_anomalies
        }
