#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils import DataManager
from app.algorithms import LinearProgrammingOptimizer, ReportGenerator


def test_full_workflow():
    print("=" * 60)
    print("🧪 线性规划仓储分拨系统 - 完整流程测试")
    print("=" * 60)
    
    dm = DataManager()
    optimizer = LinearProgrammingOptimizer(dm)
    reporter = ReportGenerator()
    
    print("\n1️⃣  生成示例数据...")
    from generate_sample_data import generate_sample_data
    sample_file = generate_sample_data()
    
    print(f"\n2️⃣  从Excel导入数据...")
    try:
        version_id = dm.import_from_excel(sample_file, source="test_script")
        print(f"   ✓ 数据导入成功，版本号: {version_id}")
    except Exception as e:
        print(f"   ✗ 数据导入失败: {e}")
        return False
    
    print(f"\n3️⃣  数据概览:")
    print(f"   - 仓库数量: {len(dm.warehouses)}")
    print(f"   - 门店数量: {len(dm.stores)}")
    print(f"   - 库存记录: {sum(len(v) for v in dm.inventories.values())}")
    print(f"   - 需求记录: {sum(len(v) for v in dm.demands.values())}")
    
    print(f"\n4️⃣  运行线性规划优化...")
    result = optimizer.optimize()
    
    if result.success:
        print(f"   ✓ 优化成功!")
        print(f"   - 总运输成本: {result.total_cost:.2f}")
        print(f"   - 分拨条数: {len(result.assignments)}")
        print(f"   - 求解时间: {result.solve_time:.3f} 秒")
    else:
        print(f"   ✗ 优化失败: {result.message}")
    
    print(f"\n5️⃣  冲突检测结果:")
    if result.conflicts:
        for i, conflict in enumerate(result.conflicts, 1):
            severity_icon = "🔴" if conflict["severity"] == "error" else "🟠" if conflict["severity"] == "warning" else "🔵"
            print(f"   {severity_icon} [{i}] {conflict['description']}")
            print(f"      影响: {conflict['impact']}")
    else:
        print("   ✓ 无冲突")
    
    print(f"\n6️⃣  分拨方案预览 (前5条):")
    for i, assign in enumerate(result.assignments[:5], 1):
        print(f"   {i}. {assign['warehouse_name']} → {assign['store_name']}")
        print(f"      商品: {assign['sku_name']}, 数量: {assign['quantity']:.2f}")
    
    if len(result.assignments) > 5:
        print(f"   ... 还有 {len(result.assignments) - 5} 条分拨记录")
    
    print(f"\n7️⃣  生成Excel报告...")
    try:
        report_file = reporter.generate_excel_report(result, dm)
        print(f"   ✓ 报告已生成: {report_file}")
    except Exception as e:
        print(f"   ✗ 报告生成失败: {e}")
    
    print(f"\n8️⃣  保存优化结果...")
    result_path = f"data/results/test_result_{version_id}.json"
    os.makedirs(os.path.dirname(result_path), exist_ok=True)
    optimizer.save_result(result, result_path)
    print(f"   ✓ 结果已保存: {result_path}")
    
    print("\n" + "=" * 60)
    print("✅ 测试完成! 系统运行正常")
    print("=" * 60)
    print("\n💡 下一步:")
    print("   1. 运行 'python run.py' 启动Web界面")
    print("   2. 访问 http://localhost:5000 使用系统")
    print("   3. 使用 data/samples/示例数据.xlsx 进行测试")
    
    return True


if __name__ == "__main__":
    success = test_full_workflow()
    sys.exit(0 if success else 1)
