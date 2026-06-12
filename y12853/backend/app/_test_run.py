#!/usr/bin/env python3
import uvicorn, threading, time, os, sys, urllib.request, json

errors = []

def run_server():
    try:
        uvicorn.run('main:app', host='127.0.0.1', port=8000, log_level='warning')
    except Exception as e:
        import traceback
        errors.append(traceback.format_exc())

t = threading.Thread(target=run_server, daemon=True)
t.start()

for i in range(12):
    time.sleep(1)
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)
        print('[OK] health:', r.read().decode())
        break
    except Exception as e:
        if i == 11:
            print('[FAIL] health endpoint unreachable:', e)

if errors:
    print('\n[STARTUP ERRORS]', '=' * 40)
    for e in errors:
        print(e)
else:
    # 测试公式接口
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/formulas', timeout=5)
        data = json.loads(r.read())
        print(f'[OK] formulas: {len(data)} items')
        for f in data:
            print(f'     - {f["name"]}: {f["formula"]}  单位:{f["unit"]}')
    except Exception as e:
        print(f'[FAIL] formulas:', e)
        import traceback; traceback.print_exc()

    # 测试示例数据生成
    try:
        req = urllib.request.Request('http://127.0.0.1:8000/api/v1/example/seed', data=b'', method='POST')
        r = urllib.request.urlopen(req, timeout=30)
        res = json.loads(r.read())
        print(f'[OK] seed example: {res.get("summary","")}')
        print(f'     tide={res.get("tide",{}).get("total",0)} water={res.get("water",{}).get("total",0)} traj={res.get("trajectory",{}).get("total",0)}')
    except Exception as e:
        print(f'[FAIL] seed:', e)
        import traceback; traceback.print_exc()

    # 测试潮窗列表
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/results?page_size=3', timeout=5)
        data = json.loads(r.read())
        items = data.get('items', [])
        print(f'[OK] tide-window list: {data.get("total",0)} total, got {len(items)}')
        for it in items:
            print(f'     id={it["id"]} {it["vessel_name"]} {it["work_date"]} status={it["data_status"]} neg={it.get("negative_depth_count",0)} match={it.get("tide_water_match_score",0):.0f}%')
    except Exception as e:
        print(f'[FAIL] list:', e)
        import traceback; traceback.print_exc()

    # 测试潮窗详情/结果说明
    try:
        if items and items[0].get('id'):
            rid = items[0]['id']
            r = urllib.request.urlopen(f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/summary', timeout=5)
            s = json.loads(r.read())
            print(f'[OK] result #{rid} summary status_label={s.get("status_label")}')
            print('     audit logs:', len(s.get('audit_trail', [])))
            # 截取摘要前2行
            txt = s.get('summary_text', '')
            for line in txt.split('\n')[:4]:
                print(f'       | {line}')
    except Exception as e:
        print(f'[FAIL] summary:', e)
        import traceback; traceback.print_exc()

    # 测试仪表盘
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/dashboard', timeout=5)
        d = json.loads(r.read())
        ss = d.get('status_stats', {})
        print(f'[OK] dashboard: avail={ss.get("available",0)} pending={ss.get("pending",0)} recollect={ss.get("recollect",0)} confirmed={ss.get("confirmed",0)}')
    except Exception as e:
        print(f'[FAIL] dashboard:', e)
        import traceback; traceback.print_exc()

    # 测试复核通过（人工修正留痕）
    try:
        if items and items[0].get('id'):
            rid = items[0]['id']
            url = f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/correct'
            payload = json.dumps({
                'result_id': rid,
                'operator': '测试安全员',
                'new_status': 'confirmed',
                'remark': '测试复核通过，状态从待确认→已通过',
                'change_summary': '人工复核：匹配度虽略低但数据可信'
            }).encode()
            req = urllib.request.Request(url, data=payload, method='POST', headers={'Content-Type':'application/json'})
            r = urllib.request.urlopen(req, timeout=5)
            res = json.loads(r.read())
            new_status = res.get('data',{}).get('data_status','?')
            print(f'[OK] manual correct #{rid}: status now = {new_status}')
            # 查审计日志
            r2 = urllib.request.urlopen(f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/audit-log', timeout=5)
            logs = json.loads(r2.read()).get('items', [])
            print(f'     audit log entries: {len(logs)}')
            for l in logs[-2:]:
                print(f'       - [{l["created_at"][11:19]}] {l["action"]} by {l["operator"]}: {l.get("change_summary","")[:40]}')
    except Exception as e:
        print(f'[FAIL] correct:', e)
        import traceback; traceback.print_exc()

print('\n====== 后端 API 验证完成 ======')
os._exit(0)
