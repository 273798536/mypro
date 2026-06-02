import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


def generate_dirty_test_data(output_dir: str = "./test_data"):
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    np.random.seed(42)
    
    sku = "SKU-DIRTY-001"
    start_date = datetime(2025, 1, 1)
    dates = [start_date + timedelta(days=i) for i in range(180)]
    
    base_demand = 50
    demand_std = 15
    demands = np.random.normal(base_demand, demand_std, 180)
    demands = np.maximum(0, demands)
    
    demands[30] = 500
    demands[75] = 450
    demands[120] = 600
    
    demands[45] = -20
    demands[90] = np.nan
    demands[150] = np.nan
    
    sales_data = {
        'date': dates,
        'quantity': demands
    }
    sales_df = pd.DataFrame(sales_data)
    sales_df.loc[60, 'date'] = "bad-date-format"
    sales_df['quantity'] = sales_df['quantity'].astype(object)
    sales_df.loc[100, 'quantity'] = "not-a-number"
    sales_df.loc[150, 'quantity'] = ""
    
    sales_path = f"{output_dir}/sales_history_dirty.xlsx"
    sales_df.to_excel(sales_path, index=False)
    print(f"✅ 生成销售历史（脏数据）: {sales_path}")
    print(f"   - 包含极端值: 3个超大量订单(500, 450, 600)")
    print(f"   - 包含异常值: 1个负数(-20), 1个NaN, 1个空字符串")
    print(f"   - 包含格式错误: 1个错误日期格式, 1个非数字销量")
    print(f"   - 基础需求: 均值50, 标准差15")
    
    lead_times = np.random.gamma(shape=4, scale=2, size=50)
    lead_times = np.round(lead_times).astype(float)
    
    lead_times[10] = -5
    lead_times[25] = np.nan
    lead_times[40] = 60
    
    supply_data = {
        'lead_time': lead_times,
        'reliability': [0.75] * 50
    }
    supply_df = pd.DataFrame(supply_data)
    
    supply_path = f"{output_dir}/supply_cycle_dirty.xlsx"
    supply_df.to_excel(supply_path, index=False)
    print(f"\n✅ 生成供应周期（脏数据）: {supply_path}")
    print(f"   - 平均提前期: {np.nanmean([x for x in lead_times if x > 0]):.1f}天")
    print(f"   - 包含异常值: 1个负数(-5), 1个NaN, 1个极端值(60天)")
    print(f"   - 供应商可靠度: 75%（故意设低）")
    
    today = pd.Timestamp.now().normalize()
    inventory_data = {
        'current_stock': [-50],
        'safety_stock': [80],
        'reorder_point': [150],
        'reorder_quantity': [300],
        'unit_cost': [120.50],
        'last_restock_date': [(today - timedelta(days=10)).strftime('%Y-%m-%d')],
        'pending_order_qty_1': [200],
        'pending_order_eta_1': [(today - timedelta(days=5)).strftime('%Y-%m-%d')],
        'pending_order_qty_2': [300],
        'pending_order_eta_2': [(today + timedelta(days=3)).strftime('%Y-%m-%d')],
    }
    inventory_df = pd.DataFrame(inventory_data)
    
    inventory_path = f"{output_dir}/inventory_status_dirty.xlsx"
    inventory_df.to_excel(inventory_path, index=False)
    print(f"\n✅ 生成库存状态（脏数据）: {inventory_path}")
    print(f"   - 当前库存: -50件（故意设为负库存）")
    print(f"   - 安全库存: 80件")
    print(f"   - 订货点: 150件")
    print(f"   - 在途订单1: 200件, ETA={today - timedelta(days=5):%Y-%m-%d} (已延迟5天)")
    print(f"   - 在途订单2: 300件, ETA={today + timedelta(days=3):%Y-%m-%d}")
    print(f"   - 单位成本: ¥120.50")
    
    print("\n" + "=" * 60)
    print("脏样例数据说明:")
    print("=" * 60)
    print("此测试数据专门用于验证:")
    print("1. 极端需求值检测 - 3个远超均值的大订单")
    print("2. 负库存处理 - 期初库存为-50件")
    print("3. 延迟到货追踪 - 1笔订单已延迟5天")
    print("4. 数据质量检查 - 包含多种格式错误和异常值")
    print("5. 负库存与缺货区分 - 验证两者是否被错误合并")
    print("6. 供应商低可靠度 - 75%按时交付率")
    print("=" * 60)
    
    return {
        'sales_file': sales_path,
        'supply_file': supply_path,
        'inventory_file': inventory_path,
        'sku': sku
    }


def generate_clean_test_data(output_dir: str = "./test_data"):
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    np.random.seed(123)
    
    sku = "SKU-CLEAN-001"
    start_date = datetime(2025, 1, 1)
    dates = [start_date + timedelta(days=i) for i in range(180)]
    
    base_demand = 30
    demand_std = 8
    demands = np.random.poisson(base_demand, 180)
    
    sales_data = {'date': dates, 'quantity': demands}
    sales_df = pd.DataFrame(sales_data)
    sales_path = f"{output_dir}/sales_history_clean.xlsx"
    sales_df.to_excel(sales_path, index=False)
    print(f"✅ 生成销售历史（干净数据）: {sales_path}")
    
    lead_times = np.random.gamma(shape=9, scale=1.5, size=50)
    lead_times = np.round(lead_times).astype(int)
    supply_data = {'lead_time': lead_times, 'reliability': [0.92] * 50}
    supply_df = pd.DataFrame(supply_data)
    supply_path = f"{output_dir}/supply_cycle_clean.xlsx"
    supply_df.to_excel(supply_path, index=False)
    print(f"✅ 生成供应周期（干净数据）: {supply_path}")
    
    today = pd.Timestamp.now().normalize()
    inventory_data = {
        'current_stock': [450],
        'safety_stock': [50],
        'reorder_point': [300],
        'reorder_quantity': [500],
        'unit_cost': [85.00],
        'last_restock_date': [(today - timedelta(days=3)).strftime('%Y-%m-%d')],
    }
    inventory_df = pd.DataFrame(inventory_data)
    inventory_path = f"{output_dir}/inventory_status_clean.xlsx"
    inventory_df.to_excel(inventory_path, index=False)
    print(f"✅ 生成库存状态（干净数据）: {inventory_path}")
    
    return {
        'sales_file': sales_path,
        'supply_file': supply_path,
        'inventory_file': inventory_path,
        'sku': sku
    }


if __name__ == "__main__":
    print("生成测试数据...\n")
    print("-" * 60)
    print("第一组: 脏样例数据（用于验证问题检测）")
    print("-" * 60)
    dirty = generate_dirty_test_data()
    
    print("\n" + "-" * 60)
    print("第二组: 干净样例数据（用于对比验证）")
    print("-" * 60)
    clean = generate_clean_test_data()
    
    print("\n🎉 测试数据生成完成！")
    print("\n运行脏样例分析命令:")
    print(f"  python run_analysis.py --sales {dirty['sales_file']} --supply {dirty['supply_file']} --inventory {dirty['inventory_file']} --sku {dirty['sku']} --output ./output_dirty")
    print("\n运行干净样例分析命令:")
    print(f"  python run_analysis.py --sales {clean['sales_file']} --supply {clean['supply_file']} --inventory {clean['inventory_file']} --sku {clean['sku']} --output ./output_clean")
