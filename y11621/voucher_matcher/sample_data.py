from .models import BankFlow, Invoice, Contract, DataSource


def create_sample_bank_flows() -> list:
    return [
        BankFlow(
            id="BF001",
            trade_date="2024-01-15",
            trade_time="09:30:00",
            amount=11300.00,
            direction="支出",
            counterparty="北京科技有限公司",
            summary="货款",
            balance=100000.00,
            bank_account="6222****1234",
        ),
        BankFlow(
            id="BF002",
            trade_date="2024-01-16",
            trade_time="14:20:00",
            amount=5000.00,
            direction="支出",
            counterparty="北京科技有限公司",
            summary="服务费",
            balance=95000.00,
            bank_account="6222****1234",
        ),
        BankFlow(
            id="BF003",
            trade_date="2024-01-17",
            trade_time="10:15:00",
            amount=-1130.00,
            direction="收入",
            counterparty="北京科技有限公司",
            summary="退货退款",
            balance=96130.00,
            bank_account="6222****1234",
        ),
        BankFlow(
            id="BF004",
            trade_date="2024-01-18",
            trade_time="16:45:00",
            amount=22600.00,
            direction="支出",
            counterparty="上海贸易公司",
            summary="货款 HT2024001",
            balance=73530.00,
            bank_account="6222****1234",
        ),
        BankFlow(
            id="BF005",
            trade_date="2024-01-19",
            trade_time="11:00:00",
            amount=3390.00,
            direction="支出",
            counterparty="广州服务中心",
            summary="咨询费",
            balance=70140.00,
            bank_account="6222****1234",
        ),
        BankFlow(
            id="BF006",
            trade_date="2024-01-20",
            trade_time="09:00:00",
            amount=8888.88,
            direction="支出",
            counterparty="深圳某某有限公司",
            summary="装修款",
            balance=61251.12,
            bank_account="6222****1234",
        ),
    ]


def create_sample_invoices() -> list:
    return [
        Invoice(
            id="INV001",
            invoice_code="1100123456",
            invoice_number="00012345",
            invoice_date="2024-01-10",
            amount=10000.00,
            tax_amount=1300.00,
            total_amount=11300.00,
            seller_name="北京科技有限公司",
            buyer_name="我方公司",
            invoice_type="增值税专用发票",
            status="正常",
        ),
        Invoice(
            id="INV001B",
            invoice_code="1100123456",
            invoice_number="00012348",
            invoice_date="2024-01-11",
            amount=10000.00,
            tax_amount=1300.00,
            total_amount=11300.00,
            seller_name="北京科技有限公司",
            buyer_name="我方公司",
            invoice_type="增值税专用发票",
            status="正常",
        ),
        Invoice(
            id="INV002",
            invoice_code="1100123456",
            invoice_number="00012346",
            invoice_date="2024-01-12",
            amount=4424.78,
            tax_amount=575.22,
            total_amount=5000.00,
            seller_name="北京科技有限公司",
            buyer_name="我方公司",
            invoice_type="增值税专用发票",
            status="正常",
        ),
        Invoice(
            id="INV003",
            invoice_code="1100123456",
            invoice_number="00012347",
            invoice_date="2024-01-15",
            amount=-1000.00,
            tax_amount=-130.00,
            total_amount=-1130.00,
            seller_name="北京科技有限公司",
            buyer_name="我方公司",
            invoice_type="增值税专用发票(红字)",
            status="红冲",
        ),
        Invoice(
            id="INV004",
            invoice_code="3100654321",
            invoice_number="00098765",
            invoice_date="2024-01-16",
            amount=20000.00,
            tax_amount=2600.00,
            total_amount=22600.00,
            seller_name="上海贸易公司",
            buyer_name="我方公司",
            invoice_type="增值税专用发票",
            status="正常",
        ),
        Invoice(
            id="INV005",
            invoice_code="3100654321",
            invoice_number="00098766",
            invoice_date="2024-01-17",
            amount=3000.00,
            tax_amount=390.00,
            total_amount=3390.00,
            seller_name="广州市服务中心",
            buyer_name="我方公司",
            invoice_type="增值税普通发票",
            status="正常",
        ),
    ]


def create_sample_contracts() -> list:
    return [
        Contract(
            id="CT001",
            contract_no="HT2024001",
            contract_date="2024-01-01",
            party_a="我方公司",
            party_b="上海贸易公司",
            contract_amount=22600.00,
            payment_terms="发货后30天内付清",
        ),
    ]


def load_sample_data(state_manager) -> None:
    for flow in create_sample_bank_flows():
        state_manager.add_bank_flow(flow)
    for invoice in create_sample_invoices():
        state_manager.add_invoice(invoice)
    for contract in create_sample_contracts():
        state_manager.add_contract(contract)
