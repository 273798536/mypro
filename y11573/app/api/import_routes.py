from flask import request, jsonify, g
import os
from werkzeug.utils import secure_filename
from app.api import app, require_auth
from app.services.import_service import ImportService

UPLOAD_FOLDER = 'data/uploads'
EXTRACT_FOLDER = 'data/extracted'
ALLOWED_EXTENSIONS = {'json', 'csv', 'zip', 'tar', 'gz', 'tgz'}
ARCHIVE_EXTENSIONS = {'zip', 'tar', 'gz', 'tgz'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(EXTRACT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_archive_file(filename):
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    if ext == 'gz' and filename.endswith('.tar.gz'):
        return True
    return ext in ARCHIVE_EXTENSIONS

def get_file_type(filename):
    if filename.endswith('.tar.gz') or filename.endswith('.tgz'):
        return 'tar.gz'
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    return ext

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
        return jsonify({'error': f'Invalid file type. Allowed types: {", ".join(sorted(ALLOWED_EXTENSIONS))}'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    try:
        if is_archive_file(filename):
            file_type = get_file_type(filename)
            extracted_files = ImportService.extract_archive(filepath, EXTRACT_FOLDER, file_type)
            
            all_results = []
            for extracted_file in extracted_files:
                if extracted_file.endswith('.json') or extracted_file.endswith('.csv'):
                    result = ImportService.import_from_file(extracted_file, imported_by=g.api_key[:8])
                    all_results.append({
                        'file': extracted_file,
                        'result': result
                    })
            
            return jsonify({
                'success': True,
                'is_archive': True,
                'archive_type': file_type,
                'extracted_files': len(extracted_files),
                'imported_files': len(all_results),
                'results': all_results
            })
        else:
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
