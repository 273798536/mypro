import pandas as pd
from datetime import datetime
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import (
    get_session, Package, TrackingNode, TaxNotice,
    SupplierStatement, TaxRecord, ExceptionRecord, ExceptionType,
    DataSource, AuditLog
)


class DataChecker:
    def __init__(self, session: Session = None, batch_id: str = None):
        self.session = session or get_session()
        self.batch_id = batch_id
        self._own_session = session is None
        self.exceptions: List[Dict] = []
        self.source_id = None

    def close(self):
        if self._own_session:
            self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def _add_exception(self, exc_type: ExceptionType, tracking_number: str,
                       message: str, severity: str = "error",
                       original_row: int = None, field_name: str = None,
                       expected: str = None, actual: str = None,
                       related_table: str = None, related_id: int = None,
                       source_id: int = None):
        exc = ExceptionRecord(
            batch_id=self.batch_id,
            source_id=source_id,
            exception_type=exc_type,
            severity=severity,
            tracking_number=None if (isinstance(tracking_number, float) and pd.isna(tracking_number)) or tracking_number is None else str(tracking_number),
            original_row=original_row,
            field_name=field_name,
            expected_value=str(expected) if expected else None,
            actual_value=str(actual) if actual else None,
            message=message,
            related_table=related_table,
            related_id=related_id
        )
        self.session.add(exc)
        self.exceptions.append({
            "type": exc_type.value,
            "tracking_number": tracking_number,
            "message": message,
            "severity": severity,
        })

    def check_missing_declarations(self) -> int:
        subquery = self.session.query(TaxNotice).distinct()
        if self.batch_id:
            subquery = subquery.filter(TaxNotice.batch_id == self.batch_id)

        missing_notices = subquery.filter(
            ~TaxNotice.tracking_number.in_(
                self.session.query(Package.tracking_number).filter(
                    Package.batch_id == self.batch_id if self.batch_id else True
                )
            )
        ).all()

        count = 0
        for notice in missing_notices:
            self._add_exception(
                ExceptionType.MISSING_DATA,
                notice.tracking_number,
                "有补税通知但缺少申报表数据",
                severity="error",
                related_table="tax_notices",
                related_id=notice.id,
                source_id=notice.source_id,
                original_row=notice.original_row
            )
            count += 1
        return count

    def check_missing_tracking(self) -> int:
        subquery = self.session.query(Package).distinct()
        if self.batch_id:
            subquery = subquery.filter(Package.batch_id == self.batch_id)

        missing_packages = subquery.filter(
            ~Package.tracking_number.in_(
                self.session.query(TrackingNode.tracking_number).filter(
                    TrackingNode.batch_id == self.batch_id if self.batch_id else True
                )
            )
        ).all()

        count = 0
        for pkg in missing_packages:
            self._add_exception(
                ExceptionType.MISSING_DATA,
                pkg.tracking_number,
                "有申报但缺少轨迹节点数据",
                severity="warning",
                related_table="packages",
                related_id=pkg.id,
                source_id=pkg.source_id,
                original_row=pkg.original_row
            )
            count += 1
        return count

    def check_tax_discrepancy(self) -> int:
        count = 0

        query = self.session.query(
            Package,
            TaxNotice
        ).outerjoin(
            TaxNotice, Package.tracking_number == TaxNotice.tracking_number
        )

        if self.batch_id:
            query = query.filter(Package.batch_id == self.batch_id)

        for pkg, notice in query:
            if not pkg or not notice:
                continue

            calc_tax = pkg.declared_value * 0.13

            diff = abs(notice.tax_amount - calc_tax) if notice.tax_amount else calc_tax

            if diff > 1:
                tax_record = self.session.query(TaxRecord).filter(
                    TaxRecord.tracking_number == pkg.tracking_number
                ).first()

                if not tax_record:
                    tax_record = TaxRecord(
                        batch_id=self.batch_id,
                        package_id=pkg.id,
                        tracking_number=pkg.tracking_number,
                        declaration_number=pkg.declaration_number,
                        supplier=pkg.supplier,
                        calculated_tax=calc_tax,
                        actual_tax=notice.tax_amount,
                        tax_difference=diff,
                        tax_authority=notice.tax_authority,
                        is_matched=False
                    )
                    self.session.add(tax_record)
                    self.session.flush()

                self._add_exception(
                    ExceptionType.TAX_DISCREPANCY,
                    pkg.tracking_number,
                    f"税费差异: 计算值={calc_tax:.2f}, 实际值={notice.tax_amount:.2f}, 差异={diff:.2f}",
                    severity="error",
                    original_row=pkg.original_row,
                    field_name="tax_amount",
                    expected=f"{calc_tax:.2f}",
                    actual=f"{notice.tax_amount:.2f}",
                    related_table="tax_records",
                    related_id=tax_record.id,
                    source_id=pkg.source_id
                )
                count += 1

        return count

    def check_supplier_mismatch(self) -> int:
        count = 0

        query = self.session.query(
            Package,
            SupplierStatement
        ).outerjoin(
            SupplierStatement, Package.tracking_number == SupplierStatement.tracking_number
        )

        if self.batch_id:
            query = query.filter(Package.batch_id == self.batch_id)

        for pkg, stmt in query:
            if not pkg or not stmt:
                continue

            if pkg.supplier and stmt.supplier and pkg.supplier != stmt.supplier:
                self._add_exception(
                    ExceptionType.MISMATCH,
                    pkg.tracking_number,
                    f"供应商不一致: 申报={pkg.supplier}, 账单={stmt.supplier}",
                    severity="warning",
                    original_row=pkg.original_row,
                    field_name="supplier",
                    expected=pkg.supplier,
                    actual=stmt.supplier,
                    related_table="supplier_statements",
                    related_id=stmt.id,
                    source_id=pkg.source_id
                )
                count += 1

        return count

    def check_split_package_tax(self) -> int:
        count = 0

        split_packages = self.session.query(Package).filter(
            Package.split_flag == True
        )
        if self.batch_id:
            split_packages = split_packages.filter(Package.batch_id == self.batch_id)

        for pkg in split_packages.all():
            tax_notices = self.session.query(TaxNotice).filter(
                TaxNotice.tracking_number == pkg.tracking_number
            ).all()

            if not tax_notices:
                self._add_exception(
                    ExceptionType.MISSING_DATA,
                    pkg.tracking_number,
                    "拆分包裹缺少对应的补税通知",
                    severity="error",
                    original_row=pkg.original_row,
                    related_table="packages",
                    related_id=pkg.id,
                    source_id=pkg.source_id
                )
                count += 1

        return count

    def run_all_checks(self) -> Dict[str, Any]:
        self.session.query(ExceptionRecord).filter(
            ExceptionRecord.batch_id == self.batch_id if self.batch_id else True
        ).delete(synchronize_session=False)

        results = {
            "missing_declarations": self.check_missing_declarations(),
            "missing_tracking": self.check_missing_tracking(),
            "tax_discrepancies": self.check_tax_discrepancy(),
            "supplier_mismatches": self.check_supplier_mismatch(),
            "split_package_issues": self.check_split_package_tax(),
        }

        self.session.commit()

        total = sum(results.values())
        return {
            "batch_id": self.batch_id,
            "check_time": datetime.utcnow().isoformat(),
            "total_exceptions": total,
            "breakdown": results,
            "exceptions": self.exceptions
        }


def run_checks(batch_id: str = None, session: Session = None) -> Dict[str, Any]:
    with DataChecker(session=session, batch_id=batch_id) as checker:
        return checker.run_all_checks()
