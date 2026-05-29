import csv
import json
import os
from datetime import datetime
from settlement.models import Settlement, AmendmentLog


class SettlementExporter:
    def __init__(
        self,
        settlements: list[Settlement],
        amendment_logs=None,
    ):
        self.settlements = settlements
        self.amendment_logs = amendment_logs or []

    def to_dicts(self) -> list[dict]:
        return [s.to_dict() for s in self.settlements]

    def export_json(self, filepath: str, pretty: bool = True):
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        data = {
            "export_time": datetime.now().isoformat(),
            "settlement_count": len(self.settlements),
            "settlements": self.to_dicts(),
            "amendment_logs": [l.to_dict() for l in self.amendment_logs],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            if pretty:
                json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                json.dump(data, f, ensure_ascii=False)

    def export_csv(self, filepath: str):
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        if not self.settlements:
            return
        flat_fields = [
            "settlement_id", "contract_id", "show_id", "city", "show_date",
            "gross_box_office", "total_refunds", "net_box_office",
            "sponsor_deduction", "base_for_split", "artist_raw_share",
            "guarantee_amount", "is_guarantee_triggered", "final_artist_payment",
            "promoter_share", "refund_transfers_in", "refund_transfers_out",
        ]
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=flat_fields)
            writer.writeheader()
            for s in self.settlements:
                row = {k: getattr(s, k) for k in flat_fields}
                writer.writerow(row)

    def export_exception_report(self, filepath: str, pretty: bool = True):
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        exceptions = []
        for s in self.settlements:
            if s.exception_notes:
                exceptions.append(
                    {
                        "settlement_id": s.settlement_id,
                        "contract_id": s.contract_id,
                        "show_id": s.show_id,
                        "city": s.city,
                        "show_date": s.show_date,
                        "is_guarantee_triggered": s.is_guarantee_triggered,
                        "final_artist_payment": s.final_artist_payment,
                        "exception_notes": s.exception_notes,
                        "amendments": [
                            l.to_dict()
                            for l in self.amendment_logs
                            if l.settlement_id == s.settlement_id
                        ],
                    }
                )
        data = {
            "export_time": datetime.now().isoformat(),
            "exception_count": len(exceptions),
            "exceptions": exceptions,
        }
        with open(filepath, "w", encoding="utf-8") as f:
            if pretty:
                json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                json.dump(data, f, ensure_ascii=False)

    def export_amendment_log(self, filepath: str, pretty: bool = True):
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        data = {
            "export_time": datetime.now().isoformat(),
            "amendment_count": len(self.amendment_logs),
            "amendments": [l.to_dict() for l in self.amendment_logs],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            if pretty:
                json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                json.dump(data, f, ensure_ascii=False)

    def summary(self) -> dict:
        total_shows = len(self.settlements)
        total_guarantee_triggered = sum(
            1 for s in self.settlements if s.is_guarantee_triggered
        )
        total_artist_payment = sum(s.final_artist_payment for s in self.settlements)
        total_promoter = sum(s.promoter_share for s in self.settlements)
        total_sponsor_deduction = sum(s.sponsor_deduction for s in self.settlements)
        total_refund_transfers_in = sum(s.refund_transfers_in for s in self.settlements)
        total_refund_transfers_out = sum(s.refund_transfers_out for s in self.settlements)
        exception_count = sum(1 for s in self.settlements if s.exception_notes)
        amended_count = len(set(l.settlement_id for l in self.amendment_logs))
        return {
            "total_shows": total_shows,
            "guarantee_triggered": total_guarantee_triggered,
            "total_artist_payment": round(total_artist_payment, 2),
            "total_promoter_share": round(total_promoter, 2),
            "total_sponsor_deduction": round(total_sponsor_deduction, 2),
            "total_refund_transfers_in": round(total_refund_transfers_in, 2),
            "total_refund_transfers_out": round(total_refund_transfers_out, 2),
            "exception_count": exception_count,
            "amended_settlements": amended_count,
        }
