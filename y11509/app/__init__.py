import os
from flask import Flask, jsonify
from config import config


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["EXPORT_FOLDER"], exist_ok=True)

    from app.models import db

    db.init_app(app)

    from app.routes import (
        inspection_bp,
        calibration_bp,
        repair_bp,
        supplementary_bp,
        audit_bp,
        import_bp,
        export_bp,
        user_bp,
    )

    app.register_blueprint(inspection_bp, url_prefix="/api/inspection")
    app.register_blueprint(calibration_bp, url_prefix="/api/calibration")
    app.register_blueprint(repair_bp, url_prefix="/api/repair")
    app.register_blueprint(supplementary_bp, url_prefix="/api/supplementary")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")
    app.register_blueprint(import_bp, url_prefix="/api/import")
    app.register_blueprint(export_bp, url_prefix="/api/export")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    @app.route("/api/health")
    def health_check():
        return jsonify({"status": "healthy", "message": "医疗器械巡检权限追责台账 API 运行正常"})

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "资源不存在", "code": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "服务器内部错误", "code": 500, "message": str(error)}), 500

    return app
