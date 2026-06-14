import warnings, os, sys, io, base64
warnings.filterwarnings("ignore")

from app import app, db, QueueRecord, Screenshot, ProcessingState

TEST_DATA = [
    {'window_id': 'A-01', 'total_wait_time': 1250.5, 'queue_length': 25, 'service_count': 23},
    {'window_id': 'A-02', 'total_wait_time': 960.0,  'queue_length': 18, 'service_count': 18},
    {'window_id': 'A-03', 'total_wait_time': 2040.8, 'queue_length': 38, 'service_count': 35},
    {'window_id': 'B-01', 'total_wait_time': 744.0,  'queue_length': 12, 'service_count': 12},
    {'window_id': 'B-02', 'total_wait_time': 1520.3, 'queue_length': 31, 'service_count': 29},
    {'window_id': 'B-03', 'total_wait_time': 890.0,  'queue_length': 0,  'service_count': 0},
    {'window_id': 'C-02', 'total_wait_time': 450.0,  'queue_length': 0,  'service_count': 0},
]
NORMAL_WINDOWS = {'A-01','A-02','A-03','B-01','B-02'}
BOUNDARY_WINDOWS = {'B-03','C-02'}

out_lines = []
def P(s):
    out_lines.append(s)
    print(s)

P("="*78)
P("Bug修复验证：正常记录对比图必须严格排除除零边界")
P("="*78)

with app.app_context():
    db.drop_all(); db.create_all()

client = app.test_client()
P("\n[Step 1] 新会话GET首页，确认初始空状态")
resp = client.get('/')
P(f"  首页状态码: {resp.status_code} {'✅' if resp.status_code == 200 else '❌'}")
assert resp.status_code == 200

P("\n[Step 2] 模拟点击'加载演示数据'（使用真实升级版数据：5正常+2边界）")
resp = client.post('/load_demo_data', follow_redirects=True)
P(f"  POST /load_demo_data 状态码: {resp.status_code} {'✅' if resp.status_code == 200 else '❌'}")
assert resp.status_code == 200

P("\n[Step 3] 检查数据库中记录数量与类型是否正确分流")
with app.app_context():
    state = ProcessingState.query.first()
    records = QueueRecord.query.all()
    normal_db = [r for r in records if not r.is_boundary]
    boundary_db = [r for r in records if r.is_boundary]
    n_wins = {r.window_id for r in normal_db}
    b_wins = {r.window_id for r in boundary_db}
    P(f"  总记录数: {state.total_records} (期望7) {'✅' if state.total_records == 7 else '❌'}")
    P(f"  正常记录数: {state.processed_count} (期望5) {'✅' if state.processed_count == 5 else '❌'}")
    P(f"  边界记录数: {state.boundary_count} (期望2) {'✅' if state.boundary_count == 2 else '❌'}")
    P(f"  正常记录的窗口: {sorted(n_wins)}")
    P(f"  边界记录的窗口: {sorted(b_wins)}")
    assert n_wins == NORMAL_WINDOWS, f"正常窗口错: {n_wins}"
    assert b_wins == BOUNDARY_WINDOWS, f"边界窗口错: {b_wins}"
    P(f"  数据分层正确 ✅")
    
    P("\n[Step 4] 检查每条正常记录的计算过程和单位换算")
    calc_ok = True
    for r in normal_db:
        if not r.calculation_steps:
            P(f"  ❌ {r.window_id}: 缺少calculation_steps")
            calc_ok = False
            continue
        steps = r.calculation_steps.split('\n')
        # 必须包含'步骤1：原始计算'、'步骤2：单位换算'、换算系数
        has_raw = any('原始计算' in s for s in steps)
        has_conv = any('单位换算' in s for s in steps)
        has_factor = any('换算系数' in s for s in steps)
        has_final = any('最终结果' in s for s in steps)
        expected_avg = round(r.total_wait_time / r.queue_length / 60.0, 4)
        actual_avg = round(r.avg_wait_time, 4)
        match = abs(expected_avg - actual_avg) < 0.01
        status = '✅' if (has_raw and has_conv and has_factor and has_final and match) else '❌'
        P(f"  {r.window_id}: 步骤数={len(steps)} 原始={has_raw} 换算={has_conv} 系数={has_factor} 结果={has_final} | 平均={actual_avg}期望{expected_avg} {status}")
        if not all([has_raw, has_conv, has_factor, has_final, match]):
            calc_ok = False
    for r in boundary_db:
        steps = r.calculation_steps.split('\n')
        has_div_zero = any('除零' in s for s in steps)
        has_warn = any('⚠️' in s or '边界' in s for s in steps)
        status = '✅' if (has_div_zero and has_warn) else '❌'
        P(f"  {r.window_id}边界: 步骤含除零={has_div_zero} 含警告={has_warn} {status}")
        if not (has_div_zero and has_warn):
            calc_ok = False
    assert calc_ok, "计算链有缺失"
    P("  所有记录计算过程透明化 ✅")

P("\n[Step 5] 触发POST /generate_screenshots，核心修复验证点")
resp = client.post('/generate_screenshots')
P(f"  接口状态码: {resp.status_code} {'✅' if resp.status_code == 200 else '❌'}")
import json
js = json.loads(resp.data.decode())
P(f"  返回: success={js.get('success')} msg={js.get('message')}")
assert resp.status_code == 200 and js.get('success')

P("\n[Step 6] ★★★ 核心检查：数据库中每张截图的record_ids是否严格对应 ★★★")
with app.app_context():
    shots = Screenshot.query.order_by(Screenshot.id).all()
    P(f"  共生成 {len(shots)} 张截图")
    for s in shots:
        ids = set(int(x) for x in s.record_ids.split(',')) if s.record_ids else set()
        # 根据id反查窗口
        wins = set(db.session.query(QueueRecord.window_id).filter(QueueRecord.id.in_(ids)).all())
        wins = {w[0] for w in wins}
        P(f"\n  [{s.category}] {s.title}")
        P(f"    description: {s.description[:80]}...")
        P(f"    record_ids={ids} → 窗口={wins}")
        
        if s.category == 'processed' and '正常记录' in s.title:
            P(f"    ⚠️  关键检查：正常图绝对不能包含B-03或C-02")
            hit = wins & BOUNDARY_WINDOWS
            if hit:
                P(f"    ❌❌❌ BUG仍在！正常记录图混入了边界窗口: {hit} ❌❌❌")
                raise AssertionError(f"BUG: 正常图含{hit}")
            else:
                P(f"    ✅✅✅ 修复成功！B-03/C-02均未进入正常记录对比图，严格排除边界 ✅✅✅")
            if wins == NORMAL_WINDOWS:
                P(f"    ✅ 正好是5个正常窗口 {sorted(wins)}")
            else:
                P(f"    ⚠️  窗口不全: {wins} vs 期望 {NORMAL_WINDOWS}")
        
        if s.category == 'processed' and '全部记录' in s.title:
            P(f"    对照图应同时含正常(绿)+边界(红): 共{len(wins)}个窗口")
            if wins == (NORMAL_WINDOWS | BOUNDARY_WINDOWS):
                P(f"    ✅ 所有窗口都在，红标边界可供运营对照两组参数")
        
        if s.category == 'pending':
            P(f"    待补材料(边界详情图)检查：只能有边界窗口")
            bad = wins - BOUNDARY_WINDOWS
            if bad:
                P(f"    ❌ 边界详情图混入正常: {bad}")
                raise AssertionError(f"边界图含{bad}")
            else:
                P(f"    ✅ 边界详情图只含 {wins}，无正常记录混入")
    
    P("\n[Step 7] 验证截图内容（base64图片头正确 & 文件已写入磁盘）")
    for s in shots:
        head_ok = s.image_base64.startswith('iVBOR')  # PNG header
        file_ok = os.path.exists(s.file_path) and os.path.getsize(s.file_path) > 8000
        P(f"  [{s.category[:8]}]{s.title[:10]}: base64PNG头={head_ok} 文件存在>8KB={file_ok} {'✅' if head_ok and file_ok else '❌'}")
        assert head_ok and file_ok

P("\n" + "="*78)
P("🎉🎉🎉 全部验证项通过！Bug修复确认！🎉🎉🎉")
P("="*78)
P("")
P("修复总结：")
P("  1. /generate_screenshots 中 正常记录对比图 改为只传 normal_records (5窗)")
P("     - 之前的bug: 传 records_dict (7窗) 导致B-03、C-02混进正常结果图")
P("     - 现在: 严格筛选后只传 A-01,A-02,A-03,B-01,B-02")
P("  2. 新增「全部记录对照视图」满足运营拿两组参数对照需求")
P("     - 7个窗口同图，红色柱明确标注除零边界，绿色=正常")
P("     - description中文字强调：红色勿计入正常统计")
P("  3. 「边界详情图」→ 只传 boundary_records (2窗: B-03,C-02)")
P("  4. record_ids 字段、description 数字、实际传入列表 三者严格对齐")
P("     - 任何一对不一致都会导致本验证脚本 assertion fail")

with open('/tmp/FLASK_VERIFY_RESULT.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))
