#!/usr/bin/env python3
import click
import json
import csv
import sys
from datetime import datetime, timedelta
from tabulate import tabulate

from app.database import SessionLocal, init_db
from app.services import (
    StyleOrderService, FabricService, SizeModificationService,
    ScanService, ReplayService, UserService
)
from app.models import User, RoleEnum, OrderStatus, FabricAction

init_db()


def get_db():
    return SessionLocal()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """服装打版样衣验收回放链路服务 CLI"""
    pass


@cli.command()
@click.option("--count", default=1, help="生成样衣流转单数量")
@click.option("--operator", default="entry_clerk", help="操作人")
@click.option("--with-data", is_flag=True, help="生成关联数据")
def generate(count, operator, with_data):
    """造数：生成测试数据"""
    db = get_db()
    UserService.init_default_users(db)
    
    try:
        for i in range(count):
            suffix = datetime.now().strftime("%Y%m%d%H%M%S")
            order_data = {
                "order_no": f"SO{suffix}{i:03d}",
                "style_code": f"STYLE{(1000 + i):04d}",
                "style_name": f"测试款样衣_{i + 1}",
                "batch_no": f"BATCH{datetime.now().strftime('%Y%m')}"
            }
            order = StyleOrderService.create(db, order_data, operator)
            click.echo(f"创建样衣流转单: {order.order_no} (ID: {order.id})")
            
            if with_data:
                fabric_in = {
                    "fabric_code": f"FAB{i:03d}",
                    "fabric_name": f"面料_{i}",
                    "action": FabricAction.IN,
                    "quantity": 100.0,
                    "warehouse": "主仓库"
                }
                FabricService.add_transaction(db, order.id, fabric_in, operator)
                click.echo(f"  - 添加入库: {fabric_in['fabric_code']} +{fabric_in['quantity']}m")
                
                size_data = {
                    "size_code": "M",
                    "part_name": "衣长",
                    "old_value": 68.0,
                    "new_value": 70.0,
                    "modification_reason": "客户要求加长"
                }
                SizeModificationService.add_modification(db, order.id, size_data, operator)
                click.echo(f"  - 添加尺码修改: {size_data['part_name']} {size_data['old_value']}->{size_data['new_value']}")
        
        db.commit()
        click.secho(f"成功生成 {count} 条测试数据", fg="green")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.secho(f"生成失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--order-id", help="指定样衣单ID对账")
@click.option("--fabric-code", help="指定面料编码")
@click.option("--export", help="导出CSV文件路径")
def reconcile(order_id, fabric_code, export):
    """对账：核对面料库存和数据一致性"""
    from app.models import StyleOrder, FabricTransaction
    
    db = get_db()
    try:
        report_data = []
        query = db.query(StyleOrder)
        if order_id:
            query = query.filter(StyleOrder.id == order_id)
        
        for order in query.all():
            fabric_balance = {}
            for tx in order.fabric_transactions:
                if fabric_code and tx.fabric_code != fabric_code:
                    continue
                if tx.fabric_code not in fabric_balance:
                    fabric_balance[tx.fabric_code] = {"in": 0, "out": 0, "balance": 0}
                if tx.action == FabricAction.IN:
                    fabric_balance[tx.fabric_code]["in"] += tx.quantity
                    fabric_balance[tx.fabric_code]["balance"] += tx.quantity
                else:
                    fabric_balance[tx.fabric_code]["out"] += tx.quantity
                    fabric_balance[tx.fabric_code]["balance"] -= tx.quantity
            
            for fc, data in fabric_balance.items():
                report_data.append([
                    order.id,
                    order.order_no,
                    order.status.value,
                    fc,
                    data["in"],
                    data["out"],
                    data["balance"]
                ])
        
        headers = ["ID", "订单号", "状态", "面料编码", "入库", "出库", "库存"]
        click.echo(tabulate(report_data, headers=headers, tablefmt="grid"))
        
        if export:
            with open(export, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(report_data)
            click.secho(f"导出成功: {export}", fg="green")
        
        sys.exit(0)
    except Exception as e:
        click.secho(f"对账失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--order-id", required=True, help="样衣单ID")
@click.option("--output", help="导出JSON文件路径")
def export(order_id, output):
    """导出：导出完整订单数据"""
    db = get_db()
    try:
        from app.models import StyleOrder
        
        order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not order:
            click.secho("订单不存在", fg="red")
            sys.exit(1)
        
        export_data = {
            "export_time": datetime.now().isoformat(),
            "order": {
                "id": order.id,
                "order_no": order.order_no,
                "style_code": order.style_code,
                "style_name": order.style_name,
                "version": order.version,
                "status": order.status.value,
                "created_by": order.created_by,
                "created_at": order.created_at.isoformat()
            },
            "fabric_transactions": [
                {
                    "fabric_code": tx.fabric_code,
                    "action": tx.action.value,
                    "quantity": tx.quantity,
                    "operator": tx.operator,
                    "time": tx.transaction_time.isoformat()
                }
                for tx in order.fabric_transactions
            ],
            "size_modifications": [
                {
                    "size_code": sm.size_code,
                    "part_name": sm.part_name,
                    "old_value": sm.old_value,
                    "new_value": sm.new_value,
                    "created_by": sm.created_by
                }
                for sm in order.size_modifications
            ],
            "scan_records": [
                {
                    "scan_code": sr.scan_code,
                    "fabric_code": sr.fabric_code,
                    "quantity": sr.quantity,
                    "is_valid": sr.is_valid,
                    "scanner": sr.scanner
                }
                for sr in order.scan_records
            ],
            "audit_history": ReplayService.get_order_history(db, order_id)
        }
        
        if output:
            with open(output, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            click.secho(f"导出成功: {output}", fg="green")
        else:
            click.echo(json.dumps(export_data, ensure_ascii=False, indent=2))
        
        sys.exit(0)
    except Exception as e:
        click.secho(f"导出失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--order-id", required=True, help="样衣单ID")
@click.option("--compare-id", help="对比版本ID")
def replay(order_id, compare_id):
    """回放：查看历史操作记录和版本差异"""
    db = get_db()
    try:
        history = ReplayService.get_order_history(db, order_id)
        
        click.echo(click.style("=" * 60, fg="blue"))
        click.echo(click.style(f"订单 {order_id} 历史操作记录", fg="blue", bold=True))
        click.echo(click.style("=" * 60, fg="blue"))
        
        for record in history:
            click.echo(f"\n[{record['timestamp']}]")
            click.echo(f"  操作: {click.style(record['action'], fg='cyan')}")
            click.echo(f"  操作人: {record['operator']}")
            if record['diff']:
                click.echo(f"  变更: {record['diff']}")
        
        if compare_id:
            click.echo("\n" + click.style("=" * 60, fg="blue"))
            click.echo(click.style("版本差异对比", fg="blue", bold=True))
            click.echo(click.style("=" * 60, fg="blue"))
            
            diff = ReplayService.compare_versions(db, order_id, compare_id)
            if "error" in diff:
                click.secho(diff["error"], fg="red")
            else:
                click.echo(f"\n版本 {diff['order_v1']['version']} -> {diff['order_v2']['version']}")
                click.echo(f"状态: {diff['order_v1']['status']} -> {diff['order_v2']['status']}")
                click.echo("\n面料库存变化:")
                for fc, data in diff['fabric_diff'].items():
                    sign = "+" if data['diff'] > 0 else ""
                    color = "green" if data['diff'] >= 0 else "red"
                    click.echo(f"  {fc}: {data['v1']} -> {data['v2']} ({sign}{data['diff']})")
        
        sys.exit(0)
    except Exception as e:
        click.secho(f"回放失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--order-id", required=True, help="样衣单ID")
@click.option("--operator", default="supervisor_wang", help="操作人")
def freeze(order_id, operator):
    """冻结：将订单状态设为冻结（防止修改）"""
    db = get_db()
    try:
        order = StyleOrderService.freeze(db, order_id, operator)
        if not order:
            click.secho("冻结失败", fg="red")
            sys.exit(1)
        
        db.commit()
        click.secho(f"订单 {order.order_no} 已冻结", fg="green")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.secho(f"冻结失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.argument("file", type=click.File('r', encoding='utf-8'))
@click.option("--operator", default="entry_clerk", help="操作人")
@click.option("--source", default="cli_import", help="数据来源")
def import_scans(file, operator, source):
    """导入扫码明细"""
    db = get_db()
    try:
        data = json.load(file)
        if not isinstance(data, list):
            data = [data]
        
        result = ScanService.import_scan(db, data, operator, source)
        db.commit()
        
        click.echo(f"成功: {result['success']}, 失败: {result['failed']}")
        if result['failed'] > 0:
            click.secho(f"警告: {result['failed']} 条记录导入失败，请查看失败记录列表", fg="yellow")
        
        sys.exit(0 if result['failed'] == 0 else 2)
    except Exception as e:
        db.rollback()
        click.secho(f"导入失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--record-type", help="按类型过滤")
def failed_records(record_type):
    """查看导入失败记录"""
    from app.models import FailedRecord
    
    db = get_db()
    try:
        query = db.query(FailedRecord)
        if record_type:
            query = query.filter(FailedRecord.record_type == record_type)
        
        records = query.order_by(FailedRecord.created_at.desc()).all()
        
        if not records:
            click.echo("没有失败记录")
            sys.exit(0)
        
        table_data = [[r.id, r.record_type, r.error_message, r.source, r.created_at.strftime("%Y-%m-%d %H:%M")] for r in records]
        headers = ["ID", "类型", "错误信息", "来源", "时间"]
        click.echo(tabulate(table_data, headers=headers, tablefmt="grid"))
        
        sys.exit(0)
    except Exception as e:
        click.secho(f"查询失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--username", required=True, help="用户名")
def test_permissions(username):
    """测试用户权限"""
    db = get_db()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            click.secho("用户不存在", fg="red")
            sys.exit(1)
        
        from app.permissions import ROLE_PERMISSIONS
        
        click.echo(f"用户: {username}")
        click.echo(f"角色: {user.role.value}")
        click.echo(f"权限列表:")
        for perm in sorted(ROLE_PERMISSIONS.get(user.role, [])):
            click.echo(f"  ✓ {perm}")
        
        sys.exit(0)
    except Exception as e:
        click.secho(f"查询失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
def demo():
    """运行完整演示流程"""
    click.secho("\n" + "=" * 60, fg="blue")
    click.secho("服装打版样衣验收回放链路服务 - 完整演示", fg="blue", bold=True)
    click.secho("=" * 60 + "\n", fg="blue")
    
    db = get_db()
    UserService.init_default_users(db)
    operator = "entry_clerk"
    supervisor = "supervisor_wang"
    
    try:
        click.echo(click.style("步骤 1: 创建样衣流转单 (批次: 202405)", fg="cyan"))
        order_data = {
            "order_no": "SO2024050001",
            "style_code": "STYLE0001",
            "style_name": "夏季新款连衣裙",
            "batch_no": "BATCH202405"
        }
        order = StyleOrderService.create(db, order_data, operator)
        click.echo(f"  ✓ 创建订单: {order.order_no} (ID: {order.id})")
        
        click.echo(f"\n{click.style('步骤 2: 录入面料入库', fg='cyan')}")
        fabric_in = {
            "fabric_code": "FAB001",
            "fabric_name": "纯棉面料",
            "action": FabricAction.IN,
            "quantity": 100.0,
            "warehouse": "A仓"
        }
        FabricService.add_transaction(db, order.id, fabric_in, operator)
        click.echo(f"  ✓ 面料 FAB001 入库: +100m")
        
        click.echo(f"\n{click.style('步骤 3: 添加尺码修改意见', fg='cyan')}")
        size_data = {
            "size_code": "M",
            "part_name": "衣长",
            "old_value": 85.0,
            "new_value": 88.0,
            "modification_reason": "版型调整"
        }
        SizeModificationService.add_modification(db, order.id, size_data, operator)
        click.echo(f"  ✓ 尺码修改: M码衣长 85cm -> 88cm")
        
        click.echo(f"\n{click.style('步骤 4: 提交审核', fg='cyan')}")
        order = StyleOrderService.submit(db, order.id, operator)
        click.echo(f"  ✓ 订单状态: {order.status.value}")
        
        click.echo(f"\n{click.style('步骤 5: 审核通过', fg='cyan')}")
        order = StyleOrderService.review(db, order.id, "reviewer_zhang", True)
        click.echo(f"  ✓ 订单状态: {order.status.value}")
        
        click.echo(f"\n{click.style('步骤 6: 面料领用', fg='cyan')}")
        fabric_out = {
            "fabric_code": "FAB001",
            "fabric_name": "纯棉面料",
            "action": FabricAction.OUT,
            "quantity": 25.0,
            "warehouse": "A仓",
            "remark": "样衣制作领用"
        }
        FabricService.add_transaction(db, order.id, fabric_out, supervisor)
        balance = FabricService.get_fabric_balance(db, "FAB001", order.id)
        click.echo(f"  ✓ 面料 FAB001 出库: -25m, 库存: {balance}m")
        
        click.echo(f"\n{click.style('步骤 7: 创建新版本 (跨批次演示)', fg='cyan')}")
        new_order = StyleOrderService.create_new_version(db, order.id, supervisor)
        click.echo(f"  ✓ 创建新版本: {new_order.order_no} (ID: {new_order.id}, 版本: {new_order.version})")
        
        click.echo(f"\n{click.style('步骤 8: 新版本面料领用 (测试旧版本面料隔离)', fg='cyan')}")
        fabric_in2 = {
            "fabric_code": "FAB001",
            "fabric_name": "纯棉面料",
            "action": FabricAction.IN,
            "quantity": 50.0,
            "warehouse": "A仓"
        }
        FabricService.add_transaction(db, new_order.id, fabric_in2, supervisor)
        click.echo(f"  ✓ 新版本面料入库: +50m")
        
        fabric_out2 = {
            "fabric_code": "FAB001",
            "fabric_name": "纯棉面料",
            "action": FabricAction.OUT,
            "quantity": 30.0,
            "warehouse": "A仓"
        }
        FabricService.add_transaction(db, new_order.id, fabric_out2, supervisor)
        balance_v1 = FabricService.get_fabric_balance(db, "FAB001", order.id)
        balance_v2 = FabricService.get_fabric_balance(db, "FAB001", new_order.id)
        click.echo(f"  ✓ 新版本面料出库: -30m")
        click.echo(f"  → V1库存: {balance_v1}m, V2库存: {balance_v2}m")
        
        click.echo(f"\n{click.style('步骤 9: 冻结旧版本', fg='cyan')}")
        order = StyleOrderService.freeze(db, order.id, supervisor)
        click.echo(f"  ✓ 订单 {order.order_no} 已冻结")
        
        click.echo(f"\n{click.style('步骤 10: 测试冻结后修改 (应失败)', fg='cyan')}")
        try:
            StyleOrderService.update(db, order.id, {"style_name": "修改测试"}, operator)
            click.secho("  ✗ 错误: 冻结订单被修改了!", fg="red")
        except ValueError as e:
            click.echo(f"  ✓ 正确拒绝修改: {e}")
        
        click.echo(f"\n{click.style('步骤 11: 导入扫码明细 (含1条坏数据)', fg='cyan')}")
        scan_data = [
            {"scan_code": "SCAN001", "style_order_id": new_order.id, "fabric_code": "FAB001", "quantity": 5, "location": "车间A"},
            {"scan_code": "SCAN002", "style_order_id": 99999, "fabric_code": "FAB001", "quantity": 100},
            {"scan_code": "SCAN003", "style_order_id": new_order.id, "fabric_code": "FAB001", "quantity": 3}
        ]
        result = ScanService.import_scan(db, scan_data, supervisor, "demo")
        click.echo(f"  ✓ 导入结果: 成功 {result['success']}, 失败 {result['failed']}")
        
        db.commit()
        
        click.echo(f"\n{click.style('步骤 12: 版本对比回放', fg='cyan')}")
        diff = ReplayService.compare_versions(db, order.id, new_order.id)
        for fc, data in diff['fabric_diff'].items():
            click.echo(f"  {fc}: V1={data['v1']}m, V2={data['v2']}m, 差异={data['diff']:+}m")
        
        click.echo(f"\n{click.style('步骤 13: 操作历史回放', fg='cyan')}")
        history = ReplayService.get_order_history(db, order.id)
        for h in history[:3]:
            click.echo(f"  [{h['timestamp'][:19]}] {h['action']} - {h['operator']}")
        
        click.secho("\n" + "=" * 60, fg="green")
        click.secho("演示完成!", fg="green", bold=True)
        click.secho(f"订单ID (V1): {order.id}, 订单ID (V2): {new_order.id}", fg="green")
        click.secho("=" * 60 + "\n", fg="green")
        
        sys.exit(0)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        click.secho(f"演示失败: {e}", fg="red")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    cli()
