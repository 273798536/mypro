import pandas as pd
from .base import AuditFinding


def check_petty_cash_shift_mismatch(df: pd.DataFrame) -> AuditFinding:
    petty_df = df[df["trans_type"].str.contains("备用金", na=False)].copy()

    def _is_mismatch(row) -> bool:
        pc_type = str(row["petty_cash_type"]).strip()
        shift = str(row["shift"]).strip()
        if not pc_type or pc_type == "nan":
            return False
        if "早班" in pc_type and shift != "早班":
            return True
        if "中班" in pc_type and shift != "中班":
            return True
        if "晚班" in pc_type and shift != "晚班":
            return True
        return False

    issues = petty_df[petty_df.apply(_is_mismatch, axis=1)].copy()

    reason = (
        "该笔为备用金交易，类型标注为「{petty_cash_type}」，"
        "但实际当班为「{shift}」，班次不匹配，属于备用金错班风险。"
    )

    return AuditFinding(
        check_key="petty_cash_shift_mismatch",
        check_label="备用金错班",
        severity="中",
        finding_count=len(issues),
        total_affected_amount=round(float(issues["amount"].sum()), 2),
        finding_df=issues,
        summary=f"共发现 {len(issues)} 笔备用金错班，涉及金额 {round(float(issues['amount'].sum()), 2)} 元",
        reason_template=reason,
        evidence_columns=[
            "store_code", "store_name", "trans_date", "shift",
            "cashier", "trans_id", "amount", "petty_cash_type", "trans_type",
        ],
    )
