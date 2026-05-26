import json
from typing import List, Dict, Any, Tuple
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import (
    Customer, Contract, Invoice, Receipt, CollectionRecord, CreditLimit,
    DataSource, AuditLog, ImportStrategy, DataSourceType
)
from app.schemas.schemas import (
    CustomerCreate, ContractCreate, InvoiceCreate, ReceiptCreate,
    CollectionRecordCreate, CreditLimitCreate, DataSourceCreate, ImportResult
)
from app.utils.common import parse_date, parse_float, parse_int, generate_batch_no


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def _create_data_source(self, source_type: DataSourceType, file_name: str,
                            strategy: ImportStrategy, imported_by: str,
                            remarks: str, record_count: int) -> DataSource:
        batch_no = generate_batch_no()
        ds = DataSource(
            source_type=source_type,
            file_name=file_name,
            import_strategy=strategy,
            record_count=record_count,
            imported_by=imported_by,
            batch_no=batch_no,
            remarks=remarks
        )
        self.db.add(ds)
        self.db.flush()
        return ds

    def _log_audit(self, table_name: str, record_id: int, action: str,
                   old_values: Dict, new_values: Dict, changed_by: str,
                   change_reason: str, source_id: int):
        audit = AuditLog(
            table_name=table_name,
            record_id=record_id,
            action=action,
            old_values=json.dumps(old_values, ensure_ascii=False) if old_values else None,
            new_values=json.dumps(new_values, ensure_ascii=False) if new_values else None,
            changed_by=changed_by,
            change_reason=change_reason,
            source_id=source_id
        )
        self.db.add(audit)

    def _get_or_create_customer(self, customer_code: str, customer_name: str,
                                source_id: int, imported_by: str) -> Tuple[Customer, str]:
        customer = self.db.query(Customer).filter(Customer.customer_code == customer_code).first()
        if customer:
            old_vals = {
                "customer_name": customer.customer_name,
                "is_active": customer.is_active
            }
            customer.customer_name = customer_name
            customer.is_active = True
            self._log_audit("customers", customer.id, "update", old_vals,
                           {"customer_name": customer_name}, imported_by,
                           "数据导入更新", source_id)
            return customer, "updated"
        else:
            customer = Customer(
                customer_code=customer_code,
                customer_name=customer_name,
                is_active=True
            )
            self.db.add(customer)
            self.db.flush()
            self._log_audit("customers", customer.id, "create", None,
                           {"customer_code": customer_code, "customer_name": customer_name},
                           imported_by, "数据导入创建", source_id)
            return customer, "created"

    def import_customers(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                         file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.CUSTOMER, file_name, strategy,
                                      imported_by, f"客户数据导入，共{len(records)}条", len(records))

        for record in records:
            customer_code = str(record.get("customer_code", "")).strip()
            customer_name = str(record.get("customer_name", "")).strip()
            if not customer_code or not customer_name:
                skipped += 1
                continue

            existing = self.db.query(Customer).filter(Customer.customer_code == customer_code).first()
            if existing and strategy == ImportStrategy.IGNORE:
                skipped += 1
                continue

            customer, action = self._get_or_create_customer(customer_code, customer_name, ds.id, imported_by)
            if action == "created":
                created += 1
            else:
                updated += 1

            if "industry" in record:
                customer.industry = str(record["industry"]).strip() if record["industry"] else None
            if "region" in record:
                customer.region = str(record["region"]).strip() if record["region"] else None
            if "credit_rating" in record:
                customer.credit_rating = str(record["credit_rating"]).strip() if record["credit_rating"] else None
            if "contact_person" in record:
                customer.contact_person = str(record["contact_person"]).strip() if record["contact_person"] else None
            if "contact_phone" in record:
                customer.contact_phone = str(record["contact_phone"]).strip() if record["contact_phone"] else None
            if "address" in record:
                customer.address = str(record["address"]).strip() if record["address"] else None

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.CUSTOMER,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )

    def import_contracts(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                         file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.CONTRACT, file_name, strategy,
                                      imported_by, f"合同数据导入，共{len(records)}条", len(records))

        for record in records:
            contract_no = str(record.get("contract_no", "")).strip()
            customer_code = str(record.get("customer_code", "")).strip()
            if not contract_no or not customer_code:
                skipped += 1
                continue

            customer, _ = self._get_or_create_customer(
                customer_code,
                str(record.get("customer_name", customer_code)).strip(),
                ds.id, imported_by
            )

            existing = self.db.query(Contract).filter(Contract.contract_no == contract_no).first()
            if existing and strategy == ImportStrategy.IGNORE:
                skipped += 1
                continue

            contract_date = parse_date(record.get("contract_date"))
            if not contract_date:
                skipped += 1
                continue

            contract_amount = parse_float(record.get("contract_amount"))

            if existing and strategy == ImportStrategy.OVERWRITE:
                old_vals = {
                    "contract_amount": existing.contract_amount,
                    "contract_date": str(existing.contract_date),
                    "status": existing.status
                }
                existing.customer_id = customer.id
                existing.contract_amount = contract_amount
                existing.contract_date = contract_date
                existing.start_date = parse_date(record.get("start_date"))
                existing.end_date = parse_date(record.get("end_date"))
                existing.payment_terms = str(record.get("payment_terms", "")).strip() or None
                existing.credit_days = parse_int(record.get("credit_days")) or 30
                existing.status = str(record.get("status", "active")).strip()
                existing.remarks = str(record.get("remarks", "")).strip() or None
                existing.source_id = ds.id
                self._log_audit("contracts", existing.id, "update", old_vals,
                               {"contract_amount": contract_amount}, imported_by,
                               "数据导入覆盖更新", ds.id)
                updated += 1
            else:
                contract = Contract(
                    contract_no=contract_no,
                    customer_id=customer.id,
                    contract_amount=contract_amount,
                    contract_date=contract_date,
                    start_date=parse_date(record.get("start_date")),
                    end_date=parse_date(record.get("end_date")),
                    payment_terms=str(record.get("payment_terms", "")).strip() or None,
                    credit_days=parse_int(record.get("credit_days")) or 30,
                    status=str(record.get("status", "active")).strip(),
                    remarks=str(record.get("remarks", "")).strip() or None,
                    source_id=ds.id
                )
                self.db.add(contract)
                self._log_audit("contracts", 0, "create", None,
                               {"contract_no": contract_no}, imported_by,
                               "数据导入创建", ds.id)
                created += 1

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.CONTRACT,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )

    def import_invoices(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                        file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.INVOICE, file_name, strategy,
                                      imported_by, f"发票数据导入，共{len(records)}条", len(records))

        for record in records:
            invoice_no = str(record.get("invoice_no", "")).strip()
            customer_code = str(record.get("customer_code", "")).strip()
            if not invoice_no or not customer_code:
                skipped += 1
                continue

            customer, _ = self._get_or_create_customer(
                customer_code,
                str(record.get("customer_name", customer_code)).strip(),
                ds.id, imported_by
            )

            existing = self.db.query(Invoice).filter(Invoice.invoice_no == invoice_no).first()
            if existing and strategy == ImportStrategy.IGNORE:
                skipped += 1
                continue

            invoice_date = parse_date(record.get("invoice_date"))
            due_date = parse_date(record.get("due_date"))
            if not invoice_date or not due_date:
                skipped += 1
                continue

            invoice_amount = parse_float(record.get("invoice_amount"))
            tax_amount = parse_float(record.get("tax_amount"))
            total_amount = parse_float(record.get("total_amount")) or (invoice_amount + tax_amount)
            remaining_amount = parse_float(record.get("remaining_amount")) or total_amount

            contract_id = None
            contract_no = str(record.get("contract_no", "")).strip()
            if contract_no:
                contract = self.db.query(Contract).filter(Contract.contract_no == contract_no).first()
                if contract:
                    contract_id = contract.id

            if existing and strategy == ImportStrategy.OVERWRITE:
                old_vals = {
                    "total_amount": existing.total_amount,
                    "due_date": str(existing.due_date),
                    "remaining_amount": existing.remaining_amount
                }
                existing.customer_id = customer.id
                existing.contract_id = contract_id
                existing.invoice_date = invoice_date
                existing.due_date = due_date
                existing.invoice_amount = invoice_amount
                existing.tax_amount = tax_amount
                existing.total_amount = total_amount
                existing.remaining_amount = remaining_amount
                existing.status = str(record.get("status", "unpaid")).strip()
                existing.promise_date = parse_date(record.get("promise_date"))
                existing.remarks = str(record.get("remarks", "")).strip() or None
                existing.source_id = ds.id
                self._log_audit("invoices", existing.id, "update", old_vals,
                               {"total_amount": total_amount, "due_date": str(due_date)},
                               imported_by, "数据导入覆盖更新", ds.id)
                updated += 1
            else:
                invoice = Invoice(
                    invoice_no=invoice_no,
                    customer_id=customer.id,
                    contract_id=contract_id,
                    invoice_date=invoice_date,
                    due_date=due_date,
                    invoice_amount=invoice_amount,
                    tax_amount=tax_amount,
                    total_amount=total_amount,
                    remaining_amount=remaining_amount,
                    status=str(record.get("status", "unpaid")).strip(),
                    promise_date=parse_date(record.get("promise_date")),
                    remarks=str(record.get("remarks", "")).strip() or None,
                    source_id=ds.id
                )
                self.db.add(invoice)
                created += 1

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.INVOICE,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )

    def import_receipts(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                        file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.RECEIPT, file_name, strategy,
                                      imported_by, f"回款数据导入，共{len(records)}条", len(records))

        for record in records:
            receipt_no = str(record.get("receipt_no", "")).strip()
            customer_code = str(record.get("customer_code", "")).strip()
            if not receipt_no or not customer_code:
                skipped += 1
                continue

            customer, _ = self._get_or_create_customer(
                customer_code,
                str(record.get("customer_name", customer_code)).strip(),
                ds.id, imported_by
            )

            existing = self.db.query(Receipt).filter(Receipt.receipt_no == receipt_no).first()
            if existing and strategy == ImportStrategy.IGNORE:
                skipped += 1
                continue

            receipt_date = parse_date(record.get("receipt_date"))
            if not receipt_date:
                skipped += 1
                continue

            receipt_amount = parse_float(record.get("receipt_amount"))

            if existing and strategy == ImportStrategy.OVERWRITE:
                old_vals = {
                    "receipt_amount": existing.receipt_amount,
                    "receipt_date": str(existing.receipt_date)
                }
                existing.customer_id = customer.id
                existing.receipt_date = receipt_date
                existing.receipt_amount = receipt_amount
                existing.payment_method = str(record.get("payment_method", "")).strip() or None
                existing.bank_account = str(record.get("bank_account", "")).strip() or None
                existing.unmatched_amount = receipt_amount - existing.matched_amount
                existing.remarks = str(record.get("remarks", "")).strip() or None
                existing.source_id = ds.id
                self._log_audit("receipts", existing.id, "update", old_vals,
                               {"receipt_amount": receipt_amount}, imported_by,
                               "数据导入覆盖更新", ds.id)
                updated += 1
            else:
                receipt = Receipt(
                    receipt_no=receipt_no,
                    customer_id=customer.id,
                    receipt_date=receipt_date,
                    receipt_amount=receipt_amount,
                    payment_method=str(record.get("payment_method", "")).strip() or None,
                    bank_account=str(record.get("bank_account", "")).strip() or None,
                    unmatched_amount=receipt_amount,
                    status=str(record.get("status", "pending")).strip(),
                    remarks=str(record.get("remarks", "")).strip() or None,
                    source_id=ds.id
                )
                self.db.add(receipt)
                created += 1

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.RECEIPT,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )

    def import_collection_records(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                                  file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.COLLECTION, file_name, strategy,
                                      imported_by, f"催收记录导入，共{len(records)}条", len(records))

        for record in records:
            customer_code = str(record.get("customer_code", "")).strip()
            contact_date = parse_date(record.get("contact_date"))
            if not customer_code or not contact_date:
                skipped += 1
                continue

            customer, _ = self._get_or_create_customer(
                customer_code,
                str(record.get("customer_name", customer_code)).strip(),
                ds.id, imported_by
            )

            invoice_id = None
            invoice_no = str(record.get("invoice_no", "")).strip()
            if invoice_no:
                invoice = self.db.query(Invoice).filter(Invoice.invoice_no == invoice_no).first()
                if invoice:
                    invoice_id = invoice.id

            collection = CollectionRecord(
                customer_id=customer.id,
                invoice_id=invoice_id,
                contact_date=contact_date,
                collector=str(record.get("collector", "")).strip() or None,
                contact_method=str(record.get("contact_method", "")).strip() or None,
                contact_person=str(record.get("contact_person", "")).strip() or None,
                promise_date=parse_date(record.get("promise_date")),
                promise_amount=parse_float(record.get("promise_amount")),
                next_action_date=parse_date(record.get("next_action_date")),
                next_action=str(record.get("next_action", "")).strip() or None,
                status=str(record.get("status", "in_progress")).strip(),
                notes=str(record.get("notes", "")).strip() or None,
                source_id=ds.id
            )
            self.db.add(collection)
            created += 1

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.COLLECTION,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )

    def import_credit_limits(self, records: List[Dict[str, Any]], strategy: ImportStrategy,
                             file_name: str, imported_by: str = "system") -> ImportResult:
        created = 0
        updated = 0
        skipped = 0
        ds = self._create_data_source(DataSourceType.CREDIT, file_name, strategy,
                                      imported_by, f"信用额度导入，共{len(records)}条", len(records))

        for record in records:
            customer_code = str(record.get("customer_code", "")).strip()
            credit_limit = parse_float(record.get("credit_limit"))
            effective_date = parse_date(record.get("effective_date"))
            if not customer_code or credit_limit <= 0 or not effective_date:
                skipped += 1
                continue

            customer, _ = self._get_or_create_customer(
                customer_code,
                str(record.get("customer_name", customer_code)).strip(),
                ds.id, imported_by
            )

            existing = self.db.query(CreditLimit).filter(
                CreditLimit.customer_id == customer.id,
                CreditLimit.is_frozen == False
            ).order_by(CreditLimit.effective_date.desc()).first()

            if existing and strategy == ImportStrategy.IGNORE:
                skipped += 1
                continue

            if existing and strategy == ImportStrategy.OVERWRITE:
                old_vals = {
                    "credit_limit": existing.credit_limit,
                    "effective_date": str(existing.effective_date)
                }
                existing.credit_limit = credit_limit
                existing.available_credit = credit_limit - existing.used_credit
                existing.effective_date = effective_date
                existing.expiry_date = parse_date(record.get("expiry_date"))
                existing.approved_by = str(record.get("approved_by", "")).strip() or None
                existing.remarks = str(record.get("remarks", "")).strip() or None
                existing.source_id = ds.id
                self._log_audit("credit_limits", existing.id, "update", old_vals,
                               {"credit_limit": credit_limit}, imported_by,
                               "数据导入覆盖更新", ds.id)
                updated += 1
            else:
                credit = CreditLimit(
                    customer_id=customer.id,
                    credit_limit=credit_limit,
                    used_credit=0,
                    available_credit=credit_limit,
                    effective_date=effective_date,
                    expiry_date=parse_date(record.get("expiry_date")),
                    is_frozen=parse_int(record.get("is_frozen")) > 0,
                    frozen_reason=str(record.get("frozen_reason", "")).strip() or None,
                    approved_by=str(record.get("approved_by", "")).strip() or None,
                    remarks=str(record.get("remarks", "")).strip() or None,
                    source_id=ds.id
                )
                self.db.add(credit)
                created += 1

        self.db.commit()
        return ImportResult(
            source_type=DataSourceType.CREDIT,
            strategy=strategy,
            total_records=len(records),
            created=created,
            updated=updated,
            skipped=skipped,
            batch_no=ds.batch_no,
            source_id=ds.id
        )
