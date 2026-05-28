#!/usr/bin/env python3
import argparse
import sys
import os
from pathlib import Path
from route_planner import FuelOptimizedRoutePlanner
from config import AircraftConfig

def create_sample_data(output_dir: str = "sample_data"):
    os.makedirs(output_dir, exist_ok=True)
    
    waypoints_csv = os.path.join(output_dir, "waypoints.csv")
    with open(waypoints_csv, 'w', encoding='utf-8') as f:
        f.write("id,name,latitude,longitude,altitude_m,type,order,stay_time_s\n")
        f.write("wp001,起飞点,31.2304,121.4737,100,start,1,0\n")
        f.write("wp002,检查点A,31.2350,121.4800,120,waypoint,2,0\n")
        f.write("wp003,检查点B,31.2400,121.4700,150,waypoint,3,0\n")
        f.write("wp004,检查点C,31.2380,121.4600,100,waypoint,4,0\n")
        f.write("wp005,降落点,31.2300,121.4650,80,end,5,0\n")
    
    wind_csv = os.path.join(output_dir, "wind.csv")
    with open(wind_csv, 'w', encoding='utf-8') as f:
        f.write("altitude_m,speed_m_s,direction_deg\n")
        f.write("50,8.0,45\n")
        f.write("100,10.0,50\n")
        f.write("150,12.0,55\n")
    
    nfz_geojson = os.path.join(output_dir, "no_fly_zones.geojson")
    import json
    nfz_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "nfz001",
                    "name": "机场禁飞区",
                    "min_altitude_m": 0,
                    "max_altitude_m": 500
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [121.465, 31.232],
                        [121.475, 31.232],
                        [121.475, 31.238],
                        [121.465, 31.238],
                        [121.465, 31.232]
                    ]]
                }
            }
        ]
    }
    with open(nfz_geojson, 'w', encoding='utf-8') as f:
        json.dump(nfz_data, f, ensure_ascii=False, indent=2)
    
    aircraft_json = os.path.join(output_dir, "aircraft.json")
    aircraft_params = {
        "model_name": "航模固定翼",
        "mass_kg": 2.5,
        "wing_area_m2": 0.5,
        "drag_coefficient": 0.03,
        "cruise_speed_m_s": 15.0,
        "battery_capacity_wh": 500.0
    }
    with open(aircraft_json, 'w', encoding='utf-8') as f:
        json.dump(aircraft_params, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 样例数据已创建在 {output_dir}/ 目录")
    print(f"   - {waypoints_csv}")
    print(f"   - {wind_csv}")
    print(f"   - {nfz_geojson}")
    print(f"   - {aircraft_json}")
    
    return {
        "waypoints": waypoints_csv,
        "wind": wind_csv,
        "no_fly_zones": nfz_geojson,
        "aircraft": aircraft_json
    }

def main():
    parser = argparse.ArgumentParser(
        description="✈️  航线最小燃油规划系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s --sample                              # 创建样例数据
  %(prog)s --waypoints waypoints.csv --wind wind.csv  # 计算航线
  %(prog)s --all sample_data/                    # 使用目录下所有数据
        """
    )
    
    parser.add_argument("--waypoints", "-w", help="航点CSV文件路径")
    parser.add_argument("--wind", "-d", help="风向风速CSV文件路径")
    parser.add_argument("--nfz", "-n", help="禁飞区GeoJSON文件路径")
    parser.add_argument("--aircraft", "-a", help="飞机参数JSON文件路径")
    parser.add_argument("--all", help="从指定目录加载所有数据文件")
    parser.add_argument("--sample", action="store_true", help="创建样例数据并运行计算")
    parser.add_argument("--output", "-o", default="output", help="输出目录")
    
    args = parser.parse_args()
    
    if args.sample:
        print("📦 创建样例数据...")
        sample_files = create_sample_data()
        
        print("\n🧮 开始计算最优航线...")
        planner = FuelOptimizedRoutePlanner()
        result = planner.run_full_pipeline(
            sample_files["waypoints"],
            sample_files["wind"],
            sample_files["no_fly_zones"],
            sample_files["aircraft"]
        )
        
        planner.print_summary(result["result"])
        
        print("📄 生成的报告:")
        for report_type, path in result["reports"].items():
            print(f"   - {report_type}: {path}")
        
        print("\n✅ 完成! 打开 output/route_planning_report.html 查看详细报告")
        return
    
    if args.all:
        data_dir = Path(args.all)
        waypoints_file = str(data_dir / "waypoints.csv") if (data_dir / "waypoints.csv").exists() else None
        wind_file = str(data_dir / "wind.csv") if (data_dir / "wind.csv").exists() else None
        nfz_file = str(data_dir / "no_fly_zones.geojson") if (data_dir / "no_fly_zones.geojson").exists() else None
        aircraft_file = str(data_dir / "aircraft.json") if (data_dir / "aircraft.json").exists() else None
    else:
        waypoints_file = args.waypoints
        wind_file = args.wind
        nfz_file = args.nfz
        aircraft_file = args.aircraft
    
    if not waypoints_file:
        parser.print_help()
        print("\n❌ 错误: 请提供航点文件路径")
        sys.exit(1)
    
    print("🧮 开始计算最优航线...")
    planner = FuelOptimizedRoutePlanner()
    
    result = planner.run_full_pipeline(
        waypoints_file, wind_file, nfz_file, aircraft_file
    )
    
    planner.print_summary(result["result"])
    
    print("\n📄 生成的文件:")
    print("  图表:")
    for chart_type, path in result["charts"].items():
        print(f"    - {chart_type}: {path}")
    
    print("  报告:")
    for report_type, path in result["reports"].items():
        print(f"    - {report_type}: {path}")

if __name__ == "__main__":
    main()
