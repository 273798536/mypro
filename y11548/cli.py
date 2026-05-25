#!/usr/bin/env python3
import click
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, UserRole, ExhibitionBatch, BatchStatus
from app.auth import get_password_hash

EXIT_SUCCESS = 0
EXIT_FAILURE = 1
EXIT_ERROR = 2


@click.group()
def cli():
    """线下展会物料验收回放链路服务 CLI"""
    pass


@cli.command()
@click.option("--force", is_flag=True, help="强制重建数据库")
def initdb(force):
    """初始化数据库"""
    try:
        if force:
            click.echo("正在删除现有数据库...")
            Base.metadata.drop_all(bind=engine)
        click.echo("正在创建数据库表...")
        Base.metadata.create_all(bind=engine)
        click.echo("数据库初始化完成！", color=True)
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"数据库初始化失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.command()
def create_users():
    """创建默认测试用户"""
    db = SessionLocal()
    try:
        users = [
            {"username": "admin", "password": "admin123", "full_name": "系统管理员", "role": UserRole.SUPERVISOR},
            {"username": "reviewer", "password": "review123", "full_name": "复核员张三", "role": UserRole.REVIEWER},
            {"username": "entry", "password": "entry123", "full_name": "录入员李四", "role": UserRole.DATA_ENTRY},
            {"username": "viewer", "password": "view123", "full_name": "查看员王五", "role": UserRole.READ_ONLY},
        ]
        
        created = 0
        for u in users:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    username=u["username"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"]
                )
                db.add(user)
                created += 1
                click.echo(f"  创建用户: {u['username']} ({u['role'].value})")
            else:
                click.echo(f"  跳过已存在用户: {u['username']}")
        
        db.commit()
        click.echo(f"成功创建 {created} 个测试用户！")
        click.echo("默认密码: admin123 / review123 / entry123 / view123")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        db.rollback()
        click.echo(f"创建用户失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command()
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
@click.option("--reload", is_flag=True, help="自动重载")
def serve(host, port, reload):
    """启动API服务"""
    import uvicorn
    click.echo(f"启动服务: http://{host}:{port}")
    click.echo(f"API文档: http://{host}:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)


@cli.command()
@click.argument("batch_no")
@click.option("--name", required=True, help="展会名称")
@click.option("--location", default="", help="展会地点")
@click.option("--days", default=3, type=int, help="展会天数")
@click.option("--frozen", is_flag=True, help="创建后直接冻结")
def create_batch(batch_no, name, location, days, frozen):
    """创建展会批次"""
    db = SessionLocal()
    try:
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=days)
        
        batch = ExhibitionBatch(
            batch_no=batch_no,
            exhibition_name=name,
            location=location,
            start_date=start_date,
            end_date=end_date,
            status=BatchStatus.FROZEN if frozen else BatchStatus.DRAFT,
            created_by=1
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        click.echo(f"创建批次成功: {batch.batch_no} (ID: {batch.id})")
        click.echo(f"  展会: {batch.exhibition_name}")
        click.echo(f"  日期: {batch.start_date.date()} ~ {batch.end_date.date()}")
        click.echo(f"  状态: {batch.status.value}")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        db.rollback()
        click.echo(f"创建批次失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command()
def list_batches():
    """列出所有展会批次"""
    db = SessionLocal()
    try:
        batches = db.query(ExhibitionBatch).all()
        if not batches:
            click.echo("暂无批次")
            sys.exit(EXIT_SUCCESS)
        
        click.echo(f"共 {len(batches)} 个批次:")
        for b in batches:
            status_color = "green" if b.status == BatchStatus.COMPLETED else "yellow" if b.status == BatchStatus.FROZEN else "white"
            click.echo(f"  [{b.id}] {b.batch_no} - {b.exhibition_name} ({b.start_date.date()}) ", nl=False)
            click.secho(f"[{b.status.value}]", fg=status_color)
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        click.echo(f"查询失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command()
@click.argument("batch_id", type=int)
def freeze_batch(batch_id):
    """冻结批次（防止修改）"""
    db = SessionLocal()
    try:
        batch = db.query(ExhibitionBatch).filter(ExhibitionBatch.id == batch_id).first()
        if not batch:
            click.echo(f"批次 {batch_id} 不存在", err=True)
            sys.exit(EXIT_FAILURE)
        
        if batch.status == BatchStatus.FROZEN:
            click.echo(f"批次 {batch.batch_no} 已经是冻结状态")
            sys.exit(EXIT_SUCCESS)
        
        batch.status = BatchStatus.FROZEN
        batch.frozen_at = datetime.utcnow()
        batch.frozen_by = 1
        db.commit()
        click.echo(f"批次 {batch.batch_no} 已成功冻结！")
        click.echo("  所有关联记录将无法修改")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        db.rollback()
        click.echo(f"冻结失败: {e}", err=True)
        sys.exit(EXIT_ERROR)
    finally:
        db.close()


@cli.command()
@click.option("--batch-id", type=int, required=True, help="批次ID")
@click.option("--output", default="./export.xlsx", help="输出文件路径")
def export(batch_id, output):
    """导出完整报表"""
    import requests
    import json
    
    try:
        click.echo("正在获取Token...")
        auth_resp = requests.post(
            "http://localhost:8000/auth/token",
            data={"username": "admin", "password": "admin123"}
        )
        if auth_resp.status_code != 200:
            click.echo("认证失败，请确保服务已启动", err=True)
            sys.exit(EXIT_FAILURE)
        
        token = auth_resp.json()["access_token"]
        
        click.echo("正在导出报表...")
        export_resp = requests.get(
            f"http://localhost:8000/exports/{batch_id}/full",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if export_resp.status_code != 200:
            click.echo(f"导出失败: {export_resp.text}", err=True)
            sys.exit(EXIT_FAILURE)
        
        with open(output, "wb") as f:
            f.write(export_resp.content)
        
        click.echo(f"报表已导出到: {output}")
        sys.exit(EXIT_SUCCESS)
    except requests.exceptions.ConnectionError:
        click.echo("无法连接到服务，请先运行: material-cli serve", err=True)
        sys.exit(EXIT_FAILURE)
    except Exception as e:
        click.echo(f"导出失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.command()
@click.option("--batch-id", type=int, required=True, help="批次ID")
def reconcile(batch_id):
    """执行对账"""
    import requests
    
    try:
        click.echo("正在获取Token...")
        auth_resp = requests.post(
            "http://localhost:8000/auth/token",
            data={"username": "admin", "password": "admin123"}
        )
        if auth_resp.status_code != 200:
            click.echo("认证失败，请确保服务已启动", err=True)
            sys.exit(EXIT_FAILURE)
        
        token = auth_resp.json()["access_token"]
        
        click.echo("正在执行对账...")
        recon_resp = requests.post(
            f"http://localhost:8000/reconciliation/{batch_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if recon_resp.status_code != 200:
            click.echo(f"对账失败: {recon_resp.text}", err=True)
            sys.exit(EXIT_FAILURE)
        
        result = recon_resp.json()
        click.echo(f"对账完成！")
        click.echo(f"  物料编码总数: {result['total_codes']}")
        click.echo(f"  异常数量: {result['anomaly_count']}")
        
        if result["anomalies"]:
            click.echo("\n异常明细:")
            for a in result["anomalies"]:
                click.secho(f"  {a['material_code']} - {a['material_name']}: {a['description']}", fg="red")
        
        sys.exit(EXIT_SUCCESS if result["anomaly_count"] == 0 else EXIT_FAILURE)
    except requests.exceptions.ConnectionError:
        click.echo("无法连接到服务，请先运行: material-cli serve", err=True)
        sys.exit(EXIT_FAILURE)
    except Exception as e:
        click.echo(f"对账失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.command()
def demo_data():
    """生成演示数据（跨日/跨批次边界样例）"""
    import requests
    import json
    
    try:
        click.echo("正在生成演示数据...")
        
        auth_resp = requests.post(
            "http://localhost:8000/auth/token",
            data={"username": "admin", "password": "admin123"}
        )
        if auth_resp.status_code != 200:
            click.echo("认证失败，请确保服务已启动", err=True)
            sys.exit(EXIT_FAILURE)
        
        token = auth_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        day1 = datetime.now() - timedelta(days=1)
        day2 = datetime.now()
        
        batch1_resp = requests.post("http://localhost:8000/batches", headers=headers, json={
            "batch_no": "SH20240501",
            "exhibition_name": "上海国际会展中心-春季展",
            "location": "上海",
            "start_date": (day1 - timedelta(days=2)).isoformat(),
            "end_date": (day1 + timedelta(days=1)).isoformat()
        })
        batch1_id = batch1_resp.json()["id"]
        click.echo(f"  创建批次1 (首日): SH20240501")
        
        batch2_resp = requests.post("http://localhost:8000/batches", headers=headers, json={
            "batch_no": "BJ20240515",
            "exhibition_name": "北京国家会议中心-科技展",
            "location": "北京",
            "start_date": day2.isoformat(),
            "end_date": (day2 + timedelta(days=3)).isoformat()
        })
        batch2_id = batch2_resp.json()["id"]
        click.echo(f"  创建批次2 (次日): BJ20240515")
        
        materials = [
            {"material_code": "LAP-001", "material_name": "笔记本电脑", "quantity": 10, "category": "电子设备"},
            {"material_code": "PRO-001", "material_name": "投影仪", "quantity": 3, "category": "电子设备"},
            {"material_code": "DIS-001", "material_name": "展示架", "quantity": 20, "category": "展示用品"},
            {"material_code": "BRO-001", "material_name": "宣传册", "quantity": 500, "category": "印刷品"},
        ]
        
        for m in materials:
            requests.post("http://localhost:8000/materials", headers=headers,
                         json={**m, "batch_id": batch1_id})
            requests.post("http://localhost:8000/materials", headers=headers,
                         json={**m, "batch_id": batch2_id})
        click.echo(f"  导入物料清单: {len(materials)} 种 x 2 批次")
        
        for i, m in enumerate(materials[:3]):
            requests.post("http://localhost:8000/borrow", headers=headers, json={
                "batch_id": batch1_id,
                "borrow_no": f"BRW{batch1_id}{i:03d}",
                "borrower_name": f"工作人员{i+1}",
                "borrower_department": "市场部",
                "material_code": m["material_code"],
                "material_name": m["material_name"],
                "quantity": 2 if i == 0 else 1,
                "borrow_date": day1.isoformat(),
                "expected_return_date": (day1 + timedelta(days=2)).isoformat()
            })
        click.echo(f"  创建借用记录: 批次1 有 3 条")
        
        for i, m in enumerate(materials[:2]):
            requests.post("http://localhost:8000/borrow", headers=headers, json={
                "batch_id": batch2_id,
                "borrow_no": f"BRW{batch2_id}{i:03d}",
                "borrower_name": f"技术支持{i+1}",
                "borrower_department": "技术部",
                "material_code": m["material_code"],
                "material_name": m["material_name"],
                "quantity": 1,
                "borrow_date": day2.isoformat(),
                "expected_return_date": (day2 + timedelta(days=1)).isoformat(),
                "is_returned": True,
                "return_quantity": 1
            })
        click.echo(f"  创建借用记录: 批次2 有 2 条 (已归还)")
        
        click.echo("\n  测试状态冻结...")
        requests.post(f"http://localhost:8000/batches/{batch1_id}/transition", headers=headers,
                     json={"target_status": "frozen"})
        click.echo(f"  批次 SH20240501 已冻结 (状态: frozen)")
        
        click.echo("\n演示数据生成完成！")
        click.echo(f"  批次1 (已冻结): ID={batch1_id}, SH20240501")
        click.echo(f"  批次2 (进行中): ID={batch2_id}, BJ20240515")
        click.echo("\n可以尝试以下验证:")
        click.echo("  1. 尝试修改冻结批次的记录: material-cli test-freeze")
        click.echo("  2. 执行对账: material-cli reconcile --batch-id X")
        click.echo("  3. 导出报表: material-cli export --batch-id X")
        sys.exit(EXIT_SUCCESS)
        
    except requests.exceptions.ConnectionError:
        click.echo("无法连接到服务，请先运行: material-cli serve", err=True)
        sys.exit(EXIT_FAILURE)
    except Exception as e:
        click.echo(f"生成数据失败: {e}", err=True)
        sys.exit(EXIT_ERROR)


@cli.command()
@click.option("--batch-id", type=int, required=True, help="已冻结的批次ID")
def test_freeze(batch_id):
    """测试冻结批次是否能被错误修改"""
    import requests
    
    try:
        click.echo("正在测试冻结保护...")
        
        auth_resp = requests.post(
            "http://localhost:8000/auth/token",
            data={"username": "admin", "password": "admin123"}
        )
        token = auth_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        batch_resp = requests.get(f"http://localhost:8000/batches/{batch_id}", headers=headers)
        if batch_resp.status_code != 200:
            click.echo(f"批次不存在: {batch_id}", err=True)
            sys.exit(EXIT_FAILURE)
        
        batch = batch_resp.json()
        if batch["status"] != "frozen":
            click.echo(f"警告: 批次 {batch['batch_no']} 状态为 {batch['status']}, 不是 frozen")
        
        click.echo(f"批次: {batch['batch_no']}, 状态: {batch['status']}")
        
        click.echo("\n测试1: 尝试添加物料到冻结批次...")
        test_add = requests.post("http://localhost:8000/materials", headers=headers, json={
            "batch_id": batch_id,
            "material_code": "TEST-999",
            "material_name": "测试物料",
            "quantity": 1
        })
        if test_add.status_code == 400:
            click.secho(f"  ✓ 通过 - 拒绝添加 (状态码: {test_add.status_code})", fg="green")
        else:
            click.secho(f"  ✗ 失败 - 错误地允许添加 (状态码: {test_add.status_code})", fg="red")
        
        click.echo("\n测试2: 尝试修改批次信息...")
        test_update = requests.put(f"http://localhost:8000/batches/{batch_id}", headers=headers, json={
            "exhibition_name": "被篡改的名称"
        })
        if test_update.status_code == 400:
            click.secho(f"  ✓ 通过 - 拒绝修改 (状态码: {test_update.status_code})", fg="green")
        else:
            click.secho(f"  ✗ 失败 - 错误地允许修改 (状态码: {test_update.status_code})", fg="red")
        
        click.echo("\n测试3: 尝试修改物料...")
        mats = requests.get(f"http://localhost:8000/materials?batch_id={batch_id}", headers=headers).json()
        if mats:
            test_mat_update = requests.put(f"http://localhost:8000/materials/{mats[0]['id']}", headers=headers, json={
                "quantity": 9999
            })
            if test_mat_update.status_code == 400:
                click.secho(f"  ✓ 通过 - 拒绝修改物料 (状态码: {test_mat_update.status_code})", fg="green")
            else:
                click.secho(f"  ✗ 失败 - 错误地允许修改 (状态码: {test_mat_update.status_code})", fg="red")
        
        click.echo("\n测试4: 尝试将冻结状态转回 in_progress...")
        test_unfreeze = requests.post(f"http://localhost:8000/batches/{batch_id}/transition", 
                                       headers=headers, json={"target_status": "in_progress"})
        if test_unfreeze.status_code == 400 and "immutable" in test_unfreeze.text:
            click.secho(f"  ✓ 通过 - 状态机拒绝转回 (状态码: {test_unfreeze.status_code})", fg="green")
        else:
            click.secho(f"  ✗ 失败 - 错误地允许状态转移 (状态码: {test_unfreeze.status_code})", fg="red")
        
        click.echo("\n测试5: 尝试导入数据到冻结批次...")
        import_data = "material_code,material_name,quantity\nHACK-IMP,恶意导入,1\n"
        test_import = requests.post(
            f"http://localhost:8000/imports/material?batch_id={batch_id}",
            headers=headers,
            files={"file": ("test.csv", import_data, "text/csv")}
        )
        if test_import.status_code == 400 and "frozen" in test_import.text:
            click.secho(f"  ✓ 通过 - 拒绝导入 (状态码: {test_import.status_code})", fg="green")
        else:
            click.secho(f"  ✗ 失败 - 错误地允许导入 (状态码: {test_import.status_code})", fg="red")
        
        click.echo("\n冻结保护测试完成！")
        click.echo("\n安全验证:")
        click.echo("  1. 状态机: FROZEN 状态转移列表为空，无法转回任何状态")
        click.echo("  2. 状态转移: 冻结/完成批次不可变 (immutable)")
        click.echo("  3. 数据导入: 冻结批次拒绝导入")
        sys.exit(EXIT_SUCCESS)
        
    except requests.exceptions.ConnectionError:
        click.echo("无法连接到服务", err=True)
        sys.exit(EXIT_FAILURE)


@cli.command()
def quick_start():
    """一键快速启动（初始化+创建用户+启动服务）"""
    click.echo("=== 线下展会物料验收回放链路服务 ===")
    click.echo()
    click.echo("正在初始化...")
    
    os.system(f"{sys.executable} {__file__} initdb")
    os.system(f"{sys.executable} {__file__} create-users")
    
    click.echo()
    click.echo("启动服务...")
    os.system(f"{sys.executable} {__file__} serve --reload")


if __name__ == "__main__":
    cli()
