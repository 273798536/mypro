from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
cors = CORS()


def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../static', static_url_path='/static')
    app.config.from_object(config_class)

    db.init_app(app)
    cors.init_app(app)

    from app.api.routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from app.models import models  # noqa: F401

    @app.route('/')
    def index():
        return redirect(url_for('static', filename='index.html'))

    with app.app_context():
        db.create_all()
        _init_security_rules()

    return app


def _init_security_rules():
    from app.models.models import SecurityRule
    existing_rules = SecurityRule.query.all()
    if not existing_rules:
        default_rules = [
            SecurityRule(
                rule_code='LEAKAGE_001',
                rule_name='训练集验证集划分规则',
                description='禁止训练集和验证集之间存在重复样本',
                is_active=True,
                severity='high'
            ),
            SecurityRule(
                rule_code='LEAKAGE_002',
                rule_name='多轮对话上下文一致性规则',
                description='多轮对话中同一用户历史对话不能出现在验证集中',
                is_active=True,
                severity='high'
            ),
            SecurityRule(
                rule_code='LEAKAGE_003',
                rule_name='评测题库隔离规则',
                description='评测题库与训练样本必须完全隔离',
                is_active=True,
                severity='critical'
            ),
            SecurityRule(
                rule_code='QUALITY_001',
                rule_name='对话完整性检查',
                description='多轮对话不能缺少关键轮次',
                is_active=True,
                severity='medium'
            ),
        ]
        for rule in default_rules:
            db.session.add(rule)
        db.session.commit()
