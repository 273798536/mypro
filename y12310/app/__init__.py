from flask import Flask
import os

app = Flask(__name__)
app.secret_key = 'lp-warehouse-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'data/uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

from app import routes
