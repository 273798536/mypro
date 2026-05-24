from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import hashlib
import os
import json
import re

from .models import (
    Contract, PaymentNode, AcceptanceEmail, SupplementalAgreement,
    ImportSource, ChangeRecord, AuditLog, ManualJudgment, ExportRecord,
    ContractStatus, ChangeType, RoleType, SourceFileType, ImportStatus
)
from .schemas import (
    ContractCreate, ContractUpdate, PaymentNodeCreate, PaymentNodeUpdate,
    StatusTransitionRequest, ManualJudgmentCreate
)
from .config import settings


class ContractService:
    @staticmethod
    def create_contract(db: Session, contract_data: ContractCreate) -> Contract:
        contract = Contract(**contract_data.model_dump(exclude={'created_by_role'}))
        contract.created_by = contract_data.created_by
        db.add(contract)
        db.flush()

        AuditService.create_audit_log(
            db=db,
            contract_id=contract.id,
            action="创建合同",
            action_detail=f"创建合同: {contract.contract_name}",
            operator=contract_data.created_by,
            operator_role=contract_data.created_by_role,
            after_data={"contract_no": contract.contract_no, "contract_name": contract.contract_name}
        )

        db.commit()
        db.refresh(contract)
        return contract

    @staticmethod
    def get_contract(db: Session, contract_id: int) -> Optional[Contract]:
        return db.query(Contract).filter(Contract.id == contract_id).first()

    @staticmethod
    def get_contract_by_no(db: Session, contract_no: str) -> Optional[Contract]:
        return db.query(Contract).filter(Contract.contract_no == contract_no).first()

    @staticmethod
    def list_contracts(db: Session, skip: int = 0, limit: int = 100, status: Optional[ContractStatus] = None) -> List[Contract]:
        query = db.query(Contract)
        if status:
            query = query.filter(Contract.status == status)
        return query.order_by(Contract.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_contract(db: Session, contract_id: int, update_data: ContractUpdate) -> Optional[Contract]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return None

        if contract.is_frozen:
            raise ValueError("合同已冻结，无法修改")

        old_data = {
            "contract_name": contract.contract_name,
            "party_a": contract.party_a,
            "party_b": contract.party_b,
            "total_amount": contract.total_amount
        }

        update_dict = update_data.model_dump(exclude_unset=True, exclude={'updated_by_role'})
        for key, value in update_dict.items():
            setattr(contract, key, value)

        contract.current_version += 1

        ChangeService.create_change_record(
            db=db,
            contract_id=contract.id,
            change_type=ChangeType.PARTY_CHANGE,
            change_reason="合同基本信息更新",
            changed_by=update_data.updated_by,
            changed_by_role=update_data.updated_by_role,
            old_value=old_data,
            new_value={k: getattr(contract, k) for k in old_data.keys()},
            version_before=contract.current_version - 1,
            version_after=contract.current_version
        )

        AuditService.create_audit_log(
            db=db,
            contract_id=contract.id,
            action="更新合同",
            action_detail=f"更新合同信息: {contract.contract_name}",
            operator=update_data.updated_by,
            operator_role=update_data.updated_by_role,
            before_data=old_data,
            after_data={k: getattr(contract, k) for k in old_data.keys()}
        )

        db.commit()
        db.refresh(contract)
        return contract

    @staticmethod
    def transition_status(db: Session, contract_id: int, request: StatusTransitionRequest) -> Tuple[bool, str, Optional[Contract]]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return False, "合同不存在", None

        if contract.is_frozen and request.target_status != ContractStatus.FROZEN:
            return False, "合同已冻结，无法变更状态", None

        valid_transitions = {
            ContractStatus.DRAFT: [ContractStatus.SUBMITTED],
            ContractStatus.SUBMITTED: [ContractStatus.REJECTED, ContractStatus.CONFIRMED, ContractStatus.DRAFT],
            ContractStatus.REJECTED: [ContractStatus.DRAFT, ContractStatus.SUBMITTED],
            ContractStatus.CONFIRMED: [ContractStatus.ARCHIVED, ContractStatus.FROZEN],
            ContractStatus.FROZEN: [ContractStatus.CONFIRMED],
            ContractStatus.ARCHIVED: []
        }

        if request.target_status not in valid_transitions.get(contract.status, []):
            return False, f"不允许从 {contract.status} 变更到 {request.target_status}", None

        old_status = contract.status
        contract.status = request.target_status

        change_type_map = {
            (ContractStatus.DRAFT, ContractStatus.SUBMITTED): "提交合同",
            (ContractStatus.SUBMITTED, ContractStatus.REJECTED): "驳回合同",
            (ContractStatus.SUBMITTED, ContractStatus.CONFIRMED): "二次确认通过",
            (ContractStatus.SUBMITTED, ContractStatus.DRAFT): "撤回提交",
            (ContractStatus.REJECTED, ContractStatus.DRAFT): "退回草稿",
            (ContractStatus.REJECTED, ContractStatus.SUBMITTED): "重新提交",
            (ContractStatus.CONFIRMED, ContractStatus.ARCHIVED): "归档合同",
        }

        action_detail = change_type_map.get((old_status, request.target_status), f"状态变更: {old_status} -> {request.target_status}")
        if request.reason:
            action_detail += f"，原因: {request.reason}"

        AuditService.create_audit_log(
            db=db,
            contract_id=contract.id,
            action=action_detail,
            action_detail=action_detail,
            operator=request.operator,
            operator_role=request.operator_role,
            before_data={"status": old_status},
            after_data={"status": request.target_status}
        )

        db.commit()
        db.refresh(contract)
        return True, "状态变更成功", contract

    @staticmethod
    def freeze_contract(db: Session, contract_id: int, frozen_by: str, frozen_by_role: RoleType, reason: str) -> Tuple[bool, str, Optional[Contract]]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return False, "合同不存在", None

        if contract.is_frozen:
            return False, "合同已处于冻结状态", None

        contract.is_frozen = True
        contract.frozen_at = datetime.now()
        contract.frozen_by = frozen_by
        old_status = contract.status
        contract.status = ContractStatus.FROZEN

        AuditService.create_audit_log(
            db=db,
            contract_id=contract.id,
            action="冻结合同",
            action_detail=f"冻结合同，原因: {reason}",
            operator=frozen_by,
            operator_role=frozen_by_role,
            before_data={"is_frozen": False, "status": old_status},
            after_data={"is_frozen": True, "status": ContractStatus.FROZEN}
        )

        db.commit()
        db.refresh(contract)
        return True, "合同已冻结", contract

    @staticmethod
    def unfreeze_contract(db: Session, contract_id: int, operator: str, operator_role: RoleType, reason: str) -> Tuple[bool, str, Optional[Contract]]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return False, "合同不存在", None

        if not contract.is_frozen:
            return False, "合同未冻结", None

        contract.is_frozen = False
        contract.status = ContractStatus.CONFIRMED

        AuditService.create_audit_log(
            db=db,
            contract_id=contract.id,
            action="解冻合同",
            action_detail=f"解冻合同，原因: {reason}",
            operator=operator,
            operator_role=operator_role,
            before_data={"is_frozen": True},
            after_data={"is_frozen": False}
        )

        db.commit()
        db.refresh(contract)
        return True, "合同已解冻", contract


class PaymentNodeService:
    @staticmethod
    def create_payment_node(db: Session, node_data: PaymentNodeCreate, source_file_id: Optional[int] = None) -> PaymentNode:
        node = PaymentNode(**node_data.model_dump())
        if source_file_id:
            node.source_file_id = source_file_id
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def get_payment_node(db: Session, node_id: int) -> Optional[PaymentNode]:
        return db.query(PaymentNode).filter(PaymentNode.id == node_id).first()

    @staticmethod
    def get_nodes_by_contract(db: Session, contract_id: int, latest_only: bool = True) -> List[PaymentNode]:
        query = db.query(PaymentNode).filter(PaymentNode.contract_id == contract_id)
        if latest_only:
            query = query.filter(PaymentNode.is_latest == True)
        return query.order_by(PaymentNode.node_no).all()

    @staticmethod
    def update_payment_node(db: Session, node_id: int, update_data: PaymentNodeUpdate) -> Tuple[bool, str, Optional[PaymentNode]]:
        old_node = PaymentNodeService.get_payment_node(db, node_id)
        if not old_node:
            return False, "付款节点不存在", None

        contract = ContractService.get_contract(db, old_node.contract_id)
        if contract and contract.is_frozen:
            return False, "合同已冻结，无法修改节点", None

        old_node.is_latest = False

        new_node_data = {c.name: getattr(old_node, c.name) for c in old_node.__table__.columns if c.name not in ['id', 'is_latest']}
        new_node_data['version'] = old_node.version + 1
        new_node_data['is_latest'] = True

        update_dict = update_data.model_dump(exclude_unset=True, exclude={'updated_by', 'updated_by_role', 'change_reason'})
        for key, value in update_dict.items():
            new_node_data[key] = value

        new_node = PaymentNode(**new_node_data)
        db.add(new_node)
        db.flush()

        ChangeService.create_change_record(
            db=db,
            contract_id=old_node.contract_id,
            payment_node_id=new_node.id,
            change_type=ChangeType.NODE_CHANGE,
            change_reason=update_data.change_reason,
            field_name=list(update_dict.keys())[0] if update_dict else None,
            old_value={k: getattr(old_node, k) for k in update_dict.keys()},
            new_value={k: getattr(new_node, k) for k in update_dict.keys()},
            changed_by=update_data.updated_by,
            changed_by_role=update_data.updated_by_role,
            version_before=old_node.version,
            version_after=new_node.version
        )

        AuditService.create_audit_log(
            db=db,
            contract_id=old_node.contract_id,
            action="更新付款节点",
            action_detail=f"更新节点 {old_node.node_name}: {update_data.change_reason}",
            operator=update_data.updated_by,
            operator_role=update_data.updated_by_role,
            before_data={k: getattr(old_node, k) for k in update_dict.keys()},
            after_data={k: getattr(new_node, k) for k in update_dict.keys()}
        )

        db.commit()
        db.refresh(new_node)
        return True, "节点更新成功", new_node


class ChangeService:
    @staticmethod
    def create_change_record(
        db: Session,
        contract_id: int,
        change_type: ChangeType,
        change_reason: str,
        changed_by: str,
        changed_by_role: RoleType,
        payment_node_id: Optional[int] = None,
        field_name: Optional[str] = None,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
        is_manual_revision: bool = False,
        revision_remark: Optional[str] = None,
        version_before: Optional[int] = None,
        version_after: Optional[int] = None,
        source_evidence: Optional[Dict] = None
    ) -> ChangeRecord:
        record = ChangeRecord(
            contract_id=contract_id,
            payment_node_id=payment_node_id,
            change_type=change_type,
            change_reason=change_reason,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            changed_by=changed_by,
            changed_by_role=changed_by_role,
            is_manual_revision=is_manual_revision,
            revision_remark=revision_remark,
            version_before=version_before,
            version_after=version_after,
            source_evidence=source_evidence
        )
        db.add(record)
        db.flush()
        return record

    @staticmethod
    def get_changes_by_contract(db: Session, contract_id: int) -> List[ChangeRecord]:
        return db.query(ChangeRecord).filter(ChangeRecord.contract_id == contract_id).order_by(ChangeRecord.changed_at.desc()).all()

    @staticmethod
    def get_manual_revisions(db: Session, contract_id: Optional[int] = None) -> List[ChangeRecord]:
        query = db.query(ChangeRecord).filter(ChangeRecord.is_manual_revision == True)
        if contract_id:
            query = query.filter(ChangeRecord.contract_id == contract_id)
        return query.order_by(ChangeRecord.changed_at.desc()).all()


class AuditService:
    @staticmethod
    def create_audit_log(
        db: Session,
        action: str,
        action_detail: str,
        operator: str,
        operator_role: RoleType,
        contract_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        before_data: Optional[Dict] = None,
        after_data: Optional[Dict] = None,
        is_readonly_access: bool = False
    ) -> AuditLog:
        log = AuditLog(
            contract_id=contract_id,
            action=action,
            action_detail=action_detail,
            operator=operator,
            operator_role=operator_role,
            ip_address=ip_address,
            before_data=before_data,
            after_data=after_data,
            is_readonly_access=is_readonly_access
        )
        db.add(log)
        db.flush()
        return log

    @staticmethod
    def get_audit_logs(db: Session, contract_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        query = db.query(AuditLog)
        if contract_id:
            query = query.filter(AuditLog.contract_id == contract_id)
        return query.order_by(AuditLog.operate_time.desc()).offset(skip).limit(limit).all()


class ImportService:
    @staticmethod
    def create_import_source(
        db: Session,
        file_name: str,
        file_type: SourceFileType,
        file_path: str,
        file_size: int,
        upload_by: str,
        contract_id: Optional[int] = None
    ) -> ImportSource:
        file_hash = ImportService._calculate_file_hash(file_path)
        import_source = ImportSource(
            contract_id=contract_id,
            file_name=file_name,
            file_type=file_type,
            file_path=file_path,
            file_hash=file_hash,
            file_size=file_size,
            upload_by=upload_by,
            import_status=ImportStatus.PENDING
        )
        db.add(import_source)
        db.commit()
        db.refresh(import_source)
        return import_source

    @staticmethod
    def _calculate_file_hash(file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def parse_and_import(
        db: Session,
        import_source_id: int,
        contract_id: int,
        parsed_data: Dict[str, Any]
    ) -> Tuple[bool, List[str], Dict]:
        import_source = db.query(ImportSource).filter(ImportSource.id == import_source_id).first()
        if not import_source:
            return False, ["导入源不存在"], {}

        errors = []
        success_count = 0
        failed_count = 0
        parsed_count = 0
        results = {"payment_nodes": [], "emails": [], "supplemental_agreements": []}

        try:
            if 'payment_nodes' in parsed_data:
                parsed_count += len(parsed_data['payment_nodes'])
                for idx, node_data in enumerate(parsed_data['payment_nodes']):
                    try:
                        node_data['contract_id'] = contract_id
                        node_data['original_line_no'] = idx + 1
                        node_data['original_value'] = node_data.copy()
                        node_create = PaymentNodeCreate(**node_data)
                        node = PaymentNodeService.create_payment_node(db, node_create, import_source_id)
                        results["payment_nodes"].append({"id": node.id, "name": node.node_name})
                        success_count += 1
                    except Exception as e:
                        errors.append(f"付款节点第{idx+1}行: {str(e)}")
                        failed_count += 1

            if 'acceptance_emails' in parsed_data:
                parsed_count += len(parsed_data['acceptance_emails'])
                for idx, email_data in enumerate(parsed_data['acceptance_emails']):
                    try:
                        email_data['contract_id'] = contract_id
                        email_data['original_line_no'] = idx + 1
                        email_data['original_value'] = email_data.copy()
                        email = AcceptanceEmail(**email_data)
                        email.source_file_id = import_source_id
                        db.add(email)
                        results["emails"].append({"id": email.id, "subject": email.email_subject})
                        success_count += 1
                    except Exception as e:
                        errors.append(f"验收邮件第{idx+1}行: {str(e)}")
                        failed_count += 1

            if 'supplemental_agreements' in parsed_data:
                parsed_count += len(parsed_data['supplemental_agreements'])
                for idx, sa_data in enumerate(parsed_data['supplemental_agreements']):
                    try:
                        sa_data['contract_id'] = contract_id
                        sa_data['original_line_no'] = idx + 1
                        sa_data['original_value'] = sa_data.copy()
                        sa = SupplementalAgreement(**sa_data)
                        sa.source_file_id = import_source_id
                        db.add(sa)
                        results["supplemental_agreements"].append({"id": sa.id, "name": sa.agreement_name})
                        success_count += 1
                    except Exception as e:
                        errors.append(f"补充协议第{idx+1}行: {str(e)}")
                        failed_count += 1

            import_source.parsed_count = parsed_count
            import_source.success_count = success_count
            import_source.failed_count = failed_count
            import_source.parse_result = results

            if failed_count == 0:
                import_source.import_status = ImportStatus.SUCCESS
            elif success_count > 0:
                import_source.import_status = ImportStatus.PARTIAL
                import_source.import_error = "; ".join(errors)
            else:
                import_source.import_status = ImportStatus.FAILED
                import_source.import_error = "; ".join(errors)

            db.commit()
            return failed_count == 0, errors, results

        except Exception as e:
            db.rollback()
            import_source.import_status = ImportStatus.FAILED
            import_source.import_error = f"导入失败: {str(e)}"
            db.commit()
            return False, [f"导入失败: {str(e)}"], {}


class ManualJudgmentService:
    @staticmethod
    def create_judgment(db: Session, judgment_data: ManualJudgmentCreate) -> ManualJudgment:
        judgment = ManualJudgment(**judgment_data.model_dump())
        db.add(judgment)
        db.flush()

        ChangeService.create_change_record(
            db=db,
            contract_id=judgment.contract_id,
            change_type=ChangeType.MANUAL_REVISION,
            change_reason=judgment.judgment_reason,
            changed_by=judgment.judged_by,
            changed_by_role=judgment.judged_by_role,
            is_manual_revision=True,
            revision_remark=judgment.remarks,
            source_evidence=judgment.original_evidence
        )

        AuditService.create_audit_log(
            db=db,
            contract_id=judgment.contract_id,
            action="人工改判",
            action_detail=f"{judgment.judgment_type}: {judgment.judgment_reason}",
            operator=judgment.judged_by,
            operator_role=judgment.judged_by_role,
            after_data=judgment.judgment_result
        )

        db.commit()
        db.refresh(judgment)
        return judgment

    @staticmethod
    def get_judgments_by_contract(db: Session, contract_id: int) -> List[ManualJudgment]:
        return db.query(ManualJudgment).filter(
            ManualJudgment.contract_id == contract_id,
            ManualJudgment.is_effective == True
        ).order_by(ManualJudgment.judged_at.desc()).all()


class ExportService:
    SENSITIVE_FIELDS = ['total_amount', 'planned_amount', 'actual_amount', 'bank_account', 'id_card', 'phone', 'email']

    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        masked = data.copy()
        for field in ExportService.SENSITIVE_FIELDS:
            if field in masked and masked[field] is not None:
                if isinstance(masked[field], (int, float)):
                    masked[field] = "***"
                elif isinstance(masked[field], str):
                    if '@' in masked[field]:
                        parts = masked[field].split('@')
                        masked[field] = f"{parts[0][:2]}***@{parts[1]}"
                    else:
                        masked[field] = masked[field][:2] + "***" + masked[field][-2:] if len(masked[field]) > 4 else "***"
        return masked

    @staticmethod
    def export_contracts(db: Session, contract_ids: Optional[List[int]] = None, mask_sensitive: bool = True) -> Tuple[List[Dict], int]:
        query = db.query(Contract)
        if contract_ids:
            query = query.filter(Contract.id.in_(contract_ids))
        contracts = query.all()

        export_data = []
        for contract in contracts:
            contract_data = {
                "id": contract.id,
                "contract_no": contract.contract_no,
                "contract_name": contract.contract_name,
                "party_a": contract.party_a,
                "party_b": contract.party_b,
                "total_amount": contract.total_amount,
                "status": contract.status,
                "is_frozen": contract.is_frozen,
                "created_at": contract.created_at.isoformat() if contract.created_at else None,
                "payment_nodes": [],
                "change_records": [],
                "manual_judgments": []
            }

            for node in PaymentNodeService.get_nodes_by_contract(db, contract.id):
                node_data = {
                    "node_name": node.node_name,
                    "node_no": node.node_no,
                    "planned_amount": node.planned_amount,
                    "actual_amount": node.actual_amount,
                    "planned_date": node.planned_date.isoformat() if node.planned_date else None,
                    "actual_date": node.actual_date.isoformat() if node.actual_date else None,
                    "is_completed": node.is_completed,
                    "is_disputed": node.is_disputed,
                    "version": node.version,
                    "original_line_no": node.original_line_no
                }
                contract_data["payment_nodes"].append(ExportService.mask_sensitive_data(node_data) if mask_sensitive else node_data)

            for change in ChangeService.get_changes_by_contract(db, contract.id):
                change_data = {
                    "change_type": change.change_type,
                    "change_reason": change.change_reason,
                    "field_name": change.field_name,
                    "old_value": change.old_value,
                    "new_value": change.new_value,
                    "changed_by": change.changed_by,
                    "changed_by_role": change.changed_by_role,
                    "changed_at": change.changed_at.isoformat() if change.changed_at else None,
                    "is_manual_revision": change.is_manual_revision
                }
                contract_data["change_records"].append(change_data)

            for judgment in ManualJudgmentService.get_judgments_by_contract(db, contract.id):
                judgment_data = {
                    "judgment_type": judgment.judgment_type,
                    "judgment_reason": judgment.judgment_reason,
                    "judgment_result": judgment.judgment_result,
                    "judged_by": judgment.judged_by,
                    "judged_at": judgment.judged_at.isoformat() if judgment.judged_at else None
                }
                contract_data["manual_judgments"].append(judgment_data)

            export_data.append(ExportService.mask_sensitive_data(contract_data) if mask_sensitive else contract_data)

        return export_data, len(export_data)

    @staticmethod
    def create_export_record(
        db: Session,
        export_type: str,
        export_by: str,
        export_by_role: RoleType,
        file_name: str,
        file_path: str,
        record_count: int,
        is_sensitive_masked: bool = True,
        contract_ids: Optional[List[int]] = None,
        remark: Optional[str] = None
    ) -> ExportRecord:
        file_hash = ImportService._calculate_file_hash(file_path)
        record = ExportRecord(
            export_type=export_type,
            is_sensitive_masked=is_sensitive_masked,
            export_by=export_by,
            export_by_role=export_by_role,
            file_path=file_path,
            file_name=file_name,
            file_hash=file_hash,
            record_count=record_count,
            export_remark=remark,
            related_contract_ids=contract_ids
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


class RoleViewService:
    @staticmethod
    def get_role_view(db: Session, role: RoleType) -> Dict[str, Any]:
        role_responsibilities = {
            RoleType.CONTRACT_MANAGER: [ContractStatus.DRAFT, ContractStatus.REJECTED],
            RoleType.LEGAL: [ContractStatus.SUBMITTED],
            RoleType.FINANCE: [ContractStatus.CONFIRMED, ContractStatus.FROZEN],
            RoleType.BUSINESS_HEAD: [ContractStatus.CONFIRMED, ContractStatus.FROZEN, ContractStatus.SUBMITTED],
            RoleType.AUDITOR: [],
            RoleType.ADMIN: []
        }

        target_statuses = role_responsibilities.get(role, [])
        pending_query = db.query(Contract)
        if target_statuses:
            pending_query = pending_query.filter(Contract.status.in_(target_statuses))
        pending_count = pending_query.count()

        total_count = db.query(Contract).count()
        disputed_count = db.query(PaymentNode).filter(PaymentNode.is_disputed == True).distinct(PaymentNode.contract_id).count()

        recent_changes = db.query(ChangeRecord).order_by(ChangeRecord.changed_at.desc()).limit(10).all()

        return {
            "role": role,
            "pending_count": pending_count,
            "total_count": total_count,
            "disputed_count": disputed_count,
            "recent_changes": recent_changes
        }

    @staticmethod
    def get_change_analysis(db: Session, contract_id: int) -> Optional[Dict[str, Any]]:
        contract = ContractService.get_contract(db, contract_id)
        if not contract:
            return None

        changes = ChangeService.get_changes_by_contract(db, contract_id)
        change_types = {}
        sensitive_changes = []
        version_history = []

        for change in changes:
            ct = change.change_type.value
            change_types[ct] = change_types.get(ct, 0) + 1

            if change.field_name in ExportService.SENSITIVE_FIELDS:
                sensitive_changes.append({
                    "field": change.field_name,
                    "old_value": change.old_value,
                    "new_value": change.new_value,
                    "changed_by": change.changed_by,
                    "changed_at": change.changed_at,
                    "is_manual": change.is_manual_revision
                })

        versions = db.query(PaymentNode.version).filter(
            PaymentNode.contract_id == contract_id
        ).distinct().order_by(PaymentNode.version).all()
        for v in versions:
            version_nodes = db.query(PaymentNode).filter(
                PaymentNode.contract_id == contract_id,
                PaymentNode.version == v[0]
            ).all()
            version_history.append({
                "version": v[0],
                "node_count": len(version_nodes),
                "total_amount": sum(n.planned_amount or 0 for n in version_nodes)
            })

        manual_count = sum(1 for c in changes if c.is_manual_revision)

        return {
            "contract_id": contract.id,
            "contract_no": contract.contract_no,
            "contract_name": contract.contract_name,
            "total_changes": len(changes),
            "change_types": change_types,
            "manual_revisions": manual_count,
            "sensitive_field_changes": sensitive_changes,
            "version_history": version_history
        }
