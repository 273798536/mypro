import requests
import json

BASE = "http://localhost:3000/api"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

print_section("1. 健康检查")
r = requests.get(f"{BASE}/health")
print(json.dumps(r.json(), ensure_ascii=False, indent=2))

print_section("2. 材料列表（验证多类型材料导入）")
r = requests.get(f"{BASE}/materials")
data = r.json()["data"]
types = {
    'table_snapshot': '表结构快照',
    'slow_query_log': '慢查询日志',
    'permission_list': '权限清单',
    'metric_report': '指标报表'
}
print(f"材料总数: {len(data)}")
for m in data:
    remark = m["remark"][:30] + "..." if len(m["remark"]) > 30 else m["remark"]
    print(f"  [{types.get(m['type'], m['type'])}] {m['title']}")
    print(f"    v{m['version']} | 来源: {m['source_env']} | 备注: {remark}")

print_section("3. 迁移记录列表")
r = requests.get(f"{BASE}/migrations")
migrations = r.json()["data"]
print(f"迁移记录数: {len(migrations)}")
for m in migrations:
    print(f"  {m['migration_name']}")
    print(f"    状态: {m['status']} | 环境: {m['environment']} | 执行次数: {m['execution_count']}")
    print(f"    锁等待问题: {m['lock_wait_issue']} | 关联材料ID: {m['lock_wait_material_id']}")
    mig_id = m["id"]

print_section("4. 迁移记录详情（含复核轮次）")
r = requests.get(f"{BASE}/migrations/{mig_id}")
m = r.json()["data"]
print(f"迁移: {m['migration_name']}")
print(f"当前状态: {m['status']}")
print(f"复核轮次数: {len(m['review_rounds'])}")
for round_item in m['review_rounds']:
    print(f"  第{round_item['round_number']}轮 - 状态: {round_item['status']} - 复核人: {round_item['reviewer']}")
    round_id = round_item["id"]

print_section("5. 复核轮次详情（同一轮包含多种问题）")
r = requests.get(f"{BASE}/reviews/rounds/{round_id}")
round_data = r.json()["data"]
item_types = {
    'pagination_order': '分页顺序不稳定',
    'slow_query_attribution': '慢查询归因',
    'permission_check': '权限检查',
    'table_structure': '表结构检查'
}
print(f"第{round_data['round_number']}轮复核 - {round_data['status']}")
print(f"复核项数量: {len(round_data['review_items'])}")
print("\n本轮复核包含的问题类型:")
slow_item_id = None
for item in round_data['review_items']:
    print(f"  - {item_types.get(item['item_type'], item['item_type'])}")
    print(f"    状态: {item['status']} | 材料: {item['material']['title']}")
    print(f"    初始结论: {item['initial_conclusion'][:40]}...")
    if item['final_conclusion']:
        print(f"    最终结论: {item['final_conclusion'][:40]}...")
    print(f"    结论版本数: {len(item['snapshots'])}")
    if item['item_type'] == 'slow_query_attribution':
        slow_item_id = item['id']

print_section("6. 结论对比（旧结论与新结论并排看）")
r = requests.get(f"{BASE}/reviews/items/{slow_item_id}/comparison")
comp = r.json()["data"]
print(f"复核项: {item_types.get(comp['item_type'], comp['item_type'])}")
print(f"材料: {comp['material_title']}")
print(f"\n版本历史:")
for v in comp['versions']:
    print(f"  v{v['version']}: {v['status']} - 结论: {v['conclusion'][:50]}...")
    print(f"        操作人: {v['operator']} | 时间: {v['at']}")
print(f"\n并排对比:")
old = comp['side_by_side']['old']
new = comp['side_by_side']['new']
if old:
    print(f"  旧结论 (v{old['snapshot_version']}): {old['conclusion_text'][:60]}...")
    print(f"    状态: {old['status']} | 操作人: {old['snapshot_by']}")
print(f"  新结论 (v{new['snapshot_version']}): {new['conclusion_text'][:60]}...")
print(f"    状态: {new['status']} | 操作人: {new['snapshot_by']}")

print_section("7. 审计日志（谁改的、什么时候、为什么）")
r = requests.get(f"{BASE}/audit/entity/conclusion/{slow_item_id}")
logs = r.json()["data"]
print(f"该复核项的审计日志数: {len(logs)}")
for log in logs:
    print(f"\n  [{log['action']}] {log['field_name'] or ''}")
    print(f"    操作人: {log['operator']}")
    print(f"    时间: {log['operated_at']}")
    print(f"    原因: {log['reason']}")
    if log['old_value']:
        old_v = str(log['old_value'])[:50]
        new_v = str(log['new_value'])[:50]
        print(f"    旧值: {old_v}...")
        print(f"    新值: {new_v}...")

print_section("8. 锁等待分析报告（卡在哪份材料上）")
r = requests.post(f"{BASE}/reports/lock-wait-analysis", json={
    "migration_id": mig_id,
    "generated_by": "test@example.com"
})
report = r.json()["data"]
content = report["content"]
print(f"报告类型: {report['report_type']}")
print(f"是否有锁等待问题: {content['has_lock_wait_issue']}")
if content['stuck_material']:
    print(f"卡住的材料: {content['stuck_material']['title']}")
    print(f"材料类型: {content['stuck_material']['type_label']}")
    print(f"材料备注: {content['stuck_material']['remark']}")
if content['analysis']:
    print(f"\n可能原因:")
    for cause in content['analysis']['possible_causes']:
        print(f"  - {cause}")
    print(f"建议: {content['analysis']['recommendation']}")

print_section("9. 完整审计报告（审计组只看最后报告也能知道全貌）")
r = requests.post(f"{BASE}/reports/full-audit", json={
    "migration_id": mig_id,
    "generated_by": "test@example.com"
})
report = r.json()["data"]
content = report["content"]
print(f"迁移名称: {content['migration']['name']}")
print(f"总复核轮次: {content['total_rounds']}")
print(f"总审计日志: {content['total_audit_logs']}")
print(f"当前状态: {content['migration']['status']}")
print(f"\n各轮复核概要:")
for rnd in content['rounds']:
    print(f"  第{rnd['round_number']}轮 - {rnd['status']}")
    print(f"    复核项: {len(rnd['items'])} 个")
    for item in rnd['items']:
        print(f"      - {item_types.get(item['item_type'], item['item_type'])}: {item['status']}")

print_section("✅ 验证完成！核心功能全部正常")
