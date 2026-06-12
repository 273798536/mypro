import os
import io
import base64
import datetime
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import desc

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///queue_analysis.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/screenshots'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
db = SQLAlchemy(app)


class ProcessingState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(50), default='ready')
    current_step = db.Column(db.Integer, default=0)
    total_records = db.Column(db.Integer, default=0)
    processed_count = db.Column(db.Integer, default=0)
    boundary_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    notes = db.Column(db.Text, default='')


class QueueRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    record_type = db.Column(db.String(50), default='normal')
    window_id = db.Column(db.String(50))
    total_wait_time = db.Column(db.Float, default=0)
    queue_length = db.Column(db.Integer, default=0)
    service_count = db.Column(db.Integer, default=0)
    avg_wait_time = db.Column(db.Float, default=0)
    unit = db.Column(db.String(20), default='seconds')
    is_boundary = db.Column(db.Boolean, default=False)
    processing_log = db.Column(db.Text, default='')
    calculation_steps = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)


class Screenshot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), default='processed')
    title = db.Column(db.String(200))
    description = db.Column(db.Text)
    file_path = db.Column(db.String(300))
    image_base64 = db.Column(db.Text)
    record_ids = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)


class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    content = db.Column(db.Text)
    source = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)


class UnitConversion:
    @staticmethod
    def seconds_to_minutes(seconds):
        return seconds / 60.0

    @staticmethod
    def seconds_to_hours(seconds):
        return seconds / 3600.0

    @staticmethod
    def minutes_to_seconds(minutes):
        return minutes * 60.0

    @staticmethod
    def convert(value, from_unit, to_unit):
        conversions = {
            ('seconds', 'minutes'): UnitConversion.seconds_to_minutes,
            ('seconds', 'hours'): UnitConversion.seconds_to_hours,
            ('minutes', 'seconds'): UnitConversion.minutes_to_seconds,
            ('minutes', 'hours'): lambda x: x / 60.0,
            ('hours', 'seconds'): lambda x: x * 3600.0,
            ('hours', 'minutes'): lambda x: x * 60.0,
        }
        if from_unit == to_unit:
            return value
        key = (from_unit.lower(), to_unit.lower())
        if key in conversions:
            return conversions[key](value)
        return value


class QueueProcessor:
    def __init__(self, session_id):
        self.session_id = session_id

    def detect_boundary(self, record):
        if record['queue_length'] == 0:
            return True, "排队人数为0，平均等待时间计算出现除零边界"
        if record['service_count'] == 0 and record['total_wait_time'] > 0:
            return True, "已服务人数为0但存在等待时间，边界异常"
        return False, ""

    def calculate_avg_wait_time(self, record, target_unit='minutes'):
        steps = []
        original_unit = record.get('unit', 'seconds')
        total_wait = record['total_wait_time']
        queue_len = record['queue_length']

        steps.append(f"输入参数：总等待时间={total_wait}{original_unit}，排队人数={queue_len}人")

        if queue_len == 0:
            steps.append("⚠️ 检测到除零边界：排队人数=0")
            steps.append("平均等待时间 = 总等待时间 / 排队人数")
            steps.append(f"平均等待时间 = {total_wait} / 0 → 除零错误")
            steps.append("边界处理：标记为异常记录，不参与正常统计")
            return None, steps, True

        raw_avg = total_wait / queue_len
        steps.append(f"步骤1：原始计算 平均等待时间 = {total_wait} / {queue_len} = {raw_avg:.4f}{original_unit}")

        converted_avg = UnitConversion.convert(raw_avg, original_unit, target_unit)
        steps.append(f"步骤2：单位换算 {raw_avg:.4f}{original_unit} → {converted_avg:.4f}{target_unit}")
        steps.append(f"换算系数：1{original_unit} = {UnitConversion.convert(1, original_unit, target_unit):.6f}{target_unit}")
        steps.append(f"最终结果：平均等待时间 = {converted_avg:.4f}{target_unit}")

        return converted_avg, steps, False

    def process_record(self, record_data):
        is_boundary, boundary_reason = self.detect_boundary(record_data)

        avg_wait, calc_steps, has_error = self.calculate_avg_wait_time(record_data)

        log_parts = []
        if is_boundary:
            log_parts.append(f"边界检测：{boundary_reason}")
        log_parts.extend(calc_steps)

        return {
            'avg_wait_time': avg_wait if not has_error else 0,
            'is_boundary': is_boundary,
            'processing_log': '\n'.join(log_parts),
            'calculation_steps': '\n'.join(calc_steps),
            'unit': record_data.get('unit', 'seconds')
        }


class ChartGenerator:
    def __init__(self, session_id):
        self.session_id = session_id

    def generate_comparison_chart(self, records, title="排队窗口指标对比"):
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle(title, fontsize=16, fontweight='bold')

        window_ids = [r['window_id'] for r in records]
        x = np.arange(len(window_ids))

        colors = ['#4CAF50' if not r['is_boundary'] else '#f44336' for r in records]

        axes[0, 0].bar(x, [r['total_wait_time'] for r in records], color=colors)
        axes[0, 0].set_title('总等待时间 (秒)')
        axes[0, 0].set_xticks(x)
        axes[0, 0].set_xticklabels(window_ids, rotation=45)
        for i, v in enumerate([r['total_wait_time'] for r in records]):
            axes[0, 0].text(i, v + max([r['total_wait_time'] for r in records]) * 0.02,
                           f"{v:.1f}", ha='center', fontsize=9)

        axes[0, 1].bar(x, [r['queue_length'] for r in records], color=colors)
        axes[0, 1].set_title('排队人数')
        axes[0, 1].set_xticks(x)
        axes[0, 1].set_xticklabels(window_ids, rotation=45)
        for i, v in enumerate([r['queue_length'] for r in records]):
            axes[0, 1].text(i, v + max([r['queue_length'] for r in records] + [1]) * 0.05,
                           str(v), ha='center', fontsize=9)

        axes[1, 0].bar(x, [r['service_count'] for r in records], color=colors)
        axes[1, 0].set_title('已服务人数')
        axes[1, 0].set_xticks(x)
        axes[1, 0].set_xticklabels(window_ids, rotation=45)
        for i, v in enumerate([r['service_count'] for r in records]):
            axes[1, 0].text(i, v + max([r['service_count'] for r in records] + [1]) * 0.05,
                           str(v), ha='center', fontsize=9)

        avg_values = []
        for r in records:
            if r['is_boundary']:
                avg_values.append(0)
            else:
                avg = UnitConversion.convert(r['total_wait_time'] / r['queue_length'],
                                            r.get('unit', 'seconds'), 'minutes')
                avg_values.append(avg)

        axes[1, 1].bar(x, avg_values, color=colors)
        axes[1, 1].set_title('平均等待时间 (分钟)')
        axes[1, 1].set_xticks(x)
        axes[1, 1].set_xticklabels(window_ids, rotation=45)
        for i, v in enumerate(avg_values):
            label = "除零边界" if records[i]['is_boundary'] else f"{v:.2f}"
            axes[1, 1].text(i, v + max(avg_values + [1]) * 0.05,
                           label, ha='center', fontsize=9)

        legend_elements = [
            plt.Rectangle((0, 0), 1, 1, facecolor='#4CAF50', label='正常记录'),
            plt.Rectangle((0, 0), 1, 1, facecolor='#f44336', label='除零边界')
        ]
        fig.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(0.98, 0.95))

        plt.tight_layout(rect=[0, 0, 1, 0.96])

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)

        filename = f"comparison_{self.session_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            buf.seek(0)
            f.write(buf.getvalue())

        return img_base64, filepath

    def generate_boundary_detail_chart(self, boundary_records):
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.suptitle('除零边界记录详情', fontsize=16, fontweight='bold', color='#d32f2f')

        window_ids = [r['window_id'] for r in boundary_records]
        x = np.arange(len(window_ids))

        bar_width = 0.35
        ax.bar(x - bar_width/2, [r['total_wait_time'] for r in boundary_records],
               bar_width, label='总等待时间', color='#ff9800')
        ax.bar(x + bar_width/2, [r['queue_length'] for r in boundary_records],
               bar_width, label='排队人数', color='#f44336')

        ax.set_xlabel('窗口编号')
        ax.set_ylabel('数值')
        ax.set_title('⚠️ 除零边界：排队人数=0，但存在等待时间')
        ax.set_xticks(x)
        ax.set_xticklabels(window_ids)
        ax.legend()
        ax.grid(axis='y', alpha=0.3)

        for i, r in enumerate(boundary_records):
            ax.annotate(f"等待时间:{r['total_wait_time']}s\n排队人数:0 → 除零!",
                       xy=(i, max(r['total_wait_time'], r['queue_length'])),
                       xytext=(0, 20), textcoords='offset points',
                       ha='center', fontsize=9, color='#d32f2f',
                       arrowprops=dict(arrowstyle='->', color='#d32f2f'))

        plt.tight_layout(rect=[0, 0, 1, 0.94])

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig)

        filename = f"boundary_{self.session_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            buf.seek(0)
            f.write(buf.getvalue())

        return img_base64, filepath


def get_or_create_session():
    session_id = request.cookies.get('queue_session')
    if not session_id:
        session_id = f"session_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{np.random.randint(1000, 9999)}"

    state = ProcessingState.query.filter_by(session_id=session_id).first()
    if not state:
        state = ProcessingState(session_id=session_id, status='ready', current_step=0)
        db.session.add(state)
        db.session.commit()

    return session_id, state


@app.route('/')
def index():
    session_id, state = get_or_create_session()

    records = QueueRecord.query.filter_by(session_id=session_id).order_by(QueueRecord.created_at).all()
    screenshots = Screenshot.query.filter_by(session_id=session_id).order_by(Screenshot.created_at).all()
    materials = Material.query.filter_by(session_id=session_id).order_by(Material.created_at).all()

    normal_records = [r for r in records if not r.is_boundary]
    boundary_records = [r for r in records if r.is_boundary]

    screenshots_processed = [s for s in screenshots if s.category == 'processed']
    screenshots_pending = [s for s in screenshots if s.category == 'pending']
    screenshots_manual = [s for s in screenshots if s.category == 'manual']

    materials_history = [m for m in materials if m.category == 'history']
    materials_normal = [m for m in materials if m.category == 'normal']
    materials_supplement = [m for m in materials if m.category == 'supplement']

    response = app.make_response(render_template('index.html',
        state=state,
        records=records,
        normal_records=normal_records,
        boundary_records=boundary_records,
        screenshots_processed=screenshots_processed,
        screenshots_pending=screenshots_pending,
        screenshots_manual=screenshots_manual,
        materials_history=materials_history,
        materials_normal=materials_normal,
        materials_supplement=materials_supplement
    ))
    response.set_cookie('queue_session', session_id, max_age=30*24*60*60)
    return response


@app.route('/add_record', methods=['POST'])
def add_record():
    session_id, state = get_or_create_session()

    record_data = {
        'window_id': request.form['window_id'],
        'total_wait_time': float(request.form['total_wait_time']),
        'queue_length': int(request.form['queue_length']),
        'service_count': int(request.form['service_count']),
        'unit': request.form.get('unit', 'seconds')
    }

    processor = QueueProcessor(session_id)
    result = processor.process_record(record_data)

    record_type = 'boundary' if result['is_boundary'] else 'normal'

    record = QueueRecord(
        session_id=session_id,
        record_type=record_type,
        window_id=record_data['window_id'],
        total_wait_time=record_data['total_wait_time'],
        queue_length=record_data['queue_length'],
        service_count=record_data['service_count'],
        avg_wait_time=result['avg_wait_time'],
        unit=record_data['unit'],
        is_boundary=result['is_boundary'],
        processing_log=result['processing_log'],
        calculation_steps=result['calculation_steps']
    )
    db.session.add(record)

    state.total_records += 1
    if result['is_boundary']:
        state.boundary_count += 1
    else:
        state.processed_count += 1
    state.status = 'processing'
    state.current_step = state.processed_count + state.boundary_count
    state.updated_at = datetime.datetime.now()
    db.session.commit()

    return redirect(url_for('index'))


@app.route('/generate_screenshots', methods=['POST'])
def generate_screenshots():
    session_id, state = get_or_create_session()

    records = QueueRecord.query.filter_by(session_id=session_id).all()
    if not records:
        return jsonify({'success': False, 'message': '没有记录可生成图表'})

    chart_gen = ChartGenerator(session_id)

    records_dict = []
    for r in records:
        records_dict.append({
            'id': r.id,
            'window_id': r.window_id,
            'total_wait_time': r.total_wait_time,
            'queue_length': r.queue_length,
            'service_count': r.service_count,
            'avg_wait_time': r.avg_wait_time,
            'is_boundary': r.is_boundary,
            'unit': r.unit
        })

    img_base64, filepath = chart_gen.generate_comparison_chart(records_dict)
    screenshot_processed = Screenshot(
        session_id=session_id,
        category='processed',
        title='正常记录处理结果',
        description=f'已处理 {state.processed_count} 条正常记录的对比图表，排除除零边界记录',
        file_path=filepath,
        image_base64=img_base64,
        record_ids=','.join([str(r['id']) for r in records_dict if not r['is_boundary']])
    )
    db.session.add(screenshot_processed)

    boundary_records = [r for r in records_dict if r['is_boundary']]
    if boundary_records:
        img_base64_b, filepath_b = chart_gen.generate_boundary_detail_chart(boundary_records)
        screenshot_pending = Screenshot(
            session_id=session_id,
            category='pending',
            title='除零边界待补材料',
            description=f'检测到 {len(boundary_records)} 条除零边界记录，排队人数为0，需人工判定处理方式',
            file_path=filepath_b,
            image_base64=img_base64_b,
            record_ids=','.join([str(r['id']) for r in boundary_records])
        )
        db.session.add(screenshot_pending)

    state.status = 'screenshots_generated'
    state.updated_at = datetime.datetime.now()
    db.session.commit()

    return jsonify({'success': True, 'message': '截图生成完成'})


@app.route('/add_material', methods=['POST'])
def add_material():
    session_id, state = get_or_create_session()

    material = Material(
        session_id=session_id,
        category=request.form['category'],
        content=request.form['content'],
        source=request.form.get('source', '')
    )
    db.session.add(material)
    db.session.commit()

    return redirect(url_for('index'))


@app.route('/mark_manual', methods=['POST'])
def mark_manual():
    session_id, state = get_or_create_session()

    screenshot_id = request.form['screenshot_id']
    screenshot = Screenshot.query.get(screenshot_id)
    if screenshot and screenshot.session_id == session_id:
        screenshot.category = 'manual'
        screenshot.description = request.form.get('description', screenshot.description) + '\n[人工改判] ' + request.form.get('judgment', '')
        db.session.commit()

    return redirect(url_for('index'))


@app.route('/reset_session', methods=['POST'])
def reset_session():
    session_id = request.cookies.get('queue_session')
    if session_id:
        ProcessingState.query.filter_by(session_id=session_id).delete()
        QueueRecord.query.filter_by(session_id=session_id).delete()
        Screenshot.query.filter_by(session_id=session_id).delete()
        Material.query.filter_by(session_id=session_id).delete()
        db.session.commit()

    response = app.make_response(redirect(url_for('index')))
    response.delete_cookie('queue_session')
    return response


@app.route('/load_demo_data', methods=['POST'])
def load_demo_data():
    session_id, state = get_or_create_session()

    demo_records = [
        {
            'window_id': 'A-01',
            'total_wait_time': 1250.5,
            'queue_length': 25,
            'service_count': 23,
            'unit': 'seconds'
        },
        {
            'window_id': 'B-03',
            'total_wait_time': 890.0,
            'queue_length': 0,
            'service_count': 0,
            'unit': 'seconds'
        }
    ]

    demo_materials = [
        {
            'category': 'history',
            'content': '【历史答案-2026.06.10】窗口平均等待时间阈值：高峰期≤5分钟，平峰期≤3分钟。除零记录建议单独统计，不计入均值。',
            'source': '历史答案库-案例#20260610'
        },
        {
            'category': 'supplement',
            'content': '【后补说明】B-03窗口因设备维护于09:15-09:45暂停服务，期间系统误记录等待时间890秒，但实际无排队人员。',
            'source': '运营日志-2026.06.12'
        }
    ]

    processor = QueueProcessor(session_id)
    for record_data in demo_records:
        result = processor.process_record(record_data)
        record_type = 'boundary' if result['is_boundary'] else 'normal'
        record = QueueRecord(
            session_id=session_id,
            record_type=record_type,
            window_id=record_data['window_id'],
            total_wait_time=record_data['total_wait_time'],
            queue_length=record_data['queue_length'],
            service_count=record_data['service_count'],
            avg_wait_time=result['avg_wait_time'],
            unit=record_data['unit'],
            is_boundary=result['is_boundary'],
            processing_log=result['processing_log'],
            calculation_steps=result['calculation_steps']
        )
        db.session.add(record)
        state.total_records += 1
        if result['is_boundary']:
            state.boundary_count += 1
        else:
            state.processed_count += 1

    for mat in demo_materials:
        material = Material(
            session_id=session_id,
            category=mat['category'],
            content=mat['content'],
            source=mat['source']
        )
        db.session.add(material)

    state.status = 'demo_loaded'
    state.current_step = state.processed_count + state.boundary_count
    state.notes = '已加载演示数据：1条正常记录(A-01) + 1条除零边界(B-03)'
    state.updated_at = datetime.datetime.now()
    db.session.commit()

    return redirect(url_for('index'))


@app.route('/api/record/<int:record_id>')
def get_record_detail(record_id):
    record = QueueRecord.query.get(record_id)
    if not record:
        return jsonify({'error': '记录不存在'}), 404

    return jsonify({
        'id': record.id,
        'window_id': record.window_id,
        'total_wait_time': record.total_wait_time,
        'queue_length': record.queue_length,
        'service_count': record.service_count,
        'avg_wait_time': record.avg_wait_time,
        'unit': record.unit,
        'is_boundary': record.is_boundary,
        'calculation_steps': record.calculation_steps.split('\n') if record.calculation_steps else [],
        'processing_log': record.processing_log
    })


with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
