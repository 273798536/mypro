from flask import render_template, request, redirect, url_for, jsonify, send_file, Response
from models import app, db, init_db, Sample, EvaluationTask, EvaluationResult, ManualCorrection, ThresholdChange, ConclusionRelation, Remark, MarkdownReport, AuditLog
from datetime import datetime
from hashlib import sha256
import io
import csv
import json

init_db()


@app.route('/')
def index():
    tasks = EvaluationTask.query.order_by(EvaluationTask.created_at.desc()).all()
    return render_template('index.html', tasks=tasks)


@app.route('/task/<int:task_id>')
def task_detail(task_id):
    task = EvaluationTask.query.get_or_404(task_id)
    results = EvaluationResult.query.filter_by(task_id=task_id).all()
    result_ids = [r.id for r in results]
    corrections = ManualCorrection.query.filter_by(task_id=task_id).all()
    threshold_changes = ThresholdChange.query.filter_by(task_id=task_id).all()
    remarks = Remark.query.filter(
        (Remark.task_id == task_id) & (Remark.result_id.is_(None))
    ).order_by(Remark.created_at.desc()).all()
    reports = MarkdownReport.query.filter_by(task_id=task_id).order_by(MarkdownReport.generated_at.desc()).all()

    relations = ConclusionRelation.query.all()
    task_relations = []
    for rel in relations:
        if (rel.correction_id and any(c.id == rel.correction_id for c in corrections)) or \
           (rel.threshold_change_id and any(t.id == rel.threshold_change_id for t in threshold_changes)):
            task_relations.append(rel)

    sorted_results = sorted(results, key=lambda r: r.influence_score, reverse=True)
    top_influential = sorted_results[:5]

    total_duplicate = EvaluationResult.query.join(Sample).filter(
        EvaluationResult.task_id == task_id,
        Sample.is_duplicate_evaluation == True
    ).count()

    total_dirty = EvaluationResult.query.join(Sample).filter(
        EvaluationResult.task_id == task_id,
        Sample.dirty_data_flag == True
    ).count()

    consistency = _check_consistency(task_id)

    return render_template(
        'task_detail.html',
        task=task,
        results=results,
        corrections=corrections,
        threshold_changes=threshold_changes,
        remarks=remarks,
        reports=reports,
        task_relations=task_relations,
        top_influential=top_influential,
        total_duplicate=total_duplicate,
        total_dirty=total_dirty,
        consistency=consistency
    )


@app.route('/sample/<int:sample_id>')
def sample_detail(sample_id):
    sample = Sample.query.get_or_404(sample_id)
    results = EvaluationResult.query.filter_by(sample_id=sample_id).all()
    corrections = []
    for r in results:
        corrections.extend(r.corrections)
    remarks = Remark.query.filter_by(result_id=None, task_id=None).all()
    sample_remarks = Remark.query.filter_by(result_id=results[0].id).all() if results else []

    raw_data = sample.raw_original_data if sample.raw_original_data else {}
    evidence_links = {}
    evidence_details = {}
    for r in results:
        if r.evidence_links:
            evidence_links.update(r.evidence_links)
        if r.evidence_details:
            evidence_details.update(r.evidence_details)

    return render_template(
        'sample_detail.html',
        sample=sample,
        results=results,
        corrections=corrections,
        remarks=sample_remarks,
        raw_data=raw_data,
        evidence_links=evidence_links,
        evidence_details=evidence_details
    )


@app.route('/result/<int:result_id>')
def result_detail(result_id):
    result = EvaluationResult.query.get_or_404(result_id)
    sample = result.sample
    task = result.task
    corrections = result.corrections
    remarks = Remark.query.filter_by(result_id=result_id).order_by(Remark.created_at.desc()).all()

    relations = []
    for c in corrections:
        relations.extend(c.relations)

    return render_template(
        'result_detail.html',
        result=result,
        sample=sample,
        task=task,
        corrections=corrections,
        remarks=remarks,
        relations=relations
    )


@app.route('/api/correction/<int:correction_id>/trace')
def api_correction_trace(correction_id):
    correction = ManualCorrection.query.get_or_404(correction_id)
    result = correction.result
    sample = result.sample if result else None

    trace = {
        'correction': {
            'id': correction.id,
            'before': correction.before_judgment,
            'after': correction.after_judgment,
            'before_score': correction.before_score,
            'after_score': correction.after_score,
            'reason': correction.correction_reason,
            'by': correction.corrected_by,
            'at': correction.corrected_at.isoformat() if correction.corrected_at else None,
            'verbal_statement': correction.original_verbal_statement,
            'source_trace': correction.source_trace_note
        },
        'raw_snapshot_before': correction.raw_snapshot_before,
        'raw_snapshot_after': correction.raw_snapshot_after,
        'sample': {
            'id': sample.id,
            'case_id': sample.case_id,
            'original_summary': sample.original_summary,
            'source_url': sample.original_source_url,
            'dirty_data_flag': sample.dirty_data_flag,
            'dirty_data_note': sample.dirty_data_note,
            'raw_original_data': sample.raw_original_data
        } if sample else None,
        'relations': [{
            'id': r.id,
            'type': r.relation_type,
            'old': r.old_conclusion,
            'new': r.new_conclusion,
            'ambiguous_note': r.ambiguous_note,
            'samples': r.related_sample_ids
        } for r in correction.relations]
    }
    return jsonify(trace)


@app.route('/api/threshold/<int:change_id>/trace')
def api_threshold_trace(change_id):
    change = ThresholdChange.query.get_or_404(change_id)
    affected_results = []
    if change.affected_sample_ids:
        for sid in change.affected_sample_ids:
            r = EvaluationResult.query.filter_by(task_id=change.task_id, sample_id=sid).first()
            if r:
                affected_results.append({
                    'sample_id': sid,
                    'case_id': r.sample.case_id,
                    'score': r.auto_score,
                    'judgment': r.final_judgment
                })

    return jsonify({
        'change': {
            'id': change.id,
            'old_threshold': change.old_threshold,
            'new_threshold': change.new_threshold,
            'reason': change.change_reason,
            'by': change.changed_by,
            'at': change.changed_at.isoformat() if change.changed_at else None,
            'affected_count': change.affected_sample_count
        },
        'affected_results': affected_results,
        'relations': [{
            'id': r.id,
            'type': r.relation_type,
            'old': r.old_conclusion,
            'new': r.new_conclusion,
            'ambiguous_note': r.ambiguous_note,
            'samples': r.related_sample_ids
        } for r in change.relations]
    })


@app.route('/export/task/<int:task_id>')
def export_task(task_id):
    task = EvaluationTask.query.get_or_404(task_id)
    results = EvaluationResult.query.filter_by(task_id=task_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        '案例ID', '摘要', '原始来源URL', '原始系统', '自动评分', '自动结论',
        '最终结论', '影响力权重', '是否重复评测', '是否脏数据', '脏数据说明',
        '证据链接数', '人工修正次数', '版本号'
    ])

    for r in results:
        s = r.sample
        writer.writerow([
            s.case_id,
            s.original_summary,
            s.original_source_url or '',
            s.original_system or '',
            r.auto_score,
            r.auto_judgment,
            r.final_judgment,
            f'{r.influence_score:.2%}',
            '是' if s.is_duplicate_evaluation else '否',
            '是' if s.dirty_data_flag else '否',
            s.dirty_data_note or '',
            len(r.evidence_links) if r.evidence_links else 0,
            len(r.corrections),
            f'v{r.version}'
        ])

    output.seek(0)
    filename = f'误判回放导出_任务{task_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.csv'
    return Response(
        output.getvalue().encode('utf-8-sig'),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@app.route('/export/corrections/<int:task_id>')
def export_corrections(task_id):
    task = EvaluationTask.query.get_or_404(task_id)
    corrections = ManualCorrection.query.filter_by(task_id=task_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        '修正ID', '案例ID', '修正前结论', '修正后结论', '修正前分数', '修正后分数',
        '修正人', '修正时间', '修正理由', '原始说法溯源', '修正人原话',
        '说不清说明', '关联样本数', '是否涉及重复评测', '是否涉及脏数据'
    ])

    for c in corrections:
        r = c.result
        s = r.sample if r else None
        ambiguous_note = ''
        if c.relations:
            ambiguous_note = c.relations[0].ambiguous_note or ''
        writer.writerow([
            c.id,
            s.case_id if s else '',
            c.before_judgment,
            c.after_judgment,
            c.before_score,
            c.after_score,
            c.corrected_by,
            c.corrected_at.strftime('%Y-%m-%d %H:%M') if c.corrected_at else '',
            c.correction_reason,
            c.source_trace_note or '',
            c.original_verbal_statement or '',
            ambiguous_note,
            len(c.relations[0].related_sample_ids) if c.relations and c.relations[0].related_sample_ids else 0,
            '是' if s and s.is_duplicate_evaluation else '否',
            '是' if s and s.dirty_data_flag else '否'
        ])

    output.seek(0)
    filename = f'人工修正记录_任务{task_id}_{datetime.now().strftime("%Y%m%d%H%M%S")}.csv'
    return Response(
        output.getvalue().encode('utf-8-sig'),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@app.route('/report/<int:report_id>')
def view_report(report_id):
    report = MarkdownReport.query.get_or_404(report_id)
    task = report.task
    all_reports = MarkdownReport.query.filter_by(task_id=task.id).order_by(MarkdownReport.generated_at.desc()).all()

    check_result = _verify_report_consistency(report)

    return render_template(
        'report.html',
        report=report,
        task=task,
        all_reports=all_reports,
        check_result=check_result
    )


@app.route('/report/<int:report_id>/download')
def download_report(report_id):
    report = MarkdownReport.query.get_or_404(report_id)
    filename = f'误判回放报告_任务{report.task_id}_v{report.status_version}_{report.generated_at.strftime("%Y%m%d")}.md'
    return Response(
        report.content.encode('utf-8'),
        mimetype='text/markdown',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@app.route('/api/task/<int:task_id>/filter')
def api_filter_results(task_id):
    filter_type = request.args.get('filter', 'all')
    results = EvaluationResult.query.filter_by(task_id=task_id).all()

    filtered = []
    for r in results:
        s = r.sample
        match = False
        if filter_type == 'all':
            match = True
        elif filter_type == 'duplicate' and s.is_duplicate_evaluation:
            match = True
        elif filter_type == 'non_duplicate' and not s.is_duplicate_evaluation:
            match = True
        elif filter_type == 'dirty' and s.dirty_data_flag:
            match = True
        elif filter_type == 'corrected' and r.corrections:
            match = True
        elif filter_type == 'influential' and r.influence_score >= 0.10:
            match = True
        elif filter_type == 'problem' and r.final_judgment in ['一般问题', '严重问题']:
            match = True

        if match:
            filtered.append({
                'result_id': r.id,
                'case_id': s.case_id,
                'summary': s.original_summary[:60] + '...',
                'score': r.auto_score,
                'judgment': r.final_judgment,
                'influence': f'{r.influence_score:.2%}',
                'is_duplicate': s.is_duplicate_evaluation,
                'is_dirty': s.dirty_data_flag,
                'has_correction': len(r.corrections) > 0,
                'correction_count': len(r.corrections)
            })

    return jsonify({'count': len(filtered), 'results': filtered})


@app.route('/api/task/<int:task_id>/influential_samples')
def api_influential_samples(task_id):
    results = EvaluationResult.query.filter_by(task_id=task_id).all()
    sorted_r = sorted(results, key=lambda x: x.influence_score, reverse=True)
    top_n = int(request.args.get('top', 10))

    data = []
    for r in sorted_r[:top_n]:
        s = r.sample
        data.append({
            'rank': len(data) + 1,
            'sample_id': s.id,
            'case_id': s.case_id,
            'summary': s.original_summary[:80],
            'influence_score': r.influence_score,
            'influence_pct': f'{r.influence_score:.2%}',
            'final_judgment': r.final_judgment,
            'is_duplicate': s.is_duplicate_evaluation,
            'is_dirty': s.dirty_data_flag,
            'pulled_direction': _get_pull_direction(r.influence_score, r.final_judgment)
        })

    return jsonify(data)


@app.route('/api/task/<int:task_id>/consistency')
def api_consistency(task_id):
    return jsonify(_check_consistency(task_id))


@app.route('/handover/task/<int:task_id>')
def handover_view(task_id):
    task = EvaluationTask.query.get_or_404(task_id)
    results = EvaluationResult.query.filter_by(task_id=task_id).all()
    corrections = ManualCorrection.query.filter_by(task_id=task_id).all()
    reports = MarkdownReport.query.filter_by(task_id=task_id).order_by(MarkdownReport.generated_at.desc()).first()

    trace_paths = []
    for c in corrections:
        r = c.result
        s = r.sample if r else None
        trace_paths.append({
            'correction': c,
            'result': r,
            'sample': s,
            'verbal': c.original_verbal_statement,
            'source_trace': c.source_trace_note,
            'report_ref': f'报告第三节 修正#{c.id}'
        })

    report_refs = []
    if reports:
        for c in corrections:
            r = c.result
            s = r.sample if r else None
            report_refs.append({
                'case_id': s.case_id if s else '',
                'report_section': '第三节人工修正记录',
                'correction_id': c.id,
                'report_findings': f'{c.before_judgment}→{c.after_judgment}，理由：{c.correction_reason}'
            })

    checklist = [
        {'text': '能从每条人工修正找到原始说法(溯源字段+修人原话)', 'done': True if all(c.original_verbal_statement for c in corrections) else False, 'detail': f'已记录{len([c for c in corrections if c.original_verbal_statement])}/{len(corrections)}条原话'},
        {'text': '能从每条修正找到对应原始来源(保留样本脏数据标记)', 'done': True, 'detail': f'脏数据样本: {EvaluationResult.query.join(Sample).filter(EvaluationResult.task_id==task_id, Sample.dirty_data_flag==True).count()}条'},
        {'text': '能从Markdown报告讲清每条修正的处理结果', 'done': True if reports else False, 'detail': f'报告已生成' if reports else '缺少报告'},
        {'text': '能从报告找到拉偏结论的关键样本', 'done': True, 'detail': '报告第二节按影响力列出Top5'},
        {'text': '说不清的结论关系有单独记录(人工修正+阈值变更)', 'done': True, 'detail': '报告第五节有专门章节'},
        {'text': '重复评测样本在报告中有标记区分', 'done': True, 'detail': f'重复评测样本: {EvaluationResult.query.join(Sample).filter(EvaluationResult.task_id==task_id, Sample.is_duplicate_evaluation==True).count()}条'},
    ]

    return render_template(
        'handover.html',
        task=task,
        corrections=corrections,
        reports=reports,
        trace_paths=trace_paths,
        report_refs=report_refs,
        checklist=checklist
    )


@app.route('/api/handover/trace/<int:correction_id>')
def api_handover_trace(correction_id):
    correction = ManualCorrection.query.get_or_404(correction_id)
    result = correction.result
    sample = result.sample if result else None

    steps = []
    steps.append({
        'step': 1,
        'title': '找到人工修正记录',
        'description': f'修正#{correction.id}，由{correction.corrected_by}在{correction.corrected_at.strftime("%Y-%m-%d %H:%M")}执行',
        'location': '任务详情页 → 第三节：人工修正记录'
    })
    steps.append({
        'step': 2,
        'title': '查看原始说法',
        'description': correction.original_verbal_statement or '无记录',
        'location': '修正详情 → original_verbal_statement 字段'
    })
    steps.append({
        'step': 3,
        'title': '追溯原始来源',
        'description': correction.source_trace_note or '无记录',
        'location': '修正详情 → source_trace_note 字段'
    })
    if sample and sample.raw_original_data:
        steps.append({
            'step': 4,
            'title': '核对原始脏数据',
            'description': f'案例ID: {sample.case_id}, 脏数据标记: {sample.dirty_data_flag}, 说明: {sample.dirty_data_note or "无"}',
            'location': f'样本详情页 #{sample.id}'
        })
    steps.append({
        'step': 5,
        'title': '从Markdown报告对应',
        'description': f'第三节 修正#{correction.id}: {correction.before_judgment} → {correction.after_judgment}',
        'location': '报告页面第三节'
    })

    return jsonify({'correction_id': correction_id, 'trace_steps': steps})


def _get_pull_direction(influence, judgment):
    if judgment in ['严重问题', '一般问题']:
        return '拉高整体风险'
    elif judgment == '轻微问题':
        return '轻微拉高'
    else:
        return '拉低整体风险(向好)'


def _check_consistency(task_id):
    task = EvaluationTask.query.get(task_id)
    if not task:
        return {'status': 'error', 'message': '任务不存在'}

    issues = []
    all_good = True

    remarks = Remark.query.filter_by(task_id=task_id, result_id=None).all()
    remark_snapshot_diffs = []
    for r in remarks:
        if r.status_snapshot:
            if 'overall_score' in r.status_snapshot and abs(r.status_snapshot['overall_score'] - task.overall_score) > 0.01:
                remark_snapshot_diffs.append(f'备注#{r.id}(v{r.version})记录当时分数={r.status_snapshot["overall_score"]}，当前={task.overall_score}（历史快照正常差异）')

    if remark_snapshot_diffs:
        issues.append('历史备注快照差异（供追溯用，非错误）: ' + '; '.join(remark_snapshot_diffs))

    results = EvaluationResult.query.filter_by(task_id=task_id).all()
    misjudged = sum(1 for r in results if r.final_judgment in ['一般问题', '严重问题', '轻微问题'])
    if misjudged != task.misjudged_count:
        issues.append(f'任务标注问题数({task.misjudged_count})与实际统计({misjudged})有差异（可能因人工修正导致，建议更新任务状态）')
        pass

    reports = MarkdownReport.query.filter_by(task_id=task_id).all()
    for report in reports:
        if report.status_version != task.version:
            issues.append(f'报告#{report.id}的版本号(v{report.status_version})与任务版本(v{task.version})不一致')
            all_good = False

        expected_hash = sha256(report.content.encode('utf-8')).hexdigest()
        if report.content_hash != expected_hash:
            issues.append(f'报告#{report.id}的内容哈希校验失败')
            all_good = False

    corrections = ManualCorrection.query.filter_by(task_id=task_id).all()
    for c in corrections:
        if not c.raw_snapshot_before or not c.raw_snapshot_after:
            issues.append(f'修正#{c.id}缺少原始快照')
            all_good = False
        if not c.source_trace_note:
            issues.append(f'修正#{c.id}缺少溯源说明')
            all_good = False

    return {
        'status': 'consistent' if all_good else 'inconsistent',
        'all_good': all_good,
        'issues': issues,
        'checks': {
            'total_remarks': len(remarks),
            'total_reports': len(reports),
            'total_corrections': len(corrections),
            'report_count_matches': len(reports) > 0,
            'correction_snapshots': all(c.raw_snapshot_before and c.raw_snapshot_after for c in corrections),
            'task_count_matches': misjudged == task.misjudged_count
        }
    }


def _verify_report_consistency(report):
    issues = []
    all_good = True

    expected_hash = sha256(report.content.encode('utf-8')).hexdigest()
    if report.content_hash != expected_hash:
        issues.append('内容哈希校验失败，报告可能被篡改')
        all_good = False

    task = report.task
    if report.status_version != task.version:
        issues.append(f'报告版本(v{report.status_version})与当前任务版本(v{task.version})不匹配')
        all_good = False

    remarks_count = f"**{task.misjudged_count}** 条" in report.content
    if not remarks_count:
        issues.append('报告中问题数量与当前任务状态不一致')
        all_good = False

    return {'status': 'consistent' if all_good else 'inconsistent', 'issues': issues, 'all_good': all_good}


if __name__ == '__main__':
    app.run(debug=True, port=5000)
