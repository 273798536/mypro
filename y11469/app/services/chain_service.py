import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.enums import RecordStatus
from app.models.ledger import (
    ProcessingChain, LedgerRecord, FabricInventory,
    SizeModification, SampleTransfer
)


def json_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def safe_json_dumps(data):
    return json.loads(json.dumps(data, default=json_serializer))


class ChainService:
    def __init__(self, db: Session):
        self.db = db

    def generate_chain_no(self) -> str:
        return f"CHN-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    def get_style_versions(self, style_code: str) -> List[LedgerRecord]:
        return self.db.query(LedgerRecord).filter(
            LedgerRecord.style_code == style_code,
            LedgerRecord.is_deleted == False
        ).order_by(LedgerRecord.version).all()

    def get_version_fabric_records(self, style_code: str, version: int) -> List[FabricInventory]:
        return self.db.query(FabricInventory).filter(
            FabricInventory.style_code == style_code,
            FabricInventory.version == version,
            FabricInventory.is_deleted == False
        ).order_by(FabricInventory.operation_date).all()

    def get_version_modifications(self, style_code: str, version: int) -> List[SizeModification]:
        return self.db.query(SizeModification).filter(
            SizeModification.style_code == style_code,
            SizeModification.version == version,
            SizeModification.is_deleted == False
        ).all()

    def detect_old_fabric_usage(self, style_code: str) -> List[Dict[str, Any]]:
        versions = self.get_style_versions(style_code)
        old_fabric_issues = []

        for i, current_version in enumerate(versions):
            if i == 0:
                continue

            prev_version = versions[i - 1]

            modifications = self.get_version_modifications(style_code, current_version.version)
            requires_new = any(m.requires_new_fabric for m in modifications)

            if requires_new:
                fabric_records = self.get_version_fabric_records(style_code, current_version.version)

                for fabric in fabric_records:
                    if fabric.is_old_version or fabric.operation_type == "出库":
                        issue = {
                            "version": current_version.version,
                            "fabric_record_id": fabric.id,
                            "inventory_no": fabric.inventory_no,
                            "fabric_code": fabric.fabric_code,
                            "fabric_name": fabric.fabric_name,
                            "quantity": fabric.quantity,
                            "operation_date": fabric.operation_date.isoformat() if fabric.operation_date else None,
                            "operator": fabric.operator,
                            "receiver": fabric.receiver,
                            "is_marked_old": fabric.is_old_version,
                            "old_version_note": fabric.old_version_note,
                            "disposition_status": fabric.disposition_status,
                            "should_be_new": requires_new,
                            "source_file": fabric.source_file,
                            "source_row": fabric.source_row_number,
                        }
                        old_fabric_issues.append(issue)

        return old_fabric_issues

    def build_processing_chain(self, style_code: str) -> ProcessingChain:
        versions = self.get_style_versions(style_code)
        if not versions:
            raise ValueError(f"款号 {style_code} 没有找到任何版本记录")

        root_record = versions[0]
        chain_nodes = []
        version_path_parts = []

        for version in versions:
            fabric_records = self.get_version_fabric_records(style_code, version.version)
            modifications = self.get_version_modifications(style_code, version.version)

            modification_reasons = "; ".join([
                m.modification_reason for m in modifications if m.modification_reason
            ])

            fabric_info = []
            for fabric in fabric_records:
                fabric_info.append({
                    "inventory_no": fabric.inventory_no,
                    "operation_type": fabric.operation_type,
                    "fabric_code": fabric.fabric_code,
                    "fabric_name": fabric.fabric_name,
                    "quantity": fabric.quantity,
                    "operation_date": fabric.operation_date.isoformat() if fabric.operation_date else None,
                    "is_old_version": fabric.is_old_version,
                    "operator": fabric.operator,
                    "receiver": fabric.receiver,
                })

            node = {
                "version": version.version,
                "ledger_id": version.id,
                "record_no": version.record_no,
                "status": version.status,
                "modification_reason": modification_reasons if modification_reasons else None,
                "fabric_records": fabric_info,
                "designer": version.designer,
                "pattern_maker": version.pattern_maker,
                "sample_maker": version.sample_maker,
                "warehouse_keeper": version.warehouse_keeper,
                "created_at": version.created_at.isoformat() if version.created_at else None,
            }
            chain_nodes.append(node)
            version_path_parts.append(f"v{version.version}")

        old_fabric_issues = self.detect_old_fabric_usage(style_code)
        has_issues = len(old_fabric_issues) > 0

        responsibility_analysis = None
        if has_issues:
            responsibility_analysis = self._analyze_responsibility(old_fabric_issues)

        chain_nodes_safe = safe_json_dumps(chain_nodes)
        old_fabric_issues_safe = safe_json_dumps(old_fabric_issues)

        existing_chain = self.db.query(ProcessingChain).filter(
            ProcessingChain.style_code == style_code
        ).first()

        if existing_chain:
            existing_chain.chain_nodes = chain_nodes_safe
            existing_chain.version_path = " -> ".join(version_path_parts)
            existing_chain.has_old_fabric_issue = has_issues
            existing_chain.old_fabric_records = old_fabric_issues_safe
            existing_chain.responsibility_analysis = responsibility_analysis
            existing_chain.updated_at = datetime.utcnow()
            chain = existing_chain
        else:
            chain = ProcessingChain(
                chain_no=self.generate_chain_no(),
                style_code=style_code,
                root_ledger_id=root_record.id,
                chain_nodes=chain_nodes_safe,
                version_path=" -> ".join(version_path_parts),
                has_old_fabric_issue=has_issues,
                old_fabric_records=old_fabric_issues_safe,
                responsibility_analysis=responsibility_analysis,
                chain_status="analyzed" if has_issues else "normal",
            )
            self.db.add(chain)

        self.db.commit()
        self.db.refresh(chain)
        return chain

    def _analyze_responsibility(self, issues: List[Dict[str, Any]]) -> str:
        role_counts = {}
        for issue in issues:
            receiver = issue.get("receiver", "未知")
            operator = issue.get("operator", "未知")

            if receiver:
                role_counts[receiver] = role_counts.get(receiver, 0) + 1
            if operator and operator != receiver:
                role_counts[operator] = role_counts.get(operator, 0) + 1

        analysis_parts = [f"共发现 {len(issues)} 条旧面料领用问题:"]

        for issue in issues:
            mark_status = "已标记" if issue["is_marked_old"] else "未标记"
            analysis_parts.append(
                f"- 版本{issue['version']}: {issue['fabric_name']} "
                f"({issue['quantity']}米), 领用者: {issue['receiver']}, "
                f"操作人: {issue['operator']}, 状态: {mark_status}"
            )

        if role_counts:
            analysis_parts.append("\n涉及人员统计:")
            for person, count in sorted(role_counts.items(), key=lambda x: -x[1]):
                analysis_parts.append(f"- {person}: {count}次")

        return "\n".join(analysis_parts)

    def get_chain(self, style_code: str) -> Optional[ProcessingChain]:
        return self.db.query(ProcessingChain).filter(
            ProcessingChain.style_code == style_code
        ).first()

    def get_all_chains(self, has_issues_only: bool = False) -> List[ProcessingChain]:
        query = self.db.query(ProcessingChain)
        if has_issues_only:
            query = query.filter(ProcessingChain.has_old_fabric_issue == True)
        return query.order_by(ProcessingChain.created_at.desc()).all()

    def review_chain(self, chain_id: int, reviewer: str, reviewer_role: str, remarks: str = None) -> ProcessingChain:
        chain = self.db.query(ProcessingChain).filter(ProcessingChain.id == chain_id).first()
        if not chain:
            raise ValueError(f"处理链条不存在: {chain_id}")

        chain.reviewed_by = reviewer
        chain.reviewed_at = datetime.utcnow()
        chain.chain_status = "reviewed"
        if remarks:
            if chain.remarks:
                chain.remarks += f"\n[{datetime.utcnow().isoformat()}] {reviewer}: {remarks}"
            else:
                chain.remarks = f"[{datetime.utcnow().isoformat()}] {reviewer}: {remarks}"

        self.db.commit()
        self.db.refresh(chain)
        return chain

    def get_chain_timeline(self, style_code: str) -> List[Dict[str, Any]]:
        versions = self.get_style_versions(style_code)
        timeline = []

        for version in versions:
            timeline.append({
                "type": "version_create",
                "version": version.version,
                "date": version.created_at,
                "description": f"创建版本 {version.version}",
                "person": version.designer or "系统",
                "record_no": version.record_no,
            })

            for status in version.status_history:
                timeline.append({
                    "type": "status_change",
                    "version": version.version,
                    "date": status.operated_at,
                    "description": f"{status.from_status or '初始'} -> {status.to_status}: {status.transition_reason}",
                    "person": status.operator,
                    "role": status.operator_role,
                })

            modifications = self.get_version_modifications(style_code, version.version)
            for mod in modifications:
                timeline.append({
                    "type": "modification",
                    "version": version.version,
                    "date": mod.modified_date,
                    "description": f"尺码修改: {mod.modification_reason}",
                    "person": mod.designer,
                    "requires_new_fabric": mod.requires_new_fabric,
                })

            fabrics = self.get_version_fabric_records(style_code, version.version)
            for fabric in fabrics:
                action = "领用" if fabric.operation_type == "出库" else "入库"
                timeline.append({
                    "type": "fabric",
                    "version": version.version,
                    "date": fabric.operation_date,
                    "description": f"{action}面料: {fabric.fabric_name} ({fabric.quantity}{fabric.unit})",
                    "person": fabric.receiver or fabric.operator,
                    "is_old_version": fabric.is_old_version,
                })

        timeline.sort(key=lambda x: x["date"] or datetime.min)
        return timeline
