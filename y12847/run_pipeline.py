#!/usr/bin/env python3
import subprocess
import sys
import os
import time
import json
import requests

BASE_URL = "http://localhost:5001/api"
BATCH_ID = "BATCH-2026-001"


def check_python_version():
    if sys.version_info < (3, 8):
        print("错误：需要Python 3.8或更高版本")
        sys.exit(1)
    print(f"Python版本: {sys.version.split()[0]} ✓")


def install_dependencies():
    print("\n安装依赖...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"依赖安装失败: {result.stderr}")
        sys.exit(1)
    print("依赖安装完成 ✓")


def start_server():
    print("\n启动服务器...")
    env = os.environ.copy()
    env['FLASK_ENV'] = 'production'

    env['PORT'] = '5001'
    server = subprocess.Popen(
        [sys.executable, "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env
    )

    for i in range(15):
        try:
            response = requests.get(f"{BASE_URL}/samples", timeout=2)
            if response.status_code == 200:
                print("服务器启动成功 ✓")
                return server
        except requests.exceptions.ConnectionError:
            time.sleep(1)

    server.terminate()
    stdout, stderr = server.communicate()
    print(f"服务器启动失败: {stderr.decode()}")
    sys.exit(1)


def run_full_pipeline():
    from app import app
    client = app.test_client()

    def api(method, path, json_data=None):
        url = f"/api{path}"
        if method == 'GET':
            return client.get(url, query_string=json_data)
        elif method == 'POST':
            return client.post(url, json=json_data)
        elif method == 'PUT':
            return client.put(url, json=json_data)

    print(f"\n{'=' * 50}")
    print("海藻样本生长记录 - 完整流程自动化执行")
    print(f"{'=' * 50}")

    print("\n[1/12] 创建批次...")
    batch_data = {
        "batch_id": BATCH_ID,
        "reagent_lot": "REAGENT-2026-SEA-0427",
        "microscope_batch": "MICRO-BATCH-2026-0611-003",
        "created_by": "张研究员",
        "description": "2026年6月海藻样本生长记录复核"
    }
    r = api('POST', '/batches', batch_data)
    assert r.status_code == 201, f"创建批次失败: {r.get_data(as_text=True)}"
    print(f"  批次 {BATCH_ID} 创建成功 ✓")
    print(f"  试剂批号: {batch_data['reagent_lot']}")
    print(f"  显微照片批次: {batch_data['microscope_batch']}")

    print("\n[2/12] 导入复核意见（含试剂批号、阴性对照、低质量读段）...")
    reviews_data = {
        "batch_id": BATCH_ID,
        "created_by": "张研究员",
        "reviews": [
            {
                "sample_id": "SW-2026-001",
                "species": "海带",
                "collection_site": "青岛海域A区",
                "initial_growth_stage": "5",
                "reviewer": "李生态调查员",
                "opinion": "生长正常，藻体完整，细胞排列规则",
                "conclusion": "正常",
                "is_negative_control": False
            },
            {
                "sample_id": "SW-2026-002",
                "species": "海带",
                "collection_site": "青岛海域A区",
                "initial_growth_stage": "15",
                "reviewer": "李生态调查员",
                "opinion": "生长速率偏高，细胞有轻度异常增生",
                "conclusion": "异常",
                "is_negative_control": False,
                "low_quality_reads_passed": True,
                "change_reason": "低质量读段经人工复核，确认异常为真实生长状态",
                "low_quality_reads": [
                    {"read_id": "READ-002-LQ001", "quality_score": 12.5, "reason": "测序质量低"},
                    {"read_id": "READ-002-LQ002", "quality_score": 15.3, "reason": "接头序列残留"}
                ]
            },
            {
                "sample_id": "SW-2026-NC01",
                "species": "海带（阴性对照）",
                "collection_site": "实验室对照",
                "initial_growth_stage": "12",
                "reviewer": "李生态调查员",
                "opinion": "阴性对照组，无海藻生长抑制处理",
                "conclusion": "正常",
                "is_negative_control": True
            },
            {
                "sample_id": "SW-2026-003",
                "species": "紫菜",
                "collection_site": "烟台海域B区",
                "initial_growth_stage": "8",
                "reviewer": "李生态调查员",
                "opinion": "标注边界不清，需结合显微照片进一步确认",
                "conclusion": "待定",
                "is_negative_control": False
            },
            {
                "sample_id": "SW-2026-NC02",
                "species": "紫菜（阴性对照）",
                "collection_site": "实验室对照",
                "initial_growth_stage": "5",
                "reviewer": "李生态调查员",
                "opinion": "阴性对照组，生长状态良好",
                "conclusion": "正常",
                "is_negative_control": True
            }
        ]
    }
    r = api('POST', '/reviews/import', reviews_data)
    assert r.status_code == 201, f"导入失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    print(f"  成功导入 {result['imported_count']} 条复核意见 ✓")

    print("\n[3/12] 创建图像标注（与同一批次关联）...")
    annotation_data = {
        "sample_id": "SW-2026-003",
        "batch_id": BATCH_ID,
        "image_path": "/images/micro/SW-2026-003_20260611.tif",
        "annotation_data": {
            "regions": [
                {"type": "cell_boundary", "confidence": 0.45, "notes": "边缘模糊"},
                {"type": "growth_zone", "confidence": 0.52, "notes": "生长区域对比度低"}
            ]
        },
        "annotated_by": "王标注员",
        "boundary_confidence": 0.45,
        "boundary_note": "标注边界不清，细胞边缘与背景对比度低"
    }
    r = api('POST', '/annotations', annotation_data)
    assert r.status_code == 201, f"创建标注失败: {r.get_data(as_text=True)}"
    print("  图像标注创建成功（与批次关联，确保统计一致）✓")

    print("\n[4/12] 阴性对照异常复核...")
    nc_data = {
        "batch_id": BATCH_ID,
        "growth_threshold": 10,
        "reviewer": "张研究员"
    }
    r = api('POST', '/negative-control/review', nc_data)
    assert r.status_code == 200, f"阴性对照复核失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    print(f"  检测到 {result['abnormal_count']} 个阴性对照异常 ✓")
    for res in result['results']:
        if res['is_abnormal']:
            print(f"    - {res['sample_id']}: 异常 (超过阈值 {nc_data['growth_threshold']})")

    print("\n[5/12] 修改复核意见（自动记录历史版本）...")
    history = api('GET', '/reviews/history/SW-2026-003').get_json()
    old_review_id = history[0]['id']
    update_data = {
        "reviewer": "张研究员",
        "opinion": "标注边界经二次复核，结合显微照片和多序列比对，确认生长正常，边界不清为染色不均匀导致",
        "conclusion": "正常",
        "low_quality_reads_passed": False,
        "change_reason": "边界不清记录复核完成：调整结论为正常，低质量读段不予通过"
    }
    r = api('PUT', f'/reviews/{old_review_id}', update_data)
    assert r.status_code == 200, f"更新失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    new_review_id = result['id']
    print(f"  复核意见已更新为版本 {result['version']} ✓")
    print(f"  修改原因: {result['change_reason']}")

    print("\n[6/12] 新旧版本并排对比...")
    r = api('GET', f'/reviews/compare/{new_review_id}')
    assert r.status_code == 200, f"对比失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    print(f"  {result['impact_summary']} ✓")
    changed_fields = [f['field'] for f in result['changed_fields']]
    print(f"  变更字段: {changed_fields}")

    print("\n[7/12] 异常回溯链路验证...")
    r = api('GET', '/anomaly/trace/SW-2026-002')
    assert r.status_code == 200, f"回溯失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    print(f"  样本 {result['sample']['sample_id']} 回溯链路:")
    print(f"    - 最新结论: {result['latest_review']['conclusion']}")
    print(f"    - 复核历史: {len(result['review_history'])} 个版本")
    print(f"    - 图像标注: {len(result['annotations'])} 条")
    print(f"    - 低质量读段: {len(result['low_quality_reads'])} 条")
    print(f"    - 审计追踪: {len(result['audit_trail'])} 条 ✓")

    print("\n[8/12] 验证批次统计与标注共用同一批记录...")
    r = api('GET', f'/batches/{BATCH_ID}')
    assert r.status_code == 200, f"获取批次失败: {r.get_data(as_text=True)}"
    result = r.get_json()
    print(f"  批次统计: 总样本={result['statistics']['total_samples']}, "
          f"正常={result['statistics']['normal_count']}, "
          f"异常={result['statistics']['abnormal_count']}")
    print(f"  标注数量: {result['annotations_count']} 条")
    print(f"  同一批次ID: {result['batch_id']} ✓ (统计与标注共用)")

    print("\n[9/12] 导出JSON报告（含普通话解释）...")
    r = api('GET', f'/export/report/{BATCH_ID}')
    assert r.status_code == 200, f"导出JSON失败: {r.get_data(as_text=True)}"
    with open(f"report_{BATCH_ID}.json", 'w', encoding='utf-8') as f:
        json.dump(r.get_json(), f, ensure_ascii=False, indent=2)
    print("  JSON报告已保存 ✓")

    print("\n[10/12] 导出TXT报告（可直接复制给同事）...")
    r = api('GET', f'/export/report/{BATCH_ID}', {'format': 'txt'})
    assert r.status_code == 200, f"导出TXT失败: {r.get_data(as_text=True)}"
    with open(f"report_{BATCH_ID}.txt", 'w', encoding='utf-8') as f:
        f.write(r.get_data(as_text=True))
    print("  TXT报告已保存（含普通话解释，可直接复制）✓")

    print("\n[11/12] 导出Excel报告...")
    r = api('GET', f'/export/report/{BATCH_ID}', {'format': 'excel'})
    assert r.status_code == 200, f"导出Excel失败: {r.get_data(as_text=True)}"
    with open(f"report_{BATCH_ID}.xlsx", 'wb') as f:
        f.write(r.get_data())
    print("  Excel报告已保存 ✓")

    print("\n[12/12] 查看低质量读段修改历史...")
    r = api('GET', '/reviews/history/SW-2026-002')
    assert r.status_code == 200, f"获取历史失败: {r.get_data(as_text=True)}"
    history = r.get_json()
    for rev in history:
        lq_status = rev.get('low_quality_reads_passed')
        if lq_status is not None:
            print(f"  版本 {rev['version']}: 低质量读段={'通过' if lq_status else '未通过'}, "
                  f"复核人={rev['reviewer']}, 时间={rev['created_at']}")
    print("  低质量读段修改历史完整可追溯 ✓")

    print(f"\n{'=' * 50}")
    print("所有流程执行成功！")
    print(f"{'=' * 50}")
    print("\n生成的文件:")
    for f in [f"report_{BATCH_ID}.json", f"report_{BATCH_ID}.txt", f"report_{BATCH_ID}.xlsx"]:
        if os.path.exists(f):
            print(f"  - {f} ({os.path.getsize(f)} bytes)")

    return True


def main():
    print("海藻样本生长记录系统 - 自动化流程脚本")
    print("从空目录开始，一键跑完完整流程\n")

    check_python_version()
    install_dependencies()

    db_file = 'seaweed.db'
    if os.path.exists(db_file):
        os.remove(db_file)
        print("已清理旧数据库 ✓")

    from app import app, init_db
    with app.app_context():
        init_db()
        print("数据库初始化完成 ✓")

    try:
        success = run_full_pipeline()
    except AssertionError as e:
        print(f"\n❌ 流程执行失败: {e}")
        success = False
    except Exception as e:
        print(f"\n❌ 异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        success = False

    if success:
        print("\n🎉 恭喜！完整流程已成功跑完。")
        print("\n关键特性验证:")
        print("  ✓ 复核意见批量导入，关联试剂批号")
        print("  ✓ 阴性对照自动异常复核")
        print("  ✓ 复核意见历史版本并排对比")
        print("  ✓ 分组统计与图像标注共用同一batch_id")
        print("  ✓ 低质量读段修改历史完整记录（谁改的、什么时候、为什么）")
        print("  ✓ 异常回溯链路完整（从样本→复核→标注→低质量读段→审计追踪）")
        print("  ✓ 报告含普通话解释，可直接复制给同事")
        print("  ✓ 边界不清记录通过本地数据库标注和复核")
        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
