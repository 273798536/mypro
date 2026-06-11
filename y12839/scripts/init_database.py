#!/usr/bin/env python3
import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'histology.db')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.executescript('''
        CREATE TABLE tissue_slides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_number TEXT UNIQUE NOT NULL,
            patient_id TEXT NOT NULL,
            tissue_type TEXT NOT NULL,
            stain_type TEXT NOT NULL DEFAULT 'HE',
            collection_date TEXT NOT NULL,
            pathologist TEXT NOT NULL,
            microscope_photo_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_id INTEGER NOT NULL,
            annotator TEXT NOT NULL,
            annotation_type TEXT NOT NULL,
            boundary_data TEXT NOT NULL,
            boundary_quality_score INTEGER NOT NULL DEFAULT 100,
            boundary_clarity TEXT NOT NULL DEFAULT 'clear',
            confidence_score REAL NOT NULL DEFAULT 1.0,
            notes TEXT,
            annotated_at TEXT NOT NULL,
            FOREIGN KEY (slide_id) REFERENCES tissue_slides(id)
        );
        
        CREATE TABLE reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            annotation_id INTEGER NOT NULL,
            reviewer TEXT NOT NULL,
            review_result TEXT NOT NULL,
            review_reason TEXT NOT NULL,
            boundary_issue_detail TEXT,
            photo_alignment_issue TEXT,
            suggestion TEXT,
            review_round INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            reviewed_at TEXT NOT NULL,
            FOREIGN KEY (annotation_id) REFERENCES annotations(id)
        );
        
        CREATE TABLE sequencing_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_id INTEGER NOT NULL,
            gene_panel TEXT NOT NULL,
            mutation_data TEXT NOT NULL,
            quality_score REAL NOT NULL,
            submitted_by TEXT NOT NULL,
            submitted_at TEXT NOT NULL,
            FOREIGN KEY (slide_id) REFERENCES tissue_slides(id)
        );
        
        CREATE TABLE slide_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT NOT NULL,
            group_criteria TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        
        CREATE TABLE slide_group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            slide_id INTEGER NOT NULL,
            annotation_id INTEGER,
            assigned_at TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES slide_groups(id),
            FOREIGN KEY (slide_id) REFERENCES tissue_slides(id),
            FOREIGN KEY (annotation_id) REFERENCES annotations(id)
        );
        
        CREATE TABLE group_statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            stat_key TEXT NOT NULL,
            stat_value TEXT NOT NULL,
            stat_description TEXT,
            calculated_at TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES slide_groups(id)
        );
        
        CREATE TABLE export_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slide_id INTEGER,
            annotation_id INTEGER,
            export_type TEXT NOT NULL,
            export_status TEXT NOT NULL,
            block_reason TEXT,
            reviewer_note TEXT,
            exported_by TEXT NOT NULL,
            exported_at TEXT NOT NULL,
            FOREIGN KEY (slide_id) REFERENCES tissue_slides(id),
            FOREIGN KEY (annotation_id) REFERENCES annotations(id)
        );
        
        CREATE INDEX idx_annotations_slide ON annotations(slide_id);
        CREATE INDEX idx_reviews_annotation ON reviews(annotation_id);
        CREATE INDEX idx_sequencing_slide ON sequencing_results(slide_id);
        CREATE INDEX idx_group_members_group ON slide_group_members(group_id);
        CREATE INDEX idx_export_status ON export_logs(export_status);
    ''')
    
    seed_data(cursor)
    conn.commit()
    conn.close()
    print(f'数据库初始化成功: {DB_PATH}')

def seed_data(cursor):
    now = datetime.now()
    base_date = now - timedelta(days=30)
    
    slides_data = [
        {
            'slide_number': 'SL-2026-0501',
            'patient_id': 'P-001',
            'tissue_type': '肺腺癌组织',
            'stain_type': 'HE',
            'collection_date': (base_date + timedelta(days=1)).strftime('%Y-%m-%d'),
            'pathologist': '李医生',
            'microscope_photo_url': '/photos/SL-2026-0501_40x.tif'
        },
        {
            'slide_number': 'SL-2026-0502',
            'patient_id': 'P-002',
            'tissue_type': '乳腺浸润癌',
            'stain_type': 'HE',
            'collection_date': (base_date + timedelta(days=2)).strftime('%Y-%m-%d'),
            'pathologist': '王医生',
            'microscope_photo_url': '/photos/SL-2026-0502_40x.tif'
        },
        {
            'slide_number': 'SL-2026-0503',
            'patient_id': 'P-003',
            'tissue_type': '结肠息肉',
            'stain_type': 'HE',
            'collection_date': (base_date + timedelta(days=3)).strftime('%Y-%m-%d'),
            'pathologist': '张医生',
            'microscope_photo_url': '/photos/SL-2026-0503_40x.tif'
        },
        {
            'slide_number': 'SL-2026-0504',
            'patient_id': 'P-001',
            'tissue_type': '肺腺癌组织(对照)',
            'stain_type': 'IHC',
            'collection_date': (base_date + timedelta(days=5)).strftime('%Y-%m-%d'),
            'pathologist': '李医生',
            'microscope_photo_url': '/photos/SL-2026-0504_40x.tif'
        },
        {
            'slide_number': 'SL-2026-0505',
            'patient_id': 'P-004',
            'tissue_type': '胃黏膜活检',
            'stain_type': 'HE',
            'collection_date': (base_date + timedelta(days=7)).strftime('%Y-%m-%d'),
            'pathologist': '赵医生',
            'microscope_photo_url': '/photos/SL-2026-0505_40x.tif'
        }
    ]
    
    slide_ids = []
    for slide in slides_data:
        cursor.execute('''
            INSERT INTO tissue_slides 
            (slide_number, patient_id, tissue_type, stain_type, collection_date, 
             pathologist, microscope_photo_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            slide['slide_number'], slide['patient_id'], slide['tissue_type'],
            slide['stain_type'], slide['collection_date'], slide['pathologist'],
            slide['microscope_photo_url'],
            (now - timedelta(days=25)).strftime('%Y-%m-%d %H:%M:%S'),
            (now - timedelta(days=25)).strftime('%Y-%m-%d %H:%M:%S')
        ))
        slide_ids.append(cursor.lastrowid)
    
    boundary_clear = {
        'regions': [{
            'name': '肿瘤区域A',
            'type': 'tumor',
            'polygon': [[120,80],[180,75],[220,120],[200,180],[140,175],[110,130]],
            'area_pixels': 4520,
            'cellularity': 0.85
        }],
        'image_resolution': '2048x2048',
        'magnification': '40x',
        'scale_bar': '50μm'
    }
    
    boundary_unclear = {
        'regions': [{
            'name': '可疑肿瘤区域',
            'type': 'suspicious_tumor',
            'polygon': [[300,150],[420,145],[470,200],[485,280],[440,340],[350,350],[290,290],[280,210]],
            'area_pixels': 28900,
            'cellularity': 0.42,
            'edge_notes': ['西南边界与炎性细胞重叠明显', '东北侧存在人工折叠伪影', '细胞核密度梯度连续，无法明确分界']
        }, {
            'name': '间质浸润可疑区',
            'type': 'stroma_invasion',
            'polygon': [[500,200],[560,195],[590,240],[575,290],[520,295],[495,250]],
            'area_pixels': 6800,
            'cellularity': 0.28,
            'edge_notes': ['与上述可疑区连续过渡，无明确包膜分界']
        }],
        'image_resolution': '2048x2048',
        'magnification': '40x',
        'scale_bar': '50μm',
        'quality_flags': ['部分区域对焦不准', '存在染色不均']
    }
    
    boundary_moderate = {
        'regions': [{
            'name': '腺瘤区域',
            'type': 'adenoma',
            'polygon': [[180,120],[280,115],[330,175],[310,250],[220,260],[165,200]],
            'area_pixels': 15800,
            'cellularity': 0.72,
            'edge_notes': ['基底部边界略模糊，建议结合免疫组化确认']
        }],
        'image_resolution': '2048x2048',
        'magnification': '40x',
        'scale_bar': '50μm'
    }
    
    annotations_data = [
        {
            'slide_idx': 0,
            'annotator': '生态调查员A',
            'annotation_type': 'tumor_marker',
            'boundary_data': json.dumps(boundary_clear, ensure_ascii=False),
            'boundary_quality_score': 95,
            'boundary_clarity': 'clear',
            'confidence_score': 0.97,
            'notes': '肿瘤边界清晰，周围正常组织分界明显',
            'annotated_at': (now - timedelta(days=22)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 1,
            'annotator': '生态调查员B',
            'annotation_type': 'invasion_marker',
            'boundary_data': json.dumps(boundary_unclear, ensure_ascii=False),
            'boundary_quality_score': 42,
            'boundary_clarity': 'unclear',
            'confidence_score': 0.58,
            'notes': '疑似浸润性生长，但边界与炎性区域交叉，需要复核',
            'annotated_at': (now - timedelta(days=20)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 2,
            'annotator': '生态调查员A',
            'annotation_type': 'polyp_marker',
            'boundary_data': json.dumps(boundary_moderate, ensure_ascii=False),
            'boundary_quality_score': 72,
            'boundary_clarity': 'moderate',
            'confidence_score': 0.81,
            'notes': '腺瘤边界大致可辨，基底部建议进一步确认',
            'annotated_at': (now - timedelta(days=18)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 3,
            'annotator': '生态调查员C',
            'annotation_type': 'control_marker',
            'boundary_data': json.dumps(boundary_clear, ensure_ascii=False),
            'boundary_quality_score': 98,
            'boundary_clarity': 'clear',
            'confidence_score': 0.99,
            'notes': '对照组织，边界清晰，无异常增生',
            'annotated_at': (now - timedelta(days=15)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 4,
            'annotator': '生态调查员B',
            'annotation_type': 'inflammation_marker',
            'boundary_data': json.dumps(boundary_moderate, ensure_ascii=False),
            'boundary_quality_score': 68,
            'boundary_clarity': 'moderate',
            'confidence_score': 0.75,
            'notes': '胃炎区域与正常黏膜过渡带较宽',
            'annotated_at': (now - timedelta(days=12)).strftime('%Y-%m-%d %H:%M:%S')
        }
    ]
    
    annotation_ids = []
    for ann in annotations_data:
        cursor.execute('''
            INSERT INTO annotations 
            (slide_id, annotator, annotation_type, boundary_data, boundary_quality_score,
             boundary_clarity, confidence_score, notes, annotated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            slide_ids[ann['slide_idx']], ann['annotator'], ann['annotation_type'],
            ann['boundary_data'], ann['boundary_quality_score'], ann['boundary_clarity'],
            ann['confidence_score'], ann['notes'], ann['annotated_at']
        ))
        annotation_ids.append(cursor.lastrowid)
    
    reviews_data = [
        {
            'ann_idx': 0,
            'reviewer': '李医生',
            'review_result': 'approved',
            'review_reason': '边界清晰，标注准确',
            'boundary_issue_detail': None,
            'photo_alignment_issue': None,
            'suggestion': None,
            'review_round': 1,
            'reviewed_at': (now - timedelta(days=21)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'ann_idx': 1,
            'reviewer': '王医生',
            'review_result': 'rejected',
            'review_reason': '标注边界不清',
            'boundary_issue_detail': '1) 标注区域"可疑肿瘤区域"西南边界(坐标约280,290至350,350)与周围炎性细胞浸润区连续重叠，细胞核密度呈梯度变化，缺乏明确的组织学分界标志。2) "间质浸润可疑区"与前述区域在坐标485,280附近连续，无包膜或纤维组织分隔，不符合独立标注的边界定义标准。',
            'photo_alignment_issue': '显微照片SL-2026-0502_40x.tif中坐标420-490、140-200区域存在明显的组织折叠伪影，导致该段边界无法准确对应真实组织结构。建议重拍或在20x镜下重新定位标注。',
            'suggestion': '建议：1) 重新核对HE染色切片，用免疫组化(CK7/TTF-1)辅助确认浸润边界；2) 若保留当前标注，需将两个区域合并，并明确标注"边界待确认"属性；3) 补拍无折叠区域的显微照片用于复核。',
            'review_round': 1,
            'reviewed_at': (now - timedelta(days=19)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'ann_idx': 1,
            'reviewer': '张医生(二次复核)',
            'review_result': 'pending',
            'review_reason': '边界仍需结合测序结果判断',
            'boundary_issue_detail': '经免疫组化补充染色后，CK7在可疑区呈灶性阳性，但密度变化梯度依然连续。炎性区的TTF-1阴性表达与肿瘤区域存在10-15个细胞宽度的过渡带，无法用单一多边形精确划分。',
            'photo_alignment_issue': '补充的IHC照片与原HE照片在方向上存在约5度旋转偏差，直接叠加会导致3-5个细胞宽度的偏移。建议使用图像配准工具校准后再行复核。',
            'suggestion': '已补充免疫组化，但边界问题未完全解决。建议等待NGS测序结果，若该区域检出明确驱动突变(如EGFR exon19del)，则结合突变分布范围重新划定边界；若突变丰度过低(<5%)，建议降级为"非典型增生"标注。',
            'review_round': 2,
            'reviewed_at': (now - timedelta(days=10)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'ann_idx': 2,
            'reviewer': '张医生',
            'review_result': 'approved_with_notes',
            'review_reason': '边界可接受，建议备注',
            'boundary_issue_detail': '基底部(坐标310,250附近)与正常黏膜腺体的分界存在约5个腺体宽度的移行区，已建议在导出报告中注明。',
            'photo_alignment_issue': None,
            'suggestion': '导出时需注明"基底部边界为病理医师根据腺管结构连续性推定，建议内镜随访确认"',
            'review_round': 1,
            'reviewed_at': (now - timedelta(days=17)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'ann_idx': 3,
            'reviewer': '李医生',
            'review_result': 'approved',
            'review_reason': '对照组织，标注规范',
            'boundary_issue_detail': None,
            'photo_alignment_issue': None,
            'suggestion': None,
            'review_round': 1,
            'reviewed_at': (now - timedelta(days=14)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'ann_idx': 4,
            'reviewer': '赵医生',
            'review_result': 'rejected',
            'review_reason': '标注边界不清，需结合临床',
            'boundary_issue_detail': '胃炎活动区与正常黏膜之间存在约200μm宽的过渡带，炎性细胞浸润从密集到稀疏呈连续分布，当前多边形边界人为切割了炎症梯度。',
            'photo_alignment_issue': None,
            'suggestion': '建议结合胃镜所见及Hp检测结果，若临床考虑重度活动期胃炎，可将过渡带纳入标注范围；否则建议改用"炎症程度分级"替代区域标注。',
            'review_round': 1,
            'reviewed_at': (now - timedelta(days=11)).strftime('%Y-%m-%d %H:%M:%S')
        }
    ]
    
    for rev in reviews_data:
        is_active = 1
        cursor.execute('''
            INSERT INTO reviews 
            (annotation_id, reviewer, review_result, review_reason, boundary_issue_detail,
             photo_alignment_issue, suggestion, review_round, is_active, reviewed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            annotation_ids[rev['ann_idx']], rev['reviewer'], rev['review_result'],
            rev['review_reason'], rev['boundary_issue_detail'], rev['photo_alignment_issue'],
            rev['suggestion'], rev['review_round'], is_active, rev['reviewed_at']
        ))
    
    sequencing_data = [
        {
            'slide_idx': 0,
            'gene_panel': 'NGS肺癌10基因',
            'mutation_data': json.dumps({
                'EGFR': {'exon19del': {'丰度': 42.5, '临床意义': '敏感突变'}},
                'TP53': {'c.817C>T': {'丰度': 38.1, '临床意义': '功能丧失'}},
                'ALK': {'融合': '阴性'}
            }, ensure_ascii=False),
            'quality_score': 0.96,
            'submitted_by': '测序技术员A',
            'submitted_at': (now - timedelta(days=16)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 3,
            'gene_panel': 'NGS肺癌10基因',
            'mutation_data': json.dumps({
                'EGFR': {'野生型': True},
                'TP53': {'野生型': True},
                'ALK': {'融合': '阴性'}
            }, ensure_ascii=False),
            'quality_score': 0.98,
            'submitted_by': '测序技术员A',
            'submitted_at': (now - timedelta(days=13)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'slide_idx': 2,
            'gene_panel': '结肠MSI检测',
            'mutation_data': json.dumps({
                'MSI状态': 'MSS',
                'BRAF': {'V600E': '阴性'},
                'KRAS': {'野生型': True}
            }, ensure_ascii=False),
            'quality_score': 0.94,
            'submitted_by': '测序技术员B',
            'submitted_at': (now - timedelta(days=8)).strftime('%Y-%m-%d %H:%M:%S')
        }
    ]
    
    for seq in sequencing_data:
        cursor.execute('''
            INSERT INTO sequencing_results 
            (slide_id, gene_panel, mutation_data, quality_score, submitted_by, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            slide_ids[seq['slide_idx']], seq['gene_panel'], seq['mutation_data'],
            seq['quality_score'], seq['submitted_by'], seq['submitted_at']
        ))
    
    groups_data = [
        {
            'group_name': '肺癌病例组',
            'group_criteria': 'tissue_type LIKE "%肺%"',
            'created_at': (now - timedelta(days=20)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'group_name': '待确认边界组',
            'group_criteria': 'annotations.boundary_clarity IN ("unclear", "moderate")',
            'created_at': (now - timedelta(days=15)).strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'group_name': '有测序结果组',
            'group_criteria': 'EXISTS (SELECT 1 FROM sequencing_results WHERE slide_id = tissue_slides.id)',
            'created_at': (now - timedelta(days=10)).strftime('%Y-%m-%d %H:%M:%S')
        }
    ]
    
    group_ids = []
    for grp in groups_data:
        cursor.execute('''
            INSERT INTO slide_groups (group_name, group_criteria, created_at)
            VALUES (?, ?, ?)
        ''', (grp['group_name'], grp['group_criteria'], grp['created_at']))
        group_ids.append(cursor.lastrowid)
    
    group_members = [
        (0, 0, 0),
        (0, 3, 3),
        (1, 1, 1),
        (1, 2, 2),
        (1, 4, 4),
        (2, 0, 0),
        (2, 2, 2),
        (2, 3, 3)
    ]
    
    for g_idx, s_idx, a_idx in group_members:
        cursor.execute('''
            INSERT INTO slide_group_members 
            (group_id, slide_id, annotation_id, assigned_at)
            VALUES (?, ?, ?, ?)
        ''', (
            group_ids[g_idx], slide_ids[s_idx],
            annotation_ids[a_idx] if a_idx else None,
            (now - timedelta(days=9)).strftime('%Y-%m-%d %H:%M:%S')
        ))
    
    cursor.execute('SELECT id FROM slide_groups')
    for (gid,) in cursor.fetchall():
        recalculate_group_stats(cursor, gid, now)
    
    print(f'已加载示例数据: {len(slides_data)} 张切片, {len(annotations_data)} 条批注, '
          f'{len(reviews_data)} 条复核记录, {len(sequencing_data)} 条测序结果')

def recalculate_group_stats(cursor, group_id, calc_time=None):
    if calc_time is None:
        calc_time = datetime.now()
    
    cursor.execute('DELETE FROM group_statistics WHERE group_id = ?', (group_id,))
    
    calc_time_str = calc_time.strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members WHERE group_id = ?
    ''', (group_id,))
    total = cursor.fetchone()['cnt']
    
    stats = [
        ('total_members', str(total), '分组包含的切片总数'),
        ('last_updated', calc_time_str, '统计最后计算时间')
    ]
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN annotations a ON gm.annotation_id = a.id
        WHERE gm.group_id = ? AND a.boundary_clarity = 'clear'
    ''', (group_id,))
    clear_count = cursor.fetchone()['cnt']
    stats.append(('boundary_clear_count', str(clear_count), '边界清晰的批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN annotations a ON gm.annotation_id = a.id
        WHERE gm.group_id = ? AND a.boundary_clarity = 'unclear'
    ''', (group_id,))
    unclear_count = cursor.fetchone()['cnt']
    stats.append(('boundary_unclear_count', str(unclear_count), '边界不清(被拦截)的批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN annotations a ON gm.annotation_id = a.id
        WHERE gm.group_id = ? AND a.boundary_clarity = 'moderate'
    ''', (group_id,))
    moderate_count = cursor.fetchone()['cnt']
    stats.append(('boundary_moderate_count', str(moderate_count), '边界存在疑问的批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN reviews r ON gm.annotation_id = r.annotation_id
        WHERE gm.group_id = ? AND r.review_result = 'approved' AND r.is_active = 1
    ''', (group_id,))
    approved_count = cursor.fetchone()['cnt']
    stats.append(('review_approved_count', str(approved_count), '复核通过批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN reviews r ON gm.annotation_id = r.annotation_id
        WHERE gm.group_id = ? AND r.review_result = 'rejected' AND r.is_active = 1
    ''', (group_id,))
    rejected_count = cursor.fetchone()['cnt']
    stats.append(('review_rejected_count', str(rejected_count), '复核驳回(需修正)批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN reviews r ON gm.annotation_id = r.annotation_id
        WHERE gm.group_id = ? AND r.review_result = 'pending' AND r.is_active = 1
    ''', (group_id,))
    pending_count = cursor.fetchone()['cnt']
    stats.append(('review_pending_count', str(pending_count), '复核待定(待补充)批注数'))
    
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM slide_group_members gm
        JOIN sequencing_results sr ON gm.slide_id = sr.slide_id
        WHERE gm.group_id = ?
    ''', (group_id,))
    seq_count = cursor.fetchone()['cnt']
    stats.append(('sequencing_available_count', str(seq_count), '已匹配测序结果的切片数'))
    
    if total > 0:
        exportable = clear_count + approved_count
        stats.append(('export_ready_ratio', f'{exportable/total*100:.1f}%', '可用于导出的比例'))
        stats.append(('blocked_ratio', f'{unclear_count/total*100:.1f}%', '因边界问题被拦截比例'))
    
    for key, value, desc in stats:
        cursor.execute('''
            INSERT INTO group_statistics 
            (group_id, stat_key, stat_value, stat_description, calculated_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (group_id, key, value, desc, calc_time_str))

if __name__ == '__main__':
    init_db()
