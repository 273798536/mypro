from flask import Flask
from flask_cors import CORS
from config import Config
from .models import db

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../static', template_folder='../templates')
    app.config.from_object(config_class)
    
    CORS(app)
    db.init_app(app)
    
    from . import routes
    app.register_blueprint(routes.bp)
    
    return app
