from flask import Blueprint, request, jsonify, Response
from app import db
from app.models.models import (
    Sample,
    SampleVersion,
    EvaluationBank,
    DiagnosisResult,
    SecurityRule,
    SAMPLE_STATUS,
)
from app.services import (
    DeduplicationService,
    DiagnosisService,
    VersionService,
    CorrectionService,
    MetricsService,
    ExportService,
    handle_diagnosis_error,
)

bp = Blueprint('api', __name__)


@bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': '对话多轮遗忘诊断'})


@bp.route('/batches', methods=['GET'])
@handle_diagnosis_error
def list_batches():
    limit = request.args.get('limit', 100, type=int)
    batches = DeduplicationService.list_batches(limit=limit)
    return jsonify(batches)


@bp.route('/batches/<batch_id>', methods=['GET'])
@handle_diagnosis_error
def get_batch(batch_id):
    info = DeduplicationService.get_batch_info(batch_id)
    if not info:
        return jsonify({'error': '批次不存在'}), 404
    return jsonify(info)


@bp.route('/samples/import', methods=['POST'])
@handle_diagnosis_error
def import_samples():
    data = request.get_json()
    batch_name = data.get('batch_name')
    samples = data.get('samples', [])
    created_by = data.get('created_by', 'api_user')

    if not batch_name:
        return jsonify({'error': '缺少批次名称'}), 400

    result = DeduplicationService.import_samples(
        samples_data=samples,
        batch_name=batch_name,
        created_by=created_by
    )
    return jsonify(result)


@bp.route('/samples/<sample_id>', methods=['GET'])
@handle_diagnosis_error
def get_sample(sample_id):
    sample = Sample.query.get_or_404(int(sample_id))
    return jsonify(sample.to_dict())


@bp.route('/samples', methods=['GET'])
@handle_diagnosis_error
def list_samples():
    batch_id = request.args.get('batch_id')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Sample.query
    if batch_id:
        query = query.filter_by(batch_id=batch_id)
    if status:
        status_values = [s.strip() for s in status.split(',')]
        status_enums = []
        for sv in status_values:
            if hasattr(SAMPLE_STATUS, sv):
                status_enums.append(getattr(SAMPLE_STATUS, sv))
        if status_enums:
            query = query.filter(Sample.status.in_(status_enums))

    pagination = query.order_by(Sample.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'items': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    })


@bp.route('/evaluation-bank/import', methods=['POST'])
@handle_diagnosis_error
def import_evaluation_bank():
    data = request.get_json()
    bank_name = data.get('bank_name')
    questions = data.get('questions', [])
    import_batch_id = data.get('import_batch_id')
    imported_by = data.get('imported_by', 'api_user')

    if not bank_name:
        return jsonify({'error': '缺少题库名称'}), 400

    result = DeduplicationService.import_evaluation_bank(
        questions_data=questions,
        bank_name=bank_name,
        import_batch_id=import_batch_id,
        imported_by=imported_by
    )
    return jsonify(result)


@bp.route('/deduplication/check', methods=['GET'])
@handle_diagnosis_error
def check_duplicates():
    batch_id = request.args.get('batch_id')
    threshold = request.args.get('threshold', 0.95, type=float)
    duplicates = DeduplicationService.find_duplicates(
        batch_id=batch_id,
        threshold=threshold
    )
    return jsonify({
        'total': len(duplicates),
        'duplicates': duplicates,
    })


@bp.route('/diagnosis/samples/<sample_id>', methods=['POST'])
@handle_diagnosis_error
def diagnose_sample(sample_id):
    result = DiagnosisService.diagnose_sample(int(sample_id))
    return jsonify(result.to_dict())


@bp.route('/diagnosis/batches/<batch_id>', methods=['POST'])
@handle_diagnosis_error
def diagnose_batch(batch_id):
    result = DiagnosisService.diagnose_batch(batch_id)
    return jsonify(result)


@bp.route('/diagnosis/samples/<sample_id>/latest', methods=['GET'])
@handle_diagnosis_error
def get_latest_diagnosis(sample_id):
    result = DiagnosisService.get_latest_diagnosis(sample_id=int(sample_id))
    if not result:
        return jsonify({'diagnosis': None, 'sample_id': int(sample_id)})
    return jsonify(result.to_dict())


@bp.route('/diagnosis/samples/<sample_id>/history', methods=['GET'])
@handle_diagnosis_error
def get_diagnosis_history(sample_id):
    limit = request.args.get('limit', 20, type=int)
    results = DiagnosisService.get_diagnosis_history(
        target_type='sample',
        target_id=int(sample_id),
        limit=limit
    )
    return jsonify([r.to_dict() for r in results])


@bp.route('/samples/<sample_id>/versions', methods=['GET'])
@handle_diagnosis_error
def list_sample_versions(sample_id):
    limit = request.args.get('limit', 20, type=int)
    versions = VersionService.list_versions(int(sample_id), limit=limit)
    return jsonify([v.to_dict() for v in versions])


@bp.route('/samples/<sample_id>/versions/<version_number>', methods=['GET'])
@handle_diagnosis_error
def get_sample_version(sample_id, version_number):
    version = VersionService.get_version(int(sample_id), int(version_number))
    if not version:
        return jsonify({'error': '版本不存在'}), 404
    return jsonify(version.to_dict())


@bp.route('/samples/<sample_id>/versions', methods=['POST'])
@handle_diagnosis_error
def create_version(sample_id):
    data = request.get_json()
    new_content = data.get('content')
    change_reason = data.get('change_reason', '')
    changed_by = data.get('changed_by', 'api_user')

    if not new_content:
        return jsonify({'error': '缺少新版本内容'}), 400

    version = VersionService.create_version(
        sample_id=int(sample_id),
        new_content=new_content,
        change_reason=change_reason,
        changed_by=changed_by
    )
    db.session.commit()
    return jsonify(version.to_dict())


@bp.route('/samples/<sample_id>/versions/compare', methods=['GET'])
@handle_diagnosis_error
def compare_versions(sample_id):
    version_a = request.args.get('version_a', type=int)
    version_b = request.args.get('version_b', type=int)

    if not version_a or not version_b:
        return jsonify({'error': '请指定两个版本号'}), 400

    diff = VersionService.compare_versions(int(sample_id), version_a, version_b)
    return jsonify(diff)


@bp.route('/corrections', methods=['POST'])
@handle_diagnosis_error
def create_correction():
    data = request.get_json()
    sample_id = data.get('sample_id')
    correction_type = data.get('correction_type')
    old_value = data.get('old_value')
    new_value = data.get('new_value')
    correction_reason = data.get('correction_reason', '')
    corrected_by = data.get('corrected_by', 'api_user')
    diagnosis_result_id = data.get('diagnosis_result_id')

    if not sample_id or not correction_type:
        return jsonify({'error': '缺少必要参数'}), 400

    correction = CorrectionService.create_correction(
        sample_id=int(sample_id),
        correction_type=correction_type,
        old_value=old_value,
        new_value=new_value,
        correction_reason=correction_reason,
        corrected_by=corrected_by,
        diagnosis_result_id=diagnosis_result_id,
    )
    db.session.commit()
    return jsonify(correction.to_dict())


@bp.route('/corrections/override-diagnosis', methods=['POST'])
@handle_diagnosis_error
def override_diagnosis():
    data = request.get_json()
    sample_id = data.get('sample_id')
    new_status = data.get('new_status')
    reason = data.get('reason', '')
    overridden_by = data.get('overridden_by', 'api_user')

    if not sample_id or not new_status:
        return jsonify({'error': '缺少必要参数'}), 400

    correction = CorrectionService.override_diagnosis(
        sample_id=int(sample_id),
        new_status=new_status,
        reason=reason,
        overridden_by=overridden_by,
    )
    db.session.commit()
    return jsonify(correction.to_dict())


@bp.route('/corrections', methods=['GET'])
@handle_diagnosis_error
def list_corrections():
    sample_id = request.args.get('sample_id', type=int)
    correction_type = request.args.get('correction_type')
    corrected_by = request.args.get('corrected_by')
    limit = request.args.get('limit', 100, type=int)

    corrections = CorrectionService.list_corrections(
        sample_id=sample_id,
        correction_type=correction_type,
        corrected_by=corrected_by,
        limit=limit,
    )
    return jsonify([c.to_dict() for c in corrections])


@bp.route('/corrections/stats', methods=['GET'])
@handle_diagnosis_error
def get_correction_stats():
    sample_id = request.args.get('sample_id', type=int)
    batch_id = request.args.get('batch_id')

    stats = CorrectionService.get_correction_stats(
        sample_id=sample_id,
        batch_id=batch_id,
    )
    return jsonify(stats)


@bp.route('/metrics/batches/<batch_id>', methods=['POST'])
@handle_diagnosis_error
def calculate_batch_metrics(batch_id):
    metrics = MetricsService.calculate_batch_metrics(batch_id)
    return jsonify([m.to_dict() for m in metrics])


@bp.route('/metrics/batches/<batch_id>', methods=['GET'])
@handle_diagnosis_error
def get_batch_metrics(batch_id):
    metric_names = request.args.getlist('metric_name')
    metrics = MetricsService.get_batch_metrics(
        batch_id=batch_id,
        metric_names=metric_names if metric_names else None
    )
    return jsonify(metrics)


@bp.route('/metrics/compare', methods=['POST'])
@handle_diagnosis_error
def compare_batches():
    data = request.get_json()
    batch_a_id = data.get('batch_a_id')
    batch_b_id = data.get('batch_b_id')
    metric_name = data.get('metric_name', 'sample_status_ratio')
    group_key = data.get('group_key')
    created_by = data.get('created_by', 'api_user')

    if not batch_a_id or not batch_b_id:
        return jsonify({'error': '请指定两个批次ID'}), 400

    comparisons = MetricsService.compare_batches(
        batch_a_id=batch_a_id,
        batch_b_id=batch_b_id,
        metric_name=metric_name,
        group_key=group_key,
        created_by=created_by,
    )
    return jsonify([c.to_dict() for c in comparisons])


@bp.route('/metrics/comparisons', methods=['GET'])
@handle_diagnosis_error
def list_comparisons():
    batch_a_id = request.args.get('batch_a_id')
    batch_b_id = request.args.get('batch_b_id')
    is_significant = request.args.get('is_significant', type=lambda v: v.lower() == 'true')
    limit = request.args.get('limit', 100, type=int)

    comparisons = MetricsService.get_comparisons(
        batch_a_id=batch_a_id,
        batch_b_id=batch_b_id,
        is_significant=is_significant,
        limit=limit,
    )
    return jsonify([c.to_dict() for c in comparisons])


@bp.route('/export/samples', methods=['GET'])
@handle_diagnosis_error
def export_samples():
    batch_id = request.args.get('batch_id')
    sample_ids = request.args.getlist('sample_id', type=int)
    status_filter = request.args.getlist('status')
    format = request.args.get('format', 'csv')
    include_content = request.args.get('include_content', 'true').lower() == 'true'

    filename, output, mimetype = ExportService.export_samples(
        batch_id=batch_id,
        sample_ids=sample_ids if sample_ids else None,
        status_filter=status_filter if status_filter else None,
        format=format,
        include_content=include_content,
    )

    return Response(
        output.getvalue().encode('utf-8-sig') if 'csv' in mimetype else output.getvalue(),
        mimetype=mimetype,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@bp.route('/export/report/<batch_id>', methods=['GET'])
@handle_diagnosis_error
def export_report(batch_id):
    format = request.args.get('format', 'csv')
    filename, output, mimetype = ExportService.export_diagnosis_report(
        batch_id=batch_id,
        format=format,
    )
    return Response(
        output.getvalue().encode('utf-8-sig') if 'csv' in mimetype else output.getvalue(),
        mimetype=mimetype,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@bp.route('/export/corrections', methods=['GET'])
@handle_diagnosis_error
def export_corrections():
    batch_id = request.args.get('batch_id')
    format = request.args.get('format', 'csv')
    filename, output, mimetype = ExportService.export_corrections(
        batch_id=batch_id,
        format=format,
    )
    return Response(
        output.getvalue().encode('utf-8-sig') if 'csv' in mimetype else output.getvalue(),
        mimetype=mimetype,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@bp.route('/summary/batches/<batch_id>', methods=['GET'])
@handle_diagnosis_error
def get_batch_summary(batch_id):
    summary = ExportService.get_diagnosis_summary_for_ui(batch_id)
    return jsonify(summary)


@bp.route('/security-rules', methods=['GET'])
@handle_diagnosis_error
def list_security_rules():
    rules = SecurityRule.query.all()
    return jsonify([r.to_dict() for r in rules])


@bp.route('/security-rules', methods=['POST'])
@handle_diagnosis_error
def create_security_rule():
    data = request.get_json()
    rule_code = data.get('rule_code')
    rule_name = data.get('rule_name')
    description = data.get('description', '')
    severity = data.get('severity', 'medium')
    is_active = data.get('is_active', True)

    if not rule_code or not rule_name:
        return jsonify({'error': '缺少规则编码或名称'}), 400

    existing = SecurityRule.query.filter_by(rule_code=rule_code).first()
    if existing:
        return jsonify({'error': '规则编码已存在'}), 400

    rule = SecurityRule(
        rule_code=rule_code,
        rule_name=rule_name,
        description=description,
        is_active=is_active,
        severity=severity,
    )
    db.session.add(rule)
    db.session.commit()
    return jsonify(rule.to_dict()), 201


@bp.route('/security-rules/<rule_id>', methods=['PUT'])
@handle_diagnosis_error
def update_security_rule(rule_id):
    rule = SecurityRule.query.get_or_404(int(rule_id))
    data = request.get_json()

    if 'rule_name' in data:
        rule.rule_name = data['rule_name']
    if 'description' in data:
        rule.description = data['description']
    if 'severity' in data:
        rule.severity = data['severity']
    if 'is_active' in data:
        rule.is_active = data['is_active']

    db.session.commit()
    return jsonify(rule.to_dict())
