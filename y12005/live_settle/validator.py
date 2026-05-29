import csv
import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Dict, Tuple, Any
from .models import Anchor, TaxRate, UnionAgreement, RewardTransaction, AnchorStatus, TransactionType


class ValidationError(Exception):
    def __init__(self, message: str, source_file: str, source_line: int, field: str = None, value: Any = None):
        self.message = message
        self.source_file = source_file
        self.source_line = source_line
        self.field = field
        self.value = value
        super().__init__(self.format_message())

    def format_message(self) -> str:
        location = f"[{self.source_file}:{self.source_line}]"
        if self.field:
            location += f" 字段:{self.field}"
            if self.value is not None:
                location += f" 值:{self.value}"
        return f"{location} {self.message}"


class MaterialLoader:
    def __init__(self, input_dir: Path):
        self.input_dir = Path(input_dir)
        self.errors: List[ValidationError] = []
        self.warnings: List[str] = []
        self.anchors: Dict[str, Anchor] = {}
        self.tax_rates: List[TaxRate] = []
        self.agreements: List[UnionAgreement] = []
        self.transactions: List[RewardTransaction] = []

    def load_all(self) -> Tuple[bool, Dict]:
        self._load_anchors()
        self._load_tax_rates()
        self._load_agreements()
        self._load_transactions()

        self._cross_validate()

        success = len(self.errors) == 0
        files_hash = self._calculate_files_hash()

        return success, {
            "anchors": self.anchors,
            "tax_rates": self.tax_rates,
            "agreements": self.agreements,
            "transactions": self.transactions,
            "errors": self.errors,
            "warnings": self.warnings,
            "files_hash": files_hash,
        }

    def _calculate_files_hash(self) -> str:
        hash_obj = hashlib.sha256()
        for pattern in ["anchors*.csv", "tax_rates*.csv", "agreements*.csv", "transactions*.csv"]:
            for filepath in sorted(self.input_dir.glob(pattern)):
                hash_obj.update(filepath.read_bytes())
        return hash_obj.hexdigest()[:16]

    def _load_anchors(self):
        filepath = self.input_dir / "anchors.csv"
        if not filepath.exists():
            self.errors.append(ValidationError(
                "主播账号文件不存在", str(filepath), 0
            ))
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    anchor = Anchor(
                        anchor_id=row["anchor_id"].strip(),
                        anchor_name=row["anchor_name"].strip(),
                        union_id=row.get("union_id", "").strip() or None,
                        id_card=row["id_card"].strip(),
                        bank_card=row["bank_card"].strip(),
                        status=AnchorStatus(row.get("status", "active").strip().lower()),
                        sign_date=datetime.strptime(row["sign_date"].strip(), "%Y-%m-%d").date(),
                        remark=row.get("remark", "").strip() or None,
                        source_file=str(filepath.name),
                        source_line=line_num,
                    )
                    if anchor.anchor_id in self.anchors:
                        self.errors.append(ValidationError(
                            f"主播ID重复: {anchor.anchor_id}",
                            filepath.name, line_num, "anchor_id", anchor.anchor_id
                        ))
                    else:
                        self.anchors[anchor.anchor_id] = anchor
                except KeyError as e:
                    self.errors.append(ValidationError(
                        f"缺少必填列: {e}", filepath.name, line_num, str(e)
                    ))
                except ValueError as e:
                    self.errors.append(ValidationError(
                        str(e), filepath.name, line_num
                    ))

    def _load_tax_rates(self):
        filepath = self.input_dir / "tax_rates.csv"
        if not filepath.exists():
            self.errors.append(ValidationError(
                "税率表文件不存在", str(filepath), 0
            ))
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    tax_rate = TaxRate(
                        tax_type=row["tax_type"].strip(),
                        tax_code=row["tax_code"].strip(),
                        rate=Decimal(row["rate"].strip()),
                        effective_start=datetime.strptime(row["effective_start"].strip(), "%Y-%m-%d").date(),
                        effective_end=datetime.strptime(row["effective_end"].strip(), "%Y-%m-%d").date()
                        if row.get("effective_end", "").strip() else None,
                        taxable_item=row["taxable_item"].strip(),
                        deduction_threshold=Decimal(row.get("deduction_threshold", "0").strip() or "0"),
                        quick_calculation_deduction=Decimal(row.get("quick_calculation_deduction", "0").strip() or "0"),
                        source_file=str(filepath.name),
                        source_line=line_num,
                    )
                    if tax_rate.rate < 0 or tax_rate.rate > 1:
                        self.errors.append(ValidationError(
                            f"税率应在0-1之间: {tax_rate.rate}",
                            filepath.name, line_num, "rate", str(tax_rate.rate)
                        ))
                        continue
                    self.tax_rates.append(tax_rate)
                except KeyError as e:
                    self.errors.append(ValidationError(
                        f"缺少必填列: {e}", filepath.name, line_num, str(e)
                    ))
                except ValueError as e:
                    self.errors.append(ValidationError(
                        str(e), filepath.name, line_num
                    ))

    def _load_agreements(self):
        filepath = self.input_dir / "agreements.csv"
        if not filepath.exists():
            self.errors.append(ValidationError(
                "工会协议文件不存在", str(filepath), 0
            ))
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    platform_rate = Decimal(row["platform_share_rate"].strip())
                    union_rate = Decimal(row["union_share_rate"].strip())
                    anchor_rate = Decimal(row["anchor_share_rate"].strip())
                    total_rate = platform_rate + union_rate + anchor_rate
                    if abs(total_rate - Decimal("1")) > Decimal("0.0001"):
                        self.errors.append(ValidationError(
                            f"分成比例合计应为100%，实际为: {total_rate * 100:.2f}%",
                            filepath.name, line_num, "合计比例", f"{total_rate * 100:.2f}%"
                        ))

                    agreement = UnionAgreement(
                        agreement_id=row["agreement_id"].strip(),
                        union_id=row["union_id"].strip(),
                        union_name=row["union_name"].strip(),
                        anchor_id=row["anchor_id"].strip(),
                        platform_share_rate=platform_rate,
                        union_share_rate=union_rate,
                        anchor_share_rate=anchor_rate,
                        effective_start=datetime.strptime(row["effective_start"].strip(), "%Y-%m-%d").date(),
                        effective_end=datetime.strptime(row["effective_end"].strip(), "%Y-%m-%d").date()
                        if row.get("effective_end", "").strip() else None,
                        source_file=str(filepath.name),
                        source_line=line_num,
                    )
                    self.agreements.append(agreement)
                except KeyError as e:
                    self.errors.append(ValidationError(
                        f"缺少必填列: {e}", filepath.name, line_num, str(e)
                    ))
                except ValueError as e:
                    self.errors.append(ValidationError(
                        str(e), filepath.name, line_num
                    ))

    def _load_transactions(self):
        filepath = self.input_dir / "transactions.csv"
        if not filepath.exists():
            self.errors.append(ValidationError(
                "打赏流水文件不存在", str(filepath), 0
            ))
            return

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    trans_type = TransactionType(row["transaction_type"].strip().lower())
                    amount = Decimal(row["amount"].strip())
                    if amount <= 0:
                        self.errors.append(ValidationError(
                            f"交易金额必须大于0: {amount}",
                            filepath.name, line_num, "amount", str(amount)
                        ))
                        continue

                    transaction = RewardTransaction(
                        transaction_id=row["transaction_id"].strip(),
                        anchor_id=row["anchor_id"].strip(),
                        transaction_type=trans_type,
                        amount=amount,
                        transaction_date=datetime.strptime(row["transaction_date"].strip(), "%Y-%m-%d %H:%M:%S"),
                        settle_month=row["settle_month"].strip(),
                        gift_name=row.get("gift_name", "").strip() or None,
                        viewer_id=row.get("viewer_id", "").strip() or None,
                        related_transaction_id=row.get("related_transaction_id", "").strip() or None,
                        remark=row.get("remark", "").strip() or None,
                        source_file=str(filepath.name),
                        source_line=line_num,
                    )
                    if trans_type == TransactionType.REFUND and not transaction.related_transaction_id:
                        self.warnings.append(
                            f"[{filepath.name}:{line_num}] 退款交易未关联原交易ID: {transaction.transaction_id}"
                        )
                    self.transactions.append(transaction)
                except KeyError as e:
                    self.errors.append(ValidationError(
                        f"缺少必填列: {e}", filepath.name, line_num, str(e)
                    ))
                except ValueError as e:
                    self.errors.append(ValidationError(
                        str(e), filepath.name, line_num
                    ))

    def _cross_validate(self):
        anchor_ids = set(self.anchors.keys())

        for agreement in self.agreements:
            if agreement.anchor_id not in anchor_ids:
                self.errors.append(ValidationError(
                    f"协议引用的主播ID不存在: {agreement.anchor_id}",
                    agreement.source_file, agreement.source_line, "anchor_id", agreement.anchor_id
                ))

        for transaction in self.transactions:
            if transaction.anchor_id not in anchor_ids:
                self.errors.append(ValidationError(
                    f"流水引用的主播ID不存在: {transaction.anchor_id}",
                    transaction.source_file, transaction.source_line, "anchor_id", transaction.anchor_id
                ))
                continue

            anchor = self.anchors.get(transaction.anchor_id)
            if anchor and anchor.status == AnchorStatus.INACTIVE:
                self.warnings.append(
                    f"[{transaction.source_file}:{transaction.source_line}] "
                    f"交易关联的主播已离职: {anchor.anchor_name}({anchor.anchor_id})"
                )

        txn_ids = {txn.transaction_id: txn for txn in self.transactions}
        for transaction in self.transactions:
            if transaction.transaction_type == TransactionType.REFUND and transaction.related_transaction_id:
                if transaction.related_transaction_id not in txn_ids:
                    self.errors.append(ValidationError(
                        f"退款关联的原交易ID不存在: {transaction.related_transaction_id}",
                        transaction.source_file, transaction.source_line,
                        "related_transaction_id", transaction.related_transaction_id
                    ))
                else:
                    orig_txn = txn_ids[transaction.related_transaction_id]
                    if orig_txn.transaction_type != TransactionType.REWARD:
                        self.errors.append(ValidationError(
                            f"退款关联的交易不是打赏类型: {transaction.related_transaction_id}",
                            transaction.source_file, transaction.source_line,
                            "related_transaction_id", transaction.related_transaction_id
                        ))
