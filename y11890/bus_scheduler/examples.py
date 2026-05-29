import json
import os


def generate_normal_case():
    return {
        "school": {
            "id": "SCH001",
            "name": "新校区实验学校",
            "lat": 31.2304,
            "lng": 121.4737
        },
        "stops": [
            {
                "id": "STOP001",
                "name": "阳光花园东门",
                "lat": 31.2350,
                "lng": 121.4650,
                "student_count": 25
            },
            {
                "id": "STOP002",
                "name": "翠苑小区北门",
                "lat": 31.2400,
                "lng": 121.4580,
                "student_count": 18
            },
            {
                "id": "STOP003",
                "name": "金桥地铁站",
                "lat": 31.2280,
                "lng": 121.4850,
                "student_count": 30
            },
            {
                "id": "STOP004",
                "name": "湖畔花园",
                "lat": 31.2200,
                "lng": 121.4920,
                "student_count": 22
            },
            {
                "id": "STOP005",
                "name": "市民广场",
                "lat": 31.2380,
                "lng": 121.4800,
                "student_count": 15
            },
            {
                "id": "STOP006",
                "name": "体育中心",
                "lat": 31.2150,
                "lng": 121.4600,
                "student_count": 20
            }
        ],
        "roads": [
            {
                "id": "R001",
                "from": "SCH001",
                "to": "STOP001",
                "duration_minutes": 8
            },
            {
                "id": "R002",
                "from": "STOP001",
                "to": "STOP002",
                "duration_minutes": 6
            },
            {
                "id": "R003",
                "from": "SCH001",
                "to": "STOP005",
                "duration_minutes": 5
            },
            {
                "id": "R004",
                "from": "STOP005",
                "to": "STOP003",
                "duration_minutes": 7
            },
            {
                "id": "R005",
                "from": "STOP003",
                "to": "STOP004",
                "duration_minutes": 5
            },
            {
                "id": "R006",
                "from": "SCH001",
                "to": "STOP006",
                "duration_minutes": 12
            },
            {
                "id": "R007",
                "from": "STOP006",
                "to": "STOP002",
                "duration_minutes": 10
            },
            {
                "id": "R008",
                "from": "STOP001",
                "to": "STOP005",
                "duration_minutes": 4
            },
            {
                "id": "R009",
                "from": "STOP002",
                "to": "STOP006",
                "duration_minutes": 10
            }
        ],
        "vehicles": [
            {
                "id": "BUS001",
                "capacity": 45,
                "description": "45座大巴"
            },
            {
                "id": "BUS002",
                "capacity": 45,
                "description": "45座大巴"
            },
            {
                "id": "BUS003",
                "capacity": 45,
                "description": "45座大巴"
            }
        ]
    }


def generate_bad_coordinates_case():
    return {
        "school": {
            "id": "SCH001",
            "name": "新校区实验学校",
            "lat": 31.2304,
            "lng": 121.4737
        },
        "stops": [
            {
                "id": "STOP001",
                "name": "阳光花园东门",
                "lat": 31.2350,
                "lng": 121.4650,
                "student_count": 25
            },
            {
                "id": "STOP002",
                "name": "翠苑小区北门",
                "lat": 95.0,
                "lng": 121.4580,
                "student_count": 18
            },
            {
                "id": "STOP003",
                "name": "金桥地铁站",
                "lat": 31.2280,
                "lng": 200.0,
                "student_count": 30
            },
            {
                "id": "STOP004",
                "name": "湖畔花园",
                "lat": 0.0,
                "lng": 0.0,
                "student_count": 22
            },
            {
                "id": "STOP005",
                "name": "市民广场",
                "lat": 31.2380,
                "lng": 121.4800,
                "student_count": 15
            },
            {
                "id": "STOP006",
                "name": "体育中心",
                "lat": 31.2150,
                "lng": 121.4600,
                "student_count": -5
            },
            {
                "id": "STOP001",
                "name": "阳光花园东门重复",
                "lat": 31.2350,
                "lng": 121.4650,
                "student_count": 10
            }
        ],
        "roads": [
            {
                "id": "R001",
                "from": "SCH001",
                "to": "STOP001",
                "duration_minutes": 8
            },
            {
                "id": "R002",
                "from": "STOP001",
                "to": "STOP002",
                "duration_minutes": 6,
                "status": "closed",
                "note": "道路施工封闭，预计3天后开放"
            },
            {
                "id": "R003",
                "from": "SCH001",
                "to": "STOP005",
                "duration_minutes": 5
            },
            {
                "id": "R004",
                "from": "STOP005",
                "to": "STOP003",
                "duration_minutes": 7
            },
            {
                "id": "R005",
                "from": "STOP003",
                "to": "STOP004",
                "duration_minutes": 5
            },
            {
                "id": "R006",
                "from": "SCH001",
                "to": "STOP006",
                "duration_minutes": 12
            },
            {
                "id": "R007",
                "from": "STOP006",
                "to": "STOP999",
                "duration_minutes": 10
            },
            {
                "id": "R008",
                "from": "STOP001",
                "to": "STOP001",
                "duration_minutes": 0
            }
        ],
        "vehicles": [
            {
                "id": "BUS001",
                "capacity": 45,
                "description": "45座大巴"
            },
            {
                "id": "BUS002",
                "capacity": 0,
                "description": "待检修车辆"
            }
        ]
    }


def generate_closed_road_case():
    return {
        "school": {
            "id": "SCH001",
            "name": "新校区实验学校",
            "lat": 31.2304,
            "lng": 121.4737
        },
        "stops": [
            {
                "id": "STOP001",
                "name": "阳光花园东门",
                "lat": 31.2350,
                "lng": 121.4650,
                "student_count": 25
            },
            {
                "id": "STOP002",
                "name": "翠苑小区北门",
                "lat": 31.2400,
                "lng": 121.4580,
                "student_count": 18
            },
            {
                "id": "STOP003",
                "name": "隔离区站点",
                "lat": 31.2500,
                "lng": 121.5000,
                "student_count": 20
            }
        ],
        "roads": [
            {
                "id": "R001",
                "from": "SCH001",
                "to": "STOP001",
                "duration_minutes": 8
            },
            {
                "id": "R002",
                "from": "STOP001",
                "to": "STOP002",
                "duration_minutes": 6
            },
            {
                "id": "R003",
                "from": "SCH001",
                "to": "STOP003",
                "duration_minutes": 15,
                "status": "closed",
                "note": "疫情防控道路封闭"
            },
            {
                "id": "R004",
                "from": "STOP001",
                "to": "STOP003",
                "duration_minutes": 20,
                "status": "closed",
                "note": "疫情防控道路封闭"
            }
        ],
        "vehicles": [
            {
                "id": "BUS001",
                "capacity": 45,
                "description": "45座大巴"
            }
        ]
    }


def generate_overload_case():
    return {
        "school": {
            "id": "SCH001",
            "name": "新校区实验学校",
            "lat": 31.2304,
            "lng": 121.4737
        },
        "stops": [
            {
                "id": "STOP001",
                "name": "大型社区A",
                "lat": 31.2350,
                "lng": 121.4650,
                "student_count": 35
            },
            {
                "id": "STOP002",
                "name": "大型社区B",
                "lat": 31.2400,
                "lng": 121.4580,
                "student_count": 30
            },
            {
                "id": "STOP003",
                "name": "大型社区C",
                "lat": 31.2280,
                "lng": 121.4850,
                "student_count": 25
            }
        ],
        "roads": [
            {
                "id": "R001",
                "from": "SCH001",
                "to": "STOP001",
                "duration_minutes": 8
            },
            {
                "id": "R002",
                "from": "STOP001",
                "to": "STOP002",
                "duration_minutes": 6
            },
            {
                "id": "R003",
                "from": "STOP002",
                "to": "STOP003",
                "duration_minutes": 7
            },
            {
                "id": "R004",
                "from": "SCH001",
                "to": "STOP003",
                "duration_minutes": 10
            }
        ],
        "vehicles": [
            {
                "id": "BUS001",
                "capacity": 50,
                "description": "50座大巴"
            }
        ]
    }


def generate_all(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    cases = {
        "normal_case.json": generate_normal_case(),
        "bad_coordinates_case.json": generate_bad_coordinates_case(),
        "closed_road_case.json": generate_closed_road_case(),
        "overload_case.json": generate_overload_case()
    }

    for filename, data in cases.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return list(cases.keys())
