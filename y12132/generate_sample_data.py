"""
生成示例数据
用于演示系统功能
"""
import pandas as pd
import os
from config import DATA_DIR

def generate_sample_nodes():
    """生成示例节点数据"""
    data = [
        {"airport_code": "PEK", "airport_name": "北京首都国际机场", "city": "北京", "province": "北京", "capacity": 1200, "is_international": True},
        {"airport_code": "PKX", "airport_name": "北京大兴国际机场", "city": "北京", "province": "北京", "capacity": 800, "is_international": True},
        {"airport_code": "SHA", "airport_name": "上海虹桥国际机场", "city": "上海", "province": "上海", "capacity": 900, "is_international": True},
        {"airport_code": "PVG", "airport_name": "上海浦东国际机场", "city": "上海", "province": "上海", "capacity": 1100, "is_international": True},
        {"airport_code": "CAN", "airport_name": "广州白云国际机场", "city": "广州", "province": "广东", "capacity": 1000, "is_international": True},
        {"airport_code": "SZX", "airport_name": "深圳宝安国际机场", "city": "深圳", "province": "广东", "capacity": 850, "is_international": True},
        {"airport_code": "CTU", "airport_name": "成都双流国际机场", "city": "成都", "province": "四川", "capacity": 700, "is_international": True},
        {"airport_code": "CKG", "airport_name": "重庆江北国际机场", "city": "重庆", "province": "重庆", "capacity": 650, "is_international": True},
        {"airport_code": "HGH", "airport_name": "杭州萧山国际机场", "city": "杭州", "province": "浙江", "capacity": 600, "is_international": True},
        {"airport_code": "NKG", "airport_name": "南京禄口国际机场", "city": "南京", "province": "江苏", "capacity": 550, "is_international": True},
        {"airport_code": "XIY", "airport_name": "西安咸阳国际机场", "city": "西安", "province": "陕西", "capacity": 500, "is_international": True},
        {"airport_code": "WUH", "airport_name": "武汉天河国际机场", "city": "武汉", "province": "湖北", "capacity": 480, "is_international": False},
        {"airport_code": "TAO", "airport_name": "青岛流亭国际机场", "city": "青岛", "province": "山东", "capacity": 400, "is_international": False},
        {"airport_code": "XMN", "airport_name": "厦门高崎国际机场", "city": "厦门", "province": "福建", "capacity": 420, "is_international": True},
        {"airport_code": "KMG", "airport_name": "昆明长水国际机场", "city": "昆明", "province": "云南", "capacity": 520, "is_international": True},
    ]
    
    df = pd.DataFrame(data)
    output_path = os.path.join(DATA_DIR, "nodes.xlsx")
    df.to_excel(output_path, index=False)
    print(f"示例节点数据已生成: {output_path}")
    return df

def generate_sample_flights():
    """生成示例航班数据"""
    routes = [
        {"origin": "PEK", "destination": "SHA", "frequency": 85, "distance": 1084},
        {"origin": "PEK", "destination": "CAN", "frequency": 72, "distance": 1882},
        {"origin": "PEK", "destination": "SZX", "frequency": 58, "distance": 1967},
        {"origin": "PEK", "destination": "CTU", "frequency": 52, "distance": 1519},
        {"origin": "PEK", "destination": "HGH", "frequency": 48, "distance": 1159},
        {"origin": "PEK", "destination": "NKG", "frequency": 42, "distance": 898},
        {"origin": "SHA", "destination": "CAN", "frequency": 68, "distance": 1214},
        {"origin": "SHA", "destination": "SZX", "frequency": 62, "distance": 1264},
        {"origin": "SHA", "destination": "CTU", "frequency": 45, "distance": 1658},
        {"origin": "SHA", "destination": "XIY", "frequency": 38, "distance": 1226},
        {"origin": "CAN", "destination": "CTU", "frequency": 42, "distance": 1095},
        {"origin": "CAN", "destination": "HGH", "frequency": 36, "distance": 945},
        {"origin": "CAN", "destination": "KMG", "frequency": 32, "distance": 1155},
        {"origin": "SZX", "destination": "CTU", "frequency": 38, "distance": 1123},
        {"origin": "SZX", "destination": "HGH", "frequency": 34, "distance": 954},
        {"origin": "CTU", "destination": "CKG", "frequency": 28, "distance": 272},
        {"origin": "CTU", "destination": "KMG", "frequency": 25, "distance": 605},
        {"origin": "HGH", "destination": "NKG", "frequency": 22, "distance": 236},
        {"origin": "XIY", "destination": "CTU", "frequency": 30, "distance": 577},
        {"origin": "XIY", "destination": "CKG", "frequency": 26, "distance": 550},
        {"origin": "WUH", "destination": "PEK", "frequency": 35, "distance": 1053},
        {"origin": "WUH", "destination": "SHA", "frequency": 32, "distance": 617},
        {"origin": "WUH", "destination": "CAN", "frequency": 28, "distance": 783},
        {"origin": "TAO", "destination": "PEK", "frequency": 20, "distance": 545},
        {"origin": "TAO", "destination": "SHA", "frequency": 18, "distance": 590},
        {"origin": "XMN", "destination": "SHA", "frequency": 25, "distance": 720},
        {"origin": "XMN", "destination": "CAN", "frequency": 22, "distance": 495},
        {"origin": "KMG", "destination": "CKG", "frequency": 20, "distance": 580},
    ]
    
    df = pd.DataFrame(routes)
    df["flight_number"] = [f"CA{1000+i:04d}" for i in range(len(df))]
    df["aircraft_type"] = "B737-800"
    df["avg_delay"] = [12, 8, 15, 10, 18, 7, 22, 14, 9, 16, 11, 20, 8, 13, 17, 6, 9, 5, 14, 11, 19, 10, 15, 8, 12, 16, 7, 10]
    
    output_path = os.path.join(DATA_DIR, "flights.xlsx")
    df.to_excel(output_path, index=False)
    print(f"示例航班数据已生成: {output_path}")
    return df

if __name__ == "__main__":
    print("生成示例数据...")
    generate_sample_nodes()
    generate_sample_flights()
    print("\n数据生成完成! 现在可以运行 python main.py 进行分析")
