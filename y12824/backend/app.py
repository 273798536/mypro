import os
import sys
from flask import Flask, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config, DB_PATH
from models import db
from routes import api

def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    app.register_blueprint(api, url_prefix='/api')
    
    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'message': '水产苗种存活率系统运行正常'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("=" * 60)
    print("水产苗种存活率管理系统启动中...")
    print("数据库路径:", DB_PATH)
    print("访问地址: http://localhost:5002")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5002, debug=False)
