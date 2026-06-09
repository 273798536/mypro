import os
import io
import json
from flask import Flask, render_template, request, jsonify, send_file, abort
from .storage import Storage
from .importer import read_raw_file, save_upload, process_batch
from .exporter import export_batch_excel, export_all_batches_excel
from . import BASE_DIR


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, 'templates'),
        static_folder=os.path.join(BASE_DIR, 'static'),
    )

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/batches')
    def list_batches():
        batches = Storage.get_batches()
        enriched = []
        for bn, b in batches.items():
            anomalies = Storage.get_anomalies_for_batch(bn)
            enriched.append({
                'batch_no': bn,
                'first_seen': b.get('first_seen'),
                'last_seen': b.get('last_seen'),
                'run_count': b.get('run_count', 0),
                'latest_stats': b.get('latest_stats'),
                'anomaly_count': len(anomalies),
                'warning_count': sum(1 for a in anomalies if a.get('severity') == 'warning'),
            })
        return jsonify(sorted(enriched, key=lambda x: x['last_seen'], reverse=True))

    @app.route('/api/batches/<batch_no>')
    def get_batch(batch_no):
        b = Storage.get_batch(batch_no)
        if not b:
            abort(404)
        runs = [r for r in Storage.get_runs() if r['batch_no'] == batch_no]
        anomalies = Storage.get_anomalies_for_batch(batch_no)
        return jsonify({
            'batch': b,
            'runs': runs,
            'anomalies': anomalies,
        })

    @app.route('/api/anomalies')
    def list_anomalies():
        return jsonify(Storage.get_anomalies())

    @app.route('/api/upload', methods=['POST'])
    def upload():
        if 'file' not in request.files:
            return jsonify({'error': '未找到上传文件'}), 400
        f = request.files['file']
        batch_no = request.form.get('batch_no', '').strip()
        note = request.form.get('note', '').strip()
        strategy = request.form.get('strategy', 'merge')
        if not batch_no:
            return jsonify({'error': '批号不能为空'}), 400
        try:
            path = save_upload(f)
            raw_df = read_raw_file(path)
            result = process_batch(batch_no, raw_df, meta={'note': note}, conflict_strategy=strategy)
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/upload_json', methods=['POST'])
    def upload_json():
        data = request.get_json(force=True)
        batch_no = data.get('batch_no', '').strip()
        rows = data.get('rows') or []
        note = data.get('note', '')
        strategy = data.get('strategy', 'merge')
        if not batch_no:
            return jsonify({'error': '批号不能为空'}), 400
        import pandas as pd
        raw_df = pd.DataFrame(rows)
        try:
            result = process_batch(batch_no, raw_df, meta={'note': note}, conflict_strategy=strategy)
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/batches/<batch_no>/export')
    def export_batch(batch_no):
        fpath = export_batch_excel(batch_no)
        if not fpath:
            abort(404)
        return send_file(fpath, as_attachment=True, download_name=os.path.basename(fpath))

    @app.route('/api/export_all')
    def export_all():
        fpath = export_all_batches_excel()
        if not fpath:
            abort(404)
        return send_file(fpath, as_attachment=True, download_name=os.path.basename(fpath))

    @app.route('/api/retest_suggestion/<batch_no>')
    def retest_suggestion(batch_no):
        b = Storage.get_batch(batch_no)
        if not b:
            abort(404)
        anomalies = Storage.get_anomalies_for_batch(batch_no)
        stats = b.get('latest_stats', {})
        suggestions = []
        suggestions.append({
            'scope': '基础统计复核',
            'action': f'核对 Mn={stats.get("Mn", 0):.0f}、Mw={stats.get("Mw", 0):.0f}、PDI={stats.get("PDI", 0):.3f} 与 GPC 原始报告是否一致。',
            'basis': '来自最近一次处理记录（界面与导出报告共用同一条记录）。',
        })
        for a in anomalies:
            suggestions.append({
                'scope': a.get('title', ''),
                'action': a.get('suggestion', ''),
                'safety_note': a.get('safety_note', ''),
                'anomaly_id': a.get('anomaly_id'),
                'basis': a.get('description', ''),
            })
        if b.get('run_count', 0) > 1:
            hist = b.get('stats_history', [])
            if len(hist) >= 2:
                prev, cur = hist[-2], hist[-1]
                rel_pdi = abs(cur.get('PDI', 0) - prev.get('PDI', 0)) / max(prev.get('PDI', 1e-9), 1e-9)
                if rel_pdi > 0.1:
                    suggestions.append({
                        'scope': '批号多次导入差异',
                        'action': '同一批号两次 PDI 差异超过 10%，请确认是否为同一样品、测试条件是否一致。',
                        'basis': f'上次 PDI={prev.get("PDI", 0):.3f}，本次 PDI={cur.get("PDI", 0):.3f}。',
                    })
        return jsonify({
            'batch_no': batch_no,
            'run_count': b.get('run_count', 0),
            'suggestions': suggestions,
            'source_run_ids': [r['run_id'] for r in Storage.get_runs() if r['batch_no'] == batch_no],
        })

    return app
