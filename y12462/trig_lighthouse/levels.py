"""预设关卡"""

from .models import Level, Lighthouse, Target, Angle, AngleUnit, Quadrant


def create_level_1() -> Level:
    """关卡1: 基础象限识别"""
    return Level(
        id="level_1",
        name="基础象限识别",
        description="识别角度所在的象限，照亮对应位置的灯塔",
        difficulty=1,
        lighthouses=[
            Lighthouse(
                id="lh_q1",
                name="第一象限灯塔",
                position_x=0.7,
                position_y=0.7,
                beam_angle=Angle(45, AngleUnit.DEGREE)
            )
        ],
        targets=[
            Target(
                id="t1",
                expected_angle=Angle(45, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.Q1,
                tolerance=10.0
            ),
            Target(
                id="t2",
                expected_angle=Angle(135, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.Q2,
                tolerance=10.0
            )
        ]
    )


def create_level_2() -> Level:
    """关卡2: 角度制转换挑战"""
    return Level(
        id="level_2",
        name="角度制转换",
        description="在度和弧度之间转换，注意不要混用！",
        difficulty=2,
        lighthouses=[
            Lighthouse(
                id="lh_pi4",
                name="π/4 灯塔",
                position_x=0.7,
                position_y=0.7,
                beam_angle=Angle(3.14159/4, AngleUnit.RADIAN)
            )
        ],
        targets=[
            Target(
                id="t1",
                expected_angle=Angle(3.14159/4, AngleUnit.RADIAN),
                expected_quadrant=Quadrant.Q1,
                tolerance=5.0
            ),
            Target(
                id="t2",
                expected_angle=Angle(180, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.AXIS,
                tolerance=5.0
            ),
            Target(
                id="t3",
                expected_angle=Angle(3.14159*3/2, AngleUnit.RADIAN),
                expected_quadrant=Quadrant.AXIS,
                tolerance=5.0
            )
        ]
    )


def create_level_3() -> Level:
    """关卡3: 精确瞄准"""
    return Level(
        id="level_3",
        name="精确瞄准",
        description="高精度瞄准，误差要求更高",
        difficulty=3,
        lighthouses=[
            Lighthouse(
                id="lh_main",
                name="主灯塔",
                position_x=0.0,
                position_y=0.0,
                beam_angle=Angle(0, AngleUnit.DEGREE)
            )
        ],
        targets=[
            Target(
                id="t1",
                expected_angle=Angle(30, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.Q1,
                tolerance=2.0
            ),
            Target(
                id="t2",
                expected_angle=Angle(210, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.Q3,
                tolerance=2.0
            ),
            Target(
                id="t3",
                expected_angle=Angle(330, AngleUnit.DEGREE),
                expected_quadrant=Quadrant.Q4,
                tolerance=2.0
            )
        ]
    )


def get_all_levels():
    """获取所有关卡"""
    return [create_level_1(), create_level_2(), create_level_3()]
