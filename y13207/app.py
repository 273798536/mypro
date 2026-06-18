import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from config import Config
from models import db, STATUS_LABELS, STATUS_COLORS
from file_service import (
    create_session, get_session_list, get_session_detail,
    save_uploaded_file, process_uploaded_file, delete_session,
)
from matcher import run_matching
from report_generator import generate_report, save_report_to_file


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['REPORT_FOLDER'], exist_ok=True)
    data_dir = os.path.join(app.root_path, 'data')
    os.makedirs(data_dir, exist_ok=True)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        sessions = get_session_list()
        return render_template('index.html', sessions=sessions)

    @app.route('/session/new', methods=['GET', 'POST'])
    def new_session():
        if request.method == 'POST':
            name = request.form.get('name', '').strip()
            description = request.form.get('description', '').strip()
            if not name:
                flash('请输入归档名称', 'danger')
                return redirect(url_for('new_session'))
            session = create_session(name, description)
            flash('归档创建成功，请上传文件', 'success')
            return redirect(url_for('session_detail', session_id=session.id))
        return render_template('new_session.html')

    @app.route('/session/<int:session_id>')
    def session_detail(session_id):
        data = get_session_detail(session_id)
        if not data:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))
        return render_template('session_detail.html', session=data,
                               status_labels=STATUS_LABELS,
                               status_colors=STATUS_COLORS)

    @app.route('/session/<int:session_id>/upload', methods=['POST'])
    def upload_file(session_id):
        data = get_session_detail(session_id)
        if not data:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))

        if 'files' not in request.files:
            flash('没有选择文件', 'danger')
            return redirect(url_for('session_detail', session_id=session_id))

        files = request.files.getlist('files')
        data_category = request.form.get('category', 'auto')
        is_old_version = request.form.get('is_old_version') == 'on'

        uploaded_count = 0
        for f in files:
            if f.filename == '':
                continue
            uploaded_file, error = save_uploaded_file(
                f, session_id, app.config['UPLOAD_FOLDER']
            )
            if error:
                flash(f'上传失败：{error}', 'danger')
                continue

            category = None if data_category == 'auto' else data_category
            row_count, err = process_uploaded_file(
                uploaded_file, category, is_old_version
            )
            if err:
                flash(f'解析失败：{err}', 'danger')
            else:
                uploaded_count += 1
                flash(f'已上传 {uploaded_file.filename}（{row_count} 条记录）', 'success')

        if uploaded_count > 0:
            flash(f'共上传 {uploaded_count} 个文件', 'info')

        return redirect(url_for('session_detail', session_id=session_id))

    @app.route('/session/<int:session_id>/process')
    def process_session(session_id):
        from models import ArchiveSession
        session = ArchiveSession.query.get(session_id)
        if not session:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))

        results = run_matching(session)
        generate_report(session)

        flash(f'处理完成，共生成 {len(results)} 条匹配结果', 'success')
        return redirect(url_for('session_detail', session_id=session_id))

    @app.route('/session/<int:session_id>/report')
    def view_report(session_id):
        data = get_session_detail(session_id)
        if not data:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))

        from models import ArchiveSession
        session = ArchiveSession.query.get(session_id)
        if not session.report_content:
            generate_report(session)

        return render_template('report.html', session=data,
                               report_content=session.report_content)

    @app.route('/session/<int:session_id>/report/download')
    def download_report(session_id):
        from models import ArchiveSession
        session = ArchiveSession.query.get(session_id)
        if not session:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))

        file_path = save_report_to_file(session, app.config['REPORT_FOLDER'])
        filename = os.path.basename(file_path)
        safe_name = session.name.replace('/', '_').replace(' ', '_')
        return send_from_directory(
            app.config['REPORT_FOLDER'], filename,
            as_attachment=True, download_name=f'{safe_name}_报告.md'
        )

    @app.route('/session/<int:session_id>/export/csv')
    def export_csv(session_id):
        import csv
        from io import StringIO
        from flask import Response
        from models import ArchiveSession, MatchResult, ChannelRow, TrackRow, TimecodeEntry

        session = ArchiveSession.query.get(session_id)
        if not session:
            flash('归档不存在', 'danger')
            return redirect(url_for('index'))

        results = MatchResult.query.filter_by(session_id=session.id).all()

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', '状态', '状态标签', '结论', '来源', '时码差(秒)',
                         '匹配置信度', '通道名称', '曲目名称', '条目名称', '备注'])

        for r in results:
            channel_name = ''
            track_name = ''
            entry_name = ''
            if r.channel_row_id:
                ch = db.session.get(ChannelRow, r.channel_row_id)
                if ch:
                    channel_name = ch.channel_name
                    track_name = ch.track_name
            if r.track_row_id and not track_name:
                tr = db.session.get(TrackRow, r.track_row_id)
                if tr:
                    track_name = tr.track_name
            if r.timecode_entry_id:
                te = db.session.get(TimecodeEntry, r.timecode_entry_id)
                if te:
                    entry_name = te.entry_name

            from models import STATUS_LABELS
            writer.writerow([
                r.id,
                r.status,
                STATUS_LABELS.get(r.status, r.status),
                r.conclusion,
                r.sources,
                f'{r.time_diff_seconds:.3f}' if r.time_diff_seconds else '',
                f'{r.match_confidence:.2f}' if r.match_confidence else '',
                channel_name,
                track_name,
                entry_name,
                r.notes or '',
            ])

        safe_name = session.name.replace('/', '_').replace(' ', '_')
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv; charset=utf-8-sig',
            headers={
                'Content-Disposition': f'attachment; filename="{safe_name}_匹配结果.csv"'
            }
        )

    @app.route('/session/<int:session_id>/delete', methods=['POST'])
    def delete_session_route(session_id):
        if delete_session(session_id):
            flash('归档已删除', 'success')
        else:
            flash('删除失败', 'danger')
        return redirect(url_for('index'))

    @app.route('/api/sessions')
    def api_sessions():
        sessions = get_session_list()
        return jsonify(sessions)

    @app.route('/api/session/<int:session_id>')
    def api_session_detail(session_id):
        data = get_session_detail(session_id)
        if not data:
            return jsonify({'error': 'not found'}), 404
        return jsonify(data)

    @app.route('/api/verify')
    def api_verify():
        import sys
        from io import StringIO
        from models import (
            ChannelRow, TrackRow, UploadedFile, STATUS_LABELS,
        )
        from matcher import run_matching
        from report_generator import generate_report

        SAMPLE_DIR = os.path.join(app.root_path, 'sample_data')

        old_stdout = sys.stdout
        sys.stdout = mystdout = StringIO()

        try:
            session = create_session('API验证', '通过接口触发的验证')

            test_files = [
                ('舞台通道表.csv', 'channel', False),
                ('舞台通道表_旧版.csv', 'channel', True),
                ('曲目表.csv', 'track', False),
                ('时码清单.txt', 'timecode', False),
                ('现场备注.txt', 'note', False),
            ]

            for filename, category, is_old in test_files:
                filepath = os.path.join(SAMPLE_DIR, filename)
                uploaded_file = UploadedFile(
                    session_id=session.id,
                    filename=filename,
                    file_type='spreadsheet' if filename.endswith('.csv') else 'text',
                    file_path=filepath,
                )
                db.session.add(uploaded_file)
                db.session.commit()
                row_count, error = process_uploaded_file(uploaded_file, category, is_old)
                tag = ' [旧版]' if is_old else ''
                print(f'✅ {filename}{tag}: {row_count} 条')

            print()
            print('=== 通道表 track_name 验证 ===')
            channel_rows = ChannelRow.query.filter_by(session_id=session.id, is_old_version=False).all()
            bad_count = 0
            for ch in channel_rows:
                is_bad = ch.track_name.startswith('CH') or '通道' in ch.track_name
                if is_bad:
                    print(f'  ❌ 错误：{ch.channel_name} → track_name={ch.track_name!r}')
                    bad_count += 1
                else:
                    print(f'  ✅ 正确：{ch.channel_name} → {ch.track_name}')
            print(f'  结果：{len(channel_rows) - bad_count}/{len(channel_rows)} 正确')
            print()

            results = run_matching(session)
            status_counts = {}
            for r in results:
                status_counts[r.status] = status_counts.get(r.status, 0) + 1

            print('=== 匹配结果 ===')
            for s, c in sorted(status_counts.items()):
                print(f'  {STATUS_LABELS.get(s, s)}: {c}')
            print()

            print('=== 曲目关联 ===')
            track_rows = TrackRow.query.filter_by(session_id=session.id).all()
            matched_track_ids = set(r.track_row_id for r in results if r.track_row_id)
            for tr in track_rows:
                tag = '✅' if tr.id in matched_track_ids else '❌'
                print(f'  {tag} {tr.track_name}')
            print(f'  已关联 {len(matched_track_ids)}/{len(track_rows)}')
            print()

            report = generate_report(session)
            print(f'=== 报告: {len(report)} 字符 ===')

            output = mystdout.getvalue()
            return jsonify({
                'session_id': session.id,
                'output': output,
                'bad_track_name_count': bad_count,
                'unmatched_tracks': len(track_rows) - len(matched_track_ids),
            })
        except Exception as e:
            import traceback
            return jsonify({
                'error': str(e),
                'traceback': traceback.format_exc(),
                'output': mystdout.getvalue(),
            }), 500
        finally:
            sys.stdout = old_stdout

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
