import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, send_file
from werkzeug.utils import secure_filename
import pandas as pd
import io

from models import db, Batch, Sample, SampleStatus, StatusHistory, QualityControl, DuplicateRecord
from utils import (
    generate_batch_no, generate_filename, detect_duplicates,
    analyze_quality_difference, calculate_quality_scores,
    parse_sample_row, save_photo
)
from config import Config

api = Blueprint('api', __name__)

@api.route('/batches', methods=['GET'])
def get_batches():
    batches = Batch.query.order_by(Batch.import_time.desc()).all()
    return jsonify([b.to_dict() for b in batches])

@api.route('/samples', methods=['GET'])
def get_samples():
    batch_id = request.args.get('batch_id', type=int)
    status = request.args.get('status')
    is_duplicate = request.args.get('is_duplicate')
    include_quality = request.args.get('include_quality', 'false').lower() == 'true'
    include_history = request.args.get('include_history', 'false').lower() == 'true'
    
    query = Sample.query
    
    if batch_id:
        query = query.filter(Sample.batch_id == batch_id)
    if status:
        query = query.filter(Sample.status == status)
    if is_duplicate is not None:
        query = query.filter(Sample.is_duplicate == (is_duplicate == 'true'))
    
    samples = query.order_by(Sample.created_at.desc()).all()
    return jsonify([s.to_dict(include_quality, include_history) for s in samples])

@api.route('/samples/<int:sample_id>', methods=['GET'])
def get_sample_detail(sample_id):
    sample = Sample.query.get_or_404(sample_id)
    return jsonify(sample.to_dict(include_quality=True, include_history=True))

@api.route('/import', methods=['POST'])
def import_data():
    if 'file' not in request.files:
        return jsonify({'error': '未上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    operator = request.form.get('operator', '系统导入')
    remark = request.form.get('remark', '')
    
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ['.xlsx', '.xls', '.csv']:
        return jsonify({'error': '仅支持Excel和CSV文件'}), 400
    
    filepath = os.path.join(Config.UPLOAD_FOLDER, f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}")
    file.save(filepath)
    
    try:
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath)
        else:
            df = pd.read_csv(filepath)
    except Exception as e:
        return jsonify({'error': f'文件解析失败: {str(e)}'}), 400
    
    required_columns = ['条码']
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        return jsonify({'error': f'缺少必要列: {", ".join(missing_cols)}'}), 400
    
    existing_samples = Sample.query.all()
    existing_barcodes = {}
    for s in existing_samples:
        if s.barcode not in existing_barcodes:
            existing_barcodes[s.barcode] = []
        existing_barcodes[s.barcode].append({
            'sample_id': s.id,
            'batch_no': s.batch.batch_no,
            'batch_id': s.batch_id
        })
    
    duplicates = detect_duplicates(df, existing_barcodes)
    
    batch_no = generate_batch_no()
    batch = Batch(
        batch_no=batch_no,
        operator=operator,
        filename=filename,
        total_count=len(df),
        duplicate_count=len(duplicates),
        remark=remark
    )
    db.session.add(batch)
    db.session.flush()
    
    created_samples = []
    duplicate_barcodes = set(duplicates.keys())
    
    for idx, row in df.iterrows():
        sample = parse_sample_row(row, batch.id)
        
        if sample.barcode in duplicate_barcodes:
            dup_info = duplicates[sample.barcode]
            sample.is_duplicate = True
            sample.status = SampleStatus.DUPLICATE.value
            sample.is_available = False
            
            dup_type = dup_info['type']
            reason_parts = []
            
            if dup_type in ['batch_internal', 'both']:
                row_nums = [r + 2 for r in dup_info['rows']]
                reason_parts.append(f"本批次内重复，出现在第{', '.join(map(str, row_nums))}行")
            
            if dup_type in ['cross_batch', 'both']:
                existing = dup_info.get('existing_samples', [])
                batches = [e['batch_no'] for e in existing]
                reason_parts.append(f"与历史批次{', '.join(batches)}中的条码重复")
            
            sample.duplicate_reason = "；".join(reason_parts)
            sample.unavailable_reason = f"条码重复：{sample.duplicate_reason}。该记录标记为不可用，不能纳入统计分析。"
            
            if dup_type in ['cross_batch', 'both']:
                sample.duplicate_with = ",".join([str(e['sample_id']) for e in existing])
            
            db.session.add(sample)
            db.session.flush()
            
            dup_record = DuplicateRecord(
                sample_id=sample.id,
                barcode=sample.barcode,
                duplicate_sample_ids=",".join([str(e['sample_id']) for e in dup_info.get('existing_samples', [])]) if dup_info.get('existing_samples') else None,
                duplicate_batch_nos=",".join([e['batch_no'] for e in dup_info.get('existing_samples', [])]) if dup_info.get('existing_samples') else None,
                first_seen_batch=dup_info['existing_samples'][0]['batch_no'] if dup_info.get('existing_samples') else batch_no,
                duplicate_count=len(dup_info.get('existing_samples', [])) + len(dup_info.get('rows', [1])),
                reason=sample.duplicate_reason
            )
            db.session.add(dup_record)
        
        else:
            db.session.add(sample)
            db.session.flush()
        
        status_history = StatusHistory(
            sample_id=sample.id,
            from_status=None,
            to_status=sample.status,
            operator=operator,
            comment='数据导入' if not sample.is_duplicate else '数据导入，检测到条码重复'
        )
        db.session.add(status_history)
        created_samples.append(sample.to_dict())
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'batch': batch.to_dict(),
        'samples': created_samples,
        'duplicates': {
            'count': len(duplicates),
            'items': [
                {
                    'barcode': barcode,
                    'type': info['type'],
                    'reason': info['reason'],
                    'row_indices': info.get('rows', []),
                    'existing_batches': [e['batch_no'] for e in info.get('existing_samples', [])]
                }
                for barcode, info in duplicates.items()
            ]
        }
    })

@api.route('/samples/<int:sample_id>/status', methods=['PUT'])
def update_sample_status(sample_id):
    sample = Sample.query.get_or_404(sample_id)
    data = request.json
    
    new_status = data.get('status')
    operator = data.get('operator', '未知用户')
    comment = data.get('comment', '')
    
    if new_status not in [s.value for s in SampleStatus]:
        return jsonify({'error': '无效的状态值'}), 400
    
    old_status = sample.status
    sample.status = new_status
    
    if new_status == SampleStatus.APPROVED.value:
        sample.reviewer = operator
        sample.review_time = datetime.now()
        sample.review_comment = comment
    
    if new_status == SampleStatus.REJECTED.value:
        sample.is_available = False
        sample.unavailable_reason = comment or '复核不通过'
        sample.reviewer = operator
        sample.review_time = datetime.now()
        sample.review_comment = comment
    
    if new_status == SampleStatus.REVIEWING.value:
        comment = comment or '开始复核'
    
    db.session.add(sample)
    
    status_history = StatusHistory(
        sample_id=sample.id,
        from_status=old_status,
        to_status=new_status,
        operator=operator,
        comment=comment
    )
    db.session.add(status_history)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'sample': sample.to_dict(include_quality=True, include_history=True)
    })

@api.route('/samples/<int:sample_id>/quality', methods=['POST', 'PUT'])
def update_quality_control(sample_id):
    sample = Sample.query.get_or_404(sample_id)
    data = request.json
    uploader = data.get('operator', '未知用户')
    
    qc = QualityControl.query.filter_by(sample_id=sample_id).first()
    is_new = qc is None
    
    if is_new:
        qc = QualityControl(sample_id=sample_id)
    
    if 'morphological_score' in data or 'activity_score' in data or 'uniformity_score' in data:
        scores = calculate_quality_scores(data)
        qc.morphological_score = scores['morphological_score']
        qc.activity_score = scores['activity_score']
        qc.uniformity_score = scores['uniformity_score']
        qc.overall_score = scores['overall_score']
        qc.quality_level = scores['quality_level']
        
        if scores['overall_score'] < 60:
            sample.is_available = False
            sample.unavailable_reason = f'质控不通过：综合评分{scores["overall_score"]:.1f}分，低于60分合格线'
    
    if 'size_mean' in data:
        qc.size_mean = data['size_mean']
    if 'size_std' in data:
        qc.size_std = data['size_std']
    if 'size_cv' in data:
        qc.size_cv = data['size_cv']
    if 'abnormal_count' in data:
        qc.abnormal_count = data['abnormal_count']
    if 'abnormal_rate' in data:
        qc.abnormal_rate = data['abnormal_rate']
    if 'abnormal_description' in data:
        qc.abnormal_description = data['abnormal_description']
    
    if 'reviewer_comment' in data:
        qc.reviewer_comment = data['reviewer_comment']
        qc.reviewer = uploader
        qc.review_time = datetime.now()
    
    historical_qc = QualityControl.query.filter(
        QualityControl.sample_id != sample_id,
        QualityControl.overall_score.isnot(None)
    ).order_by(QualityControl.created_at.desc()).limit(5).all()
    
    qc.diff_analysis = analyze_quality_difference(qc, historical_qc)
    qc.diff_analysis_time = datetime.now()
    if not is_new:
        qc.diff_analysis_update_count = (qc.diff_analysis_update_count or 0) + 1
    
    if is_new:
        db.session.add(qc)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'quality_control': qc.to_dict(),
        'is_new': is_new
    })

@api.route('/samples/<int:sample_id>/photo', methods=['POST'])
def upload_photo(sample_id):
    sample = Sample.query.get_or_404(sample_id)
    
    if 'photo' not in request.files:
        return jsonify({'error': '未上传照片'}), 400
    
    file = request.files['photo']
    uploader = request.form.get('operator', '未知用户')
    
    photo_path = save_photo(file, Config.PHOTO_FOLDER)
    if not photo_path:
        return jsonify({'error': '文件格式不支持或保存失败'}), 400
    
    qc = QualityControl.query.filter_by(sample_id=sample_id).first()
    is_new = qc is None
    if is_new:
        qc = QualityControl(sample_id=sample_id)
    
    qc.micro_photo_path = photo_path
    qc.micro_photo_upload_time = datetime.now()
    qc.micro_photo_uploader = uploader
    
    if qc.overall_score is None:
        scores = calculate_quality_scores({})
        qc.morphological_score = scores['morphological_score']
        qc.activity_score = scores['activity_score']
        qc.uniformity_score = scores['uniformity_score']
        qc.overall_score = scores['overall_score']
        qc.quality_level = scores['quality_level']
    
    historical_qc = QualityControl.query.filter(
        QualityControl.sample_id != sample_id,
        QualityControl.overall_score.isnot(None)
    ).order_by(QualityControl.created_at.desc()).limit(5).all()
    
    qc.diff_analysis = analyze_quality_difference(qc, historical_qc)
    qc.diff_analysis_time = datetime.now()
    if not is_new:
        qc.diff_analysis_update_count = (qc.diff_analysis_update_count or 0) + 1
    
    if is_new:
        db.session.add(qc)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'quality_control': qc.to_dict()
    })

@api.route('/photos/<filename>')
def get_photo(filename):
    return send_from_directory(Config.PHOTO_FOLDER, filename)

@api.route('/export/report', methods=['GET'])
def export_report():
    batch_id = request.args.get('batch_id', type=int)
    include_unavailable = request.args.get('include_unavailable', 'false').lower() == 'true'
    format_type = request.args.get('format', 'xlsx')
    
    query = Sample.query
    if batch_id:
        query = query.filter(Sample.batch_id == batch_id)
    if not include_unavailable:
        query = query.filter(Sample.is_available == True)
    
    samples = query.all()
    batch = Batch.query.get(batch_id) if batch_id else None
    batch_no = batch.batch_no if batch else 'ALL'
    
    data = []
    for s in samples:
        qc = s.quality_control
        row = {
            '批次号': s.batch.batch_no,
            '条码': s.barcode,
            '样本名称': s.sample_name,
            '物种': s.species,
            '初始数量': s.initial_count,
            '存活数量': s.survival_count,
            '存活率(%)': round(s.survival_rate, 2),
            '水温(℃)': s.culture_temperature,
            '盐度': s.culture_salinity,
            '养殖天数': s.culture_days,
            '采样时间': s.sample_time.strftime('%Y-%m-%d %H:%M:%S') if s.sample_time else '',
            '采样人': s.collector,
            '状态': s.status,
            '是否可用': '是' if s.is_available else '否',
            '不可用原因': s.unavailable_reason if not s.is_available else '',
            '是否重复': '是' if s.is_duplicate else '否',
            '重复原因': s.duplicate_reason if s.is_duplicate else '',
            '复核人': s.reviewer,
            '复核时间': s.review_time.strftime('%Y-%m-%d %H:%M:%S') if s.review_time else '',
            '复核意见': s.review_comment
        }
        
        if qc:
            row.update({
                '质控综合评分': qc.overall_score,
                '质量等级': qc.quality_level,
                '形态学评分': qc.morphological_score,
                '活力评分': qc.activity_score,
                '均匀度评分': qc.uniformity_score,
                '平均规格': qc.size_mean,
                '规格标准差': qc.size_std,
                '变异系数(%)': qc.size_cv,
                '异常个体数': qc.abnormal_count,
                '异常率(%)': qc.abnormal_rate,
                '差异分析': qc.diff_analysis,
                '分析更新次数': qc.diff_analysis_update_count,
                '照片上传时间': qc.micro_photo_upload_time.strftime('%Y-%m-%d %H:%M:%S') if qc.micro_photo_upload_time else ''
            })
        
        data.append(row)
    
    df = pd.DataFrame(data)
    filename = generate_filename(batch_no, '水产苗种存活率报告')
    
    if format_type == 'xlsx':
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='样本数据', index=False)
            
            if not include_unavailable:
                dup_query = Sample.query.filter(Sample.is_available == False)
                if batch_id:
                    dup_query = dup_query.filter(Sample.batch_id == batch_id)
                duplicates = dup_query.all()
                
                if duplicates:
                    dup_data = []
                    for d in duplicates:
                        dup_data.append({
                            '条码': d.barcode,
                            '样本名称': d.sample_name,
                            '批次号': d.batch.batch_no,
                            '状态': d.status,
                            '不可用原因': d.unavailable_reason,
                            '重复原因': d.duplicate_reason,
                            '重复样本ID': d.duplicate_with
                        })
                    pd.DataFrame(dup_data).to_excel(writer, sheet_name='不可用记录明细', index=False)
            
            summary_sheet = writer.book.create_sheet('汇总说明')
            summary_sheet['A1'] = '水产苗种存活率分析报告'
            summary_sheet['A1'].font = summary_sheet['A1'].font.copy(size=14, bold=True)
            summary_sheet['A2'] = f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
            summary_sheet['A3'] = f'批次号: {batch_no}'
            summary_sheet['A4'] = f'有效样本数: {len([s for s in samples if s.is_available])}'
            summary_sheet['A5'] = f'不可用样本数: {len([s for s in samples if not s.is_available])}'
            summary_sheet['A6'] = f'平均存活率: {round(df["存活率(%)"].mean(), 2) if len(df) > 0 else 0}%'
            
            if len([s for s in samples if not s.is_available]) > 0:
                summary_sheet['A8'] = '【重要说明】不可用记录原因'
                row_idx = 9
                for d in [s for s in samples if not s.is_available]:
                    summary_sheet[f'A{row_idx}'] = f'• 条码{d.barcode}：{d.unavailable_reason}'
                    row_idx += 1
        
        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'{filename}.xlsx'
        )
    
    return jsonify({'data': data})

@api.route('/statistics', methods=['GET'])
def get_statistics():
    batch_id = request.args.get('batch_id', type=int)
    
    query = Sample.query
    if batch_id:
        query = query.filter(Sample.batch_id == batch_id)
    
    samples = query.all()
    
    available_samples = [s for s in samples if s.is_available]
    unavailable_samples = [s for s in samples if not s.is_available]
    duplicate_samples = [s for s in samples if s.is_duplicate]
    
    avg_survival = 0
    if available_samples:
        avg_survival = round(sum(s.survival_rate for s in available_samples) / len(available_samples), 2)
    
    species_stats = {}
    for s in available_samples:
        species = s.species or '未分类'
        if species not in species_stats:
            species_stats[species] = []
        species_stats[species].append(s.survival_rate)
    
    species_data = []
    for species, rates in species_stats.items():
        species_data.append({
            'species': species,
            'count': len(rates),
            'avg_rate': round(sum(rates) / len(rates), 2),
            'max_rate': round(max(rates), 2),
            'min_rate': round(min(rates), 2)
        })
    
    status_counts = {}
    for s in samples:
        status = s.status
        status_counts[status] = status_counts.get(status, 0) + 1
    
    survival_ranges = {
        '≥90%': 0,
        '70-90%': 0,
        '50-70%': 0,
        '<50%': 0
    }
    for s in available_samples:
        rate = s.survival_rate
        if rate >= 90:
            survival_ranges['≥90%'] += 1
        elif rate >= 70:
            survival_ranges['70-90%'] += 1
        elif rate >= 50:
            survival_ranges['50-70%'] += 1
        else:
            survival_ranges['<50%'] += 1
    
    duplicate_reasons = {}
    for d in duplicate_samples:
        reason = d.duplicate_reason or '未知原因'
        short_reason = reason.split('：')[0] if '：' in reason else reason[:20]
        duplicate_reasons[short_reason] = duplicate_reasons.get(short_reason, 0) + 1
    
    return jsonify({
        'total_count': len(samples),
        'available_count': len(available_samples),
        'unavailable_count': len(unavailable_samples),
        'duplicate_count': len(duplicate_samples),
        'avg_survival_rate': avg_survival,
        'status_counts': status_counts,
        'survival_ranges': survival_ranges,
        'species_data': species_data,
        'duplicate_reasons': duplicate_reasons,
        'unavailable_details': [
            {
                'id': s.id,
                'barcode': s.barcode,
                'sample_name': s.sample_name,
                'batch_no': s.batch.batch_no,
                'reason': s.unavailable_reason
            }
            for s in unavailable_samples
        ]
    })

@api.route('/duplicates', methods=['GET'])
def get_duplicates():
    resolved = request.args.get('resolved')
    query = DuplicateRecord.query
    
    if resolved is not None:
        query = query.filter(DuplicateRecord.resolved == (resolved == 'true'))
    
    records = query.order_by(DuplicateRecord.detected_time.desc()).all()
    return jsonify([r.to_dict() for r in records])
