from typing import Dict, List, Tuple
from collections import defaultdict
from .models import (
    Budget,
    Contract,
    Invoice,
    ReimbursementRecord,
    CheckResult,
    CheckStatus,
    CheckType,
    SourceReference,
)


def _make_result(
    check_type: CheckType,
    status: CheckStatus,
    message: str,
    record: ReimbursementRecord,
    sources: List[SourceReference],
    details: dict = None,
) -> CheckResult:
    return CheckResult(
        check_type=check_type,
        status=status,
        message=message,
        record_id=record.record_id,
        subject_code=record.subject_code,
        amount=record.amount,
        source_refs=[record.source, *sources],
        details=details or {},
    )


def check_budget_occupancy(
    records: List[ReimbursementRecord],
    budgets: Dict[Tuple[str, str], Budget],
) -> List[CheckResult]:
    results: List[CheckResult] = []
    subject_usage: Dict[Tuple[str, str], float] = defaultdict(float)

    for record in records:
        key = (record.project_id, record.subject_code)
        subject_usage[key] += record.amount

    for record in records:
        key = (record.project_id, record.subject_code)
        budget = budgets.get(key)

        if budget is None:
            results.append(
                _make_result(
                    CheckType.BUDGET,
                    CheckStatus.WARNING,
                    f"科目{record.subject_code}({record.subject_name})未找到预算配置",
                    record,
                    [],
                    {"project_id": record.project_id, "subject_code": record.subject_code},
                )
            )
            continue

        pending_amount = subject_usage[key]
        total_used = budget.used_amount + pending_amount
        remaining = budget.total_amount - total_used

        if total_used > budget.total_amount:
            over_amount = total_used - budget.total_amount
            results.append(
                _make_result(
                    CheckType.BUDGET,
                    CheckStatus.FAIL,
                    f"科目{record.subject_code}({record.subject_name})超支 ¥{over_amount:,.2f}，"
                    f"预算¥{budget.total_amount:,.2f}，已用¥{budget.used_amount:,.2f}，"
                    f"本次申请¥{pending_amount:,.2f}",
                    record,
                    [budget.source],
                    {
                        "budget_total": budget.total_amount,
                        "budget_used": budget.used_amount,
                        "budget_remaining": budget.remaining_amount,
                        "pending_amount": pending_amount,
                        "over_amount": over_amount,
                    },
                )
            )
        elif remaining < budget.total_amount * 0.1:
            results.append(
                _make_result(
                    CheckType.BUDGET,
                    CheckStatus.WARNING,
                    f"科目{record.subject_code}({record.subject_name})预算余额不足10%，"
                    f"剩余¥{remaining:,.2f}",
                    record,
                    [budget.source],
                    {
                        "budget_total": budget.total_amount,
                        "budget_remaining": remaining,
                        "remaining_percent": remaining / budget.total_amount,
                    },
                )
            )
        else:
            results.append(
                _make_result(
                    CheckType.BUDGET,
                    CheckStatus.PASS,
                    f"科目{record.subject_code}({record.subject_name})预算充足，"
                    f"剩余¥{remaining:,.2f}",
                    record,
                    [budget.source],
                    {
                        "budget_total": budget.total_amount,
                        "budget_remaining": remaining,
                    },
                )
            )

    return results


def check_invoice_duplicate(
    records: List[ReimbursementRecord],
    invoices: Dict[str, Invoice],
) -> List[CheckResult]:
    results: List[CheckResult] = []
    invoice_usage: Dict[str, List[ReimbursementRecord]] = defaultdict(list)

    for record in records:
        invoice = invoices.get(record.invoice_id)
        if invoice:
            invoice_usage[invoice.unique_key].append(record)

    for record in records:
        invoice = invoices.get(record.invoice_id)

        if invoice is None:
            results.append(
                _make_result(
                    CheckType.INVOICE,
                    CheckStatus.WARNING,
                    f"发票{record.invoice_id}未在发票库中找到",
                    record,
                    [],
                    {"invoice_id": record.invoice_id},
                )
            )
            continue

        duplicates = invoice_usage.get(invoice.unique_key, [])
        source_refs = [inv.source for inv in invoices.values() if inv.unique_key == invoice.unique_key]

        if len(duplicates) > 1:
            other_records = [r for r in duplicates if r.record_id != record.record_id]
            results.append(
                _make_result(
                    CheckType.INVOICE,
                    CheckStatus.FAIL,
                    f"发票{invoice.invoice_code}-{invoice.invoice_number}重复报销，"
                    f"涉及{len(duplicates)}条记录：{', '.join(r.record_id for r in duplicates)}",
                    record,
                    source_refs,
                    {
                        "invoice_key": invoice.unique_key,
                        "total_amount": invoice.total_amount,
                        "duplicate_count": len(duplicates),
                        "other_record_ids": [r.record_id for r in other_records],
                    },
                )
            )
        else:
            results.append(
                _make_result(
                    CheckType.INVOICE,
                    CheckStatus.PASS,
                    f"发票{invoice.invoice_code}-{invoice.invoice_number}校验通过，"
                    f"金额¥{invoice.total_amount:,.2f}",
                    record,
                    [invoice.source],
                    {
                        "invoice_key": invoice.unique_key,
                        "total_amount": invoice.total_amount,
                        "invoice_date": str(invoice.invoice_date),
                    },
                )
            )

    return results


def check_contract_balance(
    records: List[ReimbursementRecord],
    contracts: Dict[str, Contract],
) -> List[CheckResult]:
    results: List[CheckResult] = []
    contract_usage: Dict[str, float] = defaultdict(float)

    for record in records:
        if record.contract_id:
            contract_usage[record.contract_id] += record.amount

    for record in records:
        if not record.contract_id:
            results.append(
                _make_result(
                    CheckType.CONTRACT,
                    CheckStatus.PASS,
                    f"报销无关联合同，跳过合同校验",
                    record,
                    [],
                    {"contract_id": None},
                )
            )
            continue

        contract = contracts.get(record.contract_id)

        if contract is None:
            results.append(
                _make_result(
                    CheckType.CONTRACT,
                    CheckStatus.WARNING,
                    f"合同{record.contract_id}未在合同台账中找到",
                    record,
                    [],
                    {"contract_id": record.contract_id},
                )
            )
            continue

        pending_amount = contract_usage[record.contract_id]
        total_payable = contract.paid_amount + pending_amount
        remaining = contract.total_amount - total_payable

        if total_payable > contract.total_amount:
            over_amount = total_payable - contract.total_amount
            results.append(
                _make_result(
                    CheckType.CONTRACT,
                    CheckStatus.FAIL,
                    f"合同{contract.contract_id}({contract.contract_name})余额不足，"
                    f"超支¥{over_amount:,.2f}。合同总额¥{contract.total_amount:,.2f}，"
                    f"已付¥{contract.paid_amount:,.2f}，本次申请¥{pending_amount:,.2f}",
                    record,
                    [contract.source],
                    {
                        "contract_id": contract.contract_id,
                        "contract_total": contract.total_amount,
                        "contract_paid": contract.paid_amount,
                        "pending_amount": pending_amount,
                        "over_amount": over_amount,
                    },
                )
            )
        else:
            results.append(
                _make_result(
                    CheckType.CONTRACT,
                    CheckStatus.PASS,
                    f"合同{contract.contract_id}({contract.contract_name})余额充足，"
                    f"剩余可付¥{remaining:,.2f}",
                    record,
                    [contract.source],
                    {
                        "contract_id": contract.contract_id,
                        "contract_total": contract.total_amount,
                        "contract_paid": contract.paid_amount,
                        "remaining_balance": remaining,
                    },
                )
            )

    return results


def run_all_checks(
    records: List[ReimbursementRecord],
    budgets: Dict[Tuple[str, str], Budget],
    invoices: Dict[str, Invoice],
    contracts: Dict[str, Contract],
) -> List[CheckResult]:
    results: List[CheckResult] = []

    results.extend(check_budget_occupancy(records, budgets))
    results.extend(check_invoice_duplicate(records, invoices))
    results.extend(check_contract_balance(records, contracts))

    return results
