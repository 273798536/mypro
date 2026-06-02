from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import os

from backend.core import PKSolver
from backend.utils import (
    ParameterValidator, OperationTracker, DataManager, ReportExporter
)
from backend.api import api_bp

def create_app():
    app = Flask(__name__,
                template_folder='templates',
                static_folder='frontend')

    CORS(app)

    app.config['PK_SOLVER'] = PKSolver(seed=42)
    app.config['PARAMETER_VALIDATOR'] = ParameterValidator()
    app.config['OPERATION_TRACKER'] = OperationTracker(max_history=1000)
    app.config['DATA_MANAGER'] = DataManager(
        raw_data_dir=os.path.join(os.path.dirname(__file__), 'data', 'raw'),
        processed_data_dir=os.path.join(os.path.dirname(__file__), 'data', 'processed')
    )
    app.config['REPORT_EXPORTER'] = ReportExporter(
        output_dir=os.path.join(os.path.dirname(__file__), 'data', 'processed')
    )

    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory(os.path.join(app.static_folder, 'js'), filename, 
                                   mimetype='application/javascript')

    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory(os.path.join(app.static_folder, 'css'), filename,
                                   mimetype='text/css')

    return app

if __name__ == '__main__':
    app = create_app()
    print("🚀 微分方程药量模拟系统启动中...")
    print("📊 访问 http://localhost:5001 打开前端界面")
    print("🔌 API文档: http://localhost:5001/api/health")
    app.run(host='0.0.0.0', port=5001, debug=True)
