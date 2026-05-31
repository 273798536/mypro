import pandas as pd
from .base import AuditFinding


def check_refund_no_sign(df: pd.DataFrame) -> AuditFinding:
    refund_df = df[df["trans_type"] == "退款"].copy()
    issues = refund_df[
        (refund_df["signed"].str.strip() != "是") &
        (refund_df["signed"].str.strip() != "已签字") &
        (refund_df["signed"].str.strip() != "Y")
    ].copy()

    reason = (
        "该笔为退款交易，金额{amount}元，但系统中"
        "「是否签字确认」字段为「{signed}」，非「是/已签字」，"
        "属于退款漏签风险。"
    )

    return AuditFinding(
        check_key="refund_no_sign",
        check_label="退款漏签",
        severity="高",
        finding_count=len(issues),
        total_affected_amount=round(float(issues["amount"].sum()), 2),
        finding_df=issues,
        summary=f"共发现 {len(issues)} 笔退款未签字，涉及金额 {round(float(issues['amount'].sum()), 2)} 元",
        reason_template=reason,
        evidence_columns=[
            "store_code", "store_name", "trans_date", "shift",
            "cashier", "trans_id", "amount", "signed",
        ],
    )
