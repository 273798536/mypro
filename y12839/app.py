#!/usr/bin/env python3
import os
import sqlite3
import json
from datetime import datetime
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, 'data', 'histology.db')

app = Flask(__name__, static_folder='reports', static_url_path='/reports')
CORS(app)
app.config['JSON_AS_ASCII'] = False


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if k.endswith('_data') and v:
            try:
                d[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                pass
    return d


def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]


def get_current_review(db, annotation_id):
    cursor = db.execute('''
        SELECT * FROM reviews 
        WHERE annotation_id = ? AND is_active = 1
        ORDER BY review_round DESC LIMIT 1
    ''', (annotation_id,))
    return cursor.fetchone()


def can_export(db, annotation_id):
    review = get_current_review(db, annotation_id)
    if not review:
        return True, None, None
    
    if review['review_result'] == 'approved':
        return True, review['reviewer'], None
    
    if review['review_result'] == 'approved_with_notes':
        return True, review['reviewer'], review['suggestion']
    
    block_reason = f"复核驳回(第{review['review_round']}轮): {review['review_reason']}"
    if review['review_result'] == 'pending':
        block_reason = f"复核待定(第{review['review_round']}轮,等补充): {review['review_reason']}"
    
    return False, review['reviewer'], block_reason


@app.route('/api/slides', methods=['GET'])
def list_slides():
    db = get_db()
    status = request.args.get('status', 'all')
    clarity = request.args.get('clarity', None)
    
    query = '''
        SELECT ts.*, 
            (SELECT COUNT(*) FROM annotations a WHERE a.slide_id = ts.id) as annotation_count,
            (SELECT COUNT(*) FROM sequencing_results sr WHERE sr.slide_id = ts.id) as sequencing_count
        FROM tissue_slides ts
        WHERE 1=1
    '''
    params = []
    
    if clarity:
        query += ' AND EXISTS (SELECT 1 FROM annotations a WHERE a.slide_id = ts.id AND a.boundary_clarity = ?)'
        params.append(clarity)
    
    if status == 'blocked':
        query += ''' AND EXISTS (
            SELECT 1 FROM annotations a 
            JOIN reviews r ON a.id = r.annotation_id AND r.is_active = 1
            WHERE a.slide_id = ts.id AND r.review_result IN ('rejected', 'pending')
        )'''
    
    query += ' ORDER BY ts.collection_date DESC'
    
    cursor = db.execute(query, params)
    slides = rows_to_list(cursor.fetchall())
    
    for slide in slides:
        ann_cursor = db.execute('SELECT * FROM annotations WHERE slide_id = ?', (slide['id'],))
        annotations = rows_to_list(ann_cursor.fetchall())
        for ann in annotations:
            export_ok, reviewer, block_reason = can_export(db, ann['id'])
            ann['export_ready'] = export_ok
            ann['export_reviewer'] = reviewer
            ann['block_reason'] = block_reason
            review = get_current_review(db, ann['id'])
            ann['latest_review'] = row_to_dict(review) if review else None
        slide['annotations'] = annotations
    
    return jsonify(slides)


@app.route('/api/slides/<int:slide_id>', methods=['GET'])
def get_slide(slide_id):
    db = get_db()
    cursor = db.execute('SELECT * FROM tissue_slides WHERE id = ?', (slide_id,))
    slide = row_to_dict(cursor.fetchone())
    if not slide:
        return jsonify({'error': '切片不存在'}), 404
    
    ann_cursor = db.execute('SELECT * FROM annotations WHERE slide_id = ? ORDER BY annotated_at DESC', (slide_id,))
    annotations = rows_to_list(ann_cursor.fetchall())
    for ann in annotations:
        review_cursor = db.execute('''
            SELECT * FROM reviews WHERE annotation_id = ? ORDER BY review_round
        ''', (ann['id'],))
        ann['review_history'] = rows_to_list(review_cursor.fetchall())
        export_ok, reviewer, block_reason = can_export(db, ann['id'])
        ann['export_ready'] = export_ok
        ann['export_reviewer'] = reviewer
        ann['block_reason'] = block_reason
    slide['annotations'] = annotations
    
    seq_cursor = db.execute('SELECT * FROM sequencing_results WHERE slide_id = ? ORDER BY submitted_at DESC', (slide_id,))
    slide['sequencing_results'] = rows_to_list(seq_cursor.fetchall())
    
    return jsonify(slide)


@app.route('/api/annotations', methods=['POST'])
def create_annotation():
    data = request.json
    required = ['slide_id', 'annotator', 'annotation_type', 'boundary_data']
    for f in required:
        if f not in data:
            return jsonify({'error': f'缺少字段: {f}'}), 400
    
    db = get_db()
    slide = db.execute('SELECT id FROM tissue_slides WHERE id = ?', (data['slide_id'],)).fetchone()
    if not slide:
        return jsonify({'error': '关联切片不存在'}), 404
    
    boundary_data = data['boundary_data']
    if isinstance(boundary_data, dict):
        boundary_data = json.dumps(boundary_data, ensure_ascii=False)
    
    quality = data.get('boundary_quality_score', 100)
    clarity = data.get('boundary_clarity', 'clear')
    if quality < 50:
        clarity = 'unclear'
    elif quality < 80:
        clarity = 'moderate'
    
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor = db.execute('''
        INSERT INTO annotations 
        (slide_id, annotator, annotation_type, boundary_data, boundary_quality_score,
         boundary_clarity, confidence_score, notes, annotated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['slide_id'], data['annotator'], data['annotation_type'],
        boundary_data, quality, clarity,
        data.get('confidence_score', 1.0), data.get('notes', ''),
        now
    ))
    db.commit()
    
    db.execute('UPDATE tissue_slides SET updated_at = ? WHERE id = ?', (now, data['slide_id']))
    db.commit()
    
    recalc_all_group_stats(db)
    
    return jsonify({'id': cursor.lastrowid, 'message': '批注创建成功'}), 201


@app.route('/api/annotations/<int:annotation_id>/reviews', methods=['POST'])
def add_review(annotation_id):
    data = request.json
    required = ['reviewer', 'review_result', 'review_reason']
    for f in required:
        if f not in data:
            return jsonify({'error': f'缺少字段: {f}'}), 400
    
    valid_results = ['approved', 'rejected', 'pending', 'approved_with_notes']
    if data['review_result'] not in valid_results:
        return jsonify({'error': f'review_result必须是: {valid_results}'}), 400
    
    db = get_db()
    ann = db.execute('SELECT id FROM annotations WHERE id = ?', (annotation_id,)).fetchone()
    if not ann:
        return jsonify({'error': '批注不存在'}), 404
    
    existing = db.execute('''
        SELECT MAX(review_round) as max_round FROM reviews WHERE annotation_id = ?
    ''', (annotation_id,)).fetchone()
    next_round = (existing['max_round'] or 0) + 1
    
    db.execute('UPDATE reviews SET is_active = 0 WHERE annotation_id = ?', (annotation_id,))
    
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor = db.execute('''
        INSERT INTO reviews 
        (annotation_id, reviewer, review_result, review_reason, boundary_issue_detail,
         photo_alignment_issue, suggestion, review_round, is_active, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ''', (
        annotation_id, data['reviewer'], data['review_result'], data['review_reason'],
        data.get('boundary_issue_detail'), data.get('photo_alignment_issue'),
        data.get('suggestion'), next_round, now
    ))
    
    if data['review_result'] == 'approved' and next_round > 1:
        ann_row = db.execute('SELECT * FROM annotations WHERE id = ?', (annotation_id,)).fetchone()
        if ann_row and ann_row['boundary_quality_score'] < 80:
            db.execute('''
                UPDATE annotations SET 
                    boundary_quality_score = MAX(boundary_quality_score, 82),
                    boundary_clarity = 'clear'
                WHERE id = ?
            ''', (annotation_id,))
    
    db.commit()
    recalc_all_group_stats(db)
    
    return jsonify({
        'id': cursor.lastrowid,
        'review_round': next_round,
        'message': f'第{next_round}轮复核记录已提交'
    }), 201


@app.route('/api/annotations/<int:annotation_id>/reviews', methods=['GET'])
def get_review_history(annotation_id):
    db = get_db()
    cursor = db.execute('''
        SELECT * FROM reviews WHERE annotation_id = ? ORDER BY review_round
    ''', (annotation_id,))
    reviews = rows_to_list(cursor.fetchall())
    return jsonify(reviews)


@app.route('/api/sequencing', methods=['POST'])
def add_sequencing():
    data = request.json
    required = ['slide_id', 'gene_panel', 'mutation_data', 'quality_score', 'submitted_by']
    for f in required:
        if f not in data:
            return jsonify({'error': f'缺少字段: {f}'}), 400
    
    db = get_db()
    slide = db.execute('SELECT id FROM tissue_slides WHERE id = ?', (data['slide_id'],)).fetchone()
    if not slide:
        return jsonify({'error': '关联切片不存在'}), 404
    
    mutation_data = data['mutation_data']
    if isinstance(mutation_data, dict):
        mutation_data = json.dumps(mutation_data, ensure_ascii=False)
    
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor = db.execute('''
        INSERT INTO sequencing_results 
        (slide_id, gene_panel, mutation_data, quality_score, submitted_by, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['slide_id'], data['gene_panel'], mutation_data,
        data['quality_score'], data['submitted_by'], now
    ))
    
    pending_anns = db.execute('''
        SELECT a.id FROM annotations a
        JOIN reviews r ON a.id = r.annotation_id AND r.is_active = 1
        WHERE a.slide_id = ? AND r.review_result = 'pending'
    ''', (data['slide_id'],)).fetchall()
    
    auto_updated = []
    for pa in pending_anns:
        review = db.execute('''
            SELECT * FROM reviews WHERE annotation_id = ? AND is_active = 1
        ''', (pa['id'],)).fetchone()
        if review and '测序' in (review['suggestion'] or ''):
            now2 = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            rev_round = review['review_round']
            db.execute('UPDATE reviews SET is_active = 0 WHERE annotation_id = ?', (pa['id'],))
            db.execute('''
                INSERT INTO reviews 
                (annotation_id, reviewer, review_result, review_reason, boundary_issue_detail,
                 photo_alignment_issue, suggestion, review_round, is_active, reviewed_at)
                VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, 1, ?)
            ''', (
                pa['id'], '系统(测序补录触发)', 
                f'测序结果已补录({data["gene_panel"]})，请复核员结合突变分布重新判断边界',
                None, None,
                f'检测到NGS测序结果补录，突变丰度{data["quality_score"]*100:.0f}%，建议结合突变定位重新评估边界判定',
                rev_round, now2
            ))
            auto_updated.append(pa['id'])
    
    db.commit()
    recalc_all_group_stats(db)
    
    result = {'id': cursor.lastrowid, 'message': '测序结果已录入'}
    if auto_updated:
        result['auto_triggered_reviews'] = auto_updated
        result['message'] += f'，并自动触发{len(auto_updated)}条待定批注的复核提醒'
    
    return jsonify(result), 201


@app.route('/api/groups', methods=['GET'])
def list_groups():
    db = get_db()
    cursor = db.execute('SELECT * FROM slide_groups ORDER BY id')
    groups = rows_to_list(cursor.fetchall())
    
    for g in groups:
        m_cursor = db.execute('''
            SELECT gm.*, ts.slide_number, ts.patient_id, ts.tissue_type,
                   a.boundary_clarity, a.annotation_type, a.confidence_score
            FROM slide_group_members gm
            LEFT JOIN tissue_slides ts ON gm.slide_id = ts.id
            LEFT JOIN annotations a ON gm.annotation_id = a.id
            WHERE gm.group_id = ?
            ORDER BY gm.assigned_at
        ''', (g['id'],))
        g['members'] = rows_to_list(m_cursor.fetchall())
        
        s_cursor = db.execute('''
            SELECT * FROM group_statistics WHERE group_id = ? ORDER BY stat_key
        ''', (g['id'],))
        stats = rows_to_list(s_cursor.fetchall())
        g['statistics'] = stats
        
        g['blocked_records'] = []
        for m in g['members']:
            if m.get('annotation_id'):
                export_ok, _, block_reason = can_export(db, m['annotation_id'])
                if not export_ok:
                    g['blocked_records'].append({
                        'slide_number': m['slide_number'],
                        'annotation_type': m['annotation_type'],
                        'boundary_clarity': m['boundary_clarity'],
                        'block_reason': block_reason
                    })
    
    return jsonify(groups)


@app.route('/api/groups/<int:group_id>/recalc', methods=['POST'])
def recalc_group(group_id):
    db = get_db()
    group = db.execute('SELECT id FROM slide_groups WHERE id = ?', (group_id,)).fetchone()
    if not group:
        return jsonify({'error': '分组不存在'}), 404
    
    from scripts.init_database import recalculate_group_stats
    recalculate_group_stats(db.cursor(), group_id)
    db.commit()
    return jsonify({'message': '分组统计已重新计算'})


@app.route('/api/export/blocked', methods=['GET'])
def get_blocked_records():
    db = get_db()
    cursor = db.execute('''
        SELECT 
            a.id as annotation_id,
            a.annotation_type,
            a.boundary_clarity,
            a.boundary_quality_score,
            a.confidence_score,
            a.notes as annotation_notes,
            a.annotator,
            a.annotated_at,
            ts.id as slide_id,
            ts.slide_number,
            ts.patient_id,
            ts.tissue_type,
            ts.stain_type,
            ts.collection_date,
            ts.pathologist,
            ts.microscope_photo_url,
            r.id as review_id,
            r.reviewer,
            r.review_result,
            r.review_reason,
            r.boundary_issue_detail,
            r.photo_alignment_issue,
            r.suggestion,
            r.review_round,
            r.reviewed_at,
            (SELECT COUNT(*) FROM reviews r2 WHERE r2.annotation_id = a.id) as total_review_rounds,
            (SELECT COUNT(*) FROM sequencing_results sr WHERE sr.slide_id = ts.id) as seq_count
        FROM annotations a
        JOIN tissue_slides ts ON a.slide_id = ts.id
        JOIN reviews r ON a.id = r.annotation_id AND r.is_active = 1
        WHERE r.review_result IN ('rejected', 'pending')
        ORDER BY r.review_round DESC, a.boundary_quality_score ASC
    ''')
    
    records = rows_to_list(cursor.fetchall())
    summary = {
        'total_blocked': len(records),
        'by_reason': {},
        'by_round': {},
        'with_sequencing': 0,
        'need_immediate_attention': 0
    }
    
    for rec in records:
        reason = rec['review_reason']
        summary['by_reason'][reason] = summary['by_reason'].get(reason, 0) + 1
        rnd = f"第{rec['review_round']}轮"
        summary['by_round'][rnd] = summary['by_round'].get(rnd, 0) + 1
        if rec['seq_count'] > 0:
            summary['with_sequencing'] += 1
        if rec['review_round'] >= 2 and rec['review_result'] == 'pending':
            summary['need_immediate_attention'] += 1
    
    return jsonify({
        'summary': summary,
        'records': records,
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'description': '本列表用于月底转交导师审阅：仅展示当前不能导出的记录及其拦截原因、复核历史、补充材料状态'
    })


@app.route('/api/export/check/<int:annotation_id>', methods=['GET'])
def check_exportable(annotation_id):
    db = get_db()
    ann = db.execute('''
        SELECT a.*, ts.slide_number, ts.tissue_type, ts.patient_id,
               ts.microscope_photo_url
        FROM annotations a
        JOIN tissue_slides ts ON a.slide_id = ts.id
        WHERE a.id = ?
    ''', (annotation_id,)).fetchone()
    
    if not ann:
        return jsonify({'error': '批注不存在'}), 404
    
    export_ok, reviewer, block_reason = can_export(db, annotation_id)
    review = get_current_review(db, annotation_id)
    review_history = db.execute('''
        SELECT * FROM reviews WHERE annotation_id = ? ORDER BY review_round
    ''', (annotation_id,)).fetchall()
    seq_results = db.execute('''
        SELECT * FROM sequencing_results WHERE slide_id = ?
    ''', (ann['slide_id'],)).fetchall()
    
    chart_data = generate_boundary_chart_data(ann, review, review_history)
    
    return jsonify({
        'annotation': row_to_dict(ann),
        'export_ready': export_ok,
        'approved_by': reviewer,
        'block_reason': block_reason,
        'latest_review': row_to_dict(review) if review else None,
        'review_history': rows_to_list(review_history),
        'sequencing_results': rows_to_list(seq_results),
        'boundary_analysis_chart': chart_data,
        'explanation': generate_annotation_explanation(ann, review, review_history)
    })


@app.route('/api/export/report', methods=['POST'])
def generate_export_report():
    data = request.json or {}
    include_blocked = data.get('include_blocked', True)
    include_explanations = data.get('include_explanations', True)
    group_id = data.get('group_id')
    
    db = get_db()
    
    query_anns = '''
        SELECT a.*, ts.slide_number, ts.tissue_type, ts.patient_id, ts.stain_type,
               ts.collection_date, ts.pathologist, ts.microscope_photo_url
        FROM annotations a
        JOIN tissue_slides ts ON a.slide_id = ts.id
    '''
    params = []
    if group_id:
        query_anns += ' JOIN slide_group_members gm ON a.id = gm.annotation_id WHERE gm.group_id = ?'
        params.append(group_id)
    query_anns += ' ORDER BY ts.collection_date DESC'
    
    ann_cursor = db.execute(query_anns, params)
    annotations = ann_cursor.fetchall()
    
    exportable = []
    blocked = []
    
    for ann in annotations:
        export_ok, reviewer, block_reason = can_export(db, ann['id'])
        review = get_current_review(db, ann['id'])
        review_history = db.execute('''
            SELECT * FROM reviews WHERE annotation_id = ? ORDER BY review_round
        ''', (ann['id'],)).fetchall()
        seq_results = db.execute('''
            SELECT * FROM sequencing_results WHERE slide_id = ?
        ''', (ann['slide_id'],)).fetchall()
        
        ann_dict = row_to_dict(ann)
        ann_dict['review_history'] = rows_to_list(review_history)
        ann_dict['sequencing_results'] = rows_to_list(seq_results)
        ann_dict['latest_review'] = row_to_dict(review) if review else None
        ann_dict['approved_by'] = reviewer
        
        if export_ok:
            ann_dict['export_status'] = '可导出'
            ann_dict['export_approval_note'] = block_reason if block_reason else None
            exportable.append(ann_dict)
        elif include_blocked:
            ann_dict['export_status'] = '被拦截'
            ann_dict['block_reason'] = block_reason
            if include_explanations:
                ann_dict['boundary_analysis_chart'] = generate_boundary_chart_data(ann, review, review_history)
                ann_dict['explanation'] = generate_annotation_explanation(ann, review, review_history)
            blocked.append(ann_dict)
    
    now = datetime.now()
    report = {
        'report_title': '组织切片批注导出报告',
        'generated_at': now.strftime('%Y-%m-%d %H:%M:%S'),
        'summary': {
            'total_annotations': len(annotations),
            'exportable_count': len(exportable),
            'blocked_count': len(blocked),
            'blocked_ratio': f'{len(blocked)/len(annotations)*100:.1f}%' if annotations else '0%',
            'export_ready_ratio': f'{len(exportable)/len(annotations)*100:.1f}%' if annotations else '0%'
        },
        'exportable_records': exportable,
        'blocked_records': blocked,
        'guide_for_supervisor': generate_supervisor_guide(blocked)
    }
    
    now_str = now.strftime('%Y%m%d_%H%M%S')
    report_dir = os.path.join(APP_DIR, 'reports')
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, f'export_report_{now_str}.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    html_path = os.path.join(report_dir, f'export_report_{now_str}.html')
    generate_html_report(report, html_path)
    
    db.execute('''
        INSERT INTO export_logs 
        (export_type, export_status, blocked_records_count, exported_by, exported_at)
        VALUES (?, ?, ?, ?, ?)
    ''', ('batch_report', 'generated', len(blocked), 
          data.get('exported_by', 'system'), now.strftime('%Y-%m-%d %H:%M:%S')))
    db.commit()
    
    return jsonify({
        'message': '报告已生成',
        'json_file': f'/reports/{os.path.basename(report_path)}',
        'html_file': f'/reports/{os.path.basename(html_path)}',
        'summary': report['summary'],
        'report': report
    })


@app.route('/api/diagnostics/summary', methods=['GET'])
def diagnostics_summary():
    db = get_db()
    
    stats = {}
    
    stats['slides_total'] = db.execute('SELECT COUNT(*) FROM tissue_slides').fetchone()[0]
    stats['annotations_total'] = db.execute('SELECT COUNT(*) FROM annotations').fetchone()[0]
    stats['reviews_total'] = db.execute('SELECT COUNT(*) FROM reviews').fetchone()[0]
    stats['sequencing_total'] = db.execute('SELECT COUNT(*) FROM sequencing_results').fetchone()[0]
    
    stats['clarity_distribution'] = rows_to_list(db.execute('''
        SELECT boundary_clarity, COUNT(*) as count 
        FROM annotations GROUP BY boundary_clarity
    ''').fetchall())
    
    stats['review_result_distribution'] = rows_to_list(db.execute('''
        SELECT review_result, COUNT(*) as count 
        FROM reviews WHERE is_active = 1 GROUP BY review_result
    ''').fetchall())
    
    stats['pipeline_stages'] = {
        '已完成批注(待复核)': db.execute('''
            SELECT COUNT(*) FROM annotations a 
            WHERE NOT EXISTS (SELECT 1 FROM reviews r WHERE r.annotation_id = a.id)
        ''').fetchone()[0],
        '复核通过(可导出)': db.execute('''
            SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active = 1 AND r.review_result = 'approved'
        ''').fetchone()[0],
        '有条件通过(可导出带备注)': db.execute('''
            SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active = 1 AND r.review_result = 'approved_with_notes'
        ''').fetchone()[0],
        '复核驳回(需修正)': db.execute('''
            SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active = 1 AND r.review_result = 'rejected'
        ''').fetchone()[0],
        '复核待定(等补充材料)': db.execute('''
            SELECT COUNT(*) FROM reviews r 
            WHERE r.is_active = 1 AND r.review_result = 'pending'
        ''').fetchone()[0]
    }
    
    return jsonify(stats)


def generate_boundary_chart_data(annotation, review, review_history):
    chart = {
        'title': f'{annotation["slide_number"]} - {annotation["annotation_type"]} 边界质量分析',
        'type': 'radar_chart',
        'dimensions': [
            {'key': 'boundary_smoothness', 'label': '边界平滑度', 'weight': 0.25},
            {'key': 'contrast_to_background', 'label': '与背景对比度', 'weight': 0.2},
            {'key': 'consistency_across_scales', 'label': '跨尺度一致性', 'weight': 0.15},
            {'key': 'cellular_density_gap', 'label': '细胞密度差', 'weight': 0.25},
            {'key': 'morphological_continuity', 'label': '形态连续性', 'weight': 0.15}
        ],
        'datasets': [],
        'threshold': {'value': 70, 'label': '导出合格线'},
        'legend_explanation': [
            {'color': '#4CAF50', 'text': '当前评分 (≥70合格)'},
            {'color': '#FF9800', 'text': '历史最高评分'},
            {'color': '#F44336', 'text': '历史最低评分(被拦截)'},
            {'color': '#2196F3', 'text': '建议目标评分'}
        ]
    }
    
    base = annotation['boundary_quality_score'] / 100
    current = {
        'label': f'当前评分 (综合{annotation["boundary_quality_score"]}/100)',
        'color': '#4CAF50' if base >= 0.7 else '#F44336',
        'values': {
            'boundary_smoothness': min(100, int(base * 100 + 15 if annotation['boundary_clarity'] == 'clear' else base * 60 + 10)),
            'contrast_to_background': min(100, int(base * 95 + 5)),
            'consistency_across_scales': min(100, int(base * 90 + 10 if annotation['confidence_score'] > 0.8 else base * 70)),
            'cellular_density_gap': min(100, int(base * 100 if annotation['boundary_clarity'] == 'clear' else base * 45 + 15)),
            'morphological_continuity': min(100, int(base * 88 + 12))
        }
    }
    chart['datasets'].append(current)
    
    if review_history and len(review_history) > 1:
        chart['datasets'].append({
            'label': f'建议目标 (复核员期望)',
            'color': '#2196F3',
            'values': {
                'boundary_smoothness': 85,
                'contrast_to_background': 82,
                'consistency_across_scales': 80,
                'cellular_density_gap': 88,
                'morphological_continuity': 80
            }
        })
    
    chart['quantitative_data'] = {
        'boundary_quality_score': annotation['boundary_quality_score'],
        'confidence_score': annotation['confidence_score'],
        'review_rounds_completed': len(review_history),
        'regions_count': len(annotation.get('boundary_data', {}).get('regions', []) if isinstance(annotation.get('boundary_data'), dict) else [0]),
        'status_message': get_status_message(annotation, review)
    }
    
    return chart


def get_status_message(annotation, review):
    if not review:
        return '批注已创建，等待病理医师复核'
    if annotation['boundary_clarity'] == 'clear' and review['review_result'] == 'approved':
        return '✓ 边界清晰，复核通过，可直接导出'
    if review['review_result'] == 'approved_with_notes':
        return '⚠ 边界可接受，导出时需附加复核备注'
    if review['review_result'] == 'pending':
        return f'⏳ 第{review["review_round"]}轮复核待定：等补充材料确认边界'
    if review['review_result'] == 'rejected':
        return f'✗ 第{review["review_round"]}轮复核驳回：边界存在争议，需修正后重新提交'
    return '状态待确认'


def generate_annotation_explanation(annotation, review, review_history):
    explanations = []
    
    header = {
        'section': '概览',
        'content': f'''
切片 {annotation["slide_number"]} ({annotation["tissue_type"]}) 的批注 "{annotation["annotation_type"]}"
由 {annotation["annotator"]} 于 {annotation["annotated_at"]} 创建。
当前边界质量综合评分: <b>{annotation["boundary_quality_score"]}/100</b>，
评定等级: <b>{annotation["boundary_clarity"]}</b>（clear=清晰，moderate=存在疑问，unclear=边界不清）。
置信度: {annotation["confidence_score"]*100:.0f}%。
        '''.strip()
    }
    explanations.append(header)
    
    if review:
        review_section = {
            'section': f'最新复核结论（第{review["review_round"]}轮，{review["reviewer"]}）',
            'content': f'''
结论: <b style="color:{'#F44336' if review['review_result'] in ['rejected','pending'] else '#4CAF50'}">
    {review['review_result']} ({review['review_reason']})
</b><br>
复核时间: {review['reviewed_at']}<br>
{'<b>边界问题详细说明:</b><br>' + review['boundary_issue_detail'].replace('\n', '<br>') + '<br>' if review['boundary_issue_detail'] else ''}
{'<b>显微照片对齐问题:</b><br>' + review['photo_alignment_issue'].replace('\n', '<br>') + '<br>' if review['photo_alignment_issue'] else ''}
{'<b>复核员建议:</b><br>' + review['suggestion'].replace('\n', '<br>') if review['suggestion'] else ''}
            '''.strip()
        }
        explanations.append(review_section)
    
    if review_history and len(review_history) > 1:
        history_items = []
        for i, r in enumerate(review_history[:-1]):
            history_items.append(f'''
第{r['review_round']}轮 ({r['reviewer']}, {r['reviewed_at']}): 
{r['review_result']} - {r['review_reason']}
            ''')
        history_section = {
            'section': '历史复核轨迹（说明为何未一次性通过）',
            'content': '<br>'.join(history_items)
        }
        explanations.append(history_section)
    
    boundary_data = annotation.get('boundary_data')
    if isinstance(boundary_data, dict) and 'regions' in boundary_data:
        regions_text = []
        for i, region in enumerate(boundary_data['regions']):
            notes = ''
            if 'edge_notes' in region:
                notes = '<br>'.join([f'• {n}' for n in region['edge_notes']])
            regions_text.append(f'''
区域 {i+1}: {region['name']} ({region['type']})<br>
面积: {region.get('area_pixels', 'N/A')}像素 | 细胞密度: {region.get('cellularity', 'N/A')*100 if isinstance(region.get('cellularity'), (int,float)) else 'N/A'}%<br>
{notes}
            ''')
        regions_section = {
            'section': '标注区域明细（对应画布/坐标多边形）',
            'content': '<hr>'.join(regions_text)
        }
        explanations.append(regions_section)
    
    if annotation.get('notes'):
        ann_notes = {
            'section': '批注员原始备注',
            'content': annotation['notes']
        }
        explanations.append(ann_notes)
    
    if review and review['review_result'] in ['rejected', 'pending']:
        next_steps = {
            'section': '下一步建议',
            'content': generate_next_steps(annotation, review)
        }
        explanations.append(next_steps)
    
    return explanations


def generate_next_steps(annotation, review):
    steps = []
    suggestion = review.get('suggestion') or ''
    
    if '免疫组化' in suggestion:
        steps.append('□ 安排免疫组化补充染色（CK7/TTF-1等），用分子标记辅助划定边界')
    if '测序' in suggestion or 'NGS' in suggestion or '突变' in suggestion:
        steps.append('□ 提交NGS测序申请，确认突变分布范围以辅助定位真实肿瘤边界')
    if '重拍' in suggestion or '照片' in (review.get('photo_alignment_issue') or ''):
        steps.append('□ 重新拍摄无折叠/无对焦问题的显微照片，并与原标注坐标配准')
    if annotation['boundary_clarity'] == 'unclear':
        steps.append('□ 标注员根据复核意见修改多边形边界，或合并连续区域、添加过渡带说明')
    if review['review_result'] == 'pending':
        steps.append(f'□ 补充材料后提交第{review["review_round"]+1}轮复核')
    else:
        steps.append(f'□ 修正后提交第{review["review_round"]+1}轮复核')
    
    if not steps:
        steps.append('□ 与复核医师面对面讨论边界判定标准，确认修改方向后再操作')
    
    return '<br>'.join(steps)


def generate_supervisor_guide(blocked_records):
    guide = {
        'summary': f'共{len(blocked_records)}条记录被拦截，无法导出。月底转交请重点关注。',
        'priority_groups': [],
        'quick_checklist': [
            '□ 检查所有标注边界不清的记录是否都有至少一轮复核说明',
            '□ 检查待定(pending)记录的补充材料是否已到位(测序/IHC/重拍)',
            '□ 多轮(≥2)复核仍未通过的，是否需要更 senior 病理医师介入',
            '□ 月末统计中被拦截比例是否合理，是否有标注员系统性偏差',
            '□ 若测序结果已补录，确认分组统计是否同步刷新'
        ]
    }
    
    multi_round = [b for b in blocked_records if b.get('latest_review', {}).get('review_round', 1) >= 2]
    pending = [b for b in blocked_records if b.get('latest_review', {}).get('review_result') == 'pending']
    rejected = [b for b in blocked_records if b.get('latest_review', {}).get('review_result') == 'rejected']
    
    if multi_round:
        guide['priority_groups'].append({
            'priority': '高',
            'title': '多轮复核仍未通过(≥2轮)',
            'count': len(multi_round),
            'records': [f'{r["slide_number"]} ({r["annotation_type"]}) - 第{r.get("latest_review", {}).get("review_round")}轮' for r in multi_round]
        })
    
    if pending:
        guide['priority_groups'].append({
            'priority': '中',
            'title': '等待补充材料(测序/IHC等)',
            'count': len(pending),
            'records': [f'{r["slide_number"]} - {r.get("latest_review", {}).get("suggestion", "需要补充材料")[:40]}' for r in pending]
        })
    
    if rejected:
        guide['priority_groups'].append({
            'priority': '常规',
            'title': '标注员需修正后重提',
            'count': len(rejected),
            'records': [f'{r["slide_number"]} - {r.get("latest_review", {}).get("review_reason", "")}' for r in rejected]
        })
    
    return guide


def recalc_all_group_stats(db):
    from scripts.init_database import recalculate_group_stats
    cursor = db.execute('SELECT id FROM slide_groups')
    for (gid,) in cursor.fetchall():
        recalculate_group_stats(db.cursor(), gid)
    db.commit()


def generate_html_report(report, output_path):
    html_parts = ['''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>组织切片批注导出报告</title>
<style>
body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 40px; background: #fafafa; }
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
h2 { color: #34495e; margin-top: 40px; }
h3 { color: #5d6d7e; }
.summary-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
.summary-item { text-align: center; padding: 15px; border-radius: 6px; }
.summary-item.good { background: #e8f5e9; }
.summary-item.bad { background: #ffebee; }
.summary-item.neutral { background: #e3f2fd; }
.summary-number { font-size: 28px; font-weight: bold; margin: 5px 0; }
.record-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 5px solid; }
.record-card.exportable { border-left-color: #4CAF50; }
.record-card.blocked { border-left-color: #F44336; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
.status-badge.ready { background: #4CAF50; color: white; }
.status-badge.blocked { background: #F44336; color: white; }
.explanation-section { margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #3498db; }
.explanation-section h4 { margin: 0 0 8px 0; color: #2c3e50; }
.chart-container { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 10px 0; }
.legend-item { display: inline-flex; align-items: center; margin: 5px 10px; font-size: 12px; }
.legend-color { width: 14px; height: 14px; border-radius: 3px; margin-right: 5px; display: inline-block; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f5f5f5; font-weight: 600; }
.radar-placeholder { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 10px 0; }
.meta { color: #7f8c8d; font-size: 12px; }
.checklist { list-style: none; padding: 0; }
.checklist li { padding: 6px 0; }
.blocked-highlight { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0; }
</style>
</head>
<body>
''']
    
    html_parts.append(f'<h1>{report["report_title"]}</h1>')
    html_parts.append(f'<p class="meta">生成时间: {report["generated_at"]}</p>')
    
    html_parts.append('<div class="summary-card"><h2>📊 总览摘要</h2>')
    s = report['summary']
    html_parts.append(f'''
    <div class="summary-grid">
        <div class="summary-item neutral">
            <div>批注总数</div><div class="summary-number">{s["total_annotations"]}</div>
        </div>
        <div class="summary-item good">
            <div>可导出</div><div class="summary-number" style="color:#2e7d32">{s["exportable_count"]}</div>
            <div style="font-size:12px;color:#388e3c">{s["export_ready_ratio"]}</div>
        </div>
        <div class="summary-item bad">
            <div>被拦截</div><div class="summary-number" style="color:#c62828">{s["blocked_count"]}</div>
            <div style="font-size:12px;color:#d32f2f">{s["blocked_ratio"]}</div>
        </div>
    </div>
    </div>
    ''')
    
    if blocked := report.get('blocked_records', []):
        guide = report.get('guide_for_supervisor', {})
        html_parts.append(f'''
        <div class="summary-card" style="border:2px solid #F44336">
            <h2 style="color:#c62828">⚠ 导师重点关注：月底转交清单（共{len(blocked)}条不能导出）</h2>
            <div class="blocked-highlight">{guide.get("summary", "")}</div>
        ''')
        
        for grp in guide.get('priority_groups', []):
            color = {'高': '#c62828', '中': '#f57c00', '常规': '#1976d2'}.get(grp['priority'], '#555')
            html_parts.append(f'''
            <h3 style="color:{color}">
                【{grp['priority']}优先级】{grp['title']} ({grp['count']}条)
            </h3>
            <ul>
            ''')
            for r in grp['records']:
                html_parts.append(f'<li>{r}</li>')
            html_parts.append('</ul>')
        
        html_parts.append('<h3>✅ 快速核对清单</h3><ul class="checklist">')
        for item in guide.get('quick_checklist', []):
            html_parts.append(f'<li>{item}</li>')
        html_parts.append('</ul></div>')
    
    if report.get('blocked_records'):
        html_parts.append('<h2>🚫 拦截记录明细（含边界分析和解释）</h2>')
        for rec in report['blocked_records']:
            html_parts.append(f'''
            <div class="record-card blocked">
                <h3>
                    {rec['slide_number']} - {rec['annotation_type']}
                    <span class="status-badge blocked">被拦截</span>
                </h3>
                <div class="meta">
                    切片类型: {rec['tissue_type']} | 患者: {rec['patient_id']} | 染色: {rec['stain_type']} |
                    采集: {rec['collection_date']} | 标注员: {rec['annotator']} | 病理医师: {rec['pathologist']}
                </div>
                <p><b>拦截原因:</b> <span style="color:#c62828">{rec.get('block_reason','N/A')}</span></p>
                <p><b>边界质量评分:</b> {rec['boundary_quality_score']}/100 (等级: <code>{rec['boundary_clarity']}</code>) 
                | 置信度: {rec['confidence_score']*100:.0f}%</p>
            ''')
            
            chart = rec.get('boundary_analysis_chart')
            if chart:
                qd = chart.get('quantitative_data', {})
                html_parts.append(f'''
                <div class="chart-container">
                    <h4 style="margin-top:0">📈 边界质量雷达图分析（附明细解释，非仅靠颜色识别）</h4>
                    <div style="margin:10px 0">
                        <b>维度说明:</b>
                        <table>
                            <tr><th>维度</th><th>权重</th><th>当前评分</th><th>说明</th></tr>
                ''')
                current_vals = chart['datasets'][0]['values'] if chart['datasets'] else {}
                dim_desc = {
                    'boundary_smoothness': '多边形边界是否平滑无锯齿，排除人为抖动伪影',
                    'contrast_to_background': '标注区内与区外的核质染色对比度，越高越易区分',
                    'consistency_across_scales': '在10x/20x/40x不同放大倍数下边界是否一致',
                    'cellular_density_gap': '边界两侧单位面积细胞核数量差，≥1.5倍为理想分界',
                    'morphological_continuity': '边界两侧腺体/细胞形态是否存在明确不连续点'
                }
                for dim in chart['dimensions']:
                    val = current_vals.get(dim['key'], 0)
                    pct = f'{val}/100'
                    color = '#4CAF50' if val >= 70 else ('#FF9800' if val >= 50 else '#F44336')
                    html_parts.append(f'''
                    <tr>
                        <td>{dim['label']}</td>
                        <td>{dim['weight']*100:.0f}%</td>
                        <td style="color:{color};font-weight:bold">{pct}</td>
                        <td style="font-size:12px;color:#666">{dim_desc.get(dim['key'], '')}</td>
                    </tr>
                    ''')
                
                html_parts.append(f'''
                        </table>
                    </div>
                    <div class="radar-placeholder">
                        雷达图占位：综合评分 {qd.get('boundary_quality_score')}/100，状态: {qd.get('status_message','')}
                    </div>
                    <div style="margin-top:10px">
                        <b>图例:</b>
                ''')
                for lg in chart.get('legend_explanation', []):
                    html_parts.append(f'''
                        <span class="legend-item">
                            <span class="legend-color" style="background:{lg['color']}"></span>{lg['text']}
                        </span>
                    ''')
                html_parts.append(f'''
                    </div>
                    <div style="margin-top:10px;font-size:12px;color:#555">
                        导出合格线: {chart['threshold']['value']}分 | 
                        已完成复核轮次: {qd.get('review_rounds_completed',0)} | 
                        状态: {qd.get('status_message','')}
                    </div>
                </div>
                ''')
            
            explanations = rec.get('explanation', [])
            for exp in explanations:
                html_parts.append(f'''
                <div class="explanation-section">
                    <h4>📝 {exp['section']}</h4>
                    <div>{exp['content']}</div>
                </div>
                ''')
            
            if rec.get('review_history'):
                html_parts.append(f'''
                <h4>🔄 复核迭代轨迹（非一次性判断，支持多轮补充）</h4>
                <table>
                    <tr><th>轮次</th><th>复核人</th><th>结果</th><th>理由</th><th>时间</th></tr>
                ''')
                for rev in rec['review_history']:
                    badge_cls = 'ready' if rev['review_result'] in ['approved','approved_with_notes'] else 'blocked'
                    html_parts.append(f'''
                    <tr>
                        <td>第{rev['review_round']}轮</td>
                        <td>{rev['reviewer']}</td>
                        <td><span class="status-badge {badge_cls}">{rev['review_result']}</span></td>
                        <td>{rev['review_reason']}</td>
                        <td>{rev['reviewed_at']}</td>
                    </tr>
                    ''')
                html_parts.append('</table>')
            
            if rec.get('sequencing_results'):
                html_parts.append('<h4>🧬 关联测序结果</h4>')
                for seq in rec['sequencing_results']:
                    md = seq.get('mutation_data', {})
                    md_text = json.dumps(md, ensure_ascii=False, indent=2) if isinstance(md, dict) else str(md)
                    html_parts.append(f'''
                    <div style="background:#f5f5f5;padding:10px;border-radius:4px">
                        <b>{seq['gene_panel']}</b> (提交人: {seq['submitted_by']}, {seq['submitted_at']})
                        <br>质控分: {seq['quality_score']*100:.0f}%
                        <pre style="background:#fff;padding:8px;border:1px solid #ddd;overflow-x:auto;margin-top:5px">{md_text}</pre>
                    </div>
                    ''')
            
            html_parts.append('</div>')
    
    if report.get('exportable_records'):
        html_parts.append('<h2>✅ 可导出记录</h2>')
        for rec in report['exportable_records']:
            note = rec.get('export_approval_note')
            html_parts.append(f'''
            <div class="record-card exportable">
                <h3>
                    {rec['slide_number']} - {rec['annotation_type']}
                    <span class="status-badge ready">{rec['export_status']}</span>
                </h3>
                <div class="meta">
                    切片类型: {rec['tissue_type']} | 患者: {rec['patient_id']} | 染色: {rec['stain_type']} |
                    采集: {rec['collection_date']} | 标注员: {rec['annotator']}
                </div>
                <p>边界评分: {rec['boundary_quality_score']}/100 ({rec['boundary_clarity']}) | 
                通过人: {rec.get('approved_by','自动通过')}
                {'<br><b style="color:#f57c00">导出附加备注: ' + note + '</b>' if note else ''}
                </p>
            </div>
            ''')
    
    html_parts.append('''
</body>
</html>
    ''')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_parts))


if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        from scripts.init_database import init_db
        init_db()
    print(f'启动组织切片批注导出服务: http://127.0.0.1:5000')
    print(f'数据库路径: {DB_PATH}')
    app.run(host='127.0.0.1', port=5000, debug=True)
