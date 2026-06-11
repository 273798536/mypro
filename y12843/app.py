from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db
import services
import urllib.parse

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': '血液检验复测建议系统'})

def get_operator():
    op = request.headers.get('X-Operator', 'system')
    try:
        return urllib.parse.unquote(op)
    except:
        return op

@app.route('/api/import', methods=['POST'])
def import_data():
    data = request.get_json()
    operator = get_operator()
    result = services.import_records(data, operator)
    return jsonify(result)

@app.route('/api/supplement/<int:culture_id>', methods=['POST'])
def supplement_data(culture_id):
    data = request.get_json()
    operator = get_operator()
    result = services.supplement_record(culture_id, data, operator)
    return jsonify(result)

@app.route('/api/low-quality', methods=['GET'])
def get_low_quality():
    batch_id = request.args.get('batch_id', type=int)
    result = services.get_low_quality_records(batch_id)
    return jsonify({'count': len(result), 'records': result})

@app.route('/api/review/sessions', methods=['POST'])
def create_review():
    data = request.get_json()
    operator = get_operator()
    result = services.create_review_session(
        data['sample_batch_id'],
        data.get('session_name', f'复核会话_{data["sample_batch_id"]}'),
        operator
    )
    return jsonify(result)

@app.route('/api/review/sessions/<int:session_id>', methods=['GET'])
def get_review(session_id):
    result = services.get_review_session(session_id)
    if not result:
        return jsonify({'status': 'error', 'message': '复核会话不存在'}), 404
    return jsonify(result)

@app.route('/api/review/items/<int:item_id>', methods=['POST'])
def submit_review(item_id):
    data = request.get_json()
    operator = get_operator()
    result = services.submit_review_item(item_id, data, operator)
    return jsonify(result)

@app.route('/api/statistics/groups', methods=['GET'])
def group_stats():
    result = services.get_group_statistics()
    return jsonify({'count': len(result), 'groups': result})

@app.route('/api/statistics/monthly/<year_month>', methods=['GET'])
def monthly_stats(year_month):
    result = services.get_monthly_quality_report(year_month)
    return jsonify(result)

@app.route('/api/trace/record/<int:culture_id>', methods=['GET'])
def trace_record(culture_id):
    result = services.trace_record(culture_id)
    return jsonify(result)

@app.route('/api/trace/reagent/<reagent_no>', methods=['GET'])
def trace_reagent(reagent_no):
    result = services.trace_reagent_conclusions(reagent_no)
    return jsonify({'count': len(result), 'records': result})

@app.route('/api/conclusions/active/<int:culture_id>', methods=['GET'])
def active_conclusions(culture_id):
    result = services.get_active_conclusions(culture_id)
    return jsonify({'count': len(result), 'conclusions': result})

if __name__ == '__main__':
    import sys
    print('正在初始化数据库...', flush=True)
    init_db()
    print('数据库初始化完成，启动服务于端口 5001...', flush=True)
    debug = '--debug' in sys.argv
    app.run(host='127.0.0.1', port=5001, debug=debug, use_reloader=False)
