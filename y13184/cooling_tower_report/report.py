"""
报告生成模块

核心职责：
- 生成"冷却塔水滴报告"——带异常明细、统计摘要、追溯链
- 跳变分析：对比两次报告，指出变化是"阈值改了""单位变了"还是"备注撤回了"
- 报告持久化：重启或重跑以后，历史备注、当前状态、CSV明细要对得上

设计原则：
- 每份报告都是"不可变"的——生成了就存着，不会被后来的修改覆盖
- 每份报告都带数据指纹（data_hash + nameplate_hash），
  重跑的时候能验明正身："这次的结果和上次是不是同一个东西"
"""

import json
import os
import csv
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict, Any, Optional

from .nameplate import NameplateManager, NameplateVersion
from .water_drop import WaterDropProcessor, WaterDropRecord
from .anomaly import AnomalyDetector, AnomalyRecord


@dataclass
class ReportMeta:
    """报告元信息"""
    report_id: str
    generated_at: str
    report_time_start: str
    report_time_end: str
    nameplate_version: int
    nameplate_snapshot_hash: str
    data_hash: str
    data_source_file: str
    total_records: int
    anomaly_count: int
    operator: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class JumpAnalysisResult:
    """跳变分析结果——回答"报告结果为什么突然变了" """
    has_jump: bool
    jump_reasons: List[Dict[str, Any]]
    anomaly_count_change: int
    anomaly_count_old: int
    anomaly_count_new: int
    threshold_changes: List[Dict[str, Any]]
    unit_changed: bool
    old_unit: str
    new_unit: str
    note_changes: List[Dict[str, Any]]
    retracted_notes: List[Dict[str, Any]]
    data_changed: bool
    summary: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ReportGenerator:
    """
    报告生成器

    典型用法：
        gen = ReportGenerator("output/reports")
        report = gen.generate(
            nameplate_mgr, water_drop_proc,
            time_start, time_end, operator="小林"
        )
        gen.export_csv(report["report_id"], "output/last_report.csv")
    """

    def __init__(self, reports_dir: str):
        self.reports_dir = reports_dir
        os.makedirs(reports_dir, exist_ok=True)

    def generate(self, nameplate_mgr: NameplateManager,
                 water_proc: WaterDropProcessor,
                 time_start: str, time_end: str,
                 operator: str = "",
                 nameplate_version: Optional[int] = None) -> Dict[str, Any]:
        """
        生成一份报告

        参数：
            nameplate_version: 可选，指定用哪一版铭牌。不传就用最新版。
                              也可以传时间点，让它自己找对应版本。

        流程：
        1. 取报告时段内的水滴数据
        2. 取对应版本的铭牌快照
        3. 用那版铭牌检测异常
        4. 存报告（JSON + 元数据）
        5. 返回完整报告数据
        """
        records = water_proc.get_records_in_range(time_start, time_end)

        if nameplate_version is not None:
            nameplate = None
            for v in nameplate_mgr.versions:
                if v.version == nameplate_version:
                    nameplate = v
                    break
            if nameplate is None:
                raise ValueError(f"找不到铭牌版本 v{nameplate_version}")
        else:
            nameplate = nameplate_mgr.get_latest()

        detector = AnomalyDetector(nameplate)
        anomalies = detector.detect(records)

        report_id = self._make_report_id()
        meta = ReportMeta(
            report_id=report_id,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            report_time_start=time_start,
            report_time_end=time_end,
            nameplate_version=nameplate.version,
            nameplate_snapshot_hash=nameplate.snapshot_hash(),
            data_hash=water_proc.data_hash(),
            data_source_file=records[0].source_file if records else "",
            total_records=len(records),
            anomaly_count=len(anomalies),
            operator=operator,
        )

        summary = detector.summary(anomalies)
        summary["total_records"] = len(records)

        report = {
            "meta": meta.to_dict(),
            "summary": summary,
            "nameplate_snapshot": nameplate.to_dict(),
            "anomalies": [a.to_dict() for a in anomalies],
        }

        self._save_report(report)

        return report

    def _make_report_id(self) -> str:
        now = datetime.now()
        ts = now.strftime("%Y%m%d_%H%M%S")
        ms = f"{now.microsecond // 1000:03d}"
        return f"report_{ts}_{ms}"

    def _save_report(self, report: Dict[str, Any]) -> None:
        report_id = report["meta"]["report_id"]
        report_dir = os.path.join(self.reports_dir, report_id)
        os.makedirs(report_dir, exist_ok=True)

        with open(os.path.join(report_dir, "report.json"), "w",
                  encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        self._update_index(report_id, report["meta"])

    def _update_index(self, report_id: str, meta: Dict[str, Any]) -> None:
        index_path = os.path.join(self.reports_dir, "index.json")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)
        else:
            index = {"reports": []}

        index["reports"].insert(0, {
            "report_id": report_id,
            "generated_at": meta["generated_at"],
            "report_time_start": meta["report_time_start"],
            "report_time_end": meta["report_time_end"],
            "nameplate_version": meta["nameplate_version"],
            "total_records": meta["total_records"],
            "anomaly_count": meta["anomaly_count"],
            "data_hash": meta["data_hash"],
            "nameplate_snapshot_hash": meta["nameplate_snapshot_hash"],
            "operator": meta["operator"],
        })

        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

    def load_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """加载一份历史报告"""
        report_path = os.path.join(self.reports_dir, report_id, "report.json")
        if not os.path.exists(report_path):
            return None
        with open(report_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_reports(self) -> List[Dict[str, Any]]:
        """列出所有历史报告"""
        index_path = os.path.join(self.reports_dir, "index.json")
        if not os.path.exists(index_path):
            return []
        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)
        return index.get("reports", [])

    def get_latest_report(self) -> Optional[Dict[str, Any]]:
        """获取最新一份报告"""
        reports = self.list_reports()
        if not reports:
            return None
        return self.load_report(reports[0]["report_id"])

    def analyze_jump(self, old_report_id: str,
                     new_report_id: str) -> JumpAnalysisResult:
        """
        跳变分析——对比两份报告，回答"结果为什么变了"

        可能的原因：
        1. 阈值改了（数值变了）
        2. 单位变了（虽然数值一样，但含义变了）
        3. 数据本身变了（不同的原始数据）
        4. 有新的备注（影响了判断逻辑）
        5. 有备注被撤回（之前的判断不算数了）

        返回的 summary 是给人看的一句话结论，
        排班同事不用看代码也能明白。
        """
        old = self.load_report(old_report_id)
        new = self.load_report(new_report_id)
        if not old or not new:
            return JumpAnalysisResult(
                has_jump=False,
                jump_reasons=[],
                anomaly_count_change=0,
                anomaly_count_old=0,
                anomaly_count_new=0,
                threshold_changes=[],
                unit_changed=False,
                old_unit="",
                new_unit="",
                note_changes=[],
                retracted_notes=[],
                data_changed=False,
                summary="报告不存在，无法对比",
            )

        old_meta = old["meta"]
        new_meta = new["meta"]
        old_np = old["nameplate_snapshot"]
        new_np = new["nameplate_snapshot"]
        old_th = old_np["thresholds"]
        new_th = new_np["thresholds"]

        anomaly_count_change = new_meta["anomaly_count"] - old_meta["anomaly_count"]
        has_jump = anomaly_count_change != 0

        threshold_changes = []
        for key in ["water_drop_temp_high", "water_drop_temp_low",
                     "water_drop_flow_high", "water_drop_flow_low"]:
            old_val = old_th.get(key)
            new_val = new_th.get(key)
            if old_val != new_val:
                threshold_changes.append({
                    "threshold": key,
                    "old_value": old_val,
                    "new_value": new_val,
                    "change": new_val - old_val if isinstance(old_val, (int, float)) else None,
                })

        old_unit = old_th.get("unit", "")
        new_unit = new_th.get("unit", "")
        unit_changed = old_unit != new_unit

        old_notes = {n["note_id"]: n for n in old_np.get("notes", [])}
        new_notes = {n["note_id"]: n for n in new_np.get("notes", [])}

        note_changes = []
        retracted_notes = []

        for nid, new_note in new_notes.items():
            if nid not in old_notes:
                note_changes.append({
                    "type": "added",
                    "note_id": nid,
                    "content": new_note["content"],
                    "impact": new_note.get("impact_description", ""),
                    "operator": new_note["operator"],
                    "timestamp": new_note["timestamp"],
                })
            elif new_note.get("is_retracted") and not old_notes[nid].get("is_retracted"):
                retracted_notes.append({
                    "note_id": nid,
                    "content": new_note["content"],
                    "retract_reason": new_note.get("retract_reason", ""),
                    "retract_operator": new_note.get("retract_operator", ""),
                    "retract_timestamp": new_note.get("retract_timestamp", ""),
                })

        data_changed = old_meta["data_hash"] != new_meta["data_hash"]

        jump_reasons = []
        if threshold_changes:
            jump_reasons.append({
                "category": "threshold_change",
                "description": f"安全阈值变动（{len(threshold_changes)}项）",
                "details": threshold_changes,
            })
        if unit_changed:
            jump_reasons.append({
                "category": "unit_change",
                "description": f"单位变化：{old_unit} → {new_unit}",
                "details": {"old_unit": old_unit, "new_unit": new_unit},
            })
        if note_changes:
            jump_reasons.append({
                "category": "note_added",
                "description": f"新增铭牌备注（{len(note_changes)}条）",
                "details": note_changes,
            })
        if retracted_notes:
            jump_reasons.append({
                "category": "note_retracted",
                "description": f"撤回备注（{len(retracted_notes)}条）",
                "details": retracted_notes,
            })
        if data_changed:
            jump_reasons.append({
                "category": "data_change",
                "description": "原始数据不同",
                "details": {
                    "old_hash": old_meta["data_hash"],
                    "new_hash": new_meta["data_hash"],
                },
            })

        summary_parts = []
        if has_jump:
            summary_parts.append(
                f"异常数从 {old_meta['anomaly_count']} 条变到 {new_meta['anomaly_count']} 条，"
                f"变化 {anomaly_count_change:+d} 条。"
            )
        else:
            summary_parts.append(
                f"异常数相同（{old_meta['anomaly_count']} 条）。"
            )

        if threshold_changes:
            names = ", ".join(t["threshold"] for t in threshold_changes)
            summary_parts.append(f"阈值变动：{names}。")
        if unit_changed:
            summary_parts.append(f"单位从「{old_unit}」改成「{new_unit}」。")
        if note_changes:
            summary_parts.append(f"新增 {len(note_changes)} 条铭牌备注。")
        if retracted_notes:
            summary_parts.append(f"撤回 {len(retracted_notes)} 条备注。")
        if data_changed:
            summary_parts.append("原始数据不同。")
        if not jump_reasons and has_jump:
            summary_parts.append("原因不明——建议人工核对。")
        if not jump_reasons and not has_jump:
            summary_parts.append("两份报告一致。")

        summary = " ".join(summary_parts)

        return JumpAnalysisResult(
            has_jump=has_jump,
            jump_reasons=jump_reasons,
            anomaly_count_change=anomaly_count_change,
            anomaly_count_old=old_meta["anomaly_count"],
            anomaly_count_new=new_meta["anomaly_count"],
            threshold_changes=threshold_changes,
            unit_changed=unit_changed,
            old_unit=old_unit,
            new_unit=new_unit,
            note_changes=note_changes,
            retracted_notes=retracted_notes,
            data_changed=data_changed,
            summary=summary,
        )
