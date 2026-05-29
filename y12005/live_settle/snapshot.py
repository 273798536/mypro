import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from .models import (
    Anchor,
    TaxRate,
    UnionAgreement,
    RewardTransaction,
    Snapshot,
    SplitResult,
)


class SnapshotManager:
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.snapshots_dir = self.output_dir / "snapshots"
        self.results_dir = self.output_dir / "results"
        self.index_file = self.snapshots_dir / "index.json"

        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self._index = self._load_index()

    def _load_index(self) -> Dict:
        if self.index_file.exists():
            with open(self.index_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"snapshots": {}, "files_hash_map": {}}

    def _save_index(self):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(self._index, f, indent=2, ensure_ascii=False)

    def find_existing_snapshot(self, files_hash: str) -> Optional[Dict]:
        snapshot_id = self._index["files_hash_map"].get(files_hash)
        if snapshot_id:
            return self._index["snapshots"].get(snapshot_id)
        return None

    def create_snapshot(
        self,
        batch_id: str,
        files_hash: str,
        anchors: Dict[str, Anchor],
        tax_rates: List[TaxRate],
        agreements: List[UnionAgreement],
        transactions: List[RewardTransaction],
    ) -> Snapshot:
        snapshot_id = f"snap_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now()

        agreements_data = [
            {
                "agreement_id": a.agreement_id,
                "union_id": a.union_id,
                "union_name": a.union_name,
                "anchor_id": a.anchor_id,
                "platform_share_rate": str(a.platform_share_rate),
                "union_share_rate": str(a.union_share_rate),
                "anchor_share_rate": str(a.anchor_share_rate),
                "effective_start": a.effective_start.isoformat(),
                "effective_end": a.effective_end.isoformat() if a.effective_end else None,
                "source_file": a.source_file,
                "source_line": a.source_line,
            }
            for a in agreements
        ]

        tax_rates_data = [
            {
                "tax_type": t.tax_type,
                "tax_code": t.tax_code,
                "rate": str(t.rate),
                "effective_start": t.effective_start.isoformat(),
                "effective_end": t.effective_end.isoformat() if t.effective_end else None,
                "taxable_item": t.taxable_item,
                "deduction_threshold": str(t.deduction_threshold),
                "quick_calculation_deduction": str(t.quick_calculation_deduction),
                "source_file": t.source_file,
                "source_line": t.source_line,
            }
            for t in tax_rates
        ]

        snapshot = Snapshot(
            snapshot_id=snapshot_id,
            batch_id=batch_id,
            created_at=created_at,
            anchor_count=len(anchors),
            transaction_count=len(transactions),
            agreement_count=len(agreements),
            tax_rate_count=len(tax_rates),
            input_files_hash=files_hash,
            agreements=agreements_data,
            tax_rates=tax_rates_data,
        )

        snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"
        with open(snapshot_file, "w", encoding="utf-8") as f:
            json.dump(snapshot.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

        self._index["snapshots"][snapshot_id] = {
            "snapshot_id": snapshot_id,
            "batch_id": batch_id,
            "created_at": created_at.isoformat(),
            "files_hash": files_hash,
            "result_file": str(self.results_dir / f"{batch_id}_results.csv"),
        }
        self._index["files_hash_map"][files_hash] = snapshot_id
        self._save_index()

        return snapshot

    def load_snapshot(self, snapshot_id: str) -> Optional[Snapshot]:
        snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"
        if not snapshot_file.exists():
            return None
        with open(snapshot_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Snapshot(**data)

    def save_results(
        self,
        batch_id: str,
        results: List[SplitResult],
        snapshot_id: str,
    ) -> Path:
        result_file = self.results_dir / f"{batch_id}_results.csv"

        tax_types = sorted({k for r in results for k in r.tax_details.keys()})

        header = [
            "transaction_id",
            "anchor_id",
            "anchor_name",
            "transaction_date",
            "transaction_type",
            "original_amount",
            "settle_month",
            "platform_amount",
            "union_amount",
            "anchor_gross_amount",
            *[f"tax_{t}" for t in tax_types],
            "total_tax",
            "anchor_net_amount",
            "is_cross_month_refund",
            "tax_rate_switched",
            "agreement_snapshot_id",
            "warnings",
        ]

        lines = [",".join(header)]
        for r in results:
            row = [
                r.transaction_id,
                r.anchor_id,
                r.anchor_name,
                r.transaction_date.strftime("%Y-%m-%d %H:%M:%S"),
                r.transaction_type.value,
                f"{r.original_amount:.2f}",
                r.settle_month,
                f"{r.platform_amount:.2f}",
                f"{r.union_amount:.2f}",
                f"{r.anchor_gross_amount:.2f}",
                *[f"{r.tax_details.get(t, 0):.2f}" for t in tax_types],
                f"{r.total_tax:.2f}",
                f"{r.anchor_net_amount:.2f}",
                "是" if r.is_cross_month_refund else "否",
                "是" if r.tax_rate_switched else "否",
                r.agreement_snapshot_id,
                "|".join(r.warnings) if r.warnings else "",
            ]
            lines.append(",".join(row))

        with open(result_file, "w", encoding="utf-8-sig") as f:
            f.write("\n".join(lines))

        if snapshot_id in self._index["snapshots"]:
            self._index["snapshots"][snapshot_id]["result_file"] = str(result_file)
            self._save_index()

        return result_file

    def save_summary_json(
        self,
        batch_id: str,
        results: List[SplitResult],
        snapshot_id: str,
    ) -> Path:
        from decimal import Decimal

        summary = {
            "batch_id": batch_id,
            "snapshot_id": snapshot_id,
            "generated_at": datetime.now().isoformat(),
            "total_transactions": len(results),
            "cross_month_refund_count": sum(1 for r in results if r.is_cross_month_refund),
            "tax_rate_switch_count": sum(1 for r in results if r.tax_rate_switched),
            "warning_count": sum(1 for r in results if r.warnings),
            "totals": {
                "original_amount": f"{sum(r.original_amount for r in results):.2f}",
                "platform_amount": f"{sum(r.platform_amount for r in results):.2f}",
                "union_amount": f"{sum(r.union_amount for r in results):.2f}",
                "anchor_gross_amount": f"{sum(r.anchor_gross_amount for r in results):.2f}",
                "total_tax": f"{sum(r.total_tax for r in results):.2f}",
                "anchor_net_amount": f"{sum(r.anchor_net_amount for r in results):.2f}",
            },
            "by_settle_month": {},
            "by_anchor": {},
        }

        for r in results:
            if r.settle_month not in summary["by_settle_month"]:
                summary["by_settle_month"][r.settle_month] = {
                    "transaction_count": 0,
                    "original_amount": Decimal("0"),
                    "anchor_net_amount": Decimal("0"),
                    "cross_month_refund_count": 0,
                    "tax_rate_switch_count": 0,
                }
            m = summary["by_settle_month"][r.settle_month]
            m["transaction_count"] += 1
            m["original_amount"] += r.original_amount
            m["anchor_net_amount"] += r.anchor_net_amount
            if r.is_cross_month_refund:
                m["cross_month_refund_count"] += 1
            if r.tax_rate_switched:
                m["tax_rate_switch_count"] += 1

        for month, data in summary["by_settle_month"].items():
            data["original_amount"] = f"{data['original_amount']:.2f}"
            data["anchor_net_amount"] = f"{data['anchor_net_amount']:.2f}"

        for r in results:
            if r.anchor_id not in summary["by_anchor"]:
                summary["by_anchor"][r.anchor_id] = {
                    "anchor_name": r.anchor_name,
                    "transaction_count": 0,
                    "original_amount": Decimal("0"),
                    "anchor_net_amount": Decimal("0"),
                }
            a = summary["by_anchor"][r.anchor_id]
            a["transaction_count"] += 1
            a["original_amount"] += r.original_amount
            a["anchor_net_amount"] += r.anchor_net_amount

        for anchor_id, data in summary["by_anchor"].items():
            data["original_amount"] = f"{data['original_amount']:.2f}"
            data["anchor_net_amount"] = f"{data['anchor_net_amount']:.2f}"

        summary_file = self.results_dir / f"{batch_id}_summary.json"
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        return summary_file

    def check_idempotency(self, files_hash: str, force: bool = False) -> tuple[bool, Optional[Dict]]:
        existing = self.find_existing_snapshot(files_hash)
        if existing and not force:
            return True, existing
        return False, None
