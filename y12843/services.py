import hashlib
import json
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from database import (
    get_db, log_audit, row_to_dict, rows_to_dict_list
)

LOW_QUALITY_THRESHOLD = 30.0

def calculate_file_hash(file_content: str) -> str:
    return hashlib.md5(file_content.encode('utf-8')).hexdigest()

def mark_low_quality_reads(reads: List[Dict]) -> List[Dict]:
    for read in reads:
        q_score = read.get('quality_score', 0)
        if q_score < LOW_QUALITY_THRESHOLD:
            read['is_low_quality'] = 1
            reasons = []
            if q_score < 10:
                reasons.append('极低质量')
            elif q_score < 20:
                reasons.append('低质量')
            if read.get('gc_content', 50) < 30 or read.get('gc_content', 50) > 70:
                reasons.append('GC含量异常')
            if len(read.get('sequence', '')) < 50:
                reasons.append('序列过短')
            read['low_quality_reason'] = ';'.join(reasons) if reasons else '质量值低于阈值'
        else:
            read['is_low_quality'] = 0
            read['low_quality_reason'] = None
    return reads

def detect_duplicate(conn, sample_no: str, culture_date: str, culture_type: str) -> Optional[int]:
    c = conn.cursor()
    c.execute('''
        SELECT id FROM culture_records
        WHERE sample_no = ? AND culture_date = ? AND culture_type = ?
    ''', (sample_no, culture_date, culture_type))
    row = c.fetchone()
    return row['id'] if row else None

def ensure_reagent_batch(conn, reagent_no: str, reagent_info: Optional[Dict] = None) -> int:
    c = conn.cursor()
    c.execute('SELECT id FROM reagent_batches WHERE reagent_no = ?', (reagent_no,))
    row = c.fetchone()
    if row:
        return row['id']
    if reagent_info is None:
        reagent_info = {}
    c.execute('''
        INSERT INTO reagent_batches
        (reagent_no, reagent_name, manufacturer, expire_date)
        VALUES (?, ?, ?, ?)
    ''', (
        reagent_no,
        reagent_info.get('reagent_name', '未知试剂'),
        reagent_info.get('manufacturer'),
        reagent_info.get('expire_date')
    ))
    new_id = c.lastrowid
    log_audit(conn, 'reagent_batches', new_id, 'INSERT', new_values={
        'reagent_no': reagent_no, **reagent_info
    })
    return new_id

def ensure_sample_batch(conn, batch_no: str, batch_info: Dict) -> int:
    c = conn.cursor()
    c.execute('SELECT id FROM sample_batches WHERE batch_no = ?', (batch_no,))
    row = c.fetchone()
    if row:
        return row['id']
    c.execute('''
        INSERT INTO sample_batches (batch_no, group_name, collect_date)
        VALUES (?, ?, ?)
    ''', (batch_no, batch_info.get('group_name', '未分组'), batch_info.get('collect_date', datetime.now().strftime('%Y-%m-%d'))))
    new_id = c.lastrowid
    log_audit(conn, 'sample_batches', new_id, 'INSERT', new_values={
        'batch_no': batch_no, **batch_info
    })
    return new_id

def import_records(data: Dict, operator: str = 'system') -> Dict[str, Any]:
    conn = get_db()
    try:
        file_content = json.dumps(data, ensure_ascii=False, sort_keys=True)
        file_hash = calculate_file_hash(file_content)
        source_file = data.get('source_file', f'import_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')

        c = conn.cursor()
        c.execute('SELECT id FROM import_sessions WHERE file_hash = ?', (file_hash,))
        existing = c.fetchone()
        if existing:
            c.execute('SELECT * FROM import_sessions WHERE id = ?', (existing['id'],))
            return {
                'status': 'duplicate_file',
                'message': f'该文件已在之前导入过 (导入会话ID: {existing["id"]})',
                'existing_session': row_to_dict(c.fetchone())
            }

        c.execute('''
            INSERT INTO import_sessions
            (source_file, file_hash, operator, notes)
            VALUES (?, ?, ?, ?)
        ''', (source_file, file_hash, operator, data.get('notes', '')))
        import_session_id = c.lastrowid

        batch_info = data.get('batch_info', {})
        batch_no = batch_info.get('batch_no', f'BATCH_{datetime.now().strftime("%Y%m%d")}')
        sample_batch_id = ensure_sample_batch(conn, batch_no, batch_info)

        records = data.get('records', [])
        total = len(records)
        new_count = 0
        dup_count = 0
        low_quality_count = 0

        for rec in records:
            sample_no = rec['sample_no']
            culture_type = rec['culture_type']
            culture_date = rec['culture_date']

            existing_id = detect_duplicate(conn, sample_no, culture_date, culture_type)
            if existing_id:
                dup_count += 1
                log_audit(conn, 'culture_records', existing_id, 'SKIP_DUPLICATE',
                          new_values=rec, import_session_id=import_session_id,
                          operator=operator)
                continue

            reagent_no = rec.get('reagent_no')
            reagent_batch_id = None
            if reagent_no:
                reagent_batch_id = ensure_reagent_batch(conn, reagent_no, rec.get('reagent_info'))

            c.execute('''
                INSERT INTO culture_records
                (sample_batch_id, sample_no, patient_id, culture_type, culture_date,
                 reagent_batch_id, incubator_temp, incubator_humidity, culture_result,
                 raw_data_path, source_file, source_import_session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                sample_batch_id, sample_no, rec.get('patient_id'),
                culture_type, culture_date, reagent_batch_id,
                rec.get('incubator_temp'), rec.get('incubator_humidity'),
                rec.get('culture_result'), rec.get('raw_data_path'),
                source_file, import_session_id
            ))
            culture_id = c.lastrowid
            new_count += 1
            log_audit(conn, 'culture_records', culture_id, 'INSERT',
                      new_values=rec, import_session_id=import_session_id,
                      operator=operator)

            reads = rec.get('sequencing_reads', [])
            reads = mark_low_quality_reads(reads)
            has_low_quality = any(r.get('is_low_quality') == 1 for r in reads)
            if has_low_quality:
                low_quality_count += 1

            for read in reads:
                c.execute('''
                    INSERT INTO sequencing_reads
                    (culture_record_id, read_id, quality_score, is_low_quality,
                     low_quality_reason, sequence, gc_content)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    culture_id, read['read_id'], read['quality_score'],
                    read['is_low_quality'], read.get('low_quality_reason'),
                    read.get('sequence'), read.get('gc_content')
                ))
                log_audit(conn, 'sequencing_reads', c.lastrowid, 'INSERT',
                          new_values=read, import_session_id=import_session_id,
                          operator=operator)

            micrographs = rec.get('micrographs', [])
            for mg in micrographs:
                c.execute('''
                    INSERT INTO micrographs
                    (culture_record_id, image_path, capture_time, magnification, annotation)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    culture_id, mg['image_path'], mg.get('capture_time'),
                    mg.get('magnification'), mg.get('annotation')
                ))
                log_audit(conn, 'micrographs', c.lastrowid, 'INSERT',
                          new_values=mg, import_session_id=import_session_id,
                          operator=operator)

        c.execute('''
            UPDATE import_sessions
            SET total_records = ?, new_records = ?, duplicate_records = ?, low_quality_records = ?
            WHERE id = ?
        ''', (total, new_count, dup_count, low_quality_count, import_session_id))

        conn.commit()

        c.execute('SELECT * FROM import_sessions WHERE id = ?', (import_session_id,))
        return {
            'status': 'success',
            'import_session': row_to_dict(c.fetchone()),
            'summary': {
                'total': total,
                'new': new_count,
                'duplicates': dup_count,
                'with_low_quality': low_quality_count
            }
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def supplement_record(culture_record_id: int, supplement_data: Dict, operator: str = 'system') -> Dict[str, Any]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('SELECT * FROM culture_records WHERE id = ?', (culture_record_id,))
        existing = c.fetchone()
        if not existing:
            return {'status': 'error', 'message': '记录不存在'}

        old_values = row_to_dict(existing)
        update_fields = []
        update_values = []
        allowed_fields = ['incubator_temp', 'incubator_humidity', 'culture_result', 'raw_data_path']
        for field in allowed_fields:
            if field in supplement_data:
                update_fields.append(f'{field} = ?')
                update_values.append(supplement_data[field])

        if update_fields:
            update_values.append(culture_record_id)
            c.execute(f'''
                UPDATE culture_records
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', tuple(update_values))

            new_values = {k: supplement_data[k] for k in allowed_fields if k in supplement_data}
            log_audit(conn, 'culture_records', culture_record_id, 'UPDATE_SUPPLEMENT',
                      old_values=old_values, new_values=new_values, operator=operator)

            c.execute('SELECT * FROM conclusions WHERE culture_record_id = ? AND is_active = 1',
                      (culture_record_id,))
            active_conclusions = c.fetchall()
            for conc in active_conclusions:
                c.execute('''
                    UPDATE conclusions
                    SET is_active = 0, superseded_by = NULL
                    WHERE id = ?
                ''', (conc['id'],))
                log_audit(conn, 'conclusions', conc['id'], 'SUPERSEDED',
                          old_values={'is_active': 1}, new_values={'is_active': 0},
                          operator=operator)

        reads = supplement_data.get('sequencing_reads', [])
        if reads:
            reads = mark_low_quality_reads(reads)
            for read in reads:
                c.execute('''
                    INSERT INTO sequencing_reads
                    (culture_record_id, read_id, quality_score, is_low_quality,
                     low_quality_reason, sequence, gc_content)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    culture_record_id, read['read_id'], read['quality_score'],
                    read['is_low_quality'], read.get('low_quality_reason'),
                    read.get('sequence'), read.get('gc_content')
                ))
                log_audit(conn, 'sequencing_reads', c.lastrowid, 'INSERT_SUPPLEMENT',
                          new_values=read, operator=operator)

        micrographs = supplement_data.get('micrographs', [])
        for mg in micrographs:
            c.execute('''
                INSERT INTO micrographs
                (culture_record_id, image_path, capture_time, magnification, annotation)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                culture_record_id, mg['image_path'], mg.get('capture_time'),
                mg.get('magnification'), mg.get('annotation')
            ))
            log_audit(conn, 'micrographs', c.lastrowid, 'INSERT_SUPPLEMENT',
                      new_values=mg, operator=operator)

        conn.commit()

        return {
            'status': 'success',
            'message': '补录完成，原有结论已标记为失效',
            'superseded_conclusions': len(active_conclusions)
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_low_quality_records(sample_batch_id: Optional[int] = None) -> List[Dict]:
    conn = get_db()
    try:
        c = conn.cursor()
        if sample_batch_id:
            c.execute('''
                SELECT DISTINCT cr.*, sb.batch_no, sb.group_name, rb.reagent_no
                FROM culture_records cr
                JOIN sample_batches sb ON cr.sample_batch_id = sb.id
                LEFT JOIN reagent_batches rb ON cr.reagent_batch_id = rb.id
                JOIN sequencing_reads sr ON cr.id = sr.culture_record_id
                WHERE sr.is_low_quality = 1 AND cr.sample_batch_id = ?
                ORDER BY cr.created_at DESC
            ''', (sample_batch_id,))
        else:
            c.execute('''
                SELECT DISTINCT cr.*, sb.batch_no, sb.group_name, rb.reagent_no
                FROM culture_records cr
                JOIN sample_batches sb ON cr.sample_batch_id = sb.id
                LEFT JOIN reagent_batches rb ON cr.reagent_batch_id = rb.id
                JOIN sequencing_reads sr ON cr.id = sr.culture_record_id
                WHERE sr.is_low_quality = 1
                ORDER BY cr.created_at DESC
            ''')
        rows = c.fetchall()
        results = []
        for row in rows:
            rec = row_to_dict(row)
            c.execute('''
                SELECT * FROM sequencing_reads
                WHERE culture_record_id = ? AND is_low_quality = 1
            ''', (row['id'],))
            rec['low_quality_reads'] = rows_to_dict_list(c.fetchall())
            c.execute('''
                SELECT * FROM micrographs WHERE culture_record_id = ?
            ''', (row['id'],))
            rec['micrographs'] = rows_to_dict_list(c.fetchall())
            results.append(rec)
        return results
    finally:
        conn.close()

def create_review_session(sample_batch_id: int, session_name: str, created_by: str) -> Dict[str, Any]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            INSERT INTO review_sessions (sample_batch_id, session_name, created_by)
            VALUES (?, ?, ?)
        ''', (sample_batch_id, session_name, created_by))
        session_id = c.lastrowid
        log_audit(conn, 'review_sessions', session_id, 'CREATE', operator=created_by)

        c.execute('''
            SELECT DISTINCT cr.id, rb.reagent_no,
                   COUNT(DISTINCT sr.id) FILTER (WHERE sr.is_low_quality = 1) as lq_count,
                   COUNT(DISTINCT mg.id) as mg_count,
                   EXISTS (SELECT 1 FROM sequencing_reads sr2
                           WHERE sr2.culture_record_id = cr.id AND sr2.is_low_quality = 1) as has_lq
            FROM culture_records cr
            LEFT JOIN reagent_batches rb ON cr.reagent_batch_id = rb.id
            LEFT JOIN sequencing_reads sr ON cr.id = sr.culture_record_id
            LEFT JOIN micrographs mg ON cr.id = mg.culture_record_id
            WHERE cr.sample_batch_id = ?
            GROUP BY cr.id, rb.reagent_no
        ''', (sample_batch_id,))

        for row in c.fetchall():
            c.execute('''
                INSERT INTO review_items
                (review_session_id, culture_record_id, has_low_quality,
                 low_quality_reads_count, reagent_batch_no, micrograph_count)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                session_id, row['id'], 1 if row['has_lq'] else 0,
                row['lq_count'] or 0, row['reagent_no'], row['mg_count'] or 0
            ))
            log_audit(conn, 'review_items', c.lastrowid, 'CREATE', operator=created_by)

        conn.commit()
        return get_review_session(session_id)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_review_session(session_id: int) -> Optional[Dict]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT rs.*, sb.batch_no, sb.group_name, sb.collect_date
            FROM review_sessions rs
            JOIN sample_batches sb ON rs.sample_batch_id = sb.id
            WHERE rs.id = ?
        ''', (session_id,))
        session = row_to_dict(c.fetchone())
        if not session:
            return None

        c.execute('''
            SELECT ri.*, cr.sample_no, cr.culture_type, cr.culture_date,
                   cr.culture_result, cr.patient_id
            FROM review_items ri
            JOIN culture_records cr ON ri.culture_record_id = cr.id
            WHERE ri.review_session_id = ?
            ORDER BY ri.needs_review DESC, cr.sample_no
        ''', (session_id,))
        items = rows_to_dict_list(c.fetchall())

        for item in items:
            c.execute('''
                SELECT * FROM sequencing_reads
                WHERE culture_record_id = ? AND is_low_quality = 1
            ''', (item['culture_record_id'],))
            item['low_quality_reads'] = rows_to_dict_list(c.fetchall())

            c.execute('''
                SELECT * FROM micrographs WHERE culture_record_id = ?
            ''', (item['culture_record_id'],))
            item['micrographs'] = rows_to_dict_list(c.fetchall())

            c.execute('''
                SELECT * FROM reagent_batches WHERE reagent_no = ?
            ''', (item['reagent_batch_no'],))
            item['reagent_info'] = row_to_dict(c.fetchone())

            c.execute('''
                SELECT * FROM conclusions
                WHERE review_item_id = ? AND is_active = 1
            ''', (item['id'],))
            item['active_conclusion'] = row_to_dict(c.fetchone())

        session['items'] = items
        return session
    finally:
        conn.close()

def submit_review_item(review_item_id: int, review_data: Dict, operator: str) -> Dict[str, Any]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('SELECT * FROM review_items WHERE id = ?', (review_item_id,))
        item = c.fetchone()
        if not item:
            return {'status': 'error', 'message': '复核项不存在'}

        old_values = row_to_dict(item)
        c.execute('''
            UPDATE review_items
            SET needs_review = 0, review_notes = ?, review_result = ?,
                reviewed_at = CURRENT_TIMESTAMP, reviewer = ?
            WHERE id = ?
        ''', (
            review_data.get('review_notes'), review_data.get('review_result'),
            operator, review_item_id
        ))

        new_values = {
            'needs_review': 0,
            'review_notes': review_data.get('review_notes'),
            'review_result': review_data.get('review_result'),
            'reviewer': operator
        }
        log_audit(conn, 'review_items', review_item_id, 'REVIEW',
                  old_values=old_values, new_values=new_values, operator=operator)

        c.execute('''
            SELECT * FROM conclusions
            WHERE review_item_id = ?
            ORDER BY decided_at DESC
            LIMIT 1
        ''', (review_item_id,))
        existing_conc = c.fetchone()
        if existing_conc:
            if existing_conc['is_active'] == 1:
                c.execute('''
                    UPDATE conclusions SET is_active = 0 WHERE id = ?
                ''', (existing_conc['id'],))
                log_audit(conn, 'conclusions', existing_conc['id'], 'SUPERSEDED',
                          operator=operator)

        c.execute('''
            INSERT INTO conclusions
            (review_item_id, culture_record_id, conclusion_text, conclusion_type,
             retest_needed, retest_reason, final_decision, decided_by, superseded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            review_item_id, item['culture_record_id'],
            review_data.get('conclusion_text', ''),
            review_data.get('conclusion_type', 'normal'),
            1 if review_data.get('retest_needed') else 0,
            review_data.get('retest_reason'),
            review_data.get('final_decision'),
            operator,
            existing_conc['id'] if existing_conc else None
        ))
        conclusion_id = c.lastrowid
        log_audit(conn, 'conclusions', conclusion_id, 'CREATE', operator=operator)

        c.execute('''
            INSERT INTO quality_control
            (review_item_id, culture_record_id, qc_type, qc_result, qc_notes, operator)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            review_item_id, item['culture_record_id'],
            'review', review_data.get('review_result', 'pending'),
            review_data.get('review_notes'), operator
        ))

        conn.commit()
        return {
            'status': 'success',
            'review_item_id': review_item_id,
            'conclusion_id': conclusion_id,
            'superseded_previous': existing_conc is not None
        }
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_group_statistics() -> List[Dict]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT sb.id, sb.batch_no, sb.group_name, sb.collect_date,
                   COUNT(DISTINCT cr.id) as total_samples,
                   COUNT(DISTINCT sr.id) FILTER (WHERE sr.is_low_quality = 1) as low_quality_count,
                   COUNT(DISTINCT cr.id) FILTER (WHERE EXISTS (
                       SELECT 1 FROM sequencing_reads sr2
                       WHERE sr2.culture_record_id = cr.id AND sr2.is_low_quality = 1
                   )) as samples_with_low_quality,
                   COUNT(DISTINCT rs.id) as review_sessions,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.retest_needed = 1 AND c.is_active = 1) as retest_needed
            FROM sample_batches sb
            LEFT JOIN culture_records cr ON sb.id = cr.sample_batch_id
            LEFT JOIN sequencing_reads sr ON cr.id = sr.culture_record_id
            LEFT JOIN review_sessions rs ON sb.id = rs.sample_batch_id
            LEFT JOIN review_items ri ON rs.id = ri.review_session_id
            LEFT JOIN conclusions c ON ri.id = c.review_item_id
            GROUP BY sb.id, sb.batch_no, sb.group_name, sb.collect_date
            ORDER BY sb.collect_date DESC, sb.batch_no
        ''')
        return rows_to_dict_list(c.fetchall())
    finally:
        conn.close()

def get_monthly_quality_report(year_month: str) -> Dict[str, Any]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT sb.id, sb.batch_no, sb.group_name, sb.collect_date,
                   COUNT(DISTINCT cr.id) as total_samples,
                   COUNT(DISTINCT CASE WHEN sr.is_low_quality = 1 THEN cr.id END) as lq_samples,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.retest_needed = 1 AND c.is_active = 1) as retest_count,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = 1) as concluded,
                   COUNT(DISTINCT ri.id) FILTER (WHERE ri.needs_review = 1) as pending_review
            FROM sample_batches sb
            LEFT JOIN culture_records cr ON sb.id = cr.sample_batch_id
            LEFT JOIN sequencing_reads sr ON cr.id = sr.culture_record_id
            LEFT JOIN review_sessions rs ON sb.id = rs.sample_batch_id
            LEFT JOIN review_items ri ON rs.id = ri.review_session_id
            LEFT JOIN conclusions c ON ri.id = c.review_item_id
            WHERE strftime('%Y-%m', sb.collect_date) = ?
            GROUP BY sb.id
            ORDER BY sb.collect_date
        ''', (year_month,))
        batches = rows_to_dict_list(c.fetchall())

        total_batches = len(batches)
        total_samples = sum(b['total_samples'] for b in batches)
        total_lq = sum(b['lq_samples'] for b in batches)
        total_retest = sum(b['retest_count'] for b in batches)
        lq_rate = (total_lq / total_samples * 100) if total_samples > 0 else 0
        retest_rate = (total_retest / total_samples * 100) if total_samples > 0 else 0

        return {
            'year_month': year_month,
            'summary': {
                'total_batches': total_batches,
                'total_samples': total_samples,
                'low_quality_samples': total_lq,
                'low_quality_rate': round(lq_rate, 2),
                'retest_needed': total_retest,
                'retest_rate': round(retest_rate, 2)
            },
            'batches': batches
        }
    finally:
        conn.close()

def trace_record(culture_record_id: int) -> Dict[str, Any]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT cr.*, sb.batch_no, sb.group_name, sb.collect_date,
                   rb.reagent_no, rb.reagent_name, rb.manufacturer,
                   imp.source_file as import_source, imp.import_time, imp.operator as import_operator
            FROM culture_records cr
            JOIN sample_batches sb ON cr.sample_batch_id = sb.id
            LEFT JOIN reagent_batches rb ON cr.reagent_batch_id = rb.id
            LEFT JOIN import_sessions imp ON cr.source_import_session_id = imp.id
            WHERE cr.id = ?
        ''', (culture_record_id,))
        record = row_to_dict(c.fetchone())
        if not record:
            return {'status': 'error', 'message': '记录不存在'}

        c.execute('''
            SELECT * FROM sequencing_reads
            WHERE culture_record_id = ?
            ORDER BY is_low_quality DESC, quality_score
        ''', (culture_record_id,))
        record['sequencing_reads'] = rows_to_dict_list(c.fetchall())

        c.execute('''
            SELECT * FROM micrographs WHERE culture_record_id = ?
        ''', (culture_record_id,))
        record['micrographs'] = rows_to_dict_list(c.fetchall())

        c.execute('''
            SELECT ri.*, rs.session_name, rs.created_by as session_creator,
                   rs.created_at as session_time
            FROM review_items ri
            JOIN review_sessions rs ON ri.review_session_id = rs.id
            WHERE ri.culture_record_id = ?
            ORDER BY rs.created_at DESC
        ''', (culture_record_id,))
        reviews = rows_to_dict_list(c.fetchall())

        for r in reviews:
            c.execute('''
                SELECT * FROM conclusions
                WHERE review_item_id = ?
                ORDER BY decided_at DESC
            ''', (r['id'],))
            r['conclusions'] = rows_to_dict_list(c.fetchall())

            c.execute('''
                SELECT * FROM quality_control
                WHERE review_item_id = ?
                ORDER BY qc_date DESC
            ''', (r['id'],))
            r['qc_records'] = rows_to_dict_list(c.fetchall())

        record['reviews'] = reviews

        c.execute('''
            SELECT * FROM audit_trail
            WHERE (table_name = 'culture_records' AND record_id = ?)
               OR (table_name = 'sequencing_reads' AND record_id IN (
                   SELECT id FROM sequencing_reads WHERE culture_record_id = ?
               ))
               OR (table_name = 'micrographs' AND record_id IN (
                   SELECT id FROM micrographs WHERE culture_record_id = ?
               ))
            ORDER BY operation_time DESC
        ''', (culture_record_id, culture_record_id, culture_record_id))

        audit = rows_to_dict_list(c.fetchall())
        for entry in audit:
            if entry.get('old_values'):
                entry['old_values'] = json.loads(entry['old_values'])
            if entry.get('new_values'):
                entry['new_values'] = json.loads(entry['new_values'])
        record['audit_trail'] = audit

        return record
    finally:
        conn.close()

def trace_reagent_conclusions(reagent_no: str) -> List[Dict]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT rb.*, cr.id as culture_id, cr.sample_no, cr.culture_date,
                   cr.culture_type, c.conclusion_text, c.final_decision,
                   c.retest_needed, c.decided_at, c.decided_by, c.is_active,
                   ri.id as review_item_id, rs.session_name
            FROM reagent_batches rb
            JOIN culture_records cr ON rb.id = cr.reagent_batch_id
            JOIN review_items ri ON cr.id = ri.culture_record_id
            JOIN review_sessions rs ON ri.review_session_id = rs.id
            JOIN conclusions c ON ri.id = c.review_item_id
            WHERE rb.reagent_no = ?
            ORDER BY c.decided_at DESC
        ''', (reagent_no,))
        results = rows_to_dict_list(c.fetchall())
        return results
    finally:
        conn.close()

def get_active_conclusions(culture_record_id: int) -> List[Dict]:
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('''
            SELECT * FROM conclusions
            WHERE culture_record_id = ? AND is_active = 1
            ORDER BY decided_at DESC
        ''', (culture_record_id,))
        return rows_to_dict_list(c.fetchall())
    finally:
        conn.close()
