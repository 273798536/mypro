#!/usr/bin/env python3
import json

with open('data/store.json', 'r') as f:
    data = json.load(f)

reimbs = dict(data['reimbursements'])

for rid, r in reimbs.items():
    if r['applicationNo'] == 'BX-DEAD-TEST-001':
        r['currentRetry'] = {
            'id': 'fake',
            'reimbursementId': rid,
            'retryCount': 1,
            'maxRetries': 3,
            'nextRetryAt': '2026-05-25T12:00:00.000Z',
            'category': 'system_error',
            'status': 'pending',
            'createdAt': '2026-05-25T10:00:00.000Z'
        }
        r['isInSummary'] = True
        print(f'制造不一致: {rid}')
        print('  - 添加了currentRetry')
        print('  - 设置isInSummary=True')
        break

data['reimbursements'] = list(reimbs.items())

queue = dict(data['retryQueue'])
queue['fake-queue-pending'] = {
    'id': 'fake-queue-pending',
    'reimbursementId': rid,
    'retryCount': 2,
    'maxRetries': 3,
    'nextRetryAt': '2026-05-25T12:00:00.000Z',
    'category': 'system_error',
    'status': 'pending',
    'createdAt': '2026-05-25T10:00:00.000Z'
}
print('  - 添加了pending重试记录')
data['retryQueue'] = list(queue.items())

with open('data/store.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print()
print('不一致数据已写入持久化文件')
