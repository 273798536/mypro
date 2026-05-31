#!/usr/bin/env python3
import sys
import requests
import json

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def check_server():
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"✓ 服务运行正常: {r.json()}")
        return True
    except Exception as e:
        print(f"✗ 无法连接到服务: {e}")
        print("请先启动服务: bash start_server.sh")
        return False

def demo_1_generate_clean_sample():
    print_section("样例1: 生成纯净样例数据（不含异常）")
    r = requests.post(f"{BASE_URL}/samples/generate/clean", 
                      params={"event_tag": "EVT_DEMO_CLEAN"})
    result = r.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result["event_tag"]

def demo_2_generate_problem_sample():
    print_section("样例2: 生成含异常的样例数据（到时缺失/台站重复/波速错）")
    r = requests.post(f"{BASE_URL}/samples/generate",
                      params={"event_tag": "EVT_DEMO_PROBLEM"})
    result = r.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result["event_tag"]

def demo_3_check_pending_actions():
    print_section("查看待处理事项")
    r = requests.get(f"{BASE_URL}/audit/pending-actions")
    result = r.json()
    print(f"待处理总数: {result['total_pending']}")
    print(f"按审核人分类: {json.dumps(result['by_verifier'], ensure_ascii=False)}")
    print("\n具体待办:")
    for item in result["items"][:5]:
        print(f"  - {item['event_tag']} {item['station_code']} {item['phase']} "
              f"[{item['status']}] → {item['next_verifier']}: {item['action_required']}")

def demo_4_fix_missing_arrival(event_tag):
    print_section("处理到时缺失: 补录到时并确认")
    r = requests.get(f"{BASE_URL}/arrivals", 
                     params={"event_tag": event_tag, "status": "missing_arrival"})
    missing = r.json()
    if not missing:
        print("没有到时缺失的记录")
        return
    
    arr = missing[0]
    print(f"待补录记录: {arr['station']['station_code']} {arr['phase']}")
    
    r = requests.put(f"{BASE_URL}/arrivals/{arr['id']}",
                     json={"arrival_time": 30012.456, "arrival_time_str": "08:20:12.456"})
    print(f"补录到时: {r.status_code}")
    
    r = requests.patch(f"{BASE_URL}/arrivals/{arr['id']}/status",
                      json={
                          "status": "normal",
                          "remark": "到时已补录完成",
                          "operator": "data_collector_01"
                      })
    print(f"状态确认: {r.status_code} → {r.json()['status']}")

def demo_5_fix_duplicate_station(event_tag):
    print_section("处理台站重复: 剔除重复台站")
    r = requests.get(f"{BASE_URL}/arrivals",
                     params={"event_tag": event_tag, "status": "duplicate_station"})
    duplicates = r.json()
    if not duplicates:
        print("没有台站重复的记录")
        return
    
    dup_station_ids = {a["station_id"] for a in duplicates}
    print(f"涉及重复台站: {dup_station_ids}")
    
    for arr in duplicates:
        r = requests.patch(f"{BASE_URL}/arrivals/{arr['id']}/status",
                          json={
                              "status": "rejected",
                              "remark": "重复台站数据已剔除",
                              "operator": "station_manager_01"
                          })
        print(f"  剔除 {arr['station']['station_code']} {arr['phase']}: {r.status_code}")

def demo_6_run_inversion(event_tag):
    print_section("执行震源反演")
    r = requests.post(f"{BASE_URL}/inversion",
                     json={
                         "event_tag": event_tag,
                         "residual_threshold": 2.0,
                         "max_iterations": 20
                     })
    if r.status_code != 200:
        print(f"反演失败: {r.status_code} {r.text}")
        return
    
    result = r.json()
    print(f"✓ 反演完成")
    print(f"  震中: ({result['latitude']:.4f}°N, {result['longitude']:.4f}°E)")
    print(f"  深度: {result['depth']:.2f}km")
    print(f"  发震时刻: {result['origin_time_str']}")
    print(f"  残差均值: {result['residual_mean']:.4f}s")
    print(f"  使用台站: {result['num_stations_used']}, 剔除: {result['num_stations_rejected']}")
    print(f"  收敛: {result['convergence']}, 迭代: {result['iterations']}次")
    return result["id"]

def demo_7_check_inversion_detail(inv_id):
    print_section("查看反演明细（含台站残差）")
    r = requests.get(f"{BASE_URL}/inversion/{inv_id}")
    result = r.json()
    print(f"{'台站':<8}{'震相':<6}{'观测到时':<14}{'计算到时':<14}{'残差(s)':<12}{'状态':<10}{'剔除原因'}")
    print("-"*90)
    for sr in result["stations_used"]:
        status = "剔除" if sr["is_rejected"] else "使用"
        reject_reason = sr["reject_reason"] or ""
        residual = f"{sr['residual']:.4f}" if sr["residual"] is not None else "-"
        print(f"{sr['station_code']:<8}{sr['phase']:<6}"
              f"{sr['observed_time']:<14.3f}{sr['calculated_time']:<14.3f}"
              f"{residual:<12}{status:<10}{reject_reason}")

def demo_8_trace_station_to_result():
    print_section("双向追溯: 台站 → 到时 → 反演结果")
    r = requests.get(f"{BASE_URL}/stations")
    stations = r.json()
    if not stations:
        print("没有台站数据")
        return
    
    st = stations[0]
    print(f"选择台站: {st['station_code']} ({st['name']})")
    
    r = requests.get(f"{BASE_URL}/stations/{st['id']}/trace")
    trace = r.json()
    print(f"\n{trace['message']}")
    print(f"关联到时记录: {len(trace['arrivals'])} 条")
    for arr in trace["arrivals"][:3]:
        print(f"  - {arr['event_tag']} {arr['phase']}: "
              f"{arr['arrival_time_str'] or '缺失'} [{arr['status']}]")
    print(f"关联反演结果: {len(trace['inversions'])} 次")
    for inv in trace["inversions"]:
        print(f"  - {inv['event_tag']}: ({inv['latitude']:.4f}, {inv['longitude']:.4f})")

def demo_9_trace_result_to_arrival(inv_id):
    print_section("双向追溯: 反演结果 → 到时 → 台站")
    r = requests.get(f"{BASE_URL}/inversion/{inv_id}/trace")
    trace = r.json()
    print(f"\n{trace['message']}")
    print(f"关联到时记录: {len(trace['arrivals'])} 条")
    for arr in trace["arrivals"][:5]:
        station_name = arr['station']['name'] if arr.get('station') else '未知'
        print(f"  - {arr['station']['station_code'] if arr.get('station') else '未知'} "
              f"({station_name}) {arr['phase']}: "
              f"{arr['arrival_time_str'] or '缺失'} [{arr['status']}]")

def demo_10_add_magnitude_remark(event_tag):
    print_section("补录震级备注并验证变更追踪")
    r = requests.get(f"{BASE_URL}/arrivals", params={"event_tag": event_tag})
    arrivals = r.json()
    if not arrivals:
        print("没有到时记录")
        return
    
    arr = arrivals[0]
    print(f"选中记录: {arr['station']['station_code']} {arr['phase']}")
    print(f"当前 has_magnitude_update: {arr['has_magnitude_update']}")
    
    r = requests.patch(f"{BASE_URL}/arrivals/{arr['id']}/magnitude",
                      json={
                          "magnitude_remark": "ML2.8, 震级已复核",
                          "operator": "teacher_01",
                          "change_reason": "初震级偏小，已重新量取振幅"
                      })
    result = r.json()
    print(f"补录后 has_magnitude_update: {result['has_magnitude_update']}")
    print(f"震级备注: {result['magnitude_remark']}")
    
    print("\n变更日志:")
    r = requests.get(f"{BASE_URL}/audit/arrival/{arr['id']}")
    logs = r.json()
    for log in logs:
        print(f"  [{log['created_at']}] {log['operator']} "
              f"{log['field_name']}: {log['old_value']} → {log['new_value']} "
              f"({log['change_reason'] or ''})")

def demo_11_export_results(event_tag):
    print_section("导出结果")
    r = requests.get(f"{BASE_URL}/export/event/{event_tag}/all")
    data = r.json()
    print(f"导出完整数据包: 台站{len(data['stations'])}个, "
          f"到时{len(data['arrivals'])}条, "
          f"{'有反演结果' if data['inversion_result'] else '无反演结果'}")
    
    print(f"\n反演结果CSV已准备: GET {BASE_URL}/export/inversion/{data['inversion_result']['id']}/csv")
    print(f"事件报告已准备: GET {BASE_URL}/export/report/event/{event_tag}/txt")

def demo_12_generate_report(event_tag):
    print_section("生成事件报告 (月底复盘用)")
    r = requests.get(f"{BASE_URL}/export/report/event/{event_tag}/txt")
    print(r.text)

def demo_13_get_stats():
    print_section("查看数据统计")
    r = requests.get(f"{BASE_URL}/samples/stats")
    stats = r.json()
    print(f"台站: {stats['stations']} | 到时: {stats['arrivals']} | "
          f"波速模型: {stats['velocity_models']} | 反演结果: {stats['inversion_results']}")
    print(f"到时状态分布: {json.dumps(stats['arrival_status'], ensure_ascii=False)}")
    print(f"事件列表: {stats['events']}")

def main():
    print("\n" + "█"*60)
    print("█  地震波到时定位系统 - 演示脚本")
    print("█"*60)
    
    if not check_server():
        sys.exit(1)
    
    clean_event = demo_1_generate_clean_sample()
    problem_event = demo_2_generate_problem_sample()
    
    demo_3_check_pending_actions()
    demo_4_fix_missing_arrival(problem_event)
    demo_5_fix_duplicate_station(problem_event)
    
    inv_id = demo_6_run_inversion(clean_event)
    
    if inv_id:
        demo_7_check_inversion_detail(inv_id)
        demo_9_trace_result_to_arrival(inv_id)
    
    demo_8_trace_station_to_result()
    demo_10_add_magnitude_remark(clean_event)
    demo_11_export_results(clean_event)
    demo_12_generate_report(clean_event)
    demo_13_get_stats()
    
    print("\n" + "="*60)
    print("  演示完成!")
    print("="*60)
    print(f"\n常用接口:")
    print(f"  API文档: http://localhost:8000/docs")
    print(f"  红oc文档: http://localhost:8000/redoc")
    print(f"  台站管理: GET/POST/PUT/DELETE {BASE_URL}/stations")
    print(f"  到时记录: GET/POST/PUT/DELETE {BASE_URL}/arrivals")
    print(f"  震源反演: POST {BASE_URL}/inversion")
    print(f"  台站追溯: GET {BASE_URL}/stations/{{id}}/trace")
    print(f"  结果追溯: GET {BASE_URL}/inversion/{{id}}/trace")
    print(f"  导出CSV: GET {BASE_URL}/export/inversion/{{id}}/csv")
    print(f"  事件报告: GET {BASE_URL}/export/report/event/{{tag}}/txt")

if __name__ == "__main__":
    main()
