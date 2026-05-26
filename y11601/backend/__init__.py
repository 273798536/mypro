from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from .models import init_db
from .routes import api

app = Flask(__name__, static_folder=None)
CORS(app)

app.register_blueprint(api)

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')


@app.route('/')
def index():
    return send_from_directory(frontend_dir, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(frontend_dir, path)


def create_app():
    init_db()
    return app
