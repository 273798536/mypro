from flask import render_template, request, jsonify, redirect, url_for, flash, send_file
import os
import json
from datetime import datetime
from app import app
from app.utils import DataManager
from app.algorithms import LinearProgrammingOptimizer, ReportGenerator

data_manager = DataManager()
report_generator = ReportGenerator()

current_result = None
result_history = {}


@app.route('/')
def index():
    versions = data_manager.list_versions()
    return render_template('index.html', 
                         versions=versions,
                         current_version=data_manager.current_version)


@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('请选择文件', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('请选择文件', 'error')
            return redirect(request.url)
        
        if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            try:
                version_id = data_manager.import_from_excel(filepath)
                flash(f'数据导入成功！版本号: {version_id}', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                flash(f'导入失败: {str(e)}', 'error')
                return redirect(request.url)
        
        flash('仅支持Excel文件', 'error')
        return redirect(request.url)
    
    return render_template('upload.html')


@app.route('/load_version/<version_id>')
def load_version(version_id):
    try:
        data_manager.load_all(version_id)
        flash(f'已加载版本: {version_id}', 'success')
    except Exception as e:
        flash(f'加载失败: {str(e)}', 'error')
    return redirect(url_for('index'))


@app.route('/data')
def view_data():
    warehouses = list(data_manager.warehouses.values())
    stores = list(data_manager.stores.values())
    vehicles = list(data_manager.vehicles.values())
    
    inventory_df = data_manager.get_inventory_summary()
    demand_df = data_manager.get_demand_summary()
    
    return render_template('data.html',
                         warehouses=warehouses,
                         stores=stores,
                         vehicles=vehicles,
                         inventories=inventory_df.to_dict('records') if not inventory_df.empty else [],
                         demands=demand_df.to_dict('records') if not demand_df.empty else [])


@app.route('/optimize', methods=['GET', 'POST'])
def optimize():
    global current_result
    
    if request.method == 'POST':
        if not data_manager.warehouses or not data_manager.stores:
            flash('请先导入数据', 'error')
            return redirect(request.url)
        
        try:
            optimizer = LinearProgrammingOptimizer(data_manager)
            result = optimizer.optimize()
            
            current_result = result
            result_id = f"result_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            result_history[result_id] = {
                'result': result,
                'version': data_manager.current_version,
                'created_at': datetime.now()
            }
            
            if result.success:
                flash('优化成功！', 'success')
            else:
                flash(f'优化完成，但存在问题: {result.message}', 'warning')
            
            return render_template('result.html', 
                                 result=result,
                                 result_id=result_id)
            
        except Exception as e:
            flash(f'优化失败: {str(e)}', 'error')
            return redirect(request.url)
    
    return render_template('optimize.html')


@app.route('/result/<result_id>')
def view_result(result_id):
    if result_id in result_history:
        result_data = result_history[result_id]
        return render_template('result.html',
                             result=result_data['result'],
                             result_id=result_id)
    flash('结果不存在', 'error')
    return redirect(url_for('index'))


@app.route('/export_report/<result_id>')
def export_report(result_id):
    if result_id in result_history:
        result_data = result_history[result_id]
        try:
            filepath = report_generator.generate_excel_report(
                result_data['result'], 
                data_manager
            )
            return send_file(filepath, as_attachment=True)
        except Exception as e:
            flash(f'导出失败: {str(e)}', 'error')
    return redirect(url_for('index'))


@app.route('/compare', methods=['GET', 'POST'])
def compare():
    if request.method == 'POST':
        result_a_id = request.form.get('result_a')
        result_b_id = request.form.get('result_b')
        
        if result_a_id in result_history and result_b_id in result_history:
            result_a = result_history[result_a_id]['result']
            result_b = result_history[result_b_id]['result']
            
            comparison = report_generator.compare_results(
                result_a, result_b,
                f"方案_{result_a_id[-6:]}",
                f"方案_{result_b_id[-6:]}"
            )
            
            filepath = report_generator.generate_comparison_report(comparison)
            
            return render_template('compare.html',
                                 comparison=comparison,
                                 result_a_id=result_a_id,
                                 result_b_id=result_b_id,
                                 results=list(result_history.keys()))
    
    return render_template('compare.html',
                         results=list(result_history.keys()),
                         comparison=None)


@app.route('/api/data_summary')
def api_data_summary():
    return jsonify({
        'warehouses': len(data_manager.warehouses),
        'stores': len(data_manager.stores),
        'vehicles': len(data_manager.vehicles),
        'inventories': sum(len(v) for v in data_manager.inventories.values()),
        'demands': sum(len(v) for v in data_manager.demands.values()),
        'current_version': data_manager.current_version
    })


@app.route('/api/conflicts')
def api_conflicts():
    optimizer = LinearProgrammingOptimizer(data_manager)
    conflicts = optimizer._check_conflicts()
    return jsonify({'conflicts': conflicts})
