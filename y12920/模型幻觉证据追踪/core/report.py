import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import pandas as pd
from jinja2 import Template

from .models import (
    HallucinationRecord,
    RecordStatus,
    GroupMetric,
    SafetyCheckResult,
    PromptVersion,
)


class ReportExporter:
    def __init__(self, export_dir: Optional[str] = None):
        if export_dir is None:
            export_dir = Path(__file__).parent.parent / "data" / "exports"
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def _generate_business_summary(self, records: List[HallucinationRecord]) -> Dict[str, Any]:
        total = len(records)
        clean = sum(1 for r in records if r.status == RecordStatus.CONFIRMED_CLEAN)
        pending = sum(1 for r in records if r.status == RecordStatus.PENDING_REVIEW)
        hallucination = sum(1 for r in records if r.status == RecordStatus.HALLUCINATION)
        duplicate = sum(1 for r in records if r.status == RecordStatus.DUPLICATE)
        blocked = sum(1 for r in records if r.status == RecordStatus.SAFETY_BLOCKED)

        hallucination_rate = round(hallucination / total * 100, 2) if total > 0 else 0.0
        available_rate = round(clean / total * 100, 2) if total > 0 else 0.0
        needs_review_rate = round((pending + blocked + hallucination) / total * 100, 2) if total > 0 else 0.0

        return {
            "total_records": total,
            "can_use_directly": clean,
            "available_rate": available_rate,
            "needs_engineer_review": pending + hallucination + blocked,
            "needs_review_rate": needs_review_rate,
            "hallucination_count": hallucination,
            "hallucination_rate": hallucination_rate,
            "duplicate_count": duplicate,
            "blocked_count": blocked,
            "pending_count": pending,
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    def _prepare_record_for_business(self, record: HallucinationRecord) -> Dict[str, Any]:
        business_status = record.get_business_status()

        hallucination_types_cn = {
            "factual_invention": "事实捏造",
            "entity_hallucination": "实体幻觉",
            "date_confusion": "日期混淆",
            "attribute_mismatch": "属性不匹配",
            "logical_contradiction": "逻辑矛盾",
            "reference_fabrication": "引用伪造",
            "unknown": "未知类型",
        }

        safety_issues = [
            {
                "check_name": c.check_name,
                "severity": c.severity,
                "message": c.message,
                "actionable_guidance": c.actionable_guidance,
            }
            for c in record.safety_checks
            if not c.passed
        ]

        return {
            "record_id": record.record_id,
            "input_query": record.input_query,
            "model_output": record.model_output,
            "expected_output": record.expected_output,
            "status_label": business_status["label"],
            "status_color": business_status["color"],
            "can_use_directly": business_status["can_use_directly"],
            "needs_engineer_review": business_status["needs_engineer_review"],
            "hallucination_types": [
                hallucination_types_cn.get(t.value, t.value)
                for t in record.hallucination_types
            ],
            "confidence_score": record.confidence_score,
            "source_count": len(record.source_materials),
            "safety_issues": safety_issues,
            "has_safety_issues": len(safety_issues) > 0,
            "group_tags": record.group_tags,
            "notes": record.notes,
            "created_at": record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": record.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def export_to_excel(self, records: List[HallucinationRecord],
                        metrics: Optional[List[GroupMetric]] = None,
                        filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"幻觉检测报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = self.export_dir / filename

        summary = self._generate_business_summary(records)

        business_records = [self._prepare_record_for_business(r) for r in records]
        df_records = pd.DataFrame(business_records)

        status_order = [
            "✅ 可直接使用",
            "⏳ 待工程师复核",
            "❌ 存在幻觉",
            "🔄 重复样本",
            "🛡️ 安全拦截",
        ]
        df_records["status_order"] = df_records["status_label"].apply(
            lambda x: status_order.index(x) if x in status_order else 99
        )
        df_records = df_records.sort_values("status_order").drop("status_order", axis=1)

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            summary_data = {
                "指标": [
                    "样本总数",
                    "可直接使用",
                    "可用率",
                    "需工程师复核",
                    "待复核比例",
                    "存在幻觉",
                    "幻觉率",
                    "重复样本",
                    "安全拦截",
                    "待确认",
                    "导出时间",
                ],
                "数值": [
                    summary["total_records"],
                    summary["can_use_directly"],
                    f"{summary['available_rate']}%",
                    summary["needs_engineer_review"],
                    f"{summary['needs_review_rate']}%",
                    summary["hallucination_count"],
                    f"{summary['hallucination_rate']}%",
                    summary["duplicate_count"],
                    summary["blocked_count"],
                    summary["pending_count"],
                    summary["export_time"],
                ],
            }
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, sheet_name="概览", index=False)

            display_columns = [
                "status_label", "can_use_directly", "needs_engineer_review",
                "record_id", "input_query", "model_output",
                "hallucination_types", "confidence_score", "source_count",
                "has_safety_issues", "group_tags", "notes", "updated_at",
            ]
            df_display = df_records[display_columns].rename(columns={
                "status_label": "状态",
                "can_use_directly": "可直接使用",
                "needs_engineer_review": "需工程师复核",
                "record_id": "记录ID",
                "input_query": "输入查询",
                "model_output": "模型输出",
                "hallucination_types": "幻觉类型",
                "confidence_score": "置信度",
                "source_count": "来源材料数",
                "has_safety_issues": "有安全问题",
                "group_tags": "分组标签",
                "notes": "备注",
                "updated_at": "更新时间",
            })
            df_display.to_excel(writer, sheet_name="详细记录", index=False)

            if metrics:
                metrics_data = []
                for m in metrics:
                    metrics_data.append({
                        "分组维度": m.group_dimension,
                        "分组名称": m.group_name,
                        "样本总数": m.total_records,
                        "可直接使用": m.clean_count,
                        "存在幻觉": m.hallucination_count,
                        "待确认": m.pending_count,
                        "重复样本": m.duplicate_count,
                        "安全拦截": m.blocked_count,
                        "幻觉率(%)": m.hallucination_rate,
                    })
                df_metrics = pd.DataFrame(metrics_data)
                df_metrics.to_excel(writer, sheet_name="分组指标", index=False)

        return str(filepath)

    def export_to_json(self, records: List[HallucinationRecord],
                       metrics: Optional[List[GroupMetric]] = None,
                       include_safety_details: bool = True,
                       filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"幻觉检测报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self.export_dir / filename

        report = {
            "summary": self._generate_business_summary(records),
            "records": [self._prepare_record_for_business(r) for r in records],
        }

        if metrics:
            report["metrics"] = [m.model_dump() for m in metrics]

        if include_safety_details:
            report["safety_guidance"] = {
                "how_to_read": (
                    "【使用说明】\n"
                    "✅ 绿色标记的记录可以直接使用\n"
                    "⏳ 橙色标记的记录需要模型训练工程师复核\n"
                    "❌ 红色标记的记录存在幻觉，请不要直接使用\n"
                    "🔄 蓝色标记的是重复样本，以第一条为准\n"
                    "🛡️ 紫色标记的被安全拦截，存在数据风险"
                ),
                "escalation_contact": "模型训练工程师",
                "escalation_reason": "橙色/红色/紫色状态的记录需要专业人员复核",
            }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)

        return str(filepath)

    def export_to_html(self, records: List[HallucinationRecord],
                       metrics: Optional[List[GroupMetric]] = None,
                       prompt_versions: Optional[List[PromptVersion]] = None,
                       filename: Optional[str] = None) -> str:
        if filename is None:
            filename = f"幻觉检测报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = self.export_dir / filename

        template_str = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>模型幻觉证据追踪报告</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .subtitle { opacity: 0.9; }
        .status-legend { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
        .legend-item { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .summary-card .label { font-size: 14px; color: #666; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: bold; }
        .summary-card .value.green { color: #10b981; }
        .summary-card .value.orange { color: #f59e0b; }
        .summary-card .value.red { color: #ef4444; }
        .section { background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .section h2 { font-size: 20px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; }
        .record { padding: 15px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid; }
        .record.clean { border-color: #10b981; background: #f0fdf4; }
        .record.pending { border-color: #f59e0b; background: #fffbeb; }
        .record.hallucination { border-color: #ef4444; background: #fef2f2; }
        .record.duplicate { border-color: #3b82f6; background: #eff6ff; }
        .record.blocked { border-color: #8b5cf6; background: #faf5ff; }
        .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .record-title { font-weight: 600; font-size: 16px; }
        .record-status { font-size: 13px; padding: 4px 10px; border-radius: 4px; font-weight: 500; }
        .record-status.clean { background: #d1fae5; color: #065f46; }
        .record-status.pending { background: #fde68a; color: #92400e; }
        .record-status.hallucination { background: #fecaca; color: #991b1b; }
        .record-status.duplicate { background: #bfdbfe; color: #1e40af; }
        .record-status.blocked { background: #ddd6fe; color: #5b21b6; }
        .record-field { margin-bottom: 8px; }
        .record-field .label { font-size: 12px; color: #666; margin-bottom: 3px; }
        .record-field .value { font-size: 14px; line-height: 1.6; }
        .record-tag { display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; margin-right: 4px; }
        .safety-issue { background: #fee2e2; border-left: 3px solid #ef4444; padding: 10px; margin-top: 8px; border-radius: 4px; }
        .safety-issue .severity { font-weight: 600; margin-bottom: 4px; }
        .safety-issue .guidance { font-size: 13px; color: #666; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f9fafb; font-weight: 600; }
        .rate-high { color: #ef4444; font-weight: 600; }
        .rate-low { color: #10b981; font-weight: 600; }
        .footer { text-align: center; color: #999; margin-top: 30px; padding: 20px; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 模型幻觉证据追踪报告</h1>
            <p class="subtitle">生成时间: {{ summary.export_time }}</p>
            <div class="status-legend">
                <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>可直接使用</div>
                <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>待工程师复核</div>
                <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>存在幻觉</div>
                <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>重复样本</div>
                <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>安全拦截</div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">样本总数</div>
                <div class="value">{{ summary.total_records }}</div>
            </div>
            <div class="summary-card">
                <div class="label">可直接使用</div>
                <div class="value green">{{ summary.can_use_directly }} <small style="font-size:16px">({{ summary.available_rate }}%)</small></div>
            </div>
            <div class="summary-card">
                <div class="label">需工程师复核</div>
                <div class="value orange">{{ summary.needs_engineer_review }} <small style="font-size:16px">({{ summary.needs_review_rate }}%)</small></div>
            </div>
            <div class="summary-card">
                <div class="label">幻觉率</div>
                <div class="value red">{{ summary.hallucination_rate }}%</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 详细记录</h2>
            {% for record in records %}
            <div class="record {{ record.status }}">
                <div class="record-header">
                    <span class="record-title">{{ record.input_query[:50] }}{% if record.input_query|length > 50 %}...{% endif %}</span>
                    <span class="record-status {{ record.status }}">{{ record.status_label }}</span>
                </div>
                <div class="record-field">
                    <div class="label">模型输出</div>
                    <div class="value">{{ record.model_output }}</div>
                </div>
                {% if record.expected_output %}
                <div class="record-field">
                    <div class="label">预期输出</div>
                    <div class="value">{{ record.expected_output }}</div>
                </div>
                {% endif %}
                {% if record.hallucination_types %}
                <div class="record-field">
                    <div class="label">幻觉类型</div>
                    <div class="value">
                        {% for t in record.hallucination_types %}
                        <span class="record-tag">{{ t }}</span>
                        {% endfor %}
                    </div>
                </div>
                {% endif %}
                {% if record.confidence_score > 0 %}
                <div class="record-field">
                    <div class="label">置信度</div>
                    <div class="value">{{ record.confidence_score }}%</div>
                </div>
                {% endif %}
                <div class="record-field">
                    <div class="label">来源材料</div>
                    <div class="value">{{ record.source_count }} 份</div>
                </div>
                {% for issue in record.safety_issues %}
                <div class="safety-issue">
                    <div class="severity">【{{ issue.severity.upper() }}】{{ issue.message }}</div>
                    {% if issue.actionable_guidance %}
                    <div class="guidance">👉 {{ issue.actionable_guidance|replace('\n', '<br>') }}</div>
                    {% endif %}
                </div>
                {% endfor %}
                {% if record.notes %}
                <div class="record-field">
                    <div class="label">备注</div>
                    <div class="value">{{ record.notes }}</div>
                </div>
                {% endif %}
                <div style="font-size:12px; color:#999; margin-top:8px;">
                    ID: {{ record.record_id }} | 更新时间: {{ record.updated_at }}
                </div>
            </div>
            {% endfor %}
        </div>

        {% if metrics %}
        <div class="section">
            <h2>📊 分组指标</h2>
            <table>
                <thead>
                    <tr>
                        <th>分组维度</th>
                        <th>分组名称</th>
                        <th>样本数</th>
                        <th>可直接使用</th>
                        <th>存在幻觉</th>
                        <th>幻觉率</th>
                    </tr>
                </thead>
                <tbody>
                    {% for m in metrics %}
                    <tr>
                        <td>{{ m.group_dimension }}</td>
                        <td>{{ m.group_name }}</td>
                        <td>{{ m.total_records }}</td>
                        <td>{{ m.clean_count }}</td>
                        <td>{{ m.hallucination_count }}</td>
                        <td class="{% if m.hallucination_rate > 10 %}rate-high{% else %}rate-low{% endif %}">
                            {{ m.hallucination_rate }}%
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        {% endif %}

        <div class="footer">
            <p>📌 业务方使用指南：绿色标记可直接使用，其他状态请联系模型训练工程师复核</p>
            <p>生成时间: {{ summary.export_time }}</p>
        </div>
    </div>
</body>
</html>
        """

        summary = self._generate_business_summary(records)
        business_records = [self._prepare_record_for_business(r) for r in records]

        status_map = {
            "confirmed_clean": "clean",
            "pending_review": "pending",
            "hallucination": "hallucination",
            "duplicate": "duplicate",
            "safety_blocked": "blocked",
        }
        for r in business_records:
            r["status"] = status_map.get(records[business_records.index(r)].status.value, "pending")

        template = Template(template_str)
        html_content = template.render(
            summary=summary,
            records=business_records,
            metrics=metrics,
            prompt_versions=prompt_versions,
        )

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)

        return str(filepath)

    def get_available_exports(self) -> List[Dict[str, Any]]:
        exports = []
        for file_path in self.export_dir.glob("*"):
            if file_path.is_file():
                exports.append({
                    "filename": file_path.name,
                    "filepath": str(file_path),
                    "size_kb": round(file_path.stat().st_size / 1024, 2),
                    "created_at": datetime.fromtimestamp(file_path.stat().st_ctime),
                    "format": file_path.suffix.lstrip(".").upper(),
                })
        return sorted(exports, key=lambda x: x["created_at"], reverse=True)
