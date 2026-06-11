from datetime import datetime, date
from flask import Flask, request, jsonify, send_file
from io import BytesIO, StringIO
import json
import pandas as pd
from models import db, SeaweedSample, ReviewBatch, ReviewOpinion, ImageAnnotation, BatchStatistics, LowQualityRead, AuditTrail
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)


def init_db():
    with app.app_context():
        db.create_all()


def serialize_review_with_history(review):
    data = {
        'id': review.id,
        'sample_id': review.sample_id,
        'batch_id': review.batch_id,
        'reviewer': review.reviewer,
        'opinion': review.opinion,
        'conclusion': review.conclusion,
        'is_negative_control': review.is_negative_control,
        'negative_control_abnormal': review.negative_control_abnormal,
        'low_quality_reads_passed': review.low_quality_reads_passed,
        'change_reason': review.change_reason,
        'version': review.version,
        'created_at': review.created_at.isoformat() if review.created_at else None,
    }

    if review.previous_version:
        data['previous_version'] = {
            'id': review.previous_version.id,
            'opinion': review.previous_version.opinion,
            'conclusion': review.previous_version.conclusion,
            'reviewer': review.previous_version.reviewer,
            'created_at': review.previous_version.created_at.isoformat() if review.previous_version.created_at else None,
        }
        data['version_comparison'] = {
            'old_conclusion': review.previous_version.conclusion,
            'new_conclusion': review.conclusion,
            'old_opinion': review.previous_version.opinion,
            'new_opinion': review.opinion,
        }

    if review.audit_trail:
        data['audit_trail'] = [{
            'action': a.action,
            'old_value': a.old_value,
            'new_value': a.new_value,
            'changed_by': a.changed_by,
            'change_reason': a.change_reason,
            'timestamp': a.timestamp.isoformat() if a.timestamp else None,
        } for a in review.audit_trail]

    return data


def calculate_batch_statistics(batch_id, calculated_by):
    all_reviews = ReviewOpinion.query.filter_by(batch_id=batch_id).all()

    latest_reviews = {}
    for r in all_reviews:
        if r.sample_id not in latest_reviews or r.version > latest_reviews[r.sample_id].version:
            latest_reviews[r.sample_id] = r

    reviews = list(latest_reviews.values())

    total = len(reviews)
    normal = sum(1 for r in reviews if r.conclusion == '正常')
    abnormal = sum(1 for r in reviews if r.conclusion == '异常')
    low_quality = sum(1 for r in reviews if r.low_quality_reads_passed is not None)
    neg_control = sum(1 for r in reviews if r.is_negative_control)
    neg_control_abnormal = sum(1 for r in reviews if r.is_negative_control and r.negative_control_abnormal)

    species_dist = {}
    growth_dist = {}

    for r in reviews:
        sample = SeaweedSample.query.filter_by(sample_id=r.sample_id).first()
        if sample:
            species_dist[sample.species] = species_dist.get(sample.species, 0) + 1
            growth_dist[sample.initial_growth_stage] = growth_dist.get(sample.initial_growth_stage, 0) + 1

    stats = BatchStatistics.query.filter_by(batch_id=batch_id).first()
    if not stats:
        stats = BatchStatistics(batch_id=batch_id)
        db.session.add(stats)

    stats.total_samples = total
    stats.normal_count = normal
    stats.abnormal_count = abnormal
    stats.low_quality_count = low_quality
    stats.negative_control_count = neg_control
    stats.negative_control_abnormal_count = neg_control_abnormal
    stats.species_distribution = species_dist
    stats.growth_stage_distribution = growth_dist
    stats.calculated_at = datetime.utcnow()
    stats.calculated_by = calculated_by

    db.session.commit()
    return stats


@app.route('/api/samples', methods=['POST'])
def create_sample():
    data = request.json
    sample = SeaweedSample(
        sample_id=data['sample_id'],
        collection_site=data.get('collection_site'),
        collection_date=date.fromisoformat(data['collection_date']) if data.get('collection_date') else None,
        species=data.get('species'),
        initial_growth_stage=data.get('initial_growth_stage')
    )
    db.session.add(sample)
    db.session.commit()
    return jsonify({'sample_id': sample.sample_id}), 201


@app.route('/api/samples', methods=['GET'])
def list_samples():
    samples = SeaweedSample.query.all()
    return jsonify([{
        'sample_id': s.sample_id,
        'collection_site': s.collection_site,
        'species': s.species,
        'initial_growth_stage': s.initial_growth_stage
    } for s in samples])


@app.route('/api/batches', methods=['POST'])
def create_batch():
    data = request.json
    batch = ReviewBatch(
        batch_id=data['batch_id'],
        reagent_lot=data['reagent_lot'],
        microscope_batch=data['microscope_batch'],
        created_by=data['created_by'],
        description=data.get('description')
    )
    db.session.add(batch)
    db.session.commit()
    return jsonify({'batch_id': batch.batch_id}), 201


@app.route('/api/batches/<batch_id>', methods=['GET'])
def get_batch(batch_id):
    batch = ReviewBatch.query.filter_by(batch_id=batch_id).first()
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    stats = BatchStatistics.query.filter_by(batch_id=batch_id).first()
    annotations = ImageAnnotation.query.filter_by(batch_id=batch_id).all()
    reviews = ReviewOpinion.query.filter_by(batch_id=batch_id).all()
    low_quality = LowQualityRead.query.filter_by(batch_id=batch_id).all()

    return jsonify({
        'batch_id': batch.batch_id,
        'reagent_lot': batch.reagent_lot,
        'microscope_batch': batch.microscope_batch,
        'created_by': batch.created_by,
        'created_at': batch.created_at.isoformat(),
        'description': batch.description,
        'statistics': {
            'total_samples': stats.total_samples if stats else 0,
            'normal_count': stats.normal_count if stats else 0,
            'abnormal_count': stats.abnormal_count if stats else 0,
            'low_quality_count': stats.low_quality_count if stats else 0,
            'negative_control_count': stats.negative_control_count if stats else 0,
            'negative_control_abnormal_count': stats.negative_control_abnormal_count if stats else 0,
            'species_distribution': stats.species_distribution if stats else {},
            'growth_stage_distribution': stats.growth_stage_distribution if stats else {},
        } if stats else None,
        'reviews_count': len(reviews),
        'annotations_count': len(annotations),
        'low_quality_reads_count': len(low_quality),
    })


@app.route('/api/reviews/import', methods=['POST'])
def import_reviews():
    data = request.json
    batch_id = data['batch_id']
    reviews_data = data['reviews']
    created_by = data.get('created_by', 'system')

    batch = ReviewBatch.query.filter_by(batch_id=batch_id).first()
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    imported = []
    for item in reviews_data:
        sample = SeaweedSample.query.filter_by(sample_id=item['sample_id']).first()
        if not sample:
            sample = SeaweedSample(
                sample_id=item['sample_id'],
                species=item.get('species'),
                collection_site=item.get('collection_site'),
                initial_growth_stage=item.get('initial_growth_stage')
            )
            db.session.add(sample)

        review = ReviewOpinion(
            sample_id=item['sample_id'],
            batch_id=batch_id,
            reviewer=item['reviewer'],
            opinion=item['opinion'],
            conclusion=item['conclusion'],
            is_negative_control=item.get('is_negative_control', False),
            negative_control_abnormal=item.get('negative_control_abnormal'),
            low_quality_reads_passed=item.get('low_quality_reads_passed'),
            change_reason=item.get('change_reason', '初始导入')
        )
        db.session.add(review)
        db.session.flush()

        audit = AuditTrail(
            review_id=review.id,
            action='CREATE',
            new_value={
                'opinion': item['opinion'],
                'conclusion': item['conclusion'],
                'low_quality_reads_passed': item.get('low_quality_reads_passed')
            },
            changed_by=created_by,
            change_reason=item.get('change_reason', '初始导入')
        )
        db.session.add(audit)

        if 'low_quality_reads' in item:
            for lq_item in item['low_quality_reads']:
                lq = LowQualityRead(
                    batch_id=batch_id,
                    sample_id=item['sample_id'],
                    review_id=review.id,
                    read_id=lq_item['read_id'],
                    quality_score=lq_item.get('quality_score'),
                    reason=lq_item.get('reason'),
                    passed_review=item.get('low_quality_reads_passed'),
                    reviewed_by=item['reviewer'],
                    reviewed_at=datetime.utcnow()
                )
                db.session.add(lq)

        imported.append({'sample_id': item['sample_id'], 'review_id': review.id})

    db.session.commit()
    calculate_batch_statistics(batch_id, created_by)

    return jsonify({
        'batch_id': batch_id,
        'imported_count': len(imported),
        'reviews': imported
    }), 201


@app.route('/api/reviews/<int:review_id>', methods=['PUT'])
def update_review(review_id):
    data = request.json
    old_review = ReviewOpinion.query.get(review_id)
    if not old_review:
        return jsonify({'error': 'Review not found'}), 404

    new_review = ReviewOpinion(
        sample_id=old_review.sample_id,
        batch_id=old_review.batch_id,
        reviewer=data['reviewer'],
        opinion=data['opinion'],
        conclusion=data['conclusion'],
        is_negative_control=data.get('is_negative_control', old_review.is_negative_control),
        negative_control_abnormal=data.get('negative_control_abnormal', old_review.negative_control_abnormal),
        low_quality_reads_passed=data.get('low_quality_reads_passed', old_review.low_quality_reads_passed),
        change_reason=data.get('change_reason', '修改复核意见'),
        previous_version_id=old_review.id,
        version=old_review.version + 1
    )
    db.session.add(new_review)
    db.session.flush()

    old_value = {
        'opinion': old_review.opinion,
        'conclusion': old_review.conclusion,
        'low_quality_reads_passed': old_review.low_quality_reads_passed,
        'negative_control_abnormal': old_review.negative_control_abnormal
    }
    new_value = {
        'opinion': data['opinion'],
        'conclusion': data['conclusion'],
        'low_quality_reads_passed': data.get('low_quality_reads_passed', old_review.low_quality_reads_passed),
        'negative_control_abnormal': data.get('negative_control_abnormal', old_review.negative_control_abnormal)
    }

    audit = AuditTrail(
        review_id=new_review.id,
        action='UPDATE',
        old_value=old_value,
        new_value=new_value,
        changed_by=data['reviewer'],
        change_reason=data.get('change_reason', '修改复核意见')
    )
    db.session.add(audit)

    if new_review.low_quality_reads_passed is not None:
        LowQualityRead.query.filter_by(review_id=old_review.id).update({
            'passed_review': new_review.low_quality_reads_passed,
            'reviewed_by': data['reviewer'],
            'reviewed_at': datetime.utcnow()
        })

    db.session.commit()
    calculate_batch_statistics(old_review.batch_id, data['reviewer'])

    return jsonify(serialize_review_with_history(new_review))


@app.route('/api/reviews/<int:review_id>', methods=['GET'])
def get_review(review_id):
    review = ReviewOpinion.query.get(review_id)
    if not review:
        return jsonify({'error': 'Review not found'}), 404
    return jsonify(serialize_review_with_history(review))


@app.route('/api/reviews/history/<sample_id>', methods=['GET'])
def get_review_history(sample_id):
    reviews = ReviewOpinion.query.filter_by(sample_id=sample_id).order_by(ReviewOpinion.version).all()
    return jsonify([serialize_review_with_history(r) for r in reviews])


@app.route('/api/annotations', methods=['POST'])
def create_annotation():
    data = request.json
    annotation = ImageAnnotation(
        sample_id=data['sample_id'],
        batch_id=data['batch_id'],
        image_path=data['image_path'],
        annotation_data=data['annotation_data'],
        annotated_by=data['annotated_by'],
        boundary_confidence=data.get('boundary_confidence'),
        boundary_note=data.get('boundary_note')
    )
    db.session.add(annotation)
    db.session.commit()
    return jsonify({'id': annotation.id}), 201


@app.route('/api/annotations/batch/<batch_id>', methods=['GET'])
def get_annotations_by_batch(batch_id):
    annotations = ImageAnnotation.query.filter_by(batch_id=batch_id).all()
    return jsonify([{
        'id': a.id,
        'sample_id': a.sample_id,
        'batch_id': a.batch_id,
        'image_path': a.image_path,
        'boundary_confidence': a.boundary_confidence,
        'boundary_note': a.boundary_note,
        'annotated_by': a.annotated_by,
        'created_at': a.created_at.isoformat()
    } for a in annotations])


@app.route('/api/negative-control/review', methods=['POST'])
def review_negative_control():
    data = request.json
    batch_id = data['batch_id']
    threshold = data.get('growth_threshold', 10)

    reviews = ReviewOpinion.query.filter_by(
        batch_id=batch_id,
        is_negative_control=True
    ).all()

    results = []
    for review in reviews:
        sample = SeaweedSample.query.filter_by(sample_id=review.sample_id).first()

        if sample and sample.initial_growth_stage:
            try:
                growth_value = float(sample.initial_growth_stage)
                is_abnormal = growth_value > threshold
            except (ValueError, TypeError):
                is_abnormal = data.get('manual_abnormal', {}).get(review.sample_id, False)
        else:
            is_abnormal = data.get('manual_abnormal', {}).get(review.sample_id, False)

        if review.negative_control_abnormal != is_abnormal:
            review.negative_control_abnormal = is_abnormal
            review.conclusion = '异常' if is_abnormal else '正常'

            audit = AuditTrail(
                review_id=review.id,
                action='NEGATIVE_CONTROL_CHECK',
                old_value={'negative_control_abnormal': not is_abnormal},
                new_value={'negative_control_abnormal': is_abnormal},
                changed_by=data.get('reviewer', 'system'),
                change_reason=f"阴性对照自动复核：生长值{'超过' if is_abnormal else '未超过'}阈值 {threshold}"
            )
            db.session.add(audit)

        results.append({
            'sample_id': review.sample_id,
            'is_abnormal': is_abnormal,
            'conclusion': review.conclusion
        })

    db.session.commit()
    calculate_batch_statistics(batch_id, data.get('reviewer', 'system'))

    return jsonify({
        'batch_id': batch_id,
        'threshold': threshold,
        'results': results,
        'abnormal_count': sum(1 for r in results if r['is_abnormal'])
    })


@app.route('/api/anomaly/trace/<sample_id>', methods=['GET'])
def trace_anomaly(sample_id):
    reviews = ReviewOpinion.query.filter_by(sample_id=sample_id).order_by(ReviewOpinion.version.desc()).all()
    if not reviews:
        return jsonify({'error': 'Sample not found'}), 404

    latest = reviews[0]
    sample = SeaweedSample.query.filter_by(sample_id=sample_id).first()
    annotations = ImageAnnotation.query.filter_by(sample_id=sample_id).all()
    low_quality = LowQualityRead.query.filter_by(sample_id=sample_id).all()

    trace = {
        'sample': {
            'sample_id': sample.sample_id,
            'species': sample.species,
            'collection_site': sample.collection_site,
            'initial_growth_stage': sample.initial_growth_stage
        } if sample else None,
        'latest_review': serialize_review_with_history(latest),
        'review_history': [serialize_review_with_history(r) for r in reviews],
        'annotations': [{
            'id': a.id,
            'batch_id': a.batch_id,
            'image_path': a.image_path,
            'boundary_confidence': a.boundary_confidence,
            'boundary_note': a.boundary_note,
            'annotated_by': a.annotated_by
        } for a in annotations],
        'low_quality_reads': [{
            'read_id': lq.read_id,
            'batch_id': lq.batch_id,
            'quality_score': lq.quality_score,
            'reason': lq.reason,
            'passed_review': lq.passed_review,
            'reviewed_by': lq.reviewed_by,
            'reviewed_at': lq.reviewed_at.isoformat() if lq.reviewed_at else None
        } for lq in low_quality],
        'audit_trail': []
    }

    for r in reviews:
        for a in r.audit_trail:
            trace['audit_trail'].append({
                'review_id': r.id,
                'version': r.version,
                'action': a.action,
                'old_value': a.old_value,
                'new_value': a.new_value,
                'changed_by': a.changed_by,
                'change_reason': a.change_reason,
                'timestamp': a.timestamp.isoformat() if a.timestamp else None
            })

    trace['audit_trail'].sort(key=lambda x: x['timestamp'], reverse=True)

    return jsonify(trace)


@app.route('/api/export/report/<batch_id>', methods=['GET'])
def export_report(batch_id):
    format_type = request.args.get('format', 'json')
    batch = ReviewBatch.query.filter_by(batch_id=batch_id).first()
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    stats = BatchStatistics.query.filter_by(batch_id=batch_id).first()
    reviews = ReviewOpinion.query.filter_by(batch_id=batch_id).order_by(ReviewOpinion.sample_id, ReviewOpinion.version).all()
    annotations = ImageAnnotation.query.filter_by(batch_id=batch_id).all()
    low_quality = LowQualityRead.query.filter_by(batch_id=batch_id).all()

    latest_reviews = {}
    for r in reviews:
        if r.sample_id not in latest_reviews or r.version > latest_reviews[r.sample_id].version:
            latest_reviews[r.sample_id] = r

    plain_text_summary = f"""
海藻样本生长记录 - 批次 {batch_id} 复核说明
==========================================
【基本信息】
- 试剂批号: {batch.reagent_lot}
- 显微照片批次: {batch.microscope_batch}
- 创建人: {batch.created_by}
- 创建时间: {batch.created_at.strftime('%Y-%m-%d %H:%M:%S') if batch.created_at else ''}

【统计概览】
- 总样本数: {stats.total_samples if stats else 0}
- 正常: {stats.normal_count if stats else 0}
- 异常: {stats.abnormal_count if stats else 0}
- 阴性对照: {stats.negative_control_count if stats else 0} (其中异常: {stats.negative_control_abnormal_count if stats else 0})
- 低质量读段复核: {stats.low_quality_count if stats else 0} 条

【复核意见说明】
本次复核针对 {len(latest_reviews)} 个海藻样本的生长记录进行了系统性评估。所有样本均使用
试剂批号 {batch.reagent_lot} 处理，显微照片来自批次 {batch.microscope_batch}。

在复核过程中，发现 {stats.abnormal_count if stats else 0} 个样本存在生长异常情况，
{stats.negative_control_abnormal_count if stats else 0} 个阴性对照样本超出正常生长阈值。
对于低质量读段，我们逐一进行了人工复核，确保数据的准确性和可靠性。

【重要说明】
1. 所有复核意见均已记录完整的修改历史，可追溯到具体修改人、修改时间和修改原因
2. 图像标注与分组统计使用同一批处理记录，确保数据一致性
3. 阴性对照样本已进行专门的异常复核，超过阈值的已标记为异常
4. 低质量读段的复核结果已关联到对应样本的复核意见中

【后续建议】
- 对于标记为"异常"的样本，建议结合显微照片进行进一步确认
- 对于低质量读段通过复核的样本，请参考历史记录中的修改原因
- 阴性对照异常样本需特别关注，排查实验操作是否存在污染
"""

    if format_type == 'json':
        report = {
            'batch_info': {
                'batch_id': batch.batch_id,
                'reagent_lot': batch.reagent_lot,
                'microscope_batch': batch.microscope_batch,
                'created_by': batch.created_by,
                'created_at': batch.created_at.isoformat() if batch.created_at else None,
                'description': batch.description
            },
            'statistics': {
                'total_samples': stats.total_samples if stats else 0,
                'normal_count': stats.normal_count if stats else 0,
                'abnormal_count': stats.abnormal_count if stats else 0,
                'low_quality_count': stats.low_quality_count if stats else 0,
                'negative_control_count': stats.negative_control_count if stats else 0,
                'negative_control_abnormal_count': stats.negative_control_abnormal_count if stats else 0,
                'species_distribution': stats.species_distribution if stats else {},
                'growth_stage_distribution': stats.growth_stage_distribution if stats else {},
            },
            'plain_text_summary': plain_text_summary.strip(),
            'reviews': [{
                'sample_id': r.sample_id,
                'version': r.version,
                'reviewer': r.reviewer,
                'opinion': r.opinion,
                'conclusion': r.conclusion,
                'is_negative_control': r.is_negative_control,
                'negative_control_abnormal': r.negative_control_abnormal,
                'low_quality_reads_passed': r.low_quality_reads_passed,
                'change_reason': r.change_reason,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'previous_version': {
                    'conclusion': r.previous_version.conclusion,
                    'opinion': r.previous_version.opinion,
                    'reviewer': r.previous_version.reviewer
                } if r.previous_version else None
            } for r in reviews],
            'annotations_count': len(annotations),
            'low_quality_reads_count': len(low_quality)
        }
        return jsonify(report)

    elif format_type == 'txt':
        output = plain_text_summary.strip()
        output += "\n\n【详细复核记录】\n"
        output += "=" * 50 + "\n"

        for sample_id, review in sorted(latest_reviews.items()):
            output += f"\n样本编号: {sample_id}\n"
            output += f"  结论: {review.conclusion}\n"
            output += f"  复核人: {review.reviewer}\n"
            output += f"  复核意见: {review.opinion}\n"
            if review.is_negative_control:
                output += f"  阴性对照: 是 (异常: {review.negative_control_abnormal})\n"
            if review.low_quality_reads_passed is not None:
                output += f"  低质量读段: {'通过' if review.low_quality_reads_passed else '未通过'}\n"
            if review.previous_version:
                output += f"  历史版本对比:\n"
                output += f"    旧结论: {review.previous_version.conclusion}\n"
                output += f"    新结论: {review.conclusion}\n"
                output += f"    修改原因: {review.change_reason}\n"
            output += "-" * 30 + "\n"

        return output, 200, {'Content-Type': 'text/plain; charset=utf-8'}

    elif format_type == 'excel':
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            pd.DataFrame([{
                '批次号': batch.batch_id,
                '试剂批号': batch.reagent_lot,
                '显微照片批次': batch.microscope_batch,
                '创建人': batch.created_by,
                '创建时间': batch.created_at.strftime('%Y-%m-%d %H:%M:%S') if batch.created_at else ''
            }]).to_excel(writer, sheet_name='批次信息', index=False)

            if stats:
                pd.DataFrame([{
                    '总样本数': stats.total_samples,
                    '正常': stats.normal_count,
                    '异常': stats.abnormal_count,
                    '低质量读段复核数': stats.low_quality_count,
                    '阴性对照数': stats.negative_control_count,
                    '阴性对照异常数': stats.negative_control_abnormal_count
                }]).to_excel(writer, sheet_name='统计概览', index=False)

            reviews_df = pd.DataFrame([{
                '样本编号': r.sample_id,
                '版本': r.version,
                '复核人': r.reviewer,
                '复核意见': r.opinion,
                '结论': r.conclusion,
                '是否阴性对照': '是' if r.is_negative_control else '否',
                '阴性对照异常': '是' if r.negative_control_abnormal else '否',
                '低质量读段通过': '是' if r.low_quality_reads_passed else ('否' if r.low_quality_reads_passed is False else ''),
                '修改原因': r.change_reason or '',
                '旧结论': r.previous_version.conclusion if r.previous_version else '',
                '旧意见': r.previous_version.opinion if r.previous_version else '',
                '复核时间': r.created_at.strftime('%Y-%m-%d %H:%M:%S') if r.created_at else ''
            } for r in reviews])
            reviews_df.to_excel(writer, sheet_name='复核记录', index=False)

            if low_quality:
                lq_df = pd.DataFrame([{
                    '样本编号': lq.sample_id,
                    '读段ID': lq.read_id,
                    '质量分数': lq.quality_score,
                    '原因': lq.reason,
                    '复核通过': '是' if lq.passed_review else ('否' if lq.passed_review is False else ''),
                    '复核人': lq.reviewed_by or '',
                    '复核时间': lq.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if lq.reviewed_at else ''
                } for lq in low_quality])
                lq_df.to_excel(writer, sheet_name='低质量读段', index=False)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'seaweed_report_{batch_id}.xlsx'
        )

    else:
        return jsonify({'error': 'Unsupported format'}), 400


@app.route('/api/reviews/compare/<int:review_id>', methods=['GET'])
def compare_review_versions(review_id):
    new_review = ReviewOpinion.query.get(review_id)
    if not new_review or not new_review.previous_version:
        return jsonify({'error': 'Review or previous version not found'}), 404

    old_review = new_review.previous_version

    changed_fields = []
    for field in ['opinion', 'conclusion', 'low_quality_reads_passed', 'negative_control_abnormal']:
        old_val = getattr(old_review, field)
        new_val = getattr(new_review, field)
        if old_val != new_val:
            changed_fields.append({
                'field': field,
                'old_value': old_val,
                'new_value': new_val
            })

    return jsonify({
        'side_by_side': {
            'old': {
                'version': old_review.version,
                'reviewer': old_review.reviewer,
                'opinion': old_review.opinion,
                'conclusion': old_review.conclusion,
                'low_quality_reads_passed': old_review.low_quality_reads_passed,
                'negative_control_abnormal': old_review.negative_control_abnormal,
                'created_at': old_review.created_at.isoformat() if old_review.created_at else None
            },
            'new': {
                'version': new_review.version,
                'reviewer': new_review.reviewer,
                'opinion': new_review.opinion,
                'conclusion': new_review.conclusion,
                'low_quality_reads_passed': new_review.low_quality_reads_passed,
                'negative_control_abnormal': new_review.negative_control_abnormal,
                'created_at': new_review.created_at.isoformat() if new_review.created_at else None,
                'change_reason': new_review.change_reason
            }
        },
        'changed_fields': changed_fields,
        'impact_summary': f"版本 {old_review.version} -> {new_review.version}，共 {len(changed_fields)} 处变更，"
                          f"结论从 '{old_review.conclusion}' 改为 '{new_review.conclusion}'。"
    })


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
