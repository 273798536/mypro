from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.base import (
    Batch, Contract, PaymentNode, AcceptanceEmail, PriceChange,
    ContractVersion, AuditLog, BatchStatus, OperationType
)
from app.schemas.contract import (
    ContractCreate, PaymentNodeCreate, AcceptanceEmailCreate, PriceChangeCreate,
    FreezeRequest, UnfreezeRequest, ReviewRequest, ArchiveRequest, SupplementRequest
)


class ContractStateMachine:
    def __init__(self, db: Session):
        self.db = db

    def _get_contract_snapshot(self, contract: Contract) -> Dict[str, Any]:
        return {
            "contract_no": contract.contract_no,
            "contract_name": contract.contract_name,
            "party_a": contract.party_a,
            "party_b": contract.party_b,
            "total_amount": contract.total_amount,
            "version": contract.version,
            "is_frozen": contract.is_frozen,
            "is_archived": contract.is_archived,
            "payment_nodes": [
                {
                    "node_name": p.node_name,
                    "payment_amount": p.payment_amount,
                    "due_date": p.due_date.isoformat() if p.due_date else None,
                    "status": p.status
                }
                for p in contract.payment_nodes
            ]
        }

    def _create_version(self, contract: Contract, changed_by: str, change_reason: str) -> ContractVersion:
        version = ContractVersion(
            contract_id=contract.id,
            version=contract.version,
            snapshot=self._get_contract_snapshot(contract),
            changed_by=changed_by,
            change_reason=change_reason
        )
        self.db.add(version)
        return version

    def _create_audit_log(
        self,
        batch_id: int,
        operation_type: OperationType,
        operation_by: str,
        contract_id: Optional[int] = None,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        change_reason: Optional[str] = None,
        comment: Optional[str] = None
    ) -> AuditLog:
        audit_log = AuditLog(
            batch_id=batch_id,
            contract_id=contract_id,
            operation_type=operation_type,
            operation_by=operation_by,
            before_state=before_state,
            after_state=after_state,
            change_reason=change_reason,
            comment=comment
        )
        self.db.add(audit_log)
        return audit_log

    def create_contract(
        self,
        batch_id: int,
        contract_data: ContractCreate,
        created_by: str
    ) -> Contract:
        before_state = {}
        
        contract = Contract(
            batch_id=batch_id,
            contract_no=contract_data.contract_no,
            contract_name=contract_data.contract_name,
            party_a=contract_data.party_a,
            party_b=contract_data.party_b,
            sign_date=contract_data.sign_date,
            effective_date=contract_data.effective_date,
            expire_date=contract_data.expire_date,
            total_amount=contract_data.total_amount,
            is_supplement=contract_data.is_supplement,
            parent_contract_id=contract_data.parent_contract_id,
            metadata_=contract_data.metadata_
        )
        self.db.add(contract)
        self.db.flush()

        for node_data in contract_data.payment_nodes:
            node = PaymentNode(
                contract_id=contract.id,
                node_name=node_data.node_name,
                node_type=node_data.node_type,
                payment_ratio=node_data.payment_ratio,
                payment_amount=node_data.payment_amount,
                due_date=node_data.due_date,
                status=node_data.status
            )
            self.db.add(node)

        for email_data in contract_data.acceptance_emails:
            email = AcceptanceEmail(
                contract_id=contract.id,
                email_subject=email_data.email_subject,
                email_from=email_data.email_from,
                email_to=email_data.email_to,
                email_date=email_data.email_date,
                acceptance_result=email_data.acceptance_result,
                acceptance_amount=email_data.acceptance_amount,
                content=email_data.content
            )
            self.db.add(email)

        for price_data in contract_data.price_changes:
            price_change = PriceChange(
                contract_id=contract.id,
                original_price=price_data.original_price,
                new_price=price_data.new_price,
                change_reason=price_data.change_reason,
                approved_by=price_data.approved_by,
                approved_date=price_data.approved_date,
                effective_date=price_data.effective_date,
                is_manual=price_data.is_manual
            )
            self.db.add(price_change)

        self.db.flush()
        self._create_version(contract, created_by, "Initial version")
        
        after_state = self._get_contract_snapshot(contract)
        self._create_audit_log(
            batch_id=batch_id,
            operation_type=OperationType.CREATE,
            operation_by=created_by,
            contract_id=contract.id,
            before_state=before_state,
            after_state=after_state,
            change_reason="Contract created"
        )

        return contract

    def freeze_contracts(
        self,
        batch_id: int,
        request: FreezeRequest,
        operator: str
    ) -> List[Contract]:
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if request.freeze_all:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.is_frozen == False
            ).all()
        else:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.id.in_(request.contract_ids),
                Contract.is_frozen == False
            ).all()

        for contract in contracts:
            before_state = self._get_contract_snapshot(contract)
            
            contract.is_frozen = True
            contract.frozen_at = datetime.utcnow()
            contract.frozen_reason = request.reason
            contract.frozen_by = operator
            contract.version += 1

            self._create_version(contract, operator, request.reason)
            
            after_state = self._get_contract_snapshot(contract)
            self._create_audit_log(
                batch_id=batch_id,
                operation_type=OperationType.FREEZE,
                operation_by=operator,
                contract_id=contract.id,
                before_state=before_state,
                after_state=after_state,
                change_reason=request.reason
            )

        batch.status = BatchStatus.FROZEN
        self.db.commit()
        return contracts

    def unfreeze_contracts(
        self,
        batch_id: int,
        request: UnfreezeRequest,
        operator: str
    ) -> List[Contract]:
        if request.unfreeze_all:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.is_frozen == True
            ).all()
        else:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.id.in_(request.contract_ids),
                Contract.is_frozen == True
            ).all()

        for contract in contracts:
            before_state = self._get_contract_snapshot(contract)
            
            contract.is_frozen = False
            contract.frozen_at = None
            contract.frozen_reason = None
            contract.frozen_by = None
            contract.version += 1

            self._create_version(contract, operator, request.reason)
            
            after_state = self._get_contract_snapshot(contract)
            self._create_audit_log(
                batch_id=batch_id,
                operation_type=OperationType.UNFREEZE,
                operation_by=operator,
                contract_id=contract.id,
                before_state=before_state,
                after_state=after_state,
                change_reason=request.reason
            )

        self.db.commit()
        return contracts

    def review_contracts(
        self,
        batch_id: int,
        request: ReviewRequest,
        operator: str
    ) -> List[Contract]:
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        contracts = self.db.query(Contract).filter(
            Contract.batch_id == batch_id,
            Contract.id.in_(request.contract_ids)
        ).all()

        operation_type = OperationType.REVIEW_APPROVE if request.approved else OperationType.REVIEW_REJECT

        for contract in contracts:
            before_state = self._get_contract_snapshot(contract)
            contract.version += 1

            after_state = self._get_contract_snapshot(contract)
            self._create_audit_log(
                batch_id=batch_id,
                operation_type=operation_type,
                operation_by=operator,
                contract_id=contract.id,
                before_state=before_state,
                after_state=after_state,
                change_reason=request.reason,
                comment=request.comment
            )

        if request.approved:
            batch.status = BatchStatus.REVIEWED
        self.db.commit()
        return contracts

    def archive_contracts(
        self,
        batch_id: int,
        request: ArchiveRequest,
        operator: str
    ) -> List[Contract]:
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if request.archive_all:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.is_archived == False
            ).all()
        else:
            contracts = self.db.query(Contract).filter(
                Contract.batch_id == batch_id,
                Contract.id.in_(request.contract_ids),
                Contract.is_archived == False
            ).all()

        for contract in contracts:
            before_state = self._get_contract_snapshot(contract)
            
            contract.is_archived = True
            contract.archived_at = datetime.utcnow()
            contract.version += 1

            self._create_version(contract, operator, request.reason)
            
            after_state = self._get_contract_snapshot(contract)
            self._create_audit_log(
                batch_id=batch_id,
                operation_type=OperationType.ARCHIVE,
                operation_by=operator,
                contract_id=contract.id,
                before_state=before_state,
                after_state=after_state,
                change_reason=request.reason
            )

        batch.status = BatchStatus.ARCHIVED
        self.db.commit()
        return contracts

    def add_supplement_contract(
        self,
        batch_id: int,
        request: SupplementRequest,
        operator: str
    ) -> Contract:
        parent_contract = self.db.query(Contract).filter(
            Contract.contract_no == request.contract_no,
            Contract.batch_id == batch_id
        ).first()
        
        if not parent_contract:
            raise ValueError(f"Parent contract {request.contract_no} not found")

        before_state = self._get_contract_snapshot(parent_contract)

        old_nodes = []
        for node in parent_contract.payment_nodes:
            if not node.is_modified:
                old_nodes.append({
                    "node_name": node.node_name,
                    "node_type": node.node_type,
                    "payment_ratio": node.payment_ratio,
                    "payment_amount": node.payment_amount,
                    "due_date": node.due_date,
                    "status": node.status,
                    "modified_from_version": node.modified_from_version
                })

        for node in parent_contract.payment_nodes:
            self.db.delete(node)
        self.db.flush()

        for old_node in old_nodes:
            node = PaymentNode(
                contract_id=parent_contract.id,
                node_name=f"{old_node['node_name']}(旧版)",
                node_type=old_node['node_type'],
                payment_ratio=old_node['payment_ratio'],
                payment_amount=old_node['payment_amount'],
                due_date=old_node['due_date'],
                status=old_node['status'],
                is_modified=False,
                modified_from_version=parent_contract.version
            )
            self.db.add(node)

        for new_node_data in request.new_payment_nodes:
            node = PaymentNode(
                contract_id=parent_contract.id,
                node_name=new_node_data.node_name,
                node_type=new_node_data.node_type,
                payment_ratio=new_node_data.payment_ratio,
                payment_amount=new_node_data.payment_amount,
                due_date=new_node_data.due_date,
                status=new_node_data.status,
                is_modified=True,
                modified_from_version=parent_contract.version
            )
            self.db.add(node)

        parent_contract.version += 1
        
        self._create_version(parent_contract, operator, request.change_reason)
        
        after_state = self._get_contract_snapshot(parent_contract)
        self._create_audit_log(
            batch_id=batch_id,
            operation_type=OperationType.SUPPLEMENT,
            operation_by=operator,
            contract_id=parent_contract.id,
            before_state=before_state,
            after_state=after_state,
            change_reason=request.change_reason
        )

        self.db.commit()
        self.db.refresh(parent_contract)
        return parent_contract

    def get_contract_versions(self, contract_id: int) -> List[ContractVersion]:
        return self.db.query(ContractVersion).filter(
            ContractVersion.contract_id == contract_id
        ).order_by(ContractVersion.version).all()

    def get_audit_logs(
        self,
        batch_id: Optional[int] = None,
        contract_id: Optional[int] = None
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog)
        if batch_id:
            query = query.filter(AuditLog.batch_id == batch_id)
        if contract_id:
            query = query.filter(AuditLog.contract_id == contract_id)
        return query.order_by(AuditLog.operation_at.desc()).all()
