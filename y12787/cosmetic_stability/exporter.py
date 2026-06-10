"""
导出模块
生成HTML和CSV格式报告，给不懂代码的人看
重点：空白对照缺失的原因别全是字段名和缩写，要用通俗语言
"""
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

from .models import AnomalyType
from .batch_manager import BatchManager
from .config import Config


TERM_EXPLANATIONS = {
    "空白对照缺失": "空白对照是指不含被测成分的对照样品，用于排除溶剂、基质等因素的干扰。缺失空白对照会导致含量测定结果的准确性无法验证。",
    "记录缺失": "必要的检验记录不完整，可能影响数据的可追溯性和可靠性。",
    "反应时间漏记": "检测反应的具体时间没有记录，系统无法确认该数据是否在规定时间内完成检测，不能判定为正常样例。",
    "数值异常": "检测数值与其他时间点相比明显偏离，可能提示检测误差或样品异常。",
    "单位漏填": "检测数值没有填写计量单位，数据完整性不足。",
    "时间矛盾": "记录的日期存在逻辑矛盾（如检验日期早于生产日期）。",
    "超出标准": "检测结果不符合质量标准的规定。",
    "含量降解率": "产品有效成分随时间下降的百分比，超过5%可能影响产品功效。",
    "有效期估算": "基于稳定性数据推算的产品保质期。",
    "线性回归法": "一种通过数据点拟合直线来预测变化趋势的统计方法。",
    "Z值": "衡量数值偏离平均值程度的统计量，Z>2.5表示显著偏离。",
}

ANOMALY_ADVICE = {
    AnomalyType.MISSING_BLANK_CONTROL: [
        "建议：核查该批次检测原始记录，确认空白对照是否确实未做",
        "如果空白对照未做，该批次含量数据的准确性需谨慎评估，建议补充试验",
        "如果是记录遗漏，请在系统中补录空白对照数据后重新计算"
    ],
    AnomalyType.MISSING_RECORD: [
        "建议：查找原始检验记录，补充缺失的信息",
        "对于反应时间漏记的数据，建议重新进行检测",
        "缺失记录的数据可能影响稳定性考察结论的可靠性"
    ],
    AnomalyType.ABNORMAL_VALUE: [
        "建议：复核该数据的检测过程和原始记录",
        "如确属检测误差，建议重新检测；如为真实异常，需分析原因",
        "异常值可能影响降解率计算和有效期推算"
    ],
    AnomalyType.OUT_OF_SPEC: [
        "建议：立即启动偏差调查程序",
        "检查生产过程、储存条件、检测方法等可能影响因素",
        "必要时进行复验，确认结果的真实性"
    ],
    AnomalyType.MISSING_UNIT: [
        "建议：根据检测方法补充正确的计量单位",
        "常用单位：含量(mg/g/%)、pH(pH)、微生物(CFU/g)、黏度(mPa·s)"
    ],
    AnomalyType.TIME_DISCREPANCY: [
        "建议：核对记录日期，纠正逻辑矛盾",
        "日期错误可能影响稳定性趋势分析的准确性"
    ]
}


class Exporter:
    """数据导出器"""

    def __init__(self, config: Config, batch_manager: BatchManager):
        self.config = config
        self.batch_manager = batch_manager
        self.explain_terms = config.get("export.explain_terms", True)
        self.anomaly_first = config.get("export.anomaly_report_first", True)

    def export_html(self, output_dir: str, batch_no: str = None) -> str:
        """导出HTML报告"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        if batch_no:
            filename = f"批次{batch_no}_稳定性报告_{datetime.now().strftime('%Y%m%d')}.html"
            html = self._generate_single_batch_html(batch_no)
        else:
            filename = f"化妆品稳定性台账汇总报告_{datetime.now().strftime('%Y%m%d')}.html"
            html = self._generate_summary_html()

        file_path = output_path / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html)

        return str(file_path)

    def export_csv(self, output_dir: str, batch_no: str = None) -> List[str]:
        """导出CSV报告"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        exported_files = []

        if batch_no:
            batches = [batch_no]
        else:
            batches = list(self.batch_manager.ledger.batches.keys())

        for bn in batches:
            trace = self.batch_manager.get_batch_trace(bn)
            if not trace:
                continue

            batch_file = output_path / f"批次{bn}_稳定性数据.csv"
            with open(batch_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)

                writer.writerow(["=== 批次基本信息 ==="])
                batch = trace["batch"]
                writer.writerow(["批次号", batch.batch_no])
                writer.writerow(["产品名称", batch.product_name])
                writer.writerow(["产品代码", batch.product_code])
                writer.writerow(["规格", batch.specification])
                writer.writerow(["生产日期", batch.manufacture_date])
                writer.writerow(["拟有效期", batch.expiry_date_candidate])
                writer.writerow(["生产厂家", batch.manufacturer])
                writer.writerow(["储存条件", batch.storage_condition.value])
                writer.writerow(["检验员", batch.inspector])
                writer.writerow(["备注", batch.remarks])
                writer.writerow([])

                writer.writerow(["=== 考察时间点 ==="])
                writer.writerow(["时间点", "检验日期", "温度(°C)", "湿度(%)", "检验员", "是否空白对照", "记录时间", "备注"])
                for tp in trace["test_points"]:
                    writer.writerow([
                        tp.time_point, tp.test_date,
                        tp.temperature if tp.temperature else "",
                        tp.humidity if tp.humidity else "",
                        tp.operator,
                        "是" if tp.is_blank_control else "否",
                        tp.record_time.strftime("%Y-%m-%d %H:%M") if tp.record_time else "",
                        tp.remarks
                    ])
                writer.writerow([])

                writer.writerow(["=== 检验结果 ==="])
                writer.writerow(["时间点", "项目名称", "项目代码", "测定值", "单位", "标准规定", "是否合格", "检验员", "检验日期", "备注", "补录说明"])
                for ti in trace["test_items"]:
                    writer.writerow([
                        ti.time_point, ti.item_name, ti.item_code,
                        ti.measured_value if ti.measured_value is not None else "",
                        ti.unit, ti.specification,
                        "合格" if ti.is_qualified else "不合格" if ti.is_qualified is False else "未判定",
                        ti.inspector, ti.inspection_date, ti.remarks, ti.supplementary_note
                    ])
                writer.writerow([])

                writer.writerow(["=== 稳定性计算结果 ==="])
                writer.writerow(["项目", "初始值", "终值", "变化率(%)", "半衰期(月)", "有效期估算", "是否符合", "计算方法", "备注"])
                for sr in trace["stability_results"]:
                    writer.writerow([
                        sr.item_name, sr.initial_value, sr.final_value,
                        sr.degradation_rate,
                        sr.half_life if sr.half_life else "",
                        sr.expiry_estimate if sr.expiry_estimate else "",
                        "是" if sr.is_conforming else "否",
                        sr.calculation_method, sr.remarks
                    ])
                writer.writerow([])

                writer.writerow(["=== 异常记录 ==="])
                writer.writerow(["异常ID", "异常类型", "严重程度", "描述", "位置", "状态", "处理意见", "处理人", "处理时间", "检测时间"])
                for anomaly in trace["anomalies"]:
                    writer.writerow([
                        anomaly.anomaly_id, anomaly.anomaly_type.value,
                        anomaly.severity, anomaly.description, anomaly.location,
                        anomaly.status.value, anomaly.handling_opinion,
                        anomaly.handler,
                        anomaly.handle_time.strftime("%Y-%m-%d %H:%M") if anomaly.handle_time else "",
                        anomaly.detected_time.strftime("%Y-%m-%d %H:%M")
                    ])
                writer.writerow([])

                writer.writerow(["=== 处理记录(追溯链) ==="])
                writer.writerow(["记录ID", "操作类型", "操作人", "时间", "输入文件", "输出文件", "关联异常", "备注"])
                for pr in trace["processing_records"]:
                    writer.writerow([
                        pr.record_id, pr.action, pr.operator,
                        pr.timestamp.strftime("%Y-%m-%d %H:%M"),
                        ";".join(pr.input_files),
                        ";".join(pr.output_files),
                        ";".join(pr.anomaly_ids),
                        pr.remarks
                    ])

            exported_files.append(str(batch_file))

        anomaly_file = output_path / "异常汇总.csv"
        with open(anomaly_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["异常ID", "批次号", "异常类型", "严重程度", "描述", "位置",
                            "状态", "处理意见", "处理人", "检测时间", "处理时间",
                            "关联处理记录ID", "通俗解释", "处理建议"])

            anomalies = self.batch_manager.list_anomalies()
            for anomaly in anomalies:
                explanation = self._get_explanation(anomaly.anomaly_type.value)
                advice = self._get_advice(anomaly.anomaly_type)
                writer.writerow([
                    anomaly.anomaly_id, anomaly.batch_no,
                    anomaly.anomaly_type.value, anomaly.severity,
                    anomaly.description, anomaly.location,
                    anomaly.status.value, anomaly.handling_opinion,
                    anomaly.handler,
                    anomaly.detected_time.strftime("%Y-%m-%d %H:%M"),
                    anomaly.handle_time.strftime("%Y-%m-%d %H:%M") if anomaly.handle_time else "",
                    anomaly.processing_record_id,
                    explanation,
                    "\n".join(advice)
                ])

        exported_files.append(str(anomaly_file))
        return exported_files

    def _generate_summary_html(self) -> str:
        """生成汇总HTML报告"""
        batches = self.batch_manager.list_batches()
        all_anomalies = self.batch_manager.list_anomalies()

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>化妆品稳定性台账汇总报告</title>
<style>
{self._get_css()}
</style>
</head>
<body>
<div class="container">
    <h1>化妆品稳定性台账汇总报告</h1>
    <p class="report-time">生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}</p>

    <div class="summary-cards">
        <div class="card">
            <div class="card-number">{len(batches)}</div>
            <div class="card-label">总批次数</div>
        </div>
        <div class="card card-warning">
            <div class="card-number">{len(all_anomalies)}</div>
            <div class="card-label">异常总数</div>
        </div>
        <div class="card card-danger">
            <div class="card-number">{sum(1 for a in all_anomalies if a.status.value == '待复核')}</div>
            <div class="card-label">待处理异常</div>
        </div>
        <div class="card card-danger">
            <div class="card-number">{sum(1 for a in all_anomalies if a.severity == '严重')}</div>
            <div class="card-label">严重异常</div>
        </div>
    </div>

    {self._generate_anomaly_summary_section(all_anomalies)}

    <h2>批次列表</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th>批次号</th>
                <th>产品名称</th>
                <th>规格</th>
                <th>生产日期</th>
                <th>储存条件</th>
                <th>异常数</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
"""

        for batch in batches:
            batch_anomalies = [a for a in all_anomalies if a.batch_no == batch.batch_no]
            anomaly_class = "anomaly-severe" if any(a.severity == "严重" for a in batch_anomalies) else \
                           "anomaly-normal" if batch_anomalies else ""
            html += f"""
            <tr class="{anomaly_class}">
                <td>{batch.batch_no}</td>
                <td>{batch.product_name}</td>
                <td>{batch.specification or '-'}</td>
                <td>{batch.manufacture_date or '-'}</td>
                <td>{batch.storage_condition.value}</td>
                <td class="{'text-danger' if batch_anomalies else ''}">{len(batch_anomalies)}</td>
                <td><a href="#batch-{batch.batch_no}">查看详情</a></td>
            </tr>
"""

        html += """
        </tbody>
    </table>
"""

        for batch in batches:
            html += self._generate_batch_detail_section(batch.batch_no)

        html += self._generate_term_explanation_section()
        html += "\n</div>\n</body>\n</html>"

        return html

    def _generate_single_batch_html(self, batch_no: str) -> str:
        """生成单批次HTML报告"""
        trace = self.batch_manager.get_batch_trace(batch_no)
        if not trace:
            return "<p>未找到该批次数据</p>"

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>批次{batch_no}稳定性报告</title>
<style>
{self._get_css()}
</style>
</head>
<body>
<div class="container">
    <h1>批次{batch_no}稳定性考察报告</h1>
    <p class="report-time">生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}</p>

    {self._generate_batch_detail_section(batch_no)}

    {self._generate_term_explanation_section()}
</div>
</body>
</html>
"""
        return html

    def _generate_batch_detail_section(self, batch_no: str) -> str:
        """生成批次详情HTML片段"""
        trace = self.batch_manager.get_batch_trace(batch_no)
        if not trace:
            return ""

        batch = trace["batch"]
        anomalies = trace["anomalies"]
        stability_results = trace["stability_results"]

        html = f"""
    <div class="batch-section" id="batch-{batch_no}">
        <h2>批次信息</h2>
        <table class="info-table">
            <tr><th>批次号</th><td>{batch.batch_no}</td>
                <th>产品名称</th><td>{batch.product_name}</td></tr>
            <tr><th>产品代码</th><td>{batch.product_code or '-'}</td>
                <th>规格</th><td>{batch.specification or '-'}</td></tr>
            <tr><th>生产日期</th><td>{batch.manufacture_date or '-'}</td>
                <th>拟有效期</th><td>{batch.expiry_date_candidate or '-'}</td></tr>
            <tr><th>生产厂家</th><td>{batch.manufacturer or '-'}</td>
                <th>储存条件</th><td>{batch.storage_condition.value}</td></tr>
            <tr><th>检验员</th><td>{batch.inspector or '-'}</td>
                <th>备注</th><td>{batch.remarks or '-'}</td></tr>
        </table>
"""

        if anomalies and self.anomaly_first:
            html += self._generate_anomaly_section(batch_no, anomalies)

        html += f"""
        <h3>考察时间点</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>时间点</th>
                    <th>检验日期</th>
                    <th>温度(°C)</th>
                    <th>湿度(%)</th>
                    <th>检验员</th>
                    <th>类型</th>
                    <th>记录时间</th>
                    <th>备注</th>
                </tr>
            </thead>
            <tbody>
"""

        for tp in trace["test_points"]:
            tp_class = "anomaly-severe" if tp.record_time is None else ""
            html += f"""
                <tr class="{tp_class}">
                    <td>{tp.time_point}</td>
                    <td>{tp.test_date or '-'}</td>
                    <td>{tp.temperature if tp.temperature is not None else '-'}</td>
                    <td>{tp.humidity if tp.humidity is not None else '-'}</td>
                    <td>{tp.operator or '-'}</td>
                    <td>{'空白对照' if tp.is_blank_control else '供试品'}</td>
                    <td>{tp.record_time.strftime('%Y-%m-%d %H:%M') if tp.record_time else '<span class="text-danger">未记录</span>'}</td>
                    <td>{tp.remarks or '-'}</td>
                </tr>
"""

        html += """
            </tbody>
        </table>

        <h3>检验结果</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>时间点</th>
                    <th>项目</th>
                    <th>测定值</th>
                    <th>单位</th>
                    <th>标准规定</th>
                    <th>判定</th>
                    <th>检验员</th>
                    <th>检验日期</th>
                    <th>补录说明</th>
                </tr>
            </thead>
            <tbody>
"""

        for ti in trace["test_items"]:
            qual_class = "text-success" if ti.is_qualified else "text-danger" if ti.is_qualified is False else ""
            qual_text = "合格" if ti.is_qualified else "不合格" if ti.is_qualified is False else "未判定"
            unit_class = "text-warning" if not ti.unit and ti.measured_value is not None else ""
            html += f"""
                <tr>
                    <td>{ti.time_point}</td>
                    <td>{ti.item_name}</td>
                    <td>{ti.measured_value if ti.measured_value is not None else '-'}</td>
                    <td class="{unit_class}">{ti.unit or '-'}</td>
                    <td>{ti.specification or '-'}</td>
                    <td class="{qual_class}">{qual_text}</td>
                    <td>{ti.inspector or '-'}</td>
                    <td>{ti.inspection_date or '-'}</td>
                    <td><span class="note">{ti.supplementary_note or '-'}</span></td>
                </tr>
"""

        html += """
            </tbody>
        </table>
"""

        if stability_results:
            html += """
        <h3>稳定性计算结果</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>考察项目</th>
                    <th>初始值</th>
                    <th>终值</th>
                    <th>变化率(%)</th>
                    <th>半衰期(月)</th>
                    <th>有效期估算</th>
                    <th>符合性</th>
                    <th>计算方法</th>
                    <th>备注</th>
                </tr>
            </thead>
            <tbody>
"""

            for sr in stability_results:
                conf_class = "text-success" if sr.is_conforming else "text-danger"
                conf_text = "符合" if sr.is_conforming else "不符合"
                html += f"""
                <tr>
                    <td>{sr.item_name}</td>
                    <td>{sr.initial_value}</td>
                    <td>{sr.final_value}</td>
                    <td>{sr.degradation_rate:.2f}</td>
                    <td>{sr.half_life if sr.half_life else '-'}</td>
                    <td>{sr.expiry_estimate or '-'}</td>
                    <td class="{conf_class}">{conf_text}</td>
                    <td>{sr.calculation_method}</td>
                    <td>{sr.remarks or '-'}</td>
                </tr>
"""

            html += """
            </tbody>
        </table>
"""

        if anomalies and not self.anomaly_first:
            html += self._generate_anomaly_section(batch_no, anomalies)

        html += self._generate_tracing_section(batch_no, trace)
        html += "\n    </div>\n"

        return html

    def _generate_anomaly_section(self, batch_no: str, anomalies: List) -> str:
        """生成异常记录HTML片段"""
        html = f"""
        <div class="anomaly-section">
            <h3>异常记录 <span class="badge badge-danger">{len(anomalies)}</span></h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>异常ID</th>
                        <th>异常类型</th>
                        <th>严重程度</th>
                        <th>描述</th>
                        <th>位置</th>
                        <th>状态</th>
                        <th>处理意见</th>
                        <th>处理人</th>
                        <th>关联记录</th>
                    </tr>
                </thead>
                <tbody>
"""

        for anomaly in anomalies:
            sev_class = "bg-danger" if anomaly.severity == "严重" else "bg-warning"
            status_class = "bg-warning" if anomaly.status.value == "待复核" else \
                          "bg-success" if anomaly.status.value == "正常" else "bg-secondary"
            html += f"""
                <tr class="anomaly-row">
                    <td>{anomaly.anomaly_id}</td>
                    <td><span class="badge {sev_class}">{anomaly.anomaly_type.value}</span></td>
                    <td>{anomaly.severity}</td>
                    <td>{anomaly.description}</td>
                    <td>{anomaly.location}</td>
                    <td><span class="badge {status_class}">{anomaly.status.value}</span></td>
                    <td>{anomaly.handling_opinion or '-'}</td>
                    <td>{anomaly.handler or '-'}</td>
                    <td><a href="#trace-{anomaly.processing_record_id}">{anomaly.processing_record_id}</a></td>
                </tr>
"""

        html += """
                </tbody>
            </table>
"""

        if self.explain_terms:
            html += """
            <div class="explanation-box">
                <h4>异常类型说明与处理建议</h4>
                <dl class="explanation-list">
"""

            seen_types = set()
            for anomaly in anomalies:
                if anomaly.anomaly_type in seen_types:
                    continue
                seen_types.add(anomaly.anomaly_type)

                type_name = anomaly.anomaly_type.value
                explanation = self._get_explanation(type_name)
                advice_list = self._get_advice(anomaly.anomaly_type)

                html += f"""
                    <dt><strong>{type_name}</strong></dt>
                    <dd>
                        <p class="explanation-text">{explanation}</p>
                        <ul class="advice-list">
"""
                for advice in advice_list:
                    html += f"<li>{advice}</li>\n"

                html += """
                        </ul>
                    </dd>
"""

            html += """
                </dl>
            </div>
"""

        html += "\n        </div>\n"
        return html

    def _generate_anomaly_summary_section(self, all_anomalies: List) -> str:
        """生成异常汇总HTML片段"""
        if not all_anomalies:
            return '<div class="alert alert-success">暂无异常记录</div>'

        by_type: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        by_status: Dict[str, int] = {}
        by_batch: Dict[str, int] = {}

        for a in all_anomalies:
            t = a.anomaly_type.value
            s = a.severity
            st = a.status.value
            b = a.batch_no
            by_type[t] = by_type.get(t, 0) + 1
            by_severity[s] = by_severity.get(s, 0) + 1
            by_status[st] = by_status.get(st, 0) + 1
            by_batch[b] = by_batch.get(b, 0) + 1

        html = """
    <div class="anomaly-summary">
        <h2>异常汇总</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <h4>按异常类型</h4>
                <ul>
"""

        for t, count in sorted(by_type.items()):
            html += f"<li>{t}: <strong>{count}</strong> 项</li>\n"

        html += """
                </ul>
            </div>
            <div class="summary-item">
                <h4>按严重程度</h4>
                <ul>
"""

        for s, count in sorted(by_severity.items()):
            sev_class = "text-danger" if s == "严重" else "text-warning"
            html += f'<li class="{sev_class}">{s}: <strong>{count}</strong> 项</li>\n'

        html += """
                </ul>
            </div>
            <div class="summary-item">
                <h4>按处理状态</h4>
                <ul>
"""

        for st, count in sorted(by_status.items()):
            html += f"<li>{st}: <strong>{count}</strong> 项</li>\n"

        html += """
                </ul>
            </div>
            <div class="summary-item">
                <h4>按批次分布</h4>
                <ul>
"""

        for b, count in sorted(by_batch.items()):
            html += f"<li>批次{b}: <strong>{count}</strong> 项</li>\n"

        html += """
                </ul>
            </div>
        </div>
    </div>
"""
        return html

    def _generate_tracing_section(self, batch_no: str, trace: Dict) -> str:
        """生成追溯链HTML片段"""
        html = f"""
        <h3>处理记录追溯链</h3>
        <div class="timeline">
"""

        for pr in sorted(trace["processing_records"], key=lambda x: x.timestamp):
            linked_anomalies = pr.metadata.get("_linked_anomalies", [])
            anomaly_links = ""
            if linked_anomalies:
                anomaly_links = '<div class="linked-anomalies">关联异常：'
                anomaly_links += ", ".join(
                    f'<span class="badge badge-danger">{a.anomaly_id}</span>'
                    for a in linked_anomalies
                )
                anomaly_links += "</div>"

            html += f"""
            <div class="timeline-item" id="trace-{pr.record_id}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-action">{pr.action}</span>
                        <span class="timeline-time">{pr.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</span>
                    </div>
                    <div class="timeline-body">
                        <p><strong>记录ID：</strong>{pr.record_id}</p>
                        <p><strong>操作人：</strong>{pr.operator}</p>
                        {f'<p><strong>输入文件：</strong>{"; ".join(pr.input_files)}</p>' if pr.input_files else ''}
                        {f'<p><strong>输出文件：</strong>{"; ".join(pr.output_files)}</p>' if pr.output_files else ''}
                        {f'<p><strong>备注：</strong>{pr.remarks}</p>' if pr.remarks else ''}
                        {anomaly_links}
                    </div>
                </div>
            </div>
"""

        html += "\n        </div>\n"
        return html

    def _generate_term_explanation_section(self) -> str:
        """生成术语解释HTML片段"""
        if not self.explain_terms:
            return ""

        html = """
    <div class="terms-section">
        <h2>术语解释</h2>
        <dl class="explanation-list">
"""

        for term, explanation in sorted(TERM_EXPLANATIONS.items()):
            html += f"""
            <dt><strong>{term}</strong></dt>
            <dd><p>{explanation}</p></dd>
"""

        html += """
        </dl>
    </div>
"""
        return html

    def _get_css(self) -> str:
        """获取CSS样式"""
        return """
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
    background: #f5f7fa;
    color: #333;
    line-height: 1.6;
}
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
h1 {
    color: #1a365d;
    border-bottom: 3px solid #4299e1;
    padding-bottom: 10px;
    margin-bottom: 20px;
}
h2 {
    color: #2b6cb0;
    margin-top: 30px;
    margin-bottom: 15px;
    padding-left: 10px;
    border-left: 4px solid #4299e1;
}
h3 {
    color: #2d3748;
    margin-top: 20px;
    margin-bottom: 10px;
}
h4 {
    color: #4a5568;
    margin-bottom: 8px;
}
.report-time {
    color: #718096;
    text-align: right;
    margin-bottom: 20px;
}
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}
.card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-align: center;
}
.card-number {
    font-size: 36px;
    font-weight: bold;
    color: #2b6cb0;
}
.card-label {
    color: #718096;
    margin-top: 5px;
}
.card-warning .card-number { color: #d69e2e; }
.card-danger .card-number { color: #c53030; }
.data-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.data-table th {
    background: #2b6cb0;
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: 500;
}
.data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
}
.data-table tbody tr:hover {
    background: #f7fafc;
}
.data-table tr.anomaly-severe {
    background: #fff5f5 !important;
}
.data-table tr.anomaly-normal {
    background: #fffbeb !important;
}
.info-table {
    width: 100%;
    background: white;
    border-collapse: collapse;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.info-table th {
    background: #edf2f7;
    padding: 12px;
    text-align: right;
    width: 15%;
    font-weight: 500;
    color: #4a5568;
    border-bottom: 1px solid #e2e8f0;
}
.info-table td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
}
.text-danger { color: #c53030; }
.text-warning { color: #d69e2e; }
.text-success { color: #2f855a; }
.bg-danger { background: #fc8181 !important; color: white !important; }
.bg-warning { background: #f6ad55 !important; color: white !important; }
.bg-success { background: #68d391 !important; color: white !important; }
.bg-secondary { background: #a0aec0 !important; color: white !important; }
.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
}
.note {
    color: #718096;
    font-size: 0.9em;
    font-style: italic;
}
.anomaly-section {
    background: #fff5f5;
    border: 1px solid #feb2b2;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
}
.explanation-box {
    background: #fffaf0;
    border: 1px solid #fbd38d;
    border-radius: 8px;
    padding: 15px;
    margin-top: 15px;
}
.explanation-list {
    margin: 0;
}
.explanation-list dt {
    margin-top: 10px;
    color: #744210;
}
.explanation-list dd {
    margin-left: 20px;
    margin-bottom: 10px;
}
.explanation-text {
    color: #5a4a30;
    margin-bottom: 5px;
}
.advice-list {
    margin-left: 20px;
    color: #744210;
}
.advice-list li {
    margin-bottom: 3px;
}
.timeline {
    position: relative;
    padding-left: 30px;
    margin-left: 10px;
}
.timeline::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #cbd5e0;
}
.timeline-item {
    position: relative;
    margin-bottom: 20px;
}
.timeline-marker {
    position: absolute;
    left: -26px;
    top: 5px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4299e1;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #4299e1;
}
.timeline-content {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 15px;
}
.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #edf2f7;
}
.timeline-action {
    font-weight: 600;
    color: #2b6cb0;
}
.timeline-time {
    color: #718096;
    font-size: 0.9em;
}
.timeline-body p {
    margin: 5px 0;
    color: #4a5568;
}
.linked-anomalies {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #cbd5e0;
    color: #c53030;
    font-size: 0.9em;
}
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
}
.summary-item {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.summary-item ul {
    list-style: none;
    padding: 0;
}
.summary-item li {
    padding: 5px 0;
    border-bottom: 1px solid #f0f0f0;
}
.terms-section {
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 8px;
    padding: 20px;
    margin-top: 30px;
}
.batch-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.alert {
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}
.alert-success {
    background: #f0fff4;
    color: #22543d;
    border: 1px solid #9ae6b4;
}
a {
    color: #2b6cb0;
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
"""

    def _get_explanation(self, anomaly_type: str) -> str:
        """获取异常类型的通俗解释"""
        return TERM_EXPLANATIONS.get(anomaly_type, "请咨询专业人员了解详情。")

    def _get_advice(self, anomaly_type: AnomalyType) -> List[str]:
        """获取处理建议"""
        return ANOMALY_ADVICE.get(anomaly_type, ["建议：咨询质量负责人处理。"])
