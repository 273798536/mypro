from datetime import date, datetime, timedelta
from data_store import DataStore
from models import Staff, RateSnapshot, AttendanceRecord, AcceptanceRecord
from verifier import AttendanceVerifier
from version_compare import VersionComparator
from exporter import DataExporter


def create_sample_data():
    ds = DataStore()
    
    staff_data = [
        ("S001", "张三", "前端开发", "技术部", "外包人员A"),
        ("S002", "李四", "后端开发", "技术部", "外包人员B"),
        ("S003", "王五", "测试工程师", "质量部", "备注：有转正意向"),
        ("S004", "赵六", "产品经理", "产品部", ""),
    ]
    
    for sid, name, role, dept, remark in staff_data:
        ds.add_staff(Staff(
            staff_id=sid,
            name=name,
            role=role,
            department=dept,
            remark=remark
        ))
    
    today = date.today()
    rate_data = [
        ("S001", 800.0, today - timedelta(days=30), None, 1),
        ("S002", 1000.0, today - timedelta(days=30), today - timedelta(days=15), 1),
        ("S002", 1200.0, today - timedelta(days=14), None, 2),
        ("S003", 600.0, today - timedelta(days=30), None, 1),
        ("S004", 1500.0, today - timedelta(days=30), None, 1),
    ]
    
    for sid, rate, eff_date, end_date, version in rate_data:
        ds.add_rate(RateSnapshot(
            rate_id="",
            staff_id=sid,
            daily_rate=rate,
            effective_date=eff_date,
            end_date=end_date,
            version=version
        ))
    
    work_days = []
    for i in range(20):
        d = today - timedelta(days=i)
        if d.weekday() < 5:
            work_days.append(d)
    
    sources = ["钉钉考勤", "OA系统", "项目经理提交", "外包公司报表"]
    projects = ["PROJ001", "PROJ002", "PROJ003", ""]
    
    for i, d in enumerate(work_days):
        ds.add_attendance(AttendanceRecord(
            attendance_id="",
            staff_id="S001",
            work_date=d,
            hours=8.0,
            project_code=projects[i % 3],
            project_name="",
            remark="",
            is_approved=True,
            source=sources[i % 2]
        ))
        
        ds.add_attendance(AttendanceRecord(
            attendance_id="",
            staff_id="S002",
            work_date=d,
            hours=8.0,
            project_code="PROJ001",
            project_name="",
            remark="",
            is_approved=True,
            source=sources[0]
        ))
        
        ds.add_attendance(AttendanceRecord(
            attendance_id="",
            staff_id="S003",
            work_date=d,
            hours=8.0,
            project_code="PROJ002",
            project_name="",
            remark="",
            is_approved=i > 3,
            source=sources[1]
        ))
    
    dup_date = work_days[3]
    ds.add_attendance(AttendanceRecord(
        attendance_id="",
        staff_id="S001",
        work_date=dup_date,
        hours=8.0,
        project_code="PROJ002",
        project_name="",
        remark="重复录入的考勤",
        is_approved=True,
        source=sources[2]
    ))
    
    ds.add_attendance(AttendanceRecord(
        attendance_id="",
        staff_id="S004",
        work_date=work_days[0],
        hours=8.0,
        project_code="",
        project_name="",
        remark="",
        is_approved=False,
        source=""
    ))
    
    for d in work_days[5:]:
        ds.add_acceptance(AcceptanceRecord(
            acceptance_id="",
            staff_id="S001",
            work_date=d,
            accepted_days=1.0,
            project_code="PROJ001",
            acceptance_note="",
            accepted_by="项目经理",
            accepted_at=datetime.now(),
            is_overdue=False
        ))
    
    for d in work_days[5:]:
        ds.add_acceptance(AcceptanceRecord(
            acceptance_id="",
            staff_id="S002",
            work_date=d,
            accepted_days=1.0,
            project_code="PROJ001",
            acceptance_note="",
            accepted_by="",
            accepted_at=None,
            is_overdue=False
        ))
    
    print("✅ 测试数据创建完成")
    print(f"   - 人员: {len(ds.staff)} 人")
    print(f"   - 费率记录: {len(ds.rates)} 条")
    print(f"   - 考勤记录: {len(ds.attendance)} 条")
    print(f"   - 验收记录: {len(ds.acceptance)} 条")
    
    return ds


def run_demo():
    print("\n" + "="*60)
    print("📊 外包人天费用核验系统 - 演示")
    print("="*60 + "\n")
    
    ds = create_sample_data()
    verifier = AttendanceVerifier(ds)
    comparator = VersionComparator(ds)
    exporter = DataExporter(ds)
    
    today = date.today()
    start_date = today - timedelta(days=30)
    
    print("\n🔍 第一次核验...")
    result1 = verifier.verify_period(start_date, today, "演示用户")
    ds.add_verification_result(result1)
    
    print(f"   版本: V{result1.version}")
    print(f"   总人天: {result1.total_days}")
    print(f"   总金额: ¥{result1.total_amount:,.2f}")
    print(f"   重复人天: {result1.duplicate_days}")
    print(f"   争议数: {len(result1.disputes)}")
    
    print("\n📝 争议明细:")
    for d in result1.disputes:
        print(f"   [{d.dispute_type.value}] [{d.status.value}] {d.description[:50]}...")
    
    print("\n✏️ 修改一条考勤记录（模拟验收时的修正）...")
    for att in ds.attendance.values():
        if att.staff_id == "S001" and att.source == "项目经理提交":
            att.hours = 4.0
            att.remark = "修正：当天下午请假"
            att.updated_at = datetime.now()
            break
    
    ds.add_attendance(AttendanceRecord(
        attendance_id="",
        staff_id="S004",
        work_date=today - timedelta(days=7),
        hours=8.0,
        project_code="PROJ003",
        project_name="",
        remark="新增补录",
        is_approved=True,
        source="OA系统"
    ))
    ds.save_all()
    
    print("\n🔍 第二次核验...")
    result2 = verifier.verify_period(start_date, today, "演示用户")
    ds.add_verification_result(result2)
    
    print(f"   版本: V{result2.version}")
    print(f"   总人天: {result2.total_days}")
    print(f"   总金额: ¥{result2.total_amount:,.2f}")
    print(f"   争议数: {len(result2.disputes)}")
    
    print("\n📈 版本对比...")
    diff = comparator.compare_results(result1, result2)
    summary = comparator.generate_change_summary(diff)
    
    print(f"   人天变化: {summary['total_days']['change']:+} ({summary['total_days']['direction']})")
    print(f"   金额变化: {summary['total_amount']['change']:+}元 ({summary['total_amount']['direction']})")
    print(f"   新增争议: {summary['disputes_summary']['added']}")
    print(f"   解决争议: {summary['disputes_summary']['removed']}")
    print(f"   考勤变化: {summary['attendance_changes']} 项")
    
    print("\n📥 导出Excel报告...")
    exporter.export_to_excel(result2, "exports/verification_report.xlsx")
    exporter.export_version_diff(diff, "exports/version_diff.xlsx")
    print("   ✅ 报告已导出到 exports/ 目录")
    
    print("\n" + "="*60)
    print("🎉 演示完成！现在可以启动 Web 服务查看可视化看板")
    print("   运行命令: python app.py")
    print("="*60)


if __name__ == "__main__":
    run_demo()
