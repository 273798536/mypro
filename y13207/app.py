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
        return send_from_directory(
            app.config['REPORT_FOLDER'], filename,
            as_attachment=True, download_name=f'{session.name}_报告.md'
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

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
