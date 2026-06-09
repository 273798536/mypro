import os
from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import io
import traceback

from modules.data_loader import DataLoader
from modules.data_validator import DataValidator
from modules.metrics_calculator import MetricsCalculator
from modules.anomaly_classifier import AnomalyClassifier
from modules.history_comparator import HistoryComparator
from modules.result_exporter import ResultExporter

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['SECRET_KEY'] = 'gradient-descent-assistant-secret-key'

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

data_loader = DataLoader()
data_validator = DataValidator()
metrics_calculator = MetricsCalculator()
anomaly_classifier = AnomalyClassifier()
history_comparator = HistoryComparator()
result_exporter = ResultExporter()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        files = request.files
        file_types = {}

        for key in files:
            file = files[key]
            if file and file.filename:
                filepath = os.path.join(UPLOAD_FOLDER, file.filename)
                file.save(filepath)
                file_types[key] = filepath

        loaded_data = data_loader.load_all(file_types)

        validation_report = data_validator.validate_all(loaded_data)

        metrics_result = metrics_calculator.calculate_all(loaded_data)

        anomalies = anomaly_classifier.classify_all(loaded_data, validation_report, metrics_result)

        history_result = history_comparator.compare(loaded_data)

        return jsonify({
            'success': True,
            'loaded_data': {k: v.shape if hasattr(v, 'shape') else len(v) for k, v in loaded_data.items()},
            'validation_report': validation_report,
            'metrics_result': metrics_result,
            'anomalies': anomalies,
            'history_result': history_result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        })


@app.route('/preview/<file_type>')
def preview_data(file_type):
    try:
        filepath = request.args.get('path')
        if not filepath or not os.path.exists(filepath):
            return jsonify({'success': False, 'error': '文件不存在'})

        df = data_loader.load_single(filepath, file_type)
        preview = df.head(20).fillna('').to_dict('records')
        columns = list(df.columns)

        return jsonify({
            'success': True,
            'columns': columns,
            'preview': preview,
            'total_rows': len(df)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/export', methods=['POST'])
def export_results():
    try:
        data = request.json
        export_type = data.get('export_type', 'full')
        format_type = data.get('format', 'xlsx')

        result = result_exporter.export(data, export_type, format_type)

        if isinstance(result, str):
            return send_file(result, as_attachment=True)
        else:
            return send_file(
                io.BytesIO(result),
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'梯度下降轨迹讲解结果_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.{format_type}'
            )

    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'traceback': traceback.format_exc()})


@app.route('/formula/<formula_name>')
def get_formula_info(formula_name):
    info = metrics_calculator.get_formula_info(formula_name)
    return jsonify(info)


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
