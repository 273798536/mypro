import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

from app.models import (
    Ticket, TicketTransferLog, SlaRule, SessionSummary,
    CompensationApproval, TemporarySupplement, PlaybackException,
    AsyncTask
)
from app.models.log_models import OperationLog


class PlaybackService:
    def __init__(self):
        self.exceptions: List[Dict[str, Any]] = []

    def playback_ticket(self, ticket_id: int) -> Dict[str, Any]:
        ticket = Ticket.get_by_id(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        playback_result = {
            'ticket_id': ticket_id,
            'ticket_no': ticket.ticket_no,
            'playback_time': datetime.now().isoformat(),
            'steps': [],
            'exceptions': [],
            'final_verdict': {},
        }

        try:
            session_result = self._check_session_summary(ticket_id)
            playback_result['steps'].append(session_result)

            sla_result = self._check_sla_compliance(ticket)
            playback_result['steps'].append(sla_result)

            transfer_result = self._check_transfer_responsibility(ticket_id)
            playback_result['steps'].append(transfer_result)

            compensation_result = self._verify_compensation(ticket_id, ticket)
            playback_result['steps'].append(compensation_result)

            supplement_result = self._check_supplements(ticket_id)
            playback_result['steps'].append(supplement_result)

            playback_result['final_verdict'] = self._generate_verdict(
                ticket, sla_result, transfer_result, compensation_result
            )

            if self.exceptions:
                for exc in self.exceptions:
                    PlaybackException.create_exception(
                        ticket_id=ticket_id,
                        exception_type=exc['type'],
                        exception_message=exc['message'],
                        playback_step=exc['step'],
                        context_data=exc.get('context', {})
                    )
                playback_result['exceptions'] = self.exceptions

            OperationLog.log_operation(
                operation_type='playback_completed',
                operation_module='playback',
                ticket_id=ticket_id,
                request_params={'ticket_no': ticket.ticket_no},
                response_data={'exception_count': len(self.exceptions)},
                response_status='success'
            )

        except Exception as e:
            PlaybackException.create_exception(
                ticket_id=ticket_id,
                exception_type='playback_failure',
                exception_message=str(e),
                playback_step='overall'
            )
            raise

        return playback_result

    def _check_session_summary(self, ticket_id: int) -> Dict[str, Any]:
        summaries = SessionSummary.get_by_ticket_id(ticket_id)
        
        result = {
            'step': 'session_summary',
            'status': 'ok',
            'summary_count': len(summaries),
            'latest_summary': None,
            'issues': [],
        }

        if not summaries:
            result['status'] = 'warning'
            result['issues'].append('缺少会话摘要')
            self.exceptions.append({
                'type': 'missing_summary',
                'message': '工单缺少会话摘要',
                'step': 'session_summary'
            })
        else:
            latest = summaries[0]
            result['latest_summary'] = {
                'content': latest.summary_content,
                'type': latest.summary_type,
                'version': latest.version,
                'created_at': latest.created_at,
            }

        return result

    def _check_sla_compliance(self, ticket: Ticket) -> Dict[str, Any]:
        result = {
            'step': 'sla_check',
            'status': 'ok',
            'sla_rule': None,
            'violations': [],
            'calculation': {},
        }

        sla_rule = None
        if ticket.sla_rule_id:
            sla_rule = SlaRule.get_by_id(ticket.sla_rule_id)
        
        if not sla_rule:
            sla_rule = SlaRule.match_rule(ticket.ticket_type, ticket.priority_level)

        if not sla_rule:
            result['status'] = 'error'
            result['violations'].append('未匹配到SLA规则')
            self.exceptions.append({
                'type': 'sla_missing',
                'message': f'未找到适用的SLA规则: {ticket.ticket_type}/{ticket.priority_level}',
                'step': 'sla_check',
                'context': {'ticket_type': ticket.ticket_type, 'priority': ticket.priority_level}
            })
            return result

        result['sla_rule'] = {
            'rule_code': sla_rule.rule_code,
            'rule_name': sla_rule.rule_name,
            'first_response_timeout': sla_rule.first_response_timeout,
            'resolution_timeout': sla_rule.resolution_timeout,
            'compensation_coefficient': sla_rule.compensation_coefficient,
        }

        created_at = datetime.fromisoformat(ticket.created_at) if isinstance(ticket.created_at, str) else ticket.created_at
        
        if ticket.first_response_at:
            first_response_at = datetime.fromisoformat(ticket.first_response_at) if isinstance(ticket.first_response_at, str) else ticket.first_response_at
            first_response_delay = (first_response_at - created_at).total_seconds() / 60
            if first_response_delay > sla_rule.first_response_timeout:
                result['violations'].append(f'首次响应超时: {first_response_delay:.1f}分钟 > {sla_rule.first_response_timeout}分钟')
            result['calculation']['first_response_delay_minutes'] = first_response_delay

        if ticket.resolved_at:
            resolved_at = datetime.fromisoformat(ticket.resolved_at) if isinstance(ticket.resolved_at, str) else ticket.resolved_at
            resolution_time = (resolved_at - created_at).total_seconds() / 60
            if resolution_time > sla_rule.resolution_timeout:
                result['violations'].append(f'解决超时: {resolution_time:.1f}分钟 > {sla_rule.resolution_timeout}分钟')
            result['calculation']['resolution_time_minutes'] = resolution_time

        if result['violations']:
            result['status'] = 'violation'

        return result

    def _check_transfer_responsibility(self, ticket_id: int) -> Dict[str, Any]:
        transfers = TicketTransferLog.get_by_ticket_id(ticket_id)
        
        result = {
            'step': 'transfer_responsibility',
            'status': 'ok',
            'transfer_count': len(transfers),
            'transfers': [],
            'responsible_handler': None,
            'timeout_distribution': {},
            'issues': [],
        }

        if not transfers:
            return result

        ticket = Ticket.get_by_id(ticket_id)
        if not ticket:
            return result

        created_at = datetime.fromisoformat(ticket.created_at) if isinstance(ticket.created_at, str) else ticket.created_at
        current_time = created_at

        total_timeout = 0
        handler_time = {}

        for transfer in transfers:
            transfer_time = datetime.fromisoformat(transfer.transfer_time) if isinstance(transfer.transfer_time, str) else transfer.transfer_time
            duration = (transfer_time - current_time).total_seconds() / 60
            
            result['transfers'].append({
                'from': transfer.from_handler,
                'to': transfer.to_handler,
                'reason': transfer.transfer_reason,
                'time': transfer.transfer_time,
                'duration_minutes': round(duration, 2),
            })

            if transfer.from_handler not in handler_time:
                handler_time[transfer.from_handler] = 0
            handler_time[transfer.from_handler] += duration

            current_time = transfer_time

        if ticket.current_handler:
            now = datetime.now()
            final_duration = (now - current_time).total_seconds() / 60
            if ticket.current_handler not in handler_time:
                handler_time[ticket.current_handler] = 0
            handler_time[ticket.current_handler] += final_duration
            result['responsible_handler'] = ticket.current_handler

        result['timeout_distribution'] = handler_time

        for handler, time_spent in handler_time.items():
            if time_spent > 120:
                result['issues'].append(f'{handler} 处理时长过长: {time_spent:.1f}分钟')
                self.exceptions.append({
                    'type': 'transfer_timeout',
                    'message': f'{handler} 处理超时',
                    'step': 'transfer_responsibility',
                    'context': {'handler': handler, 'duration': time_spent}
                })

        if result['issues']:
            result['status'] = 'warning'

        return result

    def _verify_compensation(self, ticket_id: int, ticket: Ticket) -> Dict[str, Any]:
        approvals = CompensationApproval.get_by_ticket_id(ticket_id)
        
        result = {
            'step': 'compensation_verification',
            'status': 'ok',
            'approval_count': len(approvals),
            'latest_approval': None,
            'calculation_basis': {},
            'discrepancies': [],
            'history_versions': [],
        }

        if not approvals:
            result['status'] = 'warning'
            return result

        for approval in approvals:
            version_info = {
                'version': approval.version,
                'status': approval.approval_status,
                'requested_amount': approval.requested_amount,
                'approved_amount': approval.approved_amount,
                'is_revised': approval.is_revised,
                'applied_at': approval.applied_at,
            }
            result['history_versions'].append(version_info)

            if approval.is_revised:
                result['discrepancies'].append(
                    f'版本{approval.version}是改判记录，原始审批ID: {approval.original_approval_id}'
                )

        latest = approvals[0]
        result['latest_approval'] = {
            'compensation_type': latest.compensation_type,
            'requested_amount': latest.requested_amount,
            'approved_amount': latest.approved_amount,
            'status': latest.approval_status,
            'calculation_basis': latest.calculation_basis,
            'version': latest.version,
            'is_revised': latest.is_revised,
        }

        if ticket.sla_rule_id:
            sla_rule = SlaRule.get_by_id(ticket.sla_rule_id)
            if sla_rule and latest.approved_amount:
                expected_amount = self._calculate_expected_compensation(ticket, sla_rule)
                if abs(latest.approved_amount - expected_amount) > 0.01:
                    result['status'] = 'mismatch'
                    result['discrepancies'].append(
                        f'补偿金额不匹配: 审批金额{latest.approved_amount} != 预期金额{expected_amount:.2f}'
                    )
                    self.exceptions.append({
                        'type': 'compensation_mismatch',
                        'message': '补偿金额与SLA计算不一致',
                        'step': 'compensation_verification',
                        'context': {
                            'approved': latest.approved_amount,
                            'expected': expected_amount,
                            'sla_coefficient': sla_rule.compensation_coefficient,
                        }
                    })

        return result

    def _calculate_expected_compensation(self, ticket: Ticket, sla_rule: SlaRule) -> float:
        created_at = datetime.fromisoformat(ticket.created_at) if isinstance(ticket.created_at, str) else ticket.created_at
        
        if ticket.resolved_at:
            resolved_at = datetime.fromisoformat(ticket.resolved_at) if isinstance(ticket.resolved_at, str) else ticket.resolved_at
            resolution_time = (resolved_at - created_at).total_seconds() / 60
            base_amount = max(0, resolution_time - sla_rule.resolution_timeout) * 0.5
            return base_amount * sla_rule.compensation_coefficient
        
        return 0.0

    def _check_supplements(self, ticket_id: int) -> Dict[str, Any]:
        supplements = TemporarySupplement.get_by_ticket_id(ticket_id)
        
        result = {
            'step': 'temporary_supplements',
            'status': 'ok',
            'supplement_count': len(supplements),
            'supplements': [],
        }

        for supp in supplements:
            result['supplements'].append({
                'type': supp.supplement_type,
                'content': supp.supplement_content,
                'reason': supp.supplement_reason,
                'operator': supp.operator,
                'created_at': supp.created_at,
            })

        return result

    def _generate_verdict(self, ticket: Ticket, sla_result: Dict, 
                           transfer_result: Dict, compensation_result: Dict) -> Dict[str, Any]:
        verdict = {
            'ticket_no': ticket.ticket_no,
            'overall_status': 'pass',
            'risk_level': 'low',
            'responsibility': None,
            'recommended_compensation': 0,
            'recommended_action': None,
            'summary': '',
        }

        issues_count = 0
        issues_count += len(sla_result.get('violations', []))
        issues_count += len(transfer_result.get('issues', []))
        issues_count += len(compensation_result.get('discrepancies', []))

        if issues_count >= 3:
            verdict['overall_status'] = 'fail'
            verdict['risk_level'] = 'high'
        elif issues_count >= 1:
            verdict['overall_status'] = 'warning'
            verdict['risk_level'] = 'medium'

        if sla_result.get('sla_rule'):
            sla_rule = None
            if ticket.sla_rule_id:
                sla_rule = SlaRule.get_by_id(ticket.sla_rule_id)
            if not sla_rule:
                sla_rule = SlaRule.match_rule(ticket.ticket_type, ticket.priority_level)
            if sla_rule:
                verdict['recommended_compensation'] = self._calculate_expected_compensation(
                    ticket, sla_rule
                )

        if transfer_result.get('responsible_handler'):
            verdict['responsibility'] = transfer_result['responsible_handler']

        if verdict['risk_level'] == 'high':
            verdict['recommended_action'] = 'manual_review'
            verdict['summary'] = '高风险工单，建议人工复核'
        elif verdict['risk_level'] == 'medium':
            verdict['recommended_action'] = 'auto_adjust'
            verdict['summary'] = '存在问题，建议系统自动调整'
        else:
            verdict['summary'] = '工单正常通过回放验收'

        return verdict

    def batch_playback(self, ticket_ids: List[int], operator: str = None) -> Dict[str, Any]:
        AsyncTask.create_task(
            task_type='batch_playback',
            params={'ticket_ids': ticket_ids, 'operator': operator},
            priority=7,
        )
        return {'status': 'queued', 'ticket_count': len(ticket_ids)}

    def get_playback_exceptions(self, ticket_id: int = None, status: str = 'open') -> List[Dict[str, Any]]:
        if ticket_id:
            exceptions = PlaybackException.get_by_ticket_id(ticket_id)
        else:
            exceptions = PlaybackException.get_open_exceptions()
        
        return [e.to_dict() for e in exceptions]
