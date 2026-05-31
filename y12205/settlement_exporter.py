import csv
import json
from datetime import datetime
from typing import List, Dict, Optional
from collections import defaultdict

from models import (
    Order, GroupOwner, AttributionTrace, AnomalyRecord,
    AnomalyStatus, AnomalyType, CommissionSettlement, ProcessLog,
    generate_id
)
from data_importer import DataImporter
from commission_engine import CommissionEngine


class SettlementExporter:
    def __init__(self, engine: CommissionEngine, importer: DataImporter):
        self.engine = engine
        self.importer = importer

    def _get_owner_name(self, owner_id: str) -> str:
        for owner in self.importer.group_owners:
            if owner.owner_id == owner_id:
                return owner.name
        return "未知"

    def _get_group_name(self, group_id: str) -> str:
        for owner in self.importer.group_owners:
            if owner.group_id == group_id:
                return owner.group_name
        return "未知"

    def _get_order(self, order_id: str) -> Optional[Order]:
        for order in self.importer.orders:
            if order.order_id == order_id:
                return order
        return None

    def _get_anomaly_type_label(self, anomaly_type: AnomalyType) -> str:
        labels = {
            AnomalyType.LINK_SPLIT: "链接串单",
            AnomalyType.REFUND_CROSS_GROUP: "退款跨群",
            AnomalyType.SUBSIDY_RECOVERY: "补贴追回",
            AnomalyType.DUPLICATE_ATTRIBUTION: "重复归因",
            AnomalyType.MISSING_GROUP_OWNER: "群主缺失"
        }
        return labels.get(anomaly_type, anomaly_type.value)

    def _get_anomaly_status_label(self, status: AnomalyStatus) -> str:
        labels = {
            AnomalyStatus.PENDING: "待复核",
            AnomalyStatus.CONFIRMED: "已确认",
            AnomalyStatus.RESOLVED: "已解决",
            AnomalyStatus.DISMISSED: "已忽略"
        }
        return labels.get(status, status.value)

    def export_traces_to_csv(self, filepath: str, owner_id: str = None) -> str:
        traces = self.engine.traces
        if owner_id:
            traces = [t for t in traces if t.owner_id == owner_id]

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '归因记录ID', '版本', '订单号', '商品ID', '商品名称',
                '群主ID', '群主名称', '佣金金额', '补贴金额', '补贴规则ID',
                '归因时间', '状态', '变更原因', '关联来源'
            ])

            for trace in traces:
                order = self._get_order(trace.order_id)
                item = None
                if order:
                    for i in order.items:
                        if i.item_id == trace.item_id:
                            item = i
                            break

                writer.writerow([
                    trace.trace_id,
                    f"v{trace.version}",
                    trace.order_id,
                    trace.item_id,
                    item.product_name if item else "",
                    trace.owner_id,
                    self._get_owner_name(trace.owner_id),
                    f"{trace.commission_amount:.2f}",
                    f"{trace.subsidy_amount:.2f}",
                    trace.rule_id or "",
                    trace.attribution_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "有效" if trace.is_active else "已失效",
                    trace.reason or "初始归因",
                    f"订单明细:order_id={trace.order_id};群主档案:owner_id={trace.owner_id};补贴规则:rule_id={trace.rule_id or 'N/A'}"
                ])

        return filepath

    def export_anomalies_to_csv(self, filepath: str, status: AnomalyStatus = None) -> str:
        anomalies = self.engine.get_anomalies(status)

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '异常ID', '异常类型', '状态', '订单号', '商品ID',
                '群主ID', '群主名称', '涉及金额', '问题描述',
                '处理建议', '检测时间', '关联归因记录', '复核备注'
            ])

            for anomaly in anomalies:
                writer.writerow([
                    anomaly.anomaly_id,
                    self._get_anomaly_type_label(anomaly.anomaly_type),
                    self._get_anomaly_status_label(anomaly.status),
                    anomaly.order_id,
                    anomaly.item_id or "",
                    anomaly.owner_id or "",
                    self._get_owner_name(anomaly.owner_id) if anomaly.owner_id else "",
                    f"{anomaly.affected_amount:.2f}",
                    anomaly.description,
                    anomaly.suggestion,
                    anomaly.detected_time.strftime("%Y-%m-%d %H:%M:%S"),
                    ";".join(anomaly.related_trace_ids),
                    " | ".join(anomaly.review_notes) if anomaly.review_notes else ""
                ])

        return filepath

    def export_process_logs_to_csv(self, filepath: str) -> str:
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '日志ID', '操作类型', '动作', '订单号', '商品ID',
                '归因记录ID', '变更前', '变更后', '原因',
                '操作人', '时间戳', '来源追溯'
            ])

            for log in self.engine.process_logs:
                source_ref = []
                if log.order_id:
                    source_ref.append(f"订单:{log.order_id}")
                if log.item_id:
                    source_ref.append(f"商品:{log.item_id}")
                if log.trace_id:
                    source_ref.append(f"归因:{log.trace_id}")

                writer.writerow([
                    log.log_id,
                    log.process_type,
                    log.action,
                    log.order_id or "",
                    log.item_id or "",
                    log.trace_id or "",
                    log.before_value or "",
                    log.after_value or "",
                    log.reason,
                    log.operator,
                    log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "; ".join(source_ref) if source_ref else ""
                ])

        return filepath

    def export_trace_chain_to_json(self, order_id: str, item_id: str, filepath: str) -> str:
        history = self.engine.get_trace_history(order_id, item_id)
        order = self._get_order(order_id)
        item = None
        if order:
            for i in order.items:
                if i.item_id == item_id:
                    item = i
                    break

        chain_data = {
            "order_id": order_id,
            "item_id": item_id,
            "product_name": item.product_name if item else "",
            "trace_chain": []
        }

        for idx, trace in enumerate(history):
            related_anomalies = [
                {
                    "anomaly_id": a.anomaly_id,
                    "type": self._get_anomaly_type_label(a.anomaly_type),
                    "description": a.description,
                    "suggestion": a.suggestion,
                    "status": self._get_anomaly_status_label(a.status)
                }
                for a in self.engine.anomalies
                if trace.trace_id in a.related_trace_ids
            ]

            chain_data["trace_chain"].append({
                "version": f"v{trace.version}",
                "trace_id": trace.trace_id,
                "commission_amount": trace.commission_amount,
                "subsidy_amount": trace.subsidy_amount,
                "rule_id": trace.rule_id,
                "owner_id": trace.owner_id,
                "owner_name": self._get_owner_name(trace.owner_id),
                "is_active": trace.is_active,
                "reason": trace.reason,
                "attribution_time": trace.attribution_time.strftime("%Y-%m-%d %H:%M:%S"),
                "parent_trace_id": trace.parent_trace_id,
                "related_anomalies": related_anomalies,
                "source_refs": {
                    "order": f"order_id={order_id}",
                    "group_owner": f"owner_id={trace.owner_id}",
                    "subsidy_rule": f"rule_id={trace.rule_id}" if trace.rule_id else None,
                    "process_logs": [
                        log.log_id for log in self.engine.process_logs
                        if log.trace_id == trace.trace_id
                    ]
                }
            })

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(chain_data, f, ensure_ascii=False, indent=2)

        return filepath

    def generate_anomaly_report(self, filepath: str) -> str:
        anomalies = self.engine.get_anomalies()

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("私域团购返佣清算 - 异常问题清单\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")

            stats = defaultdict(lambda: {"total": 0, "pending": 0, "confirmed": 0, "resolved": 0})
            for anomaly in anomalies:
                atype = anomaly.anomaly_type
                stats[atype]["total"] += 1
                stats[atype][anomaly.status.value] += 1

            f.write("【异常统计汇总】\n")
            f.write("-" * 40 + "\n")
            for atype, counts in stats.items():
                f.write(f"  {self._get_anomaly_type_label(atype)}: ")
                f.write(f"共{counts['total']}条，")
                f.write(f"待复核{counts['pending']}条，")
                f.write(f"已确认{counts['confirmed']}条，")
                f.write(f"已解决{counts['resolved']}条\n")
            f.write(f"\n总计: {len(anomalies)}条异常\n\n")

            pending_anomalies = [a for a in anomalies if a.status == AnomalyStatus.PENDING]
            if pending_anomalies:
                f.write("=" * 80 + "\n")
                f.write(f"【待复核异常明细】共{len(pending_anomalies)}条\n")
                f.write("=" * 80 + "\n\n")

                for idx, anomaly in enumerate(pending_anomalies, 1):
                    f.write(f"--- 第{idx}条: {anomaly.anomaly_id} ---\n")
                    f.write(f"类型: {self._get_anomaly_type_label(anomaly.anomaly_type)}\n")
                    f.write(f"订单: {anomaly.order_id}\n")
                    if anomaly.item_id:
                        order = self._get_order(anomaly.order_id)
                        item_name = ""
                        if order:
                            for item in order.items:
                                if item.item_id == anomaly.item_id:
                                    item_name = item.product_name
                                    break
                        f.write(f"商品: {anomaly.item_id} - {item_name}\n")
                    if anomaly.owner_id:
                        f.write(f"群主: {self._get_owner_name(anomaly.owner_id)}({anomaly.owner_id})\n")
                    f.write(f"涉及金额: ¥{anomaly.affected_amount:.2f}\n")
                    f.write(f"检测时间: {anomaly.detected_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

                    f.write("【问题原因】\n")
                    f.write(f"  {anomaly.description}\n\n")

                    f.write("【处理建议】\n")
                    f.write(f"  {anomaly.suggestion}\n\n")

                    f.write("【来源追溯】\n")
                    f.write(f"  订单来源: order_id={anomaly.order_id}\n")
                    if anomaly.owner_id:
                        f.write(f"  群主档案: owner_id={anomaly.owner_id}\n")
                    if anomaly.related_trace_ids:
                        f.write(f"  归因记录: {', '.join(anomaly.related_trace_ids)}\n")

                    if anomaly.metadata:
                        f.write(f"  扩展信息: {json.dumps(anomaly.metadata, ensure_ascii=False)}\n")

                    f.write("\n")

        return filepath

    def generate_settlement_summary(self, period_start: datetime, period_end: datetime,
                                     filepath: str) -> str:
        owner_traces = defaultdict(list)
        for trace in self.engine.traces:
            if not trace.is_active:
                continue
            order = self._get_order(trace.order_id)
            if order and period_start <= order.order_time <= period_end:
                owner_traces[trace.owner_id].append(trace)

        settlements = []
        for owner_id, traces in owner_traces.items():
            total_sales = 0.0
            total_commission = 0.0
            total_subsidy = 0.0
            deduction_amount = 0.0
            trace_ids = []
            anomaly_ids = []

            for trace in traces:
                order = self._get_order(trace.order_id)
                if order:
                    for item in order.items:
                        if item.item_id == trace.item_id:
                            total_sales += item.quantity * item.unit_price
                            break

                total_commission += trace.commission_amount
                total_subsidy += trace.subsidy_amount
                trace_ids.append(trace.trace_id)

                for anomaly in self.engine.anomalies:
                    if (anomaly.status in [AnomalyStatus.CONFIRMED, AnomalyStatus.RESOLVED]
                            and trace.trace_id in anomaly.related_trace_ids):
                        if anomaly.anomaly_type in [AnomalyType.SUBSIDY_RECOVERY, AnomalyType.REFUND_CROSS_GROUP]:
                            deduction_amount += anomaly.affected_amount
                        if anomaly.anomaly_id not in anomaly_ids:
                            anomaly_ids.append(anomaly.anomaly_id)

            net_settlement = total_commission + total_subsidy - deduction_amount

            settlement = CommissionSettlement(
                settlement_id=generate_id("settle"),
                owner_id=owner_id,
                period_start=period_start,
                period_end=period_end,
                total_orders=len(set(t.order_id for t in traces)),
                total_sales=round(total_sales, 2),
                total_commission=round(total_commission, 2),
                total_subsidy=round(total_subsidy, 2),
                deduction_amount=round(deduction_amount, 2),
                net_settlement=round(net_settlement, 2),
                trace_ids=trace_ids,
                anomaly_ids=anomaly_ids,
                settlement_time=datetime.now()
            )
            settlements.append(settlement)

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                '结算单ID', '群主ID', '群主名称', '期间开始', '期间结束',
                '订单数', '销售额', '佣金合计', '补贴合计', '扣款合计',
                '应结金额', '关联归因记录', '关联异常记录', '生成时间'
            ])

            for s in settlements:
                writer.writerow([
                    s.settlement_id,
                    s.owner_id,
                    self._get_owner_name(s.owner_id),
                    s.period_start.strftime("%Y-%m-%d"),
                    s.period_end.strftime("%Y-%m-%d"),
                    s.total_orders,
                    f"{s.total_sales:.2f}",
                    f"{s.total_commission:.2f}",
                    f"{s.total_subsidy:.2f}",
                    f"{s.deduction_amount:.2f}",
                    f"{s.net_settlement:.2f}",
                    ";".join(s.trace_ids),
                    ";".join(s.anomaly_ids),
                    s.settlement_time.strftime("%Y-%m-%d %H:%M:%S")
                ])

        return filepath

    def generate_full_audit_package(self, output_dir: str,
                                     period_start: datetime,
                                     period_end: datetime) -> Dict[str, str]:
        import os
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        files = {}

        files['traces'] = self.export_traces_to_csv(
            f"{output_dir}/归因明细_{timestamp}.csv"
        )

        files['anomalies'] = self.export_anomalies_to_csv(
            f"{output_dir}/异常清单_{timestamp}.csv"
        )

        files['logs'] = self.export_process_logs_to_csv(
            f"{output_dir}/操作日志_{timestamp}.csv"
        )

        files['anomaly_report'] = self.generate_anomaly_report(
            f"{output_dir}/异常问题报告_{timestamp}.txt"
        )

        files['settlement'] = self.generate_settlement_summary(
            period_start, period_end,
            f"{output_dir}/结算汇总_{timestamp}.csv"
        )

        link_split_anomalies = [
            a for a in self.engine.anomalies
            if a.anomaly_type == AnomalyType.LINK_SPLIT
        ]
        for idx, anomaly in enumerate(link_split_anomalies[:3], 1):
            if anomaly.item_id:
                files[f'trace_chain_{idx}'] = self.export_trace_chain_to_json(
                    anomaly.order_id,
                    anomaly.item_id,
                    f"{output_dir}/追溯链_链接串单_{idx}_{timestamp}.json"
                )

        return files
