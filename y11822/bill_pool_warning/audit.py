from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class AuditEntry:
    timestamp: str
    action: str
    entity_type: str
    entity_id: str
    detail: str
    before: Optional[str] = None
    after: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "detail": self.detail,
            "before": self.before,
            "after": self.after,
        }


class AuditTrail:
    def __init__(self, audit_dir: str = ".bill_pool_audit"):
        self.audit_dir = Path(audit_dir)
        self.audit_dir.mkdir(exist_ok=True)
        self.entries: list[AuditEntry] = []

    def record(self, action: str, entity_type: str, entity_id: str,
               detail: str, before: Optional[str] = None,
               after: Optional[str] = None) -> None:
        self.entries.append(AuditEntry(
            timestamp=datetime.now().isoformat(),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
            before=before,
            after=after,
        ))

    def record_state_transition(self, bill_id: str, from_status: str,
                                to_status: str, reason: str) -> None:
        self.record(
            action="状态转换",
            entity_type="票据",
            entity_id=bill_id,
            detail=f"票据 {bill_id} 从 {from_status} 转为 {to_status}，原因: {reason}",
            before=from_status,
            after=to_status,
        )

    def record_quota_recalc(self, pool_id: str, old_quota: dict,
                            new_quota: dict, reason: str) -> None:
        self.record(
            action="额度重算",
            entity_type="票据池",
            entity_id=pool_id,
            detail=f"票据池 {pool_id} 额度重算，原因: {reason}。"
                   f"已用额度: {old_quota.get('used_quota')}→{new_quota.get('used_quota')}，"
                   f"可用额度: {old_quota.get('available_quota')}→{new_quota.get('available_quota')}",
            before=json.dumps(old_quota, ensure_ascii=False),
            after=json.dumps(new_quota, ensure_ascii=False),
        )

    def record_validation(self, record_id: str, record_type: str,
                          errors: list[dict]) -> None:
        if not errors:
            return
        for e in errors:
            self.record(
                action="数据校验",
                entity_type=record_type,
                entity_id=record_id,
                detail=f"校验发现问题: {e.get('detail', '')}，"
                       f"字段={e.get('field_name', '')}，类型={e.get('error_type', '')}",
            )

    def check_consistency(self, pool_data: dict, report_data: dict) -> list[dict]:
        inconsistencies: list[dict] = []

        pool_quota = pool_data.get("quota_snapshot", {})
        report_used = report_data.get("total_used_in_warnings", 0)

        if abs(pool_quota.get("used_quota", 0) - report_used) > 0.01:
            inconsistencies.append({
                "type": "额度不一致",
                "detail": f"票据池额度快照显示已用额度={pool_quota.get('used_quota')}，"
                          f"但预警报告中额度影响合计={report_used}。"
                          f"原因分析: 额度快照计算的是当前状态为'质押'或'贴现'的票据金额之和，"
                          f"预警报告中额度影响合计包括所有到期预警票据的金额（可能包含'即将到期'状态的票据）。"
                          f"两者口径不同是正常现象，但如果差异过大，需要检查是否有票据状态机转换遗漏。",
                "pool_used_quota": pool_quota.get("used_quota"),
                "report_used_quota": report_used,
            })

        return inconsistencies

    def save(self, run_id: Optional[str] = None) -> str:
        if not run_id:
            run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        data = {
            "run_id": run_id,
            "entries": [e.to_dict() for e in self.entries],
        }

        path = self.audit_dir / f"audit_{run_id}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return run_id

    def load(self, run_id: str) -> list[AuditEntry]:
        path = self.audit_dir / f"audit_{run_id}.json"
        if not path.exists():
            return []
        data = json.loads(path.read_text(encoding="utf-8"))
        return [
            AuditEntry(
                timestamp=e["timestamp"],
                action=e["action"],
                entity_type=e["entity_type"],
                entity_id=e["entity_id"],
                detail=e["detail"],
                before=e.get("before"),
                after=e.get("after"),
            )
            for e in data.get("entries", [])
        ]

    def lookup_bill_history(self, bill_id: str, run_id: Optional[str] = None) -> list[AuditEntry]:
        if run_id:
            entries = self.load(run_id)
        else:
            entries = self.entries
        return [e for e in entries if e.entity_id == bill_id]

    def explain_inconsistency(self, inconsistency: dict) -> str:
        itype = inconsistency.get("type", "")
        if itype == "额度不一致":
            return (
                f"【额度不一致说明】\n"
                f"票据池额度快照(used_quota={inconsistency.get('pool_used_quota')})与"
                f"预警报告合计(report_used={inconsistency.get('report_used_quota')})不一致。\n\n"
                f"原因追溯:\n"
                f"1. 额度快照 = 所有状态为'质押'的票据金额 + 所有状态为'贴现'的票据金额\n"
                f"   → 数据来源: 票据信息中的status字段和amount字段\n"
                f"2. 预警报告合计 = 所有到期预警票据的quota_impact之和\n"
                f"   → 数据来源: 到期预警引擎根据票据状态计算的额度影响\n"
                f"3. 差异原因: 即将到期(MATURITY_PENDING)的票据在预警报告中计入额度影响，"
                f"但在额度快照中不计入已用额度（因其状态已不是质押/贴现）\n\n"
                f"建议: 关注即将到期票据的质押合同是否已安排释放，"
                f"如果质押释放延迟，额度仍被占用但快照中可能不体现。"
            )
        return f"未识别的不一致类型: {itype}"
