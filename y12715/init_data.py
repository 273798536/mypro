#!/usr/bin/env python3
"""
组合计数错题归因 - 一键初始化脚本
用法：
    python3 init_data.py              # 加载内置6条示例数据
    python3 init_data.py --url http://other-host:5000
"""
import json
import sys
import urllib.request

URL = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '--url' else 'http://localhost:5001'
if '--url' in sys.argv:
    URL = sys.argv[sys.argv.index('--url') + 1]


def req(path, method='GET', data=None):
    url = URL + path
    body = json.dumps(data, ensure_ascii=False).encode('utf-8') if data else None
    r = urllib.request.Request(url, data=body, method=method,
                               headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r) as resp:
        txt = resp.read().decode('utf-8')
        return json.loads(txt) if txt else None


def main():
    print(f"目标服务: {URL}")

    print("[1/4] 初始化示例数据...")
    r = req('/api/init-sample', 'POST')
    print(f"    已创建 {r['created']} 条，ID: {r['ids']}")

    print("[2/4] 获取统计...")
    s = req('/api/statistics')
    print(f"    总数: {s['total']}, 状态分布: {s['by_status']}")

    print("[3/4] 风控复核 #1 (待确认 → 已通过)...")
    r = req('/api/questions/1', 'PUT', {
        'analyst_name': '脚本-自动复核',
        'change_reason': '初始化脚本：核对来源材料后通过',
        'status': 'approved',
        'data_quality': 'available',
    })
    print(f"    新版本 v{r['version']}，当前状态: {r['status_label']}")

    print("[4/4] 查看 #1 留痕...")
    logs = req('/api/questions/1/audit-logs')
    for lg in logs:
        print(f"    [{lg['created_at']}] {lg['analyst_name']}: {lg['from_status_label']} → {lg['to_status_label']} | {lg['change_reason']}")

    print("")
    print("✓ 初始化完成，请访问：")
    print(f"  风控工作台: {URL}/")
    print(f"  学生查看:   {URL}/student")


if __name__ == '__main__':
    main()
