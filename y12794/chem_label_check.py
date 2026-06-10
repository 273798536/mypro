#!/usr/bin/env python3
"""化学品标签合规检查工具

用法:
  python chem_label_check.py check --sample          用内置样例运行合规检查
  python chem_label_check.py check --data FILE        从JSON文件读取称量单记录并检查
  python chem_label_check.py add-safety-note TRACE_ID NOTE  补录安全备注(自动触发配平重算)
  python chem_label_check.py report [--format text|json]    导出最近一次检查报告
  python chem_label_check.py history TRACE_ID               查看某条异常的完整留痕
"""

import argparse
import json
import math
import os
import sys
import uuid
from copy import deepcopy
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

CHECK_VERSION = "1.0.0"
STATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".chem_check_state")
ANOMALY_STORE_FILE = os.path.join(STATE_DIR, "anomaly_store.json")
REPORT_FILE = os.path.join(STATE_DIR, "last_report.json")
RECORDS_FILE = os.path.join(STATE_DIR, "last_records.json")

TEMP_RANGE = (-20.0, 180.0)
TEMP_RATE_LIMIT = 5.0
PH_RANGE = (2.0, 12.0)
PRESSURE_RANGE = (0.8, 5.0)

REQUIRED_LABEL_FIELDS = [
    "product_name", "batch_id", "cas_number", "hazard_pictograms",
    "signal_word", "h_statements", "p_statements", "manufacturer",
    "net_quantity", "expiry_date"
]

REAGENT_CATALOG = {
    "盐酸": {"expected_concentration": 37.0, "unit": "%", "tolerance": 2.0},
    "硫酸": {"expected_concentration": 98.0, "unit": "%", "tolerance": 2.0},
    "氢氧化钠": {"expected_concentration": 50.0, "unit": "%", "tolerance": 3.0},
    "乙醇": {"expected_concentration": 95.0, "unit": "%", "tolerance": 2.0},
    "丙酮": {"expected_concentration": 99.5, "unit": "%", "tolerance": 1.0},
    "乙酸": {"expected_concentration": 99.0, "unit": "%", "tolerance": 1.5},
    "氨水": {"expected_concentration": 25.0, "unit": "%", "tolerance": 2.0},
}


class AnomalyStatus(Enum):
    OPEN = "open"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"


class AnomalySeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class AnomalyEvent:
    timestamp: str
    from_status: str
    to_status: str
    operator: str
    note: str


@dataclass
class Anomaly:
    trace_id: str
    batch_id: str
    category: str
    severity: str
    description: str
    detail: str
    status: str = AnomalyStatus.OPEN.value
    events: List[Dict] = field(default_factory=list)
    original_remark: str = ""

    def add_event(self, from_status: str, to_status: str, operator: str, note: str):
        self.events.append({
            "timestamp": datetime.now().isoformat(),
            "from_status": from_status,
            "to_status": to_status,
            "operator": operator,
            "note": note,
        })
        self.status = to_status


@dataclass
class TemperatureReading:
    timestamp: str
    value: float


@dataclass
class PHReading:
    timestamp: str
    value: float


@dataclass
class ReagentEntry:
    name: str
    concentration: Optional[float] = None
    unit: str = ""
    lot_number: str = ""


@dataclass
class ReactionCondition:
    catalyst: str = ""
    pressure_mpa: Optional[float] = None
    duration_min: Optional[float] = None
    stirring_rpm: Optional[float] = None


@dataclass
class ChemicalRecord:
    batch_id: str = ""
    product_name: str = ""
    cas_number: str = ""
    hazard_pictograms: List[str] = field(default_factory=list)
    signal_word: str = ""
    h_statements: List[str] = field(default_factory=list)
    p_statements: List[str] = field(default_factory=list)
    manufacturer: str = ""
    net_quantity: str = ""
    expiry_date: str = ""
    temperature_curve: List[Dict] = field(default_factory=list)
    ph_readings: List[Dict] = field(default_factory=list)
    reagents: List[Dict] = field(default_factory=list)
    reaction_conditions: Dict = field(default_factory=dict)
    manual_remarks: str = ""
    safety_notes: str = ""
    custom_temp_range: Optional[List[float]] = None
    custom_ph_range: Optional[List[float]] = None
    custom_pressure_range: Optional[List[float]] = None


class BalanceCalculator:
    @staticmethod
    def calculate(reagents: List[Dict], safety_notes: str = "") -> Dict:
        total_mass = 0.0
        reagent_details = []
        for r in reagents:
            name = r.get("name", "未知")
            conc = r.get("concentration", 0.0) or 0.0
            if conc < 0 or conc > 100:
                conc = 0.0
            mass_equivalent = conc
            total_mass += mass_equivalent
            reagent_details.append({
                "name": name,
                "concentration": conc,
                "mass_equivalent": mass_equivalent,
            })

        safety_bonus = 0.0
        if safety_notes and len(safety_notes.strip()) > 0:
            safety_bonus = 1.0

        balance_ratio = total_mass / len(reagents) if reagents else 0.0
        is_balanced = all(
            abs(r["mass_equivalent"] - balance_ratio) < balance_ratio * 0.5
            for r in reagent_details
        ) if reagent_details else True

        return {
            "reagent_details": reagent_details,
            "total_mass_equivalent": round(total_mass, 4),
            "balance_ratio": round(balance_ratio, 4),
            "is_balanced": is_balanced,
            "safety_notes_present": bool(safety_notes and safety_notes.strip()),
            "safety_bonus": safety_bonus,
        }


_anomaly_store: Dict[str, Anomaly] = {}
_last_report: Optional[Dict] = None
_last_records: List[ChemicalRecord] = []


def _ensure_state_dir():
    os.makedirs(STATE_DIR, exist_ok=True)


def _save_anomaly_store():
    _ensure_state_dir()
    data = {tid: asdict(a) for tid, a in _anomaly_store.items()}
    with open(ANOMALY_STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_anomaly_store():
    global _anomaly_store
    if os.path.exists(ANOMALY_STORE_FILE):
        with open(ANOMALY_STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for tid, ad in data.items():
            _anomaly_store[tid] = Anomaly(**{k: v for k, v in ad.items() if k != "events"})
            _anomaly_store[tid].events = ad.get("events", [])


def _save_report():
    _ensure_state_dir()
    if _last_report:
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(_last_report, f, ensure_ascii=False, indent=2)


def _load_report():
    global _last_report
    if os.path.exists(REPORT_FILE):
        with open(REPORT_FILE, "r", encoding="utf-8") as f:
            _last_report = json.load(f)


def _save_records():
    _ensure_state_dir()
    data = [asdict(r) for r in _last_records]
    with open(RECORDS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_records():
    global _last_records
    if os.path.exists(RECORDS_FILE):
        with open(RECORDS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _last_records = parse_records_from_dict(data)


def _new_trace_id() -> str:
    return f"ANO-{uuid.uuid4().hex[:8].upper()}"


def _create_anomaly(batch_id: str, category: str, severity: str,
                    description: str, detail: str, original_remark: str = "") -> Anomaly:
    a = Anomaly(
        trace_id=_new_trace_id(),
        batch_id=batch_id,
        category=category,
        severity=severity,
        description=description,
        detail=detail,
        original_remark=original_remark,
    )
    a.add_event("", AnomalyStatus.OPEN.value, "system", "自动检出")
    _anomaly_store[a.trace_id] = a
    _save_anomaly_store()
    return a


def check_temperature_curve(record: ChemicalRecord, anomalies: List[Anomaly]):
    curve = record.temperature_curve
    if not curve:
        anomalies.append(_create_anomaly(
            record.batch_id, "温度曲线", AnomalySeverity.WARNING.value,
            "缺少温度曲线数据",
            f"批次 {record.batch_id} 未提供温度曲线记录，无法校验温度合规性。"
        ))
        return

    lo, hi = record.custom_temp_range or TEMP_RANGE
    prev_val = None
    for idx, reading in enumerate(curve):
        val = reading.get("value", 0.0)
        ts = reading.get("timestamp", f"点{idx}")
        if val < lo or val > hi:
            anomalies.append(_create_anomaly(
                record.batch_id, "温度曲线", AnomalySeverity.CRITICAL.value,
                f"温度越界: {val}°C (允许范围 {lo}~{hi}°C)",
                f"批次 {record.batch_id} 在 {ts} 时刻温度读数 {val}°C，"
                f"超出允许范围 ({lo}°C ~ {hi}°C)。此为硬性指标，必须停线复核。"
            ))
        if prev_val is not None and abs(val - prev_val) > TEMP_RATE_LIMIT:
            anomalies.append(_create_anomaly(
                record.batch_id, "温度曲线", AnomalySeverity.WARNING.value,
                f"温度变化速率过大: {abs(val - prev_val):.1f}°C/步 (限值 {TEMP_RATE_LIMIT}°C/步)",
                f"批次 {record.batch_id} 在 {ts} 时刻温度跳变 {abs(val - prev_val):.1f}°C，"
                f"超过每步变化限值 {TEMP_RATE_LIMIT}°C，请确认传感器或工艺是否正常。"
            ))
        prev_val = val


def check_ph_readings(record: ChemicalRecord, anomalies: List[Anomaly]):
    readings = record.ph_readings
    if not readings:
        anomalies.append(_create_anomaly(
            record.batch_id, "pH越界", AnomalySeverity.WARNING.value,
            "缺少pH读数数据",
            f"批次 {record.batch_id} 未提供pH读数，无法校验pH合规性。"
        ))
        return

    lo, hi = record.custom_ph_range or PH_RANGE
    for idx, reading in enumerate(readings):
        val = reading.get("value", 0.0)
        ts = reading.get("timestamp", f"点{idx}")
        if val < lo or val > hi:
            anomalies.append(_create_anomaly(
                record.batch_id, "pH越界", AnomalySeverity.CRITICAL.value,
                f"pH越界: {val} (允许范围 {lo}~{hi})",
                f"批次 {record.batch_id} 在 {ts} 时刻pH读数 {val}，"
                f"超出允许范围 ({lo} ~ {hi})。pH超标可能影响产物纯度与安全性，需立即确认。"
            ))
        margin = min(val - lo, hi - val)
        if margin < 0.5 and margin >= 0:
            anomalies.append(_create_anomaly(
                record.batch_id, "pH越界", AnomalySeverity.WARNING.value,
                f"pH接近边界: {val} (距边界仅 {margin:.2f})",
                f"批次 {record.batch_id} 在 {ts} 时刻pH {val}，"
                f"距允许范围边界仅 {margin:.2f}，虽未越界但需要关注趋势。"
            ))


def check_reagent_concentrations(record: ChemicalRecord, anomalies: List[Anomaly]):
    reagents = record.reagents
    if not reagents:
        anomalies.append(_create_anomaly(
            record.batch_id, "试剂浓度", AnomalySeverity.WARNING.value,
            "缺少试剂信息",
            f"批次 {record.batch_id} 未提供试剂条目，无法校验浓度合规性。"
        ))
        return

    for r in reagents:
        name = r.get("name", "未知试剂")
        conc = r.get("concentration")
        unit = r.get("unit", "")
        if conc is None:
            anomalies.append(_create_anomaly(
                record.batch_id, "试剂浓度", AnomalySeverity.CRITICAL.value,
                f"试剂 '{name}' 浓度缺失",
                f"批次 {record.batch_id} 的试剂 '{name}' 未填写浓度值。"
                f"浓度缺失属于标签关键信息不全，该记录不能通过合规检查。",
                original_remark=record.manual_remarks
            ))
            continue

        if conc < 0 or conc > 100:
            anomalies.append(_create_anomaly(
                record.batch_id, "试剂浓度", AnomalySeverity.CRITICAL.value,
                f"试剂 '{name}' 浓度值异常: {conc}{unit}",
                f"批次 {record.batch_id} 的试剂 '{name}' 浓度填写为 {conc}{unit}，"
                f"该值不在0~100%的物理合理范围内，属于明显的录入错误或数据损坏。",
                original_remark=record.manual_remarks
            ))
            continue

        catalog_entry = REAGENT_CATALOG.get(name)
        if catalog_entry:
            expected = catalog_entry["expected_concentration"]
            tolerance = catalog_entry["tolerance"]
            if abs(conc - expected) > tolerance:
                deviation = abs(conc - expected)
                anomalies.append(_create_anomaly(
                    record.batch_id, "试剂浓度", AnomalySeverity.CRITICAL.value,
                    f"试剂 '{name}' 浓度错填: 填写 {conc}{unit}，期望 {expected}±{tolerance}{catalog_entry['unit']}",
                    f"批次 {record.batch_id} 的试剂 '{name}' 浓度填写为 {conc}{unit}，"
                    f"与标准浓度 {expected}{catalog_entry['unit']} 偏差 {deviation:.1f}，"
                    f"超出容差 ±{tolerance}{catalog_entry['unit']}。"
                    f"此偏差意味着标签浓度与实际不符，可能导致操作人员误判危险等级，"
                    f"属于必须拦截的合规缺陷。即便质检主管只看导出报告，也能明确看到："
                    f"该试剂浓度偏差 {deviation:.1f} 已超出容许范围，标签信息不可信。",
                    original_remark=record.manual_remarks
                ))
            elif abs(conc - expected) > tolerance * 0.7:
                anomalies.append(_create_anomaly(
                    record.batch_id, "试剂浓度", AnomalySeverity.WARNING.value,
                    f"试剂 '{name}' 浓度接近容差边界: {conc}{unit} (容差 ±{tolerance})",
                    f"批次 {record.batch_id} 的试剂 '{name}' 浓度 {conc}{unit}，"
                    f"距容差边界仅 {tolerance - abs(conc - expected):.2f}，需要关注。",
                    original_remark=record.manual_remarks
                ))


def check_reaction_conditions(record: ChemicalRecord, anomalies: List[Anomaly]):
    rc = record.reaction_conditions
    if not rc:
        anomalies.append(_create_anomaly(
            record.batch_id, "反应条件", AnomalySeverity.WARNING.value,
            "缺少反应条件数据",
            f"批次 {record.batch_id} 未提供反应条件，无法校验反应条件合规性。"
        ))
        return

    pressure = rc.get("pressure_mpa")
    if pressure is not None:
        lo, hi = record.custom_pressure_range or PRESSURE_RANGE
        if pressure < lo or pressure > hi:
            anomalies.append(_create_anomaly(
                record.batch_id, "反应条件", AnomalySeverity.CRITICAL.value,
                f"压力越界: {pressure} MPa (允许范围 {lo}~{hi} MPa)",
                f"批次 {record.batch_id} 反应压力 {pressure} MPa，"
                f"超出允许范围 ({lo}~{hi} MPa)，属于安全风险。"
            ))

    duration = rc.get("duration_min")
    if duration is not None and duration < 0:
        anomalies.append(_create_anomaly(
            record.batch_id, "反应条件", AnomalySeverity.CRITICAL.value,
            f"反应时长为负数: {duration} min",
            f"批次 {record.batch_id} 反应时长填写为 {duration} min，数值不合理。"
        ))

    stirring = rc.get("stirring_rpm")
    if stirring is not None and stirring < 0:
        anomalies.append(_create_anomaly(
            record.batch_id, "反应条件", AnomalySeverity.WARNING.value,
            f"搅拌速度为负数: {stirring} rpm",
            f"批次 {record.batch_id} 搅拌速度填写为 {stirring} rpm，数值不合理。"
        ))


def check_label_completeness(record: ChemicalRecord, anomalies: List[Anomaly]):
    missing = []
    for f in REQUIRED_LABEL_FIELDS:
        val = getattr(record, f, None)
        if not val:
            missing.append(f)
    if missing:
        anomalies.append(_create_anomaly(
            record.batch_id, "标签完整性", AnomalySeverity.CRITICAL.value,
            f"标签缺少必填项: {', '.join(missing)}",
            f"批次 {record.batch_id} 标签缺少以下必填字段: {', '.join(missing)}。"
            f"根据GHS标准，这些字段缺一不可，标签信息不完整不允许出厂。"
        ))


def run_full_check(records: List[ChemicalRecord]) -> Dict:
    global _last_report, _last_records
    _last_records = records
    all_anomalies: List[Anomaly] = []

    for rec in records:
        rec_anomalies: List[Anomaly] = []
        check_temperature_curve(rec, rec_anomalies)
        check_ph_readings(rec, rec_anomalies)
        check_reagent_concentrations(rec, rec_anomalies)
        check_reaction_conditions(rec, rec_anomalies)
        check_label_completeness(rec, rec_anomalies)
        all_anomalies.extend(rec_anomalies)

    balance_results = {}
    for rec in records:
        balance_results[rec.batch_id] = BalanceCalculator.calculate(
            rec.reagents, rec.safety_notes
        )

    summary = _build_summary(records, all_anomalies, balance_results)
    explanations = _build_explanations(records, all_anomalies)

    report = {
        "check_version": CHECK_VERSION,
        "check_time": datetime.now().isoformat(),
        "total_records": len(records),
        "anomalies": [asdict(a) for a in all_anomalies],
        "balance_results": balance_results,
        "summary": summary,
        "explanations": explanations,
    }
    _last_report = report
    _save_report()
    _save_records()
    return report


def _build_summary(records: List[ChemicalRecord], anomalies: List[Anomaly],
                   balance_results: Dict) -> Dict:
    total = len(anomalies)
    critical = sum(1 for a in anomalies if a.severity == AnomalySeverity.CRITICAL.value)
    warning = sum(1 for a in anomalies if a.severity == AnomalySeverity.WARNING.value)
    info = sum(1 for a in anomalies if a.severity == AnomalySeverity.INFO.value)

    categories: Dict[str, int] = {}
    for a in anomalies:
        categories[a.category] = categories.get(a.category, 0) + 1

    batch_status = {}
    for rec in records:
        batch_anomalies = [a for a in anomalies if a.batch_id == rec.batch_id]
        has_critical = any(a.severity == AnomalySeverity.CRITICAL.value for a in batch_anomalies)
        has_warning = any(a.severity == AnomalySeverity.WARNING.value for a in batch_anomalies)
        if has_critical:
            batch_status[rec.batch_id] = "不合规-需拦截"
        elif has_warning:
            batch_status[rec.batch_id] = "待确认"
        else:
            batch_status[rec.batch_id] = "合规"

    return {
        "total_anomalies": total,
        "critical": critical,
        "warning": warning,
        "info": info,
        "categories": categories,
        "batch_status": batch_status,
    }


def _build_explanations(records: List[ChemicalRecord], anomalies: List[Anomaly]) -> List[Dict]:
    explanations = []
    for rec in records:
        batch_anomalies = [a for a in anomalies if a.batch_id == rec.batch_id]
        if not batch_anomalies:
            explanations.append({
                "batch_id": rec.batch_id,
                "product_name": rec.product_name,
                "plain_text": (
                    f"批次 {rec.batch_id}（{rec.product_name}）标签合规检查通过，"
                    f"温度曲线、pH读数、试剂浓度、反应条件均在允许范围内，标签信息完整。"
                    f"该批次可以正常放行。"
                )
            })
        else:
            critical_items = [a for a in batch_anomalies if a.severity == AnomalySeverity.CRITICAL.value]
            warning_items = [a for a in batch_anomalies if a.severity == AnomalySeverity.WARNING.value]

            parts = [f"批次 {rec.batch_id}（{rec.product_name}）合规检查发现以下问题："]

            if critical_items:
                parts.append(f"【必须拦截】共 {len(critical_items)} 项严重问题：")
                for a in critical_items:
                    parts.append(f"  - {a.description}。{a.detail}")

            if warning_items:
                parts.append(f"【待确认】共 {len(warning_items)} 项需关注：")
                for a in warning_items:
                    parts.append(f"  - {a.description}。{a.detail}")

            if rec.manual_remarks:
                parts.append(f"【人工备注原文】{rec.manual_remarks}")

            parts.append("建议：请相关责任人复核以上项目，确认后方可流转。")

            explanations.append({
                "batch_id": rec.batch_id,
                "product_name": rec.product_name,
                "plain_text": "\n".join(parts)
            })

    return explanations


def add_safety_note(trace_id: str, note: str) -> Dict:
    if trace_id not in _anomaly_store:
        return {"error": f"未找到异常追踪号 {trace_id}"}

    anomaly = _anomaly_store[trace_id]
    old_status = anomaly.status

    anomaly.add_event(old_status, AnomalyStatus.CONFIRMED.value, "operator", note)
    _save_anomaly_store()

    related_batch = anomaly.batch_id
    balance = None
    rec = next((r for r in _last_records if r.batch_id == related_batch), None)
    if rec:
        rec.safety_notes = (rec.safety_notes + " " + note).strip()
        balance = BalanceCalculator.calculate(rec.reagents, rec.safety_notes)
        if _last_report and related_batch in _last_report.get("balance_results", {}):
            _last_report["balance_results"][related_batch] = balance
            _save_report()
        _save_records()

    return {
        "trace_id": trace_id,
        "previous_status": old_status,
        "current_status": anomaly.status,
        "note_added": note,
        "balance_recalculated": balance is not None,
        "new_balance": balance,
    }


def _get_records_from_last_report() -> List[ChemicalRecord]:
    return _last_records


def format_report_text(report: Dict) -> str:
    lines = []
    lines.append("=" * 70)
    lines.append("化学品标签合规检查报告")
    lines.append(f"检查版本: {report['check_version']}    检查时间: {report['check_time']}")
    lines.append(f"检查记录数: {report['total_records']}")
    lines.append("=" * 70)

    s = report["summary"]
    lines.append("")
    lines.append("【汇总】")
    lines.append(f"  异常总数: {s['total_anomalies']}  "
                 f"严重: {s['critical']}  警告: {s['warning']}  提示: {s['info']}")
    for batch_id, status in s["batch_status"].items():
        lines.append(f"  批次 {batch_id}: {status}")

    lines.append("")
    lines.append("【配平计算结果】")
    for batch_id, bal in report["balance_results"].items():
        lines.append(f"  批次 {batch_id}: 总质量当量={bal['total_mass_equivalent']}, "
                     f"配平比={bal['balance_ratio']}, "
                     f"是否配平={'是' if bal['is_balanced'] else '否'}, "
                     f"安全备注={'有' if bal['safety_notes_present'] else '无'}")

    if report["anomalies"]:
        lines.append("")
        lines.append("【异常明细】")
        for a in report["anomalies"]:
            lines.append(f"  [{a['trace_id']}] {a['severity'].upper()} | {a['category']}")
            lines.append(f"    {a['description']}")
            lines.append(f"    {a['detail']}")
            if a.get("original_remark"):
                lines.append(f"    [人工备注原文] {a['original_remark']}")
            lines.append(f"    状态: {a['status']}")
            event_count = len(a.get("events", []))
            lines.append(f"    留痕记录: {event_count} 条")
            for evt in a.get("events", []):
                lines.append(f"      {evt['timestamp']} | {evt['from_status']}→{evt['to_status']} "
                             f"| 操作人: {evt['operator']} | {evt['note']}")
            lines.append("")

    lines.append("")
    lines.append("【普通话解释（可直接复制给同事）】")
    for exp in report["explanations"]:
        lines.append(f"  --- 批次 {exp['batch_id']}（{exp['product_name']}）---")
        for paragraph in exp["plain_text"].split("\n"):
            lines.append(f"  {paragraph}")
        lines.append("")

    lines.append("=" * 70)
    return "\n".join(lines)


def get_sample_records() -> List[ChemicalRecord]:
    rec_ok = ChemicalRecord(
        batch_id="BATCH-2026-0601",
        product_name="工业盐酸",
        cas_number="7647-01-0",
        hazard_pictograms=["腐蚀", "毒性"],
        signal_word="危险",
        h_statements=["H314", "H335"],
        p_statements=["P260", "P280", "P305+P351+P338"],
        manufacturer="某某化工有限公司",
        net_quantity="25kg",
        expiry_date="2027-06-01",
        temperature_curve=[
            {"timestamp": "2026-06-01T08:00", "value": 25.3},
            {"timestamp": "2026-06-01T08:30", "value": 25.5},
            {"timestamp": "2026-06-01T09:00", "value": 25.4},
        ],
        ph_readings=[
            {"timestamp": "2026-06-01T08:00", "value": 3.2},
            {"timestamp": "2026-06-01T09:00", "value": 3.1},
        ],
        reagents=[
            {"name": "盐酸", "concentration": 36.5, "unit": "%", "lot_number": "LOT-HCl-001"},
        ],
        reaction_conditions={
            "catalyst": "无",
            "pressure_mpa": 1.0,
            "duration_min": 60.0,
            "stirring_rpm": 200.0,
        },
        manual_remarks="称量员确认这批盐酸外观清澈无杂质，和上次进的同一批号",
        safety_notes="已确认通风柜运行正常",
    )

    rec_pending = ChemicalRecord(
        batch_id="BATCH-2026-0602",
        product_name="稀硫酸溶液",
        cas_number="7664-93-9",
        hazard_pictograms=["腐蚀"],
        signal_word="警告",
        h_statements=["H314"],
        p_statements=["P280", "P305+P351+P338"],
        manufacturer="某某化工有限公司",
        net_quantity="10L",
        expiry_date="2027-03-15",
        temperature_curve=[
            {"timestamp": "2026-06-02T10:00", "value": 26.0},
            {"timestamp": "2026-06-02T10:30", "value": 30.5},
            {"timestamp": "2026-06-02T11:00", "value": 28.0},
        ],
        ph_readings=[
            {"timestamp": "2026-06-02T10:00", "value": 2.1},
            {"timestamp": "2026-06-02T11:00", "value": 2.3},
        ],
        reagents=[
            {"name": "硫酸", "concentration": 96.0, "unit": "%", "lot_number": "LOT-H2SO4-002"},
        ],
        reaction_conditions={
            "catalyst": "无",
            "pressure_mpa": 0.9,
            "duration_min": 45.0,
            "stirring_rpm": 150.0,
        },
        manual_remarks="操作员说稀释时温度上来了一下但很快回落，我觉得应该没问题先记上",
        safety_notes="",
    )

    rec_bad = ChemicalRecord(
        batch_id="BATCH-2026-0603",
        product_name="混合试剂X",
        cas_number="",
        hazard_pictograms=[],
        signal_word="",
        h_statements=[],
        p_statements=[],
        manufacturer="",
        net_quantity="",
        expiry_date="",
        temperature_curve=[
            {"timestamp": "2026-06-03T14:00", "value": 190.0},
            {"timestamp": "2026-06-03T14:15", "value": 42.0},
            {"timestamp": "2026-06-03T14:30", "value": 185.0},
        ],
        ph_readings=[
            {"timestamp": "2026-06-03T14:00", "value": 13.5},
            {"timestamp": "2026-06-03T14:30", "value": 0.5},
        ],
        reagents=[
            {"name": "氢氧化钠", "concentration": 75.0, "unit": "%", "lot_number": "LOT-NaOH-003"},
            {"name": "乙醇", "concentration": -5.0, "unit": "%", "lot_number": "LOT-EtOH-003"},
            {"name": "丙酮", "concentration": None, "unit": "%", "lot_number": "LOT-Ace-003"},
        ],
        reaction_conditions={
            "catalyst": "钯碳",
            "pressure_mpa": 8.5,
            "duration_min": -10.0,
            "stirring_rpm": -50.0,
        },
        manual_remarks="这批数据有问题，浓度那个负数肯定填错了，丙酮浓度也忘填了，麻烦帮忙查一下",
        safety_notes="",
    )

    return [rec_ok, rec_pending, rec_bad]


def parse_records_from_dict(data: List[Dict]) -> List[ChemicalRecord]:
    records = []
    for item in data:
        rec = ChemicalRecord(
            batch_id=item.get("batch_id", ""),
            product_name=item.get("product_name", ""),
            cas_number=item.get("cas_number", ""),
            hazard_pictograms=item.get("hazard_pictograms", []),
            signal_word=item.get("signal_word", ""),
            h_statements=item.get("h_statements", []),
            p_statements=item.get("p_statements", []),
            manufacturer=item.get("manufacturer", ""),
            net_quantity=item.get("net_quantity", ""),
            expiry_date=item.get("expiry_date", ""),
            temperature_curve=item.get("temperature_curve", []),
            ph_readings=item.get("ph_readings", []),
            reagents=item.get("reagents", []),
            reaction_conditions=item.get("reaction_conditions", {}),
            manual_remarks=item.get("manual_remarks", ""),
            safety_notes=item.get("safety_notes", ""),
            custom_temp_range=item.get("custom_temp_range"),
            custom_ph_range=item.get("custom_ph_range"),
            custom_pressure_range=item.get("custom_pressure_range"),
        )
        records.append(rec)
    return records


def cmd_check(args):
    if args.sample:
        records = get_sample_records()
    elif args.data:
        try:
            with open(args.data, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                data = [data]
            records = parse_records_from_dict(data)
        except Exception as e:
            print(f"读取数据文件失败: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("请指定 --sample 或 --data FILE", file=sys.stderr)
        sys.exit(1)

    report = run_full_check(records)
    print(format_report_text(report))


def cmd_add_safety_note(args):
    _load_anomaly_store()
    _load_report()
    _load_records()
    result = add_safety_note(args.trace_id, args.note)
    if "error" in result:
        print(f"错误: {result['error']}", file=sys.stderr)
        sys.exit(1)
    print("安全备注补录完成:")
    print(f"  追踪号: {result['trace_id']}")
    print(f"  状态变更: {result['previous_status']} → {result['current_status']}")
    print(f"  补录内容: {result['note_added']}")
    if result["balance_recalculated"]:
        bal = result["new_balance"]
        print(f"  配平已重算: 总质量当量={bal['total_mass_equivalent']}, "
              f"配平比={bal['balance_ratio']}, "
              f"是否配平={'是' if bal['is_balanced'] else '否'}")
    else:
        print("  配平未受影响（无关联批次或无上次报告）")


def cmd_report(args):
    _load_report()
    if _last_report is None:
        print("尚未执行过检查，请先运行 check 命令。", file=sys.stderr)
        sys.exit(1)
    if args.format == "json":
        print(json.dumps(_last_report, ensure_ascii=False, indent=2))
    else:
        print(format_report_text(_last_report))


def cmd_history(args):
    _load_anomaly_store()
    if args.trace_id not in _anomaly_store:
        print(f"未找到异常追踪号 {args.trace_id}", file=sys.stderr)
        sys.exit(1)
    a = _anomaly_store[args.trace_id]
    print(f"异常追踪号: {a.trace_id}")
    print(f"批次: {a.batch_id}")
    print(f"类别: {a.category}")
    print(f"严重级别: {a.severity}")
    print(f"描述: {a.description}")
    print(f"详情: {a.detail}")
    if a.original_remark:
        print(f"人工备注原文: {a.original_remark}")
    print(f"当前状态: {a.status}")
    print(f"留痕记录 ({len(a.events)} 条):")
    for evt in a.events:
        print(f"  {evt['timestamp']} | {evt['from_status']}→{evt['to_status']} "
              f"| 操作人: {evt['operator']} | {evt['note']}")


def main():
    parser = argparse.ArgumentParser(
        description="化学品标签合规检查工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    p_check = subparsers.add_parser("check", help="执行合规检查")
    p_check.add_argument("--sample", action="store_true",
                         help="使用内置样例数据运行检查（含1条顺利记录、1条待确认记录、1条明显坏数据）")
    p_check.add_argument("--data", type=str,
                         help="从JSON文件读取称量单记录（支持单条对象或数组）")

    p_note = subparsers.add_parser("add-safety-note", help="补录安全备注（自动触发配平重算）")
    p_note.add_argument("trace_id", help="异常追踪号（如 ANO-XXXXXXXX）")
    p_note.add_argument("note", help="安全备注内容")

    p_report = subparsers.add_parser("report", help="导出最近一次检查报告")
    p_report.add_argument("--format", choices=["text", "json"], default="text",
                          help="报告格式（默认 text）")

    p_history = subparsers.add_parser("history", help="查看某条异常的完整留痕")
    p_history.add_argument("trace_id", help="异常追踪号")

    args = parser.parse_args()

    if args.command == "check":
        cmd_check(args)
    elif args.command == "add-safety-note":
        cmd_add_safety_note(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "history":
        cmd_history(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
