import pandas as pd
from .base import AuditFinding


def check_duplicate_trans(df: pd.DataFrame) -> AuditFinding:
    id_dup = df.duplicated(subset=["trans_id"], keep=False) & (df["trans_id"] != "")

    content_dup = df.duplicated(
        subset=["store_code", "trans_date", "shift", "amount", "trans_type"],
        keep=False,
    )

    issues = df[id_dup | content_dup].copy()
    issues = issues.sort_values(["trans_id", "store_code", "trans_date"]).copy()

    id_counts = issues.groupby("trans_id").size().to_dict()
    issues["dup_count"] = issues["trans_id"].map(lambda x: id_counts.get(x, 1))

    reason = (
        "该笔流水号「{trans_id}」在同一数据范围内出现 {dup_count} 次，"
        "或与同一门店同一班次同金额同类型的其他交易重复，属于流水重复风险。"
    )

    return AuditFinding(
        check_key="duplicate_trans",
        check_label="流水重复",
        severity="高",
        finding_count=len(issues),
        total_affected_amount=round(float(issues["amount"].sum()), 2),
        finding_df=issues,
        summary=f"共发现 {len(issues)} 笔流水重复，涉及金额 {round(float(issues['amount'].sum()), 2)} 元",
        reason_template=reason,
        evidence_columns=[
            "store_code", "store_name", "trans_date", "shift",
            "cashier", "trans_id", "trans_type", "amount", "payment_method",
        ],
    )
