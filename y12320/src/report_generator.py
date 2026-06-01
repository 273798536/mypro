import pandas as pd
import numpy as np
from datetime import datetime
import json
import os
from typing import Dict, List, Optional
import io

from .data_manager import DataManager, DataVersion
from .data_cleaner import CleanResult
from .curve_fitting import NonlinearPricingFitter
from .sensitivity_analysis import PriceSensitivityAnalyzer, SensitivityResult
from .group_analysis import GroupComparisonResult
from .visualization import PricingVisualizer


class ReportGenerator:
    def __init__(self, output_dir: str = 'reports'):
        self.output_dir = output_dir
        self.visualizer = PricingVisualizer()
        os.makedirs(output_dir, exist_ok=True)

    def generate_full_report(self,
                             data_manager: DataManager,
                             clean_result: CleanResult,
                             fitter: NonlinearPricingFitter,
                             sensitivity_analyzer: PriceSensitivityAnalyzer,
                             group_result: Optional[GroupComparisonResult] = None,
                             report_name: Optional[str] = None) -> Dict:
        if report_name is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_name = f"pricing_analysis_report_{timestamp}"

        report_data = {
            'report_info': {
                'name': report_name,
                'generated_at': datetime.now().isoformat(),
                'data_version': data_manager.current_version.version_id if data_manager.current_version else 'unknown',
                'data_source': data_manager.current_version.source if data_manager.current_version else 'unknown'
            },
            'data_summary': self._generate_data_summary(data_manager, clean_result),
            'curve_fitting': self._generate_curve_fitting_summary(fitter),
            'sensitivity_analysis': self._generate_sensitivity_summary(sensitivity_analyzer),
            'group_analysis': self._generate_group_summary(group_result) if group_result else None
        }

        return report_data

    def _generate_data_summary(self, data_manager: DataManager, 
                                clean_result: CleanResult) -> Dict:
        summary = data_manager.get_data_summary(clean_result.cleaned_data)
        
        anomalies = []
        for anomaly in clean_result.anomalies:
            anomalies.append({
                'type': anomaly.anomaly_type,
                'count': anomaly.count,
                'description': anomaly.description,
                'impact': anomaly.impact
            })

        return {
            'basic_stats': summary,
            'original_rows': clean_result.original_row_count,
            'cleaned_rows': clean_result.cleaned_row_count,
            'removed_rows': clean_result.original_row_count - clean_result.cleaned_row_count,
            'anomalies': anomalies
        }

    def _generate_curve_fitting_summary(self, fitter: NonlinearPricingFitter) -> Dict:
        fit_summary = []
        for curve_type, result in fitter.fit_results.items():
            fit_summary.append({
                'curve_type': curve_type.value,
                'parameters': result.parameters,
                'r_squared': result.r_squared,
                'rmse': result.rmse,
                'aic': result.aic,
                'is_best': curve_type == fitter.best_fit
            })

        price_points = []
        if fitter.price_points:
            for pp in fitter.price_points:
                price_points.append({
                    'price': pp.price,
                    'conversion_rate': pp.conversion_rate,
                    'sample_size': pp.sample_size,
                    'std_error': pp.std_error,
                    'ci_lower': pp.ci_lower,
                    'ci_upper': pp.ci_upper
                })

        optimal_range = {}
        if fitter.best_fit:
            optimal_range = fitter.get_optimal_price_range()

        return {
            'best_fit_curve': fitter.best_fit.value if fitter.best_fit else None,
            'fit_results': fit_summary,
            'price_points': price_points,
            'optimal_price_range': optimal_range
        }

    def _generate_sensitivity_summary(self, analyzer: PriceSensitivityAnalyzer) -> Dict:
        if analyzer.sensitivity_result is None:
            return {}

        sr = analyzer.sensitivity_result
        
        points_summary = []
        for sp in sr.sensitivity_points[::max(1, len(sr.sensitivity_points) // 50)]:
            points_summary.append({
                'price': round(sp.price, 2),
                'elasticity': round(sp.elasticity, 4),
                'marginal_change': round(sp.marginal_change, 4),
                'sensitivity_level': sp.sensitivity_level
            })

        return {
            'most_sensitive_price': round(sr.most_sensitive_price, 2),
            'least_sensitive_price': round(sr.least_sensitive_price, 2),
            'sensitivity_thresholds': {
                k: (round(v[0], 2), round(v[1], 2)) 
                for k, v in sr.sensitivity_thresholds.items()
            },
            'elasticity_range': (round(sr.elasticity_range[0], 4), 
                                 round(sr.elasticity_range[1], 4)),
            'key_insights': analyzer.get_key_insights(),
            'sensitivity_points': points_summary
        }

    def _generate_group_summary(self, group_result: GroupComparisonResult) -> Dict:
        groups_summary = []
        for group_name, result in group_result.group_results.items():
            group_info = {
                'group_name': group_name,
                'sample_size': result.stats.size,
                'avg_price': round(result.stats.avg_price, 2),
                'conversion_rate': round(result.stats.conversion_rate, 4),
                'avg_customer_size': round(result.stats.avg_customer_size, 1)
            }
            
            if result.fitter.best_fit:
                fit = result.fitter.fit_results[result.fitter.best_fit]
                group_info.update({
                    'best_fit_curve': fit.curve_type.value,
                    'r_squared': round(fit.r_squared, 4),
                    'parameters': {k: round(v, 4) for k, v in fit.parameters.items()}
                })
            
            groups_summary.append(group_info)

        return {
            'groups': groups_summary,
            'statistical_tests': group_result.statistical_tests.to_dict('records') 
                if not group_result.statistical_tests.empty else [],
            'key_differences': group_result.key_differences
        }

    def export_to_excel(self, report_data: Dict, filename: str) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.xlsx")
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            info_df = pd.DataFrame([
                {'项目': '报告名称', '值': report_data['report_info']['name']},
                {'项目': '生成时间', '值': report_data['report_info']['generated_at']},
                {'项目': '数据版本', '值': report_data['report_info']['data_version']},
                {'项目': '数据来源', '值': report_data['report_info']['data_source']}
            ])
            info_df.to_excel(writer, sheet_name='报告信息', index=False)

            ds = report_data['data_summary']
            data_stats_df = pd.DataFrame([
                {'项目': '原始记录数', '值': ds['original_rows']},
                {'项目': '清洗后记录数', '值': ds['cleaned_rows']},
                {'项目': '移除记录数', '值': ds['removed_rows']},
                {'项目': '价格范围', '值': f"{ds['basic_stats'].get('price_range', ('-', '-'))[0]} - {ds['basic_stats'].get('price_range', ('-', '-'))[1]}"},
                {'项目': '平均转化率', '值': f"{ds['basic_stats'].get('conversion_rate', 0):.2%}"}
            ])
            data_stats_df.to_excel(writer, sheet_name='数据概览', index=False)

            if ds['anomalies']:
                anomalies_df = pd.DataFrame(ds['anomalies'])
                anomalies_df.to_excel(writer, sheet_name='异常检测', index=False)

            cf = report_data['curve_fitting']
            if cf['fit_results']:
                fit_df = pd.DataFrame(cf['fit_results'])
                fit_df.to_excel(writer, sheet_name='曲线拟合结果', index=False)

            if cf['price_points']:
                pp_df = pd.DataFrame(cf['price_points'])
                pp_df.to_excel(writer, sheet_name='价格点明细', index=False)

            sa = report_data['sensitivity_analysis']
            if sa.get('sensitivity_points'):
                sa_df = pd.DataFrame(sa['sensitivity_points'])
                sa_df.to_excel(writer, sheet_name='敏感度分析', index=False)

            insights_df = pd.DataFrame([
                {'指标': k, '值': str(v)} for k, v in sa.get('key_insights', {}).items()
            ])
            insights_df.to_excel(writer, sheet_name='关键洞察', index=False)

            if report_data.get('group_analysis'):
                ga = report_data['group_analysis']
                groups_df = pd.DataFrame(ga['groups'])
                groups_df.to_excel(writer, sheet_name='分组分析', index=False)

                if ga['statistical_tests']:
                    tests_df = pd.DataFrame(ga['statistical_tests'])
                    tests_df.to_excel(writer, sheet_name='显著性检验', index=False)

        return filepath

    def export_to_json(self, report_data: Dict, filename: str) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.json")
        
        def convert_to_serializable(obj):
            if isinstance(obj, (np.integer, np.int64)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float64)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            return obj

        serializable_data = json.loads(
            json.dumps(report_data, default=convert_to_serializable)
        )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(serializable_data, f, indent=2, ensure_ascii=False)
        
        return filepath

    def get_downloadable_excel(self, report_data: Dict) -> io.BytesIO:
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            info_df = pd.DataFrame([
                {'项目': '报告名称', '值': report_data['report_info']['name']},
                {'项目': '生成时间', '值': report_data['report_info']['generated_at']},
                {'项目': '数据版本', '值': report_data['report_info']['data_version']},
                {'项目': '数据来源', '值': report_data['report_info']['data_source']}
            ])
            info_df.to_excel(writer, sheet_name='报告信息', index=False)

            ds = report_data['data_summary']
            data_stats_df = pd.DataFrame([
                {'项目': '原始记录数', '值': ds['original_rows']},
                {'项目': '清洗后记录数', '值': ds['cleaned_rows']},
                {'项目': '移除记录数', '值': ds['removed_rows']},
                {'项目': '价格范围', '值': f"{ds['basic_stats'].get('price_range', ('-', '-'))[0]} - {ds['basic_stats'].get('price_range', ('-', '-'))[1]}"},
                {'项目': '平均转化率', '值': f"{ds['basic_stats'].get('conversion_rate', 0):.2%}"}
            ])
            data_stats_df.to_excel(writer, sheet_name='数据概览', index=False)

            if ds['anomalies']:
                anomalies_df = pd.DataFrame(ds['anomalies'])
                anomalies_df.to_excel(writer, sheet_name='异常检测', index=False)

            cf = report_data['curve_fitting']
            if cf['fit_results']:
                fit_df = pd.DataFrame(cf['fit_results'])
                fit_df.to_excel(writer, sheet_name='曲线拟合结果', index=False)

            if cf['price_points']:
                pp_df = pd.DataFrame(cf['price_points'])
                pp_df.to_excel(writer, sheet_name='价格点明细', index=False)

            sa = report_data['sensitivity_analysis']
            if sa.get('sensitivity_points'):
                sa_df = pd.DataFrame(sa['sensitivity_points'])
                sa_df.to_excel(writer, sheet_name='敏感度分析', index=False)

            insights_df = pd.DataFrame([
                {'指标': k, '值': str(v)} for k, v in sa.get('key_insights', {}).items()
            ])
            insights_df.to_excel(writer, sheet_name='关键洞察', index=False)

            if report_data.get('group_analysis'):
                ga = report_data['group_analysis']
                groups_df = pd.DataFrame(ga['groups'])
                groups_df.to_excel(writer, sheet_name='分组分析', index=False)

                if ga['statistical_tests']:
                    tests_df = pd.DataFrame(ga['statistical_tests'])
                    tests_df.to_excel(writer, sheet_name='显著性检验', index=False)

        output.seek(0)
        return output
