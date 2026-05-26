"""P2P历史兑付清算 - 样例数据集

包含三类记录:
1. 正常记录: 张三 - 合同完整、凭证有效、兑付无争议
2. 边界记录: 李四(曾用名李老四) - 身份归并、凭证重复、利息口径变化
3. 坏数据: 王五 - 凭证缺失、兑付金额与合同不符
"""

from models import (
    Dataset, Investor, Contract, Voucher, Repayment,
    VoucherStatus, RepaymentStatus, RepaymentType,
    voucher_hash,
)


def build_sample_dataset() -> Dataset:
    ds = Dataset()

    # ========== 1. 正常记录: 张三 ==========
    ds.investors["I001"] = Investor(
        investor_id="I001",
        name="张三",
        aliases=[],
        id_card="320101198501011234",
        notes="实名投资人，无历史变更"
    )

    ds.contracts["C001"] = Contract(
        contract_id="C001",
        investor_id="I001",
        principal_amount=100000.0,
        interest_rate=0.05,
        start_date="2019-06-01",
        maturity_date="2020-06-01",
        source="contract_scan_20190601.pdf",
        notes="标准一年期合同，年利率5%"
    )

    ds.vouchers["V001"] = Voucher(
        voucher_id="V001",
        contract_id="C001",
        file_ref="vouchers/C001_receipt_20200601.jpg",
        content_hash=voucher_hash("C001|100000|5000|20200601"),
        upload_date="2020-06-01",
        voucher_type="receipt",
        status=VoucherStatus.VALID,
        source="bank_receipt_scan"
    )

    ds.repayments["R001"] = Repayment(
        repayment_id="R001",
        contract_id="C001",
        amount=100000.0,
        repayment_type=RepaymentType.PRINCIPAL,
        date="2020-06-01",
        voucher_id="V001",
        status=RepaymentStatus.CONFIRMED,
        source="bank_statement_20200601.csv",
        notes="本金全额兑付"
    )

    ds.repayments["R002"] = Repayment(
        repayment_id="R002",
        contract_id="C001",
        amount=5000.0,
        repayment_type=RepaymentType.INTEREST,
        date="2020-06-01",
        voucher_id="V001",
        status=RepaymentStatus.CONFIRMED,
        source="bank_statement_20200601.csv",
        notes="利息：100000 × 5% = 5000"
    )

    # ========== 2. 边界记录: 李四(曾用名李老四) ==========
    # 两个不同的投资人条目，实际是同一人（更名）
    ds.investors["I002"] = Investor(
        investor_id="I002",
        name="李四",
        aliases=["李老四"],
        id_card="320101197803155678",
        merged_into=None,
        notes="2021年更名，原姓名李老四"
    )

    ds.investors["I002_OLD"] = Investor(
        investor_id="I002_OLD",
        name="李老四",
        aliases=[],
        id_card="320101197803155678",
        merged_into="I002",
        notes="旧档案条目，身份证号与I002一致，需归并"
    )

    ds.contracts["C002"] = Contract(
        contract_id="C002",
        investor_id="I002",
        principal_amount=50000.0,
        interest_rate=0.06,
        start_date="2019-03-01",
        maturity_date="2020-03-01",
        source="contract_scan_20190301.pdf",
        notes="合同载明年利率6%，后口头协商调整为5.5%"
    )

    # 同一张凭证被扫描了两次（内容hash相同）
    ds.vouchers["V002"] = Voucher(
        voucher_id="V002",
        contract_id="C002",
        file_ref="vouchers/C002_receipt_A.jpg",
        content_hash=voucher_hash("C002|50000|2750|20200301"),
        upload_date="2020-03-05",
        voucher_type="receipt",
        status=VoucherStatus.VALID,
        source="investor_submit"
    )

    ds.vouchers["V003"] = Voucher(
        voucher_id="V003",
        contract_id="C002",
        file_ref="vouchers/C002_receipt_B.jpg",
        content_hash=voucher_hash("C002|50000|2750|20200301"),
        upload_date="2020-03-06",
        voucher_type="receipt",
        status=VoucherStatus.VALID,
        source="investor_submit",
        notes="同一凭证二次上传，疑似重复"
    )

    # 利息按5.5%兑付（而非合同载明的6%），存在口径变化
    ds.repayments["R003"] = Repayment(
        repayment_id="R003",
        contract_id="C002",
        amount=50000.0,
        repayment_type=RepaymentType.PRINCIPAL,
        date="2020-03-01",
        voucher_id="V002",
        status=RepaymentStatus.CONFIRMED,
        source="bank_statement_20200301.csv",
        notes="本金全额"
    )

    ds.repayments["R004"] = Repayment(
        repayment_id="R004",
        contract_id="C002",
        amount=2750.0,
        repayment_type=RepaymentType.INTEREST,
        date="2020-03-01",
        voucher_id="V002",
        status=RepaymentStatus.CONFIRMED,
        source="bank_statement_20200301.csv",
        notes="利息：50000 × 5.5% = 2750，与合同6%不符"
    )

    # 另一笔重复认领的兑付（用了V003）
    ds.repayments["R005"] = Repayment(
        repayment_id="R005",
        contract_id="C002",
        amount=2750.0,
        repayment_type=RepaymentType.INTEREST,
        date="2020-03-02",
        voucher_id="V003",
        status=RepaymentStatus.PENDING,
        source="manual_entry_20200302.csv",
        notes="重复录入，同凭证不同扫描件"
    )

    # ========== 3. 坏数据: 王五 ==========
    ds.investors["I003"] = Investor(
        investor_id="I003",
        name="王五",
        aliases=[],
        id_card="320101199208209012",
        notes="材料不完整"
    )

    ds.contracts["C003"] = Contract(
        contract_id="C003",
        investor_id="I003",
        principal_amount=80000.0,
        interest_rate=0.07,
        start_date="2019-09-01",
        maturity_date="2020-09-01",
        source="contract_scan_20190901.pdf",
        notes="合同本金80000，年利率7%"
    )

    # 凭证V004: 文件引用丢失（坏数据）
    ds.vouchers["V004"] = Voucher(
        voucher_id="V004",
        contract_id="C003",
        file_ref="vouchers/MISSING_C003.jpg",
        content_hash=voucher_hash("C003|MISSING"),
        upload_date="2020-09-10",
        voucher_type="receipt",
        status=VoucherStatus.INVALID,
        source="unknown",
        notes="文件不存在，引用丢失"
    )

    # 兑付金额与合同不符：合同80000，但兑付只有60000
    ds.repayments["R006"] = Repayment(
        repayment_id="R006",
        contract_id="C003",
        amount=60000.0,
        repayment_type=RepaymentType.PRINCIPAL,
        date="2020-09-01",
        voucher_id="V004",
        status=RepaymentStatus.DISPUTED,
        source="partial_statement_20200901.csv",
        notes="部分兑付，与合同本金差额20000元，待确认"
    )

    ds.repayments["R007"] = Repayment(
        repayment_id="R007",
        contract_id="C003",
        amount=4200.0,
        repayment_type=RepaymentType.INTEREST,
        date="2020-09-01",
        voucher_id="V004",
        status=RepaymentStatus.DISPUTED,
        source="partial_statement_20200901.csv",
        notes="利息按全额80000×7%=5600计算，但只兑付4200"
    )

    return ds
