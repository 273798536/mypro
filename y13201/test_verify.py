import json
import urllib.request
import urllib.error

BASE = 'http://localhost:3001'

def get(url):
    return json.loads(urllib.request.urlopen(url).read())

def patch(url, body):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(
        url, data=data, method='PATCH',
        headers={'Content-Type': 'application/json'},
    )
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            body = json.loads(raw.decode('utf-8'))
        except Exception:
            body = {'_raw': raw.decode('utf-8', errors='replace')}
        return e.code, body

def main():
    print('[0] health:', get(BASE + '/api/health'))

    conflicts = get(BASE + '/api/conflicts')['data']
    print('[1] conflicts:', len(conflicts))
    for c in conflicts:
        print(f"    - [{c['id'][:8]}] {c['title']:<10} status={c['status']:<14} ae={c['auth_expired']}")

    name_mismatches = [c for c in conflicts if c['status'] == 'name_mismatch']
    if not name_mismatches:
        print('!!! 没有 name_mismatch 记录，尝试找一条其它正常记录重测：')
        name_mismatches = [c for c in conflicts if c['status'] == 'normal']
    target = name_mismatches[0]
    print(f"[2] 目标记录：{target['title']} 原 status={target['status']} auth_expired={target['auth_expired']} auth_note=\"{target.get('auth_note','')[:30]}\"")
    NM_ID = target['id']

    print('\n--- 步骤 A：故意 status=' + target['status'] + ' 但传 authExpired=true + authNote 非空，看后端归一 ---')
    code, res = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {
            'note': '【补充备注】负责人阿蓝临时提醒：该站授权即将到期，需优先跟进。',
            'authExpired': True,
            'authNote': 'A频段授权于2024-02-29到期，已通知行政续期，目前在走流程。',
            'status': target['status'],  # 故意保持原状态（非auth_expired）
        },
    )
    print(f'[A-result] HTTP={code} success={res.get("success")} normalized={res.get("normalized")}')
    if res.get('warnings'):
        print('  warnings:', res['warnings'])
    if res.get('info'):
        print('  info:', res['info'])
    if res.get('error'):
        print('  error:', res['error'])

    updated = res.get('data')
    if updated:
        print(f'  持久化值: status={updated.get("status")} auth_expired={updated.get("auth_expired")}')
        print(f'          auth_note="{updated.get("auth_note","")}"')
        ok = (
            updated.get('status') == 'auth_expired'
            and updated.get('auth_expired') in (1, True)
            and '2024-02-29' in (updated.get('auth_note') or '')
        )
        print('  ✅ 状态字段一致？', 'YES' if ok else 'NO (BUG)')

    print('\n--- 步骤 B：摘要同步检查 ---')
    summary = get(BASE + '/api/conflicts/summary')['data']
    print('[B] summary =', summary)
    auth_count = summary.get('auth_expired', 0)
    print(f'    auth_expired 计数={auth_count}（期望 >=3）  ✅', 'OK' if auth_count >= 3 else 'LOW')

    print('\n--- 步骤 C：导出 CSV 分区检查 ---')
    csv = urllib.request.urlopen(BASE + '/api/export').read().decode('utf-8-sig')
    parts = csv.split('\n\n===== 授权到期记录 =====\n')
    if len(parts) < 2:
        print('[C] CSV 无授权到期分区！内容预览前300字：', csv[:300])
    else:
        normal_area, auth_area = parts[0], parts[1]
        # 用 title 找
        target_title = target['title']
        in_normal = target_title in normal_area
        in_auth = target_title in auth_area
        print(f'[C] "{target_title}" 在正常记录区？', '❌（应不在）' if in_normal else '✅（已拎出）')
        print(f'[C] "{target_title}" 在授权到期区？', '✅' if in_auth else '❌')

    print('\n--- 步骤 D：参数校验（非法 status="foo"）---')
    code2, res2 = patch(BASE + '/api/conflicts/' + NM_ID, {'status': 'foo'})
    print(f'[D] HTTP={code2} success={res2.get("success")}')
    if res2.get('error'):
        print('    错误消息（中文）:', res2['error'])
    assert code2 == 400, '非法 status 应返回 400'
    print('    ✅ 400 分类正确')

    print('\n--- 步骤 E：关闭授权到期开关 → 状态回退 + auth_note 清空 ---')
    code3, res3 = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {'authExpired': False, 'note': target['note']},
    )
    print(f'[E] HTTP={code3} success={res3.get("success")} normalized={res3.get("normalized")}')
    if res3.get('warnings'):
        print('    warnings:', res3['warnings'])
    if res3.get('data'):
        d = res3['data']
        print(f'    持久化值：status={d["status"]} auth_expired={d["auth_expired"]} auth_note="{d.get("auth_note","")}"')
        ok_off = (
            d.get('auth_expired') in (0, False)
            and (d.get('auth_note') or '') == ''
        )
        # 原是 name_mismatch，不能自动回退成 normal——所以只检查 auth_*
        print('    ✅ 开关关+备注清？', 'YES' if ok_off else 'NO')

    print('\n--- 步骤 F：GET 验证 detail（读二次确认） + noteHistory ---')
    detail = get(BASE + '/api/conflicts/' + NM_ID)['data']
    print(f'[F] 再次GET: status={detail["status"]} auth_expired={detail["auth_expired"]}')
    print(f'    noteHistory 共 {len(detail.get("noteHistory",[]))} 条：')
    for h in detail.get('noteHistory', []):
        tag = '【补充】' if h['is_supplementary'] else ''
        print(f'      · {h["operator_role"]:>5} {tag} {h["content"][:60]}  @{h["created_at"][:16]}')

if __name__ == '__main__':
    main()
