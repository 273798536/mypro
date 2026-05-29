from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from .models import Bill, PledgeContract, BillPool, BillStatus


def generate_sample_data() -> BillPool:
    ref_date = date.today()

    bills = [
        Bill(
            bill_id="B001",
            bill_type="银行承兑汇票",
            amount=5000000,
            issue_date=ref_date - timedelta(days=170),
            maturity_date=ref_date + timedelta(days=2),
            pool_id="POOL001",
            status=BillStatus.PLEDGED,
            pledge_contract_id="P001",
            pledge_date=ref_date - timedelta(days=100),
        ),
        Bill(
            bill_id="B002",
            bill_type="银行承兑汇票",
            amount=8000000,
            issue_date=ref_date - timedelta(days=160),
            maturity_date=ref_date + timedelta(days=5),
            pool_id="POOL001",
            status=BillStatus.PLEDGED,
            pledge_contract_id="P002",
            pledge_date=ref_date - timedelta(days=90),
        ),
        Bill(
            bill_id="B003",
            bill_type="商业承兑汇票",
            amount=3000000,
            issue_date=ref_date - timedelta(days=150),
            maturity_date=ref_date + timedelta(days=10),
            pool_id="POOL001",
            status=BillStatus.DISCOUNTED,
            discount_date=ref_date - timedelta(days=60),
        ),
        Bill(
            bill_id="B004",
            bill_type="银行承兑汇票",
            amount=10000000,
            issue_date=ref_date - timedelta(days=140),
            maturity_date=ref_date + timedelta(days=3),
            pool_id="POOL001",
            status=BillStatus.PLEDGED,
            pledge_contract_id="P003",
            pledge_date=ref_date - timedelta(days=80),
            extended_maturity_date=ref_date + timedelta(days=33),
        ),
        Bill(
            bill_id="B005",
            bill_type="银行承兑汇票",
            amount=6000000,
            issue_date=ref_date - timedelta(days=180),
            maturity_date=ref_date + timedelta(days=-1),
            pool_id="POOL001",
            status=BillStatus.OVERDUE,
            pledge_contract_id="P004",
            pledge_date=ref_date - timedelta(days=110),
        ),
        Bill(
            bill_id="B006",
            bill_type="商业承兑汇票",
            amount=2000000,
            issue_date=ref_date - timedelta(days=130),
            maturity_date=ref_date + timedelta(days=15),
            pool_id="POOL001",
            status=BillStatus.ACCEPTED,
        ),
        Bill(
            bill_id="B007",
            bill_type="银行承兑汇票",
            amount=4500000,
            issue_date=ref_date - timedelta(days=120),
            maturity_date=ref_date + timedelta(days=20),
            pool_id="POOL001",
            status=BillStatus.PLEDGED,
            pledge_contract_id="P005",
            pledge_date=ref_date - timedelta(days=70),
        ),
        Bill(
            bill_id="B008",
            bill_type="银行承兑汇票",
            amount=12000000,
            issue_date=ref_date - timedelta(days=100),
            maturity_date=ref_date + timedelta(days=1),
            pool_id="POOL001",
            status=BillStatus.PLEDGED,
            pledge_contract_id="P006",
            pledge_date=ref_date - timedelta(days=50),
        ),
    ]

    pledge_contracts = [
        PledgeContract(
            contract_id="P001",
            bill_ids=["B001"],
            pledged_amount=5000000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=100),
            expected_release_date=ref_date + timedelta(days=1),
            actual_release_date=None,
        ),
        PledgeContract(
            contract_id="P002",
            bill_ids=["B002"],
            pledged_amount=8000000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=90),
            expected_release_date=ref_date + timedelta(days=4),
            actual_release_date=None,
        ),
        PledgeContract(
            contract_id="P003",
            bill_ids=["B004"],
            pledged_amount=10000000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=80),
            expected_release_date=ref_date + timedelta(days=32),
            actual_release_date=None,
        ),
        PledgeContract(
            contract_id="P004",
            bill_ids=["B005"],
            pledged_amount=6000000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=110),
            expected_release_date=ref_date + timedelta(days=-2),
            actual_release_date=ref_date + timedelta(days=2),
        ),
        PledgeContract(
            contract_id="P005",
            bill_ids=["B007"],
            pledged_amount=4500000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=70),
            expected_release_date=ref_date + timedelta(days=19),
            actual_release_date=None,
        ),
        PledgeContract(
            contract_id="P006",
            bill_ids=["B008"],
            pledged_amount=12000000,
            pool_id="POOL001",
            start_date=ref_date - timedelta(days=50),
            expected_release_date=ref_date + timedelta(days=0),
            actual_release_date=None,
        ),
    ]

    return BillPool(
        pool_id="POOL001",
        total_quota=50000000,
        bills=bills,
        pledge_contracts=pledge_contracts,
    )


def generate_dirty_data() -> BillPool:
    ref_date = date.today()
    pool = generate_sample_data()

    dirty_bill = Bill(
        bill_id="B009",
        bill_type="银行承兑汇票",
        amount=-500000,
        issue_date=ref_date,
        maturity_date=ref_date - timedelta(days=10),
        pool_id="POOL001",
        status=BillStatus.PLEDGED,
        pledge_contract_id="P007",
    )
    pool.bills.append(dirty_bill)

    duplicate_contract = PledgeContract(
        contract_id="P001",
        bill_ids=["B001"],
        pledged_amount=5000000,
        pool_id="POOL001",
    )
    pool.pledge_contracts.append(duplicate_contract)

    double_pledge = Bill(
        bill_id="B010",
        bill_type="商业承兑汇票",
        amount=2000000,
        issue_date=ref_date - timedelta(days=100),
        maturity_date=ref_date + timedelta(days=30),
        pool_id="POOL001",
        status=BillStatus.PLEDGED,
        pledge_contract_id="P008",
    )
    pool.bills.append(double_pledge)

    extra_pledge = PledgeContract(
        contract_id="P009",
        bill_ids=["B010"],
        pledged_amount=2000000,
        pool_id="POOL001",
    )
    pool.pledge_contracts.append(extra_pledge)

    return pool


def save_sample_json(path: str = "sample_data.json") -> str:
    pool = generate_sample_data()
    data = pool.to_dict()
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_from_json(path: str) -> BillPool:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return BillPool.from_dict(data)
