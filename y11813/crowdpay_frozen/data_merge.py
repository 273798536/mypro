import pandas as pd
from typing import Dict, List, Tuple, Any
from dataclasses import asdict

from .models import RiderPayment, FreezeRecord, FreezeType, DiffResult


class DataMerger:
    COMPARABLE_FIELDS = [
        "rider_name",
        "total_amount",
        "base_salary",
        "bank_account",
        "bank_name",
        "id_card",
        "phone",
    ]

    def __init__(self):
        self.diffs: List[DiffResult] = []

    def load_ticket_data(self, file_path: str) -> Dict[str, Dict[str, Any]]:
        df = pd.read_excel(file_path) if file_path.endswith(
            (".xlsx", ".xls")
        ) else pd.read_csv(file_path)
        return self._to_rider_dict(df, "ticket")

    def load_payment_salary(self, file_path: str) -> Dict[str, Dict[str, Any]]:
        df = pd.read_excel(file_path) if file_path.endswith(
            (".xlsx", ".xls")
        ) else pd.read_csv(file_path)
        return self._to_rider_dict(df, "流水")

    def _to_rider_dict(
        self, df: pd.DataFrame, source: str
    ) -> Dict[str, Dict[str, Any]]:
        result = {}
        for _, row in df.iterrows():
            rider_id = str(row.get("骑手ID", row.get("rider_id", ""))).strip()
            if not rider_id:
                continue
            result[rider_id] = {
                "rider_id": rider_id,
                "rider_name": str(row.get("姓名", row.get("rider_name", ""))),
                "total_amount": float(row.get("应发金额", row.get("total_amount", 0))),
                "base_salary": float(row.get("基本工资", row.get("base_salary", 0))),
                "bank_account": str(row.get("银行卡号", row.get("bank_account", ""))),
                "bank_name": str(row.get("银行名称", row.get("bank_name", ""))),
                "id_card": str(row.get("身份证号", row.get("id_card", ""))),
                "phone": str(row.get("手机号", row.get("phone", ""))),
                "_source": source,
                "_raw": row.to_dict(),
            }
        return result

    def load_freeze_tickets(self, file_path: str) -> List[FreezeRecord]:
        df = pd.read_excel(file_path) if file_path.endswith(
            (".xlsx", ".xls")
        ) else pd.read_csv(file_path)
        freezes = []

        for _, row in df.iterrows():
            freeze_type_str = str(
                row.get("冻结类型", row.get("freeze_type", ""))
            ).lower()
            if "投诉" in freeze_type_str or "complaint" in freeze_type_str:
                freeze_type = FreezeType.COMPLAINT
            elif "补贴" in freeze_type_str or "subsidy" in freeze_type_str:
                freeze_type = FreezeType.SUBSIDY_RECOVERY
            elif "银行" in freeze_type_str or "bank" in freeze_type_str:
                freeze_type = FreezeType.BANK_FAILED
            else:
                freeze_type = FreezeType.COMPLAINT

            freezes.append(
                FreezeRecord(
                    rider_id=str(row.get("骑手ID", row.get("rider_id", ""))).strip(),
                    freeze_type=freeze_type,
                    amount=float(row.get("冻结金额", row.get("amount", 0))),
                    reason=str(row.get("冻结原因", row.get("reason", ""))),
                    complaint_id=str(
                        row.get("投诉单号", row.get("complaint_id", ""))
                    ),
                    operator=str(row.get("操作人", row.get("operator", ""))),
                )
            )
        return freezes

    def compare_and_merge(
        self,
        ticket_data: Dict[str, Dict[str, Any]],
        salary_data: Dict[str, Dict[str, Any]],
        freeze_records: List[FreezeRecord],
    ) -> Tuple[List[RiderPayment], List[DiffResult]]:
        self.diffs = []
        all_rider_ids = set(ticket_data.keys()) | set(salary_data.keys())
        riders = []

        for rider_id in all_rider_ids:
            ticket = ticket_data.get(rider_id)
            salary = salary_data.get(rider_id)

            if not ticket or not salary:
                if ticket:
                    self.diffs.append(
                        DiffResult(
                            rider_id=rider_id,
                            field_name="存在性",
                            ticket_value="工单存在",
                            salary_value="流水不存在",
                            resolved=True,
                            final_value="以工单为准",
                        )
                    )
                    base_data = ticket
                else:
                    self.diffs.append(
                        DiffResult(
                            rider_id=rider_id,
                            field_name="存在性",
                            ticket_value="工单不存在",
                            salary_value="流水存在",
                            resolved=True,
                            final_value="以流水为准",
                        )
                    )
                    base_data = salary
            else:
                base_data = self._compare_fields(rider_id, ticket, salary)

            rider = RiderPayment(
                rider_id=base_data["rider_id"],
                rider_name=base_data["rider_name"],
                total_amount=base_data["total_amount"],
                base_salary=base_data["base_salary"],
                bank_account=base_data["bank_account"],
                bank_name=base_data["bank_name"],
                id_card=base_data["id_card"],
                phone=base_data["phone"],
            )

            rider.freezes = [f for f in freeze_records if f.rider_id == rider_id]
            riders.append(rider)

        return riders, self.diffs

    def _compare_fields(
        self, rider_id: str, ticket: Dict, salary: Dict
    ) -> Dict[str, Any]:
        result = {**salary}

        for field in self.COMPARABLE_FIELDS:
            ticket_val = ticket.get(field, "")
            salary_val = salary.get(field, "")

            if str(ticket_val).strip() != str(salary_val).strip():
                diff = DiffResult(
                    rider_id=rider_id,
                    field_name=field,
                    ticket_value=ticket_val,
                    salary_value=salary_val,
                )

                if field == "total_amount":
                    if float(ticket_val or 0) > float(salary_val or 0):
                        diff.final_value = ticket_val
                        diff.resolved = True
                        diff.resolved_by = "工单金额更高，采用工单"
                        result[field] = ticket_val
                    else:
                        diff.final_value = salary_val
                        diff.resolved = True
                        diff.resolved_by = "流水金额更高，采用流水"
                elif field in ("bank_account", "bank_name"):
                    diff.final_value = ticket_val
                    diff.resolved = True
                    diff.resolved_by = "银行信息以工单为准"
                    result[field] = ticket_val
                else:
                    diff.final_value = 流水_val
                    diff.resolved = True
                    diff.resolved_by = f"{field}以流水为准"

                self.diffs.append(diff)

        return result

    def get_diff_summary(self) -> Dict[str, Any]:
        by_field = {}
        for diff in self.diffs:
            if diff.field_name not in by_field:
                by_field[diff.field_name] = []
            by_field[diff.field_name].append(diff)

        return {
            "total_diffs": len(self.diffs),
            "by_field": {
                field: len(diffs) for field, diffs in by_field.items()
            },
            "unresolved": [d for d in self.diffs if not d.resolved],
        }
