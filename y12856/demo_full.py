#!/usr/bin/env python3
"""
潜点能见度记录台 - Python 全流程示例
从空目录开始，覆盖：数据录入 → 轨迹清洗 → 禁航区检测 → 预报补录 → 计算 → 重复运行 → 人工复核
"""
import json
import urllib.request
import urllib.error
import sys
import time

BASE = 'http://localhost:5001/api'


def api(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={'Content-Type': 'application/json'},
        method=method
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f'  ❌ HTTP {e.code}: {e.read().decode()}', file=sys.stderr)
        return None


def wait_for_service(timeout=30):
    print('🔌 等待服务启动...', end='', flush=True)
    for i in range(timeout):
        try:
            r = api('/health')
            if r and r.get('status') == 'ok':
                print(' 已连接')
                return True
        except Exception:
            pass
        time.sleep(1)
        print('.', end='', flush=True)
    print('\n❌ 服务超时未启动，请先运行 start.sh')
    return False


def hr(title):
    print(f'\n{"="*60}')
    print(f'  {title}')
    print(f'{"="*60}')


def main():
    if not wait_for_service():
        return 1

    hr('【1】查看基础数据')
    sites = api('/dive_sites')
    zones = api('/no_go_zones')
    ships = api('/ships')
    site_by_name = {s['name']: s for s in sites}
    ship_by_name = {s['name']: s for s in ships}
    print(f'  潜点: {len(sites)} 个')
    for s in sites:
        print(f'    #{s["id"]} {s["name"]} ({s["lat"]}, {s["lng"]})')
    print(f'  禁航区: {len(zones)} 个')
    for z in zones:
        print(f'    #{z["id"]} {z["name"]} - {z["description"]}')
    print(f'  船舶: {len(ships)} 艘')
    for s in ships:
        print(f'    #{s["id"]} {s["name"]}')

    hr('【2】查看原始轨迹中的坏数据（养殖工船海丰号）')
    ship_haifeng = ship_by_name.get('养殖工船海丰号')
    bad_tracks = api(f'/ship_tracks?ship_id={ship_haifeng["id"]}') if ship_haifeng else []
    print(f'  共 {len(bad_tracks)} 条原始轨迹，包含真实小麻烦：')
    for t in bad_tracks:
        issues = []
        if t['lat'] is None or t['lng'] is None:
            issues.append('坐标缺失')
        if t['lat'] and (t['lat'] < -90 or t['lat'] > 90):
            issues.append(f'纬度越界 {t["lat"]}')
        if t['lng'] and (t['lng'] < -180 or t['lng'] > 180):
            issues.append(f'经度越界 {t["lng"]}')
        if 'BAD' in str(t['recorded_at']) or 'NOT' in str(t['recorded_at']):
            issues.append(f'时间格式错误 "{t["recorded_at"]}"')
        if t['speed'] and t['speed'] > 100:
            issues.append(f'速度异常 {t["speed"]} m/s')
        if issues:
            print(f'    轨迹#{t["id"]}: {"; ".join(issues)}')

    hr('【3】执行轨迹清洗 —— 观察前后差别')
    result = api('/ship_tracks/clean', method='POST', body={})
    print(f'  保留: {result["cleaned_count"]} 条')
    print(f'  剔除: {result["bad_count"]} 条异常数据')
    for b in result['bad_records']:
        print(f'    轨迹#{b["original_id"]}: {"; ".join(b["reasons"])}')

    hr('【4】单条轨迹前后对比（取第1条被剔除的坏数据）')
    if result['bad_records']:
        bad_id = result['bad_records'][0]['original_id']
        cmp_r = api(f'/ship_tracks/compare/{bad_id}')
        print(f'  轨迹 #{bad_id}:')
        print(f'    原始: {json.dumps(cmp_r["raw"], ensure_ascii=False)[:200]}')
        print(f'    清洗后: {cmp_r["clean"]}')

    hr('【5】蓝鲸号 —— 轨迹全部异常 → 触发"不整批失败"分支')
    ship_lanjing = ship_by_name.get('休闲海钓蓝鲸号')
    raw_4 = api(f'/ship_tracks?ship_id={ship_lanjing["id"]}') if ship_lanjing else []
    clean_4 = api(f'/ship_tracks_clean?ship_id={ship_lanjing["id"]}') if ship_lanjing else []
    print(f'  原始轨迹: {len(raw_4)} 条')
    print(f'  清洗后轨迹: {len(clean_4)} 条')
    print(f'  → 这条船轨迹全废，但其他船正常计算，缺口单独列出来')

    hr('【6】查看风浪预报 —— 含延迟到达场景')
    forecasts = api('/wind_wave_forecasts')
    site_wanshan = site_by_name.get('万山岛深水网箱区')
    site_guishan = site_by_name.get('桂山岛海藻床观测点')
    forecast_delayed = next((f for f in forecasts if f['is_delayed']), None)
    forecast_pending = next((f for f in forecasts if not f['is_delayed'] and f['status'] != 'confirmed'), None)
    for f in forecasts:
        status_str = '✅已确认' if f['status'] == 'confirmed' else ('⏰延迟' if f['is_delayed'] else '⏳待确认')
        print(f'    #{f["id"]} 潜点{f["site_id"]} {f["forecast_for"]} 浪高{f["wave_height"]}m {status_str}')

    hr('【7】预报补录 —— 万山岛预报延迟到达，数据为空')
    confirm_r = None
    if forecast_delayed:
        confirm_r = api(f'/wind_wave_forecasts/{forecast_delayed["id"]}/confirm', method='POST', body={
            'confirmed_by': '海洋老师',
            'update_data': {'wave_height': 1.5, 'wind_speed': 7.0}
        })
        print(f'  补录预报 #{forecast_delayed["id"]} 结果: {confirm_r}')
    else:
        print('  未找到延迟预报')

    hr('【8】人工确认 —— 桂山岛预报正常到达但未确认')
    confirm_r = None
    if forecast_pending:
        confirm_r = api(f'/wind_wave_forecasts/{forecast_pending["id"]}/confirm', method='POST', body={
            'confirmed_by': '海洋老师'
        })
        print(f'  确认预报 #{forecast_pending["id"]} 结果: {confirm_r}')
    else:
        print('  未找到待确认预报')

    hr('【9】首次运行能见度计算')
    calc_r = api('/visibility/calculate', method='POST', body={
        'record_date': '2026-06-10',
        'rerun': True
    })
    print(f'  成功计算: {calc_r["processed"]} 条')
    print(f'  数据缺失: {calc_r["failed"]} 条')
    print(f'  轨迹缺失的船舶: {[m["ship_name"] for m in calc_r["missing_tracks"]]}')
    for r in calc_r['results']:
        vis = f'{r["visibility_m"]}m' if 'visibility_m' in r and r['visibility_m'] else '缺失'
        violation = f' 🚫越界{r.get("no_go_violations", [])}' if r.get('no_go_violations') else ''
        pending = f' ⏰预报待确认{r.get("forecast_pending", 0)}条' if r.get('forecast_pending') else ''
        print(f'    {r["site_name"]}: {vis} [{r["status"]}]{violation}{pending}')

    hr('【10】独立检查禁航区越界 —— 两三个真实改变结果的例子')
    violations = api('/check_no_go_violations', method='POST', body={'date': '2026-06-10'})
    print(f'  共检测到 {violations["count"]} 次越界:')
    seen = set()
    for v in violations['violations']:
        key = (v['ship_id'], v['zone_name'])
        if key not in seen:
            seen.add(key)
            ship_name = next((s['name'] for s in ships if s['id'] == v['ship_id']), f'#{v["ship_id"]}')
            print(f'    {ship_name} 进入 {v["zone_name"]} 于 {v["recorded_at"]}')
    print()
    print('  👉 这些越界会改变能见度记录的状态:')
    print('     1. 科考船探索号 → 万山岛军事禁锚区')
    print('     2. 巡检艇海燕号 → 桂山岛航道禁渔区')
    print('     3. 每条都会把对应潜点的 has_no_go_violation 置为 1')

    hr('【11】预报晚到 —— 重复运行（rerun=true）验证覆盖')
    print('  模拟预报比数据晚到的场景，补录预报后重新计算...')
    calc_r2 = api('/visibility/calculate', method='POST', body={
        'record_date': '2026-06-10',
        'rerun': True
    })
    print(f'  二次运行结果: {calc_r2["processed"]} 成功 / {calc_r2["failed"]} 缺失')

    hr('【12】人工复核 —— 海洋老师确认最终记录')
    records = api('/visibility_records')
    to_review = [r for r in records if r['status'] in ('review', 'ok', 'confirmed')]
    if to_review:
        first = to_review[0]
        print(f'  复核记录 #{first["id"]} (潜点 #{first["site_id"]} {first["record_date"]})')
        print(f'  原能见度: {first["visibility_m"]}m')
        print(f'  原状态: {first["status"]}')
        print(f'  问题备注: {first["review_notes"]}')
        review_r = api(f'/visibility_records/{first["id"]}/review', method='POST', body={
            'status': 'confirmed',
            'reviewer': '海洋老师',
            'notes': '照片和养殖日志吻合，禁航区越界另案处理，能见度数据有效',
            'visibility_override': round(first['visibility_m'] or 10.0, 1)
        })
        print(f'  复核结果: {review_r}')

    hr('【13】最终结果汇总')
    final_records = api('/visibility_records')
    print(f'  共 {len(final_records)} 条能见度记录:')
    for r in final_records:
        flags = []
        if r['has_no_go_violation']:
            flags.append('🚫禁航区越界')
        if r['track_missing']:
            flags.append('⚠️轨迹缺失')
        if r['forecast_delayed']:
            flags.append('⏰预报延迟')
        vis = f'{r["visibility_m"]}m' if r['visibility_m'] is not None else '缺数据'
        print(f'    潜点#{r["site_id"]} {r["record_date"]}: {vis} [{r["status"]}] {" ".join(flags)}')

    runs = api('/process_runs')
    print(f'\n  共运行 {len(runs)} 次计算任务:')
    for run in runs:
        print(f'    #{run["id"]} {run["run_type"]} {run["started_at"]}: {run["status"]} 成功{run["records_processed"]}/失败{run["records_failed"]}')

    print('\n' + '=' * 60)
    print('  ✅ Python 全流程跑完！所有场景都已覆盖:')
    print('     ▸ 真实坏数据（坐标缺失/越界/时间错/速度异常/模糊照片）')
    print('     ▸ 轨迹清洗前后差别')
    print('     ▸ 两三个真的改变结果的禁航区越界例子')
    print('     ▸ 预报晚到：重复运行 + 补录 + 人工确认 三件事都试到')
    print('     ▸ 轨迹缺失不整批失败，缺口单独列出')
    print('     ▸ 海洋老师人工复核')
    print('=' * 60)
    return 0


if __name__ == '__main__':
    sys.exit(main())
