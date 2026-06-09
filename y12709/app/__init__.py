from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = '请先登录系统'


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    config_class.ensure_dirs()

    db.init_app(app)
    login_manager.init_app(app)

    from app.models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from app.routes.auth import bp as auth_bp
    from app.routes.main import bp as main_bp
    from app.routes.samples import bp as samples_bp
    from app.routes.calculations import bp as calc_bp
    from app.routes.review import bp as review_bp
    from app.routes.reports import bp as reports_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(samples_bp)
    app.register_blueprint(calc_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(reports_bp)

    with app.app_context():
        db.create_all()
        from app.models import init_db
        init_db()

    return app
