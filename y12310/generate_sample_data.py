import pandas as pd
from datetime import datetime, timedelta
import os


def generate_sample_data():
    warehouses = pd.DataFrame([
        {
            "名称": "中心仓库A",
            "地址": "北京市朝阳区",
            "纬度": 39.9042,
            "经度": 116.4074,
            "最大容量": 10000
        },
        {
            "名称": "分拨中心B",
            "地址": "北京市海淀区",
            "纬度": 39.9599,
            "经度": 116.2981,
            "最大容量": 5000
        },
        {
            "名称": "郊区仓库C",
            "地址": "北京市通州区",
            "纬度": 39.9085,
            "经度": 116.6568,
            "最大容量": 8000
        }
    ])
    
    warehouse_ids = ["wh_001", "wh_002", "wh_003"]
    
    inventories = pd.DataFrame([
        {"仓库名称": "中心仓库A", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 2000, "单位": "件"},
        {"仓库名称": "中心仓库A", "SKU": "SKU002", "商品名称": "方便面袋装", "数量": 1500, "单位": "件"},
        {"仓库名称": "中心仓库A", "SKU": "SKU003", "商品名称": "牛奶250ml", "数量": 1800, "单位": "件"},
        {"仓库名称": "分拨中心B", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 1200, "单位": "件"},
        {"仓库名称": "分拨中心B", "SKU": "SKU002", "商品名称": "方便面袋装", "数量": 800, "单位": "件"},
        {"仓库名称": "郊区仓库C", "SKU": "SKU003", "商品名称": "牛奶250ml", "数量": 1000, "单位": "件"},
        {"仓库名称": "郊区仓库C", "SKU": "SKU004", "商品名称": "面包切片", "数量": 600, "单位": "件"}
    ])
    
    stores = pd.DataFrame([
        {"名称": "朝阳门店", "地址": "北京市朝阳区建国路", "纬度": 39.9142, "经度": 116.4374, "优先级": 1},
        {"名称": "海淀门店", "地址": "北京市海淀区中关村", "纬度": 39.9699, "经度": 116.3281, "优先级": 2},
        {"名称": "通州门店", "地址": "北京市通州区新华大街", "纬度": 39.9185, "经度": 116.6768, "优先级": 1},
        {"名称": "西城门店", "地址": "北京市西城区西单", "纬度": 39.9147, "经度": 116.3789, "优先级": 3},
        {"名称": "东城门店", "地址": "北京市东城区王府井", "纬度": 39.9137, "经度": 116.4109, "优先级": 2}
    ])
    
    store_ids = ["st_001", "st_002", "st_003", "st_004", "st_005"]
    
    today = datetime.now()
    demands = pd.DataFrame([
        {"门店名称": "朝阳门店", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 800, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "朝阳门店", "SKU": "SKU002", "商品名称": "方便面袋装", "数量": 500, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "朝阳门店", "SKU": "SKU003", "商品名称": "牛奶250ml", "数量": 600, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "urgent"},
        {"门店名称": "海淀门店", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 600, "单位": "件", "截止时间": today + timedelta(days=2), "紧急程度": "normal"},
        {"门店名称": "海淀门店", "SKU": "SKU002", "商品名称": "方便面袋装", "数量": 400, "单位": "件", "截止时间": today + timedelta(days=2), "紧急程度": "normal"},
        {"门店名称": "通州门店", "SKU": "SKU003", "商品名称": "牛奶250ml", "数量": 700, "单位": "件", "截止时间": today + timedelta(hours=12), "紧急程度": "urgent"},
        {"门店名称": "通州门店", "SKU": "SKU004", "商品名称": "面包切片", "数量": 300, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "西城门店", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 400, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "西城门店", "SKU": "SKU002", "商品名称": "方便面袋装", "数量": 300, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "东城门店", "SKU": "SKU001", "商品名称": "矿泉水500ml", "数量": 500, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "normal"},
        {"门店名称": "东城门店", "SKU": "SKU003", "商品名称": "牛奶250ml", "数量": 400, "单位": "件", "截止时间": today + timedelta(days=1), "紧急程度": "urgent"}
    ])
    
    vehicles = pd.DataFrame([
        {"车牌号": "京A12345", "车型": "van", "最大容量": 500, "容量单位": "件", "最大载重": 2000, "重量单位": "kg", "可用": True, "所属仓库ID": "wh_001"},
        {"车牌号": "京B67890", "车型": "truck", "最大容量": 1000, "容量单位": "件", "最大载重": 5000, "重量单位": "kg", "可用": True, "所属仓库ID": "wh_001"},
        {"车牌号": "京C11111", "车型": "van", "最大容量": 500, "容量单位": "件", "最大载重": 2000, "重量单位": "kg", "可用": True, "所属仓库ID": "wh_002"},
        {"车牌号": "京D22222", "车型": "van", "最大容量": 500, "容量单位": "件", "最大载重": 2000, "重量单位": "kg", "可用": True, "所属仓库ID": "wh_003"}
    ])
    
    output_dir = "data/samples"
    os.makedirs(output_dir, exist_ok=True)
    
    filepath = os.path.join(output_dir, "示例数据.xlsx")
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        warehouses.to_excel(writer, sheet_name="仓库", index=False)
        inventories.to_excel(writer, sheet_name="库存", index=False)
        stores.to_excel(writer, sheet_name="门店", index=False)
        demands.to_excel(writer, sheet_name="需求", index=False)
        vehicles.to_excel(writer, sheet_name="车辆", index=False)
    
    print(f"✓ 示例数据已生成: {filepath}")
    print(f"  - 仓库: {len(warehouses)} 个")
    print(f"  - 库存记录: {len(inventories)} 条")
    print(f"  - 门店: {len(stores)} 个")
    print(f"  - 需求记录: {len(demands)} 条")
    print(f"  - 车辆: {len(vehicles)} 辆")
    
    return filepath


if __name__ == "__main__":
    generate_sample_data()
