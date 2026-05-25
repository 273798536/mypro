#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, Base, engine
from app.services.data_import import DataImportService
from app.services.queue_service import QueueService
from app.models.enums import DataSourceType, FailCategory, QueueStatus

Base.metadata.create_all(bind=engine)

appointment_data = [
    {"预约单号": "APPT001", "订单号": "ORD001", "用户ID": "USER001", "师傅ID": "TECH001", "区域": "华东区", "是否改约": "否", "是否二次上门": "否"},
    {"预约单号": "APPT002", "订单号": "ORD002", "用户ID": "USER002", "师傅ID": "TECH002", "区域": "华东区", "是否改约": "是", "是否二次上门": "否"},
    {"预约单号": "APPT003", "订单号": "ORD003", "用户ID": "USER003", "师傅ID": "TECH003", "区域": "华北区", "是否改约": "否", "是否二次上门": "是"},
    {"预约单号": "APPT004", "订单号": "ORD004", "用户ID": "USER004", "师傅ID": "TECH001", "区域": "华南区", "是否改约": "是", "是否二次上门": "是"},
    {"预约单号": "APPT005", "订单号": "ORD005", "用户ID": "USER005", "师傅ID": "TECH002", "区域": "华东区", "是否改约": "否", "是否二次上门": "否"},
]

technician_location_data = [
    {"预约单号": "APPT001", "师傅ID": "TECH001", "区域": "华东区", "定位地点": "上海浦东新区"},
    {"预约单号": "APPT002", "师傅ID": "TECH002", "区域": "华东区", "定位地点": "杭州西湖区"},
    {"预约单号": "APPT003", "师傅ID": "TECH003", "区域": "华北区", "定位地点": "北京朝阳区"},
    {"预约单号": "APPT004", "师傅ID": "TECH001", "区域": "华南区", "定位地点": "广州天河区"},
    {"预约单号": "APPT005", "师傅ID": "TECH002", "区域": "华东区", "定位地点": "南京鼓楼区"},
]

user_review_data = [
    {"预约单号": "APPT001", "订单号": "ORD001", "用户ID": "USER001", "评价类型": "好评", "差评原因": ""},
    {"预约单号": "APPT002", "订单号": "ORD002", "用户ID": "USER002", "评价类型": "差评", "差评原因": "改约未提前通知"},
    {"预约单号": "APPT003", "订单号": "ORD003", "用户ID": "USER003", "评价类型": "差评", "差评原因": "二次上门收费不合理"},
    {"预约单号": "APPT004", "订单号": "ORD004", "用户ID": "USER004", "评价类型": "差评", "差评原因": "改约后师傅迟到"},
    {"预约单号": "APPT005", "订单号": "ORD005", "用户ID": "USER005", "评价类型": "中评", "差评原因": ""},
]

refund_flow_data = [
    {"订单号": "ORD002", "预约单号": "APPT002", "用户ID": "USER002", "退款金额": 50, "退款原因": "改约补偿"},
    {"订单号": "ORD003", "预约单号": "APPT003", "用户ID": "USER003", "退款金额": 100, "退款原因": "二次上门补偿"},
    {"订单号": "ORD004", "预约单号": "APPT004", "用户ID": "USER004", "退款金额": 80, "退款原因": "服务不满意"},
]


def load_sample_data():
    db = SessionLocal()
    try:
        import_service = DataImportService(db)

        print("导入预约单数据...")
        result = import_service.import_from_data(
            appointment_data,
            DataSourceType.APPOINTMENT,
            "sample_appointments",
            "system",
        )
        print(f"  成功: {result.success_rows}, 失败: {result.failed_rows}")

        print("导入师傅定位数据...")
        result = import_service.import_from_data(
            technician_location_data,
            DataSourceType.TECHNICIAN_LOCATION,
            "sample_technician_locations",
            "system",
        )
        print(f"  成功: {result.success_rows}, 失败: {result.failed_rows}")

        print("导入用户评价数据...")
        result = import_service.import_from_data(
            user_review_data,
            DataSourceType.USER_REVIEW,
            "sample_user_reviews",
            "system",
        )
        print(f"  成功: {result.success_rows}, 失败: {result.failed_rows}")

        print("导入退款流水数据...")
        result = import_service.import_from_data(
            refund_flow_data,
            DataSourceType.REFUND_FLOW,
            "sample_refund_flows",
            "system",
        )
        print(f"  成功: {result.success_rows}, 失败: {result.failed_rows}")

        print("\n从原始数据构建补偿队列...")
        queue_service = QueueService(db)
        for appt_no in ["APPT001", "APPT002", "APPT003", "APPT004", "APPT005"]:
            item = queue_service.build_queue_from_raw_data(appt_no, "system")
            print(f"  {appt_no}: 改约={item.is_rescheduled}, 二次上门={item.is_second_visit}, 差评={item.has_negative_review}")

        print("\n模拟主流程处理...")
        simulate_workflow(db, queue_service)

        print("\n样例数据加载完成!")
    finally:
        db.close()


def simulate_workflow(db: Session, queue_service: QueueService):
    item = queue_service.get_queue_item_by_key("appt_APPT002")
    if item:
        print(f"\n处理 APPT002 (改约差评):")
        queue_service.submit_receipt(item.id, {"回执编号": "RCPT002", "回访结果": "用户同意补偿"}, "operator1")
        print(f"  提交回执 -> {item.status.value}")

        queue_service.start_compensation(item.id, 50, "改约未提前通知补偿", "operator1")
        print(f"  开始补偿 -> {item.status.value}, 金额={item.compensation_amount}")

        queue_service.complete_compensation(item.id, "finance_user")
        print(f"  完成补偿 -> {item.status.value}")

    item2 = queue_service.get_queue_item_by_key("appt_APPT003")
    if item2:
        print(f"\n处理 APPT003 (二次上门差评):")
        queue_service.submit_receipt(item2.id, {"回执编号": "RCPT003", "回访结果": "需要人工确认"}, "operator1")
        print(f"  提交回执 -> {item2.status.value}")

        queue_service.manual_takeover(item2.id, "supervisor1", "用户对二次上门有异议")
        print(f"  人工接管 -> {item2.status.value}, 接管人={item2.manual_taken_by}")

    item3 = queue_service.get_queue_item_by_key("appt_APPT004")
    if item3:
        print(f"\n模拟 APPT004 重试场景:")
        queue_service.submit_receipt(item3.id, {"回执编号": "RCPT004"}, "operator1")
        print(f"  提交回执 -> {item3.status.value}")

        queue_service.mark_failed(item3.id, "网络超时", FailCategory.RETRYABLE, "system")
        print(f"  第1次失败 -> {item3.status.value}, 重试次数={item3.retry_count}")

        queue_service.retry_item(item3.id, "system")
        print(f"  手动重试 -> {item3.status.value}")

        queue_service.mark_failed(item3.id, "第三方接口限流", FailCategory.RETRYABLE, "system")
        print(f"  第2次失败 -> {item3.status.value}, 重试次数={item3.retry_count}")

    item5 = queue_service.get_queue_item_by_key("appt_APPT005")
    if item5:
        print(f"\n处理 APPT005 (无问题关闭):")
        queue_service.close_queue_item(item5.id, "回访无异常，无需补偿", "operator1")
        print(f"  关闭队列 -> {item5.status.value}, 原因={item5.close_reason}")


if __name__ == "__main__":
    load_sample_data()
