#!/usr/bin/env python
import os
import sys
import subprocess
import tempfile
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import TEST_DIR

def create_demo_data():
    print("=" * 60)
    print("创建演示数据...")
    print("=" * 60)
    
    sample_file = os.path.join(TEST_DIR, 'demo_samples.xlsx')
    seq_file = os.path.join(TEST_DIR, 'demo_sequencing.xlsx')
    ped_file = os.path.join(TEST_DIR, 'demo_pedigree.xlsx')
    
    sample_df = pd.DataFrame({
        '样本编号': ['S001', 'S002', 'S003', 'S004', 'S005', 'S006', 'S007', 'S008'],
        '姓名': ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'],
        '性别': ['男', '女', '男', '女', '男', '女', '男', '女'],
        '样本类型': ['血液', '血液', '唾液', '血液', '唾液', '血液', '血液', '唾液'],
        '采集日期': ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18',
                   '2024-01-19', '2024-01-20', '2024-01-21', '2024-01-22'],
        '备注': ['', '', '', '性别与家系表不一致', '', '', '', ''],
    })
    sample_df.to_excel(sample_file, index=False)
    print(f"✓ 创建样本清单: {sample_file}")
    
    seq_df = pd.DataFrame({
        '样本编号': ['S001', 'S001', 'S002', 'S003', 'S004', 'S005', 'S007', 'S009'],
        '测序ID': ['SEQ001', 'SEQ002', 'SEQ003', 'SEQ004', 'SEQ005', 'SEQ006', 'SEQ007', 'SEQ008'],
        '基因': ['BRCA1', 'BRCA2', 'BRCA1', 'TP53', 'BRCA1', 'BRCA2', 'BRCA1', 'BRCA2'],
        '变异': ['c.123A>G', 'c.456C>T', 'c.123A>G', 'c.789G>A', 'c.123A>G', 'c.456C>T', 'c.321T>C', 'c.654G>A'],
        '基因型': ['A/G', 'C/T', 'A/G', 'G/A', 'A/G', 'C/T', 'T/C', 'G/A'],
        '染色体': ['17', '13', '17', '17', '17', '13', '17', '13'],
        '位置': ['43044295', '32906723', '43044295', '7577539', '43044295', '32906723', '43047659', '32914326'],
        '参考碱基': ['A', 'C', 'A', 'G', 'A', 'C', 'T', 'G'],
        '变异碱基': ['G', 'T', 'G', 'A', 'G', 'T', 'C', 'A'],
        '质量值': [99.9, 98.5, 99.9, 85.0, 99.9, 95.0, 99.9, 92.0],
        '深度': [150, 120, 180, 30, 200, 90, 160, 110],
        '杂合性': ['杂合', '杂合', '杂合', '杂合', '纯合', '杂合', '杂合', '杂合'],
        '解读': ['疑似致病', '良性', '疑似致病', '意义未明', '疑似致病', '意义未明', '良性', '疑似致病'],
    })
    seq_df.to_excel(seq_file, index=False)
    print(f"✓ 创建测序结果: {seq_file}")
    
    ped_df = pd.DataFrame({
        '家系ID': ['FAM001', 'FAM001', 'FAM001', 'FAM001', 'FAM002', 'FAM002', 'FAM002'],
        '个体ID': ['S001', 'S002', 'S003', 'S004', 'S005', 'S006', 'S007'],
        '父亲ID': ['', '', 'S001', 'S001', '', '', 'S005'],
        '母亲ID': ['', '', 'S002', 'S002', '', '', ''],
        '配偶ID': ['S002', 'S001', '', '', 'S006', 'S005', ''],
        '性别': ['男', '女', '女', '女', '男', '女', '男'],
        '患病状态': ['正常', '正常', '患病', '正常', '患病', '正常', '患病'],
        '关系': ['父亲', '母亲', '女儿', '女儿', '父亲', '母亲', '儿子'],
        '代次': [1, 1, 2, 2, 1, 1, 2],
        '关联样本ID': ['S001', 'S002', 'S003', 'S004', 'S005', 'S006', 'S007'],
    })
    ped_df.to_excel(ped_file, index=False)
    print(f"✓ 创建家系信息: {ped_file}")
    
    print()
    return sample_file, seq_file, ped_file

def run_import_demo():
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    from app import DataImporter, PedigreeValidator, ReportExporter, DashboardData
    from app.database import init_db
    from flask import Flask
    from config import Config
    
    print("=" * 60)
    print("初始化数据库...")
    print("=" * 60)
    
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)
    
    with app.app_context():
        importer = DataImporter(upload_dir=TEST_DIR)
        
        sample_file, seq_file, ped_file = create_demo_data()
        
        batch_number = 'DEMO-BATCH-2024-001'
        
        print("\n" + "=" * 60)
        print(f"导入样本清单 (批次: {batch_number})")
        print("=" * 60)
        
        result = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number=batch_number,
            user='demo_user',
            source_notes='演示数据导入 - 样本清单'
        )
        print(f"结果: {'成功' if result['success'] else '失败'}")
        print(f"  总行数: {result.get('total_rows', 0)}")
        print(f"  已导入: {result.get('imported_rows', 0)}")
        print(f"  跳过: {result.get('skipped_rows', 0)}")
        print(f"  重复: {result.get('duplicate_rows', 0)}")
        
        print("\n" + "=" * 60)
        print("导入测序结果")
        print("=" * 60)
        
        result = importer.import_data(
            filepath=seq_file,
            import_type='sequencing',
            batch_number=batch_number,
            user='demo_user',
            source_notes='演示数据导入 - 测序结果'
        )
        print(f"结果: {'成功' if result['success'] else '失败'}")
        if result.get('duplicate'):
            print(f"  提示: {result.get('message')}")
        else:
            print(f"  已导入: {result.get('imported_rows', 0)}")
            print(f"  跳过: {result.get('skipped_rows', 0)}")
            if result.get('summary', {}).get('mismatch_count', 0) > 0:
                print(f"  样本不匹配: {result['summary']['mismatch_count']} 个")
        
        print("\n" + "=" * 60)
        print("导入家系信息")
        print("=" * 60)
        
        result = importer.import_data(
            filepath=ped_file,
            import_type='pedigree',
            batch_number=batch_number,
            user='demo_user',
            source_notes='演示数据导入 - 家系信息'
        )
        print(f"结果: {'成功' if result['success'] else '失败'}")
        print(f"  已导入: {result.get('imported_rows', 0)}")
        
        print("\n" + "=" * 60)
        print("运行全部校验规则")
        print("=" * 60)
        
        validator = PedigreeValidator()
        from app.models import ReagentBatch
        batch = ReagentBatch.query.filter_by(batch_number=batch_number).first()
        
        validation_result = validator.run_all_validations(batch.id)
        
        print(f"\n校验结果汇总:")
        print(f"  通过: {validation_result['summary']['passed']} 项")
        print(f"  失败: {validation_result['summary']['failed']} 项")
        print(f"  需复核: {validation_result['summary']['review']} 项")
        print(f"  冲突总数: {validation_result['summary']['total_conflicts']} 个")
        print(f"  严重冲突: {validation_result['summary']['critical_conflicts']} 个")
        
        print("\n详细校验结果:")
        for rule in validation_result['rules']:
            status_icon = {'pass': '✅', 'fail': '❌', 'review': '⚠️', 'pending': '⏳'}
            icon = status_icon.get(rule.get('status', 'pending'))
            print(f"  {icon} {rule['rule_name']}: {rule['status']}")
            if 'stats' in rule:
                for k, v in rule['stats'].items():
                    if v:
                        print(f"      {k}: {v}")
        
        print("\n" + "=" * 60)
        print("可用性评估 (导师视图)")
        print("=" * 60)
        
        dashboard = DashboardData()
        usability = dashboard.get_usability_assessment(batch.id)
        
        print(f"\n评估结果: {usability['assessment_label']}")
        print(f"主要结论: {usability['primary_issue']}")
        print(f"\n  ✅ 可以直接使用: {len(usability['details']['ready_samples'])} 个样本")
        for s in usability['details']['ready_samples'][:3]:
            print(f"      - {s['sample_id']} ({s['name']}, {s['gender']})")
        
        print(f"\n  ⚠️ 需要复核: {len(usability['details']['needs_review_samples'])} 个样本")
        for s in usability['details']['needs_review_samples']:
            print(f"      - {s['sample_id']}: {'; '.join(s['issues'])}")
        
        print(f"\n  ❌ 不能使用: {len(usability['details']['not_usable_samples'])} 个样本")
        for s in usability['details']['not_usable_samples']:
            print(f"      - {s['sample_id']}: {'; '.join(s['issues'])}")
        
        print("\n" + "=" * 60)
        print("导出报告")
        print("=" * 60)
        
        exporter = ReportExporter(export_dir=Config.EXPORT_FOLDER)
        
        excel_result = exporter.export_to_excel(batch.id)
        if excel_result['success']:
            print(f"✓ Excel报告: {excel_result['file_name']} ({round(excel_result['file_size']/1024:.2f} KB)")
        
        pdf_result = exporter.export_to_pdf(batch.id)
        if pdf_result['success']:
            print(f"✓ PDF报告: {pdf_result['file_name']} ({round(pdf_result['file_size']/1024:.2f} KB)")
        
        print("\n" + "=" * 60)
        print("测试重复导入场景")
        print("=" * 60)
        
        result = importer.import_data(
            filepath=sample_file,
            import_type='sample',
            batch_number=batch_number,
            user='demo_user'
        )
        if result.get('duplicate'):
            print(f"✓ 正确检测到重复导入")
            print(f"  消息: {result.get('message')}")
        else:
            print(f"✗ 未检测到重复导入")
        
        print("\n" + "=" * 60)
        print("演示完成！")
        print("=" * 60)
        print(f"\n报告文件位于: {Config.EXPORT_FOLDER}")
        print(f"数据库文件: {Config.SQLALCHEMY_DATABASE_URI}")
        print("\n现在可以运行 `python app.py` 启动Web服务，访问 http://localhost:8050")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'pytest':
        print("运行pytest测试套件...")
        subprocess.run([sys.executable, '-m', 'pytest', 'tests/', '-v', '--tb=short')
    else:
        run_import_demo()
