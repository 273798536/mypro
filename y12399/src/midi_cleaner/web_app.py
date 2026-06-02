"""Web界面 - Flask应用"""

import os
import sys
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, abort

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from midi_cleaner.midi_parser import MidiParser
from midi_cleaner.velocity_cleaner import VelocityCleaner
from midi_cleaner.measure_align import MeasureAlignChecker
from midi_cleaner.version_tracker import VersionTracker
from midi_cleaner.data_store import (
    JsonDataStore, FileRelationship, CorrectionRecord
)
from midi_cleaner.report_generator import ReportGenerator
from midi_cleaner.manual_correction import ManualCorrector


def create_app(data_dir: str = None):
    """创建Flask应用"""
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), '..', '..', 'templates'),
        static_folder=os.path.join(os.path.dirname(__file__), '..', '..', 'static')
    )

    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')

    data_store = JsonDataStore(base_dir=os.path.abspath(data_dir))
    corrector = ManualCorrector(data_store)

    @app.route('/')
    def index():
        """首页 - 会话列表"""
        sessions = data_store.get_all_sessions()
        sessions_sorted = sorted(sessions, key=lambda s: s.get('cleaned_at', ''), reverse=True)
        return render_template('index.html', sessions=sessions_sorted)

    @app.route('/session/<session_id>')
    def session_detail(session_id):
        """会话详情页"""
        session = data_store.get_session(session_id)
        if not session:
            abort(404, description="会话不存在")

        cleaned_data = data_store.load_cleaned_data(session_id)
        velocity_curve = data_store.load_velocity_curve(session_id)
        relationship = session.get('relationships', {})
        file_hash = session.get('midi_file_hash', '')
        correction_history = data_store.load_correction_history(file_hash)

        report_path = relationship.get('report_markdown_file', '')
        report_content = ''
        if report_path and os.path.exists(report_path):
            with open(report_path, 'r', encoding='utf-8') as f:
                report_content = f.read()

        context = {
            'session': session,
            'cleaned_data': cleaned_data or {},
            'velocity_curve': velocity_curve or {},
            'relationship': relationship,
            'correction_history': correction_history,
            'report_content': report_content,
            'has_corrections': correction_history is not None and len(correction_history.corrections) > 0
        }

        return render_template('session_detail.html', **context)

    @app.route('/session/<session_id>/anomalies')
    def anomalies_view(session_id):
        """异常列表页"""
        session = data_store.get_session(session_id)
        if not session:
            abort(404, description="会话不存在")

        cleaned_data = data_store.load_cleaned_data(session_id)
        anomalies = cleaned_data.get('anomalies', []) if cleaned_data else []

        category = request.args.get('category', 'all')
        severity = request.args.get('severity', 'all')

        spike_types = {'out_of_range', 'sudden_change', 'local_outlier'}
        stat_types = {'z_score_outlier', 'iqr_outlier'}

        filtered = []
        for a in anomalies:
            if severity != 'all' and a.get('severity') != severity:
                continue

            a_type = a.get('type', '')
            if category == 'spikes' and a_type not in spike_types:
                continue
            elif category == 'statistical' and a_type not in stat_types:
                continue
            elif category == 'measure' and a_type != 'individual_note':
                continue
            elif category == 'systematic' and a_type != 'systematic_offset':
                continue

            filtered.append(a)

        context = {
            'session_id': session_id,
            'session': session,
            'anomalies': filtered,
            'category': category,
            'severity': severity,
            'total_count': len(filtered)
        }

        return render_template('anomalies.html', **context)

    @app.route('/session/<session_id>/bad-rows')
    def bad_rows_view(session_id):
        """坏行列表页"""
        session = data_store.get_session(session_id)
        if not session:
            abort(404, description="会话不存在")

        cleaned_data = data_store.load_cleaned_data(session_id)
        bad_rows = cleaned_data.get('bad_rows', []) if cleaned_data else []

        bad_type = request.args.get('type', None)
        if bad_type:
            bad_rows = [r for r in bad_rows if r.get('type') == bad_type]

        from collections import defaultdict
        grouped = defaultdict(list)
        for row in bad_rows:
            grouped[row.get('type', 'unknown')].append(row)

        context = {
            'session_id': session_id,
            'session': session,
            'bad_rows_grouped': dict(grouped),
            'bad_type': bad_type,
            'total_count': len(bad_rows)
        }

        return render_template('bad_rows.html', **context)

    @app.route('/session/<session_id>/correct', methods=['GET', 'POST'])
    def correct_view(session_id):
        """手动修正页"""
        session = data_store.get_session(session_id)
        if not session:
            abort(404, description="会话不存在")

        if request.method == 'POST':
            data = request.get_json()
            note_id = int(data.get('note_id'))
            new_velocity = int(data.get('new_velocity'))
            reason = data.get('reason', 'Web界面修正')
            corrected_by = data.get('corrected_by', 'web_user')
            anomaly_id = data.get('anomaly_id')

            midi_file = session['midi_file_path']
            source_version = session['source_version']
            track_version = session['track_version']

            parser = MidiParser(source_version=source_version, track_version=track_version)
            parsed_midi = parser.parse_file(midi_file)

            velocity_cleaner = VelocityCleaner()
            cleaned_data = velocity_cleaner.clean(parsed_midi)

            file_hash = parsed_midi.metadata.file_hash
            correction_history = data_store.load_correction_history(file_hash)

            if correction_history:
                for corr in correction_history.corrections:
                    for note in parsed_midi.notes:
                        if note.note_id == corr.note_id:
                            note.velocity = corr.new_velocity
                            note.is_manually_corrected = True
                            note.original_velocity = corr.old_velocity
                            note.correction_reason = corr.reason
                            break
                    for note in cleaned_data.cleaned_notes:
                        if note.note_id == corr.note_id:
                            note.velocity = corr.new_velocity
                            note.is_manually_corrected = True
                            note.original_velocity = corr.old_velocity
                            note.correction_reason = corr.reason
                            break

            try:
                new_parsed, new_cleaned, correction = corrector.apply_correction(
                    parsed_midi, cleaned_data, note_id, new_velocity,
                    reason, corrected_by, anomaly_id
                )
            except ValueError as e:
                return jsonify({'success': False, 'error': str(e)}), 400

            align_checker = MeasureAlignChecker()
            alignment_result = align_checker.check_alignment(new_parsed)

            version_tracker = VersionTracker()
            version_result = version_tracker.check_versions([new_parsed])

            saved_files = data_store.save_cleaned_data(
                new_cleaned, alignment_result, version_result, session_id
            )

            correction_history = data_store.load_correction_history(file_hash)
            has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

            data_store.update_session_correction_status(
                session_id,
                has_manual_corrections=has_manual_corrections,
                statistics_modified=new_cleaned.statistics.is_manually_modified,
                modified_fields=new_cleaned.statistics.modified_fields
            )

            report_gen = ReportGenerator()
            now = datetime.now().isoformat()
            relationship = FileRelationship(
                midi_file=midi_file,
                midi_hash=file_hash,
                cleaned_data_file=saved_files.get("velocity_data", ""),
                velocity_curve_file=saved_files.get("velocity_curve", ""),
                report_json_file="",
                report_markdown_file="",
                correction_history_file=os.path.join(
                    data_store.base_dir, 'cleaned', f"{file_hash}_corrections.json"
                ),
                created_at=now,
                updated_at=now
            )

            report = report_gen.generate_report(
                new_parsed, new_cleaned, alignment_result, version_result,
                session_id, relationship, correction_history
            )

            report_dict = report_gen.to_json(report)
            report_md = report_gen.to_markdown(report)
            report_files = data_store.save_reports(report_dict, report_md, session_id)

            return jsonify({
                'success': True,
                'correction': {
                    'correction_id': correction.correction_id,
                    'note_id': correction.note_id,
                    'old_velocity': correction.old_velocity,
                    'new_velocity': correction.new_velocity,
                    'velocity_change': correction.new_velocity - correction.old_velocity,
                    'reason': correction.reason,
                    'corrected_by': correction.corrected_by,
                    'corrected_at': correction.corrected_at
                }
            })

        cleaned_data = data_store.load_cleaned_data(session_id)
        notes = cleaned_data.get('cleaned_notes', []) if cleaned_data else []

        note_id = request.args.get('note_id', type=int)
        selected_note = None
        if note_id is not None:
            for note in notes:
                if note['note_id'] == note_id:
                    selected_note = note
                    break

        anomaly_id = request.args.get('anomaly_id')
        selected_anomaly = None
        if anomaly_id and cleaned_data:
            for anomaly in cleaned_data.get('anomalies', []):
                if anomaly.get('anomaly_id') == anomaly_id:
                    selected_anomaly = anomaly
                    if note_id is None:
                        note_id = anomaly.get('note_id')
                        for note in notes:
                            if note['note_id'] == note_id:
                                selected_note = note
                                break
                    break

        context = {
            'session_id': session_id,
            'session': session,
            'notes': notes,
            'selected_note': selected_note,
            'selected_anomaly': selected_anomaly,
            'note_id': note_id,
            'anomaly_id': anomaly_id
        }

        return render_template('correct.html', **context)

    @app.route('/session/<session_id>/compare')
    def compare_view(session_id):
        """新旧结果对比页"""
        session = data_store.get_session(session_id)
        if not session:
            abort(404, description="会话不存在")

        midi_file = session['midi_file_path']
        source_version = session['source_version']
        track_version = session['track_version']
        file_hash = session['midi_file_hash']

        parser = MidiParser(source_version=source_version, track_version=track_version)
        original_parsed = parser.parse_file(midi_file)

        velocity_cleaner = VelocityCleaner()
        original_cleaned = velocity_cleaner.clean(original_parsed)

        correction_history = data_store.load_correction_history(file_hash)

        modified_parsed = parser.parse_file(midi_file)
        if correction_history:
            for corr in correction_history.corrections:
                for note in modified_parsed.notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        note.is_manually_corrected = True
                        note.original_velocity = corr.old_velocity
                        note.correction_reason = corr.reason
                        break

        modified_cleaned = velocity_cleaner.clean(modified_parsed)

        comparison = corrector.compare_versions(original_cleaned, modified_cleaned, correction_history)

        original_curve = data_store.load_velocity_curve(session_id) or {}

        curve_data = corrector.generate_side_by_side_html(
            comparison, original_curve, {}, session_id
        )

        context = {
            'session_id': session_id,
            'session': session,
            'comparison': comparison,
            'curve_data': json.loads(curve_data),
            'correction_history': correction_history,
            'has_corrections': correction_history is not None and len(correction_history.corrections) > 0
        }

        return render_template('compare.html', **context)

    @app.route('/api/session/<session_id>/notes')
    def api_notes(session_id):
        """API: 获取音符列表"""
        cleaned_data = data_store.load_cleaned_data(session_id)
        if not cleaned_data:
            return jsonify({'error': '会话不存在'}), 404

        notes = cleaned_data.get('cleaned_notes', [])

        track = request.args.get('track', type=int)
        measure = request.args.get('measure', type=int)

        if track is not None:
            notes = [n for n in notes if n.get('track') == track]
        if measure is not None:
            notes = [n for n in notes if n.get('measure') == measure]

        return jsonify({
            'success': True,
            'count': len(notes),
            'notes': notes
        })

    @app.route('/api/session/<session_id>/velocity-curve')
    def api_velocity_curve(session_id):
        """API: 获取力度曲线数据"""
        curve_data = data_store.load_velocity_curve(session_id)
        if not curve_data:
            return jsonify({'error': '会话不存在'}), 404

        return jsonify({
            'success': True,
            'curve': curve_data
        })

    @app.route('/api/session/<session_id>/corrections', methods=['POST'])
    def api_batch_correct(session_id):
        """API: 批量修正"""
        session = data_store.get_session(session_id)
        if not session:
            return jsonify({'error': '会话不存在'}), 404

        data = request.get_json()
        corrections = data.get('corrections', [])
        corrected_by = data.get('corrected_by', 'web_user')

        if not corrections:
            return jsonify({'error': '没有提供修正数据'}), 400

        midi_file = session['midi_file_path']
        source_version = session['source_version']
        track_version = session['track_version']

        parser = MidiParser(source_version=source_version, track_version=track_version)
        parsed_midi = parser.parse_file(midi_file)

        velocity_cleaner = VelocityCleaner()
        cleaned_data = velocity_cleaner.clean(parsed_midi)

        file_hash = parsed_midi.metadata.file_hash
        correction_history = data_store.load_correction_history(file_hash)

        if correction_history:
            for corr in correction_history.corrections:
                for note in parsed_midi.notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        note.is_manually_corrected = True
                        note.original_velocity = corr.old_velocity
                        note.correction_reason = corr.reason
                        break
                for note in cleaned_data.cleaned_notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        note.is_manually_corrected = True
                        note.original_velocity = corr.old_velocity
                        note.correction_reason = corr.reason
                        break

        try:
            new_parsed, new_cleaned, records = corrector.batch_correct(
                parsed_midi, cleaned_data, corrections, corrected_by
            )
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400

        align_checker = MeasureAlignChecker()
        alignment_result = align_checker.check_alignment(new_parsed)

        version_tracker = VersionTracker()
        version_result = version_tracker.check_versions([new_parsed])

        saved_files = data_store.save_cleaned_data(
            new_cleaned, alignment_result, version_result, session_id
        )

        correction_history = data_store.load_correction_history(file_hash)
        has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

        data_store.update_session_correction_status(
            session_id,
            has_manual_corrections=has_manual_corrections,
            statistics_modified=new_cleaned.statistics.is_manually_modified,
            modified_fields=new_cleaned.statistics.modified_fields
        )

        report_gen = ReportGenerator()
        now = datetime.now().isoformat()
        relationship = FileRelationship(
            midi_file=midi_file,
            midi_hash=file_hash,
            cleaned_data_file=saved_files.get("velocity_data", ""),
            velocity_curve_file=saved_files.get("velocity_curve", ""),
            report_json_file="",
            report_markdown_file="",
            correction_history_file=os.path.join(
                data_store.base_dir, 'cleaned', f"{file_hash}_corrections.json"
            ),
            created_at=now,
            updated_at=now
        )

        report = report_gen.generate_report(
            new_parsed, new_cleaned, alignment_result, version_result,
            session_id, relationship, correction_history
        )

        report_dict = report_gen.to_json(report)
        report_md = report_gen.to_markdown(report)
        report_files = data_store.save_reports(report_dict, report_md, session_id)

        return jsonify({
            'success': True,
            'corrections_count': len(records),
            'records': [
                {
                    'correction_id': r.correction_id,
                    'note_id': r.note_id,
                    'old_velocity': r.old_velocity,
                    'new_velocity': r.new_velocity
                }
                for r in records
            ]
        })

    @app.route('/api/session/<session_id>/report', methods=['POST'])
    def api_regenerate_report(session_id):
        """API: 重新生成报告"""
        session = data_store.get_session(session_id)
        if not session:
            return jsonify({'error': '会话不存在'}), 404

        midi_file = session['midi_file_path']
        source_version = session['source_version']
        track_version = session['track_version']

        parser = MidiParser(source_version=source_version, track_version=track_version)
        parsed_midi = parser.parse_file(midi_file)

        velocity_cleaner = VelocityCleaner()
        cleaned_data = velocity_cleaner.clean(parsed_midi)

        file_hash = parsed_midi.metadata.file_hash
        correction_history = data_store.load_correction_history(file_hash)

        if correction_history:
            for corr in correction_history.corrections:
                for note in parsed_midi.notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        note.is_manually_corrected = True
                        note.original_velocity = corr.old_velocity
                        note.correction_reason = corr.reason
                        break
                for note in cleaned_data.cleaned_notes:
                    if note.note_id == corr.note_id:
                        note.velocity = corr.new_velocity
                        note.is_manually_corrected = True
                        note.original_velocity = corr.old_velocity
                        note.correction_reason = corr.reason
                        break

        align_checker = MeasureAlignChecker()
        alignment_result = align_checker.check_alignment(parsed_midi)

        version_tracker = VersionTracker()
        version_result = version_tracker.check_versions([parsed_midi])

        cleaned_data = velocity_cleaner.clean(parsed_midi)

        saved_files = data_store.save_cleaned_data(
            cleaned_data, alignment_result, version_result, session_id
        )

        report_gen = ReportGenerator()
        now = datetime.now().isoformat()
        relationship = FileRelationship(
            midi_file=midi_file,
            midi_hash=file_hash,
            cleaned_data_file=saved_files.get("velocity_data", ""),
            velocity_curve_file=saved_files.get("velocity_curve", ""),
            report_json_file="",
            report_markdown_file="",
            correction_history_file=os.path.join(
                data_store.base_dir, 'cleaned', f"{file_hash}_corrections.json"
            ),
            created_at=now,
            updated_at=now
        )

        report = report_gen.generate_report(
            parsed_midi, cleaned_data, alignment_result, version_result,
            session_id, relationship, correction_history
        )

        report_dict = report_gen.to_json(report)
        report_md = report_gen.to_markdown(report)
        report_files = data_store.save_reports(report_dict, report_md, session_id)

        return jsonify({
            'success': True,
            'report_json': report_files['report_json'],
            'report_markdown': report_files['report_markdown']
        })

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
