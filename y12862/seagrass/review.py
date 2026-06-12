"""
复核入口模块
界面或终端输出里留一点复核入口，别让海岛运维只能重新导入来修正。
提供：按条件查记录、修正字段、查看溯源链、重新跑某步。
"""

from typing import List, Optional, Callable

from .models import ProcessingRecord


class ReviewPortal:
    """复核入口 - 终端/界面都可调用"""

    def __init__(self, records: List[ProcessingRecord]):
        self.records = records
        self._index = {r.record_id: r for r in records}
        self._audit_log = []

    def _log(self, action: str, record_id: str, detail: str):
        self._audit_log.append({
            "action": action,
            "record_id": record_id,
            "detail": detail,
        })

    def find_by_id(self, record_id: str) -> Optional[ProcessingRecord]:
        return self._index.get(record_id)

    def find_by_flag(self, flag_prefix: str) -> List[ProcessingRecord]:
        return [r for r in self.records
                if any(f.startswith(flag_prefix) for f in r.flags)]

    def find_by_status(self, status: str) -> List[ProcessingRecord]:
        return [r for r in self.records if r.status == status]

    def find_by_vessel(self, vessel_id: str) -> List[ProcessingRecord]:
        return [r for r in self.records if r.vessel_id == vessel_id]

    def trace(self, record_id: str) -> str:
        """从结果一路回到来源和处理记录"""
        r = self._index.get(record_id)
        if r is None:
            return f"记录 {record_id} 不存在"
        return r.trace_back()

    def trace_anomaly(self) -> str:
        """
        找出所有异常，输出溯源。
        验收时顺着异常往回查：能查到气象预报和处理意见才算顺。
        """
        flagged = [r for r in self.records if r.flags]
        if not flagged:
            return "无异常记录"

        lines = ["=== 异常记录溯源 ===", ""]
        for r in flagged:
            lines.append(r.trace_back(indent=0))
            lines.append("")

            weather_op = r.get_latest_opinion_by_stage("weather_forecast")
            if weather_op:
                lines.append(f"  气象预报意见: {weather_op.opinion}")
                lines.append(f"  气象预报决策: {weather_op.decision}")
                if weather_op.evidence:
                    for k, v in weather_op.evidence.items():
                        lines.append(f"    {k}: {v}")
                lines.append("")

            for src in r.source_refs:
                if src.source_type == "weather_forecast":
                    lines.append(f"  气象预报来源: {src.source_name} (id={src.source_id})")
                    lines.append("")

        return "\n".join(lines)

    def correct_field(self, record_id: str, field_name: str,
                      old_value, new_value, reason: str) -> bool:
        """
        修正记录字段。
        不用重新导入，直接修正，修正意见写入处理记录。
        """
        r = self._index.get(record_id)
        if r is None:
            return False

        current = getattr(r, field_name, None)
        if current != old_value:
            return False

        setattr(r, field_name, new_value)
        r.add_opinion(
            stage="review_correction",
            operator="review_portal",
            opinion=f"修正字段 {field_name}: {old_value} -> {new_value}，原因: {reason}",
            decision="corrected",
            evidence={
                "field": field_name,
                "old_value": str(old_value),
                "new_value": str(new_value),
                "reason": reason,
            }
        )
        self._log("correct", record_id,
                   f"{field_name}: {old_value} -> {new_value}")
        return True

    def remove_flag(self, record_id: str, flag: str, reason: str) -> bool:
        """
        移除标记（比如确认时区其实没错）。
        修正意见写入处理记录。
        """
        r = self._index.get(record_id)
        if r is None or flag not in r.flags:
            return False

        r.flags.remove(flag)
        if not r.flags:
            if r.status == "flagged":
                r.status = "estimated"
        r.add_opinion(
            stage="review_correction",
            operator="review_portal",
            opinion=f"移除标记 {flag}，原因: {reason}",
            decision="flag_removed",
            evidence={"removed_flag": flag, "reason": reason}
        )
        self._log("remove_flag", record_id, f"removed {flag}")
        return True

    def reprocess(self, record_id: str, step_func: Callable,
                  step_name: str = "reprocess") -> bool:
        """
        对单条记录重跑某步处理。
        比如修正了时区后重跑潮汐计算。
        """
        r = self._index.get(record_id)
        if r is None:
            return False

        r.add_opinion(
            stage="review_correction",
            operator="review_portal",
            opinion=f"重新执行处理步骤: {step_name}",
            decision="reprocess",
            evidence={"step_name": step_name}
        )
        step_func(r)
        self._log("reprocess", record_id, step_name)
        return True

    def audit_log_summary(self) -> str:
        lines = ["=== 复核操作审计 ==="]
        for entry in self._audit_log:
            lines.append(f"  {entry['action']} | {entry['record_id']} | {entry['detail']}")
        return "\n".join(lines)

    def interactive_summary(self) -> str:
        """
        终端输出的复核入口摘要。
        海岛运维看到这个就知道怎么查、怎么改。
        """
        flagged = [r for r in self.records if r.flags]
        dups = [r for r in self.records if "duplicate" in r.flags]
        lines = []
        lines.append("")
        lines.append("╔══════════════════════════════════════════════╗")
        lines.append("║     SEAGRASS ESTIMATION - REVIEW PORTAL     ║")
        lines.append("╠══════════════════════════════════════════════╣")
        lines.append(f"║  Total records: {len(self.records):>5}                       ║")
        lines.append(f"║  Flagged:       {len(flagged):>5}                       ║")
        lines.append(f"║  Duplicates:    {len(dups):>5}                       ║")
        lines.append("╠══════════════════════════════════════════════╣")
        lines.append("║  Commands:                                   ║")
        lines.append("║    trace <record_id>   - Trace source        ║")
        lines.append("║    anomalies           - List all anomalies   ║")
        lines.append("║    correct <id> <field> <old> <new> <reason>  ║")
        lines.append("║    unflag <id> <flag>  - Remove a flag        ║")
        lines.append("║    audit               - View audit log       ║")
        lines.append("╚══════════════════════════════════════════════╝")
        lines.append("")
        return "\n".join(lines)
