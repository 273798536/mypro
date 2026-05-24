import click
import requests
import json
from datetime import datetime, timedelta
import random
import uuid
import subprocess
import time

API_BASE = "http://localhost:8000/api/v1"


@click.group()
def cli():
    """家电安装回访验收回放链路服务 - 命令行工具"""
    pass


@cli.command()
@click.option("--port", default=8000, help="服务端口")
@click.option("--reload", is_flag=True, help="热重载模式")
def start(port, reload):
    """启动API服务"""
    click.echo(f"启动服务于端口 {port}...")
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
    )


def _generate_appointment_data(appointment_no, is_rescheduled=False, is_second_visit=False, original_no=None, parent_no=None):
    base_time = datetime.now() - timedelta(days=random.randint(1, 30))

    appliance_types = ["空调", "冰箱", "洗衣机", "电视", "热水器", "油烟机"]
    service_types = ["新安装", "维修", "保养", "拆机"]
    technician_names = ["张师傅", "李师傅", "王师傅", "赵师傅", "刘师傅"]
    districts = ["朝阳区", "海淀区", "东城区", "西城区", "丰台区", "通州区"]

    data = {
        "appointment_no": appointment_no,
        "order_no": f"ORD{appointment_no[3:]}",
        "user_name": f"用户{random.randint(1000, 9999)}",
        "user_phone": f"138{random.randint(10000000, 99999999)}",
        "address": f"北京市{random.choice(districts)}{random.randint(1, 20)}号院{random.randint(1, 10)}号楼{random.randint(101, 999)}室",
        "appliance_type": random.choice(appliance_types),
        "appliance_model": f"型号-{random.randint(100, 999)}",
        "service_type": random.choice(service_types),
        "scheduled_time": base_time.isoformat(),
        "actual_time": (base_time + timedelta(hours=2)).isoformat(),
        "technician_id": f"T{random.randint(1000, 9999)}",
        "technician_name": random.choice(technician_names),
        "status": "completed",
        "is_rescheduled": is_rescheduled,
        "original_appointment_no": original_no,
        "is_second_visit": is_second_visit,
        "parent_appointment_no": parent_no,
    }
    return data


def _generate_location_data(appointment_no, count=3):
    locations = []
    base_time = datetime.now() - timedelta(days=random.randint(1, 30))

    for i in range(count):
        locations.append({
            "appointment_no": appointment_no,
            "technician_id": f"T{random.randint(1000, 9999)}",
            "latitude": 39.9 + random.uniform(-0.1, 0.1),
            "longitude": 116.4 + random.uniform(-0.1, 0.1),
            "location_time": (base_time + timedelta(minutes=i * 30)).isoformat(),
            "location_type": "arrival" if i == count - 1 else "moving",
            "accuracy": random.uniform(5, 20),
        })
    return locations


def _generate_review_data(appointment_no, is_negative=False):
    base_time = datetime.now() - timedelta(days=random.randint(1, 30))

    negative_reasons = ["安装不规范", "师傅迟到", "态度不好", "损坏物品", "收费不合理"]

    data = {
        "appointment_no": appointment_no,
        "review_no": f"REV{appointment_no[3:]}",
        "rating": random.randint(1, 3) if is_negative else random.randint(4, 5),
        "is_negative": is_negative,
        "negative_reason": random.choice(negative_reasons) if is_negative else None,
        "negative_reason_detail": "用户反馈服务质量不符合预期" if is_negative else None,
        "review_content": "服务质量不错，师傅很专业" if not is_negative else "服务体验较差",
        "reviewer_name": f"用户{random.randint(1000, 9999)}",
        "review_time": (base_time + timedelta(days=1)).isoformat(),
    }
    return data


def _generate_photo_data(appointment_no, is_abnormal=True):
    base_time = datetime.now() - timedelta(days=random.randint(1, 30))
    photo_types = ["安装现场", "损坏部位", "异常情况", "完工照片"]

    return {
        "appointment_no": appointment_no,
        "photo_no": f"PHO{appointment_no[3:]}",
        "photo_type": random.choice(photo_types),
        "photo_url": f"http://example.com/photos/{appointment_no}.jpg",
        "upload_time": (base_time + timedelta(hours=1)).isoformat(),
        "uploader": f"师傅{random.randint(1, 100)}",
        "description": "现场照片" if not is_abnormal else "发现异常情况",
        "is_abnormal": is_abnormal,
    }


@cli.command()
@click.option("--count", default=5, help="生成预约单数量")
@click.option("--with-rescheduled", is_flag=True, help="包含改约数据")
@click.option("--with-second-visit", is_flag=True, help="包含二次上门数据")
@click.option("--with-negative", is_flag=True, help="包含差评数据")
@click.option("--operator", default="cli_user", help="操作人")
@click.option("--batch-no", help="批次号")
def mock_data(count, with_rescheduled, with_second_visit, with_negative, operator, batch_no):
    """生成模拟测试数据"""
    if not batch_no:
        batch_no = f"BATCH{datetime.now().strftime('%Y%m%d%H%M%S')}"

    appointments = []
    locations = []
    reviews = []
    photos = []

    for i in range(count):
        appointment_no = f"APT{random.randint(100000, 999999)}"

        appt = _generate_appointment_data(appointment_no)
        appointments.append(appt)

        locations.extend(_generate_location_data(appointment_no, count=random.randint(2, 5)))

        has_negative = with_negative and random.random() < 0.3
        review = _generate_review_data(appointment_no, is_negative=has_negative)
        reviews.append(review)

        if has_negative or random.random() < 0.5:
            photo = _generate_photo_data(appointment_no, is_abnormal=has_negative)
            photos.append(photo)

    if with_rescheduled:
        for i in range(max(1, count // 3)):
            original_no = appointments[i]["appointment_no"]
            rescheduled_no = f"APT{random.randint(100000, 999999)}"
            appt = _generate_appointment_data(
                rescheduled_no,
                is_rescheduled=True,
                original_no=original_no
            )
            appointments.append(appt)
            locations.extend(_generate_location_data(rescheduled_no, count=2))

    if with_second_visit:
        for i in range(max(1, count // 4)):
            parent_idx = random.randint(0, len(appointments) - 1)
            parent_no = appointments[parent_idx]["appointment_no"]
            second_no = f"APT{random.randint(100000, 999999)}"
            appt = _generate_appointment_data(
                second_no,
                is_second_visit=True,
                parent_no=parent_no
            )
            appointments.append(appt)
            locations.extend(_generate_location_data(second_no, count=2))

    payload = {
        "batch_no": batch_no,
        "source": "cli_mock",
        "operator": operator,
        "duplicate_strategy": "append",
        "remark": "CLI生成的模拟数据",
        "appointments": appointments,
        "locations": locations,
        "reviews": reviews,
        "photos": photos,
    }

    try:
        response = requests.post(f"{API_BASE}/batch/submit", json=payload)
        response.raise_for_status()
        result = response.json()

        click.echo(f"批次号: {result['batch_no']}")
        click.echo(f"状态: {result['status']}")
        click.echo(f"总数: {result['total_count']}")
        click.echo(f"成功: {result['success_count']}")
        click.echo(f"失败: {result['fail_count']}")
        click.echo(f"忽略: {result['ignored_count']}")
        click.echo(f"覆盖: {result['overwritten_count']}")
        click.echo(f"追加: {result['appended_count']}")

        if result.get('failed_items'):
            click.echo(f"\n失败项: {json.dumps(result['failed_items'], indent=2, ensure_ascii=False)}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
@click.option("--start-date", help="开始日期 (YYYY-MM-DD)")
@click.option("--end-date", help="结束日期 (YYYY-MM-DD)")
@click.option("--operator", default="cli_user", help="操作人")
def reconcile(start_date, end_date, operator):
    """执行数据对账"""
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")

    payload = {
        "start_time": f"{start_date}T00:00:00",
        "end_time": f"{end_date}T23:59:59",
        "operator": operator,
    }

    try:
        response = requests.post(f"{API_BASE}/reconcile", json=payload)
        response.raise_for_status()
        result = response.json()

        click.echo("=" * 50)
        click.echo("对账结果")
        click.echo("=" * 50)
        click.echo(f"预约单总数: {result['total_appointments']}")
        click.echo(f"评价总数: {result['total_reviews']}")
        click.echo(f"照片总数: {result['total_photos']}")
        click.echo(f"投诉单总数: {result['total_complaints']}")
        click.echo(f"已合并投诉: {result['merged_complaints']}")
        click.echo(f"未合并投诉: {result['unmerged_complaints']}")
        click.echo(f"差评有证据: {result['negative_reviews_with_evidence']}")
        click.echo(f"差评无证据: {result['negative_reviews_without_evidence']}")

        if result.get('issues'):
            click.echo("\n" + "=" * 50)
            click.echo(f"发现问题 ({len(result['issues'])} 项):")
            click.echo("=" * 50)
            for i, issue in enumerate(result['issues'], 1):
                click.echo(f"\n{i}. {issue['type']}")
                click.echo(f"   {issue['description']}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
@click.option("--task-type", type=click.Choice(['complaints', 'appointments', 'reviews', 'audit_logs', 'full_chain']), default="full_chain", help="导出类型")
@click.option("--operator", default="cli_user", help="操作人")
@click.option("--freeze", is_flag=True, help="导出前冻结数据")
def export(task_type, operator, freeze):
    """导出数据"""
    payload = {
        "task_type": task_type,
        "operator": operator,
        "freeze_before_export": freeze,
    }

    try:
        response = requests.post(f"{API_BASE}/export", json=payload)
        response.raise_for_status()
        result = response.json()

        click.echo(f"任务号: {result['task_no']}")
        click.echo(f"状态: {result['status']}")
        click.echo(f"文件名: {result.get('file_name', 'N/A')}")
        click.echo(f"记录数: {result['record_count']}")
        click.echo(f"是否冻结: {'是' if result['is_frozen'] else '否'}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
@click.option("--entity-type", help="实体类型过滤")
@click.option("--entity-id", help="实体ID过滤")
@click.option("--operator", help="操作人过滤")
@click.option("--operation", help="操作类型过滤")
@click.option("--limit", default=20, help="显示条数")
def audit_logs(entity_type, entity_id, operator, operation, limit):
    """查询操作审计日志"""
    params = {}
    if entity_type:
        params['entity_type'] = entity_type
    if entity_id:
        params['entity_id'] = entity_id
    if operator:
        params['operator'] = operator
    if operation:
        params['operation_type'] = operation

    try:
        response = requests.get(f"{API_BASE}/audit-logs", params=params)
        response.raise_for_status()
        result = response.json()

        logs = result['logs'][:limit]

        click.echo(f"共 {result['total']} 条记录，显示前 {len(logs)} 条:")
        click.echo("=" * 100)

        for log in logs:
            click.echo(f"\n[{log['operation_time']}] {log['operation_type']}")
            click.echo(f"  实体: {log['entity_type']} / {log['entity_id']}")
            click.echo(f"  操作人: {log['operator']}")
            if log.get('change_reason'):
                click.echo(f"  原因: {log['change_reason']}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
@click.option("--appointment-no", required=True, help="预约单号")
@click.option("--complaint-no", help="投诉单号")
@click.option("--operator", default="cli_user", help="操作人")
def create_complaint(appointment_no, complaint_no, operator):
    """创建投诉单（自动合并链路）"""
    if not complaint_no:
        complaint_no = f"CMP{datetime.now().strftime('%Y%m%d%H%M%S')}"

    payload = {
        "complaint_no": complaint_no,
        "appointment_no": appointment_no,
        "complaint_type": "service_quality",
        "complaint_reason": "用户投诉服务质量",
    }

    try:
        response = requests.post(
            f"{API_BASE}/complaint/create",
            params={"operator": operator},
            json=payload
        )
        response.raise_for_status()
        result = response.json()

        click.echo(f"投诉单号: {result['complaint_no']}")
        click.echo(f"预约单号: {result['appointment_no']}")
        click.echo(f"是否合并: {'是' if result['is_merged'] else '否'}")
        if result.get('merged_from'):
            click.echo(f"合并预约单: {', '.join(result['merged_from'])}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
@click.option("--review-no", required=True, help="评价单号")
def verify_evidence(review_no):
    """验证差评证据链"""
    try:
        response = requests.get(f"{API_BASE}/complaint/review/{review_no}/verify-evidence")
        response.raise_for_status()
        result = response.json()

        click.echo(f"评价单号: {result['review_no']}")
        click.echo(f"证据充足: {'是' if result['has_sufficient_evidence'] else '否'}")
        if result.get('missing_evidence'):
            click.echo(f"缺失证据: {', '.join(result['missing_evidence'])}")
        click.echo(f"证据统计: {json.dumps(result['evidence_summary'], ensure_ascii=False)}")

    except requests.exceptions.RequestException as e:
        click.echo(f"请求失败: {e}", err=True)
        return 1

    return 0


@cli.command()
def acceptance_test():
    """运行验收测试流程"""
    click.echo("=" * 60)
    click.echo("开始验收测试流程")
    click.echo("=" * 60)

    batch_no = f"BATCHTEST{datetime.now().strftime('%Y%m%d%H%M%S')}"

    click.echo("\n[步骤1] 生成正常链路数据...")
    result = subprocess.run([
        "python3", "cli.py", "mock-data",
        "--count", "3",
        "--with-negative",
        "--batch-no", batch_no,
    ], capture_output=True, text=True)
    click.echo(result.stdout)
    if result.returncode != 0:
        click.echo(f"失败: {result.stderr}", err=True)
        return 1

    click.echo("\n[步骤2] 测试重复提交（忽略策略）...")
    result = subprocess.run([
        "python3", "cli.py", "mock-data",
        "--count", "1",
        "--batch-no", batch_no + "_dup",
    ], capture_output=True, text=True)
    click.echo(result.stdout)

    click.echo("\n[步骤3] 执行对账...")
    result = subprocess.run([
        "python3", "cli.py", "reconcile",
    ], capture_output=True, text=True)
    click.echo(result.stdout)

    click.echo("\n[步骤4] 查看审计日志...")
    result = subprocess.run([
        "python3", "cli.py", "audit-logs",
        "--limit", "5",
    ], capture_output=True, text=True)
    click.echo(result.stdout)

    click.echo("\n[步骤5] 导出完整链路数据...")
    result = subprocess.run([
        "python3", "cli.py", "export",
        "--task-type", "full_chain",
    ], capture_output=True, text=True)
    click.echo(result.stdout)

    click.echo("\n" + "=" * 60)
    click.echo("验收测试完成")
    click.echo("=" * 60)

    return 0


if __name__ == "__main__":
    cli()
