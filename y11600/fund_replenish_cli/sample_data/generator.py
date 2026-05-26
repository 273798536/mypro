import csv
from pathlib import Path
from datetime import date, datetime, timedelta


def generate_all_samples(output_dir: str):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    generate_bank_returns(output_path)
    generate_customer_plans(output_path)
    generate_failure_reasons(output_path)
    generate_replenish_windows(output_path)
    generate_manual_remarks(output_path)
    generate_holidays(output_path)


def generate_bank_returns(output_path: Path):
    filepath = output_path / "bank_returns.csv"
    today = date.today()
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "serial_no", "customer_id", "customer_name", "plan_id",
            "deduct_date", "return_date", "amount", "return_code", "return_msg"
        ])
        writer.writerow([
            "BR202605200001", "C001", "张三", "P001",
            (today - timedelta(days=5)).isoformat(), today.isoformat(),
            "1000.00", "BAL001", "账户余额不足"
        ])
        writer.writerow([
            "BR202605200002", "C002", "李四", "P002",
            (today - timedelta(days=5)).isoformat(), today.isoformat(),
            "2000.00", "BAL001", "账户余额不足"
        ])
        writer.writerow([
            "BR202605200003", "C001", "张三", "P001",
            (today - timedelta(days=5)).isoformat(), today.isoformat(),
            "1000.00", "BAL001", "账户余额不足"
        ])


def generate_customer_plans(output_path: Path):
    filepath = output_path / "customer_plans.csv"
    today = date.today()
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "plan_id", "customer_id", "customer_name", "fund_code", "fund_name",
            "monthly_amount", "deduct_day", "start_date", "end_date", "status"
        ])
        writer.writerow([
            "P001", "C001", "张三", "F001", "易方达蓝筹精选混合",
            "1000.00", "15", "2025-01-01", "", "正常"
        ])
        writer.writerow([
            "P002", "C002", "李四", "F002", "华夏成长混合",
            "2000.00", "20", "2025-03-01", "", "暂停"
        ])


def generate_failure_reasons(output_path: Path):
    filepath = output_path / "failure_reasons.csv"
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "reason_code", "reason_name", "category", "allow_replenish", "max_attempts", "description"
        ])
        writer.writerow([
            "BAL001", "账户余额不足", "余额", "true", "3", "客户账户余额不足以支付定投金额"
        ])
        writer.writerow([
            "ACC001", "账户已销户", "账户", "false", "0", "客户银行账户已销户，无法继续扣款"
        ])
        writer.writerow([
            "ACC002", "账户冻结", "账户", "false", "0", "客户银行账户被冻结"
        ])
        writer.writerow([
            "SYS001", "系统超时", "系统", "true", "3", "银行系统处理超时，需重试"
        ])
        writer.writerow([
            "LIM001", "超出交易限额", "其他", "true", "2", "超出客户设置的交易限额"
        ])


def generate_replenish_windows(output_path: Path):
    filepath = output_path / "replenish_windows.csv"
    today = date.today()
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "window_id", "plan_id", "original_deduct_date",
            "window_start", "window_end", "attempts_made", "last_attempt_date"
        ])
        writer.writerow([
            "W001", "P001", (today - timedelta(days=5)).isoformat(),
            today.isoformat(), (today + timedelta(days=10)).isoformat(),
            "0", ""
        ])
        writer.writerow([
            "W002", "P002", (today - timedelta(days=5)).isoformat(),
            today.isoformat(), (today + timedelta(days=10)).isoformat(),
            "1", (today - timedelta(days=2)).isoformat()
        ])


def generate_manual_remarks(output_path: Path):
    filepath = output_path / "manual_remarks.csv"
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "remark_id", "related_serial_no", "operator", "remark_time", "content", "action"
        ])
        writer.writerow([
            "R001", "BR202605200002", "运营小王",
            datetime.now().isoformat(), "客户来电说明已充值，同意补扣", "同意补扣"
        ])


def generate_holidays(output_path: Path):
    import json
    filepath = output_path / "holidays.json"
    today = date.today()
    holidays = []
    for i in range(365):
        d = today + timedelta(days=i)
        if d.weekday() >= 5:
            holidays.append(d.isoformat())
    holidays.append((today + timedelta(days=3)).isoformat())

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump({"holidays": holidays}, f, ensure_ascii=False, indent=2)
