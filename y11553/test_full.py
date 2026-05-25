import requests, json, time, os, sqlite3

print("=" * 60)
print("TEST 1: 验证必填字段校验功能")
print("=" * 60)

data = {
    'records': [
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A01',
            'sku_id': 'SKU001',
            'sku_name': '正常商品',
            'quantity': 10,
        },
        {
            'cell_id': 'A02',
            'sku_id': 'SKU002',
            'quantity': 5,
        },
        {
            'cabinet_id': 'CAB001',
            'cell_id': 'A03',
            'sku_id': 'SKU003',
        },
    ]
}

response = requests.post('http://localhost:8000/api/import/inventory', json=data)
result = response.json()
task_id1 = result['task_id']
print(f'任务ID: {task_id1}')
print(f'初始状态: {result["status"]}, 总数: {result["total_count"]}')

time.sleep(5)

response = requests.get(f'http://localhost:8000/api/tasks/{task_id1}')
final = response.json()

print()
print(f'处理完成: status={final["status"]}, success={final["success_count"]}, duplicate={final["duplicate_count"]}, error={final["error_count"]}')
calc_total = final["success_count"] + final["duplicate_count"] + final["error_count"]
print(f'计数守恒: {calc_total} == {final["total_count"]} -> {"✅" if calc_total == final["total_count"] else "❌"}')

assert final["status"] == "waiting_manual", f"预期状态为waiting_manual，实际为{final['status']}"
assert final["success_count"] == 1, f"预期成功1条，实际{final['success_count']}"
assert final["error_count"] == 2, f"预期错误2条，实际{final['error_count']}"
print("✅ TEST 1 通过: 校验功能正常，状态正确")

print()
print("=" * 60)
print("TEST 2: 验证pending_records明细")
print("=" * 60)

for pr in final['pending_records']:
    print(f'  行{pr["source_row_number"]}: {pr["status"]} - {pr.get("error_message", "") or "无错误"}')

success_pr = [pr for pr in final['pending_records'] if pr['status'] == 'success']
manual_pr = [pr for pr in final['pending_records'] if pr['status'] == 'waiting_manual']
assert len(success_pr) == 1, "应有1条成功记录"
assert len(manual_pr) == 2, "应有2条等待人工处理记录"
print("✅ TEST 2 通过: pending_records明细正确")

print()
print("=" * 60)
print("TEST 3: 模拟脏数据场景 - task_be8a84837e774e31")
print("=" * 60)

db_path = os.path.join(os.path.dirname(__file__), 'data', 'replay_service.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    INSERT OR IGNORE INTO import_tasks 
    (task_id, record_type, source_type, source_file, status, total_count, success_count, duplicate_count, error_count, retry_times, max_retry_times, created_at, updated_at)
    VALUES 
    ('task_be8a84837e774e31', 'inventory', 'api', NULL, 'completed', 1, 0, 0, 1, 0, 3, datetime('now'), datetime('now'))
""")
conn.commit()
conn.close()

print("已插入脏数据: task_be8a84837e774e31 (status=completed, total=1, success=0, error=1, 无pending记录)")

print()
print("重启服务以触发数据库修复...")
os.system("pkill -f 'python3 run.py' 2>/dev/null")
time.sleep(2)

import subprocess
proc = subprocess.Popen(['python3', 'run.py'], cwd='/Users/mac/pro/solo/workspaces/y11553')
time.sleep(4)

response = requests.get('http://localhost:8000/api/tasks/task_be8a84837e774e31')
final = response.json()

print()
print(f'修复后: status={final["status"]}, total={final["total_count"]}, success={final["success_count"]}, error={final["error_count"]}')
print(f'pending记录数: {len(final["pending_records"])}')
for pr in final['pending_records']:
    print(f'  行{pr["source_row_number"]}: {pr["status"]}')

assert final["status"] == "waiting_manual", f"脏数据应修复为waiting_manual，实际为{final['status']}"
assert len(final["pending_records"]) == 1, "应为1条pending记录"
assert final["pending_records"][0]["status"] == "waiting_manual", "pending记录应为waiting_manual状态"
print("✅ TEST 3 通过: 脏数据修复正确")

print()
print("=" * 60)
print("TEST 4: 验证正常数据与重复数据")
print("=" * 60)

data = {
    'records': [
        {
            'cabinet_id': 'CAB002',
            'cell_id': 'B01',
            'sku_id': 'SKU101',
            'sku_name': '测试商品1',
            'quantity': 20,
        },
        {
            'cabinet_id': 'CAB002',
            'cell_id': 'B02',
            'sku_id': 'SKU102',
            'sku_name': '测试商品2',
            'quantity': 30,
        },
    ]
}

response = requests.post('http://localhost:8000/api/import/inventory', json=data)
task_id2 = response.json()['task_id']
print(f'正常数据任务: {task_id2}')

time.sleep(4)

final = requests.get(f'http://localhost:8000/api/tasks/{task_id2}').json()
print(f'处理完成: status={final["status"]}, success={final["success_count"]}, duplicate={final["duplicate_count"]}, error={final["error_count"]}')
assert final["status"] == "completed", "正常数据应标记为completed"
assert final["success_count"] == 2, "应成功2条"
print("✅ TEST 4.1 通过: 正常数据处理正确")

# 导入重复数据
dup_data = {'records': [data['records'][0]]}
response = requests.post('http://localhost:8000/api/import/inventory', json=dup_data)
task_id3 = response.json()['task_id']
print(f'重复数据任务: {task_id3}')

time.sleep(4)

final = requests.get(f'http://localhost:8000/api/tasks/{task_id3}').json()
print(f'处理完成: status={final["status"]}, success={final["success_count"]}, duplicate={final["duplicate_count"]}, error={final["error_count"]}')
assert final["status"] == "completed", "重复数据任务应标记为completed"
assert final["duplicate_count"] == 1, "应检测到1条重复"
print("✅ TEST 4.2 通过: 重复数据检测正确")

print()
print("=" * 60)
print("TEST 5: 验证计数守恒")
print("=" * 60)

for tid in [task_id1, task_id2, task_id3, 'task_be8a84837e774e31']:
    resp = requests.get(f'http://localhost:8000/api/tasks/{tid}').json()
    total = resp['total_count']
    calc = resp['success_count'] + resp['duplicate_count'] + resp['error_count']
    ok = "✅" if total == calc else "❌"
    pr_count = len(resp['pending_records'])
    print(f'  {tid}: total={total}, calc={calc} {ok}, pending_records={pr_count}')
    assert total == calc, f"计数不守恒: {tid}"
    assert pr_count == total, f"pending记录数不等于总数: {tid} (pending={pr_count}, total={total})"

print("✅ TEST 5 通过: 所有任务计数守恒")

print()
print("=" * 60)
print("ALL TESTS PASSED ✅✅✅")
print("=" * 60)

proc.terminate()
proc.wait()
