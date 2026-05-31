import csv
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Tuple

from .models import (
    ChannelDeduction,
    Contract,
    DistributionChannel,
    RightsHolder,
    RoyaltyRecord,
    RoyaltyType,
    SplitResult,
    ValidationIssue,
)


def parse_date(date_str: str) -> date:
    if not date_str or date_str.lower() in ["永久", "none", ""]:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        try:
            return datetime.strptime(date_str, "%Y/%m/%d").date()
        except ValueError:
            return None


def format_date(d: date) -> str:
    return d.isoformat() if d else "永久"


def load_rights_holders(filepath: str) -> Dict[str, RightsHolder]:
    holders = {}
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rh = RightsHolder(
                id=row["id"],
                name=row["name"],
                type=row.get("type", ""),
                royalty_type=RoyaltyType[row["royalty_type"].upper()],
            )
            holders[rh.id] = rh
    return holders


def load_contracts(filepath: str) -> List[Contract]:
    contracts = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            contract = Contract(
                id=row["id"],
                rights_holder_id=row["rights_holder_id"],
                royalty_type=RoyaltyType[row["royalty_type"].upper()],
                percentage=float(row["percentage"]),
                effective_date=parse_date(row["effective_date"]) or date.today(),
                expiry_date=parse_date(row.get("expiry_date", "")),
                source_file=Path(filepath).name,
                priority=int(row.get("priority", 0)),
            )
            contracts.append(contract)
    return contracts


def load_deductions(filepath: str) -> List[ChannelDeduction]:
    deductions = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ded = ChannelDeduction(
                id=row["id"],
                channel=DistributionChannel[row["channel"].upper()],
                description=row["description"],
                percentage=float(row.get("percentage", 0)),
                amount=float(row.get("amount", 0)),
                effective_date=parse_date(row.get("effective_date", "")) or date.today(),
                source_file=Path(filepath).name,
            )
            deductions.append(ded)
    return deductions


def load_royalty_records(
    filepath: str, contracts_map: Dict[str, List[Contract]], deductions_map: Dict[str, List[ChannelDeduction]]
) -> List[RoyaltyRecord]:
    records = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            track_id = row["track_id"]
            record = RoyaltyRecord(
                id=row.get("id", ""),
                track_id=track_id,
                track_name=row["track_name"],
                artist=row["artist"],
                channel=DistributionChannel[row["channel"].upper()],
                revenue=float(row["revenue"]),
                report_date=parse_date(row.get("report_date", "")) or date.today(),
                source_file=Path(filepath).name,
                contracts=contracts_map.get(track_id, []),
                deductions=deductions_map.get(track_id, []),
            )
            records.append(record)
    return records


def export_split_results(results: List[SplitResult], filepath: str) -> None:
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        fieldnames = [
            "record_id",
            "rights_holder_id",
            "rights_holder_name",
            "royalty_type",
            "original_amount",
            "deduction_amount",
            "net_amount",
            "contract_percentage",
            "final_amount",
            "contract_snapshot",
            "source_refs",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow({
                "record_id": r.record_id,
                "rights_holder_id": r.rights_holder_id,
                "rights_holder_name": r.rights_holder_name,
                "royalty_type": r.royalty_type,
                "original_amount": r.original_amount,
                "deduction_amount": r.deduction_amount,
                "net_amount": r.net_amount,
                "contract_percentage": r.contract_percentage,
                "final_amount": r.final_amount,
                "contract_snapshot": str(r.contract_snapshot),
                "source_refs": " | ".join(r.source_refs),
            })


def export_issues(issues: List[ValidationIssue], filepath: str) -> None:
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        fieldnames = [
            "record_id",
            "track_name",
            "issue_type",
            "severity",
            "message",
            "source_refs",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for issue in issues:
            writer.writerow({
                "record_id": issue.record_id,
                "track_name": issue.track_name,
                "issue_type": issue.issue_type,
                "severity": issue.severity,
                "message": issue.message,
                "source_refs": " | ".join(issue.source_refs),
            })


def load_all_data(
    rights_holders_file: str,
    contracts_file: str,
    deductions_file: str,
    royalty_records_file: str,
) -> Tuple[Dict[str, RightsHolder], List[RoyaltyRecord]]:
    rights_holders = load_rights_holders(rights_holders_file)
    contracts = load_contracts(contracts_file)
    deductions = load_deductions(deductions_file)

    contracts_map: Dict[str, List[Contract]] = {}
    for c in contracts:
        track_id = c.id.rsplit("_", 1)[0] if "_" in c.id else "unknown"
        contracts_map.setdefault(track_id, []).append(c)

    deductions_map: Dict[str, List[ChannelDeduction]] = {}
    for d in deductions:
        track_id = d.id.rsplit("_", 1)[0] if "_" in d.id else "unknown"
        deductions_map.setdefault(track_id, []).append(d)

    records = load_royalty_records(royalty_records_file, contracts_map, deductions_map)
    return rights_holders, records
