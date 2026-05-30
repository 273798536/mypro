import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import NEW_PRODUCT_DAYS, PROMOTION_SPIKE_THRESHOLD, RETURN_IMPACT_THRESHOLD


class NewProductHandler:
    def __init__(self, sku_data, sales_history):
        self.sku_data = sku_data
        self.sales_history = sales_history
        self.sales_history['date'] = pd.to_datetime(self.sales_history['date'])
        
    def identify_new_products(self):
        new_products = []
        for _, sku in self.sku_data.iterrows():
            launch_date = pd.to_datetime(sku['launch_date'])
            days_on_shelf = (datetime.now() - launch_date).days
            
            if days_on_shelf <= NEW_PRODUCT_DAYS:
                sku_sales = self.sales_history[self.sales_history['sku_id'] == sku['sku_id']]
                
                if len(sku_sales) > 0:
                    daily_avg = sku_sales['net_quantity'].mean() if 'net_quantity' in sku_sales.columns else sku_sales['quantity'].mean()
                    total_sales = sku_sales['quantity'].sum()
                else:
                    daily_avg = 0
                    total_sales = 0
                
                growth_trend = self._calculate_growth_trend(sku['sku_id'])
                
                new_products.append({
                    'sku_id': sku['sku_id'],
                    'sku_name': sku['sku_name'],
                    'launch_date': launch_date,
                    'days_on_shelf': days_on_shelf,
                    'total_sales': total_sales,
                    'daily_avg_sales': daily_avg,
                    'growth_trend': growth_trend,
                    'cold_start_phase': self._determine_phase(days_on_shelf),
                    'recommendation': self._generate_recommendation(days_on_shelf, daily_avg, growth_trend)
                })
        
        return pd.DataFrame(new_products)
    
    def _calculate_growth_trend(self, sku_id):
        sku_sales = self.sales_history[self.sales_history['sku_id'] == sku_id].sort_values('date')
        if len(sku_sales) < 7:
            return 'insufficient_data'
        
        qty_col = 'net_quantity' if 'net_quantity' in sku_sales.columns else 'quantity'
        
        first_half = sku_sales.iloc[:len(sku_sales)//2][qty_col].mean()
        second_half = sku_sales.iloc[len(sku_sales)//2:][qty_col].mean()
        
        if first_half > 0:
            growth_rate = (second_half - first_half) / first_half
        else:
            growth_rate = 1.0 if second_half > 0 else 0
        
        if growth_rate > 0.3:
            return 'fast_growing'
        elif growth_rate > 0:
            return 'stable_growing'
        elif growth_rate > -0.2:
            return 'stable'
        else:
            return 'declining'
    
    def _determine_phase(self, days_on_shelf):
        if days_on_shelf <= 7:
            return '导入期'
        elif days_on_shelf <= 14:
            return '观察期'
        elif days_on_shelf <= 30:
            return '成长期'
        else:
            return '成熟期'
    
    def _generate_recommendation(self, days_on_shelf, daily_avg, growth_trend):
        recommendations = []
        
        if days_on_shelf <= 7:
            recommendations.append('继续观察销量趋势，暂不调整ABC分类')
        elif days_on_shelf <= 14:
            if daily_avg > 10:
                recommendations.append('销量表现良好，建议临时提升至B类关注')
            else:
                recommendations.append('需关注动销情况，考虑调整营销策略')
        else:
            if growth_trend == 'fast_growing':
                recommendations.append('增长势头强劲，建议提前纳入A类管理')
            elif growth_trend == 'declining':
                recommendations.append('增长乏力，建议评估是否继续推广')
        
        if not recommendations:
            recommendations.append('按正常流程进行ABC分类评估')
        
        return '; '.join(recommendations)
    
    def generate_new_product_report(self):
        new_products = self.identify_new_products()
        return {
            'total_new_products': len(new_products),
            'new_products': new_products.to_dict('records') if len(new_products) > 0 else [],
            'summary': self._summarize_new_products(new_products)
        }
    
    def _summarize_new_products(self, new_products):
        if len(new_products) == 0:
            return '当前无新品处于冷启动阶段'
        
        phases = new_products['cold_start_phase'].value_counts().to_dict()
        trends = new_products['growth_trend'].value_counts().to_dict()
        
        return {
            'phase_distribution': phases,
            'trend_distribution': trends,
            'avg_daily_sales': new_products['daily_avg_sales'].mean()
        }


class PromotionAnomalyAnalyzer:
    def __init__(self, sales_history, promotion_calendar):
        self.sales_history = sales_history
        self.promotion_calendar = promotion_calendar
        self.sales_history['date'] = pd.to_datetime(self.sales_history['date'])
    
    def analyze_promotion_impact(self, sku_id=None):
        anomalies = []
        
        sku_list = [sku_id] if sku_id else self.sales_history['sku_id'].unique()
        
        for sku in sku_list:
            sku_sales = self.sales_history[self.sales_history['sku_id'] == sku].copy()
            if len(sku_sales) == 0:
                continue
            
            normal_days = sku_sales[sku_sales['is_promotion'] == False]
            promo_days = sku_sales[sku_sales['is_promotion'] == True]
            
            if len(normal_days) == 0 or len(promo_days) == 0:
                continue
            
            qty_col = 'net_quantity' if 'net_quantity' in sku_sales.columns else 'quantity'
            normal_avg = normal_days[qty_col].mean()
            promo_avg = promo_days[qty_col].mean()
            
            if normal_avg > 0:
                lift_ratio = promo_avg / normal_avg
                if lift_ratio > PROMOTION_SPIKE_THRESHOLD:
                    anomalies.append({
                        'sku_id': sku,
                        'anomaly_type': 'promotion_boost_abnormal',
                        'normal_avg': normal_avg,
                        'promo_avg': promo_avg,
                        'lift_ratio': lift_ratio,
                        'threshold': PROMOTION_SPIKE_THRESHOLD,
                        'explanation': f'促销期间销量提升{lift_ratio:.1f}倍，超过阈值{PROMOTION_SPIKE_THRESHOLD}倍，可能存在异常囤货或数据偏差',
                        'impact': '会导致ABC分类偏高，建议剔除促销异常数据后重算'
                    })
                elif lift_ratio < 1.1:
                    anomalies.append({
                        'sku_id': sku,
                        'anomaly_type': 'promotion_ineffective',
                        'normal_avg': normal_avg,
                        'promo_avg': promo_avg,
                        'lift_ratio': lift_ratio,
                        'threshold': 1.1,
                        'explanation': f'促销效果不明显，销量仅提升{(lift_ratio-1)*100:.1f}%',
                        'impact': '对ABC分类影响较小，但需关注促销策略有效性'
                    })
        
        return pd.DataFrame(anomalies)
    
    def get_promotion_correction_suggestion(self, sku_id):
        analysis = self.analyze_promotion_impact(sku_id)
        if len(analysis) == 0:
            return {
                'sku_id': sku_id,
                'suggestion': '促销数据正常，无需修正',
                'correction_factor': 1.0
            }
        
        anomaly = analysis.iloc[0]
        if anomaly['anomaly_type'] == 'promotion_boost_abnormal':
            return {
                'sku_id': sku_id,
                'suggestion': f'建议将促销期间销量按{anomaly["threshold"]:.1f}倍上限修正',
                'correction_factor': anomaly['threshold'] / anomaly['lift_ratio'],
                'original_lift': anomaly['lift_ratio'],
                'adjusted_lift': anomaly['threshold']
            }
        
        return {
            'sku_id': sku_id,
            'suggestion': anomaly['explanation'],
            'correction_factor': 1.0
        }


class ReturnImpactAnalyzer:
    def __init__(self, sales_history):
        self.sales_history = sales_history
        self.sales_history['date'] = pd.to_datetime(self.sales_history['date'])
    
    def analyze_return_impact(self, sku_id=None):
        impacts = []
        
        sku_list = [sku_id] if sku_id else self.sales_history['sku_id'].unique()
        
        for sku in sku_list:
            sku_sales = self.sales_history[self.sales_history['sku_id'] == sku]
            if len(sku_sales) == 0:
                continue
            
            total_qty = sku_sales['quantity'].sum()
            total_returns = sku_sales['returns'].sum()
            return_rate = total_returns / total_qty if total_qty > 0 else 0
            
            high_return_days = sku_sales[sku_sales['returns'] / sku_sales['quantity'].replace(0, 1) > RETURN_IMPACT_THRESHOLD]
            
            impact_data = {
                'sku_id': sku,
                'total_sales': total_qty,
                'total_returns': total_returns,
                'overall_return_rate': return_rate,
                'high_return_days_count': len(high_return_days),
                'has_severe_impact': return_rate > RETURN_IMPACT_THRESHOLD
            }
            
            if return_rate > RETURN_IMPACT_THRESHOLD:
                impact_data['severity'] = 'high'
                impact_data['explanation'] = f'整体退货率{return_rate:.1%}，超过阈值{RETURN_IMPACT_THRESHOLD:.1%}，严重影响净销量'
                impact_data['recommendation'] = '建议使用净销量进行ABC分类，并深入分析退货原因'
            elif return_rate > RETURN_IMPACT_THRESHOLD * 0.5:
                impact_data['severity'] = 'medium'
                impact_data['explanation'] = f'整体退货率{return_rate:.1%}，需关注'
                impact_data['recommendation'] = '建议使用净销量进行ABC分类'
            else:
                impact_data['severity'] = 'low'
                impact_data['explanation'] = f'整体退货率{return_rate:.1%}，处于正常范围'
                impact_data['recommendation'] = '可按毛销量或净销量分类'
            
            if len(high_return_days) > 0:
                impact_data['high_return_dates'] = high_return_days['date'].dt.strftime('%Y-%m-%d').tolist()
            
            impacts.append(impact_data)
        
        return pd.DataFrame(impacts)
    
    def get_net_sales_adjustment(self, sku_id):
        sku_sales = self.sales_history[self.sales_history['sku_id'] == sku_id].copy()
        if len(sku_sales) == 0:
            return None
        
        sku_sales['net_quantity'] = sku_sales['quantity'] - sku_sales['returns']
        
        total_gross = sku_sales['quantity'].sum()
        total_net = sku_sales['net_quantity'].sum()
        adjustment_ratio = total_net / total_gross if total_gross > 0 else 1.0
        
        return {
            'sku_id': sku_id,
            'gross_sales': total_gross,
            'net_sales': total_net,
            'adjustment_ratio': adjustment_ratio,
            'adjustment_explanation': f'净销量为毛销量的{adjustment_ratio:.1%}'
        }
