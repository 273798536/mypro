"""
报告导出模块
============

用于月底复盘的异常样本和分析报告
确保与日常操作的转移矩阵和补货建议数据口径一致
"""

from typing import List, Dict, Optional, Tuple
from datetime import date, datetime
import json
import csv
import os
from collections import defaultdict

from models import (
    StateKey, SalesState, DailyRecord, PredictionResult,
    RestockSuggestion, ComparisonResult
)


class ReportExporter:
    def __init__(self, output_dir: str = "./reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_daily_operation_report(self,
                                         prediction: PredictionResult,
                                         restock: RestockSuggestion,
                                         records: List[DailyRecord],
                                         format: str = "text") -> str:
        """导出日常操作用报告（转移矩阵 + 补货建议）"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"daily_{prediction.product_id}_{timestamp}"
        
        if format == "text":
            content = self._format_daily_text(prediction, restock, records)
            filepath = os.path.join(self.output_dir, f"{filename}.txt")
        elif format == "json":
            content = self._format_daily_json(prediction, restock, records)
            filepath = os.path.join(self.output_dir, f"{filename}.json")
        elif format == "csv":
            content = self._format_daily_csv(prediction, restock, records)
            filepath = os.path.join(self.output_dir, f"{filename}.csv")
        else:
            raise ValueError(f"不支持的格式: {format}")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def export_monthly_review_report(self,
                                    records: List[DailyRecord],
                                    predictions: List[PredictionResult],
                                    comparisons: List[ComparisonResult],
                                    format: str = "text") -> str:
        """导出月底复盘用报告（异常样本 + 趋势分析）"""
        timestamp = datetime.now().strftime("%Y%m_%d")
        month_str = datetime.now().strftime("%Y%m")
        filename = f"monthly_review_{month_str}"
        
        if format == "text":
            content = self._format_monthly_text(records, predictions, comparisons)
            filepath = os.path.join(self.output_dir, f"{filename}.txt")
        elif format == "json":
            content = self._format_monthly_json(records, predictions, comparisons)
            filepath = os.path.join(self.output_dir, f"{filename}.json")
        else:
            raise ValueError(f"不支持的格式: {format}")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def export_anomaly_report(self,
                               anomalies: List[DailyRecord],
                               period_start: date,
                               period_end: date,
                               format: str = "text") -> str:
        """导出异常样本专项报告"""
        timestamp = datetime.now().strftime("%Y%m%d")
        filename = f"anomalies_{period_start.strftime('%Y%m%d')}_{period_end.strftime('%Y%m%d')}"
        
        if format == "text":
            content = self._format_anomaly_text(anomalies, period_start, period_end)
            filepath = os.path.join(self.output_dir, f"{filename}.txt")
        elif format == "csv":
            content = self._format_anomaly_csv(anomalies, period_start, period_end)
            filepath = os.path.join(self.output_dir, f"{filename}.csv")
        else:
            raise ValueError(f"不支持的格式: {format}")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def export_comparison_report(self,
                                comparison: ComparisonResult,
                                format: str = "text") -> str:
        """导出两次运行对比报告"""
        from comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comparison_{comparison.product_id}_{timestamp}"
        
        if format == "text":
            content = engine.print_comparison_report(comparison)
            filepath = os.path.join(self.output_dir, f"{filename}.txt")
        elif format == "json":
            content = self._format_comparison_json(comparison)
            filepath = os.path.join(self.output_dir, f"{filename}.json")
        else:
            raise ValueError(f"不支持的格式: {format}")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def _format_daily_text(self,
                             prediction: PredictionResult,
                             restock: RestockSuggestion,
                             records: List[DailyRecord]) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("马尔可夫库存预测 - 日常操作报告")
        lines.append("=" * 70)
        lines.append(f"产品：{prediction.product_name} ({prediction.product_id})")
        lines.append(f"生成时间：{prediction.run_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("📊 当前状态")
        lines.append("-" * 50)
        cs = prediction.current_state
        lines.append(f"  销量状态：{cs.sales_state.value}")
        lines.append(f"  天气标签：{cs.weather.value}")
        lines.append(f"  节假日标签：{cs.holiday.value}")
        lines.append(f"  日均销量：{prediction.data_quality.get('avg_sales', 0):.2f}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("🔄 关键转移概率（Top 10）")
        lines.append("-" * 50)
        transitions = [
            (k, v) for k, v in prediction.transition_matrix.items() if v > 0.05
        ]
        transitions.sort(key=lambda x: -x[1])
        for i, (trans, prob) in enumerate(transitions[:10], 1):
            lines.append(f"  {i:2d}. {trans}: {prob:.4f}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("📈 未来7天预测")
        lines.append("-" * 50)
        lines.append(f"  总预测需求：{prediction.total_forecast:.1f}")
        lines.append("")
        lines.append(f"  {'天数':<6} {'预计销量':<12} {'最可能状态':<16} {'概率':<8}")
        lines.append(f"  {'-'*46}")
        for df in prediction.daily_forecast:
            ts = df["top_state"]
            state_str = f"{ts.sales_state.value}/{ts.weather.value}/{ts.holiday.value}"
            lines.append(f"  {df['day']:<6} {df['expected_sales']:<12.1f} {state_str:<16} {df['top_probability']:<8.2%}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("📦 补货建议")
        lines.append("-" * 50)
        lines.append(f"  当前库存：{restock.current_inventory:.1f}")
        lines.append(f"  预测需求：{restock.forecast_demand:.1f}")
        lines.append(f"  安全库存：{restock.safety_stock:.1f}")
        lines.append(f"  目标库存：{restock.max_stock:.1f}")
        lines.append(f"  建议补货：{restock.suggested_restock:.1f}")
        lines.append(f"  置信度：{restock.confidence:.0%}")
        lines.append("")
        lines.append("  推理过程：")
        for line in restock.reasoning.split('\n'):
            lines.append(f"    {line}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("🔍 数据质量评估")
        lines.append("-" * 50)
        dq = prediction.data_quality
        lines.append(f"  历史记录数：{dq['total_records']}")
        lines.append(f"  唯一状态数：{dq['unique_states']}")
        lines.append(f"  唯一转移数：{dq['unique_transitions']}")
        lines.append(f"  稀疏状态占比：{dq['sparse_states_ratio']:.1%}")
        lines.append(f"  状态覆盖率：{dq['state_coverage']:.2%}")
        lines.append(f"  置信度评分：{dq['confidence_score']:.0%}")
        lines.append("")
        
        if prediction.cold_start_applied:
            lines.append("  ⚠️  冷启动模式：已启用先验知识加权")
        if prediction.sparse_data_warning:
            lines.append("  ⚠️  样本稀疏：已启用拉普拉斯平滑")
        if prediction.state_jump_detected:
            lines.append("  ⚠️  状态跳变：已启用相邻状态插值")
        
        lines.append("")
        
        if prediction.anomalies:
            lines.append("-" * 50)
            lines.append(f"⚠️  异常记录（{len(prediction.anomalies)}条）")
            lines.append("-" * 50)
            for a in prediction.anomalies[:5]:
                lines.append(f"  {a.date}: {a.anomaly_reason}")
                lines.append(f"    销量={a.sales_quantity}, 库存={a.ending_inventory}")
        
        lines.append("")
        lines.append("=" * 70)
        lines.append("报告结束")
        lines.append("=" * 70)
        
        return "\n".join(lines)

    def _format_daily_json(self,
                             prediction: PredictionResult,
                             restock: RestockSuggestion,
                             records: List[DailyRecord]) -> str:
        data = {
            "report_type": "daily_operation",
            "generated_at": prediction.run_timestamp.isoformat(),
            "product": {
                "id": prediction.product_id,
                "name": prediction.product_name
            },
            "current_state": {
                "sales": prediction.current_state.sales_state.value,
                "weather": prediction.current_state.weather.value,
                "holiday": prediction.current_state.holiday.value
            },
            "transition_matrix": prediction.transition_matrix,
            "forecast": {
                "days": prediction.forecast_days,
                "total_demand": prediction.total_forecast,
                "daily": [
                    {
                        "day": df["day"],
                        "expected_sales": df["expected_sales"],
                        "top_state": {
                            "sales": df["top_state"].sales_state.value,
                            "weather": df["top_state"].weather.value,
                            "holiday": df["top_state"].holiday.value
                        },
                        "top_probability": df["top_probability"]
                    } for df in prediction.daily_forecast
                ]
            },
            "restock_suggestion": {
                "current_inventory": restock.current_inventory,
                "forecast_demand": restock.forecast_demand,
                "suggested_restock": restock.suggested_restock,
                "safety_stock": restock.safety_stock,
                "max_stock": restock.max_stock,
                "confidence": restock.confidence,
                "reasoning": restock.reasoning
            },
            "data_quality": prediction.data_quality,
            "flags": {
                "cold_start": prediction.cold_start_applied,
                "sparse_data": prediction.sparse_data_warning,
                "state_jump": prediction.state_jump_detected
            },
            "anomalies": [
                {
                    "date": a.date.isoformat(),
                    "reason": a.anomaly_reason,
                    "sales": a.sales_quantity,
                    "inventory": a.ending_inventory
                } for a in prediction.anomalies
            ]
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def _format_daily_csv(self,
                       prediction: PredictionResult,
                       restock: RestockSuggestion,
                       records: List[DailyRecord]) -> str:
        output = []
        output.append("type,product_id,product_name,day,expected_sales,top_sales_state,top_weather,top_holiday,probability")
        
        for df in prediction.daily_forecast:
            ts = df["top_state"]
            output.append(f"forecast,{prediction.product_id},{prediction.product_name},"
                       f"{df['day']},{df['expected_sales']:.2f},"
                       f"{ts.sales_state.value},{ts.weather.value},{ts.holiday.value},"
                       f"{df['top_probability']:.4f}")
        
        output.append("")
        output.append("restock_suggestion")
        output.append(f"product_id,current_inventory,forecast_demand,suggested_restock,safety_stock,max_stock,confidence")
        output.append(f"{restock.product_id},{restock.current_inventory},"
                   f"{restock.forecast_demand:.2f},{restock.suggested_restock:.2f},"
                   f"{restock.safety_stock:.2f},{restock.max_stock:.2f},{restock.confidence:.4f}")
        
        return "\n".join(output)

    def _format_monthly_text(self,
                            records: List[DailyRecord],
                            predictions: List[PredictionResult],
                            comparisons: List[ComparisonResult]) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("马尔可夫库存预测 - 月底复盘报告")
        lines.append("=" * 70)
        lines.append(f"报告周期：{records[0].date.strftime('%Y-%m-%d')} 至 {records[-1].date.strftime('%Y-%m-%d')}")
        lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        monthly_stats = self._calculate_monthly_stats(records)
        lines.append("-" * 50)
        lines.append("📊 月度数据概览")
        lines.append("-" * 50)
        lines.append(f"  总天数：{monthly_stats['total_days']}")
        lines.append(f"  总销量：{monthly_stats['total_sales']:.1f}")
        lines.append(f"  日均销量：{monthly_stats['avg_daily_sales']:.2f}")
        lines.append(f"  销量波动（最小/最大：{monthly_stats['min_sales']:.1f} / {monthly_stats['max_sales']:.1f}")
        lines.append(f"  异常记录数：{monthly_stats['anomaly_count']}")
        lines.append(f"  异常率：{monthly_stats['anomaly_rate']:.1%}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("🏷️  状态分布统计")
        lines.append("-" * 50)
        state_dist = self._calculate_state_distribution(records)
        for state_type, dist in state_dist.items():
            lines.append(f"  {state_type}：")
            for state, count in sorted(dist.items(), key=lambda x: -x[1]):
                pct = count / len(records) * 100
                lines.append(f"    {state}: {count}天 ({pct:.1f}%)")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append(f"⚠️  异常明细")
        lines.append("-" * 50)
        anomaly_by_type = self._group_anomalies_by_type(records)
        for reason, anomalies in anomaly_by_type.items():
            lines.append(f"  {reason}：{len(anomalies)}次")
            for a in anomalies[:3]:
                lines.append(f"    - {a.date}: 销量{a.sales_quantity}, 库存{a.ending_inventory}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("📈 预测准确率分析")
        lines.append("-" * 50)
        accuracy_stats = self._calculate_forecast_accuracy(records, predictions)
        lines.append(f"  预测总偏差：{accuracy_stats['total_deviation']:.1f}")
        lines.append(f"  平均绝对误差(MAE)：{accuracy_stats['mae']:.2f}")
        lines.append(f"  平均绝对百分比误差(MAPE)：{accuracy_stats['mape']:.1%}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("💡 改进建议")
        lines.append("-" * 50)
        suggestions = self._generate_improvement_suggestions(records, predictions, comparisons)
        for i, s in enumerate(suggestions, 1):
            lines.append(f"  {i}. {s}")
        lines.append("")
        
        lines.append("-" * 50)
        lines.append("📋 数据口径一致性校验")
        lines.append("-" * 50)
        consistency = self._check_consistency(records, predictions)
        lines.append(f"  日常操作与月底复盘数据一致性：{consistency['is_consistent']}")
        if not consistency['is_consistent']:
            for issue in consistency['issues']:
                lines.append(f"  ⚠️  {issue}")
        lines.append("")
        
        lines.append("=" * 70)
        lines.append("报告结束")
        lines.append("=" * 70)
        
        return "\n".join(lines)

    def _format_monthly_json(self,
                           records: List[DailyRecord],
                           predictions: List[PredictionResult],
                           comparisons: List[ComparisonResult]) -> str:
        monthly_stats = self._calculate_monthly_stats(records)
        state_dist = self._calculate_state_distribution(records)
        anomaly_by_type = self._group_anomalies_by_type(records)
        accuracy_stats = self._calculate_forecast_accuracy(records, predictions)
        suggestions = self._generate_improvement_suggestions(records, predictions, comparisons)
        consistency = self._check_consistency(records, predictions)
        
        data = {
            "report_type": "monthly_review",
            "period": {
                "start": records[0].date.isoformat(),
                "end": records[-1].date.isoformat()
            },
            "generated_at": datetime.now().isoformat(),
            "monthly_statistics": monthly_stats,
            "state_distribution": state_dist,
            "anomalies_by_type": {
                reason: [
                    {
                        "date": a.date.isoformat(),
                        "sales": a.sales_quantity,
                        "inventory": a.ending_inventory,
                        "reason": a.anomaly_reason
                    } for a in anomalies
                ] for reason, anomalies in anomaly_by_type.items()
            },
            "forecast_accuracy": accuracy_stats,
            "improvement_suggestions": suggestions,
            "consistency_check": consistency,
            "comparison_summary": [
                {
                    "product_id": c.product_id,
                    "restock_change": c.restock_changes["suggested_restock"]["delta_absolute"],
                    "matrix_changes_count": len(c.transition_matrix_changes),
                    "new_anomalies_count": len(c.new_anomalies)
                } for c in comparisons
            ]
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def _format_anomaly_text(self,
                              anomalies: List[DailyRecord],
                              period_start: date,
                              period_end: date) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("异常样本专项报告")
        lines.append("=" * 70)
        lines.append(f"统计周期：{period_start.strftime('%Y-%m-%d')} 至 {period_end.strftime('%Y-%m-%d')}")
        lines.append(f"异常总数：{len(anomalies)}")
        lines.append("")
        
        by_type = defaultdict(list)
        for a in anomalies:
            by_type[a.anomaly_reason].append(a)
        
        for reason, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
            lines.append("-" * 50)
            lines.append(f"🔍 {reason}（{len(items)}次）")
            lines.append("-" * 50)
            lines.append(f"  {'日期':<12} {'产品':<16} {'销量':<10} {'期初库存':<10} {'期末库存':<10}")
            lines.append(f"  {'-'*58}")
            for a in items:
                lines.append(f"  {str(a.date):<12} {a.product_name:<16} {a.sales_quantity:<10.1f} {a.beginning_inventory:<10.1f} {a.ending_inventory:<10.1f}")
            lines.append("")
        
        lines.append("-" * 50)
        lines.append("📋 处理建议")
        lines.append("-" * 50)
        for reason in by_type.keys():
            if "负销量" in reason:
                lines.append(f"  {reason}: 检查销售录入错误，可能是退货或盘点差异，建议核对原始单据")
            elif "负库存" in reason:
                lines.append(f"  {reason}: 检查库存录入错误或漏记入库，建议核对库存台账")
            elif "异常偏高" in reason:
                lines.append(f"  {reason}: 检查是否有促销活动或团购订单，建议纳入预测模型需考虑特殊事件")
            elif "异常偏低" in reason:
                lines.append(f"  {reason}: 检查是否缺货或天气影响，建议分析原因")
            elif "库存过高" in reason:
                lines.append(f"  {reason}: 优化补货量，考虑促销清库存")
            elif "跳变" in reason:
                lines.append(f"  {reason}: 分析跳变原因，考虑是否有特殊事件影响")
        
        lines.append("")
        lines.append("=" * 70)
        
        return "\n".join(lines)

    def _format_anomaly_csv(self,
                             anomalies: List[DailyRecord],
                             period_start: date,
                             period_end: date) -> str:
        output = []
        output.append("date,product_id,product_name,sales_quantity,beginning_inventory,ending_inventory,anomaly_reason")
        for a in anomalies:
            output.append(f"{a.date},{a.product_id},{a.product_name},{a.sales_quantity:.2f},"
                      f"{a.beginning_inventory:.2f},{a.ending_inventory:.2f},"
                      f"{a.anomaly_reason}")
        return "\n".join(output)

    def _format_comparison_json(self, comparison: ComparisonResult) -> str:
        data = {
            "report_type": "run_comparison",
            "product": {
                "id": comparison.product_id,
                "name": comparison.product_name
            },
            "first_run": comparison.first_run.run_timestamp.isoformat(),
            "second_run": comparison.second_run.run_timestamp.isoformat(),
            "transition_matrix_changes": comparison.transition_matrix_changes,
            "restock_changes": comparison.restock_changes,
            "state_probability_changes": comparison.state_probability_changes,
            "new_anomalies": [
                {
                    "date": a.date.isoformat(),
                    "sales": a.sales_quantity,
                    "inventory": a.ending_inventory,
                    "reason": a.anomaly_reason
                } for a in comparison.new_anomalies
            ],
            "data_quality_changes": comparison.data_quality_changes
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def _calculate_monthly_stats(self, records: List[DailyRecord]) -> Dict:
        sales_values = [r.sales_quantity for r in records]
        anomalies = [r for r in records if r.is_anomaly]
        
        return {
            "total_days": len(records),
            "total_sales": sum(sales_values),
            "avg_daily_sales": sum(sales_values) / len(records) if records else 0,
            "min_sales": min(sales_values) if sales_values else 0,
            "max_sales": max(sales_values) if sales_values else 0,
            "anomaly_count": len(anomalies),
            "anomaly_rate": len(anomalies) / len(records) if records else 0
        }

    def _calculate_state_distribution(self, records: List[DailyRecord]) -> Dict:
        sales_dist = defaultdict(int)
        weather_dist = defaultdict(int)
        holiday_dist = defaultdict(int)
        
        for r in records:
            if r.sales_state:
                sales_dist[r.sales_state.value] += 1
            if r.weather_tag:
                weather_dist[r.weather_tag.value] += 1
            if r.holiday_tag:
                holiday_dist[r.holiday_tag.value] += 1
        
        return {
            "销量状态": dict(sales_dist),
            "天气标签": dict(weather_dist),
            "节假日标签": dict(holiday_dist)
        }

    def _group_anomalies_by_type(self, records: List[DailyRecord]) -> Dict[str, List[DailyRecord]]:
        result = defaultdict(list)
        for r in records:
            if r.is_anomaly and r.anomaly_reason:
                result[r.anomaly_reason].append(r)
        return dict(result)

    def _calculate_forecast_accuracy(self,
                                   records: List[DailyRecord],
                                   predictions: List[PredictionResult]) -> Dict:
        if len(records) < 2 or len(predictions) < 1:
            return {
                "total_deviation": 0,
                "mae": 0,
                "mape": 0,
                "note": "数据不足，无法计算准确率"
            }
        
        errors = []
        for pred in predictions:
            for i, df in enumerate(pred.daily_forecast):
                actual_idx = len(records) - pred.forecast_days + i
                if 0 <= actual_idx < len(records):
                    actual = records[actual_idx].sales_quantity
                    forecast = df["expected_sales"]
                    if actual > 0:
                        errors.append(abs(actual - forecast) / actual)
        
        if errors:
            return {
                "total_deviation": sum(errors),
                "mae": sum(errors) / len(errors),
                "mape": sum(errors) / len(errors),
                "sample_count": len(errors)
            }
        
        return {
            "total_deviation": 0,
            "mae": 0,
            "mape": 0,
            "sample_count": 0,
            "note": "数据不足，无法计算准确率"
        }

    def _generate_improvement_suggestions(self,
                                     records: List[DailyRecord],
                                     predictions: List[PredictionResult],
                                     comparisons: List[ComparisonResult]) -> List[str]:
        suggestions = []
        
        monthly_stats = self._calculate_monthly_stats(records)
        
        if monthly_stats["anomaly_rate"] > 0.1:
            suggestions.append("异常率超过10%，建议加强数据质量管控，建立数据录入审核机制")
        
        sparse_count = sum(1 for p in predictions if p.sparse_data_warning)
        if sparse_count > 0:
            suggestions.append(f"有{sparse_count}个产品存在样本稀疏问题，建议在对应天气/节假日场景下增加数据采集")
        
        cold_count = sum(1 for p in predictions if p.cold_start_applied)
        if cold_count > 0:
            suggestions.append(f"有{cold_count}个产品处于冷启动阶段，建议继续积累历史数据")
        
        jump_count = sum(1 for p in predictions if p.state_jump_detected)
        if jump_count > 0:
            suggestions.append(f"检测到{jump_count}次状态跳变，建议建立特殊事件记录机制（促销、活动等）")
        
        if not suggestions:
            suggestions.append("数据质量良好，继续保持当前的数据采集和分析流程")
            suggestions.append("建议每月进行一次模型参数复核，确保预测准确度")
        
        return suggestions

    def _check_consistency(self,
                          records: List[DailyRecord],
                          predictions: List[PredictionResult]) -> Dict:
        issues = []
        
        daily_avg = sum(r.sales_quantity for r in records) / len(records) if records else 0
        
        for pred in predictions:
            dq_avg = pred.data_quality.get("total_records", 0)
            if dq_avg > 0 and abs(dq_avg - len(records) / dq_avg - 1) > 0.05:
                issues.append(f"产品{pred.product_id}：日常操作与月底复盘记录数不一致")
        
        for pred in predictions:
            matrix_avg = pred.data_quality.get("avg_sales", 0)
            if matrix_avg > 0 and abs(daily_avg / matrix_avg - 1) > 0.1:
                issues.append(f"产品{pred.product_id}：日均销量计算口径不一致")
        
        return {
            "is_consistent": len(issues) == 0,
            "issues": issues,
            "daily_avg_sales": round(daily_avg, 2)
        }
