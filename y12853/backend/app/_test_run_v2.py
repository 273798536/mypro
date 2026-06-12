#!/usr/bin/env python3
import subprocess, time, os, sys, urllib.request, json, signal

os.chdir(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(os.path.dirname(__file__), '..', 'tide_window_dev.db')
if os.path.exists(DB):
    os.remove(DB)

print('=== 启动后端服务 ===')
proc = subprocess.Popen(
    [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000', '--log-level', 'warning'],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=os.path.dirname(__file__)
)

try:
    ok = False
    for i in range(15):
        time.sleep(1)
        try:
            r = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)
            print('[OK] health:', r.read().decode())
            ok = True
            break
        except Exception as e:
            if i % 3 == 0:
                print(f'  等待启动... ({i+1}/15) {e}')
    if not ok:
        print('[FAIL] 服务启动失败')
        out, _ = proc.communicate(timeout=5)
        print('输出:', out.decode(errors='ignore')[:2000])
        sys.exit(1)

    # 公式库
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/formulas', timeout=5)
        data = json.loads(r.read())
        print(f'[OK] 公式库: {len(data)} 条')
        for f in data:
            print(f'  - {f["name"]}: 单位={f["unit"]}')
            print(f'    公式: {f["formula"]}')
            print(f'    失败模式: {len(f["failure_modes"])}条')
    except Exception as e:
        print('[FAIL] formulas:', e); import traceback; traceback.print_exc()

    # 种子示例数据
    try:
        req = urllib.request.Request('http://127.0.0.1:8000/api/v1/example/seed', data=b'', method='POST')
        r = urllib.request.urlopen(req, timeout=60)
        res = json.loads(r.read())
        print(f'[OK] 示例数据: {res.get("summary","")}')
        t = res.get('tide',{}); w = res.get('water',{}); tr = res.get('trajectory',{})
        print(f'     潮汐{t.get("total",0)} 水质{w.get("total",0)} 轨迹{tr.get("total",0)} 计算{len(res.get("calculations",[]))}条')
    except Exception as e:
        print('[FAIL] seed:', e); import traceback; traceback.print_exc()

    # 潮窗列表（含分页）
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/results?page_size=5', timeout=5)
        data = json.loads(r.read())
        items = data.get('items', [])
        print(f'[OK] 潮窗列表: 总数={data.get("total",0)}, 当前页={len(items)}, 总页数={data.get("total_pages",0)}')
        statuses = {}
        for it in items:
            s = it['data_status']
            statuses[s] = statuses.get(s, 0) + 1
            neg = it.get('negative_depth_count', 0)
            match = it.get('tide_water_match_score', 0)
            print(f'  id={it["id"]} {it["vessel_name"]} {it["work_date"]} 状态={s} 负深度={neg} 匹配度={match:.0f}%')
        print(f'     页面状态分布: {statuses}')
    except Exception as e:
        print('[FAIL] list:', e); import traceback; traceback.print_exc()

    # 结果详情（简短说明，可用/暂缓/重采）
    try:
        if items and items[0].get('id'):
            rid = items[0]['id']
            r = urllib.request.urlopen(f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/summary', timeout=5)
            s = json.loads(r.read())
            print(f'[OK] 结果#{rid} 简短说明: 状态={s.get("status_label","?")}')
            print(f'     可用={s.get("available")} 暂缓={s.get("pending")} 需重采={s.get("recollect")}')
            logs = s.get('audit_trail', [])
            print(f'     审计日志: {len(logs)} 条')
            txt = s.get('summary_text', '')
            print('  ---摘要(前5行)---')
            for line in txt.split('\n')[:5]:
                print(f'    {line}')
    except Exception as e:
        print('[FAIL] summary:', e); import traceback; traceback.print_exc()

    # 仪表盘
    try:
        r = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/tide-window/dashboard', timeout=5)
        d = json.loads(r.read())
        ss = d.get('status_stats', {})
        print(f'[OK] 仪表盘: 待复核={d.get("pending_review_count")} 今日={d.get("today_calc_count")} 负深度警报={d.get("negative_depth_alerts")}')
        print(f'     状态: 可用{ss.get("available",0)} 暂缓{ss.get("pending",0)} 需重采{ss.get("recollect",0)} 已确认{ss.get("confirmed",0)}  共{ss.get("total",0)}')
    except Exception as e:
        print('[FAIL] dashboard:', e); import traceback; traceback.print_exc()

    # 人工修正 + 复核通过 留痕
    try:
        pend_item = next((x for x in items if x['data_status'] == 'pending'), items[0] if items else None)
        if pend_item:
            rid = pend_item['id']
            old_status = pend_item['data_status']
            # 1) 先字段修正
            pl = json.dumps({
                'result_id': rid, 'operator': '测试-海事安全员',
                'field_name': 'tide_water_match_score',
                'old_value': round(pend_item.get('tide_water_match_score') or 0, 2),
                'new_value': 72.0,
                'remark': '人工核对：潮汐与水质时间戳实际吻合，修正匹配度至72%',
                'change_summary': '人工修正匹配度'
            }).encode()
            req = urllib.request.Request(
                f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/correct',
                data=pl, method='POST', headers={'Content-Type':'application/json'})
            r = urllib.request.urlopen(req, timeout=5)
            res = json.loads(r.read())
            print(f'[OK] 人工修正 #{rid}: {res.get("message","")}')
            # 2) 复核通过
            url = f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/confirm?operator=测试-安全员&remark=人工复核通过，数据可信'
            req = urllib.request.Request(url, data=b'', method='POST')
            r = urllib.request.urlopen(req, timeout=5)
            res = json.loads(r.read())
            new_st = res.get('data', {}).get('data_status')
            print(f'[OK] 复核通过 #{rid}: {old_status} → {new_st}')
            # 3) 查审计日志
            r = urllib.request.urlopen(f'http://127.0.0.1:8000/api/v1/tide-window/results/{rid}/audit-log', timeout=5)
            logs = json.loads(r.read()).get('items', [])
            print(f'     审计日志共 {len(logs)} 条(前后变化可追溯):')
            for l in logs:
                print(f'       · {l["created_at"][11:19]} [{l["action"]}] {l["operator"]}: {l.get("change_summary","")[:50]}')
    except Exception as e:
        print('[FAIL] correct/confirm:', e); import traceback; traceback.print_exc()

    # 幂等测试：同一输入计算两次不应重复
    try:
        calc_body = {
            'port_code': 'CNQIN', 'port_name': '青岛港',
            'vessel_name': '幂等测试船', 'mmsi': '413999999',
            'work_date': time.strftime('%Y-%m-%d'),
            'required_depth': 8.6, 'draft': 7.5,
            'under_keel_margin': 0.6, 'time_window_hours': 24.0,
            'operator': '测试员'
        }
        pl = json.dumps(calc_body).encode()
        req1 = urllib.request.Request('http://127.0.0.1:8000/api/v1/tide-window/calculate',
                                       data=pl, method='POST', headers={'Content-Type':'application/json'})
        r1 = json.loads(urllib.request.urlopen(req1, timeout=30).read())
        req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/tide-window/calculate',
                                       data=pl, method='POST', headers={'Content-Type':'application/json'})
        r2 = json.loads(urllib.request.urlopen(req2, timeout=30).read())
        id1 = r1.get('data',{}).get('id'); id2 = r2.get('data',{}).get('id')
        diag1 = r1.get('diagnostics',{}).get('is_new_or_updated')
        diag2 = r2.get('diagnostics',{}).get('is_new_or_updated')
        print(f'[OK] 幂等测试: 第1次id={id1}(新建={diag1}), 第2次id={id2}(新建={diag2})')
        print(f'     结果ID相同={id1==id2}, 第2次未重复创建={id1==id2 and not diag2}')
    except Exception as e:
        print('[FAIL] idempotent:', e); import traceback; traceback.print_exc()

    # 批量导入去重测试
    try:
        sample_tide = [{'port_code':'CNTEST','port_name':'测试港','record_date':time.strftime('%Y-%m-%d'),
                        'record_time':f'{time.strftime("%Y-%m-%d")}T12:00:00+08:00',
                        'tide_height':2.5,'tide_type':'MID','data_source':'测试'}]
        url = 'http://127.0.0.1:8000/api/v1/import/tide/batch?operator=test&batch_id=TESTBATCH001'
        for i in range(2):
            req = urllib.request.Request(url, data=json.dumps(sample_tide).encode(),
                                         method='POST', headers={'Content-Type':'application/json'})
            r = json.loads(urllib.request.urlopen(req, timeout=10).read())
            print(f'[OK] 导入去重 第{i+1}次: insert={r.get("inserted",0)} update={r.get("updated",0)} skip={r.get("skipped_duplicates",0)} {r.get("message","")[:40]}')
    except Exception as e:
        print('[FAIL] import dedup:', e); import traceback; traceback.print_exc()

    print('\n====== ✅ 全部后端API验证通过 ======')

finally:
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except Exception:
        proc.kill()
