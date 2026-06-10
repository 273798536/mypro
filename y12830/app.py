import os
import base64
import io
import json
from datetime import datetime
from flask import Flask, send_from_directory, jsonify, request
import dash
from dash import dcc, html, dash_table, Input, Output, State, callback
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import pandas as pd

from config import Config
from app import (
    db, init_db, DataImporter, PedigreeValidator,
    ImageAnnotator, ReportExporter, DashboardData,
    ReagentBatch, ValidationStatus, ConflictType
)

server = Flask(__name__)
server.config.from_object(Config)
init_db(server)

app = dash.Dash(
    __name__,
    server=server,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True
)
app.title = '遗传家系谱系校验系统'

importer = DataImporter(upload_dir=Config.UPLOAD_FOLDER)
validator = PedigreeValidator()
annotator = ImageAnnotator(upload_dir=Config.UPLOAD_FOLDER)
exporter = ReportExporter(export_dir=Config.EXPORT_FOLDER)
dashboard = DashboardData()

COLORS = {
    'pass': '#22c55e',
    'fail': '#ef4444',
    'review': '#f59e0b',
    'warning': '#f59e0b',
    'error': '#ef4444',
    'info': '#3b82f6',
    'critical': '#dc2626',
    'header': '#1e3a5f'
}

NAV_ITEMS = [
    {'name': '总览', 'href': '/', 'icon': '📊'},
    {'name': '数据导入', 'href': '/import', 'icon': '📥'},
    {'name': '批次校验', 'href': '/validate', 'icon': '✅'},
    {'name': '冲突管理', 'href': '/conflicts', 'icon': '⚠️'},
    {'name': '图像标注', 'href': '/annotate', 'icon': '🖼️'},
    {'name': '报告导出', 'href': '/export', 'icon': '📄'},
]

def get_batch_options():
    with server.app_context():
        batches = ReagentBatch.query.order_by(ReagentBatch.created_at.desc()).all()
        return [{'label': f"{b.batch_number} - {b.name or ''}", 'value': b.id} for b in batches]

def layout_navbar():
    return dbc.NavbarSimple(
        children=[
            dbc.NavItem(dbc.NavLink(item['icon'] + ' ' + item['name'], href=item['href']))
            for item in NAV_ITEMS
        ],
        brand='🧬 遗传家系谱系校验系统',
        brand_href='/',
        color='primary',
        dark=True,
        className='mb-4'
    )

def layout_overview():
    with server.app_context():
        batch_summary = dashboard.get_batch_summary()
        conflict_data = dashboard.get_conflict_charts()
        import_data = dashboard.get_import_history_chart()

    return html.Div([
        html.H2('总览看板', className='mb-4'),
        
        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('总批次数', className='card-title'),
                    html.H2(str(batch_summary['total_batches']), className='text-primary')
                ])
            ])),
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('✅ 可直接使用', className='card-title'),
                    html.H2(str(batch_summary['batches_ready']), className='text-success')
                ])
            ])),
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('⚠️ 需复核', className='card-title'),
                    html.H2(str(batch_summary['batches_review']), className='text-warning')
                ])
            ])),
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('❌ 不能使用', className='card-title'),
                    html.H2(str(batch_summary['batches_not_ready']), className='text-danger')
                ])
            ])),
        ], className='mb-4'),

        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardHeader('批次列表'),
                dbc.CardBody([
                    dash_table.DataTable(
                        id='batch-table',
                        columns=[
                            {'name': '批次号', 'id': 'batch_number'},
                            {'name': '名称', 'id': 'name'},
                            {'name': '样本数', 'id': 'sample_count'},
                            {'name': '冲突数', 'id': 'conflict_count'},
                            {'name': '严重冲突', 'id': 'critical_count'},
                            {'name': '可用性', 'id': 'usability'},
                            {'name': '创建时间', 'id': 'created_at'},
                        ],
                        data=batch_summary['batches'],
                        style_data_conditional=[
                            {
                                'if': {'filter_query': '{usability} = "ready"'},
                                'backgroundColor': '#dcfce7',
                            },
                            {
                                'if': {'filter_query': '{usability} = "review"'},
                                'backgroundColor': '#fef3c7',
                            },
                            {
                                'if': {'filter_query': '{usability} = "not_ready"'},
                                'backgroundColor': '#fee2e2',
                            }
                        ],
                        style_table={'overflowX': 'auto'},
                        page_size=10
                    )
                ])
            ]), width=12)
        ], className='mb-4'),

        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardHeader('冲突统计'),
                dbc.CardBody([
                    dcc.Graph(id='conflict-severity-chart', figure=conflict_data['severity_chart'])
                ])
            ]), width=6),
            dbc.Col(dbc.Card([
                dbc.CardHeader('冲突类型分布'),
                dbc.CardBody([
                    dcc.Graph(id='conflict-type-chart', figure=conflict_data['type_chart'])
                ])
            ]), width=6),
        ], className='mb-4'),

        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardHeader('导入历史趋势'),
                dbc.CardBody([
                    dcc.Graph(id='import-history-chart', figure=import_data['chart'])
                ])
            ]), width=12)
        ])
    ])

def layout_import():
    return html.Div([
        html.H2('数据导入', className='mb-4'),
        
        dbc.Card([
            dbc.CardHeader('上传数据文件'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('导入类型'),
                        dcc.Dropdown(
                            id='import-type',
                            options=[
                                {'label': '样本清单', 'value': 'sample'},
                                {'label': '测序结果', 'value': 'sequencing'},
                                {'label': '家系信息', 'value': 'pedigree'},
                            ],
                            value='sample',
                            className='mb-3'
                        )
                    ], width=4),
                    dbc.Col([
                        dbc.Label('试剂批号'),
                        dbc.Input(
                            id='batch-number',
                            placeholder='输入试剂批号，如：REAG-2024-001',
                            type='text',
                            className='mb-3'
                        )
                    ], width=4),
                    dbc.Col([
                        dbc.Label('Sheet名称（Excel可选）'),
                        dbc.Input(
                            id='sheet-name',
                            placeholder='留空则读取第一个Sheet',
                            type='text',
                            className='mb-3'
                        )
                    ], width=4),
                ]),
                
                dbc.Row([
                    dbc.Col([
                        dbc.Label('上传文件'),
                        dcc.Upload(
                            id='upload-data',
                            children=html.Div([
                                '拖拽文件到此处或 ',
                                html.A('点击选择文件')
                            ]),
                            style={
                                'width': '100%',
                                'height': '60px',
                                'lineHeight': '60px',
                                'borderWidth': '1px',
                                'borderStyle': 'dashed',
                                'borderRadius': '5px',
                                'textAlign': 'center',
                                'margin': '10px 0'
                            },
                            multiple=False,
                            accept='.xlsx,.xls,.csv'
                        )
                    ], width=8),
                    dbc.Col([
                        dbc.Label('备注'),
                        dbc.Textarea(
                            id='import-notes',
                            placeholder='输入导入备注（可选）',
                            rows=3,
                            className='mb-3'
                        )
                    ], width=4)
                ]),

                dbc.Row([
                    dbc.Col([
                        dbc.Checklist(
                            options=[
                                {'label': '跳过重复文件检测', 'value': 'skip_dup_check'}
                            ],
                            value=[],
                            id='import-options',
                            switch=True,
                        ),
                    ], width=6),
                    dbc.Col([
                        dbc.Button(
                            '开始导入',
                            id='import-button',
                            color='primary',
                            className='float-end'
                        )
                    ], width=6)
                ])
            ])
        ], className='mb-4'),

        dbc.Card([
            dbc.CardHeader('导入结果'),
            dbc.CardBody([
                html.Div(id='import-result')
            ])
        ]),

        html.Hr(),

        dbc.Card([
            dbc.CardHeader('导入历史记录'),
            dbc.CardBody([
                dash_table.DataTable(
                    id='import-history-table',
                    columns=[
                        {'name': '导入ID', 'id': 'id'},
                        {'name': '文件名', 'id': 'file_name'},
                        {'name': '类型', 'id': 'import_type'},
                        {'name': '批次号', 'id': 'batch_number'},
                        {'name': '导入时间', 'id': 'import_time'},
                        {'name': '总行数', 'id': 'total_rows'},
                        {'name': '已导入', 'id': 'imported_rows'},
                        {'name': '跳过', 'id': 'skipped_rows'},
                        {'name': '重复', 'id': 'duplicate_rows'},
                        {'name': '状态', 'id': 'status'},
                    ],
                    style_table={'overflowX': 'auto'},
                    page_size=10
                )
            ])
        ]),

        dcc.Interval(id='import-history-interval', interval=5000, n_intervals=0)
    ])

def layout_validate():
    return html.Div([
        html.H2('批次校验', className='mb-4'),

        dbc.Card([
            dbc.CardHeader('选择批次进行校验'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('选择批次'),
                        dcc.Dropdown(
                            id='validate-batch-select',
                            options=get_batch_options(),
                            placeholder='请选择要校验的批次',
                            className='mb-3'
                        )
                    ], width=8),
                    dbc.Col([
                        dbc.Button(
                            '运行全部校验',
                            id='run-validation-button',
                            color='success',
                            className='mt-4'
                        ),
                        dbc.Button(
                            '查看校验结果',
                            id='view-validation-button',
                            color='primary',
                            className='mt-4 ms-2'
                        ),
                    ], width=4),
                ])
            ])
        ], className='mb-4'),

        html.Div(id='validation-results'),

        html.Hr(),

        dbc.Card([
            dbc.CardHeader('批次差异分析'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('批次1'),
                        dcc.Dropdown(
                            id='diff-batch-1',
                            options=get_batch_options(),
                            placeholder='选择批次1',
                        )
                    ], width=5),
                    dbc.Col([
                        dbc.Label('批次2'),
                        dcc.Dropdown(
                            id='diff-batch-2',
                            options=get_batch_options(),
                            placeholder='选择批次2',
                        )
                    ], width=5),
                    dbc.Col([
                        dbc.Button(
                            '对比分析',
                            id='run-diff-button',
                            color='info',
                            className='mt-4'
                        )
                    ], width=2),
                ]),
                html.Div(id='diff-results', className='mt-4')
            ])
        ])
    ])

def layout_conflicts():
    return html.Div([
        html.H2('冲突管理', className='mb-4'),

        dbc.Card([
            dbc.CardHeader('筛选条件'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('批次'),
                        dcc.Dropdown(
                            id='conflict-batch-filter',
                            options=[{'label': '全部', 'value': 'all'}] + get_batch_options(),
                            value='all',
                        )
                    ], width=4),
                    dbc.Col([
                        dbc.Label('状态'),
                        dcc.Dropdown(
                            id='conflict-status-filter',
                            options=[
                                {'label': '全部', 'value': 'all'},
                                {'label': '待处理', 'value': 'open'},
                                {'label': '已解决', 'value': 'resolved'},
                            ],
                            value='open',
                        )
                    ], width=4),
                    dbc.Col([
                        dbc.Label('严重程度'),
                        dcc.Dropdown(
                            id='conflict-severity-filter',
                            options=[
                                {'label': '全部', 'value': 'all'},
                                {'label': '严重', 'value': 'critical'},
                                {'label': '错误', 'value': 'error'},
                                {'label': '警告', 'value': 'warning'},
                            ],
                            value='all',
                        )
                    ], width=4),
                ])
            ])
        ], className='mb-4'),

        dbc.Card([
            dbc.CardHeader('冲突列表'),
            dbc.CardBody([
                dash_table.DataTable(
                    id='conflicts-table',
                    columns=[
                        {'name': 'ID', 'id': 'id'},
                        {'name': '批次号', 'id': 'batch_number'},
                        {'name': '类型', 'id': 'conflict_type'},
                        {'name': '严重程度', 'id': 'severity'},
                        {'name': '优先级', 'id': 'priority'},
                        {'name': '消息', 'id': 'message'},
                        {'name': '状态', 'id': 'status'},
                        {'name': '创建时间', 'id': 'created_at'},
                    ],
                    style_data_conditional=[
                        {
                            'if': {'filter_query': '{severity} = "critical"'},
                            'backgroundColor': '#fee2e2',
                            'fontWeight': 'bold'
                        },
                        {
                            'if': {'filter_query': '{severity} = "error"'},
                            'backgroundColor': '#fef2f2',
                        },
                        {
                            'if': {'filter_query': '{severity} = "warning"'},
                            'backgroundColor': '#fef3c7',
                        }
                    ],
                    style_table={'overflowX': 'auto'},
                    page_size=15,
                    row_selectable='single'
                )
            ])
        ], className='mb-4'),

        dbc.Card([
            dbc.CardHeader('冲突详情'),
            dbc.CardBody([
                html.Div(id='conflict-detail')
            ])
        ])
    ])

def layout_annotate():
    return html.Div([
        html.H2('图像标注', className='mb-4'),

        dbc.Card([
            dbc.CardHeader('标注管理'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('选择批次'),
                        dcc.Dropdown(
                            id='annotation-batch-select',
                            options=get_batch_options(),
                            placeholder='选择批次查看标注',
                        )
                    ], width=6),
                    dbc.Col([
                        dbc.Label('图片文件'),
                        dcc.Dropdown(
                            id='annotation-image-select',
                            placeholder='选择要标注的图片',
                        )
                    ], width=6),
                ]),

                html.Hr(),

                dbc.Row([
                    dbc.Col([
                        html.Div(id='image-display'),
                    ], width=8),
                    dbc.Col([
                        html.H5('添加标注'),
                        dbc.Form([
                            dbc.Label('标注类型'),
                            dcc.Dropdown(
                                id='annotation-type',
                                options=[
                                    {'label': '通过', 'value': 'pass'},
                                    {'label': '失败', 'value': 'fail'},
                                    {'label': '需复核', 'value': 'review'},
                                    {'label': '信息', 'value': 'info'},
                                    {'label': '标记', 'value': 'marked'},
                                ],
                                value='info',
                                className='mb-2'
                            ),
                            dbc.Label('标签'),
                            dbc.Input(id='annotation-label', placeholder='输入标签', className='mb-2'),
                            dbc.Label('X坐标'),
                            dbc.Input(id='annotation-x', type='number', value=50, className='mb-2'),
                            dbc.Label('Y坐标'),
                            dbc.Input(id='annotation-y', type='number', value=50, className='mb-2'),
                            dbc.Label('宽度'),
                            dbc.Input(id='annotation-width', type='number', value=100, className='mb-2'),
                            dbc.Label('高度'),
                            dbc.Input(id='annotation-height', type='number', value=50, className='mb-2'),
                            dbc.Label('备注'),
                            dbc.Textarea(id='annotation-notes', rows=3, className='mb-2'),
                            dbc.Button('添加标注', id='add-annotation-btn', color='primary'),
                        ]),
                        
                        html.Hr(),
                        html.H5('已有标注'),
                        html.Div(id='existing-annotations')
                    ], width=4),
                ])
            ])
        ]),

        html.Hr(),

        dbc.Card([
            dbc.CardHeader('生成家系图'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dcc.Dropdown(
                            id='pedigree-batch-select',
                            options=get_batch_options(),
                            placeholder='选择批次生成家系图',
                        )
                    ], width=8),
                    dbc.Col([
                        dbc.Button('生成家系图', id='generate-pedigree-btn', color='success')
                    ], width=4),
                ]),
                html.Div(id='pedigree-generate-result', className='mt-4')
            ])
        ])
    ])

def layout_export():
    return html.Div([
        html.H2('报告导出', className='mb-4'),

        dbc.Card([
            dbc.CardHeader('导出设置'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('选择批次'),
                        dcc.Dropdown(
                            id='export-batch-select',
                            options=get_batch_options(),
                            placeholder='选择要导出的批次',
                            className='mb-3'
                        )
                    ], width=6),
                    dbc.Col([
                        dbc.Label('导出格式'),
                        dbc.Checklist(
                            id='export-formats',
                            options=[
                                {'label': 'Excel报告', 'value': 'excel'},
                                {'label': 'PDF报告', 'value': 'pdf'},
                                {'label': '包含标注图片', 'value': 'images'},
                            ],
                            value=['excel', 'pdf'],
                            className='mb-3'
                        )
                    ], width=6),
                ]),
                dbc.Button('开始导出', id='export-button', color='primary')
            ])
        ], className='mb-4'),

        dbc.Card([
            dbc.CardHeader('导出结果'),
            dbc.CardBody([
                html.Div(id='export-result')
            ])
        ]),

        html.Hr(),

        dbc.Card([
            dbc.CardHeader('可用性评估（导师视图）'),
            dbc.CardBody([
                dbc.Row([
                    dbc.Col([
                        dbc.Label('选择批次查看可用性'),
                        dcc.Dropdown(
                            id='usability-batch-select',
                            options=get_batch_options(),
                            placeholder='选择批次',
                        )
                    ], width=8),
                    dbc.Col([
                        dbc.Button('查看评估', id='view-usability-btn', color='info', className='mt-4')
                    ], width=4),
                ]),
                html.Div(id='usability-result', className='mt-4')
            ])
        ])
    ])

app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    layout_navbar(),
    dbc.Container(id='page-content', fluid=True)
])

@callback(Output('page-content', 'children'),
          Input('url', 'pathname'))
def display_page(pathname):
    if pathname == '/import':
        return layout_import()
    elif pathname == '/validate':
        return layout_validate()
    elif pathname == '/conflicts':
        return layout_conflicts()
    elif pathname == '/annotate':
        return layout_annotate()
    elif pathname == '/export':
        return layout_export()
    else:
        return layout_overview()

@callback(
    Output('import-result', 'children'),
    Input('import-button', 'n_clicks'),
    State('import-type', 'value'),
    State('batch-number', 'value'),
    State('sheet-name', 'value'),
    State('upload-data', 'contents'),
    State('upload-data', 'filename'),
    State('import-notes', 'value'),
    State('import-options', 'value')
)
def process_import(n_clicks, import_type, batch_number, sheet_name,
                   contents, filename, notes, options):
    if not n_clicks or not contents or not batch_number:
        return html.P('请填写完整信息并上传文件')

    content_type, content_string = contents.split(',')
    decoded = base64.b64decode(content_string)
    
    filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
    with open(filepath, 'wb') as f:
        f.write(decoded)

    skip_dup_check = 'skip_dup_check' in (options or [])

    with server.app_context():
        result = importer.import_data(
            filepath=filepath,
            import_type=import_type,
            batch_number=batch_number,
            sheet_name=sheet_name if sheet_name else None,
            user='current_user',
            source_notes=notes,
            skip_duplicate_check=skip_dup_check
        )

    if result.get('success'):
        return dbc.Alert([
            html.H5('导入成功！'),
            html.P(f"批次号: {result.get('batch_number')}"),
            html.P(f"总行数: {result.get('total_rows')}"),
            html.P(f"已导入: {result.get('imported_rows')}"),
            html.P(f"跳过: {result.get('skipped_rows')}"),
            html.P(f"重复: {result.get('duplicate_rows')}"),
            html.P(f"导入ID: {result.get('import_record_id')}")
        ], color='success')
    elif result.get('duplicate'):
        existing = result.get('existing_import', {})
        return dbc.Alert([
            html.H5('检测到重复导入！'),
            html.P(result.get('message')),
            html.P(f"上次导入时间: {existing.get('time')}"),
            html.P(f"上次导入行数: {existing.get('imported_rows')}"),
            html.P(f"导入ID: {existing.get('id')}"),
            html.P('如需强制导入，请勾选"跳过重复文件检测"选项')
        ], color='warning')
    else:
        return dbc.Alert([
            html.H5('导入失败！'),
            html.P(result.get('error', '未知错误'))
        ], color='danger')

@callback(
    Output('import-history-table', 'data'),
    Input('import-history-interval', 'n_intervals')
)
def update_import_history(n):
    with server.app_context():
        records = importer.get_import_history()
        return [{
            'id': r.id,
            'file_name': r.file_name,
            'import_type': r.import_type,
            'batch_number': r.batch_number,
            'import_time': r.import_time.strftime('%Y-%m-%d %H:%M:%S') if r.import_time else '',
            'total_rows': r.total_rows,
            'imported_rows': r.imported_rows,
            'skipped_rows': r.skipped_rows,
            'duplicate_rows': r.duplicate_rows,
            'status': r.status
        } for r in records]

@callback(
    Output('validation-results', 'children'),
    Input('run-validation-button', 'n_clicks'),
    Input('view-validation-button', 'n_clicks'),
    State('validate-batch-select', 'value')
)
def run_or_view_validation(run_clicks, view_clicks, batch_id):
    if not batch_id:
        return html.P('请先选择批次')
    
    ctx = dash.callback_context
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0] if ctx.triggered else None

    if triggered_id == 'run-validation-button':
        with server.app_context():
            result = validator.run_all_validations(batch_id)
    else:
        with server.app_context():
            result = dashboard.get_validation_charts(batch_id)
            batch = ReagentBatch.query.get(batch_id)
            result = {
                'batch_id': batch_id,
                'batch_number': batch.batch_number if batch else '',
                'status_chart': result['status_chart'],
                'type_chart': result['type_chart'],
                'status_data': result['status_data'],
                'summary': {
                    'passed': result['status_data'].get('pass', 0),
                    'failed': result['status_data'].get('fail', 0),
                    'review': result['status_data'].get('review', 0),
                }
            }
            validations = validator.get_validation_results(batch_id)
            result['validations'] = [{
                'id': v.id,
                'validation_type': v.validation_type,
                'status': v.status,
                'severity': v.severity,
                'message': v.message,
                'expected_value': v.expected_value,
                'actual_value': v.actual_value,
                'source_records': str(v.source_records) if v.source_records else ''
            } for v in validations]

    if not result.get('success', True):
        return dbc.Alert(result.get('error', '校验失败'), color='danger')

    summary = result.get('summary', {})
    return html.Div([
        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('通过', className='card-title'),
                    html.H2(str(summary.get('passed', 0)), className='text-success')
                ])
            ])),
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('失败', className='card-title'),
                    html.H2(str(summary.get('failed', 0)), className='text-danger')
                ])
            ])),
            dbc.Col(dbc.Card([
                dbc.CardBody([
                    html.H5('需复核', className='card-title'),
                    html.H2(str(summary.get('review', 0)), className='text-warning')
                ])
            ])),
        ], className='mb-4'),

        dbc.Row([
            dbc.Col(dcc.Graph(figure=result.get('status_chart', {})), width=6),
            dbc.Col(dcc.Graph(figure=result.get('type_chart', {})), width=6),
        ], className='mb-4'),

        dbc.Card([
            dbc.CardHeader('校验详情'),
            dbc.CardBody([
                dash_table.DataTable(
                    columns=[
                        {'name': 'ID', 'id': 'id'},
                        {'name': '校验类型', 'id': 'validation_type'},
                        {'name': '状态', 'id': 'status'},
                        {'name': '严重程度', 'id': 'severity'},
                        {'name': '消息', 'id': 'message'},
                        {'name': '期望值', 'id': 'expected_value'},
                        {'name': '实际值', 'id': 'actual_value'},
                        {'name': '来源记录', 'id': 'source_records'},
                    ],
                    data=result.get('validations', []),
                    style_data_conditional=[
                        {
                            'if': {'filter_query': '{status} = "fail"'},
                            'backgroundColor': '#fee2e2',
                        },
                        {
                            'if': {'filter_query': '{status} = "review"'},
                            'backgroundColor': '#fef3c7',
                        }
                    ],
                    style_table={'overflowX': 'auto'},
                    page_size=10
                )
            ])
        ])
    ])

@callback(
    Output('diff-results', 'children'),
    Input('run-diff-button', 'n_clicks'),
    State('diff-batch-1', 'value'),
    State('diff-batch-2', 'value')
)
def run_diff(n_clicks, batch1, batch2):
    if not n_clicks or not batch1 or not batch2:
        return ''
    
    with server.app_context():
        diff = validator.diff_batches(batch1, batch2)
    
    if not diff.get('success', True):
        return dbc.Alert(diff.get('error', '对比失败'), color='danger')

    return html.Div([
        dbc.Alert([
            html.H5('批次对比结果'),
            html.P(f"批次1: {diff['batch1']}"),
            html.P(f"批次2: {diff['batch2']}"),
            html.P(f"仅在批次1: {len(diff['only_in_batch1'])} 个样本"),
            html.P(f"仅在批次2: {len(diff['only_in_batch2'])} 个样本"),
            html.P(f"两批都有: {len(diff['in_both'])} 个样本"),
            html.P(f"存在差异: {len(diff['differences'])} 个样本"),
        ], color='info'),

        dbc.Row([
            dbc.Col(dbc.Card([
                dbc.CardHeader(f'仅在 {diff["batch1"]}'),
                dbc.CardBody([
                    dash_table.DataTable(
                        columns=[
                            {'name': '样本ID', 'id': 'sample_id'},
                            {'name': '性别', 'id': 'gender'},
                            {'name': '来源', 'id': 'source'},
                        ],
                        data=diff['only_in_batch1'],
                        style_table={'overflowX': 'auto'},
                        page_size=5
                    )
                ])
            ]), width=6),
            dbc.Col(dbc.Card([
                dbc.CardHeader(f'仅在 {diff["batch2"]}'),
                dbc.CardBody([
                    dash_table.DataTable(
                        columns=[
                            {'name': '样本ID', 'id': 'sample_id'},
                            {'name': '性别', 'id': 'gender'},
                            {'name': '来源', 'id': 'source'},
                        ],
                        data=diff['only_in_batch2'],
                        style_table={'overflowX': 'auto'},
                        page_size=5
                    )
                ])
            ]), width=6),
        ]),

        dbc.Card([
            dbc.CardHeader('存在差异的样本'),
            dbc.CardBody([
                dash_table.DataTable(
                    columns=[
                        {'name': '样本ID', 'id': 'sample_id'},
                        {'name': '字段差异', 'id': 'fields_str'},
                    ],
                    data=[{
                        'sample_id': d['sample_id'],
                        'fields_str': '; '.join([f"{f['field']}: {f['batch1_value']} -> {f['batch2_value']}" 
                                               for f in d['fields']])
                    } for d in diff['differences']],
                    style_table={'overflowX': 'auto'},
                    page_size=10
                )
            ])
        ], className='mt-3')
    ])

@callback(
    Output('conflicts-table', 'data'),
    Input('conflict-batch-filter', 'value'),
    Input('conflict-status-filter', 'value'),
    Input('conflict-severity-filter', 'value')
)
def update_conflicts_table(batch_filter, status_filter, severity_filter):
    with server.app_context():
        batch_id = None if batch_filter == 'all' else batch_filter
        status = None if status_filter == 'all' else status_filter
        severity = None if severity_filter == 'all' else severity_filter
        
        conflicts = validator.get_conflicts(batch_id, status, severity)
        return [{
            'id': c.id,
            'batch_number': ReagentBatch.query.get(c.batch_id).batch_number if c.batch_id else '',
            'conflict_type': c.conflict_type,
            'severity': c.severity,
            'priority': c.priority,
            'message': c.message,
            'status': c.status,
            'created_at': c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
        } for c in conflicts]

@callback(
    Output('conflict-detail', 'children'),
    Input('conflicts-table', 'selected_rows'),
    State('conflicts-table', 'data')
)
def show_conflict_detail(selected_rows, data):
    if not selected_rows or not data:
        return html.P('请选择一条冲突记录查看详情')
    
    conflict_data = data[selected_rows[0]]
    with server.app_context():
        from app.models import ConflictRecord
        conflict = ConflictRecord.query.get(conflict_data['id'])
        if not conflict:
            return html.P('冲突记录不存在')
        
        return html.Div([
            dbc.Row([
                dbc.Col([
                    html.H6('冲突类型'),
                    html.P(conflict.conflict_type)
                ], width=3),
                dbc.Col([
                    html.H6('严重程度'),
                    html.P(conflict.severity, className={
                        'text-danger': conflict.severity in ['critical', 'error'],
                        'text-warning': conflict.severity == 'warning'
                    })
                ], width=3),
                dbc.Col([
                    html.H6('优先级'),
                    html.P(conflict.priority)
                ], width=3),
                dbc.Col([
                    html.H6('状态'),
                    html.P(conflict.status)
                ], width=3),
            ]),
            
            html.H6('消息'),
            html.P(conflict.message, className='text-muted'),
            
            dbc.Row([
                dbc.Col([
                    html.H6('期望值'),
                    html.P(conflict.expected_value or '-')
                ], width=6),
                dbc.Col([
                    html.H6('实际值'),
                    html.P(conflict.actual_value or '-')
                ], width=6),
            ]),
            
            html.H6('来源记录'),
            html.Pre(json.dumps(conflict.source_records, indent=2, ensure_ascii=False), 
                    style={'background': '#f8f9fa', 'padding': '10px', 'borderRadius': '5px'}),
            
            html.Hr(),
            
            dbc.Row([
                dbc.Col([
                    dbc.Label('解决备注'),
                    dbc.Textarea(id='resolution-notes', rows=3, placeholder='输入解决备注...')
                ], width=8),
                dbc.Col([
                    dbc.Button('标记为已解决', id='resolve-conflict-btn', color='success', className='mt-4')
                ], width=4),
            ]),
            html.Div(id='resolve-result')
        ])

@callback(
    Output('resolve-result', 'children'),
    Input('resolve-conflict-btn', 'n_clicks'),
    State('conflicts-table', 'selected_rows'),
    State('conflicts-table', 'data'),
    State('resolution-notes', 'value')
)
def resolve_conflict(n_clicks, selected_rows, data, notes):
    if not n_clicks or not selected_rows or not notes:
        return ''
    
    conflict_data = data[selected_rows[0]]
    with server.app_context():
        success = validator.resolve_conflict(conflict_data['id'], notes, 'current_user')
    
    if success:
        return dbc.Alert('冲突已标记为解决', color='success')
    return dbc.Alert('解决失败', color='danger')

@callback(
    Output('annotation-image-select', 'options'),
    Input('annotation-batch-select', 'value')
)
def update_image_options(batch_id):
    if not batch_id:
        return []
    with server.app_context():
        images = annotator.get_annotated_images(batch_id)
        return [{'label': img['image_file'], 'value': img['image_file']} for img in images]

@callback(
    Output('image-display', 'children'),
    Output('existing-annotations', 'children'),
    Input('annotation-image-select', 'value'),
    State('annotation-batch-select', 'value')
)
def display_image(image_file, batch_id):
    if not image_file or not batch_id:
        return html.P('请选择批次和图片'), ''
    
    with server.app_context():
        annotations = annotator.get_annotations(batch_id, image_file)
        img_path = os.path.join(Config.UPLOAD_FOLDER, image_file)
        annotated_path = annotator.render_annotated_image(img_path)
        
        if annotated_path and os.path.exists(annotated_path):
            with open(annotated_path, 'rb') as f:
                encoded = base64.b64encode(f.read()).decode()
            img_src = f'data:image/png;base64,{encoded}'
        else:
            img_src = ''
    
    annotations_list = html.Div([
        html.H6(f'标注数量: {len(annotations)}'),
        html.Ul([
            html.Li([
                html.Strong(f"[{ann.annotation_type}] "),
                f"{ann.label or '无标签'} ",
                html.Small(f"({ann.x}, {ann.y})", className='text-muted'),
                html.Br(),
                html.Small(ann.notes or '', className='text-muted')
            ]) for ann in annotations
        ])
    ])
    
    if img_src:
        return html.Img(src=img_src, style={'maxWidth': '100%'}), annotations_list
    return html.P('图片不存在'), annotations_list

@callback(
    Output('add-annotation-btn', 'n_clicks'),
    Input('add-annotation-btn', 'n_clicks'),
    State('annotation-batch-select', 'value'),
    State('annotation-image-select', 'value'),
    State('annotation-type', 'value'),
    State('annotation-label', 'value'),
    State('annotation-x', 'value'),
    State('annotation-y', 'value'),
    State('annotation-width', 'value'),
    State('annotation-height', 'value'),
    State('annotation-notes', 'value'),
    prevent_initial_call=True
)
def add_annotation(n_clicks, batch_id, image_file, ann_type, label, x, y, width, height, notes):
    if not all([batch_id, image_file, x is not None, y is not None, width, height]):
        return n_clicks
    
    with server.app_context():
        annotator.add_annotation(
            batch_id=batch_id,
            image_file=image_file,
            annotation_type=ann_type,
            x=x, y=y, width=width, height=height,
            label=label,
            notes=notes,
            created_by='current_user'
        )
    return n_clicks

@callback(
    Output('pedigree-generate-result', 'children'),
    Input('generate-pedigree-btn', 'n_clicks'),
    State('pedigree-batch-select', 'value')
)
def generate_pedigree(n_clicks, batch_id):
    if not n_clicks or not batch_id:
        return ''
    
    with server.app_context():
        output_path = annotator.create_pedigree_visualization(batch_id)
    
    if output_path:
        return dbc.Alert([
            html.H5('家系图生成成功！'),
            html.P(f'保存路径: {output_path}'),
            html.A('打开文件', href=f'/exports/{os.path.basename(output_path)}', target='_blank')
        ], color='success')
    return dbc.Alert('家系图生成失败，请确保该批次有家系数据', color='warning')

@callback(
    Output('export-result', 'children'),
    Input('export-button', 'n_clicks'),
    State('export-batch-select', 'value'),
    State('export-formats', 'value')
)
def run_export(n_clicks, batch_id, formats):
    if not n_clicks or not batch_id or not formats:
        return ''
    
    with server.app_context():
        try:
            include_images = 'images' in formats
            
            if 'excel' in formats:
                excel_result = exporter.export_to_excel(batch_id)
            
            if 'pdf' in formats:
                pdf_result = exporter.export_to_pdf(batch_id)
            
            result = {'success': True}
            if 'excel' in formats:
                result['excel'] = excel_result
            if 'pdf' in formats:
                result['pdf'] = pdf_result
        except Exception as e:
            return dbc.Alert(f'导出失败: {str(e)}', color='danger')
    
    children = [html.H5('导出成功！')]
    if 'excel' in formats and result.get('excel'):
        children.append(html.P([
            'Excel: ',
            html.A(result['excel']['file_name'], 
                   href=f'/exports/{result["excel"]["file_name"]}', target='_blank'),
            f" ({round(result['excel']['file_size'] / 1024, 2)} KB)"
        ]))
    if 'pdf' in formats and result.get('pdf'):
        children.append(html.P([
            'PDF: ',
            html.A(result['pdf']['file_name'], 
                   href=f'/exports/{result["pdf"]["file_name"]}', target='_blank'),
            f" ({round(result['pdf']['file_size'] / 1024, 2)} KB)"
        ]))
    
    return dbc.Alert(children, color='success')

@callback(
    Output('usability-result', 'children'),
    Input('view-usability-btn', 'n_clicks'),
    State('usability-batch-select', 'value')
)
def show_usability(n_clicks, batch_id):
    if not n_clicks or not batch_id:
        return ''
    
    with server.app_context():
        usability = dashboard.get_usability_assessment(batch_id)
    
    if not usability.get('assessment'):
        return dbc.Alert('获取评估失败', color='danger')
    
    color_map = {
        'ready': 'success',
        'review': 'warning',
        'not_ready': 'danger'
    }
    
    details = usability['details']
    
    return html.Div([
        dbc.Alert([
            html.H4(usability['assessment_label']),
            html.P(usability['primary_issue']),
            html.Hr(),
            dbc.Row([
                dbc.Col([
                    html.H5(f'✅ 可以直接使用 ({len(details["ready_samples"])})'),
                    dash_table.DataTable(
                        columns=[
                            {'name': '样本ID', 'id': 'sample_id'},
                            {'name': '姓名', 'id': 'name'},
                            {'name': '性别', 'id': 'gender'},
                            {'name': '来源', 'id': 'source'},
                        ],
                        data=details['ready_samples'],
                        style_table={'overflowX': 'auto'},
                        page_size=5,
                        style_header={'backgroundColor': '#dcfce7', 'fontWeight': 'bold'}
                    )
                ], width=12, className='mb-3'),
            ]),
            
            dbc.Row([
                dbc.Col([
                    html.H5(f'⚠️ 需要复核 ({len(details["needs_review_samples"])})'),
                    dash_table.DataTable(
                        columns=[
                            {'name': '样本ID', 'id': 'sample_id'},
                            {'name': '姓名', 'id': 'name'},
                            {'name': '性别', 'id': 'gender'},
                            {'name': '来源', 'id': 'source'},
                            {'name': '问题', 'id': 'issues_str'},
                        ],
                        data=[{**s, 'issues_str': '; '.join(s['issues'])} 
                              for s in details['needs_review_samples']],
                        style_table={'overflowX': 'auto'},
                        page_size=5,
                        style_header={'backgroundColor': '#fef3c7', 'fontWeight': 'bold'}
                    )
                ], width=12, className='mb-3'),
            ]),
            
            dbc.Row([
                dbc.Col([
                    html.H5(f'❌ 不能使用 ({len(details["not_usable_samples"])})'),
                    dash_table.DataTable(
                        columns=[
                            {'name': '样本ID', 'id': 'sample_id'},
                            {'name': '姓名', 'id': 'name'},
                            {'name': '性别', 'id': 'gender'},
                            {'name': '来源', 'id': 'source'},
                            {'name': '问题', 'id': 'issues_str'},
                        ],
                        data=[{**s, 'issues_str': '; '.join(s['issues'])} 
                              for s in details['not_usable_samples']],
                        style_table={'overflowX': 'auto'},
                        page_size=5,
                        style_header={'backgroundColor': '#fee2e2', 'fontWeight': 'bold'},
                        style_data={'backgroundColor': '#fff5f5'}
                    )
                ], width=12),
            ]),
        ], color=color_map[usability['assessment']])
    ])

@server.route('/exports/<filename>')
def download_export(filename):
    return send_from_directory(Config.EXPORT_FOLDER, filename, as_attachment=True)

@server.route('/uploads/<filename>')
def download_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run_server(debug=True, port=8050)
