import click
import requests
import pandas as pd
import random
from datetime import datetime, timedelta
import os
import json
import time

BASE_URL = "http://localhost:8000"

@click.group()
def cli():
    """仓内波次拣货验收回放链路服务命令行工具"""
    pass

@cli.command()
@click.option('--host', default='0.0.0.0', help='服务监听地址')
@click.option('--port', default=8000, help='服务监听端口')
def start_server(host, port):
    """启动API服务"""
    import uvicorn
    click.echo(f"启动API服务: {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)

@cli.command()
@click.argument('file_type', type=click.Choice(['wave', 'pick', 'review', 'supplement', 'shift']))
@click.argument('file_path', type=click.Path(exists=True))
def import_file(file_type, file_path):
    """导入数据文件"""
    endpoints = {
        'wave': '/api/import/wave-orders',
        'pick': '/api/import/pick-differences',
        'review': '/api/import/review-scans',
        'supplement': '/api/import/temp-supplements',
        'shift': '/api/import/shift-records'
    }
    
    url = f"{BASE_URL}{endpoints[file_type]}"
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f)}
        response = requests.post(url, files=files)
    
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))

@cli.command()
@click.argument('wave_no')
@click.option('--operator', default='cli', help='操作人')
@click.option('--reason', default='', help='原因')
@click.option('--include-inventory/--no-inventory', default=True, help='是否包含库存占用追踪')
def replay_wave(wave_no, operator, reason, include_inventory):
    """回放波次单"""
    url = f"{BASE_URL}/api/replay/wave/{wave_no}"
    payload = {
        'operator': operator,
        'reason': reason,
        'include_inventory': include_inventory
    }
    response = requests.post(url, json=payload)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result.get('code') == 0:
        task_id = result['data']['task_id']
        click.echo(f"\n任务已提交，任务ID: {task_id}")
        click.echo("使用 'python cli.py get-task {task_id}' 查看任务状态")

@cli.command()
@click.argument('wave_no')
def reconcile_wave(wave_no):
    """对账波次单"""
    url = f"{BASE_URL}/api/reconciliation/{wave_no}"
    response = requests.post(url)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))

@cli.command()
@click.argument('report_type', type=click.Choice([
    'wave_orders', 'pick_differences', 'review_scans', 
    'exception_records', 'replay_history',
    'inventory_snapshots', 'step_diffs', 'full_replay_detail'
]))
@click.option('--wave_no', help='波次号过滤')
@click.option('--replay_id', help='回放ID过滤')
def export_report(report_type, wave_no, replay_id):
    """导出报表"""
    url = f"{BASE_URL}/api/export/{report_type}"
    params = {}
    if wave_no:
        params['wave_no'] = wave_no
    if replay_id:
        params['replay_id'] = replay_id
    
    response = requests.post(url, params=params)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))
    
    if result.get('code') == 0:
        task_id = result['data']['task_id']
        click.echo(f"\n等待任务完成...")
        for i in range(30):
            time.sleep(1)
            task_resp = requests.get(f"{BASE_URL}/api/tasks/{task_id}")
            task_data = task_resp.json()
            if task_data['data']['status'] == 'completed':
                click.echo("任务完成！")
                if task_data['data'].get('result'):
                    try:
                        task_result = json.loads(task_data['data']['result'])
                        if task_result.get('sheets'):
                            click.echo(f"导出工作表: {', '.join(task_result['sheets'])}")
                        click.echo(f"导出文件名: {task_result.get('filename', 'N/A')}")
                        click.echo(f"导出行数: {task_result.get('row_count', 0)}")
                    except:
                        pass
                break
            click.echo(f"任务状态: {task_data['data']['status']}")

@cli.command()
@click.argument('task_id')
def get_task(task_id):
    """查看任务详情"""
    url = f"{BASE_URL}/api/tasks/{task_id}"
    response = requests.get(url)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))

@cli.command()
def resume_tasks():
    """恢复失败任务"""
    url = f"{BASE_URL}/api/tasks/resume"
    response = requests.post(url)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))

@cli.command()
@click.argument('exception_id')
@click.option('--reason', required=True, help='修正原因')
@click.option('--operator', default='cli', help='操作人')
@click.option('--data', required=True, help='修正后数据(JSON格式)')
def correct_exception(exception_id, reason, operator, data):
    """修正异常"""
    url = f"{BASE_URL}/api/exceptions/{exception_id}/correct"
    try:
        corrected_data = json.loads(data)
    except json.JSONDecodeError:
        click.echo("错误: JSON数据格式无效")
        return
    
    payload = {
        'corrected_data': corrected_data,
        'reason': reason,
        'operator': operator
    }
    response = requests.post(url, json=payload)
    result = response.json()
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))

@cli.command()
@click.option('--output', default='./sample_data', help='输出目录')
@click.option('--wave-count', default=3, help='生成波次数量')
@click.option('--items-per-wave', default=5, help='每波次商品数量')
def generate_test_data(output, wave_count, items_per_wave):
    """生成测试数据"""
    os.makedirs(output, exist_ok=True)
    
    sku_codes = [f'SKU{i:04d}' for i in range(1, 21)]
    sku_names = [f'商品{i:04d}' for i in range(1, 21)]
    pickers = ['张三', '李四', '王五', '赵六']
    reviewers = ['钱七', '孙八', '周九', '吴十']
    warehouses = ['A仓', 'B仓']
    shifts = ['早班', '中班', '晚班']
    
    wave_orders = []
    pick_diffs = []
    review_scans = []
    supplements = []
    
    for w in range(1, wave_count + 1):
        wave_no = f'WAVE{datetime.now().strftime("%Y%m%d")}{w:03d}'
        shift_code = random.choice(shifts)
        
        for i in range(items_per_wave):
            sku_idx = random.randint(0, len(sku_codes) - 1)
            plan_qty = random.randint(10, 100)
            pick_qty = plan_qty - random.randint(0, 5)
            review_qty = pick_qty - random.randint(0, 3)
            shortage_qty = plan_qty - pick_qty
            
            is_split = random.random() < 0.2
            
            wave_orders.append({
                '波次号': wave_no,
                '订单号': f'ORD{datetime.now().strftime("%Y%m%d")}{w:03d}{i:03d}',
                '商品编码': sku_codes[sku_idx],
                '商品名称': sku_names[sku_idx],
                '计划数量': plan_qty,
                '拣货数量': pick_qty,
                '复核数量': review_qty,
                '缺货数量': shortage_qty,
                '状态': 'completed',
                '仓库': random.choice(warehouses),
                '拣货员': random.choice(pickers),
                '复核员': random.choice(reviewers),
                '班次': shift_code,
                '是否拆单': is_split,
                '原波次号': f'WAVE{datetime.now().strftime("%Y%m%d")}{w-1:03d}' if is_split and w > 1 else '',
                '拆单原因': '缺货拆分' if is_split else '',
            })
            
            if shortage_qty > 0 or pick_qty != plan_qty:
                pick_diffs.append({
                    '差异单号': f'DIFF{wave_no}{i:03d}',
                    '波次号': wave_no,
                    '订单号': f'ORD{datetime.now().strftime("%Y%m%d")}{w:03d}{i:03d}',
                    '商品编码': sku_codes[sku_idx],
                    '计划数量': plan_qty,
                    '实际拣货': pick_qty,
                    '差异数量': plan_qty - pick_qty,
                    '差异类型': '缺货' if shortage_qty > 0 else '多拣',
                    '原因编码': 'R001',
                    '原因描述': '库存不足' if shortage_qty > 0 else '拣货错误',
                    '处理人': random.choice(pickers),
                    '处理时间': (datetime.now() - timedelta(hours=random.randint(1, 24))).strftime('%Y-%m-%d %H:%M:%S'),
                    '处理结果': '已处理',
                })
            
            review_scans.append({
                '扫描单号': f'SCAN{wave_no}{i:03d}',
                '波次号': wave_no,
                '订单号': f'ORD{datetime.now().strftime("%Y%m%d")}{w:03d}{i:03d}',
                '商品编码': sku_codes[sku_idx],
                '扫描数量': review_qty,
                '扫描时间': (datetime.now() - timedelta(hours=random.randint(1, 12))).strftime('%Y-%m-%d %H:%M:%S'),
                '扫描员': random.choice(reviewers),
                '复核结果': '通过' if review_qty == pick_qty else '不通过',
                '是否通过': review_qty == pick_qty,
                '失败原因': '' if review_qty == pick_qty else '数量不符',
            })
            
            if random.random() < 0.3:
                supplements.append({
                    '补录单号': f'SUPP{wave_no}{i:03d}',
                    '波次号': wave_no,
                    '订单号': f'ORD{datetime.now().strftime("%Y%m%d")}{w:03d}{i:03d}',
                    '商品编码': sku_codes[sku_idx],
                    '补录数量': random.randint(1, 5),
                    '补录类型': '缺货补录',
                    '原因编码': 'S001',
                    '原因描述': '临时补货',
                    '操作人': random.choice(pickers),
                    '操作时间': (datetime.now() - timedelta(hours=random.randint(1, 6))).strftime('%Y-%m-%d %H:%M:%S'),
                })
    
    shift_records = []
    for s in range(3):
        shift_date = (datetime.now() - timedelta(days=s)).strftime('%Y-%m-%d')
        for shift_type in ['早班', '中班', '晚班']:
            shift_records.append({
                '班次编码': f'SHIFT{shift_date.replace("-", "")}{shift_type[:1]}',
                '班次日期': shift_date,
                '班次类型': shift_type,
                '仓库': random.choice(warehouses),
                '班组长': random.choice(pickers),
                '人员数量': random.randint(5, 20),
                '开始时间': f'{shift_date} 08:00:00',
                '结束时间': f'{shift_date} 16:00:00',
                '绩效目标': random.randint(1000, 5000),
                '实际绩效': random.randint(800, 5500),
            })
    
    pd.DataFrame(wave_orders).to_excel(os.path.join(output, 'wave_orders.xlsx'), index=False)
    pd.DataFrame(pick_diffs).to_excel(os.path.join(output, 'pick_differences.xlsx'), index=False)
    pd.DataFrame(review_scans).to_excel(os.path.join(output, 'review_scans.xlsx'), index=False)
    pd.DataFrame(supplements).to_excel(os.path.join(output, 'temp_supplements.xlsx'), index=False)
    pd.DataFrame(shift_records).to_excel(os.path.join(output, 'shift_records.xlsx'), index=False)
    
    click.echo(f"测试数据已生成到: {output}")
    click.echo(f"  - wave_orders.xlsx: {len(wave_orders)} 条波次单")
    click.echo(f"  - pick_differences.xlsx: {len(pick_diffs)} 条拣货差异")
    click.echo(f"  - review_scans.xlsx: {len(review_scans)} 条复核扫描")
    click.echo(f"  - temp_supplements.xlsx: {len(supplements)} 条临时补录")
    click.echo(f"  - shift_records.xlsx: {len(shift_records)} 条班次记录")

@cli.command()
@click.option('--data-dir', default='./sample_data', help='测试数据目录')
def run_full_workflow(data_dir):
    """运行完整工作流演示"""
    click.echo("=" * 60)
    click.echo("仓内波次拣货验收回放链路服务 - 完整工作流演示")
    click.echo("=" * 60)
    
    files = {
        '波次单': ('wave', os.path.join(data_dir, 'wave_orders.xlsx')),
        '拣货差异': ('pick', os.path.join(data_dir, 'pick_differences.xlsx')),
        '复核扫描': ('review', os.path.join(data_dir, 'review_scans.xlsx')),
        '临时补录': ('supplement', os.path.join(data_dir, 'temp_supplements.xlsx')),
        '班次记录': ('shift', os.path.join(data_dir, 'shift_records.xlsx')),
    }
    
    click.echo("\n步骤1: 导入数据")
    click.echo("-" * 40)
    wave_nos = set()
    for name, (ft, fp) in files.items():
        if os.path.exists(fp):
            click.echo(f"导入{name}...")
            endpoints = {
                'wave': '/api/import/wave-orders',
                'pick': '/api/import/pick-differences',
                'review': '/api/import/review-scans',
                'supplement': '/api/import/temp-supplements',
                'shift': '/api/import/shift-records'
            }
            url = f"{BASE_URL}{endpoints[ft]}"
            with open(fp, 'rb') as f:
                files_up = {'file': (os.path.basename(fp), f)}
                response = requests.post(url, files=files_up)
            result = response.json()
            click.echo(f"  结果: {result['data']['success']} 成功, {result['data']['duplicate']} 重复, {result['data']['failed']} 失败")
            
            if ft == 'wave':
                df = pd.read_excel(fp)
                wave_nos.update(df['波次号'].unique())
    
    if wave_nos:
        test_wave = list(wave_nos)[0]
        click.echo(f"\n步骤2: 对账波次 {test_wave}")
        click.echo("-" * 40)
        url = f"{BASE_URL}/api/reconciliation/{test_wave}"
        response = requests.post(url)
        result = response.json()
        click.echo(f"任务ID: {result['data']['task_id']}")
        
        time.sleep(2)
        task_resp = requests.get(f"{BASE_URL}/api/tasks/{result['data']['task_id']}")
        task_data = task_resp.json()
        click.echo(f"任务状态: {task_data['data']['status']}")
        
        if task_data['data'].get('result'):
            task_result = json.loads(task_data['data']['result'])
            click.echo(f"对账结果: {'平衡' if task_result.get('is_balanced') else '不平衡'}")
            if task_result.get('discrepancies'):
                click.echo(f"发现差异: {len(task_result['discrepancies'])} 处")
        
        click.echo(f"\n步骤3: 回放波次 {test_wave}")
        click.echo("-" * 40)
        url = f"{BASE_URL}/api/replay/wave/{test_wave}"
        payload = {'operator': 'demo', 'reason': '工作流演示-缺货拆单回放追踪库存变化', 'include_inventory': True}
        response = requests.post(url, json=payload)
        result = response.json()
        if result.get('code') != 0:
            click.echo(f"回放失败: {result.get('message', '未知错误')}")
            return
        click.echo(f"任务ID: {result['data']['task_id']}")
        
        time.sleep(3)
        task_resp = requests.get(f"{BASE_URL}/api/tasks/{result['data']['task_id']}")
        task_data = task_resp.json()
        if task_data.get('code') != 0:
            click.echo(f"获取任务状态失败: {task_data.get('message', '未知错误')}")
            return
        click.echo(f"任务状态: {task_data['data']['status']}")
        
        if task_data['data']['status'] == 'completed' and task_data['data'].get('result'):
            task_result = json.loads(task_data['data']['result'])
            click.echo(f"回放ID: {task_result.get('replay_id', 'N/A')}")
            click.echo(f"步骤数: {len(task_result.get('steps', []))}")
            click.echo(f"库存快照数: {len(task_result.get('inventory_snapshots', []))}")
        
        click.echo(f"\n步骤4: 查看回放详情")
        click.echo("-" * 40)
        if task_data['data']['status'] == 'completed' and task_data['data'].get('result'):
            task_result = json.loads(task_data['data']['result'])
            replay_id = task_result.get('replay_id')
            if replay_id:
                url = f"{BASE_URL}/api/replay/detail/{replay_id}"
                response = requests.get(url)
                detail = response.json()
                if detail.get('code') == 0:
                    click.echo(f"回放原因: {detail['data'].get('reason', 'N/A')}")
                    click.echo(f"步骤差异数: {len(detail['data'].get('step_diffs', []))}")
                    click.echo(f"库存快照数: {len(detail['data'].get('inventory_snapshots', []))}")
        
        click.echo(f"\n步骤5: 导出完整回放详情")
        click.echo("-" * 40)
        url = f"{BASE_URL}/api/export/full_replay_detail"
        params = {'wave_no': test_wave}
        response = requests.post(url, params=params)
        result = response.json()
        if result.get('code') != 0:
            click.echo(f"导出失败: {result.get('message', '未知错误')}")
            return
        click.echo(f"导出任务ID: {result['data']['task_id']}")
        
        time.sleep(3)
        export_task_resp = requests.get(f"{BASE_URL}/api/tasks/{result['data']['task_id']}")
        export_task_data = export_task_resp.json()
        if export_task_data.get('code') == 0 and export_task_data['data'].get('result'):
            export_result = json.loads(export_task_data['data']['result'])
            click.echo(f"导出文件名: {export_result.get('filename', 'N/A')}")
            click.echo(f"导出工作表: {', '.join(export_result.get('sheets', []))}")
            click.echo(f"导出行数: {export_result.get('row_count', 0)}")
    
    click.echo("\n" + "=" * 60)
    click.echo("工作流演示完成！")
    click.echo("=" * 60)

if __name__ == '__main__':
    cli()
