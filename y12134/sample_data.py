import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import HISTORY_DAYS, NEW_PRODUCT_DAYS


def generate_sample_sku_data():
    today = datetime.now()
    new_product_launch = (today - timedelta(days=15)).strftime('%Y-%m-%d')
    
    sku_data = [
        {'sku_id': 'SKU001', 'sku_name': '高端无线耳机', 'category': '电子产品', 'sub_category': '音频',
         'launch_date': '2025-01-15', 'cost': 150.0, 'status': 'active'},
        {'sku_id': 'SKU002', 'sku_name': '智能手表Pro', 'category': '电子产品', 'sub_category': '穿戴',
         'launch_date': '2025-02-20', 'cost': 300.0, 'status': 'active'},
        {'sku_id': 'SKU003', 'sku_name': 'USB-C数据线', 'category': '配件', 'sub_category': '线材',
         'launch_date': '2024-06-10', 'cost': 5.0, 'status': 'active'},
        {'sku_id': 'SKU004', 'sku_name': '手机保护壳', 'category': '配件', 'sub_category': '保护',
         'launch_date': '2024-08-15', 'cost': 8.0, 'status': 'active'},
        {'sku_id': 'SKU005', 'sku_name': '便携充电宝', 'category': '电子产品', 'sub_category': '电源',
         'launch_date': '2024-09-01', 'cost': 45.0, 'status': 'active'},
        {'sku_id': 'SKU006', 'sku_name': '蓝牙耳机入门版', 'category': '电子产品', 'sub_category': '音频',
         'launch_date': new_product_launch, 'cost': 50.0, 'status': 'new'},
        {'sku_id': 'SKU007', 'sku_name': '快充充电器', 'category': '配件', 'sub_category': '电源',
         'launch_date': '2024-11-20', 'cost': 25.0, 'status': 'active'},
        {'sku_id': 'SKU008', 'sku_name': '屏幕保护膜', 'category': '配件', 'sub_category': '保护',
         'launch_date': '2024-07-05', 'cost': 3.0, 'status': 'active'},
        {'sku_id': 'SKU009', 'sku_name': '机械键盘', 'category': '电子产品', 'sub_category': '输入',
         'launch_date': '2025-03-10', 'cost': 120.0, 'status': 'active'},
        {'sku_id': 'SKU010', 'sku_name': '无线鼠标', 'category': '电子产品', 'sub_category': '输入',
         'launch_date': '2024-10-01', 'cost': 35.0, 'status': 'active'},
    ]
    return pd.DataFrame(sku_data)


def generate_margin_data():
    margin_data = [
        {'sku_id': 'SKU001', 'base_price': 299.0, 'promotion_price': 249.0, 'gross_margin_pct': 0.498},
        {'sku_id': 'SKU002', 'base_price': 599.0, 'promotion_price': 549.0, 'gross_margin_pct': 0.499},
        {'sku_id': 'SKU003', 'base_price': 19.9, 'promotion_price': 14.9, 'gross_margin_pct': 0.749},
        {'sku_id': 'SKU004', 'base_price': 29.9, 'promotion_price': 19.9, 'gross_margin_pct': 0.732},
        {'sku_id': 'SKU005', 'base_price': 89.0, 'promotion_price': 79.0, 'gross_margin_pct': 0.494},
        {'sku_id': 'SKU006', 'base_price': 99.0, 'promotion_price': 89.0, 'gross_margin_pct': 0.495},
        {'sku_id': 'SKU007', 'base_price': 59.0, 'promotion_price': 49.0, 'gross_margin_pct': 0.576},
        {'sku_id': 'SKU008', 'base_price': 12.9, 'promotion_price': 9.9, 'gross_margin_pct': 0.767},
        {'sku_id': 'SKU009', 'base_price': 299.0, 'promotion_price': 279.0, 'gross_margin_pct': 0.599},
        {'sku_id': 'SKU010', 'base_price': 79.0, 'promotion_price': 69.0, 'gross_margin_pct': 0.557},
    ]
    return pd.DataFrame(margin_data)


def generate_promotion_calendar():
    today = datetime.now()
    base_date = today - timedelta(days=HISTORY_DAYS)
    new_product_launch = today - timedelta(days=15)
    
    promotions = [
        {'promo_id': 'PROMO001', 'promo_name': '平台大促', 'start_date': base_date + timedelta(days=30),
         'end_date': base_date + timedelta(days=40), 'sku_list': ['SKU001', 'SKU002', 'SKU005'],
         'discount_pct': 0.15, 'type': 'platform'},
        {'promo_id': 'PROMO002', 'promo_name': '品牌日', 'start_date': base_date + timedelta(days=50),
         'end_date': base_date + timedelta(days=52), 'sku_list': ['SKU001', 'SKU009'],
         'discount_pct': 0.20, 'type': 'brand'},
        {'promo_id': 'PROMO003', 'promo_name': '清仓特惠', 'start_date': base_date + timedelta(days=10),
         'end_date': base_date + timedelta(days=15), 'sku_list': ['SKU003', 'SKU008'],
         'discount_pct': 0.25, 'type': 'clearance'},
        {'promo_id': 'PROMO004', 'promo_name': '新品首发', 'start_date': new_product_launch,
         'end_date': new_product_launch + timedelta(days=7), 'sku_list': ['SKU006'],
         'discount_pct': 0.10, 'type': 'new_product'},
    ]
    return pd.DataFrame(promotions)


def generate_sales_history():
    np.random.seed(42)
    today = datetime.now()
    base_date = today - timedelta(days=HISTORY_DAYS)
    new_product_launch = today - timedelta(days=15)
    
    sku_base_volumes = {
        'SKU001': 50, 'SKU002': 30, 'SKU003': 200, 'SKU004': 150, 'SKU005': 80,
        'SKU006': 20, 'SKU007': 100, 'SKU008': 180, 'SKU009': 40, 'SKU010': 90
    }
    
    sales_records = []
    for sku_id, base_vol in sku_base_volumes.items():
        for day in range(HISTORY_DAYS):
            sale_date = base_date + timedelta(days=day)
            
            if sku_id == 'SKU006' and sale_date < new_product_launch:
                continue
                
            daily_sales = int(np.random.normal(base_vol, base_vol * 0.2))
            daily_sales = max(0, daily_sales)
            
            is_promo = False
            if sku_id in ['SKU001', 'SKU002', 'SKU005'] and 30 <= day <= 40:
                daily_sales = int(daily_sales * 2.5)
                is_promo = True
            if sku_id in ['SKU001', 'SKU009'] and 50 <= day <= 52:
                daily_sales = int(daily_sales * 2.0)
                is_promo = True
            if sku_id in ['SKU003', 'SKU008'] and 10 <= day <= 15:
                daily_sales = int(daily_sales * 1.8)
                is_promo = True
            
            returns = 0
            if day == 45 and sku_id in ['SKU001', 'SKU002']:
                returns = int(daily_sales * 0.25)
            
            sales_records.append({
                'date': sale_date.strftime('%Y-%m-%d'),
                'sku_id': sku_id,
                'quantity': daily_sales,
                'returns': returns,
                'is_promotion': is_promo
            })
    
    return pd.DataFrame(sales_records)


def create_sample_excel(file_path='data/sample_data.xlsx'):
    import os
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
        generate_sample_sku_data().to_excel(writer, sheet_name='SKU资料', index=False)
        generate_margin_data().to_excel(writer, sheet_name='毛利率', index=False)
        generate_promotion_calendar().to_excel(writer, sheet_name='促销日历', index=False)
        generate_sales_history().to_excel(writer, sheet_name='销售历史', index=False)
    
    return file_path


if __name__ == '__main__':
    file_path = create_sample_excel()
    print(f"样例数据已生成: {file_path}")
