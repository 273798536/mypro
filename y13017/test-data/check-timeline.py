import urllib.request
import json

url = "http://localhost:4000/api/timeline"
data = json.loads(urllib.request.urlopen(url).read())

print(f"共 {len(data)} 条时间线事件")
print("=" * 90)

event_labels = {
    'import': '【导入创建】',
    'supplement': '【信息补充】',
    'late_attachment': '【晚到凭证】',
    'attachment': '【附件】',
    'remark_update': '【备注修改】',
    'status_change': '【状态变更】',
    'duplicate_check': '【重复检查】',
    'extracted_data': '【数据提取】'
}
status_labels = {
    'pending_materials': '[待补材料]',
    'processed': '[已处理]',
    'manual_review': '[人工改判]'
}

for e in data:
    t = e['event_type']
    label = event_labels.get(t, f'【{t}】')
    st = status_labels.get(e.get('dispute_status', ''), '')
    print(f"{e['created_at']}  {e['case_no']:<16} {st:<10} {label}  {e['event_text']}")
    meta = []
    if e.get('operator'):
        meta.append(f"操作人:{e['operator']}")
    if e.get('source_type'):
        meta.append(f"来源:{e['source_type']}")
    if e.get('email_subject'):
        meta.append(f"邮件:{e['email_subject'][:50]}")
    if meta:
        print(f"    → {' | '.join(meta)}")
