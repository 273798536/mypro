from datetime import datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from models import (
    Order, OrderItem, GroupOwner, SubsidyRule,
    AttributionTrace, AnomalyRecord, AnomalyType, AnomalyStatus,
    ProcessLog, OrderStatus, generate_id
)
from data_importer import DataImporter


class CommissionEngine:
    def __init__(self, importer: DataImporter):
        self.importer = importer
        self.traces: List[AttributionTrace] = []
        self.anomalies: List[AnomalyRecord] = []
        self.process_logs: List[ProcessLog] = []
        self._trace_index: Dict[str, List[AttributionTrace]] = defaultdict(list)
        self._anomaly_index: Dict[str, List[AnomalyRecord]] = defaultdict(list)

    def _log_process(self, process_type: str, action: str, reason: str,
                     order_id: str = None, item_id: str = None, trace_id: str = None,
                     before_value: str = None, after_value: str = None,
                     operator: str = "system"):
        log = ProcessLog(
            log_id=generate_id("log"),
            process_type=process_type,
            order_id=order_id,
            item_id=item_id,
            trace_id=trace_id,
            action=action,
            before_value=before_value,
            after_value=after_value,
            reason=reason,
            operator=operator,
            timestamp=datetime.now()
        )
        self.process_logs.append(log)
        return log

    def _calculate_subsidy(self, item: OrderItem, order: Order, rules: List[SubsidyRule]) -> Tuple[float, Optional[str]]:
        item_amount = item.quantity * item.unit_price
        best_subsidy = 0.0
        best_rule = None

        for rule in rules:
            if item_amount < rule.min_order_amount:
                continue
            if rule.product_category and rule.product_category != item.product_category:
                continue

            if rule.subsidy_type == "fixed":
                subsidy = rule.subsidy_value
            elif rule.subsidy_type == "percentage":
                subsidy = item_amount * rule.subsidy_value
            elif rule.subsidy_type == "per_unit":
                subsidy = item.quantity * rule.subsidy_value
            else:
                continue

            if subsidy > best_subsidy:
                best_subsidy = subsidy
                best_rule = rule

        return round(best_subsidy, 2), best_rule.rule_id if best_rule else None

    def _parse_trace_link(self, trace_link: Optional[str]) -> List[str]:
        if not trace_link:
            return []
        parts = trace_link.split("|")
        return [p.strip() for p in parts if p.strip()]

    def _detect_link_split(self, order: Order, item: OrderItem) -> Optional[AnomalyRecord]:
        if not order.trace_link:
            return None

        link_groups = self._parse_trace_link(order.trace_link)
        if len(link_groups) <= 1:
            return None

        owner = self.importer.get_owner_by_group(order.group_id)
        affected_groups = []
        for gid in link_groups:
            o = self.importer.get_owner_by_group(gid)
            if o and o.owner_id != (owner.owner_id if owner else None):
                affected_groups.append(f"{o.group_name}({gid})")

        if not affected_groups:
            return None

        item_amount = item.quantity * item.unit_price
        description = (
            f"商品【{item.product_name}】订单存在链接串单风险。"
            f"追踪链接包含多个群ID: {link_groups}。"
            f"当前归属群: {owner.group_name if owner else '未知'}({order.group_id})，"
            f"涉及其他群: {', '.join(affected_groups)}"
        )
        suggestion = (
            f"建议：1) 联系各群主核实真实推广来源；"
            f"2) 可按首归因原则分给最早的群；"
            f"3) 或协商按比例拆分佣金。"
            f"当前商品金额: ¥{item_amount:.2f}"
        )

        anomaly = AnomalyRecord(
            anomaly_id=generate_id("anom"),
            anomaly_type=AnomalyType.LINK_SPLIT,
            order_id=order.order_id,
            item_id=item.item_id,
            owner_id=owner.owner_id if owner else None,
            description=description,
            suggestion=suggestion,
            status=AnomalyStatus.PENDING,
            detected_time=datetime.now(),
            affected_amount=item_amount,
            metadata={
                "link_groups": link_groups,
                "current_group": order.group_id,
                "affected_groups": affected_groups,
                "item_amount": item_amount
            }
        )
        return anomaly

    def _detect_refund_cross_group(self, order: Order) -> Optional[AnomalyRecord]:
        if order.status not in [OrderStatus.REFUNDED, OrderStatus.PARTIAL_REFUND]:
            return None

        if not order.original_group_id or order.original_group_id == order.group_id:
            return None

        original_owner = self.importer.get_owner_by_group(order.original_group_id)
        current_owner = self.importer.get_owner_by_group(order.group_id)

        description = (
            f"订单{order.order_id}发生跨群退款。"
            f"原归属群: {original_owner.group_name if original_owner else '未知'}({order.original_group_id})，"
            f"现退款群: {current_owner.group_name if current_owner else '未知'}({order.group_id})。"
            f"退款金额: ¥{order.refund_amount:.2f}"
        )
        suggestion = (
            f"建议：1) 核实退款是否真实发生在当前群；"
            f"2) 从原归属群群主佣金中追回已发放的补贴；"
            f"3) 生成退款回滚记录，调整双方结算金额。"
        )

        anomaly = AnomalyRecord(
            anomaly_id=generate_id("anom"),
            anomaly_type=AnomalyType.REFUND_CROSS_GROUP,
            order_id=order.order_id,
            item_id=None,
            owner_id=original_owner.owner_id if original_owner else None,
            description=description,
            suggestion=suggestion,
            status=AnomalyStatus.PENDING,
            detected_time=datetime.now(),
            affected_amount=order.refund_amount,
            metadata={
                "original_group_id": order.original_group_id,
                "current_group_id": order.group_id,
                "refund_amount": order.refund_amount
            }
        )
        return anomaly

    def _detect_subsidy_recovery(self, order: Order, item: OrderItem,
                                  old_trace: AttributionTrace,
                                  new_trace: AttributionTrace) -> Optional[AnomalyRecord]:
        if old_trace.subsidy_amount <= new_trace.subsidy_amount:
            return None

        recovery_amount = old_trace.subsidy_amount - new_trace.subsidy_amount
        owner = self.importer.get_owner_by_group(order.group_id)

        description = (
            f"商品【{item.product_name}】补贴版本变更需追回。"
            f"原补贴: ¥{old_trace.subsidy_amount:.2f}，新补贴: ¥{new_trace.subsidy_amount:.2f}，"
            f"需追回: ¥{recovery_amount:.2f}。"
            f"原因: 补贴规则版本从{old_trace.rule_id}变更为{new_trace.rule_id}"
        )
        suggestion = (
            f"建议：1) 从群主【{owner.name if owner else '未知'}】下期结算中扣除¥{recovery_amount:.2f}；"
            f"2) 关联订单{order.order_id}生成扣款记录；"
            f"3) 通知群主补贴调整原因。"
        )

        anomaly = AnomalyRecord(
            anomaly_id=generate_id("anom"),
            anomaly_type=AnomalyType.SUBSIDY_RECOVERY,
            order_id=order.order_id,
            item_id=item.item_id,
            owner_id=owner.owner_id if owner else None,
            description=description,
            suggestion=suggestion,
            status=AnomalyStatus.PENDING,
            detected_time=datetime.now(),
            affected_amount=recovery_amount,
            related_trace_ids=[old_trace.trace_id, new_trace.trace_id],
            metadata={
                "old_subsidy": old_trace.subsidy_amount,
                "new_subsidy": new_trace.subsidy_amount,
                "recovery_amount": recovery_amount,
                "old_rule_id": old_trace.rule_id,
                "new_rule_id": new_trace.rule_id
            }
        )
        return anomaly

    def _detect_missing_owner(self, order: Order) -> Optional[AnomalyRecord]:
        owner = self.importer.get_owner_by_group(order.group_id)
        if owner:
            return None

        description = (
            f"订单{order.order_id}归属群{order.group_id}未找到对应群主档案。"
            f"订单金额: ¥{order.total_amount:.2f}"
        )
        suggestion = (
            f"建议：1) 补全群{order.group_id}的群主档案；"
            f"2) 确认该群是否已解散或转让；"
            f"3) 暂存该订单佣金至待分配账户。"
        )

        anomaly = AnomalyRecord(
            anomaly_id=generate_id("anom"),
            anomaly_type=AnomalyType.MISSING_GROUP_OWNER,
            order_id=order.order_id,
            item_id=None,
            owner_id=None,
            description=description,
            suggestion=suggestion,
            status=AnomalyStatus.PENDING,
            detected_time=datetime.now(),
            affected_amount=order.total_amount,
            metadata={"group_id": order.group_id}
        )
        return anomaly

    def attribute_commission(self, order: Order, item: OrderItem,
                             parent_trace_id: str = None, reason: str = None) -> AttributionTrace:
        owner = self.importer.get_owner_by_group(order.group_id)
        rules = self.importer.get_applicable_rules(order.order_time, item.product_category)

        item_amount = item.quantity * item.unit_price
        commission_rate = owner.commission_rate if owner else 0.0
        commission_amount = round(item_amount * commission_rate, 2)

        if order.status in [OrderStatus.REFUNDED, OrderStatus.PARTIAL_REFUND]:
            refund_ratio = order.refund_amount / order.total_amount if order.total_amount > 0 else 0
            commission_amount = round(commission_amount * (1 - refund_ratio), 2)

        subsidy_amount, rule_id = self._calculate_subsidy(item, order, rules)
        if order.status in [OrderStatus.REFUNDED, OrderStatus.PARTIAL_REFUND]:
            refund_ratio = order.refund_amount / order.total_amount if order.total_amount > 0 else 0
            subsidy_amount = round(subsidy_amount * (1 - refund_ratio), 2)

        existing_traces = self._trace_index.get(f"{order.order_id}_{item.item_id}", [])
        version = len(existing_traces) + 1

        trace = AttributionTrace(
            trace_id=generate_id("trace"),
            order_id=order.order_id,
            item_id=item.item_id,
            owner_id=owner.owner_id if owner else "UNKNOWN",
            rule_id=rule_id,
            commission_amount=commission_amount,
            subsidy_amount=subsidy_amount,
            attribution_time=datetime.now(),
            version=version,
            is_active=True,
            parent_trace_id=parent_trace_id,
            reason=reason
        )

        for old_trace in existing_traces:
            if old_trace.is_active:
                old_trace.is_active = False
                self._log_process(
                    process_type="attribution_update",
                    action="deactivate_trace",
                    reason=f"新版本v{version}生成，旧版本v{old_trace.version}失效",
                    order_id=order.order_id,
                    item_id=item.item_id,
                    trace_id=old_trace.trace_id,
                    before_value=f"active, commission={old_trace.commission_amount}, subsidy={old_trace.subsidy_amount}",
                    after_value="inactive"
                )

                if old_trace.subsidy_amount != subsidy_amount and subsidy_amount < old_trace.subsidy_amount:
                    anomaly = self._detect_subsidy_recovery(order, item, old_trace, trace)
                    if anomaly:
                        self.anomalies.append(anomaly)
                        self._anomaly_index[order.order_id].append(anomaly)

        self.traces.append(trace)
        self._trace_index[f"{order.order_id}_{item.item_id}"].append(trace)

        self._log_process(
            process_type="attribution",
            action="create_trace",
            reason=reason or "初始归因",
            order_id=order.order_id,
            item_id=item.item_id,
            trace_id=trace.trace_id,
            after_value=f"commission={commission_amount}, subsidy={subsidy_amount}, owner={owner.name if owner else '未知'}"
        )

        return trace

    def process_order(self, order: Order) -> Dict[str, any]:
        result = {
            "order_id": order.order_id,
            "traces": [],
            "anomalies": [],
            "status": "processed"
        }

        missing_anom = self._detect_missing_owner(order)
        if missing_anom:
            self.anomalies.append(missing_anom)
            self._anomaly_index[order.order_id].append(missing_anom)
            result["anomalies"].append(missing_anom)

        refund_anom = self._detect_refund_cross_group(order)
        if refund_anom:
            self.anomalies.append(refund_anom)
            self._anomaly_index[order.order_id].append(refund_anom)
            result["anomalies"].append(refund_anom)

        for item in order.items:
            link_anom = self._detect_link_split(order, item)
            if link_anom:
                self.anomalies.append(link_anom)
                self._anomaly_index[order.order_id].append(link_anom)
                result["anomalies"].append(link_anom)

            reason = None
            parent_trace = None
            if order.status in [OrderStatus.REFUNDED, OrderStatus.PARTIAL_REFUND]:
                reason = f"退款回滚，退款金额¥{order.refund_amount:.2f}"

            trace = self.attribute_commission(order, item, parent_trace, reason)
            result["traces"].append(trace)

            if link_anom:
                link_anom.related_trace_ids.append(trace.trace_id)
            if refund_anom:
                refund_anom.related_trace_ids.append(trace.trace_id)

        return result

    def process_all_orders(self) -> List[Dict[str, any]]:
        results = []
        for order in self.importer.orders:
            result = self.process_order(order)
            results.append(result)
        return results

    def rollback_refund(self, order: Order, new_refund_amount: float,
                         operator: str = "finance") -> Dict[str, any]:
        old_refund = order.refund_amount
        order.refund_amount = new_refund_amount

        if new_refund_amount >= order.total_amount:
            order.status = OrderStatus.REFUNDED
        elif new_refund_amount > 0:
            order.status = OrderStatus.PARTIAL_REFUND
        else:
            order.status = OrderStatus.PAID

        self._log_process(
            process_type="refund_update",
            action="update_refund",
            reason=f"财务调整退款金额",
            order_id=order.order_id,
            before_value=f"refund={old_refund:.2f}, status={order.status.value}",
            after_value=f"refund={new_refund_amount:.2f}, status={order.status.value}",
            operator=operator
        )

        return self.process_order(order)

    def update_subsidy_rule(self, order: Order, item: OrderItem,
                             new_rule: SubsidyRule, operator: str = "admin") -> Dict[str, any]:
        existing_rules = self.importer.subsidy_rules
        old_rule = None
        for r in existing_rules:
            if r.rule_id == new_rule.parent_rule_id:
                old_rule = r
                r.is_active = False
                break

        new_rule.version = old_rule.version + 1 if old_rule else 1
        self.importer.subsidy_rules.append(new_rule)

        self._log_process(
            process_type="rule_update",
            action="update_subsidy_rule",
            reason=f"补贴规则版本更新",
            order_id=order.order_id,
            item_id=item.item_id,
            before_value=f"rule={old_rule.rule_id if old_rule else 'none'}",
            after_value=f"rule={new_rule.rule_id}, v{new_rule.version}",
            operator=operator
        )

        reason = f"补贴规则变更，原规则:{old_rule.rule_id if old_rule else '无'} → 新规则:{new_rule.rule_id}"
        trace = self.attribute_commission(order, item, reason=reason)

        return {
            "order_id": order.order_id,
            "item_id": item.item_id,
            "new_trace": trace,
            "anomalies": [a for a in self._anomaly_index.get(order.order_id, [])
                          if a.item_id == item.item_id]
        }

    def get_traces_for_order(self, order_id: str) -> List[AttributionTrace]:
        return [t for t in self.traces if t.order_id == order_id]

    def get_trace_history(self, order_id: str, item_id: str) -> List[AttributionTrace]:
        return sorted(self._trace_index.get(f"{order_id}_{item_id}", []),
                      key=lambda t: t.version)

    def get_anomalies(self, status: AnomalyStatus = None) -> List[AnomalyRecord]:
        if status:
            return [a for a in self.anomalies if a.status == status]
        return self.anomalies

    def review_anomaly(self, anomaly_id: str, status: AnomalyStatus,
                        notes: str, operator: str = "finance") -> Optional[AnomalyRecord]:
        for anomaly in self.anomalies:
            if anomaly.anomaly_id == anomaly_id:
                old_status = anomaly.status
                anomaly.status = status
                anomaly.review_notes.append(f"[{datetime.now()}] {operator}: {notes}")

                self._log_process(
                    process_type="anomaly_review",
                    action="update_status",
                    reason=notes,
                    order_id=anomaly.order_id,
                    item_id=anomaly.item_id,
                    trace_id=anomaly.related_trace_ids[0] if anomaly.related_trace_ids else None,
                    before_value=old_status.value,
                    after_value=status.value,
                    operator=operator
                )
                return anomaly
        return None
