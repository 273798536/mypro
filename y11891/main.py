"""
马尔可夫库存预测工具 - 主程序
============================

使用流程：
1. 准备历史数据（销量、库存、天气、节假日）
2. 训练马尔可夫模型
3. 输入当前状态（销量状态、天气标签、节假日标签）
4. 运行预测，获得转移矩阵和补货建议
5. 第二次运行，对比分析变化
6. 导出报告

样例场景：
- 正常场景：充足历史数据的商品预测
- 冷启动场景：新上架商品（7天数据）
- 状态跳变场景：天气突变导致的销量跳变
- 样本稀疏场景：某些状态组合数据不足
"""

from datetime import date, timedelta, datetime
import random
from typing import List, Tuple

from models import (
    StateKey, SalesState, WeatherTag, HolidayTag,
    DailyRecord, PredictionResult, RestockSuggestion
)
from markov_core import MarkovInventoryPredictor
from anomaly_handler import AnomalyHandler
from restock_engine import RestockEngine
from comparison_engine import ComparisonEngine
from report_exporter import ReportExporter


class SampleDataGenerator:
    def __init__(self, product_id: str = "P001", product_name: str = "瓶装矿泉水"):
        self.product_id = product_id
        self.product_name = product_name
        self.avg_sales = 50.0

    def generate_normal_scenario(self, days: int = 45) -> List[DailyRecord]:
        """生成正常场景数据：45天充足数据，覆盖多种天气和节假日"""
        records = []
        start_date = date.today() - timedelta(days=days)
        
        weather_patterns = ["SUNNY", "CLOUDY", "RAINY", "SUNNY", "CLOUDY", 
                           "SUNNY", "HOT", "CLOUDY", "RAINY", "SUNNY"]
        temp_patterns = [28, 24, 18, 26, 22, 25, 35, 23, 19, 27]
        
        for i in range(days):
            d = start_date + timedelta(days=i)
            weather_idx = i % len(weather_patterns)
            
            is_weekend = d.weekday() >= 5
            is_holiday = i % 30 == 0
            is_pre_holiday = i % 30 == 29
            is_post_holiday = i % 30 == 1
            
            base_sales = self.avg_sales
            if weather_patterns[weather_idx] == "RAINY":
                base_sales *= 0.7
            elif weather_patterns[weather_idx] == "HOT":
                base_sales *= 1.5
            elif weather_patterns[weather_idx] == "SUNNY":
                base_sales *= 1.1
            
            if is_holiday:
                base_sales *= 1.8
            elif is_pre_holiday:
                base_sales *= 1.5
            elif is_weekend:
                base_sales *= 1.2
            
            sales = max(0, base_sales + random.gauss(0, 8))
            beginning_inv = 100 - base_sales * 0.5 + random.gauss(0, 10)
            ending_inv = max(0, beginning_inv - sales + random.gauss(0, 5))
            
            if i % 20 == 0:
                sales = self.avg_sales * 3.5
            
            if i % 25 == 0:
                ending_inv = -5
            
            record = DailyRecord(
                date=d,
                product_id=self.product_id,
                product_name=self.product_name,
                sales_quantity=round(sales, 1),
                beginning_inventory=round(beginning_inv, 1),
                ending_inventory=round(ending_inv, 1),
                temperature=temp_patterns[weather_idx] + random.gauss(0, 2),
                weather_condition=weather_patterns[weather_idx],
                is_holiday=is_holiday,
                is_pre_holiday=is_pre_holiday,
                is_post_holiday=is_post_holiday
            )
            records.append(record)
        
        return records

    def generate_cold_start_scenario(self) -> List[DailyRecord]:
        """生成冷启动场景：仅7天数据，新上架商品"""
        records = []
        start_date = date.today() - timedelta(days=7)
        
        for i in range(7):
            d = start_date + timedelta(days=i)
            is_weekend = d.weekday() >= 5
            
            base_sales = self.avg_sales * 0.8
            if is_weekend:
                base_sales *= 1.2
            
            sales = max(0, base_sales + random.gauss(0, 5))
            beginning_inv = 80 - base_sales * 0.3 + random.gauss(0, 5)
            ending_inv = max(0, beginning_inv - sales)
            
            record = DailyRecord(
                date=d,
                product_id="P002",
                product_name="新款网红零食",
                sales_quantity=round(sales, 1),
                beginning_inventory=round(beginning_inv, 1),
                ending_inventory=round(ending_inv, 1),
                temperature=25 + random.gauss(0, 3),
                weather_condition="SUNNY" if i % 2 == 0 else "CLOUDY",
                is_holiday=False,
                is_pre_holiday=False,
                is_post_holiday=False
            )
            records.append(record)
        
        return records

    def generate_sparse_data_scenario(self) -> List[DailyRecord]:
        """生成样本稀疏场景：某些状态组合数据不足5次"""
        records = []
        start_date = date.today() - timedelta(days=30)
        
        weather_options = ["SUNNY", "CLOUDY", "RAINY"]
        temp_options = [28, 24, 18]
        
        for i in range(30):
            d = start_date + timedelta(days=i)
            
            if i % 10 == 0:
                weather = "SNOWY"
                temp = -2
            else:
                weather_idx = i % len(weather_options)
                weather = weather_options[weather_idx]
                temp = temp_options[weather_idx]
            
            base_sales = self.avg_sales
            if weather == "SNOWY":
                base_sales *= 0.5
            
            sales = max(0, base_sales + random.gauss(0, 6))
            beginning_inv = 90 + random.gauss(0, 8)
            ending_inv = max(0, beginning_inv - sales)
            
            record = DailyRecord(
                date=d,
                product_id="P003",
                product_name="冬季热饮",
                sales_quantity=round(sales, 1),
                beginning_inventory=round(beginning_inv, 1),
                ending_inventory=round(ending_inv, 1),
                temperature=temp,
                weather_condition=weather,
                is_holiday=False
            )
            records.append(record)
        
        return records

    def generate_state_jump_scenario(self) -> Tuple[List[DailyRecord], StateKey]:
        """生成状态跳变场景：销量从LOW跳变到VERY_HIGH"""
        records = []
        start_date = date.today() - timedelta(days=40)
        
        for i in range(40):
            d = start_date + timedelta(days=i)
            
            if i < 35:
                sales = self.avg_sales * 0.4 + random.gauss(0, 3)
                weather = "RAINY"
                temp = 15
            else:
                sales = self.avg_sales * 2.0 + random.gauss(0, 8)
                weather = "HOT"
                temp = 38
            
            beginning_inv = 100 - sales * 0.2 + random.gauss(0, 5)
            ending_inv = max(0, beginning_inv - sales)
            
            record = DailyRecord(
                date=d,
                product_id="P004",
                product_name="冰淇淋",
                sales_quantity=round(sales, 1),
                beginning_inventory=round(beginning_inv, 1),
                ending_inventory=round(ending_inv, 1),
                temperature=temp,
                weather_condition=weather,
                is_holiday=i % 28 == 0
            )
            records.append(record)
        
        last_record = records[-1]
        last_record.compute_states(self.avg_sales)
        current_state = StateKey(
            sales_state=SalesState.VERY_HIGH,
            weather=WeatherTag.HOT,
            holiday=HolidayTag.NORMAL
        )
        
        return records, current_state


class MarkovInventorySystem:
    def __init__(self):
        self.predictor = MarkovInventoryPredictor(alpha=1.0, min_samples_for_transition=5)
        self.anomaly_handler = None
        self.restock_engine = None
        self.comparison_engine = ComparisonEngine(prob_threshold=0.01, change_threshold=0.05)
        self.report_exporter = ReportExporter(output_dir="./reports")
        self.records: List[DailyRecord] = []
        self.first_run_result: PredictionResult = None
        self.second_run_result: PredictionResult = None
        self.comparison_result = None

    def run_prediction(self, records: List[DailyRecord], 
                       current_state: StateKey,
                       product_id: str,
                       product_name: str,
                       current_inventory: float,
                       forecast_days: int = 7,
                       future_weather: List[WeatherTag] = None,
                       future_holidays: List[HolidayTag] = None,
                       min_order_qty: float = 10,
                       batch_size: float = 5) -> Tuple[PredictionResult, RestockSuggestion]:
        self.predictor = MarkovInventoryPredictor(alpha=1.0, min_samples_for_transition=5)
        fit_result = self.predictor.fit(records)
        
        self.anomaly_handler = AnomalyHandler(self.predictor)
        self.restock_engine = RestockEngine(
            self.predictor, self.anomaly_handler,
            service_level=0.95, lead_time_days=1
        )
        
        cleaned_records, anomalies = self.anomaly_handler.clean_anomalous_records(records)
        self.predictor.fit(cleaned_records)
        
        all_anomalies = self.anomaly_handler.detect_all_anomalies(records)
        
        prediction = self.predictor.predict(
            current_state=current_state,
            forecast_days=forecast_days,
            future_weather=future_weather,
            future_holidays=future_holidays
        )
        
        prediction.product_id = product_id
        prediction.product_name = product_name
        prediction.anomalies = all_anomalies
        
        restock = self.restock_engine.generate_restock_suggestion(
            prediction=prediction,
            current_inventory=current_inventory,
            current_state=current_state,
            records=records,
            product_id=product_id,
            product_name=product_name,
            min_order_qty=min_order_qty,
            batch_size=batch_size
        )
        
        prediction.restock_suggestion = restock
        
        return prediction, restock

    def run_comparison(self, first_run: PredictionResult, 
                       second_run: PredictionResult):
        self.comparison_result = self.comparison_engine.compare_runs(first_run, second_run)
        return self.comparison_result

    def print_prediction_result(self, prediction: PredictionResult, 
                                 restock: RestockSuggestion,
                                 scenario_name: str):
        print("\n" + "=" * 70)
        print(f"📊 {scenario_name}")
        print("=" * 70)
        
        print(f"\n产品：{prediction.product_name} ({prediction.product_id})")
        print(f"运行时间：{prediction.run_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n--- 当前状态 ---")
        cs = prediction.current_state
        print(f"  销量状态：{cs.sales_state.value}")
        print(f"  天气标签：{cs.weather.value}")
        print(f"  节假日标签：{cs.holiday.value}")
        
        print("\n--- 🔄 转移矩阵（Top 5） ---")
        transitions = sorted(prediction.transition_matrix.items(), key=lambda x: -x[1])
        for i, (trans, prob) in enumerate(transitions[:5], 1):
            print(f"  {i}. {trans}: {prob:.4f}")
        
        print("\n--- 📈 未来7天预测 ---")
        print(f"  总预测需求：{prediction.total_forecast:.1f}")
        print(f"  {'天':<4} {'预计销量':<10} {'最可能状态':<20} {'概率':<8}")
        print(f"  {'-'*46}")
        for df in prediction.daily_forecast:
            ts = df["top_state"]
            state_str = f"{ts.sales_state.value}/{ts.weather.value}/{ts.holiday.value}"
            print(f"  {df['day']:<4} {df['expected_sales']:<10.1f} {state_str:<20} {df['top_probability']:<8.1%}")
        
        print("\n--- 📦 补货建议 ---")
        print(f"  当前库存：{restock.current_inventory:.1f}")
        print(f"  预测需求：{restock.forecast_demand:.1f}")
        print(f"  安全库存：{restock.safety_stock:.1f}")
        print(f"  目标库存：{restock.max_stock:.1f}")
        print(f"  建议补货：{restock.suggested_restock:.1f}")
        print(f"  置信度：{restock.confidence:.0%}")
        
        print("\n  关键状态转移：")
        for (s_from, s_to, prob) in restock.state_transitions[:3]:
            print(f"    {s_from.sales_state.value} → {s_to.sales_state.value}: {prob:.2%}")
        
        print("\n  推理过程：")
        for line in restock.reasoning.split('\n')[:8]:
            print(f"    {line}")
        
        print("\n--- 🔍 数据质量 ---")
        dq = prediction.data_quality
        print(f"  历史记录：{dq['total_records']}天")
        print(f"  唯一状态：{dq['unique_states']}种")
        print(f"  稀疏状态：{dq['sparse_states']}种 ({dq['sparse_states_ratio']:.1%})")
        print(f"  置信度：{dq['confidence_score']:.0%}")
        
        flags = []
        if prediction.cold_start_applied:
            flags.append("❄️ 冷启动")
        if prediction.sparse_data_warning:
            flags.append("📊 样本稀疏")
        if prediction.state_jump_detected:
            flags.append("⚡ 状态跳变")
        if flags:
            print(f"\n  特殊标记：{' '.join(flags)}")
        
        if prediction.anomalies:
            print(f"\n--- ⚠️  异常记录 ({len(prediction.anomalies)}条) ---")
            for a in prediction.anomalies[:3]:
                print(f"  {a.date}: {a.anomaly_reason}")

    def export_all_reports(self):
        if self.first_run_result:
            daily_path = self.report_exporter.export_daily_operation_report(
                self.first_run_result,
                self.first_run_result.restock_suggestion,
                self.records,
                format="text"
            )
            print(f"\n✅ 日常操作报告已导出：{daily_path}")
        
        if self.comparison_result:
            comp_path = self.report_exporter.export_comparison_report(
                self.comparison_result,
                format="text"
            )
            print(f"✅ 对比分析报告已导出：{comp_path}")
        
        if self.second_run_result and self.records:
            monthly_path = self.report_exporter.export_monthly_review_report(
                self.records,
                [self.first_run_result, self.second_run_result],
                [self.comparison_result] if self.comparison_result else [],
                format="text"
            )
            print(f"✅ 月底复盘报告已导出：{monthly_path}")
            
            all_anomalies = [r for r in self.records if r.is_anomaly]
            if all_anomalies:
                anomaly_path = self.report_exporter.export_anomaly_report(
                    all_anomalies,
                    self.records[0].date,
                    self.records[-1].date,
                    format="text"
                )
                print(f"✅ 异常样本报告已导出：{anomaly_path}")


def main():
    print("\n" + "=" * 70)
    print("🚀 马尔可夫库存预测工具 - 演示程序")
    print("=" * 70)
    print("\n本工具将演示以下场景：")
    print("  1. 正常场景：充足历史数据的商品预测")
    print("  2. 冷启动场景：新上架商品（7天数据）")
    print("  3. 样本稀疏场景：罕见状态数据不足")
    print("  4. 状态跳变场景：天气突变导致销量跳变")
    print("  5. 两次运行对比：标出马尔可夫预测的变化")
    print("  6. 报告导出：日常操作 + 月底复盘")
    
    system = MarkovInventorySystem()
    generator = SampleDataGenerator()
    
    print("\n" + "=" * 70)
    print("📌 场景1：正常场景 - 瓶装矿泉水")
    print("=" * 70)
    
    records_normal = generator.generate_normal_scenario(days=45)
    avg_sales = sum(r.sales_quantity for r in records_normal) / len(records_normal)
    for r in records_normal:
        r.compute_states(avg_sales)
    
    last_record = records_normal[-1]
    current_state_normal = StateKey(
        sales_state=last_record.sales_state,
        weather=last_record.weather_tag,
        holiday=last_record.holiday_tag
    )
    
    future_weather = [WeatherTag.SUNNY, WeatherTag.SUNNY, WeatherTag.CLOUDY,
                      WeatherTag.RAINY, WeatherTag.CLOUDY, WeatherTag.SUNNY, WeatherTag.SUNNY]
    future_holidays = [HolidayTag.NORMAL, HolidayTag.NORMAL, HolidayTag.WEEKEND,
                       HolidayTag.WEEKEND, HolidayTag.NORMAL, HolidayTag.NORMAL, HolidayTag.NORMAL]
    
    prediction1, restock1 = system.run_prediction(
        records=records_normal,
        current_state=current_state_normal,
        product_id="P001",
        product_name="瓶装矿泉水",
        current_inventory=35.0,
        forecast_days=7,
        future_weather=future_weather,
        future_holidays=future_holidays,
        min_order_qty=20,
        batch_size=10
    )
    
    system.print_prediction_result(prediction1, restock1, "场景1：正常场景 - 第一次运行")
    system.first_run_result = prediction1
    system.records = records_normal
    
    print("\n" + "=" * 70)
    print("📌 场景1续：补充新数据后的第二次运行")
    print("=" * 70)
    print("（模拟：周末促销，销量激增 + 新增3天数据）")
    
    new_records = []
    for i in range(3):
        d = records_normal[-1].date + timedelta(days=i + 1)
        new_record = DailyRecord(
            date=d,
            product_id="P001",
            product_name="瓶装矿泉水",
            sales_quantity=avg_sales * 2.2 + random.gauss(0, 10),
            beginning_inventory=restock1.suggested_restock + 35 - avg_sales * 1.5,
            ending_inventory=restock1.suggested_restock + 35 - avg_sales * 2.2,
            temperature=33 + random.gauss(0, 2),
            weather_condition="SUNNY",
            is_holiday=False,
            is_pre_holiday=False,
            is_post_holiday=False
        )
        new_record.compute_states(avg_sales)
        new_records.append(new_record)
    
    records_updated = records_normal + new_records
    avg_sales_updated = sum(r.sales_quantity for r in records_updated) / len(records_updated)
    
    last_record_updated = records_updated[-1]
    current_state_updated = StateKey(
        sales_state=SalesState.HIGH,
        weather=WeatherTag.HOT,
        holiday=HolidayTag.WEEKEND
    )
    
    prediction2, restock2 = system.run_prediction(
        records=records_updated,
        current_state=current_state_updated,
        product_id="P001",
        product_name="瓶装矿泉水",
        current_inventory=last_record_updated.ending_inventory,
        forecast_days=7,
        min_order_qty=20,
        batch_size=10
    )
    
    system.print_prediction_result(prediction2, restock2, "场景1：第二次运行（补充新数据）")
    system.second_run_result = prediction2
    
    print("\n" + "=" * 70)
    print("📌 两次运行对比分析")
    print("=" * 70)
    
    comparison = system.run_comparison(prediction1, prediction2)
    print(system.comparison_engine.print_comparison_report(comparison))
    
    print("\n" + "=" * 70)
    print("📌 场景2：冷启动场景 - 新款网红零食（仅7天数据）")
    print("=" * 70)
    
    records_cold = generator.generate_cold_start_scenario()
    avg_cold = sum(r.sales_quantity for r in records_cold) / len(records_cold)
    for r in records_cold:
        r.compute_states(avg_cold)
    
    last_cold = records_cold[-1]
    current_state_cold = StateKey(
        sales_state=last_cold.sales_state,
        weather=last_cold.weather_tag,
        holiday=last_cold.holiday_tag
    )
    
    prediction_cold, restock_cold = system.run_prediction(
        records=records_cold,
        current_state=current_state_cold,
        product_id="P002",
        product_name="新款网红零食",
        current_inventory=25.0,
        forecast_days=7,
        min_order_qty=10,
        batch_size=5
    )
    
    system.print_prediction_result(prediction_cold, restock_cold, "场景2：冷启动场景")
    
    print("\n" + "=" * 70)
    print("📌 场景3：样本稀疏场景 - 冬季热饮（罕见下雪天）")
    print("=" * 70)
    
    records_sparse = generator.generate_sparse_data_scenario()
    avg_sparse = sum(r.sales_quantity for r in records_sparse) / len(records_sparse)
    for r in records_sparse:
        r.compute_states(avg_sparse)
    
    current_state_sparse = StateKey(
        sales_state=SalesState.LOW,
        weather=WeatherTag.SNOWY,
        holiday=HolidayTag.NORMAL
    )
    
    prediction_sparse, restock_sparse = system.run_prediction(
        records=records_sparse,
        current_state=current_state_sparse,
        product_id="P003",
        product_name="冬季热饮",
        current_inventory=60.0,
        forecast_days=7,
        min_order_qty=15,
        batch_size=5
    )
    
    system.print_prediction_result(prediction_sparse, restock_sparse, "场景3：样本稀疏场景")
    
    print("\n" + "=" * 70)
    print("📌 场景4：状态跳变场景 - 冰淇淋（从冷雨天突然变热）")
    print("=" * 70)
    
    records_jump, current_state_jump = generator.generate_state_jump_scenario()
    avg_jump = sum(r.sales_quantity for r in records_jump) / len(records_jump)
    for r in records_jump:
        r.compute_states(avg_jump)
    
    prediction_jump, restock_jump = system.run_prediction(
        records=records_jump,
        current_state=current_state_jump,
        product_id="P004",
        product_name="冰淇淋",
        current_inventory=20.0,
        forecast_days=7,
        min_order_qty=30,
        batch_size=10
    )
    
    system.print_prediction_result(prediction_jump, restock_jump, "场景4：状态跳变场景")
    
    print("\n" + "=" * 70)
    print("📌 导出所有报告")
    print("=" * 70)
    
    system.export_all_reports()
    
    print("\n" + "=" * 70)
    print("✅ 演示完成！关键总结：")
    print("=" * 70)
    print("\n🔄 转移矩阵已触发：")
    print(f"   正常场景：{len(prediction1.transition_matrix)} 个转移概率")
    print(f"   冷启动场景：{len(prediction_cold.transition_matrix)} 个转移概率")
    print(f"   样本稀疏：{len(prediction_sparse.transition_matrix)} 个转移概率")
    print(f"   状态跳变：{len(prediction_jump.transition_matrix)} 个转移概率")
    
    print("\n📦 补货建议已触发：")
    print(f"   正常场景第一次：补货 {restock1.suggested_restock:.0f} 单位")
    print(f"   正常场景第二次：补货 {restock2.suggested_restock:.0f} 单位")
    print(f"   冷启动场景：补货 {restock_cold.suggested_restock:.0f} 单位")
    print(f"   样本稀疏：补货 {restock_sparse.suggested_restock:.0f} 单位")
    print(f"   状态跳变：补货 {restock_jump.suggested_restock:.0f} 单位")
    
    print("\n🔍 异常场景处理：")
    if prediction1.cold_start_applied:
        print("   ✅ 冷启动处理已触发")
    if prediction_sparse.sparse_data_warning:
        print("   ✅ 样本稀疏处理已触发")
    if prediction_jump.state_jump_detected:
        print("   ✅ 状态跳变处理已触发")
    
    print("\n📊 两次运行变化：")
    print(f"   转移矩阵变化：{len(comparison.transition_matrix_changes)} 处")
    print(f"   补货量变化：{comparison.restock_changes['suggested_restock']['delta_absolute']:+.0f} 单位")
    print(f"   新增异常：{len(comparison.new_anomalies)} 条")
    
    print("\n💡 算法过程说明：")
    print("   1. 状态定义：销量状态(5种) × 天气(6种) × 节假日(5种) = 210种组合")
    print("   2. 转移概率：P(S_t+1|S_t) = 历史转移次数 / 历史状态次数")
    print("   3. 拉普拉斯平滑：处理样本稀疏，P = (N+α×P_prior) / (N_total+α)")
    print("   4. k步预测：π_t+k = π_t × P^k")
    print("   5. 安全库存：SS = Z×σ×√L （Z=1.65对应95%服务水平）")
    print("   6. 补货量：Q = MAX(0, 预测需求 + 安全库存 - 当前库存)")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
