"""
交互式终端界面
==============

提供给港口调度员使用的命令行界面, 包含:
  - 主菜单导航
  - 轨迹查看与复核入口 (不用重新导入就能修正)
  - 浮标数据补录
  - 重复计算
  - 报告导出
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional

from models import CalculationMethod, DriftStatus, Position
from inspection_workflow import InspectionWorkflow
from buoy_manager import BuoyDataManager
from report_exporter import (
    generate_text_report, generate_csv_report,
    generate_comparison_report, save_report_to_file,
    build_report_from_workflow, format_position
)


def clear_screen():
    os.system('clear' if os.name != 'nt' else 'cls')


def print_header(title: str):
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_menu(options):
    for i, (key, desc) in enumerate(options, 1):
        print(f"  [{key}] {desc}")
    print()


def pause():
    input("\n按回车键继续...")


def prompt_float(prompt: str, default: Optional[float] = None) -> Optional[float]:
    while True:
        s = input(prompt)
        if not s and default is not None:
            return default
        try:
            return float(s)
        except ValueError:
            print("  请输入有效的数字。")


def prompt_int(prompt: str, default: Optional[int] = None) -> Optional[int]:
    while True:
        s = input(prompt)
        if not s and default is not None:
            return default
        try:
            return int(s)
        except ValueError:
            print("  请输入有效的整数。")


class DriftPredictionCLI:
    """海上搜救漂移预测 - 终端界面"""

    def __init__(self, workflow: InspectionWorkflow, buoy_manager: BuoyDataManager):
        self.workflow = workflow
        self.buoy_manager = buoy_manager
        self.current_trajectory_id: Optional[str] = None
        self.running = True

    def run(self):
        while self.running:
            self._main_menu()

    # === 主菜单 ===

    def _main_menu(self):
        clear_screen()
        print_header("海上搜救漂移预测系统 v1.0")

        traj_count = len(self.workflow.list_trajectories())
        photo_count = len(self.workflow.list_photos())
        pending_count = len(self.workflow.get_pending_reviews())
        gap_count = len(self.buoy_manager.get_gap_report())

        print(f"  当前轨迹数: {traj_count}  |  照片数: {photo_count}")
        print(f"  待复核点: {pending_count}  |  数据缺口: {gap_count} 处")
        if self.current_trajectory_id:
            print(f"  当前选中轨迹: {self.current_trajectory_id}")
        print()

        options = [
            ("1", "查看/管理巡检照片"),
            ("2", "查看漂移轨迹列表"),
            ("3", "轨迹详情与复核 (复核入口)"),
            ("4", "补录浮标数据"),
            ("5", "重新计算轨迹"),
            ("6", "导出报告"),
            ("7", "查看运行历史"),
            ("8", "查看公式说明"),
            ("q", "退出系统"),
        ]
        print_menu(options)

        choice = input("请选择操作: ").strip().lower()

        if choice == "1":
            self._photo_menu()
        elif choice == "2":
            self._trajectory_list()
        elif choice == "3":
            self._trajectory_detail_and_review()
        elif choice == "4":
            self._supplement_menu()
        elif choice == "5":
            self._rerun_menu()
        elif choice == "6":
            self._export_menu()
        elif choice == "7":
            self._run_history_view()
        elif choice == "8":
            self._formula_view()
        elif choice == "q":
            self.running = False
            print("\n感谢使用, 再见!")
        else:
            print("无效选择, 请重试。")
            pause()

    # === 照片管理 ===

    def _photo_menu(self):
        clear_screen()
        print_header("巡检照片管理")

        photos = self.workflow.list_photos()
        if not photos:
            print("  暂无照片记录。")
        else:
            for i, photo in enumerate(photos, 1):
                linked = len(photo.linked_trajectory_ids)
                print(f"  {i}. [{photo.photo_id}] {photo.photo_path}")
                print(f"     拍摄时间: {photo.capture_time.strftime('%Y-%m-%d %H:%M')}")
                print(f"     估算位置: {format_position(photo.estimated_position.lat, photo.estimated_position.lon)}")
                print(f"     关联轨迹: {linked} 条")
                if photo.notes:
                    print(f"     备注: {photo.notes}")
                print()

        print()
        options = [
            ("1", "基于照片计算漂移轨迹"),
            ("b", "返回主菜单"),
        ]
        print_menu(options)

        choice = input("请选择: ").strip().lower()
        if choice == "1":
            self._calculate_from_photo()
        elif choice == "b":
            return
        else:
            pause()

    def _calculate_from_photo(self):
        photos = self.workflow.list_photos()
        if not photos:
            print("  没有可用的照片。")
            pause()
            return

        print("\n请选择要计算的照片:")
        for i, photo in enumerate(photos, 1):
            print(f"  {i}. {photo.photo_id}")

        idx = prompt_int("  输入序号 (默认1): ", default=1)
        if idx is None or idx < 1 or idx > len(photos):
            print("  无效序号。")
            pause()
            return

        photo = photos[idx - 1]

        print("\n选择计算方法:")
        print("  1. 综合漂移模型 (推荐)")
        print("  2. 风压漂移法")
        print("  3. 海流叠加法")
        method_choice = prompt_int("  输入选择 (默认1): ", default=1)
        method_map = {
            1: CalculationMethod.COMPREHENSIVE,
            2: CalculationMethod.LEEWAY,
            3: CalculationMethod.OCEAN_CURRENT,
        }
        method = method_map.get(method_choice or 1, CalculationMethod.COMPREHENSIVE)

        time_steps = prompt_int("  计算步数 (默认12步): ", default=12)
        step_hours = prompt_float("  每步时长(小时) (默认1.0): ", default=1.0)

        print("\n  正在计算...")
        try:
            traj = self.workflow.run_calculation(
                photo_id=photo.photo_id,
                method=method,
                time_steps=time_steps or 12,
                step_hours=step_hours or 1.0,
            )
            self.current_trajectory_id = traj.trajectory_id
            print(f"  ✓ 计算完成! 轨迹ID: {traj.trajectory_id}")
            print(f"    有效漂移点: {len(traj.drift_points)} 个")
            violations = [dp for dp in traj.drift_points if dp.in_restricted_zone]
            if violations:
                print(f"    ⚠ 禁航区越界: {len(violations)} 处, 请人工复核!")
        except Exception as e:
            print(f"  ✗ 计算失败: {e}")

        pause()

    # === 轨迹列表 ===

    def _trajectory_list(self):
        clear_screen()
        print_header("漂移轨迹列表")

        trajs = self.workflow.list_trajectories()
        if not trajs:
            print("  暂无轨迹记录。")
        else:
            for i, traj in enumerate(trajs, 1):
                marker = "◀" if traj.trajectory_id == self.current_trajectory_id else " "
                violations = sum(1 for dp in traj.drift_points if dp.in_restricted_zone)
                pending = sum(1 for dp in traj.drift_points
                              if dp.status in [DriftStatus.PENDING_REVIEW,
                                               DriftStatus.EXCEEDED_RESTRICTED,
                                               DriftStatus.LATE_NOTIFICATION])
                print(f"  {marker} {i}. [{traj.trajectory_id}] {traj.source}")
                print(f"     起点: {format_position(traj.start_position.lat, traj.start_position.lon)}")
                print(f"     漂移点: {len(traj.drift_points)} 个 | 越界: {violations} | 待复核: {pending}")
                print(f"     创建时间: {traj.created_at.strftime('%Y-%m-%d %H:%M')}")
                if traj.manually_confirmed:
                    print(f"     ✓ 已人工确认")
                print()

        print()
        options = [
            ("s", "选择当前轨迹"),
            ("b", "返回主菜单"),
        ]
        print_menu(options)

        choice = input("请选择: ").strip().lower()
        if choice == "s":
            idx = prompt_int("  输入轨迹序号: ", default=None)
            if idx and 1 <= idx <= len(trajs):
                self.current_trajectory_id = trajs[idx - 1].trajectory_id
                print(f"  已选中轨迹: {self.current_trajectory_id}")
        elif choice == "b":
            return

        pause()

    # === 轨迹详情与复核 (核心复核入口) ===

    def _trajectory_detail_and_review(self):
        clear_screen()
        print_header("轨迹详情与复核 (复核入口)")

        if not self.current_trajectory_id:
            trajs = self.workflow.list_trajectories()
            if not trajs:
                print("  暂无轨迹, 请先计算轨迹。")
                pause()
                return
            self.current_trajectory_id = trajs[-1].trajectory_id

        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        clean_result = self.workflow.get_clean_result(self.current_trajectory_id)

        if not traj:
            print("  轨迹不存在。")
            pause()
            return

        print(f"  轨迹ID: {traj.trajectory_id}")
        print(f"  来源: {traj.source}")
        print(f"  起点: {format_position(traj.start_position.lat, traj.start_position.lon)}")
        print(f"  漂移点数: {len(traj.drift_points)}")
        print(f"  复核次数: {traj.review_count}")
        print()

        print("-" * 50)
        print(f"{'序':>3} {'时间':>14} {'位置':>22} {'状态':>10} {'置信':>4} {'越界':>4}")
        print("-" * 50)

        for i, dp in enumerate(traj.drift_points):
            time_str = dp.position.timestamp.strftime('%m-%d %H:%M')
            pos_str = f"{dp.position.lat:.2f}°N,{dp.position.lon:.2f}°E"
            status_str = dp.status.value
            conf_str = f"{dp.confidence:.1f}"
            viol_str = "是" if dp.in_restricted_zone else "否"
            marker = " "
            if dp.status in [DriftStatus.EXCEEDED_RESTRICTED, DriftStatus.LATE_NOTIFICATION,
                             DriftStatus.PENDING_REVIEW]:
                marker = "!"
            print(f"{marker}{i+1:>2}. {time_str:>14} {pos_str:>22} {status_str:>10} {conf_str:>4} {viol_str:>4}")

        print("-" * 50)
        print()

        if clean_result:
            sig = clean_result
            if clean_result.modified_points or clean_result.removed_points:
                print(f"  💡 提示: 该轨迹经过清洗, 有 {len(clean_result.modified_points)} 个点被修改, "
                      f"{len(clean_result.removed_points)} 个点被删除。")
                print(f"     可在菜单中查看清洗前后对比。")
                print()

        pending = self.workflow.get_pending_reviews(self.current_trajectory_id)
        if pending:
            print(f"  ⚠ 有 {len(pending)} 个待复核点, 建议及时处理。")
            print()

        options = [
            ("1", "查看某点详情"),
            ("2", "人工复核某点"),
            ("3", "批量确认正常点"),
            ("4", "查看清洗前后对比"),
            ("5", "查看公式说明"),
            ("b", "返回主菜单"),
        ]
        print_menu(options)

        choice = input("请选择操作: ").strip().lower()

        if choice == "1":
            self._view_point_detail()
        elif choice == "2":
            self._review_single_point()
        elif choice == "3":
            self._batch_confirm()
        elif choice == "4":
            self._view_clean_comparison()
        elif choice == "5":
            self._formula_view()
        elif choice == "b":
            return
        else:
            pause()

    def _view_point_detail(self):
        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        if not traj:
            return

        idx = prompt_int("  输入点序号: ", default=None)
        if idx is None or idx < 1 or idx > len(traj.drift_points):
            print("  无效序号。")
            pause()
            return

        dp = traj.drift_points[idx - 1]
        print()
        print("  " + "-" * 40)
        print(f"  第 {idx} 号漂移点详情")
        print("  " + "-" * 40)
        print(f"  时间: {dp.position.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  位置: {format_position(dp.position.lat, dp.position.lon)}")
        print(f"  状态: {dp.status.value}")
        print(f"  置信度: {dp.confidence:.2f}")
        print(f"  计算方法: {dp.calc_method.value if dp.calc_method else '-'}")
        print(f"  来源浮标: {dp.source_buoy or '-'}")
        print(f"  是否在禁航区: {'是' if dp.in_restricted_zone else '否'}")
        if dp.restricted_zone_id:
            print(f"  禁航区ID: {dp.restricted_zone_id}")
        if dp.notes:
            print(f"  备注:")
            for note in dp.notes:
                print(f"    - {note}")
        print("  " + "-" * 40)
        pause()

    def _review_single_point(self):
        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        if not traj:
            return

        idx = prompt_int("  输入要复核的点序号: ", default=None)
        if idx is None or idx < 1 or idx > len(traj.drift_points):
            print("  无效序号。")
            pause()
            return

        dp = traj.drift_points[idx - 1]
        print()
        print(f"  当前状态: {dp.status.value}")
        print(f"  位置: {format_position(dp.position.lat, dp.position.lon)}")
        print()

        print("  选择复核动作:")
        print("    1. 确认无误 (标记为已确认)")
        print("    2. 驳回/需重算 (标记为待复核)")
        print("    3. 修改状态")
        print("    4. 添加备注")
        print("    0. 取消")

        action_choice = prompt_int("  输入选择: ", default=0)

        if action_choice == 0:
            return

        reviewer = input("  复核人姓名: ").strip() or "未知调度员"
        comment = input("  复核意见 (可选): ").strip()

        try:
            if action_choice == 1:
                review = self.workflow.review_point(
                    trajectory_id=self.current_trajectory_id,
                    point_index=idx - 1,
                    reviewer=reviewer,
                    action="confirm",
                    comment=comment
                )
                print(f"  ✓ 已确认。复核ID: {review.review_id}")

            elif action_choice == 2:
                review = self.workflow.review_point(
                    trajectory_id=self.current_trajectory_id,
                    point_index=idx - 1,
                    reviewer=reviewer,
                    action="reject",
                    comment=comment
                )
                print(f"  ✓ 已驳回。复核ID: {review.review_id}")

            elif action_choice == 3:
                print("\n  可选状态:")
                statuses = list(DriftStatus)
                for j, s in enumerate(statuses, 1):
                    print(f"    {j}. {s.value}")
                s_choice = prompt_int("  选择新状态: ", default=1)
                if s_choice and 1 <= s_choice <= len(statuses):
                    new_status = statuses[s_choice - 1]
                    review = self.workflow.review_point(
                        trajectory_id=self.current_trajectory_id,
                        point_index=idx - 1,
                        reviewer=reviewer,
                        action="modify",
                        comment=comment,
                        new_status=new_status
                    )
                    print(f"  ✓ 状态已修改。复核ID: {review.review_id}")

            elif action_choice == 4:
                note = input("  备注内容: ").strip()
                if note:
                    dp.notes.append(f"复核备注: {note} (by {reviewer})")
                    print("  ✓ 备注已添加。")

        except Exception as e:
            print(f"  ✗ 操作失败: {e}")

        pause()

    def _batch_confirm(self):
        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        if not traj:
            return

        normal_count = sum(
            1 for dp in traj.drift_points
            if dp.status == DriftStatus.NORMAL or dp.status == DriftStatus.CONFIRMED
        )
        print(f"  当前正常/已确认点: {normal_count} 个")
        print(f"  待处理点: {len(traj.drift_points) - normal_count} 个")
        print()
        print("  1. 确认所有正常点")
        print("  2. 确认前N个正常点")
        print("  0. 返回")

        choice = prompt_int("  选择: ", default=0)

        if choice == 0:
            return

        reviewer = input("  复核人姓名: ").strip() or "批量复核"

        confirmed = 0
        if choice == 1:
            for i, dp in enumerate(traj.drift_points):
                if dp.status == DriftStatus.NORMAL:
                    self.workflow.review_point(
                        trajectory_id=self.current_trajectory_id,
                        point_index=i,
                        reviewer=reviewer,
                        action="confirm",
                        comment="批量确认"
                    )
                    confirmed += 1
        elif choice == 2:
            n = prompt_int("  确认前几个: ", default=3)
            for i in range(min(n or 3, len(traj.drift_points))):
                dp = traj.drift_points[i]
                if dp.status == DriftStatus.NORMAL:
                    self.workflow.review_point(
                        trajectory_id=self.current_trajectory_id,
                        point_index=i,
                        reviewer=reviewer,
                        action="confirm",
                        comment="批量确认"
                    )
                    confirmed += 1

        print(f"  ✓ 批量确认完成, 共确认 {confirmed} 个点。")
        pause()

    def _view_clean_comparison(self):
        clean_result = self.workflow.get_clean_result(self.current_trajectory_id)
        if not clean_result:
            print("  该轨迹没有清洗记录。")
            pause()
            return

        print()
        report = generate_comparison_report(clean_result)
        print(report)
        pause()

    # === 补录菜单 ===

    def _supplement_menu(self):
        clear_screen()
        print_header("浮标数据补录")

        gap_report = self.buoy_manager.get_gap_report()

        if not gap_report:
            print("  ✓ 所有浮标数据完整, 无需补录。")
        else:
            print(f"  共有 {len(gap_report)} 个浮标存在数据缺口:")
            print()
            for i, (buoy_id, fields) in enumerate(gap_report.items(), 1):
                buoy = self.buoy_manager.get_buoy_by_id(buoy_id)
                pos_str = ""
                if buoy:
                    pos_str = format_position(buoy.position.lat, buoy.position.lon)
                print(f"  {i}. 浮标 {buoy_id} ({pos_str})")
                print(f"     缺失: {', '.join(fields)}")
                print()

        print()
        options = [
            ("1", "补录某个浮标的数据"),
            ("2", "查看所有浮标状态"),
            ("b", "返回主菜单"),
        ]
        print_menu(options)

        choice = input("请选择: ").strip().lower()

        if choice == "1":
            self._do_supplement()
        elif choice == "2":
            self._view_all_buoys()
        elif choice == "b":
            return

        pause()

    def _do_supplement(self):
        buoy_id = input("  输入浮标ID: ").strip()
        buoy = self.buoy_manager.get_buoy_by_id(buoy_id)
        if not buoy:
            print(f"  浮标 {buoy_id} 不存在。")
            pause()
            return

        print(f"\n  当前浮标 {buoy_id} 数据:")
        print(f"    风速: {buoy.wind_speed if buoy.wind_speed else '缺失'} 节")
        print(f"    风向: {buoy.wind_direction if buoy.wind_direction else '缺失'} 度")
        print(f"    流速: {buoy.current_speed if buoy.current_speed else '缺失'} 节")
        print(f"    流向: {buoy.current_direction if buoy.current_direction else '缺失'} 度")
        print(f"    波高: {buoy.wave_height if buoy.wave_height else '缺失'} m")
        print()

        updates = {}

        ws = input("  新的风速 (节) (回车跳过): ").strip()
        if ws:
            try:
                updates['wind_speed'] = float(ws)
            except ValueError:
                print("  风速格式无效, 跳过。")

        wd = input("  新的风向 (度) (回车跳过): ").strip()
        if wd:
            try:
                updates['wind_direction'] = float(wd)
            except ValueError:
                print("  风向格式无效, 跳过。")

        cs = input("  新的流速 (节) (回车跳过): ").strip()
        if cs:
            try:
                updates['current_speed'] = float(cs)
            except ValueError:
                print("  流速格式无效, 跳过。")

        cd = input("  新的流向 (度) (回车跳过): ").strip()
        if cd:
            try:
                updates['current_direction'] = float(cd)
            except ValueError:
                print("  流向格式无效, 跳过。")

        wh = input("  新的波高 (m) (回车跳过): ").strip()
        if wh:
            try:
                updates['wave_height'] = float(wh)
            except ValueError:
                print("  波高格式无效, 跳过。")

        if not updates:
            print("  未输入任何更新数据。")
            pause()
            return

        success = self.buoy_manager.update_buoy_data(buoy_id, **updates)
        if success:
            print(f"  ✓ 浮标 {buoy_id} 数据已更新。")
            print("  💡 提示: 建议对关联轨迹重新计算以更新结果。")
        else:
            print("  ✗ 更新失败。")

    def _view_all_buoys(self):
        print()
        buoys = self.buoy_manager.buoys
        print(f"  共有 {len(buoys)} 个浮标:")
        print()
        for i, b in enumerate(buoys, 1):
            status = "✓有效" if b.is_valid else "✗失效"
            completeness = b.completeness_score() * 100
            pos_str = format_position(b.position.lat, b.position.lon)
            print(f"  {i:>2}. [{b.buoy_id}] {status} | 完整度: {completeness:.0f}%")
            print(f"      位置: {pos_str}")
            details = []
            if b.wind_speed is not None:
                details.append(f"风{b.wind_speed:.1f}节")
            if b.current_speed is not None:
                details.append(f"流{b.current_speed:.1f}节")
            if b.wave_height is not None:
                details.append(f"浪{b.wave_height:.1f}m")
            print(f"      数据: {', '.join(details) if details else '无数据'}")
            if not b.is_valid and b.invalid_reason:
                print(f"      失效原因: {b.invalid_reason}")
            print()

    # === 重新计算 ===

    def _rerun_menu(self):
        clear_screen()
        print_header("重新计算轨迹")

        if not self.current_trajectory_id:
            print("  请先选择一条轨迹。")
            pause()
            return

        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        if not traj:
            print("  轨迹不存在。")
            pause()
            return

        print(f"  当前轨迹: {self.current_trajectory_id}")
        print(f"  来源: {traj.source}")
        print(f"  当前漂移点数: {len(traj.drift_points)}")
        print()

        print("  重新计算说明:")
        print("    - 补录浮标数据后, 重新计算可获得更准确结果")
        print("    - 调整参数后, 可对比不同计算方法的差异")
        print("    - 每次重算都会保留历史记录")
        print()

        print("  选择计算方法 (默认使用原方法):")
        print("    1. 综合漂移模型")
        print("    2. 风压漂移法")
        print("    3. 海流叠加法")
        print("    0. 保持原方法")

        method_choice = prompt_int("  输入选择: ", default=0)
        method_map = {
            1: CalculationMethod.COMPREHENSIVE,
            2: CalculationMethod.LEEWAY,
            3: CalculationMethod.OCEAN_CURRENT,
        }
        kwargs = {}
        if method_choice and method_choice in method_map:
            kwargs['method'] = method_map[method_choice]

        time_steps = prompt_int("  计算步数 (回车保持不变): ", default=None)
        if time_steps:
            kwargs['time_steps'] = time_steps

        step_hours = prompt_float("  每步时长(小时) (回车保持不变): ", default=None)
        if step_hours:
            kwargs['step_hours'] = step_hours

        confirm = input(f"\n  确认重新计算轨迹 {self.current_trajectory_id}? (y/N): ").strip().lower()
        if confirm != 'y':
            print("  已取消。")
            pause()
            return

        try:
            new_traj = self.workflow.rerun_calculation(
                trajectory_id=self.current_trajectory_id,
                **kwargs
            )
            self.current_trajectory_id = new_traj.trajectory_id
            print(f"  ✓ 重新计算完成! 新轨迹ID: {new_traj.trajectory_id}")
            print(f"    漂移点: {len(new_traj.drift_points)} 个")
        except Exception as e:
            print(f"  ✗ 重算失败: {e}")

        pause()

    # === 报告导出 ===

    def _export_menu(self):
        clear_screen()
        print_header("报告导出")

        if not self.current_trajectory_id:
            print("  请先选择一条轨迹。")
            pause()
            return

        traj = self.workflow.get_trajectory(self.current_trajectory_id)
        if not traj:
            print("  轨迹不存在。")
            pause()
            return

        report = build_report_from_workflow(self.current_trajectory_id, self.workflow)

        print(f"  轨迹ID: {self.current_trajectory_id}")
        print(f"  漂移点: {len(traj.drift_points)} 个")
        print(f"  越界点: {len(report.restricted_zone_violations)} 个")
        print(f"  数据缺口: {len(report.missing_buoys)} 个浮标")
        print()

        options = [
            ("1", "在屏幕上显示完整报告"),
            ("2", "显示清洗前后对比报告"),
            ("3", "导出文本报告到文件"),
            ("4", "导出CSV报告到文件"),
            ("b", "返回主菜单"),
        ]
        print_menu(options)

        choice = input("请选择: ").strip().lower()

        if choice == "1":
            text = generate_text_report(report, include_formula=True, include_details=True)
            print()
            print(text)
        elif choice == "2":
            clean_result = self.workflow.get_clean_result(self.current_trajectory_id)
            if clean_result:
                text = generate_comparison_report(clean_result)
                print()
                print(text)
            else:
                print("  没有清洗记录。")
        elif choice == "3":
            filename = input("  文件名 (默认 report.txt): ").strip() or "report.txt"
            text = generate_text_report(report, include_formula=True)
            try:
                save_report_to_file(text, filename)
                print(f"  ✓ 报告已保存到 {filename}")
            except Exception as e:
                print(f"  ✗ 保存失败: {e}")
        elif choice == "4":
            filename = input("  文件名 (默认 report.csv): ").strip() or "report.csv"
            csv_text = generate_csv_report(report)
            try:
                save_report_to_file(csv_text, filename)
                print(f"  ✓ CSV报告已保存到 {filename}")
            except Exception as e:
                print(f"  ✗ 保存失败: {e}")
        elif choice == "b":
            return

        pause()

    # === 运行历史 ===

    def _run_history_view(self):
        clear_screen()
        print_header("运行历史记录")

        history = self.workflow.get_run_history()
        if not history:
            print("  暂无运行记录。")
        else:
            for h in history:
                type_map = {
                    "initial": "初次计算",
                    "re-run": "重新计算",
                    "supplement": "补录后重算",
                    "review": "复核后",
                }
                type_str = type_map.get(h.run_type, h.run_type)
                print(f"  [{h.run_id}] {type_str} | 轨迹: {h.trajectory_id}")
                print(f"     时间: {h.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"     漂移点: {h.point_count} 个 | 失败: {h.failure_count} 个")
                if h.notes:
                    print(f"     备注: {h.notes}")
                print()

        reviews = self.workflow.get_review_history()
        if reviews:
            print("-" * 50)
            print(f"  复核记录 (共 {len(reviews)} 条):")
            for r in reviews[-5:]:  # 只显示最近5条
                action_map = {
                    "confirm": "确认",
                    "reject": "驳回",
                    "modify": "修改",
                }
                action_str = action_map.get(r.action, r.action)
                print(f"    [{r.review_id}] {r.reviewer} {action_str}了"
                      f"轨迹{r.trajectory_id}第{r.point_index+1}点")
                if r.comment:
                    print(f"       意见: {r.comment}")
            print()

        pause()

    # === 公式说明 ===

    def _formula_view(self):
        from drift_calculator import get_formula_info

        clear_screen()
        print_header("计算方法与公式说明")

        formula_info = get_formula_info()
        for name, info in formula_info.items():
            print(f"▶ {name}")
            print(f"  公式:     {info['formula']}")
            print(f"  参数:     {info['params']}")
            print(f"  单位:     {info['unit']}")
            print(f"  适用范围: {info['scope']}")
            print(f"  失败原因: {', '.join(info['failures'])}")
            print()

        print("【单位说明】")
        print("  - 速度: 节 (knots, 1节 = 1海里/小时 ≈ 1.852 km/h)")
        print("  - 距离: 海里 (nautical miles, 1海里 ≈ 1.852 km)")
        print("  - 角度: 度 (°), 方位角 0°=正北, 顺时针增加")
        print("  - 时间: 小时 (h)")
        print()

        pause()


def run_cli(workflow, buoy_manager):
    cli = DriftPredictionCLI(workflow, buoy_manager)
    cli.run()
