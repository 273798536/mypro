from flask import Flask, render_template, request, redirect, url_for, jsonify, Response
import os

from config import Config
from .models import db
from .services import PlanCompareService, UnifiedDataSource
from .report import MarkdownReportGenerator
from .status import StatusService
from .versioning import VersionService, RecordService, RemarkService


def _get_filters_from_request():
    filters = {}
    status = request.args.get('status')
    if status:
        filters['status'] = status
    business_type = request.args.get('business_type')
    if business_type:
        filters['business_type'] = business_type
    location_keyword = request.args.get('location_keyword')
    if location_keyword:
        filters['location_keyword'] = location_keyword
    min_count = request.args.get('min_booth_count')
    if min_count:
        try:
            filters['min_booth_count'] = int(min_count)
        except ValueError:
            pass
    max_count = request.args.get('max_booth_count')
    if max_count:
        try:
            filters['max_booth_count'] = int(max_count)
        except ValueError:
            pass
    return filters


def _init_sample_data():
    from .models import PlanItem
    plans = PlanCompareService.list_plan_compares()
    if plans:
        return

    plan = PlanCompareService.create_plan_compare('夜市外摆方案比选')

    items_data = [
        {
            'location': '人民路步行街北段',
            'booth_count': 12,
            'area': 180.0,
            'business_type': '餐饮小吃',
            'operating_hours': '18:00-23:00',
            'status': 'approved',
            'impact_factor': '人流量大，占道问题需关注',
            'original_source': '社区巡检记录',
            'notes': '阿宁现场确认过点位'
        },
        {
            'location': '文化广场南侧',
            'booth_count': 8,
            'area': 120.0,
            'business_type': '文创手作',
            'operating_hours': '17:00-22:00',
            'status': 'pending',
            'impact_factor': '靠近居民区，噪音控制是关键',
            'original_source': '规划方案v2',
            'notes': '需和社区核点位'
        },
        {
            'location': '滨河路景观带',
            'booth_count': 15,
            'area': 240.0,
            'business_type': '餐饮小吃',
            'operating_hours': '18:00-24:00',
            'status': 'reviewing',
            'impact_factor': '环境承载力评估中',
            'original_source': '正常记录',
            'notes': '旧版照片显示摊位数量有变化'
        },
        {
            'location': '老城区东大街',
            'booth_count': 6,
            'area': 90.0,
            'business_type': '特色商品',
            'operating_hours': '16:00-21:00',
            'status': 'draft',
            'impact_factor': '路面宽度有限',
            'original_source': '口头备注',
            'notes': '社区王主任口头提的点位'
        },
        {
            'location': '地铁站B出口',
            'booth_count': 10,
            'area': 150.0,
            'business_type': '轻食饮品',
            'operating_hours': '17:00-23:00',
            'status': 'approved',
            'impact_factor': '人流高峰集中',
            'original_source': '社区巡检记录',
            'notes': ''
        }
    ]

    version = plan.get_current_version()
    for idx, item_data in enumerate(items_data):
        item = PlanItem(version_id=version.id, sort_order=idx, **item_data)
        db.session.add(item)

    RecordService.add_record(
        plan.id,
        record_type='old_photo',
        title='滨河路景观带旧版巡检照片',
        content='旧版照片显示滨河路景观带有20个摊位，面积300㎡。新版调整为15个摊位、240㎡。原因是环保评估后缩减了靠近绿化带的区域。',
        source='历史档案2023版',
        is_old_version=True,
        affects_conclusion=True
    )

    RecordService.add_record(
        plan.id,
        record_type='record',
        title='人民路步行街正常巡检记录',
        content='2024年5月20日巡检：人民路步行街北段12个摊位全部正常经营，卫生状况良好，未发现超范围经营。',
        source='社区运营阿宁',
        is_old_version=False,
        affects_conclusion=False
    )

    RecordService.add_record(
        plan.id,
        record_type='note',
        title='口头备注：文化广场噪音问题',
        content='社区李阿姨口头反映，文化广场夜间噪音影响居民休息。建议夜市营业时间调整为不超过21:30，或者增设隔音设施。',
        source='居民反馈（口头）',
        is_old_version=False,
        affects_conclusion=True
    )

    RemarkService.add_remark(
        plan.id,
        content='领导问为什么滨河路摊位减少了，要找原因。',
        author='阿宁',
        source='微信聊天'
    )

    RemarkService.add_remark(
        plan.id,
        content='和社区张姐核过文化广场点位了，她说可以摆但要控制噪音。',
        author='接手同事',
        source='线下沟通'
    )

    plan.status = 'reviewing'
    plan.need_confirm = True
    plan.confirm_reason = '滨河路摊位数量调整需确认，文化广场噪音问题需评估'
    plan.next_step = '请运营组复核滨河路调整方案，并确认文化广场噪音控制措施'

    db.session.commit()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    os.makedirs(os.path.join(app.root_path, '..', 'data'), exist_ok=True)

    with app.app_context():
        db.create_all()
        _init_sample_data()

    @app.route('/')
    def index():
        plans = PlanCompareService.list_plan_compares()
        return render_template('index.html', plans=plans, StatusService=StatusService)

    @app.route('/plan/<int:plan_id>')
    def plan_detail(plan_id):
        data_source = UnifiedDataSource(plan_id)
        status_info = StatusService.get_status_info(plan_id)
        versions = VersionService.list_versions(plan_id)
        records = RecordService.get_records(plan_id)
        remarks = RemarkService.get_remarks(plan_id)
        return render_template('detail.html',
                               plan=data_source.plan,
                               data=data_source.get_all_data(),
                               status_info=status_info,
                               versions=versions,
                               records=records,
                               remarks=remarks,
                               StatusService=StatusService)

    @app.route('/plan/create', methods=['POST'])
    def create_plan():
        title = request.form.get('title', '夜市外摆方案比选')
        plan = PlanCompareService.create_plan_compare(title)
        return redirect(url_for('plan_detail', plan_id=plan.id))

    @app.route('/plan/<int:plan_id>/report')
    def view_report(plan_id):
        filters = _get_filters_from_request()
        generator = MarkdownReportGenerator(plan_id, filters)
        md_content = generator.generate()
        return render_template('report.html',
                               plan_id=plan_id,
                               md_content=md_content,
                               plan=PlanCompareService.get_plan_compare(plan_id))

    @app.route('/plan/<int:plan_id>/report/raw')
    def report_raw(plan_id):
        filters = _get_filters_from_request()
        generator = MarkdownReportGenerator(plan_id, filters)
        md_content = generator.generate()
        return Response(md_content, mimetype='text/markdown; charset=utf-8')

    @app.route('/plan/<int:plan_id>/rerun', methods=['POST'])
    def rerun_plan(plan_id):
        reason = request.form.get('reason', '')
        operator = request.form.get('operator', '系统')
        StatusService.rerun(plan_id, operator=operator, reason=reason)
        return redirect(url_for('plan_detail', plan_id=plan_id))

    @app.route('/plan/<int:plan_id>/status', methods=['POST'])
    def change_status(plan_id):
        target_status = request.form.get('target_status')
        reason = request.form.get('reason', '')
        operator = request.form.get('operator', '系统')
        try:
            StatusService.transition(plan_id, target_status, reason=reason, operator=operator)
        except ValueError as e:
            return str(e), 400
        return redirect(url_for('plan_detail', plan_id=plan_id))

    @app.route('/plan/<int:plan_id>/confirm', methods=['POST'])
    def confirm_plan(plan_id):
        confirmed = request.form.get('confirmed') == 'yes'
        comment = request.form.get('comment', '')
        operator = request.form.get('operator', '系统')
        StatusService.confirm(plan_id, confirmed, operator=operator, comment=comment)
        return redirect(url_for('plan_detail', plan_id=plan_id))

    @app.route('/plan/<int:plan_id>/rollback/<int:version_num>', methods=['POST'])
    def rollback_version(plan_id, version_num):
        reason = request.form.get('reason', '')
        VersionService.rollback_to_version(plan_id, version_num, reason=reason)
        return redirect(url_for('plan_detail', plan_id=plan_id))

    @app.route('/plan/<int:plan_id>/remark', methods=['POST'])
    def add_remark(plan_id):
        content = request.form.get('content', '')
        author = request.form.get('author', '')
        source = request.form.get('source', '')
        RemarkService.add_remark(plan_id, content, author=author, source=source)
        return redirect(url_for('plan_detail', plan_id=plan_id))

    return app
