from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from models import (
    ExportOrder, InsurancePolicy, ClaimRecord, RecoveryRecord,
    AbnormalRecord, AbnormalType, SourceType, VerificationStatus, VerificationCaliber
)


class RecoveryLedgerService:
    def __init__(self):
        self.orders: Dict[str, ExportOrder] = {}
        self.policies: Dict[str, InsurancePolicy] = {}
        self.claims: Dict[str, ClaimRecord] = {}
        self.recoveries: Dict[str, RecoveryRecord] = {}
        self.abnormal_records: Dict[str, AbnormalRecord] = {}
        self.verification_calibers: Dict[str, VerificationCaliber] = {}
        self._init_verification_calibers()

    def _init_verification_calibers(self):
        calibers = [
            VerificationCaliber(
                caliber_id="CALIBER_001",
                name="先冲抵本金后算收益",
                description="追偿款优先冲抵赔付本金，剩余部分计入追偿收益",
                formula="追偿收益 = 追偿到账金额 - 已赔付本金",
                example="赔付10万美元，追回12万，则本金核销10万，收益2万",
                applicable_scenarios=["常规追偿", "买家直接还款", "第三方追讨"]
            ),
            VerificationCaliber(
                caliber_id="CALIBER_002",
                name="按比例分摊核销",
                description="同一买家多笔订单按比例分摊追偿款",
                formula="单笔核销额 = 追偿到账金额 × (单笔赔付额 ÷ 总赔付额)",
                example="两笔各赔5万，追回8万，则每笔核销4万",
                applicable_scenarios=["买家合并还款", "一揽子和解"]
            ),
            VerificationCaliber(
                caliber_id="CALIBER_003",
                name="扣减追讨费用后核销",
                description="追偿款先扣除律师费、佣金等追讨费用后再核销",
                formula="可核销金额 = 追偿到账金额 - 追讨费用",
                example="追回10万，律师费1.5万，则可核销8.5万",
                applicable_scenarios=["律所代理", "第三方商账公司"]
            )
        ]
        for c in calibers:
            self.verification_calibers[c.caliber_id] = c

    def add_order(self, order: ExportOrder) -> Tuple[bool, str]:
        if order.order_id in self.orders:
            return False, f"订单 {order.order_id} 已存在"
        if not order.source_tag or not order.source_tag.startswith("SOURCE_"):
            return False, "来源标签格式不正确，应以 SOURCE_ 开头"
        self.orders[order.order_id] = order
        return True, f"订单 {order.order_id} 添加成功"

    def add_policy(self, policy: InsurancePolicy) -> Tuple[bool, str]:
        if policy.policy_id in self.policies:
            return False, f"保单 {policy.policy_id} 已存在"
        if policy.order_id not in self.orders:
            return False, f"关联订单 {policy.order_id} 不存在"
        if not policy.source_tag or not policy.source_tag.startswith("SOURCE_"):
            return False, "来源标签格式不正确，应以 SOURCE_ 开头"
        self.policies[policy.policy_id] = policy
        self._check_policy_expiry(policy)
        return True, f"保单 {policy.policy_id} 添加成功"

    def add_claim(self, claim: ClaimRecord) -> Tuple[bool, str]:
        if claim.claim_id in self.claims:
            return False, f"赔付记录 {claim.claim_id} 已存在"
        if claim.policy_id not in self.policies:
            return False, f"关联保单 {claim.policy_id} 不存在"
        if claim.order_id not in self.orders:
            return False, f"关联订单 {claim.order_id} 不存在"
        if not claim.source_tag or not claim.source_tag.startswith("SOURCE_"):
            return False, "来源标签格式不正确，应以 SOURCE_ 开头"
        
        policy = self.policies[claim.policy_id]
        if claim.approved_amount > policy.insured_amount * policy.coverage_rate:
            return False, f"赔付金额超出保单承保限额，上限为 {policy.insured_amount * policy.coverage_rate}"
        
        self.claims[claim.claim_id] = claim
        
        if claim.deduction_amount > 0:
            self._create_deduction_abnormal(claim)
        
        if claim.is_disputed:
            self._create_dispute_abnormal(claim)
        
        return True, f"赔付记录 {claim.claim_id} 添加成功"

    def add_recovery(self, recovery: RecoveryRecord) -> Tuple[bool, str]:
        if recovery.recovery_id in self.recoveries:
            return False, f"追偿记录 {recovery.recovery_id} 已存在"
        if recovery.claim_id not in self.claims:
            return False, f"关联赔付记录 {recovery.claim_id} 不存在"
        if recovery.order_id not in self.orders:
            return False, f"关联订单 {recovery.order_id} 不存在"
        if not recovery.source_tag or not recovery.source_tag.startswith("SOURCE_"):
            return False, "来源标签格式不正确，应以 SOURCE_ 开头"
        
        if recovery.expected_date and recovery.recovery_date > recovery.expected_date:
            recovery.is_late = True
            recovery.late_days = (recovery.recovery_date - recovery.expected_date).days
            self._create_late_recovery_abnormal(recovery)
        
        self.recoveries[recovery.recovery_id] = recovery
        self._update_verification_status(recovery)
        
        return True, f"追偿记录 {recovery.recovery_id} 添加成功"

    def _create_deduction_abnormal(self, claim: ClaimRecord):
        abnormal = AbnormalRecord(
            abnormal_id=f"ABN_DED_{claim.claim_id}",
            abnormal_type=AbnormalType.DEDUCTION,
            related_id=claim.claim_id,
            related_type=SourceType.CLAIM_RECORD,
            description=f"赔付扣减：{claim.deduction_reason or '未说明原因'}",
            amount=claim.deduction_amount,
            currency=claim.currency,
            detected_date=datetime.now()
        )
        self.abnormal_records[abnormal.abnormal_id] = abnormal

    def _create_dispute_abnormal(self, claim: ClaimRecord):
        abnormal = AbnormalRecord(
            abnormal_id=f"ABN_DIS_{claim.claim_id}",
            abnormal_type=AbnormalType.CLAIM_DISPUTE,
            related_id=claim.claim_id,
            related_type=SourceType.CLAIM_RECORD,
            description=f"赔付争议：{claim.dispute_reason or '未说明原因'}",
            amount=claim.claim_amount - claim.approved_amount,
            currency=claim.currency,
            detected_date=datetime.now()
        )
        self.abnormal_records[abnormal.abnormal_id] = abnormal

    def _create_late_recovery_abnormal(self, recovery: RecoveryRecord):
        abnormal = AbnormalRecord(
            abnormal_id=f"ABN_LATE_{recovery.recovery_id}",
            abnormal_type=AbnormalType.LATE_RECOVERY,
            related_id=recovery.recovery_id,
            related_type=SourceType.RECOVERY_RECORD,
            description=f"追偿晚到：逾期 {recovery.late_days} 天",
            amount=recovery.recovery_amount,
            currency=recovery.currency,
            detected_date=datetime.now()
        )
        self.abnormal_records[abnormal.abnormal_id] = abnormal

    def _check_policy_expiry(self, policy: InsurancePolicy):
        if policy.expiry_date < datetime.now():
            abnormal = AbnormalRecord(
                abnormal_id=f"ABN_EXP_{policy.policy_id}",
                abnormal_type=AbnormalType.POLICY_OVERDUE,
                related_id=policy.policy_id,
                related_type=SourceType.INSURANCE_POLICY,
                description=f"保单已过期：{policy.expiry_date.strftime('%Y-%m-%d')}",
                amount=policy.insured_amount,
                currency=policy.currency,
                detected_date=datetime.now()
            )
            self.abnormal_records[abnormal.abnormal_id] = abnormal

    def _update_verification_status(self, recovery: RecoveryRecord):
        claim = self.claims[recovery.claim_id]
        total_recovered = sum(
            r.recovery_amount for r in self.recoveries.values()
            if r.claim_id == recovery.claim_id
        )
        
        recovery.verified_amount = min(total_recovered, claim.approved_amount)
        
        if total_recovered >= claim.approved_amount:
            recovery.verification_status = VerificationStatus.FULL
        elif total_recovered > 0:
            recovery.verification_status = VerificationStatus.PARTIAL
        else:
            recovery.verification_status = VerificationStatus.PENDING

    def mark_buyer_merge(self, buyer_names: List[str], new_buyer_name: str, order_ids: List[str]) -> Tuple[bool, str]:
        if len(buyer_names) < 2:
            return False, "至少需要2个买家才能合并"
        
        affected_orders = [
            order for order in self.orders.values()
            if order.order_id in order_ids
        ]
        
        for order in affected_orders:
            order.buyer_name = new_buyer_name
            order.updated_at = datetime.now()
        
        total_amount = sum(o.total_amount for o in affected_orders)
        
        abnormal = AbnormalRecord(
            abnormal_id=f"ABN_MERGE_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            abnormal_type=AbnormalType.BUYER_MERGE,
            related_id=order_ids[0],
            related_type=SourceType.EXPORT_ORDER,
            description=f"买家合并：{', '.join(buyer_names)} → {new_buyer_name}，涉及 {len(affected_orders)} 笔订单",
            amount=total_amount,
            currency=affected_orders[0].currency if affected_orders else "USD",
            detected_date=datetime.now()
        )
        self.abnormal_records[abnormal.abnormal_id] = abnormal
        
        return True, f"已合并 {len(affected_orders)} 笔订单的买家信息"

    def get_abnormal_records(self, unresolved_only: bool = True) -> List[AbnormalRecord]:
        records = list(self.abnormal_records.values())
        if unresolved_only:
            records = [r for r in records if not r.is_resolved]
        return sorted(records, key=lambda x: x.detected_date, reverse=True)

    def get_verification_calibers(self) -> List[VerificationCaliber]:
        return list(self.verification_calibers.values())

    def check_data_consistency(self) -> Dict[str, List[str]]:
        issues = defaultdict(list)
        
        for policy in self.policies.values():
            if policy.order_id not in self.orders:
                issues["policy_orphan"].append(f"保单 {policy.policy_id} 关联的订单 {policy.order_id} 不存在")
        
        for claim in self.claims.values():
            if claim.policy_id not in self.policies:
                issues["claim_orphan_policy"].append(f"赔付 {claim.claim_id} 关联的保单 {claim.policy_id} 不存在")
            if claim.order_id not in self.orders:
                issues["claim_orphan_order"].append(f"赔付 {claim.claim_id} 关联的订单 {claim.order_id} 不存在")
        
        for recovery in self.recoveries.values():
            if recovery.claim_id not in self.claims:
                issues["recovery_orphan_claim"].append(f"追偿 {recovery.recovery_id} 关联的赔付 {recovery.claim_id} 不存在")
        
        for claim in self.claims.values():
            policy = self.policies.get(claim.policy_id)
            if policy:
                max_claim = policy.insured_amount * policy.coverage_rate
                if claim.approved_amount > max_claim:
                    issues["claim_exceed_limit"].append(
                        f"赔付 {claim.claim_id} 金额 {claim.approved_amount} 超出保单限额 {max_claim}"
                    )
        
        return dict(issues)

    def get_order_chain(self, order_id: str) -> Dict:
        if order_id not in self.orders:
            return {}
        
        order = self.orders[order_id]
        policies = [p for p in self.policies.values() if p.order_id == order_id]
        claims = [c for c in self.claims.values() if c.order_id == order_id]
        recoveries = [r for r in self.recoveries.values() if r.order_id == order_id]
        
        return {
            "order": order,
            "policies": policies,
            "claims": claims,
            "recoveries": recoveries
        }
