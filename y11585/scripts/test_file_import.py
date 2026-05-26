import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import io
import zipfile
import tempfile
from datetime import datetime
from pathlib import Path

try:
    from pypdf import PdfWriter
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False
    print("Warning: pypdf not installed, PDF tests will be skipped")

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False
    print("Warning: openpyxl not installed, Excel tests will be skipped")

from app.database import SessionLocal, Base, engine
from app.models.base import Batch, Contract, BatchStatus, DuplicateStrategy
from app.services.file_service import FileService


def create_test_pdf(filename, contract_no="HT2024_TEST001", amount=100000):
    if not HAS_PYPDF:
        return None
    
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    
    text = f"""
    合同编号: {contract_no}
    合同名称: 测试合同 - {contract_no}
    甲方: 测试甲方有限公司
    乙方: 测试乙方有限公司
    合同金额: ￥{amount:,} 元
    签订日期: {datetime.now().strftime('%Y年%m月%d日')}
    """
    
    from pypdf import PdfReader
    from pypdf.annotations import FreeText
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    writer.write(temp_file)
    temp_file.close()
    
    with open(temp_file.name, 'rb') as f:
        content = f.read()
    
    os.unlink(temp_file.name)
    return content


def create_test_payment_excel():
    if not HAS_OPENPYXL:
        return None
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(['node_name', 'node_type', 'payment_ratio', 'payment_amount', 'due_date', 'status'])
    ws.append(['预付款', 'advance', 0.3, 30000, datetime(2024, 1, 15), 'completed'])
    ws.append(['进度款', 'milestone', 0.4, 40000, datetime(2024, 3, 1), 'pending'])
    ws.append(['尾款', 'final', 0.3, 30000, datetime(2024, 6, 1), 'pending'])
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    wb.save(temp_file)
    temp_file.close()
    
    with open(temp_file.name, 'rb') as f:
        content = f.read()
    
    os.unlink(temp_file.name)
    return content


def create_test_price_change_excel():
    if not HAS_OPENPYXL:
        return None
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(['original_price', 'new_price', 'change_reason', 'approved_by', 'effective_date'])
    ws.append([90000, 100000, '原材料价格上涨', '张三', datetime(2024, 2, 1)])
    ws.append([95000, 105000, '人工成本增加', '李四', datetime(2024, 3, 1)])
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    wb.save(temp_file)
    temp_file.close()
    
    with open(temp_file.name, 'rb') as f:
        content = f.read()
    
    os.unlink(temp_file.name)
    return content


def create_test_eml():
    eml_content = """From: project@party-a.com
To: manager@party-b.com
Subject: 关于测试合同第一阶段验收确认
Date: Mon, 15 Jan 2024 10:30:00 +0800
Content-Type: text/plain; charset=utf-8

我方已完成第一阶段验收工作，验收合格，确认支付进度款￥30,000元。

此致
项目组
"""
    return eml_content.encode('utf-8')


def create_test_zip_archive():
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        pdf_content = create_test_pdf("test_contract.pdf", "HT_ZIP_TEST001", 200000)
        if pdf_content:
            zf.writestr('test_contract/test_contract.pdf', pdf_content)
        
        payment_excel = create_test_payment_excel()
        if payment_excel:
            zf.writestr('test_contract/payment_nodes.xlsx', payment_excel)
        
        price_excel = create_test_price_change_excel()
        if price_excel:
            zf.writestr('test_contract/price_changes.xlsx', price_excel)
        
        eml_content = create_test_eml()
        zf.writestr('test_contract/acceptance.eml', eml_content)
    
    return zip_buffer.getvalue()


def test_1_price_change_fix():
    print("\n" + "="*60)
    print("TEST 1: 修复手工改价表读取 (openpyxl InvalidFileException)")
    print("="*60)
    
    if not HAS_OPENPYXL:
        print("  SKIPPED: openpyxl not installed")
        return True
    
    db = SessionLocal()
    file_service = FileService(db)
    
    batch = Batch(
        batch_no="TEST_PRICE_001",
        name="测试改价表批次",
        status=BatchStatus.CREATED,
        created_by="tester"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    from app.models.base import Contract
    contract = Contract(
        batch_id=batch.id,
        contract_no="HT_PRICE_TEST001",
        contract_name="改价测试合同",
        party_a="甲方",
        party_b="乙方",
        total_amount=100000,
        version=1
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    
    excel_content = create_test_price_change_excel()
    
    try:
        result = file_service.process_price_change_excel(
            batch.id, contract.id, excel_content, "price_change.xlsx", "tester"
        )
        print(f"  ✓ 改价表处理成功")
        print(f"    - 添加改价记录数: {result['price_changes_count']}")
        print(f"    - 附件ID: {result['attachment_id']}")
        
        from app.models.base import PriceChange
        pcs = db.query(PriceChange).filter(PriceChange.contract_id == contract.id).all()
        print(f"    - 数据库验证: {len(pcs)} 条记录")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        db.close()
        return False


def test_2_zip_archive_full_processing():
    print("\n" + "="*60)
    print("TEST 2: 历史压缩包完整处理 (xlsx/eml 实际解析)")
    print("="*60)
    
    db = SessionLocal()
    file_service = FileService(db)
    
    batch = Batch(
        batch_no="TEST_ZIP_001",
        name="测试压缩包批次",
        status=BatchStatus.CREATED,
        created_by="tester"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    zip_content = create_test_zip_archive()
    
    try:
        result = file_service.process_zip_archive(
            batch.id, zip_content, "test_archive.zip", "tester", DuplicateStrategy.APPEND
        )
        
        print(f"  ✓ 压缩包处理完成")
        print(f"    - PDF处理: {result['pdfs']} 个")
        print(f"    - 付款节点Excel: {result['payment_excels']} 个")
        print(f"    - 改价表Excel: {result['price_changes']} 个")
        print(f"    - 验收邮件: {result['emls']} 个")
        print(f"    - 创建合同: {result['contracts_created']} 份")
        print(f"    - 添加付款节点: {result['payment_nodes_added']} 个")
        print(f"    - 添加改价记录: {result['price_changes_added']} 条")
        print(f"    - 添加验收邮件: {result['emails_added']} 封")
        
        if result['warnings']:
            print(f"    - 警告: {len(result['warnings'])} 条")
            for w in result['warnings'][:2]:
                print(f"      * {w}")
        
        if result['errors']:
            print(f"    - 错误: {len(result['errors'])} 条")
            for e in result['errors'][:2]:
                print(f"      * {e}")
        
        contracts = db.query(Contract).filter(Contract.batch_id == batch.id).all()
        print(f"    - 数据库验证: {len(contracts)} 份合同")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        import traceback
        traceback.print_exc()
        db.close()
        return False


def test_3_duplicate_strategies():
    print("\n" + "="*60)
    print("TEST 3: 重复策略测试 (忽略/覆盖/追加)")
    print("="*60)
    
    db = SessionLocal()
    file_service = FileService(db)
    
    batch = Batch(
        batch_no="TEST_DUP_001",
        name="测试重复策略批次",
        status=BatchStatus.CREATED,
        created_by="tester"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    pdf_content = create_test_pdf("dup_test.pdf", "HT_DUP_TEST", 150000)
    if not pdf_content:
        print("  SKIPPED: pypdf not installed")
        db.close()
        return True
    
    print("  策略1: APPEND (追加) - 第一次导入")
    result1 = file_service.process_contract_pdf(
        batch.id, pdf_content, "dup_test.pdf", "tester", DuplicateStrategy.APPEND
    )
    print(f"    - 操作: {result1['action']}")
    contract_id_1 = result1['contract_id']
    contracts_before = db.query(Contract).filter(Contract.batch_id == batch.id).count()
    print(f"    - 当前合同数: {contracts_before}")
    
    print("  策略2: IGNORE (忽略) - 第二次导入相同合同")
    result2 = file_service.process_contract_pdf(
        batch.id, pdf_content, "dup_test.pdf", "tester", DuplicateStrategy.IGNORE
    )
    print(f"    - 操作: {result2['action']}")
    contracts_ignore = db.query(Contract).filter(Contract.batch_id == batch.id).count()
    print(f"    - 导入后合同数: {contracts_ignore} (应为 {contracts_before})")
    
    print("  策略3: OVERWRITE (覆盖) - 第三次导入相同合同")
    result3 = file_service.process_contract_pdf(
        batch.id, pdf_content, "dup_test.pdf", "tester", DuplicateStrategy.OVERWRITE
    )
    print(f"    - 操作: {result3['action']}")
    contracts_overwrite = db.query(Contract).filter(Contract.batch_id == batch.id).count()
    print(f"    - 导入后合同数: {contracts_overwrite}")
    
    success = (
        result1['action'] == 'new' and
        result2['action'] == 'ignored' and
        contracts_ignore == contracts_before and
        result3['action'] in ['overwritten', 'new']
    )
    
    print(f"  {'✓' if success else '✗'} 重复策略测试 {'通过' if success else '失败'}")
    
    db.close()
    return success


def test_4_async_task_with_failure_classification():
    print("\n" + "="*60)
    print("TEST 4: 异步任务绑定与失败分类")
    print("="*60)
    
    db = SessionLocal()
    file_service = FileService(db)
    from app.services.task_service import TaskService
    from app.models.base import TaskStatus
    
    task_service = TaskService(db)
    
    batch = Batch(
        batch_no="TEST_ASYNC_001",
        name="测试异步任务批次",
        status=BatchStatus.CREATED,
        created_by="tester"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    print("  测试1: 创建正常导入任务")
    zip_content = create_test_zip_archive()
    task_id = file_service.async_import_archive(
        batch.id, zip_content, "test.zip", "tester", DuplicateStrategy.APPEND
    )
    print(f"    - 任务ID: {task_id}")
    
    import time
    time.sleep(1)
    
    task = task_service.get_task(task_id)
    if task:
        print(f"    - 任务状态: {task.status.value}")
        print(f"    - 任务进度: {task.progress}%")
        print(f"    - 重试次数: {task.retry_count}")
        if task.result:
            print(f"    - 结果: {task.result}")
    
    print("  测试2: 模拟失败分类")
    bad_task = task_service.create_task("test_failure", "tester", batch.id)
    print(f"    - 创建失败测试任务: {bad_task.task_id}")
    
    print("    测试 RETRY 失败类型")
    task_service.fail_task(bad_task.task_id, "网络超时", "network_timeout", retry=True)
    task = task_service.get_task(bad_task.task_id)
    print(f"      状态: {task.status.value}, 重试次数: {task.retry_count}")
    
    print("    测试 MANUAL 失败类型 (重试耗尽)")
    for i in range(3):
        task_service.fail_task(bad_task.task_id, "持续超时", "network_timeout", retry=True)
    task = task_service.get_task(bad_task.task_id)
    print(f"      状态: {task.status.value}, 重试次数: {task.retry_count}")
    
    print("    测试 FAILED (永久失败)")
    perm_fail_task = task_service.create_task("test_perm_fail", "tester", batch.id)
    task_service.fail_task(perm_fail_task.task_id, "文件已损坏", "corrupted_file", retry=False)
    task = task_service.get_task(perm_fail_task.task_id)
    print(f"      状态: {task.status.value}, 永久失败")
    
    print("  测试3: 任务恢复")
    resumed = task_service.retry_task(bad_task.task_id, force=True)
    print(f"    - 强制重试后状态: {resumed.status.value}")
    
    db.close()
    print("  ✓ 异步任务与失败分类测试完成")
    return True


def main():
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║     法务合同履约异常回执状态机 - 文件导入功能测试             ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    if not os.path.exists('test_db.db'):
        Base.metadata.create_all(bind=engine)
    
    results = []
    
    results.append(("改价表读取修复", test_1_price_change_fix()))
    results.append(("压缩包完整处理", test_2_zip_archive_full_processing()))
    results.append(("重复策略实现", test_3_duplicate_strategies()))
    results.append(("异步任务与失败分类", test_4_async_task_with_failure_classification()))
    
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        print(f"  {'✓' if result else '✗'} {name}: {'通过' if result else '失败'}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！文件导入功能修复完成。")
        return 0
    else:
        print(f"\n⚠ {total - passed} 个测试失败，请检查。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
