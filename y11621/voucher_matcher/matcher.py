from typing import List, Tuple, Optional, Dict
from fuzzywuzzy import fuzz
from .models import (
    BankFlow, Invoice, Contract, MatchRecord, MatchStatus,
    DataSource, HistoryEntry
)
from datetime import datetime


AMOUNT_TOLERANCE = 0.01
FUZZY_THRESHOLD = 80
DATE_TOLERANCE_DAYS = 30


class MatchingEngine:
    def __init__(self):
        self.keywords = {
            "货款": ["货款", "贷款", "huokuan", "payment"],
            "服务费": ["服务费", "服务费", "service", "fee"],
            "房租": ["房租", "租金", "rent"],
            "工资": ["工资", "薪资", "salary", "payroll"],
            "报销": ["报销", "reimburse"],
        }

    def match_all(self, bank_flows: List[BankFlow], invoices: List[Invoice],
                  contracts: List[Contract]) -> List[MatchRecord]:
        matches: List[MatchRecord] = []
        used_invoices = set()

        for flow in bank_flows:
            match = self._match_single(flow, invoices, contracts, used_invoices)
            if match:
                matches.append(match)
                for inv_id in match.invoice_ids:
                    used_invoices.add(inv_id)

        return matches

    def _match_single(self, flow: BankFlow, invoices: List[Invoice],
                      contracts: List[Contract],
                      used_invoices: set) -> Optional[MatchRecord]:
        candidates = []
        flags = []
        sources = [DataSource.BANK]

        for invoice in invoices:
            if invoice.id in used_invoices:
                continue

            score = 0
            match_methods = []

            amount_diff = abs(flow.amount - invoice.total_amount)
            if amount_diff <= AMOUNT_TOLERANCE:
                score += 40
                match_methods.append("金额精确匹配")
            elif amount_diff <= flow.amount * 0.1:
                score += 20
                match_methods.append("金额近似匹配")

            name_score = self._fuzzy_name_match(flow.counterparty, invoice)
            if name_score >= FUZZY_THRESHOLD:
                score += name_score * 0.3
                match_methods.append(f"名称模糊匹配({name_score}%)")
                sources.append(DataSource.KEYWORD)

            if self._date_within_tolerance(flow.trade_date, invoice.invoice_date):
                score += 15
                match_methods.append("日期范围匹配")

            if flow.amount < 0 and invoice.status == "红冲":
                score += 30
                match_methods.append("红冲发票匹配")
                flags.append("红冲发票")
                sources.append(DataSource.INVOICE)

            if score >= 50:
                candidates.append((invoice, score, match_methods))

        if not candidates:
            return self._create_pending_match(flow, sources)

        candidates.sort(key=lambda x: x[1], reverse=True)

        top_score = candidates[0][1]
        top_candidates = [c for c in candidates if abs(c[1] - top_score) < 5]

        if len(top_candidates) > 1:
            return self._create_conflict_match(flow, top_candidates, sources)

        best_invoice, best_score, methods = candidates[0]

        matched_invoices = [best_invoice]
        remaining = flow.amount - best_invoice.total_amount

        if abs(remaining) > AMOUNT_TOLERANCE and remaining > 0:
            for invoice, score, _ in candidates[1:]:
                if invoice.id in used_invoices:
                    continue
                if abs(remaining - invoice.total_amount) <= AMOUNT_TOLERANCE:
                    matched_invoices.append(invoice)
                    remaining -= invoice.total_amount
                    methods.append("多发票合并匹配")
                    flags.append("合并付款")
                    break

        if len(matched_invoices) == 1 and "红冲发票" not in flags:
            if abs(flow.amount) > abs(best_invoice.total_amount) * 1.5:
                flags.append("可能需要拆分")

        contract_match = self._match_contract(flow, contracts)
        contract_id = contract_match.id if contract_match else None
        if contract_match:
            sources.append(DataSource.CONTRACT)

        status = MatchStatus.MATCHED
        if flags:
            if "红冲发票" in flags:
                status = MatchStatus.RED_INVOICE
            elif "可能需要拆分" in flags:
                status = MatchStatus.SPLIT

        return MatchRecord(
            bank_flow_id=flow.id,
            invoice_ids=[inv.id for inv in matched_invoices],
            contract_id=contract_id,
            matched_amount=flow.amount,
            status=status,
            match_score=best_score,
            match_method=" + ".join(methods),
            sources=sources,
            flags=flags,
        )

    def _fuzzy_name_match(self, counterparty: str, invoice: Invoice) -> int:
        scores = []
        for name in [invoice.seller_name, invoice.buyer_name]:
            if not name:
                continue
            scores.append(fuzz.ratio(counterparty, name))
            scores.append(fuzz.partial_ratio(counterparty, name))
            scores.append(fuzz.token_sort_ratio(counterparty, name))
        return max(scores) if scores else 0

    def _date_within_tolerance(self, date1: str, date2: str) -> bool:
        try:
            d1 = datetime.strptime(date1, "%Y-%m-%d")
            d2 = datetime.strptime(date2, "%Y-%m-%d")
            return abs((d1 - d2).days) <= DATE_TOLERANCE_DAYS
        except (ValueError, TypeError):
            return False

    def _match_contract(self, flow: BankFlow, contracts: List[Contract]) -> Optional[Contract]:
        for contract in contracts:
            if fuzz.partial_ratio(flow.summary, contract.contract_no) >= 80:
                return contract
            if fuzz.ratio(flow.counterparty, contract.party_a) >= 70:
                return contract
            if fuzz.ratio(flow.counterparty, contract.party_b) >= 70:
                return contract
        return None

    def _create_pending_match(self, flow: BankFlow, sources: List[DataSource]) -> MatchRecord:
        return MatchRecord(
            bank_flow_id=flow.id,
            invoice_ids=[],
            matched_amount=flow.amount,
            status=MatchStatus.PENDING,
            match_score=0,
            match_method="无匹配候选",
            sources=sources,
            flags=["待人工处理"],
        )

    def _create_conflict_match(self, flow: BankFlow, candidates: List[Tuple], sources: List[DataSource]) -> MatchRecord:
        conflict_info = "冲突: " + " vs ".join([
            f"{inv.invoice_number}({score:.0f}%)" for inv, score, _ in candidates
        ])
        return MatchRecord(
            bank_flow_id=flow.id,
            invoice_ids=[inv.id for inv, _, _ in candidates],
            matched_amount=flow.amount,
            status=MatchStatus.CONFLICT,
            match_score=candidates[0][1],
            match_method=conflict_info,
            sources=sources,
            flags=["同名冲突", "待人工确认"],
        )

    def split_match(self, match: MatchRecord, split_amounts: List[float],
                    invoices: List[Invoice]) -> List[MatchRecord]:
        result = []
        for i, amount in enumerate(split_amounts):
            new_match = MatchRecord(
                bank_flow_id=match.bank_flow_id,
                invoice_ids=[],
                matched_amount=amount,
                status=MatchStatus.PENDING,
                match_score=0,
                match_method=f"拆分付款(第{i+1}部分)",
                sources=match.sources + [DataSource.MANUAL],
                flags=[f"拆分自原记录"],
            )
            result.append(new_match)
        return result

    def manual_confirm(self, match: MatchRecord, selected_invoice_id: str,
                       operator: str = "user") -> Tuple[MatchRecord, HistoryEntry]:
        old_status = match.status.value
        old_invoices = ",".join(match.invoice_ids)

        match.invoice_ids = [selected_invoice_id]
        match.status = MatchStatus.MANUAL
        match.sources.append(DataSource.MANUAL)
        if "待人工确认" in match.flags:
            match.flags.remove("待人工确认")
        if "同名冲突" in match.flags:
            match.flags.remove("同名冲突")
        match.flags.append("人工确认")
        match.updated_at = datetime.now().isoformat()
        match.version += 1

        history = HistoryEntry(
            record_id=match.id,
            field_name="人工确认匹配",
            old_value=f"{old_status}: {old_invoices}",
            new_value=f"已确认: {selected_invoice_id}",
            operator=operator,
            source=DataSource.MANUAL,
        )
        return match, history
