import os
from typing import Dict, List
from datetime import datetime
import pandas as pd
from dataclasses import asdict

from .data_models import AnalysisRecord, DifficultyLevel, ConflictType
from .sample_data import get_conflict_type_descriptions


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>蒸馏样本难度分层分析报告</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -20%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            border-radius: 50%;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
        }
        
        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
        }
        
        .header .meta {
            display: flex;
            gap: 30px;
            margin-top: 20px;
            position: relative;
        }
        
        .header .meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .header .meta-label {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .header .meta-value {
            font-size: 18px;
            font-weight: 600;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 50px;
        }
        
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
            padding-left: 15px;
            border-left: 5px solid #3b82f6;
        }
        
        .section-intro {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            color: #475569;
            font-size: 15px;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, var(--card-color) 0%, var(--card-color-dark) 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
        }
        
        .summary-card::before {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            transform: translate(30%, -30%);
        }
        
        .summary-card .label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .summary-card .value {
            font-size: 36px;
            font-weight: 700;
        }
        
        .summary-card .desc {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
        
        .chart-container {
            background: #f8fafc;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
        }
        
        .chart-container img {
            width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .chart-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 15px;
        }
        
        .chart-description {
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            color: #1e40af;
            font-size: 14px;
            border-left: 4px solid #3b82f6;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        th {
            background: #1e3a8a;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            color: #334155;
        }
        
        tr:hover {
            background: #f8fafc;
        }
        
        .tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 5px;
            margin-bottom: 5px;
        }
        
        .tag-easy {
            background: #dcfce7;
            color: #166534;
        }
        
        .tag-medium {
            background: #fef3c7;
            color: #92400e;
        }
        
        .tag-hard {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .tag-extreme {
            background: #ede9fe;
            color: #5b21b6;
        }
        
        .tag-conflict {
            background: #fef2f2;
            color: #991b1b;
        }
        
        .tag-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .tag-info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .detail-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .detail-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-card-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .detail-card-meta {
            color: #64748b;
            font-size: 13px;
        }
        
        .detail-section {
            margin-bottom: 15px;
        }
        
        .detail-section-label {
            font-weight: 600;
            color: #475569;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .detail-section-content {
            color: #334155;
            font-size: 14px;
            line-height: 1.8;
        }
        
        .conflict-item {
            background: #fef2f2;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 4px solid #ef4444;
        }
        
        .source-trace {
            background: #f0fdf4;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 4px solid #22c55e;
        }
        
        .compare-table {
            background: #f8fafc;
        }
        
        .compare-table th {
            background: #475569;
        }
        
        .changed {
            background: #fef2f2 !important;
            color: #dc2626;
            font-weight: 600;
        }
        
        .unchanged {
            background: #f0fdf4 !important;
            color: #16a34a;
        }
        
        .legend {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 10px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #475569;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
        }
        
        .footer {
            background: #1e293b;
            color: #94a3b8;
            padding: 30px 40px;
            text-align: center;
            font-size: 13px;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 5px solid #f59e0b;
        }
        
        .highlight-box h4 {
            color: #92400e;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .highlight-box p {
            color: #78350f;
            font-size: 14px;
        }
        
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        @media (max-width: 768px) {
            .two-column {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 蒸馏样本难度分层分析报告</h1>
            <p class="subtitle">自动化检测样本质量问题，为安全审核提供清晰指引</p>
            <div class="meta">
                <div class="meta-item">
                    <span class="meta-label">生成时间</span>
                    <span class="meta-value">{{ generate_time }}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">分析样本数</span>
                    <span class="meta-value">{{ total_samples }} 条</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">发现问题数</span>
                    <span class="meta-value">{{ total_issues }} 个</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">需要人工审核</span>
                    <span class="meta-value">{{ need_review }} 条</span>
                </div>
            </div>
        </div>
        
        <div class="content">
            
            <div class="section">
                <h2 class="section-title">📋 整体概览</h2>
                <div class="section-intro">
                    本报告通过对比模型日志、安全规则、训练样本三种数据源，自动识别出数据不一致、规则漏配等问题。
                    所有结论都配有原始数据溯源，方便安全审核员快速定位问题。
                </div>
                
                <div class="summary-cards">
                    {% for card in summary_cards %}
                    <div class="summary-card" style="--card-color: {{ card.color }}; --card-color-dark: {{ card.color_dark }};">
                        <div class="label">{{ card.label }}</div>
                        <div class="value">{{ card.value }}</div>
                        <div class="desc">{{ card.desc }}</div>
                    </div>
                    {% endfor %}
                </div>
                
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background: #22c55e;"></div>
                        <span>简单：可自动处理</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f59e0b;"></div>
                        <span>中等：需要关注</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #ef4444;"></div>
                        <span>困难：建议人工审核</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #7c3aed;"></div>
                        <span>极难：必须人工处理</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">📈 难度分布分析</h2>
                <div class="section-intro">
                    下图展示了所有样本的难度分层情况。难度越高，意味着数据存在的问题越多、越复杂，需要投入更多的审核精力。
                </div>
                
                <div class="two-column">
                    <div class="chart-container">
                        <div class="chart-title">图1：各难度等级样本占比</div>
                        <img src="data:image/png;base64,{{ charts.difficulty_pie }}" alt="难度分布饼图">
                        <div class="chart-description">
                            <strong>看图说明：</strong>饼图显示各个难度等级的样本占比。如果困难和极难的比例过高，说明当前数据质量存在较大问题，建议先进行数据清洗再用于模型训练。
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-title">图2：各样本具体难度分值</div>
                        <img src="data:image/png;base64,{{ charts.difficulty_score }}" alt="难度分值图">
                        <div class="chart-description">
                            <strong>看图说明：</strong>横向条形图展示每条样本的具体难度分值（0-100分）。
                            三条虚线分别是简单/中等（20分）、中等/困难（40分）、困难/极难（65分）的分界线。
                            分值越高的样本越需要优先处理。
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">⚠️ 问题类型分析</h2>
                <div class="section-intro">
                    系统自动识别了6种常见的数据质量问题。了解问题分布有助于针对性地改进数据采集和标注流程。
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">图3：各类问题出现频次统计</div>
                    <img src="data:image/png;base64,{{ charts.conflict_bar }}" alt="问题类型柱状图">
                    <div class="chart-description">
                        <strong>看图说明：</strong>柱状图展示每种问题类型出现的次数。
                        柱子越高说明这种问题越普遍，需要重点关注和优化。
                    </div>
                </div>
                
                <div class="highlight-box">
                    <h4>📖 问题类型说明</h4>
                    <p><strong>标签不一致：</strong>同一份内容，人工标注和模型判断给出了不同的结论，说明标注标准可能不统一。</p>
                    <p><strong>安全规则漏配：</strong>内容涉及敏感领域，但没有匹配到对应的安全审核规则，可能存在审核漏洞。</p>
                    <p><strong>单位漏填：</strong>金额、重量、数量等数值后面漏掉了计量单位（如元、万元、克等），可能导致判断错误。</p>
                    <p><strong>旧表格式：</strong>数据是从旧系统迁移过来的，字段格式和新系统不匹配，需要额外处理。</p>
                    <p><strong>补录备注：</strong>原始信息不完整，重要内容是后面在备注里补充的，可能存在信息遗漏风险。</p>
                    <p><strong>重复样本：</strong>有多条记录内容完全一样，但可能标注不同，需要去重处理。</p>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">🔍 安全规则覆盖情况</h2>
                <div class="section-intro">
                    安全规则是保障内容安全的第一道防线。这里展示了各条安全规则的匹配和漏配情况。
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">图4：安全规则匹配与漏配对比</div>
                    <img src="data:image/png;base64,{{ charts.safety_rule_coverage }}" alt="安全规则覆盖图">
                    <div class="chart-description">
                        <strong>看图说明：</strong>每种规则对应两根柱子，绿色表示规则已正确匹配的样本数，红色表示规则应该匹配但实际漏配的样本数。
                        红色柱子越高，说明这条规则的覆盖能力越需要加强。
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">🔄 标签冲突溯源</h2>
                <div class="section-intro">
                    当人工标注和模型判断不一致时，需要追溯冲突来源，找出是哪份材料出了问题。
                </div>
                
                {% if charts.label_conflict_sankey %}
                <div class="chart-container">
                    <div class="chart-title">图5：标签冲突溯源路径</div>
                    <img src="data:image/png;base64,{{ charts.label_conflict_sankey }}" alt="标签冲突桑基图">
                    <div class="chart-description">
                        <strong>看图说明：</strong>桑基图从左到右展示冲突的产生路径。
                        最左边是样本编号，中间绿色分支是人工标注的结果，右边红色分支是模型判断的结果。
                        两条线从同一样本分出不同方向，就说明这个样本存在标签冲突。
                    </div>
                </div>
                {% endif %}
                
                <h3 style="margin-top: 30px; margin-bottom: 15px; color: #1e293b;">表1：标签冲突明细</h3>
                <table>
                    <thead>
                        <tr>
                            <th>样本编号</th>
                            <th>人工标注</th>
                            <th>模型判断</th>
                            <th>冲突来源</th>
                            <th>处理建议</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for conflict in label_conflicts %}
                        <tr>
                            <td><strong>{{ conflict.sample_id }}</strong></td>
                            <td><span class="tag tag-easy">{{ conflict.training_label }}</span></td>
                            <td><span class="tag tag-hard">{{ conflict.model_label }}</span></td>
                            <td>
                                {% for source in conflict.sources %}
                                <div class="source-trace">{{ source }}</div>
                                {% endfor %}
                            </td>
                            <td>{{ conflict.suggestion }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">🔁 样本去重前后对比</h2>
                <div class="section-intro">
                    重复数据会干扰模型训练效果。系统自动检测重复样本，并展示去重前后的变化。
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">图6：去重前后难度分布对比</div>
                    <img src="data:image/png;base64,{{ charts.dedup_comparison }}" alt="去重对比图">
                    <div class="chart-description">
                        <strong>看图说明：</strong>左右两个饼图分别展示去重前和去重后的难度分布。
                        如果去重后困难和极难样本的比例明显下降，说明重复数据确实是影响数据质量的重要因素。
                    </div>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px; color: #1e293b;">表2：去重前后标签变化对比</h3>
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>样本编号</th>
                            <th>去重前标签</th>
                            <th>去重后标签</th>
                            <th>去重前难度</th>
                            <th>去重后难度</th>
                            <th>变化原因</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for row in dedup_comparison %}
                        <tr class="{% if row.标签是否变化 %}changed{% else %}unchanged{% endif %}">
                            <td><strong>{{ row.样本编号 }}</strong></td>
                            <td>{{ row.去重前标签 }}</td>
                            <td>{{ row.去重后标签 }}</td>
                            <td>{{ row.去重前难度 }}</td>
                            <td>{{ row.去重后难度 }}</td>
                            <td>{{ row.变化原因 }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">📝 评测回放记录</h2>
                <div class="section-intro">
                    记录安全审核员的人工复核过程，展示哪些样本的判断在复核后发生了改变。
                </div>
                
                <h3 style="margin-top: 20px; margin-bottom: 15px; color: #1e293b;">表3：评测回放记录</h3>
                <table>
                    <thead>
                        <tr>
                            <th>评测编号</th>
                            <th>样本编号</th>
                            <th>原始判断</th>
                            <th>复核后判断</th>
                            <th>是否改变</th>
                            <th>改变原因</th>
                            <th>复核人</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for eval in evaluation_records %}
                        <tr>
                            <td>{{ eval.record_id }}</td>
                            <td>{{ eval.sample_id }}</td>
                            <td>{{ eval.original_judgment }}</td>
                            <td>{{ eval.reviewed_judgment }}</td>
                            <td>
                                {% if eval.judgment_changed %}
                                <span class="tag tag-warning">是 ✅</span>
                                {% else %}
                                <span class="tag tag-info">否</span>
                                {% endif %}
                            </td>
                            <td>{{ eval.change_reason }}</td>
                            <td>{{ eval.reviewer }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">🔍 重点样本详细分析</h2>
                <div class="section-intro">
                    以下是被评为"困难"或"极难"的重点样本，每条都附有详细的问题说明和溯源信息。
                </div>
                
                {% for record in hard_records %}
                <div class="detail-card">
                    <div class="detail-card-header">
                        <div>
                            <div class="detail-card-title">
                                样本 {{ record.sample_id }}
                                <span class="tag tag-{{ record.difficulty_class }}">{{ record.difficulty }}</span>
                                <span class="tag tag-info">难度分: {{ record.score }}分</span>
                            </div>
                            <div class="detail-card-meta">
                                来源材料：{{ record.source_materials | join(' · ') }}
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-section-label">📄 样本原文</div>
                        <div class="detail-section-content" style="background: #f8fafc; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace;">
                            {{ record.content }}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-section-label">⚠️ 发现的问题</div>
                        <div class="detail-section-content">
                            {% for issue in record.issues %}
                            <div class="conflict-item">{{ issue }}</div>
                            {% endfor %}
                        </div>
                    </div>
                    
                    {% if record.label_sources %}
                    <div class="detail-section">
                        <div class="detail-section-label">🔗 标签冲突来源</div>
                        <div class="detail-section-content">
                            {% for source in record.label_sources %}
                            <div class="source-trace">{{ source }}</div>
                            {% endfor %}
                        </div>
                    </div>
                    {% endif %}
                    
                    {% if record.safety_missing %}
                    <div class="detail-section">
                        <div class="detail-section-label">🛡️ 漏配的安全规则</div>
                        <div class="detail-section-content">
                            {% for rule in record.safety_missing %}
                            <span class="tag tag-warning">{{ rule }}</span>
                            {% endfor %}
                            <p style="margin-top: 10px; color: #92400e; font-size: 13px;">
                                原因：这些规则的检查字段在模型日志中没有正确填写，导致规则失效
                            </p>
                        </div>
                    </div>
                    {% endif %}
                    
                    {% if record.safety_matched %}
                    <div class="detail-section">
                        <div class="detail-section-label">✅ 已正确匹配的安全规则</div>
                        <div class="detail-section-content">
                            {% for rule in record.safety_matched %}
                            <span class="tag tag-easy">{{ rule }}</span>
                            {% endfor %}
                        </div>
                    </div>
                    {% endif %}
                    
                    {% if record.is_duplicate %}
                    <div class="detail-section">
                        <div class="detail-section-label">🔄 重复信息</div>
                        <div class="detail-section-content">
                            <span class="tag tag-conflict">与样本 {{ record.duplicate_of }} 重复</span>
                        </div>
                    </div>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
            
            <div class="section">
                <h2 class="section-title">📋 安全规则清单</h2>
                <div class="section-intro">
                    本次分析涉及的所有安全规则及其详细说明，供参考对照。
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>规则编号</th>
                            <th>规则名称</th>
                            <th>规则说明</th>
                            <th>所属类别</th>
                            <th>风险等级</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for rule in safety_rules %}
                        <tr>
                            <td><strong>{{ rule.rule_id }}</strong></td>
                            <td>{{ rule.rule_name }}</td>
                            <td>{{ rule.description }}</td>
                            <td>{{ rule.category }}</td>
                            <td>
                                {% if rule.risk_level == '高风险' %}
                                <span class="tag tag-hard">{{ rule.risk_level }}</span>
                                {% elif rule.risk_level == '中风险' %}
                                <span class="tag tag-medium">{{ rule.risk_level }}</span>
                                {% else %}
                                <span class="tag tag-easy">{{ rule.risk_level }}</span>
                                {% endif %}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            
        </div>
        
        <div class="footer">
            <p>本报告由蒸馏样本难度分层分析系统自动生成</p>
            <p>生成时间：{{ generate_time }} | 报告版本：v1.0</p>
        </div>
    </div>
</body>
</html>
"""


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def _get_difficulty_class(self, difficulty: str) -> str:
        mapping = {
            "简单": "easy",
            "中等": "medium",
            "困难": "hard",
            "极难": "extreme"
        }
        return mapping.get(difficulty, "medium")
    
    def _prepare_template_data(self, 
                              analysis_result: Dict, 
                              charts: Dict[str, str]) -> Dict:
        
        total_samples = len(analysis_result['kept_records'])
        total_issues = sum(len(r.conflicts) for r in analysis_result['after_dedup_records'])
        
        diff_dist = analysis_result['difficulty_distribution']
        need_review = diff_dist.get("困难", 0) + diff_dist.get("极难", 0)
        
        summary_cards = [
            {
                "label": "简单样本",
                "value": diff_dist.get("简单", 0),
                "desc": "可自动处理，无需人工干预",
                "color": "#22c55e",
                "color_dark": "#16a34a"
            },
            {
                "label": "中等样本",
                "value": diff_dist.get("中等", 0),
                "desc": "需要关注，建议抽查",
                "color": "#f59e0b",
                "color_dark": "#d97706"
            },
            {
                "label": "困难样本",
                "value": diff_dist.get("困难", 0),
                "desc": "问题较多，建议人工审核",
                "color": "#ef4444",
                "color_dark": "#dc2626"
            },
            {
                "label": "极难样本",
                "value": diff_dist.get("极难", 0),
                "desc": "问题复杂，必须人工处理",
                "color": "#7c3aed",
                "color_dark": "#6d28d9"
            }
        ]
        
        label_conflicts = []
        for record in analysis_result['after_dedup_records']:
            if record.label_conflict_sources:
                label_conflicts.append({
                    "sample_id": record.sample_id,
                    "training_label": record.raw_data['training_sample']['label'],
                    "model_label": record.raw_data['model_log']['prediction'],
                    "sources": record.label_conflict_sources,
                    "suggestion": "建议核对原始材料，统一标注标准"
                })
        
        dedup_df = analysis_result['playback'].get_dedup_comparison()
        dedup_comparison = dedup_df.to_dict('records') if not dedup_df.empty else []
        
        evaluation_records = []
        for eval_rec in analysis_result['playback'].evaluation_records:
            evaluation_records.append({
                "record_id": eval_rec.record_id,
                "sample_id": eval_rec.sample_id,
                "original_judgment": eval_rec.original_judgment,
                "reviewed_judgment": eval_rec.reviewed_judgment,
                "judgment_changed": eval_rec.judgment_changed,
                "change_reason": eval_rec.change_reason,
                "reviewer": eval_rec.reviewer
            })
        
        hard_records = []
        for record in analysis_result['after_dedup_records']:
            if record.difficulty in [DifficultyLevel.HARD, DifficultyLevel.EXTREME]:
                hard_records.append({
                    "sample_id": record.sample_id,
                    "difficulty": record.difficulty.value,
                    "difficulty_class": self._get_difficulty_class(record.difficulty.value),
                    "score": int(record.difficulty_score),
                    "content": record.raw_data['training_sample']['content'],
                    "issues": record.conflict_details,
                    "label_sources": record.label_conflict_sources,
                    "safety_missing": record.safety_rule_missing,
                    "safety_matched": record.safety_rule_matches,
                    "source_materials": record.source_materials,
                    "is_duplicate": record.is_duplicate,
                    "duplicate_of": record.duplicate_of
                })
        
        safety_rules_data = []
        for rule in analysis_result['safety_rules']:
            safety_rules_data.append({
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "description": rule.description,
                "category": rule.category,
                "risk_level": rule.risk_level
            })
        
        return {
            "generate_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_samples": total_samples,
            "total_issues": total_issues,
            "need_review": need_review,
            "summary_cards": summary_cards,
            "charts": charts,
            "label_conflicts": label_conflicts,
            "dedup_comparison": dedup_comparison,
            "evaluation_records": evaluation_records,
            "hard_records": hard_records,
            "safety_rules": safety_rules_data
        }
    
    def generate_html_report(self, 
                            analysis_result: Dict, 
                            charts: Dict[str, str],
                            filename: str = "蒸馏样本难度分层分析报告.html") -> str:
        
        from jinja2 import Template
        
        template = Template(HTML_TEMPLATE)
        template_data = self._prepare_template_data(analysis_result, charts)
        
        html_content = template.render(**template_data)
        
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return output_path
    
    def generate_excel_report(self,
                             analysis_result: Dict,
                             filename: str = "蒸馏样本难度分层分析结果.xlsx") -> str:
        
        output_path = os.path.join(self.output_dir, filename)
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            
            records_data = []
            for record in analysis_result['after_dedup_records']:
                records_data.append({
                    "样本编号": record.sample_id,
                    "难度等级": record.difficulty.value,
                    "难度分值": int(record.difficulty_score),
                    "问题类型": "、".join([c.value for c in record.conflicts]),
                    "问题说明": "；".join(record.conflict_details),
                    "已匹配安全规则": "、".join(record.safety_rule_matches) if record.safety_rule_matches else "无",
                    "漏配安全规则": "、".join(record.safety_rule_missing) if record.safety_rule_missing else "无",
                    "是否重复": "是" if record.is_duplicate else "否",
                    "重复样本编号": record.duplicate_of if record.duplicate_of else "",
                    "人工标注": record.raw_data['training_sample']['label'],
                    "模型判断": record.raw_data['model_log']['prediction'],
                    "标注人": record.raw_data['training_sample']['annotator'],
                    "样本内容": record.raw_data['training_sample']['content']
                })
            
            df_records = pd.DataFrame(records_data)
            df_records.to_excel(writer, sheet_name="样本分析明细", index=False)
            
            dedup_df = analysis_result['playback'].get_dedup_comparison()
            if not dedup_df.empty:
                dedup_df.to_excel(writer, sheet_name="去重前后对比", index=False)
            
            eval_data = []
            for eval_rec in analysis_result['playback'].evaluation_records:
                eval_data.append({
                    "评测编号": eval_rec.record_id,
                    "样本编号": eval_rec.sample_id,
                    "原始判断": eval_rec.original_judgment,
                    "复核后判断": eval_rec.reviewed_judgment,
                    "是否改变": "是" if eval_rec.judgment_changed else "否",
                    "改变原因": eval_rec.change_reason,
                    "复核人": eval_rec.reviewer,
                    "复核时间": eval_rec.review_time
                })
            
            if eval_data:
                df_eval = pd.DataFrame(eval_data)
                df_eval.to_excel(writer, sheet_name="评测回放记录", index=False)
            
            diff_dist = analysis_result['difficulty_distribution']
            summary_data = [
                {"统计项": "总样本数", "数值": len(analysis_result['kept_records'])},
                {"统计项": "简单样本", "数值": diff_dist.get("简单", 0)},
                {"统计项": "中等样本", "数值": diff_dist.get("中等", 0)},
                {"统计项": "困难样本", "数值": diff_dist.get("困难", 0)},
                {"统计项": "极难样本", "数值": diff_dist.get("极难", 0)},
                {"统计项": "需人工审核数", "数值": diff_dist.get("困难", 0) + diff_dist.get("极难", 0)},
                {"统计项": "移除重复样本数", "数值": len(analysis_result['removed_records'])}
            ]
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, sheet_name="数据汇总", index=False)
        
        return output_path
