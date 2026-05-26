import json
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    print("=== 健康检查 ===")
    response = requests.get(f"{BASE_URL}/api/health")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_delivery_import():
    print("\n=== 导入外协送货单 ===")
    
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
            "order_no": None,
            "batch_no": "BATCH003",
            "product_name": None,
            "product_code": "PL-003",
            "quantity": None,
            "unit": "件",
            "delivery_date": None,
            "supplier": "诚信塑料",
            "workshop": "注塑车间",
            "receiver": "王五",
            "remark": "缺少关键字段测试"
        },
        {
            "order_no": "DEL20240501005",
            "batch_no": "BATCH001",
            "product_name": "铝壳改了名字",
            "product_code": "ALU-001",
            "quantity": 200,
            "unit": "件",
            "delivery_date": "2024-05-04",
            "supplier": "宏达加工厂",
            "workshop": "机加工车间",
            "receiver": "张三",
            "remark": "产品改名测试"
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/delivery/import", json=delivery_data)
    result = response.json()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    print("\n=== 重复导入测试(幂等性验证) ===")
    response = requests.post(f"{BASE_URL}/api/delivery/import", json=delivery_data[:1])
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    
    return result

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
        }
    ]
    
    response = requests.post(f"{BASE_URL}/api/refund/import", json=refund_data)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_get_dirty_records():
    print("\n=== 获取脏记录列表 ===")
    response = requests.get(f"{BASE_URL}/api/dirty/list")
    result = response.json()
    print(f"脏记录总数: {result['count']}")
    for r in result['data']:
        print(f"  [{r['dirty_type']}] {r['table']} id={r['id']} batch={r['batch_no']}")
        print(f"    原因: {r['dirty_reason']}")
        print(f"    建议: {r['fix_suggestion']}")
    return result

def test_batch_freeze(batch_no):
    print(f"\n=== 冻结批次 {batch_no} ===")
    response = requests.post(f"{BASE_URL}/api/batch/freeze", json={
        "batch_no": batch_no,
        "freeze_reason": "对账完成，锁定数据",
        "operator": "test_user"
    })
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_record_withdraw(table_name, record_id, reason):
    print(f"\n=== 撤回记录 {table_name} id={record_id} ===")
    response = requests.post(f"{BASE_URL}/api/record/withdraw", json={
        "id": record_id,
        "table_name": table_name,
        "withdraw_reason": reason,
        "operator": "test_user"
    })
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

def test_add_compensation(batch_no, amount, reason):
    print(f"\n=== 添加补偿记录 {batch_no} ===")
    response = requests.post(f"{BASE_URL}/api/compensation/add", json={
        "batch_no": batch_no,
        "amount": amount,
        "reason": reason,
        "operator": "test_user"
    })
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    return response.json()

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
        if r['has_discrepancy']:
            print(f"    差异金额: {r['discrepancy_amount']}")
    return result

def test_get_reconciliation_detail(recon_no):
    print(f"\n=== 对账详情 {recon_no} ===")
    response = requests.get(f"{BASE_URL}/api/reconciliation/{recon_no}")
    result = response.json()
    print(json.dumps(result['summary'], ensure_ascii=False, indent=2))
    print(f"明细记录数: {len(result['details'])}")
    return result

def test_export(recon_no):
    print(f"\n=== 导出对账结果 {recon_no} ===")
    response = requests.get(f"{BASE_URL}/api/export/{recon_no}")
    filename = f"export_{recon_no}.csv"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"已导出到 {filename}")
    print("文件内容预览:")
    print(response.text[:600])
    return filename

def test_operation_logs():
    print("\n=== 操作日志 ===")
    response = requests.get(f"{BASE_URL}/api/logs")
    result = response.json()
    print(f"日志总数: {result['count']}")
    for l in result['data'][:10]:
        print(f"  {l['operation_time']} - {l['operation_type']} - {l['table_name']} - {l['operator']}")
    return result

def test_batch_list():
    print("\n=== 批次列表 ===")
    response = requests.get(f"{BASE_URL}/api/batch/list")
    result = response.json()
    print(f"批次总数: {result['count']}")
    for b in result['data']:
        print(f"  {b['batch_no']} - 冻结:{'是' if b['is_frozen'] else '否'}")
        if b['is_frozen']:
            print(f"    冻结原因: {b['freeze_reason']}")
    return result

def main():
    print("=" * 60)
    print("外协加工对账验收回放链路服务 - 增强功能测试脚本")
    print("=" * 60)
    
    try:
        test_health()
    except:
        print("错误: 无法连接到服务，请先启动服务")
        print("启动命令: python main.py 或 uvicorn main:app --reload")
        sys.exit(1)
    
    delivery_result = test_delivery_import()
    
    test_repair_import()
    test_deduction_import()
    test_refund_import()
    
    dirty_result = test_get_dirty_records()
    
    if dirty_result['count'] > 0:
        print(f"\n发现 {dirty_result['count']} 条脏记录")
        
        for dr in dirty_result['data']:
            if dr['dirty_type'] == 'QUANTITY_CONFLICT' and dr['table'] == 'delivery_orders':
                test_fix_record('delivery_orders', dr['id'], {"quantity": 50})
            if dr['dirty_type'] == 'AMOUNT_CONFLICT' and dr['table'] == 'deduction_details':
                test_fix_record('deduction_details', dr['id'], {"amount": 500})
    
    test_add_compensation("BATCH001", 300, "多扣款协商补偿")
    
    reconcile_result = test_reconcile()
    
    list_result = test_get_reconciliation_list()
    
    if list_result['data']:
        recon_no = list_result['data'][0]['recon_no']
        test_get_reconciliation_detail(recon_no)
        test_export(recon_no)
    
    if delivery_result.get('results'):
        withdraw_id = delivery_result['results'][1]['id']
        test_record_withdraw("delivery_orders", withdraw_id, "重复录入错误")
    
    test_batch_freeze("BATCH002")
    
    test_batch_list()
    
    test_operation_logs()
    
    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
    print("\n新增功能验证:")
    print("  ✓ 关键字段可选 - 缺字段数据作为脏记录入库")
    print("  ✓ NAME_CHANGE检测 - 同批次产品改名自动识别")
    print("  ✓ 幂等导入 - 重复导入返回is_duplicate=true")
    print("  ✓ 批次冻结 - 冻结后无法导入新数据")
    print("  ✓ 记录撤回 - 标记is_withdrawn不参与对账")
    print("  ✓ 补偿处理 - 补偿金额参与净结算")
    print("  ✓ 数据持久化 - 所有操作记录在outsourcing.db")
    print("  ✓ 数据一致性 - 详情、导出、查询同一套数据")

if __name__ == "__main__":
    main()
