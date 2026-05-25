import requests, json, time

data = {
    'records': [
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A01',
            'sku_id': 'SKU001',
            'sku_name': '正常商品',
            'quantity': 10,
            'is_hot_cell': False
        },
        {
            'cell_id': 'A02',
            'sku_id': 'SKU002',
            'sku_name': '缺少柜机ID',
            'quantity': 5
        },
        {
            'cabinet_id': 'CAB001',
            'sku_id': 'SKU003',
            'sku_name': '缺少格口ID',
            'quantity': 8
        },
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A04',
            'sku_name': '缺少SKU_ID',
            'quantity': 15
        },
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A05',
            'sku_id': 'SKU005',
            'sku_name': '缺少数量',
        },
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A06',
            'sku_id': 'SKU006',
            'sku_name': '数量为负',
            'quantity': -1
        },
    ]
}

response = requests.post('http://localhost:8000/api/import/inventory', json=data)
result = response.json()
print(f'任务创建: task_id={result["task_id"]}, status={result["status"]}, total={result["total_count"]}')

time.sleep(5)

response = requests.get(f'http://localhost:8000/api/tasks/{result["task_id"]}')
final = response.json()
print(f'处理完成: status={final["status"]}, success={final["success_count"]}, duplicate={final["duplicate_count"]}, error={final["error_count"]}')
total_calc = final["success_count"] + final["duplicate_count"] + final["error_count"]
print(f'总计: {final["total_count"]}, 计数守恒: {total_calc} == {final["total_count"]} -> {total_calc == final["total_count"]}')

print()
print('=== pending记录状态 ===')
if 'pending_records' in final:
    for pr in final['pending_records']:
        print(f'  行{pr["source_row_number"]}: {pr["status"]} - {pr.get("error_message", "")}')
else:
    print('  无pending_records字段')

print()
print('=== 处理日志(校验/人工相关) ===')
resp = requests.get(f'http://localhost:8000/api/tasks/{result["task_id"]}/logs')
logs = resp.json()
for log in logs:
    if '校验' in log['message'] or '人工' in log['message'] or '成功' in log['message']:
        print(f'  [{log["level"]}] {log["message"]}')
