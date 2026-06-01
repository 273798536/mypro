#!/usr/bin/env python3
import argparse
import json
import os
import shutil
from pathlib import Path
from emergency_dispatch import (
    DispatchContext, Warehouse, Road, Vehicle, Demand,
    RoadStatus, Dispatcher, ReportGenerator
)


def load_json_file(filepath: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_context_from_dir(data_dir: str, context_name: str) -> DispatchContext:
    context = DispatchContext(name=context_name)
    
    warehouse_file = os.path.join(data_dir, 'warehouses.json')
    if os.path.exists(warehouse_file):
        warehouses_data = load_json_file(warehouse_file)
        for w_data in warehouses_data:
            warehouse = Warehouse(
                warehouse_id=w_data['id'],
                name=w_data['name'],
                location=w_data['location'],
                x=w_data.get('x', 0),
                y=w_data.get('y', 0),
                inventory=w_data.get('inventory', {})
            )
            context.warehouses[warehouse.warehouse_id] = warehouse
    
    roads_file = os.path.join(data_dir, 'roads.json')
    if os.path.exists(roads_file):
        roads_data = load_json_file(roads_file)
        for r_data in roads_data:
            road = Road(
                road_id=r_data['id'],
                from_location=r_data['from'],
                to_location=r_data['to'],
                distance=r_data['distance'],
                status=RoadStatus[r_data.get('status', 'OPEN').upper()]
            )
            context.roads[road.road_id] = road
    
    vehicles_file = os.path.join(data_dir, 'vehicles.json')
    if os.path.exists(vehicles_file):
        vehicles_data = load_json_file(vehicles_file)
        for v_data in vehicles_data:
            vehicle = Vehicle(
                vehicle_id=v_data['id'],
                plate_number=v_data['plate_number'],
                capacity=v_data['capacity']
            )
            context.vehicles[vehicle.vehicle_id] = vehicle
    
    demands_file = os.path.join(data_dir, 'demands.json')
    if os.path.exists(demands_file):
        demands_data = load_json_file(demands_file)
        for d_data in demands_data:
            demand = Demand(
                demand_id=d_data['id'],
                location=d_data['location'],
                x=d_data.get('x', 0),
                y=d_data.get('y', 0),
                items=d_data.get('items', {}),
                priority=d_data.get('priority', 1)
            )
            context.demands[demand.demand_id] = demand
    
    return context


def create_new_context(base_dir: str, context_name: str, template_dir: str = None):
    context_dir = os.path.join(base_dir, context_name)
    
    if os.path.exists(context_dir):
        print(f"目录已存在: {context_dir}")
        return context_dir
    
    os.makedirs(context_dir, exist_ok=True)
    
    template_files = ['warehouses.json', 'roads.json', 'vehicles.json', 'demands.json']
    
    for template_file in template_files:
        target_file = os.path.join(context_dir, template_file)
        if template_dir and os.path.exists(os.path.join(template_dir, template_file)):
            shutil.copy2(
                os.path.join(template_dir, template_file),
                target_file
            )
        else:
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write('[]\n')
    
    print(f"已创建新的调度目录: {context_dir}")
    return context_dir


def run_dispatch(data_dir: str, output_dir: str = None, rerun: bool = False):
    context_name = os.path.basename(data_dir)
    print(f"正在加载调度上下文: {context_name}")
    
    context = build_context_from_dir(data_dir, context_name)
    dispatcher = Dispatcher(context)
    
    if rerun:
        print("重置状态，重新运行调度...")
        dispatcher.reset_for_rerun()
    
    print(f"仓库: {len(context.warehouses)} 个")
    print(f"道路: {len(context.roads)} 条")
    print(f"车辆: {len(context.vehicles)} 辆")
    print(f"需求: {len(context.demands)} 个")
    
    blocked_roads = [r for r in context.roads.values() if r.status == RoadStatus.BLOCKED]
    if blocked_roads:
        print(f"\n警告: 检测到 {len(blocked_roads)} 条中断道路:")
        for road in blocked_roads:
            print(f"  - [{road.road_id}] {road.from_location} -> {road.to_location}")
    
    print("\n开始执行调度...")
    source_file = os.path.basename(data_dir)
    result = dispatcher.dispatch(source_file=source_file)
    
    print(f"\n调度完成!")
    print(f"成功分配: {len(result.assigned_routes)} 条路线")
    print(f"未分配需求: {len(result.unassigned_demands)} 个")
    print(f"总配送距离: {result.total_distance:.2f} km")
    
    if context.errors:
        print(f"\n检测到 {len(context.errors)} 个问题:")
        for error in context.errors:
            print(f"  - [{error.error_type.value}] {error.location}: {error.next_step}")
    
    if output_dir is None:
        output_dir = os.path.join(data_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)
    
    reporter = ReportGenerator(context)
    
    json_report_path = os.path.join(output_dir, 'report.json')
    reporter.export_json(result, json_report_path)
    
    text_report_path = os.path.join(output_dir, 'report.txt')
    reporter.export_text(result, text_report_path)
    
    print(f"\n报告已导出:")
    print(f"  - JSON: {json_report_path}")
    print(f"  - 文本: {text_report_path}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description='应急物资调度系统')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    new_parser = subparsers.add_parser('new', help='创建新的调度目录')
    new_parser.add_argument('name', help='调度目录名称')
    new_parser.add_argument('--template', help='模板目录')
    new_parser.add_argument('--base-dir', default='./dispatches', help='基础目录')
    
    run_parser = subparsers.add_parser('run', help='执行调度计算')
    run_parser.add_argument('data_dir', help='数据目录')
    run_parser.add_argument('--output', help='输出目录')
    run_parser.add_argument('--rerun', action='store_true', help='重置状态重新运行')
    
    args = parser.parse_args()
    
    if args.command == 'new':
        create_new_context(args.base_dir, args.name, args.template)
    
    elif args.command == 'run':
        run_dispatch(args.data_dir, args.output, args.rerun)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
