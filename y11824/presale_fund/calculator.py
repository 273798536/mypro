import uuid
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from .models import (
    ProjectNode, Invoice, SupervisionAccount,
    DisbursementRecord, DisbursementItem, DisbursementStatus,
    NodeStatus, InvoiceStatus
)


class DisbursementCalculator:
    def __init__(self, batch_no: str):
        self.batch_no = batch_no
        self.run_timestamp = datetime.now()
    
    def calculate_disbursements(
        self,
        nodes: List[ProjectNode],
        invoices: List[Invoice],
        accounts: List[SupervisionAccount]
    ) -> List[DisbursementRecord]:
        disbursements = []
        
        project_accounts = self._group_by_project(accounts)
        project_nodes = self._group_by_project(nodes)
        project_invoices = self._group_by_project(invoices)
        
        all_projects = set(project_accounts.keys()) | set(project_nodes.keys()) | set(project_invoices.keys())
        
        for project_id in all_projects:
            project_nodes_list = project_nodes.get(project_id, [])
            project_invoices_list = project_invoices.get(project_id, [])
            project_accounts_list = project_accounts.get(project_id, [])
            
            if not project_accounts_list:
                continue
            
            account = project_accounts_list[0]
            
            record = self._calculate_project_disbursement(
                project_id,
                project_nodes_list,
                project_invoices_list,
                account
            )
            if record:
                disbursements.append(record)
        
        return disbursements
    
    def _group_by_project(self, items) -> Dict[str, List]:
        result = {}
        for item in items:
            pid = getattr(item, 'project_id', None)
            if pid:
                if pid not in result:
                    result[pid] = []
                result[pid].append(item)
        return result
    
    def _calculate_project_disbursement(
        self,
        project_id: str,
        nodes: List[ProjectNode],
        invoices: List[Invoice],
        account: SupervisionAccount
    ) -> Optional[DisbursementRecord]:
        items = []
        node_invoice_map = self._map_invoices_to_nodes(invoices)
        
        for node in nodes:
            if node.is_withdrawn or node.status == NodeStatus.WITHDRAWN:
                continue
            
            if node.status != NodeStatus.COMPLETED:
                continue
            
            node_invoices = node_invoice_map.get(node.node_id, [])
            valid_invoices = [inv for inv in node_invoices 
                            if not inv.is_red_flushed and inv.status == InvoiceStatus.NORMAL]
            
            if not valid_invoices:
                continue
            
            for invoice in valid_invoices:
                request_amount = self._calculate_item_amount(
                    node, invoice, account
                )
                
                if request_amount > 0:
                    item = DisbursementItem(
                        item_id=str(uuid.uuid4()),
                        node_id=node.node_id,
                        node_name=node.node_name,
                        invoice_id=invoice.invoice_id,
                        invoice_amount=invoice.amount,
                        node_completed_amount=node.completed_amount,
                        applicable_ratio=account.supervision_ratio,
                        request_amount=request_amount,
                        approved_amount=request_amount
                    )
                    items.append(item)
        
        if not items:
            return None
        
        total_request = sum(item.request_amount for item in items)
        total_approved = sum(item.approved_amount for item in items)
        
        project_name = nodes[0].project_name if nodes else account.project_name
        
        return DisbursementRecord(
            disbursement_id=str(uuid.uuid4()),
            project_id=project_id,
            project_name=project_name,
            account_id=account.account_id,
            items=items,
            total_request_amount=total_request,
            total_approved_amount=total_approved,
            status=DisbursementStatus.PENDING,
            run_batch_no=self.batch_no,
            run_timestamp=self.run_timestamp
        )
    
    def _map_invoices_to_nodes(self, invoices: List[Invoice]) -> Dict[str, List[Invoice]]:
        result = {}
        for invoice in invoices:
            if invoice.node_id not in result:
                result[invoice.node_id] = []
            result[invoice.node_id].append(invoice)
        return result
    
    def _calculate_item_amount(
        self,
        node: ProjectNode,
        invoice: Invoice,
        account: SupervisionAccount
    ) -> float:
        ratio = account.supervision_ratio / 100 if account.supervision_ratio > 1 else account.supervision_ratio
        
        invoice_amount = invoice.amount
        node_amount = node.completed_amount
        
        base_amount = min(invoice_amount, node_amount)
        disbursement_amount = base_amount * ratio
        
        return round(disbursement_amount, 2)
