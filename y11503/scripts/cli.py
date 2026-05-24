#!/usr/bin/env python3
"""
命令行工具 - 用于发送HTTP请求和回放操作
"""
import sys
sys.path.insert(0, '.')

import click
import httpx
import json
import os
from pathlib import Path
from datetime import datetime
import time

BASE_URL = "http://localhost:8000/api/v1"

def get_client():
    return httpx.Client(timeout=30.0)

@click.group()
def cli():
    """售后备件领用验收回放链路 CLI 工具"""
    pass

@cli.command()
@click.argument("data_file", type=click.Path(exists=True))
@click.option("--url", default=BASE_URL, help="API地址")
def create(data_file, url):
    """从JSON文件创建批次"""
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with get_client() as client:
        response = client.post(f"{url}/batches", json=data)
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.argument("batch_no")
@click.option("--url", default=BASE_URL, help="API地址")
def get(batch_no, url):
    """获取批次详情"""
    with get_client() as client:
        response = client.get(f"{url}/batches/{batch_no}")
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.option("--status", help="按状态筛选")
@click.option("--limit", default=100, help="返回数量")
@click.option("--url", default=BASE_URL, help="API地址")
def list(status, limit, url):
    """列出批次"""
    params = {"limit": limit}
    if status:
        params["status"] = status

    with get_client() as client:
        response = client.get(f"{url}/batches", params=params)
        click.echo(f"状态码: {response.status_code}")
        result = response.json()
        click.echo(f"总数: {result['total']}")
        for item in result['items']:
            click.echo(f"  {item['batch_no']} - {item['status']} - {item['operator']}")

@cli.command()
@click.argument("batch_no")
@click.option("--operator", required=True, help="操作员")
@click.option("--remark", help="备注")
@click.option("--url", default=BASE_URL, help="API地址")
def submit(batch_no, operator, remark, url):
    """提交批次"""
    data = {"operator": operator, "remark": remark or ""}
    with get_client() as client:
        response = client.post(f"{url}/batches/{batch_no}/submit", json=data)
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.argument("batch_no")
@click.option("--operator", required=True, help="操作员")
@click.option("--reason", required=True, help="撤回原因")
@click.option("--url", default=BASE_URL, help="API地址")
def withdraw(batch_no, operator, reason, url):
    """撤回批次"""
    data = {"operator": operator, "reason": reason}
    with get_client() as client:
        response = client.post(f"{url}/batches/{batch_no}/withdraw", json=data)
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.argument("batch_no")
@click.option("--operator", required=True, help="操作员")
@click.option("--reason", required=True, help="冻结原因")
@click.option("--url", default=BASE_URL, help="API地址")
def freeze(batch_no, operator, reason, url):
    """冻结批次"""
    data = {"operator": operator, "reason": reason}
    with get_client() as client:
        response = client.post(f"{url}/batches/{batch_no}/freeze", json=data)
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.argument("batch_no")
@click.option("--operator", required=True, help="操作员")
@click.option("--approved/--rejected", default=True, help="通过或驳回")
@click.option("--reason", required=True, help="改判原因")
@click.option("--url", default=BASE_URL, help="API地址")
def judge(batch_no, operator, approved, reason, url):
    """人工改判批次"""
    data = {"operator": operator, "approved": approved, "reason": reason}
    with get_client() as client:
        response = client.post(f"{url}/batches/{batch_no}/judge", json=data)
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.argument("batch_no")
@click.option("--url", default=BASE_URL, help="API地址")
def logs(batch_no, url):
    """查看批次操作日志"""
    with get_client() as client:
        response = client.get(f"{url}/batches/{batch_no}/logs")
        click.echo(f"状态码: {response.status_code}")
        logs = response.json()
        for log in logs:
            click.echo(f"[{log['created_at']}] {log['operation']} - {log['operator']}")
            if log['old_status'] or log['new_status']:
                click.echo(f"  状态: {log['old_status'] or '-'} -> {log['new_status'] or '-'}")
            if log['remark']:
                click.echo(f"  备注: {log['remark']}")

@cli.command()
@click.argument("batch_no")
@click.option("--output", "-o", help="输出目录")
@click.option("--url", default=BASE_URL, help="API地址")
def export(batch_no, output, url):
    """导出批次为Excel"""
    with get_client() as client:
        response = client.post(f"{url}/batches/{batch_no}/export")
        if response.status_code == 200:
            filename = response.headers.get('content-disposition', '').split('filename=')[-1].strip('"')
            if not filename:
                filename = f"{batch_no}_export.xlsx"

            output_path = Path(output) / filename if output else filename
            with open(output_path, 'wb') as f:
                f.write(response.content)
            click.echo(f"导出成功: {output_path}")
        else:
            click.echo(f"状态码: {response.status_code}")
            click.echo(response.text)

@cli.command()
@click.option("--url", default=BASE_URL, help="API地址")
def reconcile(url):
    """对账统计"""
    with get_client() as client:
        response = client.get(f"{url}/reconcile")
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.option("--count", default=3, help="回放步骤数量")
@click.option("--url", default=BASE_URL, help="API地址")
@click.option("--wait", default=1, help="步骤间等待秒数")
def replay(count, url, wait):
    """回放完整流程 - 创建->提交->撤回->再提交->冻结->导出"""
    click.echo("=== 开始回放完整流程 ===")

    from scripts.generate_data import generate_batch_data, generate_invalid_batch_data

    batch_no = f"REPLAY{datetime.now().strftime('%Y%m%d%H%M%S')}"

    click.echo(f"\n[1/6] 创建批次: {batch_no}")
    data = generate_invalid_batch_data()
    data["batch_no"] = batch_no
    data["idempotency_key"] = f"IDEMP_{batch_no}"

    with get_client() as client:
        resp = client.post(f"{url}/batches", json=data)
        click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")
    time.sleep(wait)

    click.echo(f"\n[2/6] 提交批次 (预期部分失败)")
    resp = client.post(f"{url}/batches/{batch_no}/submit", json={"operator": "测试员", "remark": "首次提交"})
    click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")
    click.echo(f"  错误: {resp.json().get('error_message', '无')}")
    time.sleep(wait)

    click.echo(f"\n[3/6] 撤回批次")
    resp = client.post(f"{url}/batches/{batch_no}/withdraw", json={"operator": "审核员", "reason": "数据需要修正"})
    click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")
    time.sleep(wait)

    click.echo(f"\n[4/6] 重新提交批次")
    resp = client.post(f"{url}/batches/{batch_no}/submit", json={"operator": "测试员", "remark": "修正后重新提交"})
    click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")
    time.sleep(wait)

    click.echo(f"\n[5/6] 人工改判通过")
    resp = client.post(f"{url}/batches/{batch_no}/judge", json={"operator": "服务经理", "approved": True, "reason": "情况属实，予以通过"})
    click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")
    time.sleep(wait)

    click.echo(f"\n[6/6] 冻结批次 (准备导出)")
    resp = client.post(f"{url}/batches/{batch_no}/freeze", json={"operator": "服务经理", "reason": "对账完成，冻结导出"})
    click.echo(f"  状态: {resp.status_code} - {resp.json()['status']}")

    click.echo("\n=== 回放完成 ===")
    click.echo(f"批次号: {batch_no}")
    click.echo(f"查看详情: python scripts/cli.py get {batch_no}")
    click.echo(f"查看日志: python scripts/cli.py logs {batch_no}")

@cli.command()
@click.option("--key", help="幂等键")
@click.option("--url", default=BASE_URL, help="API地址")
def idempotency(key, url):
    """检查幂等键"""
    with get_client() as client:
        response = client.get(f"{url}/idempotency/{key}")
        click.echo(f"状态码: {response.status_code}")
        click.echo(json.dumps(response.json(), ensure_ascii=False, indent=2))

@cli.command()
@click.option("--times", default=3, help="重复提交次数")
@click.option("--strategy", default="ignore", type=click.Choice(['ignore', 'overwrite', 'append']))
@click.option("--url", default=BASE_URL, help="API地址")
def test_idempotency(times, strategy, url):
    """测试幂等性 - 重复提交相同数据"""
    from scripts.generate_data import generate_batch_data

    batch_no = f"IDEMPOTEST{datetime.now().strftime('%Y%m%d%H%M%S')}"
    data = generate_batch_data(batch_no=batch_no)
    data["duplicate_strategy"] = strategy
    idempotency_key = data["idempotency_key"]

    click.echo(f"批次号: {batch_no}")
    click.echo(f"幂等键: {idempotency_key}")
    click.echo(f"策略: {strategy}")
    click.echo()

    with get_client() as client:
        for i in range(times):
            click.echo(f"第 {i+1} 次提交...")
            resp = client.post(f"{url}/batches", json=data)
            result = resp.json()
            click.echo(f"  状态: {resp.status_code} - 批次状态: {result['status']} - 备件数: {result['total_parts']}")
            time.sleep(0.5)

    click.echo("\n完成！使用以下命令验证:")
    click.echo(f"  python scripts/cli.py get {batch_no}")
    click.echo(f"  python scripts/cli.py idempotency {idempotency_key}")

if __name__ == "__main__":
    cli()
