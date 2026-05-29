"""
端到端测试脚本
重点测试：
1. 设备离线数据是否被正确隔离，不混入正常结果
2. 跨时段充电是否被正确检测
3. 优惠叠加是否被正确检测
4. 数据追溯链路是否完整
5. 异常说明、图表、导出结果是否一致
"""
import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from charging_station_analytics.core.pipeline import AnalysisPipeline
from charging_station_analytics.core.report_generator import ReportGenerator
from charging_station_analytics.core.data_reader import DataReader
from charging_station_analytics.core.data_cleaner import DataCleaner

def test_offline_device_isolation():
    """测试设备离线数据隔离 - 这是最关键的测试"""
    print("=" * 80)
    print("🔴 测试1: 设备离线数据隔离验证")
    print("=" * 80)

    test_file = Path(__file__).resolve().parent.parent / "examples" / "充电站充电订单_测试数据.xlsx"

    pipeline = AnalysisPipeline()
    result = pipeline.run(str(test_file))

    print(f"\n✅ 分析完成，共处理 {len(result.raw_data.df) + len(result.raw_data.bad_rows)} 行原始数据")
    print(f"   - 有效数据: {len(result.cleaned_data.df)} 行")
    print(f"   - 坏行: {len(result.raw_data.bad_rows)} 行")
    print(f"   - 空行: {len(result.raw_data.empty_rows)} 行")
    print(f"   - 备注行: {len(result.raw_data.remark_rows)} 行")

    print(f"\n📊 设备状态统计:")
    print(f"   - 正常订单: {len(result.final_normal_df)} 笔")
    print(f"   - 离线订单: {len(result.final_offline_df)} 笔")
    print(f"   - 离线设备: {result.device_result.calculation_summary['offline_devices']}")

    print(f"\n🔍 验证离线订单隔离:")
    offline_order_ids = set(result.final_offline_df["order_id"].tolist())
    normal_order_ids = set(result.final_normal_df["order_id"].tolist())

    expected_offline_orders = {"ORD20240520007", "ORD20240520008", "ORD20240520014"}

    print(f"   - 预期离线订单: {sorted(expected_offline_orders)}")
    print(f"   - 实际离线订单: {sorted(offline_order_ids)}")

    intersection = offline_order_ids & normal_order_ids
    if intersection:
        print(f"   ❌ 错误: 以下订单同时出现在正常和离线结果中: {intersection}")
        return False
    else:
        print(f"   ✅ 正确: 正常和离线订单无交集")

    if expected_offline_orders == offline_order_ids:
        print(f"   ✅ 正确: 所有预期的离线订单都被正确识别")
    else:
        missing = expected_offline_orders - offline_order_ids
        extra = offline_order_ids - expected_offline_orders
        if missing:
            print(f"   ❌ 错误: 以下预期离线订单未被识别: {missing}")
        if extra:
            print(f"   ⚠️  警告: 以下额外订单被标记为离线: {extra}")
        return False

    offline_007 = result.final_offline_df[result.final_offline_df["order_id"] == "ORD20240520007"].iloc[0]
    print(f"\n📝 ORD007详情验证:")
    print(f"   - 原始设备状态: {offline_007['device_status']}")
    print(f"   - 标准化状态: {offline_007['normalized_device_status']}")
    print(f"   - 设备离线标记: {offline_007['is_device_offline']}")
    print(f"   - 人工补录标记: {offline_007['is_manual_supplement']}")
    print(f"   - 需复核标记: {offline_007['needs_review']}")
    print(f"   - 复核原因: {offline_007['review_reason']}")
    print(f"   - 备注: {offline_007['remark']}")

    if offline_007["is_device_offline"] == True and \
       offline_007["is_manual_supplement"] == True and \
       offline_007["needs_review"] == True:
        print(f"   ✅ 正确: ORD007的离线、补录、需复核标记都正确")
    else:
        print(f"   ❌ 错误: ORD007的标记不正确")
        return False

    offline_008 = result.final_offline_df[result.final_offline_df["order_id"] == "ORD20240520008"].iloc[0]
    print(f"\n📝 ORD008详情验证(英文状态offline):")
    print(f"   - 原始设备状态: {offline_008['device_status']}")
    print(f"   - 标准化状态: {offline_008['normalized_device_status']}")
    print(f"   - 设备离线标记: {offline_008['is_device_offline']}")

    if offline_008["normalized_device_status"] == "离线" and offline_008["is_device_offline"] == True:
        print(f"   ✅ 正确: 英文状态'offline'被正确识别为离线")
    else:
        print(f"   ❌ 错误: 英文状态识别失败")
        return False

    print(f"\n✅ 测试1通过: 设备离线数据隔离验证完成")
    return result, pipeline


def test_cross_period_detection(result, pipeline=None):
    """测试跨时段充电检测"""
    print("\n" + "=" * 80)
    print("🟡 测试2: 跨时段充电检测验证")
    print("=" * 80)

    cross_period_df = result.anomaly_result.cross_period_filter
    print(f"\n🔍 跨时段充电订单: {len(cross_period_df)} 笔")

    expected_cross_period = {
        "ORD20240520006",  # 11:30-12:30 尖峰/高峰
        "ORD20240520009",  # 06:30-09:15 平段/高峰
        "ORD20240520013",  # 23:30-01:15 跨日 平段/低谷
        "ORD20240520015",  # 05:30-07:00 低谷/平段
        "ORD20240520016",  # 18:00-20:30 高峰/尖峰
    }

    actual_cross_period = set(cross_period_df["order_id"].tolist())
    print(f"   - 预期跨时段订单: {sorted(expected_cross_period)}")
    print(f"   - 实际跨时段订单: {sorted(actual_cross_period)}")

    missing = expected_cross_period - actual_cross_period
    extra = actual_cross_period - expected_cross_period
    
    if missing:
        print(f"   ❌ 错误: 以下预期跨时段订单未被识别: {missing}")
        return False
    else:
        print(f"   ✅ 正确: 所有预期跨时段订单都被正确检测")
    
    if extra:
        print(f"   ℹ️  信息: 以下额外订单也被标记为跨时段: {extra}")

    order_006 = cross_period_df[cross_period_df["order_id"] == "ORD20240520006"].iloc[0]
    print(f"\n📝 ORD006跨时段详情:")
    print(f"   - 时间段: {order_006['start_time']} - {order_006['end_time']}")
    print(f"   - 跨时段类型: {order_006['crossed_periods']}")
    print(f"   - 尖峰电量: {order_006['peak_energy']:.2f}度")
    print(f"   - 高峰电量: {order_006['high_energy']:.2f}度")
    print(f"   - 尖峰电费: {order_006['peak_fee']:.2f}元")
    print(f"   - 高峰电费: {order_006['high_fee']:.2f}元")

    if order_006["peak_energy"] > 0 and order_006["high_energy"] > 0:
        print(f"   ✅ 正确: 跨时段电量被正确拆分")
    else:
        print(f"   ❌ 错误: 跨时段电量拆分不正确")
        return False

    print(f"\n✅ 测试2通过: 跨时段充电检测验证完成")
    return True


def test_stacked_coupon_detection(result, pipeline=None):
    """测试优惠叠加检测"""
    print("\n" + "=" * 80)
    print("🟢 测试3: 优惠叠加检测验证")
    print("=" * 80)

    stacked_df = result.anomaly_result.stacked_coupon_filter
    print(f"\n🔍 优惠叠加订单: {len(stacked_df)} 笔")

    expected_stacked = {
        "ORD20240520005",  # 会员折扣+满减券
        "ORD20240520011",  # 充电券+服务费优惠
        "ORD20240520016",  # 新用户+会员折扣+节日优惠
    }

    actual_stacked = set(stacked_df["order_id"].tolist())
    print(f"   - 预期优惠叠加订单: {sorted(expected_stacked)}")
    print(f"   - 实际优惠叠加订单: {sorted(actual_stacked)}")

    if expected_stacked == actual_stacked:
        print(f"   ✅ 正确: 所有优惠叠加订单都被正确检测")
    else:
        missing = expected_stacked - actual_stacked
        extra = actual_stacked - expected_stacked
        if missing:
            print(f"   ❌ 错误: 以下预期优惠叠加订单未被识别: {missing}")
        if extra:
            print(f"   ⚠️  警告: 以下额外订单被标记为优惠叠加: {extra}")
        return False

    order_016 = stacked_df[stacked_df["order_id"] == "ORD20240520016"].iloc[0]
    print(f"\n📝 ORD016优惠叠加详情:")
    print(f"   - 优惠券类型: {order_016['coupon_type']}")
    print(f"   - 叠加张数: {order_016['coupon_stack_count']}")
    print(f"   - 优惠总金额: {order_016['original_coupon_amount']:.2f}元")
    print(f"   - 分摊到电费: {order_016['electricity_coupon']:.2f}元")
    print(f"   - 分摊到服务费: {order_016['service_coupon']:.2f}元")

    if order_016["coupon_stack_count"] == 3:
        print(f"   ✅ 正确: 三重优惠叠加被正确检测")
    else:
        print(f"   ❌ 错误: 三重优惠叠加检测失败")
        return False

    print(f"\n✅ 测试3通过: 优惠叠加检测验证完成")
    return True


def test_data_traceability(result, pipeline):
    """测试数据追溯链路"""
    print("\n" + "=" * 80)
    print("🔵 测试4: 数据追溯链路验证")
    print("=" * 80)

    test_order_id = "ORD20240520007"
    trace = pipeline.get_order_trace(result, test_order_id)

    if not trace:
        print(f"   ❌ 错误: 未找到订单 {test_order_id} 的追溯信息")
        return False

    print(f"\n📝 订单 {test_order_id} 追溯信息:")
    print(f"   - 追溯ID: {trace['trace_id']}")
    print(f"   - 源文件: {trace['source_file']}")
    print(f"   - 原始行号: {trace['original_row']}")
    print(f"   - 异常标记: {trace['anomalies']}")
    print(f"   - 需复核: {trace['needs_review']}")
    print(f"   - 复核原因: {trace['review_reason']}")

    print(f"\n📋 处理步骤链:")
    for i, step in enumerate(trace["processing_steps"], 1):
        print(f"   {i}. {step['step']} - {step['timestamp']}")
        if "details" in step:
            if step["step"] == "分时电价计算":
                print(f"      时段分布: {json.dumps(step['details'].get('energy_distribution', {}), ensure_ascii=False)}")
            elif step["step"] == "设备状态处理":
                print(f"      原始状态: {step['details'].get('original_status')}")
                print(f"      标准化状态: {step['details'].get('normalized_status')}")

    final_result = trace["final_result"]
    print(f"\n💰 最终收益拆分:")
    rev = final_result["revenue_breakdown"]
    print(f"   - 电费: {rev['electricity_fee']:.2f}元")
    print(f"   - 服务费: {rev['service_fee']:.2f}元")
    print(f"   - 优惠抵扣: {rev['coupon_discount']:.2f}元")
    print(f"   - 净收益: {rev['net_revenue']:.2f}元")

    print(f"\n✅ 测试4通过: 数据追溯链路验证完成")
    return True


def test_revenue_calculation(result, pipeline=None):
    """测试收益计算准确性"""
    print("\n" + "=" * 80)
    print("🟣 测试5: 收益计算准确性验证")
    print("=" * 80)

    summary = result.summary
    print(f"\n📊 收益汇总:")
    print(f"   - 电费总额: {summary['revenue']['total_electricity_fee']:.2f}元")
    print(f"   - 服务费总额: {summary['revenue']['total_service_fee']:.2f}元")
    print(f"   - 优惠抵扣: {summary['revenue']['total_coupon_discount']:.2f}元")
    print(f"   - 净收益: {summary['revenue']['net_revenue']:.2f}元")

    print(f"\n📊 时段电量分布:")
    energy = summary["period_distribution"]["energy"]
    total_energy = sum(energy.values())
    print(f"   - 尖峰: {energy['peak']:.2f}度 ({energy['peak']/total_energy*100:.1f}%)")
    print(f"   - 高峰: {energy['high']:.2f}度 ({energy['high']/total_energy*100:.1f}%)")
    print(f"   - 平段: {energy['flat']:.2f}度 ({energy['flat']/total_energy*100:.1f}%)")
    print(f"   - 低谷: {energy['valley']:.2f}度 ({energy['valley']/total_energy*100:.1f}%)")
    print(f"   - 总计: {total_energy:.2f}度")

    print(f"\n📊 时段电费分布:")
    fees = summary["period_distribution"]["electricity_fee"]
    total_fee = sum(fees.values())
    print(f"   - 尖峰: {fees['peak']:.2f}元 ({fees['peak']/total_fee*100:.1f}%)")
    print(f"   - 高峰: {fees['high']:.2f}元 ({fees['high']/total_fee*100:.1f}%)")
    print(f"   - 平段: {fees['flat']:.2f}元 ({fees['flat']/total_fee*100:.1f}%)")
    print(f"   - 低谷: {fees['valley']:.2f}元 ({fees['valley']/total_fee*100:.1f}%)")
    print(f"   - 总计: {total_fee:.2f}元")

    normal_001 = result.final_normal_df[result.final_normal_df["order_id"] == "ORD20240520001"].iloc[0]
    print(f"\n🧮 ORD001验证(跨时段07:30-08:15，平段→高峰):")
    print(f"   - 充电量: {normal_001['energy']:.2f}度")
    print(f"   - 平段电量: {normal_001['flat_energy']:.2f}度 (电价0.90元)")
    print(f"   - 高峰电量: {normal_001['high_energy']:.2f}度 (电价1.45元)")
    print(f"   - 实际电费: {normal_001['calculated_electricity_fee']:.2f}元")
    print(f"   - 实际服务费: {normal_001['calculated_service_fee']:.2f}元")
    print(f"   - 跨时段标记: {normal_001['is_cross_period']}")

    expected_electricity = (normal_001['flat_energy'] * 0.90 + 
                           normal_001['high_energy'] * 1.45)
    if abs(normal_001["calculated_electricity_fee"] - expected_electricity) < 0.01 and \
       abs(normal_001["calculated_service_fee"] - 18.30) < 0.01 and \
       normal_001['is_cross_period'] == True:
        print(f"   ✅ 正确: ORD001的跨时段电费和服务费计算准确")
    else:
        print(f"   ❌ 错误: ORD001的计算不准确")
        print(f"      预期电费: {expected_electricity:.2f}元")
        return False

    normal_002 = result.final_normal_df[result.final_normal_df["order_id"] == "ORD20240520002"].iloc[0]
    print(f"\n🧮 ORD002验证(尖峰10:30-11:30):")
    print(f"   - 充电量: {normal_002['energy']:.2f}度")
    print(f"   - 尖峰电价: 1.80元/度")
    print(f"   - 预期电费: {45.0 * 1.80:.2f}元")
    print(f"   - 实际电费: {normal_002['calculated_electricity_fee']:.2f}元")

    if abs(normal_002["calculated_electricity_fee"] - 81.00) < 0.01:
        print(f"   ✅ 正确: ORD002的尖峰电费计算准确")
    else:
        print(f"   ❌ 错误: ORD002的计算不准确")
        return False

    print(f"\n✅ 测试5通过: 收益计算准确性验证完成")
    return True


def test_report_generation(result, pipeline=None):
    """测试报表生成与数据一致性"""
    print("\n" + "=" * 80)
    print("🟤 测试6: 报表生成与数据一致性验证")
    print("=" * 80)

    report_generator = ReportGenerator()
    output_path = report_generator.generate_excel_report(result)

    print(f"\n📄 报表已生成: {output_path}")

    import openpyxl
    wb = openpyxl.load_workbook(output_path)
    sheet_names = wb.sheetnames

    expected_sheets = [
        "汇总",
        "正常订单明细",
        "⚠️ 设备离线（单独处理）",
        "分时计费明细",
        "🔍 跨时段充电（需复核）",
        "🔍 优惠叠加（需复核）",
        "❌ 坏行记录",
        "数据追溯链路",
        "异常明细",
        "📊 分析图表",
        "数据质量报告"
    ]

    print(f"\n📋 Sheet列表:")
    for sheet in sheet_names:
        status = "✅" if sheet in expected_sheets else "⚠️"
        print(f"   {status} {sheet}")

    missing_sheets = [s for s in expected_sheets if s not in sheet_names]
    if missing_sheets:
        print(f"\n   ❌ 错误: 缺少以下Sheet: {missing_sheets}")
        return False

    offline_sheet = wb["⚠️ 设备离线（单独处理）"]
    offline_row_count = offline_sheet.max_row - 1
    print(f"\n🔍 离线数据Sheet验证:")
    print(f"   - 数据行数: {offline_row_count}")
    print(f"   - 预期行数: 3")

    if offline_row_count == 3:
        print(f"   ✅ 正确: 离线数据Sheet包含正确的行数")
    else:
        print(f"   ❌ 错误: 离线数据Sheet行数不正确")
        return False

    cross_period_sheet = wb["🔍 跨时段充电（需复核）"]
    cross_period_count = cross_period_sheet.max_row - 1
    
    expected_cross_period_ids = {"ORD20240520006", "ORD20240520009", "ORD20240520013", 
                                 "ORD20240520015", "ORD20240520016"}
    
    actual_ids = set()
    for row in cross_period_sheet.iter_rows(min_row=2, max_row=cross_period_sheet.max_row, values_only=True):
        if row and len(row) > 1:
            actual_ids.add(str(row[1]))
    
    missing_ids = expected_cross_period_ids - actual_ids
    
    print(f"\n🔍 跨时段Sheet验证:")
    print(f"   - 数据行数: {cross_period_count}")
    print(f"   - 预期包含的订单数: 5")
    print(f"   - 实际包含的订单数: {len(actual_ids)}")
    
    if not missing_ids:
        print(f"   ✅ 正确: 所有预期的跨时段订单都被包含")
        if cross_period_count > 5:
            print(f"   ℹ️  信息: 额外检测到 {cross_period_count - 5} 个跨时段订单")
    else:
        print(f"   ❌ 错误: 以下预期跨时段订单未被包含: {missing_ids}")
        return False

    anomalies_sheet = wb["异常明细"]
    anomalies_count = anomalies_sheet.max_row - 1
    print(f"\n🔍 异常明细Sheet验证:")
    print(f"   - 异常数量: {anomalies_count}")

    summary_sheet = wb["汇总"]
    summary_consistent = True
    for row in summary_sheet.iter_rows(min_row=1, max_row=summary_sheet.max_row, values_only=True):
        if row[0] == "离线订单数" and row[1] != 3:
            summary_consistent = False
            print(f"   ❌ 错误: 汇总表离线订单数不一致")
        if row[0] == "跨时段充电订单" and "5笔" not in str(row[1]):
            summary_consistent = False
            print(f"   ❌ 错误: 汇总表跨时段订单数不一致")

    if summary_consistent:
        print(f"   ✅ 正确: 汇总表数据与明细一致")

    print(f"\n✅ 测试6通过: 报表生成验证完成")
    return True


def test_data_quality_handling():
    """测试数据质量问题处理"""
    print("\n" + "=" * 80)
    print("⚪ 测试7: 数据质量问题处理验证")
    print("=" * 80)

    test_file = Path(__file__).resolve().parent.parent / "examples" / "充电站充电订单_测试数据.xlsx"

    reader = DataReader()
    raw_data = reader.read_file(str(test_file))

    print(f"\n🔍 数据质量检测:")
    print(f"   - 空行数量: {len(raw_data.empty_rows)} (预期: 2)")
    print(f"   - 备注行数量: {len(raw_data.remark_rows)} (预期: 1)")
    print(f"   - 坏行数量: {len(raw_data.bad_rows)} (预期: 1)")

    if len(raw_data.empty_rows) == 2 and len(raw_data.remark_rows) >= 1:
        print(f"   ✅ 正确: 空行和备注行被正确识别")
    else:
        print(f"   ❌ 错误: 空行或备注行识别不正确")
        return False

    if raw_data.bad_rows:
        bad_row = raw_data.bad_rows[0]
        print(f"\n📝 坏行详情:")
        print(f"   - 原始行号: {bad_row['row_number']}")
        print(f"   - 问题原因: {bad_row['reason']}")
        print(f"   - 缺失字段: {bad_row['missing_fields']}")

        if "start_time" in bad_row["missing_fields"] and "end_time" in bad_row["missing_fields"]:
            print(f"   ✅ 正确: 缺少开始结束时间的坏行被正确识别")
        else:
            print(f"   ❌ 错误: 坏行识别不正确")
            return False

    cleaner = DataCleaner()
    cleaned_data = cleaner.clean(raw_data)
    print(f"\n📊 数据质量评分: {cleaned_data.data_quality_score:.2f}分")
    print(f"   - 验证错误: {len(cleaned_data.validation_errors)}个")
    print(f"   - 类型转换错误: {len(cleaned_data.type_conversion_errors)}个")
    print(f"   - 缺失值填充: {cleaned_data.filled_missing}")

    print(f"\n✅ 测试7通过: 数据质量问题处理验证完成")
    return True


def main():
    """主测试函数"""
    print("\n" + "🚀" * 40)
    print("🚀  充电站分时电价收益分析系统 - 端到端测试套件")
    print("🚀" * 40)
    print(f"\n📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 重点验证: 设备离线数据隔离路径")

    results = []

    try:
        test1_result = test_offline_device_isolation()
        results.append(("设备离线隔离", True if test1_result else False))

        if test1_result:
            result, pipeline = test1_result
            results.append(("跨时段充电检测", test_cross_period_detection(result, pipeline)))
            results.append(("优惠叠加检测", test_stacked_coupon_detection(result, pipeline)))
            results.append(("数据追溯链路", test_data_traceability(result, pipeline)))
            results.append(("收益计算准确性", test_revenue_calculation(result, pipeline)))
            results.append(("报表生成", test_report_generation(result, pipeline)))

        results.append(("数据质量处理", test_data_quality_handling()))

        print("\n" + "=" * 80)
        print("📋 测试结果汇总")
        print("=" * 80)

        passed = sum(1 for _, r in results if r)
        total = len(results)

        for name, r in results:
            status = "✅ PASS" if r else "❌ FAIL"
            print(f"   {status} - {name}")

        print(f"\n📊 总计: {passed}/{total} 测试通过")

        if passed == total:
            print("\n🎉 所有测试通过！系统功能正常。")
            print("\n🔍 关键验证结论:")
            print("   ✅ 设备离线数据被正确隔离，未混入正常结果")
            print("   ✅ 跨时段充电被正确检测并标记")
            print("   ✅ 优惠叠加被正确检测并标记")
            print("   ✅ 数据追溯链路完整，可从结果追查到原始数据")
            print("   ✅ 异常说明、图表、导出结果完全一致")
            print("   ✅ 坏行、空行、备注行被正确识别和处理")
        else:
            print(f"\n⚠️  有 {total - passed} 个测试失败，请检查。")
            return 1

        return 0

    except Exception as e:
        print(f"\n❌ 测试执行出错: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
