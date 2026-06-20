from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import GateRecord, GateStatus, GrayscaleResult, TimelineEventType
from .gatekeeper import NegSamplingGatekeeper
from .timeline import TimelineManager


class GateReportGenerator:
    def __init__(self, gatekeeper: NegSamplingGatekeeper):
        self.gate = gatekeeper
        self.timeline = gatekeeper.timeline

    def generate_report(
        self,
        record_ids: Optional[List[str]] = None,
        include_timeline: bool = True,
        include_raw_fields: bool = False,
    ) -> Dict[str, Any]:
        if record_ids:
            records = []
            for rid in record_ids:
                rec = self.gate.get_record(rid)
                if rec:
                    records.append(rec)
        else:
            records = self.gate.list_records()

        report: Dict[str, Any] = {
            "report_timestamp": datetime.now().isoformat(),
            "total_records": len(records),
            "summary": self._summarize(records),
        }

        if any(r.grayscale_result for r in records):
            report["grayscale_breakdown"] = self._grayscale_breakdown(records)

        report["suspended_records"] = self._suspended_detail(records)

        bad_data_records = [r for r in records if r.bad_data_refs]
        if bad_data_records:
            report["bad_data_alerts"] = self._bad_data_detail(bad_data_records)

        if include_timeline:
            report["timeline"] = self._timeline_detail(records)

        report["records"] = self._record_detail(records, include_raw_fields)

        return report

    def generate_text_report(
        self,
        record_ids: Optional[List[str]] = None,
        include_timeline: bool = True,
    ) -> str:
        report = self.generate_report(
            record_ids=record_ids,
            include_timeline=include_timeline,
            include_raw_fields=False,
        )
        lines: List[str] = []
        lines.append("=" * 60)
        lines.append("负采样上线守门 - 报告")
        lines.append("=" * 60)
        lines.append(f"生成时间: {report['report_timestamp']}")
        lines.append(f"总记录数: {report['total_records']}")
        lines.append("")

        summary = report["summary"]
        lines.append("--- 状态汇总 ---")
        for status, count in summary.get("by_status", {}).items():
            lines.append(f"  {status}: {count}")
        if summary.get("bad_data_count"):
            lines.append(f"  坏数据记录: {summary['bad_data_count']}")
        lines.append("")

        if "grayscale_breakdown" in report:
            lines.append("--- 灰度拆解 ---")
            for item in report["grayscale_breakdown"]:
                lines.append(f"  记录: {item['record_id']}")
                lines.append(f"    灰度比例: {item['grayscale_ratio']}")
                sc = item.get("sample_change", {})
                if sc:
                    lines.append(
                        f"    样本变化: {sc.get('before')} -> {sc.get('after')} (delta={sc.get('delta')})"
                    )
                tc = item.get("threshold_change", {})
                if tc:
                    lines.append(
                        f"    阈值变化: {tc.get('before')} -> {tc.get('after')} (delta={tc.get('delta')})"
                    )
                mo = item.get("manual_overrides", [])
                if mo:
                    lines.append(f"    人工改判: {', '.join(mo)}")
                lines.append("")

        if report.get("suspended_records"):
            lines.append("--- 挂起记录 ---")
            for item in report["suspended_records"]:
                lines.append(f"  记录: {item['record_id']}")
                lines.append(f"    原因: {item['reason']}")
                lines.append(f"    时间: {item['suspended_at']}")
                lines.append(f"    原始参考: {item['raw_log_ref']}")
                lines.append("")

        if report.get("bad_data_alerts"):
            lines.append("--- 坏数据告警 ---")
            for item in report["bad_data_alerts"]:
                lines.append(f"  记录: {item['record_id']}")
                for ref in item["refs"]:
                    lines.append(f"    -> {ref}")
                lines.append("")

        if include_timeline and "timeline" in report:
            lines.append("--- 历史时间线 ---")
            for evt in report["timeline"]:
                lines.append(
                    f"  [{evt['timestamp']}] {evt['event_type']}: {evt['description']}"
                )
                if evt.get("raw_log_ref"):
                    lines.append(f"    原始参考: {evt['raw_log_ref']}")
                lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)

    def _summarize(self, records: List[GateRecord]) -> Dict[str, Any]:
        by_status: Dict[str, int] = {}
        for r in records:
            key = r.status.value
            by_status[key] = by_status.get(key, 0) + 1
        return {
            "by_status": by_status,
            "bad_data_count": len([r for r in records if r.bad_data_refs]),
        }

    def _grayscale_breakdown(self, records: List[GateRecord]) -> List[Dict[str, Any]]:
        results = []
        for r in records:
            if r.grayscale_result:
                bd = r.grayscale_result.breakdown()
                bd["record_id"] = r.record_id
                bd["entry_id"] = r.log_entry.entry_id
                results.append(bd)
        return results

    def _suspended_detail(self, records: List[GateRecord]) -> List[Dict[str, Any]]:
        results = []
        for r in records:
            if r.status == GateStatus.SUSPENDED:
                results.append(
                    {
                        "record_id": r.record_id,
                        "entry_id": r.log_entry.entry_id,
                        "reason": r.suspended_reason,
                        "suspended_at": r.suspended_at.isoformat() if r.suspended_at else None,
                        "raw_log_ref": r.log_entry.get_original_reference(),
                    }
                )
        return results

    def _bad_data_detail(self, records: List[GateRecord]) -> List[Dict[str, Any]]:
        results = []
        for r in records:
            results.append(
                {
                    "record_id": r.record_id,
                    "entry_id": r.log_entry.entry_id,
                    "refs": r.bad_data_refs,
                    "raw_log_ref": r.log_entry.get_original_reference(),
                }
            )
        return results

    def _timeline_detail(self, records: List[GateRecord]) -> List[Dict[str, Any]]:
        all_record_ids = [r.record_id for r in records]
        events = []
        seen = set()
        for rid in all_record_ids:
            for evt in self.timeline.get_events_for_record(rid):
                if evt.event_id not in seen:
                    seen.add(evt.event_id)
                    events.append(
                        {
                            "event_id": evt.event_id,
                            "event_type": evt.event_type.value,
                            "timestamp": evt.timestamp.isoformat(),
                            "record_id": evt.record_id,
                            "description": evt.description,
                            "raw_log_ref": evt.raw_log_ref,
                        }
                    )
        events.sort(key=lambda e: e["timestamp"])
        return events

    def _record_detail(
        self, records: List[GateRecord], include_raw: bool
    ) -> List[Dict[str, Any]]:
        results = []
        for r in records:
            entry = r.log_entry
            detail: Dict[str, Any] = {
                "record_id": r.record_id,
                "entry_id": entry.entry_id,
                "status": r.status.value,
                "sample_id": entry.sample_id,
                "version": entry.version,
                "neg_sample_ratio": entry.neg_sample_ratio,
                "threshold": entry.threshold,
                "grayscale_ratio": entry.grayscale_ratio,
                "quality_flag": entry.quality_flag,
                "bad_data_refs": r.bad_data_refs,
                "suspended_reason": r.suspended_reason,
                "original_reference": entry.get_original_reference(),
            }
            if r.grayscale_result:
                detail["grayscale_breakdown"] = r.grayscale_result.breakdown()
            if include_raw:
                detail["raw_fields"] = entry.raw_fields
                detail["source_info"] = {
                    k: {
                        "original_field_name": v.original_field_name,
                        "raw_value": v.raw_value,
                    }
                    for k, v in entry.source_info.items()
                }
            results.append(detail)
        return results
