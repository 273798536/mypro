from datetime import datetime, timedelta


def generate_test_schedules(branch_id: str = "B001"):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    schedules = []

    for day_offset in range(7):
        schedule_date = today + timedelta(days=day_offset)
        weekday = schedule_date.weekday()

        if weekday < 5:
            schedules.append(
                {
                    "branch_id": branch_id,
                    "branch_name": "朝阳支行",
                    "teller_id": "T001",
                    "teller_name": "张三",
                    "schedule_date": schedule_date,
                    "shift_type": "on_duty",
                    "window_number": "W01",
                    "is_training": False,
                    "lunch_start": schedule_date.replace(hour=12, minute=0),
                    "lunch_end": schedule_date.replace(hour=13, minute=0),
                }
            )

            schedules.append(
                {
                    "branch_id": branch_id,
                    "branch_name": "朝阳支行",
                    "teller_id": "T002",
                    "teller_name": "李四",
                    "schedule_date": schedule_date,
                    "shift_type": "on_duty",
                    "window_number": "W02",
                    "is_training": day_offset == 2,
                    "training_type": "外出培训" if day_offset == 2 else None,
                    "lunch_start": schedule_date.replace(hour=12, minute=0)
                    if day_offset != 2
                    else None,
                    "lunch_end": schedule_date.replace(hour=13, minute=0)
                    if day_offset != 2
                    else None,
                }
            )

            schedules.append(
                {
                    "branch_id": branch_id,
                    "branch_name": "朝阳支行",
                    "teller_id": "T003",
                    "teller_name": "王五",
                    "schedule_date": schedule_date,
                    "shift_type": "on_duty",
                    "window_number": "W03",
                    "is_training": False,
                    "lunch_start": schedule_date.replace(hour=11, minute=30),
                    "lunch_end": schedule_date.replace(hour=12, minute=30),
                }
            )

    return schedules


def generate_test_leaves(branch_id: str = "B001"):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return [
        {
            "branch_id": branch_id,
            "teller_id": "T001",
            "teller_name": "张三",
            "leave_type": "年假",
            "start_date": today + timedelta(days=5),
            "end_date": today + timedelta(days=6),
            "leave_days": 2.0,
            "status": "approved",
            "approver": "主管A",
        }
    ]


def generate_test_forecasts(branch_id: str = "B001"):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    forecasts = []

    for day_offset in range(7):
        forecast_date = today + timedelta(days=day_offset)
        forecasts.append(
            {
                "branch_id": branch_id,
                "forecast_date": forecast_date,
                "forecast_window": "全天",
                "expected_customers": 150 + day_offset * 20,
                "expected_transactions": 300 + day_offset * 40,
                "service_level": "标准",
            }
        )

    return forecasts


def generate_test_refunds(branch_id: str = "B001"):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    refunds = []

    for day_offset in range(3):
        refund_date = today + timedelta(days=day_offset)
        for i in range(6):
            refunds.append(
                {
                    "branch_id": branch_id,
                    "transaction_id": f"TXN-{day_offset}-{i}",
                    "refund_amount": 2000.0 + i * 500,
                    "refund_date": refund_date.replace(hour=10 + i),
                    "teller_id": f"T00{(i % 3) + 1}",
                    "refund_reason": f"退款原因{i}",
                }
            )

    return refunds


def generate_test_inventories(branch_id: str = "B001"):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    inventories = []

    for day_offset in range(3):
        inventory_date = today + timedelta(days=day_offset)
        inventories.append(
            {
                "branch_id": branch_id,
                "inventory_date": inventory_date,
                "item_type": "空白凭证",
                "expected_quantity": 100,
                "actual_quantity": 95,
                "difference": -5,
                "difference_reason": "盘亏待查",
            }
        )
        inventories.append(
            {
                "branch_id": branch_id,
                "inventory_date": inventory_date,
                "item_type": "重要单证",
                "expected_quantity": 50,
                "actual_quantity": 52,
                "difference": 2,
                "difference_reason": "盘盈待核实",
            }
        )

    return inventories
