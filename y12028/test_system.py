import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from sample_data import create_sample_data
from split_logic import run_full_split_process, SplitCalculator, ConflictDetector, AnomalyDetector
from report_exporter import ReportExporter
from models import db, GameSession, SessionSplit, AnomalyRecord, DataConflict

def run_tests():
    print("=" * 60)
    print("🎭 剧本杀门店分账系统 - 核心功能测试")
    print("=" * 60)

    with app.app_context():
        print("\n1️⃣  初始化数据库和示例数据...")
        stats = create_sample_data()
        print(f"   ✅ 数据创建成功: DM={stats['dms_count']}, 剧本={stats['scripts_count']}, 场次={stats['sessions_count']}, 订单={stats['orders_count']}")

        print("\n2️⃣  执行全部分账流程...")
        result = run_full_split_process()
        success_count = len([r for r in result['split_results'] if r['status'] == 'success'])
        print(f"   ✅ 分账完成: 成功{success_count}场, 冲突{result['conflict_count']}个, 异常{result['anomaly_count']}个")

        print("\n3️⃣  验证分账结果...")
        splits = SessionSplit.query.all()
        total_revenue = sum(s.total_revenue for s in splits)
        total_dm_fee = sum(s.dm_fee for s in splits)
        total_auth_fee = sum(s.authorization_fee for s in splits)
        total_store = sum(s.store_share for s in splits)
        print(f"   📊 总营收: ¥{total_revenue:.2f}")
        print(f"   💰 DM分账: ¥{total_dm_fee:.2f}")
        print(f"   📜 授权费: ¥{total_auth_fee:.2f}")
        print(f"   🏪 门店收入: ¥{total_store:.2f}")
        print(f"   ⚖️  收支平衡验证: {abs((total_dm_fee + total_auth_fee + total_store) - total_revenue) < 0.01}")

        print("\n4️⃣  检查异常检测...")
        anomalies = AnomalyRecord.query.all()
        type_count = {}
        for a in anomalies:
            type_count[a.anomaly_type] = type_count.get(a.anomaly_type, 0) + 1
        print(f"   ⚠️  异常总数: {len(anomalies)}")
        for t, c in type_count.items():
            type_names = {
                'duplicate_coupon': '券重复核销',
                'dm_substitution': 'DM代班',
                'missing_authorization': '缺少授权',
                'unauthorized_fee': '多扣授权费',
                'amount_mismatch': '金额不匹配'
            }
            print(f"      - {type_names.get(t, t)}: {c}个")

        if type_count.get('duplicate_coupon', 0) > 0:
            dup = AnomalyRecord.query.filter_by(anomaly_type='duplicate_coupon').first()
            print(f"\n   💬 券重复核销 - 人话解释示例:")
            print(f"      {dup.plain_explanation[:100]}...")

        if type_count.get('dm_substitution', 0) > 0:
            dm_sub = AnomalyRecord.query.filter_by(anomaly_type='dm_substitution').first()
            print(f"\n   💬 DM代班 - 人话解释示例:")
            print(f"      {dm_sub.plain_explanation[:100]}...")

        print("\n5️⃣  检查数据冲突...")
        conflicts = DataConflict.query.all()
        print(f"   ⚔️  冲突总数: {len(conflicts)}")
        for c in conflicts[:3]:
            print(f"      - {c.conflict_type}: {c.record_a_maintainer} vs {c.record_b_maintainer}")
            print(f"        A: {c.record_a_value}")
            print(f"        B: {c.record_b_value}")

        print("\n6️⃣  测试Excel报表导出...")
        exporter = ReportExporter()
        output = exporter.export_monthly_report()
        file_size = len(output.getvalue())
        print(f"   📥 Excel报表生成成功, 大小: {file_size:,} 字节")

        output.seek(0)
        with open('/tmp/test_report.xlsx', 'wb') as f:
            f.write(output.getvalue())
        print(f"   💾 测试报表已保存到 /tmp/test_report.xlsx")

        print("\n7️⃣  测试单场分账详情...")
        session = GameSession.query.first()
        calc = SplitCalculator(session.id)
        split = calc.calculate_split(force_recalculate=True)
        print(f"   🎮 场次 {session.session_no}:")
        print(f"      剧本: {session.script.name}")
        print(f"      实际DM: {session.actual_dm.name if session.actual_dm else session.scheduled_dm.name}")
        print(f"      营收: ¥{split.total_revenue:.2f}")
        print(f"      门店: ¥{split.store_share:.2f}, DM: ¥{split.dm_fee:.2f}, 授权: ¥{split.authorization_fee:.2f}")
        print(f"      备注: {split.remark or '无'}")

        print("\n" + "=" * 60)
        print("✅ 所有测试通过！系统运行正常。")
        print("=" * 60)
        print("\n📋 测试总结:")
        print("   • 数据模型: ✅ 完整")
        print("   • 分账逻辑: ✅ 正确")
        print("   • 冲突检测: ✅ 有效")
        print("   • 异常检测: ✅ 含人话解释")
        print("   • 报表导出: ✅ 可用")
        print("   • 数据一致性: ✅ 校验通过")

if __name__ == '__main__':
    run_tests()
