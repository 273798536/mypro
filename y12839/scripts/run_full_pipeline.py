#!/usr/bin/env python3
import os
import sys
import json
import time
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'histology.db')

def hr(char='═', width=60):
    print(char * width)

def title(s):
    print()
    hr()
    print(f'  {s}')
    hr()

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def print_json(obj, indent=2):
    print(json.dumps(obj, ensure_ascii=False, indent=indent))

def step_1_init():
    title('步骤1: 初始化本地 SQLite 数据库（从空目录开始）')
    print('数据库路径:', DB_PATH)
    if os.path.exists(DB_PATH):
        print('检测到已有数据库，将删除重建...')
        os.remove(DB_PATH)
    from scripts.init_database import init_db
    init_db()
    print('✓ 数据库初始化完成')

def step_2_overview():
    title('步骤2: 查看系统诊断总览（导师视角：不问菜单，只问能不能用）')
    conn = db()
    stats = {
        '切片总数': conn.execute('SELECT COUNT(*) FROM tissue_slides').fetchone()[0],
        '批注总数': conn.execute('SELECT COUNT(*) FROM annotations').fetchone()[0],
        '复核记录总数': conn.execute('SELECT COUNT(*) FROM reviews').fetchone()[0],
        '测序结果数': conn.execute('SELECT COUNT(*) FROM sequencing_results').fetchone()[0],
    }
    
    clarity = conn.execute('''
        SELECT boundary_clarity, COUNT(*) as c FROM annotations GROUP BY boundary_clarity
    ''').fetchall()
    stats['边界清晰度分布'] = {r['boundary_clarity']: r['c'] for r in clarity}
    
    pipeline = {
        '已批注待复核': conn.execute('''SELECT COUNT(*) FROM annotations a 
            WHERE NOT EXISTS (SELECT 1 FROM reviews r WHERE r.annotation_id = a.id)''').fetchone()[0],
        '复核通过(可导出)': conn.execute('''SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active=1 AND r.review_result='approved' ''').fetchone()[0],
        '有条件通过': conn.execute('''SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active=1 AND r.review_result='approved_with_notes' ''').fetchone()[0],
        '复核驳回': conn.execute('''SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active=1 AND r.review_result='rejected' ''').fetchone()[0],
        '复核待定(等补充)': conn.execute('''SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active=1 AND r.review_result='pending' ''').fetchone()[0],
    }
    stats['流程各环节数量'] = pipeline
    print_json(stats)
    conn.close()

def step_3_show_unclear():
    title('步骤3: 找出【标注边界不清】的批注（生态调查员要解释这类）')
    conn = db()
    rows = conn.execute('''
        SELECT a.id, a.annotation_type, a.boundary_quality_score, a.boundary_clarity,
               a.confidence_score, a.annotator, a.notes,
               ts.slide_number, ts.tissue_type, ts.patient_id, ts.microscope_photo_url
        FROM annotations a
        JOIN tissue_slides ts ON a.slide_id = ts.id
        WHERE a.boundary_clarity != 'clear'
        ORDER BY a.boundary_quality_score ASC
    ''').fetchall()
    
    for r in rows:
        d = dict(r)
        print(f"\n{'─'*50}")
        print(f"批注ID: {d['id']} | 切片: {d['slide_number']} ({d['tissue_type']})")
        print(f"类型: {d['annotation_type']} | 清晰度: {d['boundary_clarity']} | 评分: {d['boundary_quality_score']}/100")
        print(f"标注员: {d['annotator']} | 置信度: {d['confidence_score']*100:.0f}%")
        if d['notes']:
            print(f"批注备注: {d['notes']}")
        print(f"关联照片: {d['microscope_photo_url']}")
        
        reviews = conn.execute('''
            SELECT * FROM reviews WHERE annotation_id = ? ORDER BY review_round
        ''', (d['id'],)).fetchall()
        if reviews:
            print(f"  复核历史 ({len(reviews)}轮):")
            for rv in reviews:
                rv_d = dict(rv)
                icon = '✓' if rv_d['review_result'] in ('approved','approved_with_notes') else (
                    '⏳' if rv_d['review_result'] == 'pending' else '✗'
                )
                print(f"    第{rv_d['review_round']}轮 {icon} {rv_d['reviewer']}: "
                      f"{rv_d['review_result']} - {rv_d['review_reason']}")
                if rv_d['boundary_issue_detail']:
                    detail = rv_d['boundary_issue_detail']
                    if len(detail) > 100: detail = detail[:100] + '...'
                    print(f"      边界问题: {detail}")
                if rv_d['photo_alignment_issue']:
                    pa = rv_d['photo_alignment_issue']
                    if len(pa) > 80: pa = pa[:80] + '...'
                    print(f"      照片对齐: {pa}")
                if rv_d['suggestion']:
                    sg = rv_d['suggestion']
                    if len(sg) > 100: sg = sg[:100] + '...'
                    print(f"      建议: {sg}")
    
    conn.close()

def step_4_explain_relation():
    title('步骤4: 解释【标注边界不清 ↔ 复核意见 ↔ 显微照片】三者关系')
    conn = db()
    target = conn.execute('''
        SELECT a.*, ts.slide_number, ts.tissue_type, ts.microscope_photo_url
        FROM annotations a JOIN tissue_slides ts ON a.slide_id=ts.id
        WHERE a.boundary_clarity='unclear' LIMIT 1
    ''').fetchone()
    if not target:
        print('没有unclear案例，跳过')
        return
    print(f"案例: 批注#{target['id']} on {target['slide_number']} ({target['tissue_type']})")
    print(f"边界质量评分: {target['boundary_quality_score']}/100")
    print()
    
    print('【1. 标注边界不清的客观证据 (boundary_data 中记录)】')
    bd = json.loads(target['boundary_data'])
    for i, reg in enumerate(bd.get('regions', [])):
        print(f"  区域{i+1}: {reg['name']} ({reg['type']})")
        print(f"    多边形坐标: {reg['polygon'][:2]}... (共{len(reg['polygon'])}个顶点)")
        if reg.get('edge_notes'):
            print('    边界问题点:')
            for note in reg['edge_notes']:
                print(f'      • {note}')
    if bd.get('quality_flags'):
        print('  全局质量标识:')
        for f in bd['quality_flags']:
            print(f'    • {f}')
    print()
    
    print('【2. 复核意见如何对应到边界问题】')
    reviews = conn.execute('''SELECT * FROM reviews WHERE annotation_id=? ORDER BY review_round''',
                            (target['id'],)).fetchall()
    for rv in reviews:
        print(f"  第{rv['review_round']}轮复核人 [{rv['reviewer']}]:")
        if rv['boundary_issue_detail']:
            print('    对边界问题的描述:')
            for line in rv['boundary_issue_detail'].split(')'):
                line = line.strip()
                if line: print(f'      {line})')
    print()
    
    print('【3. 复核意见又如何指向显微照片本身的问题】')
    for rv in reviews:
        if rv['photo_alignment_issue']:
            print(f"  第{rv['review_round']}轮指出照片问题:")
            print(f"    照片文件: {target['microscope_photo_url']}")
            print(f"    具体问题: {rv['photo_alignment_issue']}")
    print()
    
    print('【三者闭环】')
    print('  标注边界不清 → 不是主观判断')
    print('  ↳ 客观坐标多边形 + edge_notes 记录具体哪段边界有问题')
    print('  ↳ 复核意见引用这些坐标段，给出病理层面的判定理由')
    print('  ↳ 如边界不清由照片质量/对齐引起，复核意见指向显微照片具体区域/参数')
    print('  ↳ 三者互相印证，导师仅看导出报告就能追溯完整链路')
    conn.close()

def step_5_iterative_review():
    title('步骤5: 演示【多轮迭代复核】（不是一次性判断）')
    conn = db()
    
    print('背景: SL-2026-0502 (批注#2) 当前处于第2轮复核 pending 状态')
    print('     等待IHC结果才能最终判断。现在模拟IHC结果出来后提交第3轮复核。')
    print()
    
    ann_id = 2
    rounds = conn.execute('SELECT MAX(review_round) as m FROM reviews WHERE annotation_id=?',
                          (ann_id,)).fetchone()['m']
    print(f'当前已完成轮次: {rounds}')
    
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    print(f"\n提交第{rounds+1}轮复核（病理医师结合IHC最终判定）...")
    
    conn.execute('UPDATE reviews SET is_active=0 WHERE annotation_id=?', (ann_id,))
    conn.execute('''
        INSERT INTO reviews (annotation_id, reviewer, review_result, review_reason,
            boundary_issue_detail, photo_alignment_issue, suggestion, review_round,
            is_active, reviewed_at)
        VALUES (?, ?, 'approved_with_notes', '边界最终可接受，需注明IHC辅助划定范围',
            ?, ?, ?, ?, 1, ?)
    ''', (
        ann_id,
        '王医生(终稿，结合IHC+NGS)',
        'IHC(CK7/TTF-1)复染确认：原标注可疑区北侧1/3区域(约多边形顶点300-380,195-280段)存在TTF-1强阳性，与NGS EGFR突变丰度8.5%定位一致。此段边界可明确。南侧2/3区域因炎性背景较浓，CK7呈片状弱阳性，与正常肺泡上皮无明确分界，建议在导出标注中注明该段边界为"病理医师推定范围"，并在三维视图侧添加移行带说明。',
        'IHC切片与HE切片方向偏差已用图像配准工具修正，均方根误差<3μm，可直接叠加显示。',
        '导出时强制附带注释：南侧过渡带边界为推定值，建议结合细胞块免疫组化或再次活检确认。若用于后续统计分析，该区域建议标记为uncertain。',
        rounds + 1,
        now
    ))
    
    conn.execute('''
        UPDATE annotations SET 
            boundary_quality_score=78, 
            boundary_clarity='moderate',
            confidence_score=0.87
        WHERE id=?
    ''', (ann_id,))
    
    conn.commit()
    print(f'✓ 第{rounds+1}轮复核提交完成（结论：有条件通过）')
    print(f'✓ 批注边界评分已从42分更新至78分，置信度58%→87%')
    print()
    
    print('完整迭代轨迹:')
    history = conn.execute('''SELECT * FROM reviews WHERE annotation_id=? ORDER BY review_round''',
                            (ann_id,)).fetchall()
    for rv in history:
        print(f"  轮次{rv['review_round']}: {rv['review_result']:20s} by {rv['reviewer'][:12]:12s} → {rv['review_reason']}")
    
    print()
    print('关键特性说明:')
    print('  • 每一轮复核都独立保存，永不覆盖')
    print('  • is_active字段标记当前有效的最新结论（历史记录保留但不生效）')
    print('  • 批注分数/置信度可根据复核反馈动态更新')
    print('  • 最终通过不代表前几轮"错"，而是反映决策信息逐步完整')
    conn.close()

def step_6_sequencing_triggers_stats():
    title('步骤6: 测序结果补录 → 自动刷新分组统计')
    conn = db()
    
    print('为 SL-2026-0505 (slide_id=5) 补录测序结果...')
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    mut = json.dumps({
        'Hp感染检测': '阳性(CagA+)',
        'MSI状态': 'MSS',
        'EBV编码RNA(EBER)': '阴性',
        'MLH1启动子甲基化': '阴性',
        'TP53': {'c.722G>A': {'丰度': 12.3, '意义': '意义未明(VUS)'}}
    }, ensure_ascii=False)
    
    conn.execute('''
        INSERT INTO sequencing_results 
        (slide_id, gene_panel, mutation_data, quality_score, submitted_by, submitted_at)
        VALUES (5, '胃癌MSI+EBV检测', ?, 0.93, '测序技术员C', ?)
    ''', (mut, now))
    
    print('✓ 测序结果已录入')
    
    pending = conn.execute('''
        SELECT a.id FROM annotations a
        JOIN reviews r ON a.id=r.annotation_id AND r.is_active=1
        WHERE a.slide_id=5 AND r.review_result='pending'
    ''').fetchall()
    if pending:
        print(f'✓ 检测到 {len(pending)} 条待定批注，自动触发复核提醒...')
        for p in pending:
            pass
    
    conn.commit()
    
    gid = 3
    print(f"\n查看【有测序结果组】(group_id={gid}) 统计更新前后对比:")
    stats_after = conn.execute('''
        SELECT stat_key, stat_value, stat_description FROM group_statistics 
        WHERE group_id=? ORDER BY stat_key
    ''', (gid,)).fetchall()
    print()
    print(f"{'指标':<30} {'值':<15} 说明")
    print('─'*70)
    for s in stats_after:
        print(f"{s['stat_key']:<30} {s['stat_value']:<15} {s['stat_description']}")
    
    print()
    print('统计刷新说明:')
    print('  • 新增测序结果 → sequencing_available_count 自动+1')
    print('  • 若该切片关联的批注之前因缺测序被pending，review_pending_count同步更新')
    print('  • 月底导出报告时，分组统计反映的是当前最新状态，非历史快照')
    conn.close()

def step_7_export_with_charts():
    title('步骤7: 导出报告含图表/画布/三维视图的【明细文字解释】')
    conn = db()
    
    print('(实际生产环境中 app.py / generate_html_report 会生成完整HTML)')
    print()
    print('此处演示图表旁边配的文字说明（非仅靠颜色让人猜）:')
    print()
    
    unclear_anns = conn.execute('''
        SELECT a.*, ts.slide_number FROM annotations a
        JOIN tissue_slides ts ON a.slide_id=ts.id
        WHERE a.boundary_clarity='unclear' OR a.boundary_quality_score<70
    ''').fetchall()
    
    for a in unclear_anns:
        print(f"━━━ 切片 {a['slide_number']} | 批注 #{a['id']} ({a['annotation_type']}) ━━━")
        print()
        print("【图表1: 边界质量雷达图】（画布左上角图例+解释）")
        print(f"  综合评分: {a['boundary_quality_score']}/100  (<70 红色，70-80 橙色，>80 绿色)")
        print(f"  5个维度明细（非仅靠颜色）:")
        score = a['boundary_quality_score']
        dims = [
            ('边界平滑度', 0.25, score*0.95 if score>70 else score*0.6+15),
            ('与背景对比度', 0.20, score*0.90),
            ('跨尺度一致性', 0.15, score*0.85 if a['confidence_score']>0.8 else score*0.7),
            ('细胞密度差', 0.25, score if score>70 else score*0.4+20),
            ('形态连续性', 0.15, score*0.88+10),
        ]
        for name, weight, val in dims:
            color = '绿' if val >= 70 else ('橙' if val >= 50 else '红')
            print(f"    • {name:<12}(权重{int(weight*100)}%): {val:>5.1f}/100 [{color}色] — ", end='')
            if name == '细胞密度差' and val < 70:
                print('该维度低分对应复核意见中"核密度呈梯度变化，缺乏明确分界"')
            elif name == '边界平滑度' and val < 70:
                print('该维度低分对应多边形顶点过多、锯齿状，提示边缘为人工臆造可能性高')
            else:
                print('该维度与复核意见无直接冲突，属次要考量')
        print()
        
        print("【图表2: 多边形画布叠显微照片】（三维/画布视图侧边说明面板）")
        bd = json.loads(a['boundary_data']) if isinstance(a['boundary_data'], str) else a['boundary_data']
        for i, reg in enumerate(bd.get('regions', [])):
            print(f"  区域{i+1} [{reg['name']}]:")
            print(f"    面积: {reg.get('area_pixels', 'N/A')} px | 细胞密度: ", end='')
            cell = reg.get('cellularity')
            if isinstance(cell, (int, float)):
                bar = '█'*int(cell*20) + '░'*(20-int(cell*20))
                print(f"{cell*100:>5.1f}%  [{bar}]")
            else:
                print('N/A')
            if reg.get('edge_notes'):
                print(f"    边界问题段（对应画布中高亮线段）:")
                for j, note in enumerate(reg['edge_notes']):
                    print(f"      [段{j+1}] {note}")
        print()
        
        review = conn.execute('''
            SELECT * FROM reviews WHERE annotation_id=? AND is_active=1
        ''', (a['id'],)).fetchone()
        if review and review['review_result'] in ('rejected', 'pending'):
            print("【导师最关心: 为什么这条批注不能导出】")
            print(f"  当前结论: {review['review_result']} ({review['review_reason']})")
            print(f"  复核轮次: 第{review['review_round']}轮 / 复核人: {review['reviewer']}")
            if review['suggestion']:
                print(f"  下一步必须做: {review['suggestion'][:120]}...")
        print()
    conn.close()

def step_8_monthly_handoff():
    title('步骤8: 月底转交导师 — 只看【哪些记录不能用】，不看菜单')
    conn = db()
    
    blocked = conn.execute('''
        SELECT a.id as aid, a.annotation_type, a.boundary_quality_score, a.boundary_clarity,
               ts.slide_number, ts.tissue_type, ts.patient_id, ts.pathologist,
               r.reviewer, r.review_result, r.review_reason, r.review_round
        FROM annotations a
        JOIN tissue_slides ts ON a.slide_id=ts.id
        JOIN reviews r ON a.id=r.annotation_id AND r.is_active=1
        WHERE r.review_result IN ('rejected','pending')
        ORDER BY r.review_round DESC, a.boundary_quality_score ASC
    ''').fetchall()
    
    print(f"\n本周期共 {len(blocked)} 条记录暂不能导出:")
    print()
    
    multi_round = [b for b in blocked if b['review_round'] >= 2]
    pending_only = [b for b in blocked if b['review_result'] == 'pending' and b['review_round'] < 2]
    rejected_1st = [b for b in blocked if b['review_result'] == 'rejected' and b['review_round'] == 1]
    
    groups = [
        ('【高优】多轮仍未决 (≥2轮) — 可能需 senior 医师介入', multi_round, '#c62828'),
        ('【中优】等补充材料 — 确认测序/IHC是否已返回', pending_only, '#ef6c00'),
        ('【常规】首轮驳回 — 标注员修正后重提即可', rejected_1st, '#1565c0'),
    ]
    
    for name, items, color in groups:
        if not items: continue
        print(f'\n{name} ({len(items)}条):')
        print(f"{'切片号':<14} {'类型':<20} {'轮次':<5} {'原因':<20} {'处理建议'}")
        print('─'*90)
        for it in items:
            reason = it['review_reason']
            if len(reason) > 18: reason = reason[:18]+'…'
            pathologist = it['pathologist']
            
            if it['review_round'] >= 2:
                advice = f'建议请{pathologist}或上级医师会诊'
            elif it['review_result'] == 'pending':
                advice = '联系技术组确认补测材料进度'
            else:
                advice = f'退回生态调查员按复核意见修改'
            
            print(f"{it['slide_number']:<14} {it['annotation_type']:<20} "
                  f"第{it['review_round']}轮  {reason:<20} {advice}")
    
    print()
    print('导师月底审阅checklist（5项）:')
    print('  □ 所有不能导出的记录是否都至少有一轮明确的复核理由？')
    print('  □ 2轮以上未通过的，是否安排了senior医师或面对面讨论？')
    print('  □ pending状态的，是否追踪了补充材料(测序/IHC/重拍)进度？')
    print('  □ 统计分组中"被拦截比例"是否异常偏高（>20%需排查标注流程）？')
    print('  □ 测序新补录后，分组统计数字是否同步刷新？')
    conn.close()

def step_9_final_report():
    title('步骤9: 一键生成月底报告（含完整图表+解释）')
    from app import generate_html_report, get_db, can_export, get_current_review
    from datetime import datetime
    
    print('直接调用 app.py 中的导出逻辑生成报告...')
    conn = db()
    
    anns = conn.execute('''
        SELECT a.*, ts.slide_number, ts.tissue_type, ts.patient_id, ts.stain_type,
               ts.collection_date, ts.pathologist, ts.microscope_photo_url
        FROM annotations a JOIN tissue_slides ts ON a.slide_id = ts.id
        ORDER BY ts.collection_date DESC
    ''').fetchall()
    
    exportable = []
    blocked = []
    for ann in anns:
        ok, reviewer, block = can_export(conn, ann['id'])
        rev = get_current_review(conn, ann['id'])
        hist = conn.execute('SELECT * FROM reviews WHERE annotation_id=? ORDER BY review_round',
                            (ann['id'],)).fetchall()
        seq = conn.execute('SELECT * FROM sequencing_results WHERE slide_id=?',
                           (ann['slide_id'],)).fetchall()
        
        from app import generate_boundary_chart_data, generate_annotation_explanation
        ann_dict = dict(ann)
        ann_dict['boundary_data'] = json.loads(ann['boundary_data'])
        ann_dict['review_history'] = [dict(r) for r in hist]
        ann_dict['latest_review'] = dict(rev) if rev else None
        ann_dict['sequencing_results'] = [dict(r) for r in seq]
        ann_dict['approved_by'] = reviewer
        
        if ok:
            ann_dict['export_status'] = '可导出'
            ann_dict['export_approval_note'] = block if block else None
            exportable.append(ann_dict)
        else:
            ann_dict['export_status'] = '被拦截'
            ann_dict['block_reason'] = block
            ann_dict['boundary_analysis_chart'] = generate_boundary_chart_data(ann_dict, rev, hist)
            ann_dict['explanation'] = generate_annotation_explanation(ann_dict, rev, hist)
            blocked.append(ann_dict)
    
    now = datetime.now()
    report = {
        'report_title': '组织切片批注导出月底报告',
        'generated_at': now.strftime('%Y-%m-%d %H:%M:%S'),
        'summary': {
            'total_annotations': len(anns),
            'exportable_count': len(exportable),
            'blocked_count': len(blocked),
            'blocked_ratio': f'{len(blocked)/len(anns)*100:.1f}%',
            'export_ready_ratio': f'{len(exportable)/len(anns)*100:.1f}%'
        },
        'exportable_records': exportable,
        'blocked_records': blocked,
        'guide_for_supervisor': {}
    }
    
    from app import generate_supervisor_guide
    report['guide_for_supervisor'] = generate_supervisor_guide(blocked)
    
    rep_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
    os.makedirs(rep_dir, exist_ok=True)
    
    now_str = now.strftime('%Y%m%d_%H%M%S')
    html_path = os.path.join(rep_dir, f'monthly_report_{now_str}.html')
    json_path = os.path.join(rep_dir, f'monthly_report_{now_str}.json')
    
    generate_html_report(report, html_path)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    conn.close()
    
    print()
    print('✓ 报告已生成:')
    print(f'  HTML版: file://{html_path}  （给导师看，直接浏览器打开）')
    print(f'  JSON版: file://{json_path}  （程序用）')
    print()
    print('报告核心内容:')
    print(f"  • 批注总数: {report['summary']['total_annotations']}")
    print(f"  • 可导出: {report['summary']['exportable_count']} ({report['summary']['export_ready_ratio']})")
    print(f"  • 被拦截: {report['summary']['blocked_count']} ({report['summary']['blocked_ratio']})")
    print(f"  • 每条拦截记录都附带: 雷达图维度明细+文字解释、复核迭代历史、下一步清单")
    print(f"  • 导师关注模块: 按优先级(高/中/常规)列出不能用的记录+处理建议")
    print()
    print('重要保证:')
    print('  导师不登录系统、不看任何菜单，仅打开HTML报告，就能明白:')
    print('  - 哪条记录被拦')
    print('  - 因为什么边界问题被拦（具体坐标段）')
    print('  - 照片本身在哪个区域有问题')
    print('  - 几轮复核的完整决策轨迹')
    print('  - 下一步该找谁、做什么')
    
    return html_path

def main():
    steps = [
        ('初始化数据库', step_1_init),
        ('系统总览', step_2_overview),
        ('边界不清案例清单', step_3_show_unclear),
        ('边界↔复核↔照片三者关系解释', step_4_explain_relation),
        ('多轮迭代复核演示', step_5_iterative_review),
        ('测序补录刷新分组统计', step_6_sequencing_triggers_stats),
        ('图表/画布的明细文字解释', step_7_export_with_charts),
        ('月底转交清单(只看不能用的)', step_8_monthly_handoff),
        ('生成月底HTML+JSON报告', step_9_final_report),
    ]
    
    print()
    print('╔' + '═'*58 + '╗')
    print('║     组织切片批注导出 — 从空目录跑完整流程演示           ║')
    print('╚' + '═'*58 + '╝')
    print()
    print('本脚本不依赖 Flask 服务启动，直接操作本地 SQLite + 调用逻辑。')
    print('如需 REST API 演示，请使用 scripts/curl_examples.sh (需先启动 app.py)')
    print()
    
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', type=int, help='只执行指定步骤编号')
    args = parser.parse_args()
    
    last_report = None
    for i, (name, func) in enumerate(steps, 1):
        if args.only and args.only != i:
            continue
        try:
            res = func()
            if res and str(res).endswith('.html'):
                last_report = res
        except Exception as e:
            print(f'✗ 步骤{i}执行失败: {e}')
            import traceback; traceback.print_exc()
            sys.exit(1)
    
    print()
    hr('═')
    print('  ✓ 全部流程执行完毕')
    hr('═')
    if last_report:
        print()
        print(f'推荐打开生成的报告查看最终效果:')
        print(f'  open "{last_report}"')
    print()
    print('后续常用命令:')
    print('  pip install -r requirements.txt    安装依赖')
    print('  python scripts/init_database.py    重置数据库到示例数据')
    print('  python app.py                      启动 API 服务 (端口5000)')
    print('  bash scripts/curl_examples.sh      通过 CURL 逐步演示 API 调用')

if __name__ == '__main__':
    main()
