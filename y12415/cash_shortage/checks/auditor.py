import pandas as pd

from .base import AuditResult, AuditFinding
from .refund_no_sign import check_refund_no_sign
from .petty_cash_shift import check_petty_cash_shift_mismatch
from .duplicate_trans import check_duplicate_trans


class Auditor:
    def __init__(self, enabled_checks=None):
        self.checks = [
            check_refund_no_sign,
            check_petty_cash_shift_mismatch,
            check_duplicate_trans,
        ]
        if enabled_checks:
            key_to_check = {c.__name__.replace("check_", ""): c for c in self.checks}
            self.checks = [key_to_check[k] for k in enabled_checks if k in key_to_check]

    def run(self, df: pd.DataFrame) -> AuditResult:
        result = AuditResult()
        all_detail_rows = []

        for check_fn in self.checks:
            finding: AuditFinding = check_fn(df)
            result.add(finding)

            if len(finding.finding_df) > 0:
                detail = finding.finding_df.copy()
                detail["_check_key"] = finding.check_key
                detail["_check_label"] = finding.check_label
                detail["_severity"] = finding.severity
                detail["_reason"] = detail.apply(
                    lambda r: finding.reason_template.format(**r.to_dict()),
                    axis=1,
                )
                all_detail_rows.append(detail)

        if all_detail_rows:
            result.raw_audit_detail = pd.concat(all_detail_rows, ignore_index=True)

        return result
