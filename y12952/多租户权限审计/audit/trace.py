from typing import Dict, List, Any, Optional
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import Database


class TraceEngine:
    def __init__(self, db: Database):
        self.db = db

    def trace_finding(self, finding_id: str) -> Dict[str, Any]:
        finding = self.db.get_audit_finding(finding_id)
        if not finding:
            raise ValueError(f"未找到审计记录 {finding_id}")

        chain: Dict[str, Any] = {"finding": finding, "chain": []}

        record_id = finding.get("processing_record_id")
        processing_record = None
        if record_id:
            processing_record = self.db.get_processing_record(record_id)
            chain["processing_record"] = processing_record

        migration_script = None
        script_id = finding.get("migration_script_id") or (
            processing_record.get("migration_script_id") if processing_record else None
        )
        if script_id:
            migration_script = self.db.get_migration_script(script_id)
            chain["migration_script"] = migration_script

        tenant_id = finding.get("tenant_id")
        tenant = None
        if tenant_id:
            tenant = self.db.get_tenant(tenant_id)
            chain["tenant"] = tenant

        permission_rule = None
        rule_id = finding.get("permission_rule_id") or (
            processing_record.get("permission_rule_id") if processing_record else None
        )
        chain_lines = []
        chain_lines.append({
            "step": "异常发现",
            "detail": f"[{finding['detected_at']}] {finding['title']}",
            "who": "审计引擎",
        })
        if processing_record:
            chain_lines.append({
                "step": "处理记录溯源",
                "detail": f"批次 {processing_record['batch_no']} / {processing_record['record_id']} - "
                          f"{processing_record['record_type']} 状态={processing_record['status']}",
                "who": processing_record.get("processed_by") or "系统",
                "when": processing_record["processed_at"],
            })
        if migration_script:
            chain_lines.append({
                "step": "关联迁移脚本",
                "detail": f"{migration_script['version']} {migration_script['name']} "
                          f"({migration_script['filepath']}) 执行状态: {migration_script['status']}",
                "who": migration_script.get("applied_by"),
                "when": migration_script.get("applied_at"),
                "content_preview": migration_script["content"][:200],
            })
        if tenant:
            chain_lines.append({
                "step": "所属租户",
                "detail": f"{tenant['tenant_id']} {tenant['tenant_name']} ({tenant['environment']})",
            })
        if finding.get("handler_opinion"):
            chain_lines.append({
                "step": "处理意见",
                "detail": finding["handler_opinion"],
            })
        chain["timeline"] = chain_lines

        histories = self.db.list_review_histories(finding_id)
        if histories:
            chain["review_histories"] = histories
            for h in histories:
                chain_lines.append({
                    "step": f"复核动作 ({h['action']})",
                    "detail": f"{h['reviewed_at']} 由 {h['reviewer']} 操作：{h['comment']}",
                    "who": h['reviewer'],
                    "when": h['reviewed_at'],
                })
        chain["summary"] = self._build_summary(finding, processing_record, migration_script, tenant)
        return chain

    @staticmethod
    def _build_summary(finding, proc, mig, tenant) -> str:
        parts = []
        parts.append(f"异常 {finding['finding_id']}: {finding['title']}")
        if tenant:
            parts.append(f"租户: {tenant['tenant_name']} ({tenant['tenant_id']}, 环境 {tenant['environment']}")
        if proc:
            parts.append(f"处理记录: {proc['record_id']}, 批次 {proc['batch_no']}, 操作员 {proc.get('processed_by') or 'N/A'}")
        if mig:
            parts.append(f"迁移脚本: {mig['version']} {mig['name']}")
        return " → ".join(parts)

    def trace_by_record(self, record_id: str) -> Dict[str, Any]:
        proc = self.db.get_processing_record(record_id)
        if not proc:
            raise ValueError(f"未找到处理记录 {record_id}")
        finding = None
        for f in self.db.list_audit_findings():
            if f["processing_record_id"] == record_id:
                finding = f
                break
        if not finding:
            result: Dict[str, Any] = {"processing_record": proc, "message": "该处理记录未关联审计异常。"}
            return result
        return self.trace_finding(finding["finding_id"])
