from flask import request, jsonify, g
import os
from werkzeug.utils import secure_filename
from app.api import app, require_auth
from app.services.import_service import ImportService

UPLOAD_FOLDER = 'data/uploads'
ALLOWED_EXTENSIONS = {'json', 'csv'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/v1/imports', methods=['GET'])
@require_auth()
def get_import_history():
    history = ImportService.get_import_history()
    return jsonify(history)

@app.route('/api/v1/imports', methods=['POST'])
@require_auth(['admin', 'operator'])
def import_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only JSON and CSV allowed'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    try:
        result = ImportService.import_from_file(filepath, imported_by=g.api_key[:8])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/imports/<int:source_id>/raw', methods=['GET'])
@require_auth()
def get_import_raw_data(source_id):
    raw_data = ImportService.get_raw_data_by_source(source_id)
    return jsonify(raw_data)

@app.route('/api/v1/imports/check-duplicate', methods=['POST'])
@require_auth(['admin', 'operator'])
def check_duplicate():
    data = request.get_json()
    file_hash = data.get('file_hash')
    
    if not file_hash:
        return jsonify({'error': 'file_hash is required'}), 400
    
    is_duplicate, source = ImportService.check_duplicate_import(file_hash)
    
    return jsonify({
        'is_duplicate': is_duplicate,
        'existing_source': source.to_dict() if source else None
    })
