from flask import Flask
from config import API_HOST, API_PORT
from api.routes import api_bp
from models.database import init_db

app = Flask(__name__)
app.register_blueprint(api_bp, url_prefix='/api')

init_db()

if __name__ == '__main__':
    app.run(host=API_HOST, port=API_PORT, debug=False, threaded=True)
