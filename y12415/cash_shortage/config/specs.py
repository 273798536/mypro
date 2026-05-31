from cash_shortage.config.spec import FieldSpec, FilterSpec, AuditSpec, Settings

FIELD_SPECS: dict[str, FieldSpec] = {
    "store_code": FieldSpec(
        raw_column="门店编号",
        display_name="门店编号",
        dtype="str",
        description="门店在ERP系统中的唯一编号",
    ),
    "store_name": FieldSpec(
        raw_column="门店名称",
        display_name="门店名称",
        dtype="str",
        description="门店对外经营名称",
    ),
    "trans_date": FieldSpec(
        raw_column="交易日期",
        display_name="交易日期",
        dtype="date",
        description="收银交易发生的日历日期",
    ),
    "shift": FieldSpec(
        raw_column="班次",
        display_name="班次",
        dtype="str",
        description="当天的营业班次，如早班/中班/晚班",
    ),
    "cashier": FieldSpec(
        raw_column="收银员",
        display_name="收银员",
        dtype="str",
        description="当班收银员姓名或工号",
    ),
    "trans_type": FieldSpec(
        raw_column="交易类型",
        display_name="交易类型",
        dtype="str",
        description="交易的分类，如销售/退款/备用金存取等",
    ),
    "amount": FieldSpec(
        raw_column="金额",
        display_name="金额(元)",
        dtype="float",
        description="交易金额，正数表示收入，负数表示支出",
    ),
    "payment_method": FieldSpec(
        raw_column="支付方式",
        display_name="支付方式",
        dtype="str",
        description="顾客付款方式，如现金/微信/支付宝/银行卡等",
    ),
    "trans_id": FieldSpec(
        raw_column="流水号",
        display_name="流水号",
        dtype="str",
        description="收银系统生成的唯一交易流水号",
    ),
    "signed": FieldSpec(
        raw_column="是否签字确认",
        display_name="是否签字确认",
        dtype="str",
        description="退款等操作是否已由值班经理签字确认，是/否",
    ),
    "petty_cash_type": FieldSpec(
        raw_column="备用金类型",
        display_name="备用金类型",
        dtype="str",
        description="备用金操作的细分，如交接/找零/零钞兑换等",
    ),
}

FILTER_SPECS: list[FilterSpec] = [
    FilterSpec(
        key="date_range",
        label="交易日期范围",
        field="trans_date",
        filter_type="date_range",
        default=None,
    ),
    FilterSpec(
        key="store_codes",
        label="门店编号",
        field="store_code",
        filter_type="multi_select",
        default=None,
    ),
    FilterSpec(
        key="shifts",
        label="班次",
        field="shift",
        filter_type="multi_select",
        default=None,
    ),
    FilterSpec(
        key="cashiers",
        label="收银员",
        field="cashier",
        filter_type="multi_select",
        default=None,
    ),
    FilterSpec(
        key="trans_types",
        label="交易类型",
        field="trans_type",
        filter_type="multi_select",
        default=None,
    ),
    FilterSpec(
        key="payment_methods",
        label="支付方式",
        field="payment_method",
        filter_type="multi_select",
        default=None,
    ),
]

AUDIT_SPECS: list[AuditSpec] = [
    AuditSpec(
        key="refund_no_sign",
        label="退款漏签",
        description="退款交易未由值班经理签字确认",
        severity="high",
    ),
    AuditSpec(
        key="petty_cash_shift_mismatch",
        label="备用金错班",
        description="备用金交接记录的班次与实际当班班次不一致",
        severity="medium",
    ),
    AuditSpec(
        key="duplicate_trans",
        label="流水重复",
        description="同一流水号出现多次，或同一门店同一班次同一金额同一时间的重复交易",
        severity="high",
    ),
]

SETTINGS = Settings()
