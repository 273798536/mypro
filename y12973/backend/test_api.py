import os
import sys
import json
import time
import urllib.request
import urllib.parse

BASE = 'http://127.0.0.1:5010'

def req(path, method='GET', data=None, timeout=30):
    url = BASE + path
    headers = {'Content-Type': 'application/json'}
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
    req_obj = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req_obj, timeout=timeout) as resp:
            raw = resp.read().decode('utf-8')
            try:
                return resp.status, json.loads(raw)
            except Exception:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

def log(tag, msg):
    print(f"  [{tag}] {msg}")

def check(name, cond, detail=''):
    if cond:
        log('PASS', f"{name} {detail}")
        return True
    else:
        log('FAIL', f"{name} {detail}")
        return False

SAMPLE_SCHEMAS = [
    {
        'table_name': 't_order_2026_01',
        'schema_json': {
            'columns': [
                {'name': 'id', 'type': 'bigint', 'nullable': False},
                {'name': 'tenant_id', 'type': 'varchar(64)', 'nullable': False},
                {'name': 'account_set', 'type': 'varchar(64)', 'nullable': False},
                {'name': 'amount', 'type': 'decimal(18,2)'},
            ],
            'primary_key': ['id'],
            'indexes': [{'name': 'idx_tenant_account', 'columns': ['tenant_id', 'account_set']}],
        },
        'partition_info': {
            'strategy': 'by_month',
            'key': 'create_time',
            'tenant_column': 'tenant_id',
            'account_set_column': 'account_set',
        },
        'tenant_id': 'T001',
        'account_set': 'ACCT001',
        'row_count': 1280000,
        'data_size': 256000000,
    },
    {
        'table_name': 't_order_item_2026_01',
        'schema_json': {
            'columns': [
                {'name': 'id', 'type': 'bigint'},
                {'name': 'order_id', 'type': 'bigint'},
                {'name': 'tenant_id', 'type': 'varchar(64)'},
                {'name': 'product_id', 'type': 'bigint'},
            ],
            'primary_key': ['id'],
        },
        'partition_info': {
            'strategy': 'by_month',
            'key': 'create_time',
            'tenant_column': 'tenant_id',
        },
        'tenant_id': 'T001',
        'account_set': 'ACCT001',
        'row_count': 5200000,
        'data_size': 512000000,
    },
    {
        'table_name': 't_user_profile',
        'schema_json': {
            'columns': [
                {'name': 'id', 'type': 'bigint'},
                {'name': 'tenant_id', 'type': 'varchar(64)'},
                {'name': 'profile_data', 'type': 'json'},
            ],
            'primary_key': ['id'],
        },
        'partition_info': None,
        'tenant_id': 'T001',
        'account_set': 'ACCT001',
        'row_count': 86000,
        'data_size': 12800000,
    },
]

MIGRATION_SCRIPT = {
    'script_name': 'V20260619001__fix_tenant_partition.sql',
    'script_path': '/opt/migrations/sql/V20260619001__fix_tenant_partition.sql',
    'content': '''ALTER TABLE t_user_profile ADD COLUMN account_set VARCHAR(64) AFTER tenant_id;
ALTER TABLE t_user_profile PARTITION BY LIST COLUMNS(tenant_id, account_set) (
    PARTITION p_T001_ACCT001 VALUES IN (('T001', 'ACCT001'))
);''',
    'related_tables': ['t_user_profile'],
    'status': 'success',
}

def main():
    results = []
    all_pass = True

    print('\n=== 1. Health Check ===')
    status, data = req('/health')
    results.append(check('health.status.200', status == 200))
    results.append(check('health.status.ok', data.get('status') == 'ok'))

    print('\n=== 2. 重复导入去重测试（核心：data_hash 机制）===')

    print('  2.1 第一次导入（slow_query 日常入口）')
    _, r = req('/api/batches/import', 'POST', {
        'import_user': 'sre_alice',
        'source': 'slow_query_log',
        'entry_point': 'slow_query',
        'remark': '慢查询告警 #20260619-001 租户账套分区',
        'schemas': SAMPLE_SCHEMAS,
    })
    batch_1_id = r['data']['batch_id']
    batch_1_no = r['data']['batch_no']
    hash_1 = r['data']['data_hash']
    results.append(check('first_import.action.created', r['data']['action'] == 'created'))
    results.append(check('first_import.batch_id_present', batch_1_id is not None))
    results.append(check('first_import.table_count.3', r['data']['table_count'] == 3))
    log('INFO', f'第一次 batch_id={batch_1_id}, batch_no={batch_1_no}, hash={hash_1[:16]}…')

    print('  2.2 相同数据第二次导入（人工误操作）→ 应去重，不产生新批次')
    _, r2 = req('/api/batches/import', 'POST', {
        'import_user': 'sre_bob',
        'source': 'manual',
        'entry_point': 'manual',
        'remark': '我再导一次试试',
        'schemas': json.loads(json.dumps(SAMPLE_SCHEMAS)),
    })
    results.append(check('second_import.action.skipped', r2['data']['action'] == 'skipped'))
    results.append(check('second_import.same_batch_id', r2['data']['batch_id'] == batch_1_id))
    results.append(check('second_import.same_data_hash', r2['data']['data_hash'] == hash_1))
    log('INFO', f'第二次返回 batch_id={r2["data"]["batch_id"]} (与第一次相同={r2["data"]["batch_id"] == batch_1_id})')

    print('  2.3 调整 schema 顺序 + 相同内容第三次导入 → 哈希仍应一致（排序归一化）')
    shuffled = [SAMPLE_SCHEMAS[2], SAMPLE_SCHEMAS[0], SAMPLE_SCHEMAS[1]]
    _, r3 = req('/api/batches/import', 'POST', {
        'import_user': 'sre_carol',
        'source': 'manual',
        'entry_point': 'manual',
        'schemas': shuffled,
    })
    results.append(check('shuffled_import.action.skipped', r3['data']['action'] == 'skipped'))
    results.append(check('shuffled_import.same_batch_id', r3['data']['batch_id'] == batch_1_id))
    log('INFO', f'乱序导入返回 batch_id={r3["data"]["batch_id"]} (哈希归一化)')

    print('  2.4 修改一条 schema → 应产生新批次（哈希不同）')
    modified = json.loads(json.dumps(SAMPLE_SCHEMAS))
    modified[0]['row_count'] = 9999999
    _, r4 = req('/api/batches/import', 'POST', {
        'import_user': 'sre_dave',
        'source': 'backup_verify',
        'entry_point': 'backup_check',
        'remark': '2026 春季课前备份校验',
        'schemas': modified,
    })
    results.append(check('modified_import.action.created', r4['data']['action'] == 'created'))
    results.append(check('modified_import.different_batch', r4['data']['batch_id'] != batch_1_id))
    batch_2_id = r4['data']['batch_id']
    hash_2 = r4['data']['data_hash']
    results.append(check('modified_import.different_hash', hash_2 != hash_1))
    log('INFO', f'修改后产生新批次 batch_id={batch_2_id}, hash={hash_2[:16]}…')

    print('\n=== 3. 复核结论 & 补录/修正历史链测试 ===')

    print('  3.1 对第一个批次创建初始结论（表级：缺失账套分区）')
    batch_detail = req(f'/api/batches/{batch_1_id}')[1]['data']
    t_user_profile_id = next(t['id'] for t in batch_detail['tables'] if t['table_name'] == 't_user_profile')
    _, c1 = req('/api/conclusions', 'POST', {
        'batch_id': batch_1_id,
        'table_snapshot_id': t_user_profile_id,
        'conclusion_type': 'partition_missing_account',
        'conclusion_content': 't_user_profile 表缺少 account_set 分区列，慢查询跨账套扫描。建议执行 V20260619001 迁移脚本补齐。',
        'reviewer': 'sre_alice',
        'status': 'draft',
    })
    conc_1_id = c1['data']['conclusion_id']
    results.append(check('conclusion.create.ok', c1['code'] == 0))
    results.append(check('conclusion.id_present', conc_1_id is not None))
    log('INFO', f'初始结论 ID={conc_1_id}')

    print('  3.2 先注册迁移脚本（用于后续关联）')
    _, m1 = req('/api/migration_scripts', 'POST', MIGRATION_SCRIPT)
    script_hash = m1['data']['script_hash']
    results.append(check('migration.created', m1['code'] == 0))
    results.append(check('migration.hash_present', len(script_hash) == 64))
    log('INFO', f'迁移脚本 hash={script_hash[:20]}…')

    print('  3.3 补录/修正第一条结论（数据字典更新后，旧结论升级为确认 + 关联迁移脚本 + 修正原因）')
    _, c2 = req('/api/conclusions', 'POST', {
        'batch_id': batch_1_id,
        'table_snapshot_id': t_user_profile_id,
        'conclusion_type': 'needs_migration',
        'conclusion_content': '确认需执行 V20260619001 脚本，补 account_set 列并重分区。预计可降低 70% 慢查询。',
        'reviewer': 'sre_bob',
        'status': 'confirmed',
        'migration_script_ref': script_hash,
        'parent_id': conc_1_id,
        'correction_reason': '数据字典 V2.4 更新后确认该表确实在迁移清单内，原结论级别由告警升级为修复计划',
    })
    conc_2_id = c2['data']['conclusion_id']
    results.append(check('correction.create.ok', c2['code'] == 0))
    results.append(check('correction.new_id', conc_2_id is not None and conc_2_id != conc_1_id))
    log('INFO', f'修正后新结论 ID={conc_2_id} (parent={conc_1_id})')

    print('  3.4 验证 is_latest 标志：父结论自动降为 0，新结论为 1，且批次详情仅展示最新结论（避免两份打架）')
    _, batch_after = req(f'/api/batches/{batch_1_id}')
    visible_conclusions = batch_after['data']['conclusions']
    visible_ids = [c['id'] for c in visible_conclusions]
    results.append(check('latest.only_shows_new', conc_2_id in visible_ids and conc_1_id not in visible_ids,
                         f'可见={visible_ids} 预期=[{conc_2_id}] 不含={conc_1_id}'))

    print('  3.5 验证结论历史链（点回追溯）')
    _, chain = req(f'/api/conclusions/{conc_2_id}/history')
    chain_ids = [c['id'] for c in chain['data']]
    results.append(check('chain.has_both_ids', conc_1_id in chain_ids and conc_2_id in chain_ids,
                         f'历史链={chain_ids}'))
    parent_in_chain = any(c['id'] == conc_1_id and not c['is_latest'] for c in chain['data'])
    new_in_chain = any(c['id'] == conc_2_id and c['is_latest'] for c in chain['data'])
    results.append(check('chain.old_is_not_latest', parent_in_chain))
    results.append(check('chain.new_is_latest', new_in_chain))
    has_reason = any(c.get('correction_reason') and '数据字典' in c['correction_reason'] for c in chain['data'])
    results.append(check('chain.correction_reason_recorded', has_reason))
    log('INFO', f'历史链长度={len(chain["data"])}, ids={chain_ids}')

    print('  3.6 再次修正一次（共三级链）验证历史链不断裂')
    _, c3 = req('/api/conclusions', 'POST', {
        'batch_id': batch_1_id,
        'table_snapshot_id': t_user_profile_id,
        'conclusion_type': 'partition_ok',
        'conclusion_content': '迁移脚本已在 2026-06-19 14:30 执行完毕，表结构和分区已正确对齐。问题闭环。',
        'reviewer': 'sre_carol',
        'status': 'confirmed',
        'migration_script_ref': script_hash,
        'parent_id': conc_2_id,
        'correction_reason': '迁移脚本执行后复核，已修复',
    })
    conc_3_id = c3['data']['conclusion_id']
    _, chain2 = req(f'/api/conclusions/{conc_3_id}/history')
    chain2_ids = [c['id'] for c in chain2['data']]
    results.append(check('chain3.all_present', set([conc_1_id, conc_2_id, conc_3_id]).issubset(set(chain2_ids)),
                         f'三级链={chain2_ids}'))
    log('INFO', f'三级链长度={len(chain2["data"])}, ids={chain2_ids}')

    print('\n=== 4. 迁移脚本 <-> 结论 双向点回测试 ===')
    _, md = req(f'/api/migration_scripts/{script_hash}')
    linked = md['data'].get('linked_conclusions', [])
    linked_ids = [c['id'] for c in linked]
    results.append(check('migration.points_back_to_conclusions', set([conc_2_id, conc_3_id]).issubset(set(linked_ids)),
                         f'迁移脚本关联结论数={len(linked)}, ids={linked_ids}'))

    print('\n=== 5. 同批次统一数据：图表、明细、下载一致性 ===')

    print('  5.1 批次详情：表数一致')
    _, d = req(f'/api/batches/{batch_1_id}')
    results.append(check('batch_detail.tables.3', len(d['data']['tables']) == 3))
    results.append(check('batch_detail.entry.slow_query', d['data']['entry_point'] == 'slow_query'))

    print('  5.2 列表 API 数据与详情一致')
    _, lst = req('/api/batches')
    from_list = next(b for b in lst['data'] if b['id'] == batch_1_id)
    results.append(check('list_table_count.matches', from_list['table_count'] == len(d['data']['tables'])))
    results.append(check('list_conclusion_count.matches', from_list['conclusion_count'] == len(d['data']['conclusions'])))

    print('  5.3 dashboard stats 与批次详情一致')
    _, st = req('/api/dashboard/stats')
    results.append(check('dashboard.total_batches.ge.2', st['data']['total_batches'] >= 2))
    results.append(check('dashboard.recent_batches.contains_batch1',
                         any(b['id'] == batch_1_id for b in st['data']['recent_batches'])))

    print('  5.4 下载 CSV（返回内容不为空）')
    import urllib.request as u2
    try:
        with u2.urlopen(f'{BASE}/api/batches/{batch_1_id}/download?format=csv', timeout=15) as resp:
            csv_raw = resp.read().decode('utf-8')
        results.append(check('download.csv.not_empty', len(csv_raw) > 100))
        results.append(check('download.csv.contains_batchno', batch_1_no in csv_raw))
        results.append(check('download.csv.contains_tables', '表结构快照' in csv_raw and 't_user_profile' in csv_raw))
        results.append(check('download.csv.contains_conclusions', '复核结论' in csv_raw and '迁移脚本' in csv_raw))
        log('INFO', f'CSV 导出 {len(csv_raw)} 字节，含 batch_no、表快照、结论三块')
    except Exception as e:
        results.append(check('download.csv.success', False, str(e)))

    print('  5.5 下载 XLSX')
    try:
        with u2.urlopen(f'{BASE}/api/batches/{batch_1_id}/download?format=xlsx', timeout=15) as resp:
            xlsx_raw = resp.read()
        results.append(check('download.xlsx.not_empty', len(xlsx_raw) > 1000))
        results.append(check('download.xlsx.is_valid_zip', xlsx_raw[:2] == b'PK'))
        log('INFO', f'XLSX 导出 {len(xlsx_raw)} 字节 (ZIP签名校验通过)')
    except Exception as e:
        results.append(check('download.xlsx.success', False, str(e)))

    print('\n=== 6. 双入口分流：slow_query vs backup_check ===')
    _, sq = req('/api/batches?entry_point=slow_query')
    _, bc = req('/api/batches?entry_point=backup_check')
    sq_ids = [b['id'] for b in sq['data']]
    bc_ids = [b['id'] for b in bc['data']]
    results.append(check('entry.slow_contains_batch1', batch_1_id in sq_ids))
    results.append(check('entry.backup_contains_batch2', batch_2_id in bc_ids))
    results.append(check('entry.no_cross_contamination', batch_1_id not in bc_ids and batch_2_id not in sq_ids))
    log('INFO', f'slow_query 入口批次={sq_ids}, backup_check 入口批次={bc_ids}')

    print('\n=== 7. 批次对比 API（测试结构差异检测）===')
    _, cmp_r = req(f'/api/compare_batches?batch_a={batch_1_id}&batch_b={batch_2_id}')
    cmp = cmp_r['data']
    results.append(check('compare.summary.modified.ge.1', cmp['summary']['modified'] >= 1))
    results.append(check('compare.diffs.contains_t_order',
                         any(d['table_name'] == 't_order_2026_01' and d['status'] == 'modified' for d in cmp['diffs'])))
    log('INFO', f'对比摘要={cmp["summary"]}')

    print('\n=== 8. 再一次补录（极端场景：重复补录同一件事）→ 仍只保留一条最新 ===')
    first_latest_before = len(req(f'/api/batches/{batch_1_id}')[1]['data']['conclusions'])
    _, c4 = req('/api/conclusions', 'POST', {
        'batch_id': batch_1_id,
        'table_snapshot_id': t_user_profile_id,
        'conclusion_type': 'partition_ok',
        'conclusion_content': '（误操作重复提交）迁移脚本执行后复核，已修复',
        'reviewer': 'sre_carol_dup',
        'status': 'confirmed',
        'parent_id': conc_3_id,
        'correction_reason': '测试重复补录去重',
    })
    latest_after = req(f'/api/batches/{batch_1_id}')[1]['data']['conclusions']
    results.append(check('latest_count_after_dup_review', first_latest_before == len(latest_after),
                         f'补录前 latest_count={first_latest_before}, 补录后={len(latest_after)} (应相等)'))
    log('INFO', f'重复补录后：latest_count 未增加（仍然只有一张表的最新结论）')

    passed = sum(1 for r in results if r)
    total = len(results)
    all_pass = all(results)

    print()
    print('=' * 60)
    print(f'测试结果：{passed}/{total} 通过' + (' ✅' if all_pass else ' ❌ 有失败'))
    print('=' * 60)

    out_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_result.txt')
    with open(out_file, 'w') as f:
        f.write(f'Total: {total}, Passed: {passed}, Failed: {total - passed}\n')
        f.write(f'All pass: {all_pass}\n')

    return 0 if all_pass else 1


if __name__ == '__main__':
    sys.exit(main())
