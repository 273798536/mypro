import json
import sys
import urllib.request
import urllib.error

BASE = 'http://localhost:3001'
PASS = 0
FAIL = 0

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

def check(label, cond, detail=''):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  ✅ {label}' + (f'   {detail}' if detail else ''))
    else:
        FAIL += 1
        print(f'  ❌ {label}' + (f'   {detail}' if detail else ''))

def main():
    global PASS, FAIL
    print('[0] health:', get(BASE + '/api/health'))

    conflicts = get(BASE + '/api/conflicts')['data']
    print(f'[1] conflicts={len(conflicts)} 种子数据：')
    for c in conflicts:
        print(f"    - [{c['id'][:8]}] {c['title']:<12} status={c['status']:<14} ae={c['auth_expired']} an=\"{(c.get('auth_note') or '')[:20]}\"")

    # 找一条名称不一致的记录做关键测试
    targets = [c for c in conflicts if c['status'] == 'name_mismatch']
    if not targets:
        targets = [c for c in conflicts if c['status'] == 'normal']
    target = targets[0]
    NM_ID = target['id']
    print(f'[2] 目标记录：{target["title"]}（id={NM_ID[:8]}…）')

    # =========================================================
    # 步骤 A：故意 status=name_mismatch + authExpired=true + authNote 非空
    # =========================================================
    print('\n--- A. 原 name_mismatch + 补授权备注 + 故意传旧 status（后端强制归一）---')
    code, res = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {
            'note': '【A-测试备注】补授权信息进来',
            'authExpired': True,
            'authNote': 'A频段授权于2024-02-29到期，行政续期中',
            'status': target['status'],
        },
    )
    print(f'    HTTP={code} success={res.get("success")} normalized={res.get("normalized")}')
    if res.get('warnings'):
        print('    warnings:', res['warnings'])
    d = res.get('data') or {}
    check(
        'A1. status 已强制归一为 auth_expired',
        d.get('status') == 'auth_expired',
        f'实际={d.get("status")}',
    )
    check(
        'A2. auth_expired=1',
        d.get('auth_expired') in (1, True),
        f'实际={d.get("auth_expired")}',
    )
    check(
        'A3. auth_note 已写入',
        '2024-02-29' in (d.get('auth_note') or ''),
        f'实际="{d.get("auth_note","")[:35]}"',
    )
    check(
        'A4. 返回 normalized=true / warnings 非空',
        res.get('normalized') and res.get('warnings'),
        '',
    )

    # =========================================================
    # 步骤 B：只改 note，不传任何 auth 字段 → 原先的 auth_note / auth_expired 必须保留
    # =========================================================
    print('\n--- B. 只改 note，不传 authExpired/authNote/status → auth_note 必须保留 ---')
    code2, res2 = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {'note': '【B-只改note】局部更新，未碰授权字段，auth_note 不应被清空'},
    )
    print(f'    HTTP={code2} success={res2.get("success")} normalized={res2.get("normalized")}')
    d2 = res2.get('data') or {}
    check(
        'B1. status 仍为 auth_expired',
        d2.get('status') == 'auth_expired',
        f'实际={d2.get("status")}',
    )
    check(
        'B2. auth_expired 保持 1',
        d2.get('auth_expired') in (1, True),
        f'实际={d2.get("auth_expired")}',
    )
    check(
        'B3. auth_note **未被清空**（仍含 2024-02-29）',
        '2024-02-29' in (d2.get('auth_note') or ''),
        f'实际="{d2.get("auth_note","")[:35]}"',
    )
    check(
        'B4. normalized=false（无系统归一动作）',
        res2.get('normalized') is False or (
            res2.get('normalized') is None and len(res2.get('warnings') or []) == 0
        ),
        f"normalized={res2.get('normalized')}",
    )

    # =========================================================
    # 步骤 C：只传 authExpired=false，不传 authNote → auth_note 必须被清空
    # =========================================================
    print('\n--- C. 只传 authExpired=false（不传 authNote）→ auth_note 应被清空 + 状态回退 ---')
    code3, res3 = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {'authExpired': False},
    )
    print(f'    HTTP={code3} success={res3.get("success")} normalized={res3.get("normalized")}')
    if res3.get('warnings'):
        print('    warnings:', res3['warnings'])
    d3 = res3.get('data') or {}
    check(
        'C1. auth_expired = 0',
        d3.get('auth_expired') in (0, False),
        f'实际={d3.get("auth_expired")}',
    )
    check(
        'C2. auth_note 已清空（长度=0）',
        (d3.get('auth_note') or '') == '',
        f'实际="{d3.get("auth_note","")}"',
    )
    # 原状态是 name_mismatch → 回退时，DB existingStatus 在 A 步后是 auth_expired，
    # 所以只能保守退到 normal。若 DB 仍保留 name_mismatch 才会退为 name_mismatch，
    # 但 A 步已把 DB 改成 auth_expired，所以 expected = normal
    check(
        'C3. status 已回退（不是 auth_expired）',
        d3.get('status') != 'auth_expired',
        f'实际={d3.get("status")}',
    )
    check(
        'C4. normalized=true / 有 warnings 提示',
        res3.get('normalized') and len(res3.get('warnings') or []) > 0,
        '',
    )

    # =========================================================
    # 步骤 D：先重设回 auth_expired（含 authNote），再传 authNote=''（显式空串）
    # =========================================================
    print('\n--- D1. 先重设：authExpired=true + authNote 有内容 ---')
    patch(
        BASE + '/api/conflicts/' + NM_ID,
        {
            'authExpired': True,
            'authNote': 'D测试：临时授权，马上会显式清空',
            'note': target['note'],
        },
    )
    after_reset = get(BASE + '/api/conflicts/' + NM_ID)['data']
    print(f'    重置后 status={after_reset["status"]} auth_expired={after_reset["auth_expired"]} auth_note="{after_reset.get("auth_note","")[:20]}"')

    print('--- D2. 传 authNote=""（显式空串，authExpired 不传）→ 应被视为主动清空 ---')
    code4, res4 = patch(
        BASE + '/api/conflicts/' + NM_ID,
        {'authNote': ''},
    )
    print(f'    HTTP={code4} success={res4.get("success")} normalized={res4.get("normalized")}')
    if res4.get('warnings'):
        print('    warnings:', res4['warnings'])
    d4 = res4.get('data') or {}
    check(
        'D1. auth_note 为空（显式空串语义生效）',
        (d4.get('auth_note') or '') == '',
        f'实际="{d4.get("auth_note","")}"',
    )
    check(
        'D2. auth_expired=0',
        d4.get('auth_expired') in (0, False),
        f'实际={d4.get("auth_expired")}',
    )
    check(
        'D3. status 已从 auth_expired 回退',
        d4.get('status') != 'auth_expired',
        f'实际={d4.get("status")}',
    )

    # =========================================================
    # 步骤 E：摘要 / 导出 / 错误校验 400
    # =========================================================
    print('\n--- E. 摘要同步 / CSV 分区 / 参数校验 ---')
    summary = get(BASE + '/api/conflicts/summary')['data']
    print('    summary =', summary)
    check(
        'E1. 总条数=6（种子条数不变）',
        summary.get('total') == 6,
        f'实际={summary.get("total")}',
    )

    csv = urllib.request.urlopen(BASE + '/api/export').read().decode('utf-8-sig')
    parts = csv.split('\n\n===== 授权到期记录 =====\n')
    check(
        'E2. CSV 含授权到期分区',
        len(parts) == 2,
        '分区段数=%d' % len(parts),
    )

    # 参数校验：status 非法
    code5, res5 = patch(BASE + '/api/conflicts/' + NM_ID, {'status': 'foo'})
    check(
        'E3. 非法 status → HTTP 400 + 中文错误',
        code5 == 400 and isinstance(res5.get('error'), str) and '应为' in res5.get('error', ''),
        f'HTTP={code5} err={res5.get("error")[:40]}',
    )

    # 参数校验：authNote 不是字符串
    code6, res6 = patch(BASE + '/api/conflicts/' + NM_ID, {'authNote': 123})
    check(
        'E4. authNote 非字符串 → HTTP 400 + field 标识',
        code6 == 400 and res6.get('field') == 'authNote',
        f'HTTP={code6} field={res6.get("field")}',
    )

    # =========================================================
    # 步骤 F：GET detail + noteHistory 不可覆盖
    # =========================================================
    print('\n--- F. noteHistory 不可覆盖检查 ---')
    detail = get(BASE + '/api/conflicts/' + NM_ID)['data']
    nh = detail.get('noteHistory', [])
    print(f'    noteHistory 共 {len(nh)} 条：')
    for h in nh:
        tag = '【补充】' if h['is_supplementary'] else '       '
        print(f'      · {h["operator_role"]:>12} {tag} {h["content"][:60]}  @{h["created_at"][:16]}')
    system_notes = [h for h in nh if '系统归一' in h['content']]
    user_notes = [h for h in nh if h['operator_role'] == 'manager']
    check(
        'F1. 至少 2 条系统归一记录',
        len(system_notes) >= 2,
        f'系统归一={len(system_notes)}',
    )
    check(
        'F2. manager 角色的补充备注至少 2 条',
        len(user_notes) >= 2,
        f'manager备注={len(user_notes)}',
    )

    # =========================================================
    # 结束
    # =========================================================
    print('\n' + '=' * 60)
    print(f'测试完成：通过 {PASS} / 失败 {FAIL} / 共 {PASS + FAIL}')
    print('=' * 60)
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == '__main__':
    main()
