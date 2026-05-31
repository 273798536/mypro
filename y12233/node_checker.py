from datetime import datetime
from typing import List, Dict
from models import (
    Database, ConstructionNode, IssueRecord, IssueType,
    NodeStatus, PaymentStatus, AuditLog
)


class NodeChecker:
    def __init__(self, db: Database):
        self.db = db

    def check_project_nodes(self, project_code: str) -> List[IssueRecord]:
        issues = []
        nodes = self.db.get_nodes_by_project(project_code)
        
        for node in nodes:
            node_issues = self._check_single_node(node)
            issues.extend(node_issues)
        
        for issue in issues:
            self.db.insert_issue(issue)
            self._log_audit(issue)
        
        return issues

    def _check_single_node(self, node: ConstructionNode) -> List[IssueRecord]:
        issues = []
        now = datetime.now()
        
        missing_fields = self._check_missing_fields(node)
        if missing_fields:
            issues.append(IssueRecord(
                id=None,
                project_code=node.project_code,
                node_code=node.node_code,
                issue_type=IssueType.MISSING_FIELD.value,
                description=f"缺少必填字段: {', '.join(missing_fields)}",
                severity="高",
                status="未解决",
                detected_at=now.isoformat(),
                resolved_at=None,
                resolution=None
            ))
        
        if node.actual_date and node.planned_date:
            try:
                actual = datetime.strptime(node.actual_date, '%Y-%m-%d')
                planned = datetime.strptime(node.planned_date, '%Y-%m-%d')
                if actual > planned:
                    days = (actual - planned).days
                    issues.append(IssueRecord(
                        id=None,
                        project_code=node.project_code,
                        node_code=node.node_code,
                        issue_type=IssueType.LATE_SUBMISSION.value,
                        description=f"节点晚补材料，延期{days}天完成",
                        severity="中",
                        status="未解决",
                        detected_at=now.isoformat(),
                        resolved_at=None,
                        resolution=None
                    ))
            except:
                pass
        
        if node.design_change and not node.change_approved:
            issues.append(IssueRecord(
                id=None,
                project_code=node.project_code,
                node_code=node.node_code,
                issue_type=IssueType.UNAUTHORIZED_CHANGE.value,
                description=f"存在设计变更但未审批: {node.design_change}",
                severity="高",
                status="未解决",
                detected_at=now.isoformat(),
                resolved_at=None,
                resolution=None
            ))
        
        if node.status in [NodeStatus.PENDING_REVIEW.value, NodeStatus.COMPLETED.value]:
            if not node.photos_submitted or node.photos_count == 0:
                issues.append(IssueRecord(
                    id=None,
                    project_code=node.project_code,
                    node_code=node.node_code,
                    issue_type=IssueType.MISSING_PHOTOS.value,
                    description="验收节点缺少现场照片",
                    severity="高",
                    status="未解决",
                    detected_at=now.isoformat(),
                    resolved_at=None,
                    resolution=None
                ))
        
        if node.planned_date:
            try:
                planned = datetime.strptime(node.planned_date, '%Y-%m-%d')
                if not node.actual_date and now > planned and node.status != NodeStatus.COMPLETED.value:
                    days = (now - planned).days
                    issues.append(IssueRecord(
                        id=None,
                        project_code=node.project_code,
                        node_code=node.node_code,
                        issue_type=IssueType.NODE_DELAYED.value,
                        description=f"节点已延期{days}天，状态为{node.status}",
                        severity="高",
                        status="未解决",
                        detected_at=now.isoformat(),
                        resolved_at=None,
                        resolution=None
                    ))
            except:
                pass
        
        return issues

    def _check_missing_fields(self, node: ConstructionNode) -> List[str]:
        missing = []
        
        if not node.planned_date:
            missing.append('计划日期')
        if not node.status:
            missing.append('状态')
        if node.payment_ratio <= 0:
            missing.append('付款比例')
        
        return missing

    def _log_audit(self, issue: IssueRecord):
        log = AuditLog(
            id=None,
            project_code=issue.project_code,
            node_code=issue.node_code,
            action=f"检测到{issue.issue_type}",
            old_value=None,
            new_value=issue.description,
            operator="系统检查",
            timestamp=issue.detected_at
        )
        self.db.insert_audit_log(log)

    def get_issue_summary(self, project_code: str = None) -> Dict:
        if project_code:
            issues = self.db.get_issues_by_project(project_code)
        else:
            issues = self.db.get_all_issues()
        
        summary = {
            'total': len(issues),
            'by_type': {},
            'by_severity': {},
            'by_status': {},
            'unresolved': []
        }
        
        for issue in issues:
            summary['by_type'][issue.issue_type] = summary['by_type'].get(issue.issue_type, 0) + 1
            summary['by_severity'][issue.severity] = summary['by_severity'].get(issue.severity, 0) + 1
            summary['by_status'][issue.status] = summary['by_status'].get(issue.status, 0) + 1
            
            if issue.status == '未解决':
                summary['unresolved'].append({
                    'project_code': issue.project_code,
                    'node_code': issue.node_code,
                    'issue_type': issue.issue_type,
                    'description': issue.description,
                    'severity': issue.severity,
                    'detected_at': issue.detected_at
                })
        
        return summary

    def check_payment_occupancy(self, project_code: str) -> Dict:
        nodes = self.db.get_nodes_by_project(project_code)
        contract = self.db.get_contract(project_code)
        
        if not contract:
            return {'error': '未找到项目合同'}
        
        total_payment = sum(n.payment_amount for n in nodes)
        paid_amount = sum(n.payment_amount for n in nodes if n.payment_status == PaymentStatus.PAID.value)
        pending_amount = sum(n.payment_amount for n in nodes if n.payment_status == PaymentStatus.PENDING.value)
        
        return {
            'contract_amount': contract.contract_amount,
            'total_planned_payment': total_payment,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'paid_ratio': round(paid_amount / contract.contract_amount * 100, 2) if contract.contract_amount else 0,
            'pending_ratio': round(pending_amount / contract.contract_amount * 100, 2) if contract.contract_amount else 0,
            'payment_details': [
                {
                    'node_code': n.node_code,
                    'node_name': n.node_name,
                    'payment_amount': n.payment_amount,
                    'payment_status': n.payment_status,
                    'payment_ratio': n.payment_ratio
                }
                for n in nodes
            ]
        }

    def review_completion(self, project_code: str, node_code: str) -> Dict:
        nodes = self.db.get_nodes_by_project(project_code)
        target_node = None
        
        for node in nodes:
            if node.node_code == node_code:
                target_node = node
                break
        
        if not target_node:
            return {'error': '未找到节点'}
        
        issues = self.db.get_issues_by_project(project_code)
        node_issues = [i for i in issues if i.node_code == node_code and i.status == '未解决']
        
        result = {
            'node_code': node_code,
            'node_name': target_node.node_name,
            'status': target_node.status,
            'can_approve': len(node_issues) == 0,
            'blocking_issues': node_issues,
            'photos_ok': target_node.photos_submitted and target_node.photos_count > 0,
            'changes_approved': not target_node.design_change or target_node.change_approved
        }
        
        return result
