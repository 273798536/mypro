import json
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_delivery_import():
    print("=== 导入外协送货单 ===")
    
    delivery_data = [
        {
            "order_no": "DEL20240501001",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "quantity": 1000,
            "unit": "件",
            "delivery_date": "2024-05-01",
            "supplier": "宏达加工厂",
            "workshop": "机加工车间",
            "receiver": "张三",
            "remark": "首批送货"
        },
        {
            "order_no": "DEL20240501002",
            "batch_no": "BATCH002",
            "product_name": "不锈钢支架",
            "product_code": "SS-002",
            "quantity": 500,
            "unit": "件",
            "delivery_date": "2024-05-02",
            "supplier": "精工五金",
            "workshop": "组装车间",
            "receiver": "李四",
            "remark": ""
        },
        {
            "order_no": "DEL20240501003",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "quantity": -50,
            "unit": "件",
            "delivery_date": "2024-05-03",
            "supplier": "宏达加工厂",
            "workshop": "机加工车间",
            "receiver": "张三",
            "remark": "数量负数异常"
        },
        {
            "order_no": "DEL20240501004",
            "batch_no": "BATCH003",
            "product_name": None,
            "product_code": "PL-003",
            "quantity": None,
            "unit": "件",
            "delivery_date": None,
            "supplier": "诚信塑料",
            "workshop": "注塑车间",
            "receiver": "王五",
            "remark": "缺少关键字段"
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/delivery/import", json=delivery_data)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_repair_import():
    print("\n=== 导入返修记录 ===")
    
    repair_data = [
        {
            "repair_no": "REP20240505001",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "repair_type": "尺寸偏差",
            "repair_quantity": 100,
            "return_quantity": 95,
            "unit": "件",
            "repair_date": "2024-05-05",
            "return_date": "2024-05-06",
            "supplier": "宏达加工厂",
            "defect_reason": "加工尺寸偏大",
            "responsible_party": "供应商"
        },
        {
            "repair_no": "REP20240507001",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "repair_type": "表面划痕",
            "repair_quantity": 50,
            "return_quantity": 48,
            "unit": "件",
            "repair_date": "2024-05-07",
            "return_date": "2024-05-08",
            "supplier": "宏达加工厂",
            "defect_reason": "运输过程划伤",
            "responsible_party": "物流"
        },
        {
            "repair_no": "REP20240508001",
            "batch_no": "BATCH002",
            "product_name": "不锈钢支架",
            "product_code": "SS-002",
            "repair_type": "焊接不良",
            "repair_quantity": 30,
            "return_quantity": 50,
            "unit": "件",
            "repair_date": "2024-05-08",
            "return_date": "2024-05-09",
            "supplier": "精工五金",
            "defect_reason": "焊缝开裂",
            "responsible_party": "供应商"
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/repair/import", json=repair_data)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_deduction_import():
    print("\n=== 导入扣款明细 ===")
    
    deduction_data = [
        {
            "deduction_no": "DED20240506001",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "deduction_type": "返修扣款",
            "quantity": 100,
            "unit_price": 10,
            "amount": 1000,
            "deduction_date": "2024-05-06",
            "supplier": "宏达加工厂",
            "reason": "尺寸偏差返修",
            "related_order": "REP20240505001"
        },
        {
            "deduction_no": "DED20240509001",
            "batch_no": "BATCH002",
            "product_name": "不锈钢支架",
            "product_code": "SS-002",
            "deduction_type": "返修扣款",
            "quantity": 30,
            "unit_price": 15,
            "amount": 450,
            "deduction_date": "2024-05-09",
            "supplier": "精工五金",
            "reason": "焊接不良返修",
            "related_order": "REP20240508001"
        },
        {
            "deduction_no": "DED20240510001",
            "batch_no": "BATCH001",
            "product_name": "铝合金外壳",
            "product_code": "ALU-001",
            "deduction_type": "返修扣款",
            "quantity": 50,
            "unit_price": 10,
            "amount": 600,
            "deduction_date": "2024-05-10",
            "supplier": "宏达加工厂",
            "reason": "表面划痕返修-金额错误",
            "related_order": "REP20240507001"
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/deduction/import", json=deduction_data)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_refund_import():
    print("\n=== 导入退款流水 ===")
    
    refund_data = [
        {
            "refund_no": "REF20240510001",
            "batch_no": "BATCH001",
            "related_deduction": "DED20240506001",
            "amount": 200,
            "refund_date": "2024-05-10",
            "supplier": "宏达加工厂",
            "reason": "协商退款部分",
            "payment_method": "银行转账"
        },
        {
            "refund_no": "REF20240511001",
            "batch_no": "BATCH002",
            "related_deduction": "DED20240509001",
            "amount": 100,
            "refund_date": "2024-05-11",
            "supplier": "精工五金",
            "reason": "质量问题补偿",
            "payment_method": "抵扣货款"
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/refund/import", json=refund_data)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_get_dirty_records():
    print("\n=== 获取脏记录列表 ===")
    response = requests.get(f"{BASE_URL}/api/dirty/list")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_reconcile():
    print("\n=== 执行对账 ===")
    response = requests.post(f"{BASE_URL}/api/reconcile", json={})
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_get_reconciliation_list():
    print("\n=== 对账结果列表 ===")
    response = requests.get(f"{BASE_URL}/api/reconciliation/list")
    result = response.json()
    print(f"总记录数: {result['count']}")
    for r in result['data']:
        print(f"  {r['recon_no']} - {r['batch_no']} - 差异:{'是' if r['has_discrepancy'] else '否'} - {r['status']}")
    return result

def test_get_reconciliation_detail(recon_no):
    print(f"\n=== 对账详情 {recon_no} ===")
    response = requests.get(f"{BASE_URL}/api/reconciliation/{recon_no}")
    result = response.json()
    print(json.dumps(result['summary'], ensure_ascii=False, indent=2))
    print("明细记录数:", len(result['details']))
    return result

def test_export(recon_no):
    print(f"\n=== 导出对账结果 {recon_no} ===")
    response = requests.get(f"{BASE_URL}/api/export/{recon_no}")
    filename = f"export_{recon_no}.csv"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"已导出到 {filename}")
    print("文件内容预览:")
    print(response.text[:500])
    return filename

def test_fix_record(table_name, record_id, updates):
    print(f"\n=== 修正记录 {table_name} id={record_id} ===")
    response = requests.post(f"{BASE_URL}/api/record/fix", json={
        "id": record_id,
        "table_name": table_name,
        "updates": updates,
        "operator": "test_user"
    })
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_operation_logs():
    print("\n=== 操作日志 ===")
    response = requests.get(f"{BASE_URL}/api/logs")
    result = response.json()
    print(f"日志总数: {result['count']}")
    for l in result['data'][:5]:
        print(f"  {l['operation_time']} - {l['operation_type']} - {l['table_name']} - {l['operator']}")
    return result

def main():
    print("=" * 60)
    print("外协加工对账验收回放链路服务 - 测试脚本")
    print("=" * 60)
    
    try:
        requests.get(f"{BASE_URL}/api/health")
        print("服务连接正常\n")
    except:
        print("错误: 无法连接到服务，请先启动服务")
        print("启动命令: python main.py 或 uvicorn main:app --reload")
        sys.exit(1)
    
    test_delivery_import()
    test_repair_import()
    test_deduction_import()
    test_refund_import()
    
    dirty_result = test_get_dirty_records()
    
    if dirty_result['count'] > 0:
        print(f"\n发现 {dirty_result['count']} 条脏记录")
        for dr in dirty_result['data'][:1]:
            if dr['table'] == 'delivery_orders' and '数量' in dr['dirty_reason']:
                test_fix_record('delivery_orders', dr['id'], {"quantity": 50})
    
    reconcile_result = test_reconcile()
    
    list_result = test_get_reconciliation_list()
    
    if list_result['data']:
        recon_no = list_result['data'][0]['recon_no']
        test_get_reconciliation_detail(recon_no)
        test_export(recon_no)
    
    test_operation_logs()
    
    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
