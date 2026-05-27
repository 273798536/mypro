"""测试跨期退款、分成版本变更等复杂场景"""
import csv
import tempfile
import os
from pathlib import Path


def create_test_data():
    """创建包含复杂场景的测试数据"""
    test_dir = Path(tempfile.mkdtemp(prefix="lrt_test_"))
    print(f"测试目录: {test_dir}")
    
    with open(test_dir / "streamers.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['streamer_id', 'name', 'tax_type', 'status'])
        writer.writerow(['S001', '测试主播1', 'individual', 'active'])
        writer.writerow(['S002', '测试主播2', 'individual', 'active'])
    
    with open(test_dir / "rewards.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['reward_id', 'streamer_id', 'reward_time', 'amount', 'settlement_period', 'is_refunded', 'refund_id'])
        writer.writerow(['R001', 'S001', '2025-04-15 20:00:00', '5000.00', '202504', 'false', ''])
        writer.writerow(['R002', 'S001', '2025-05-10 20:00:00', '3000.00', '202505', 'false', ''])
        writer.writerow(['R003', 'S002', '2025-05-20 20:00:00', '10000.00', '202505', 'false', ''])
    
    with open(test_dir / "platform_shares.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['version_id', 'version_name', 'effective_date', 'expire_date', 'platform_ratio', 'streamer_ratio', 'guild_ratio'])
        writer.writerow(['V1', '旧版分成', '2025-01-01', '2025-04-30', '0.50', '0.45', '0.05'])
        writer.writerow(['V2', '新版分成', '2025-05-01', '', '0.40', '0.55', '0.05'])
    
    with open(test_dir / "refunds.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['refund_id', 'reward_id', 'streamer_id', 'refund_time', 'refund_amount', 'original_settlement_period', 'refund_processed_period', 'is_cross_period'])
        writer.writerow(['REF001', 'R001', 'S001', '2025-05-05 10:00:00', '1000.00', '202504', '202505', 'true'])
    
    with open(test_dir / "tax_rules.csv", 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['rule_id', 'tax_type', 'income_min', 'income_max', 'tax_rate', 'quick_deduction', 'effective_date'])
        writer.writerow(['TAX001', 'individual', '0', '4000', '0.20', '0', '2024-01-01'])
        writer.writerow(['TAX002', 'individual', '4000', '20000', '0.20', '0', '2024-01-01'])
        writer.writerow(['TAX003', 'individual', '20000', '50000', '0.30', '2000', '2024-01-01'])
    
    return test_dir


if __name__ == '__main__':
    test_dir = create_test_data()
    print(f"\n测试命令:")
    print(f"  lrt validate -i {test_dir}")
    print(f"  lrt run -i {test_dir} -o ./test_output")
