from sqlalchemy.orm import Session
from . import schemas, services
from .models import RecordStatus


SAMPLE_BATCH_1 = schemas.BufferRecordCreate(
    batch_no="BUF-2026-001",
    record_date="2026-06-01",
    buffer_name="PBS磷酸盐缓冲液 pH 7.4",
    target_ph=7.4,
    target_volume=1.0,
    actual_ph=7.38,
    actual_volume=1.0,
    operator="张工",
    reviewer="李工",
    status=RecordStatus.IMPORTED,
    remark="用于细胞培养实验，首次配制",
    components=[
        schemas.BufferComponentCreate(
            reagent_name="氯化钠", formula="NaCl", molar_mass=58.44,
            target_concentration=0.137, actual_concentration=0.137, purity=0.995,
        ),
        schemas.BufferComponentCreate(
            reagent_name="磷酸二氢钾", formula="KH2PO4", molar_mass=136.09,
            target_concentration=0.0027, actual_concentration=0.0027, purity=0.99,
        ),
        schemas.BufferComponentCreate(
            reagent_name="磷酸氢二钠", formula="Na2HPO4", molar_mass=141.96,
            target_concentration=0.01, actual_concentration=0.01, purity=0.99,
        ),
        schemas.BufferComponentCreate(
            reagent_name="氯化钾", formula="KCl", molar_mass=74.55,
            target_concentration=0.0027, actual_concentration=0.0027, purity=0.995,
        ),
    ],
    temperature_points=[
        schemas.TemperaturePointCreate(time_minute=0, set_temp=25.0, actual_temp=24.8),
        schemas.TemperaturePointCreate(time_minute=5, set_temp=25.0, actual_temp=25.1),
        schemas.TemperaturePointCreate(time_minute=10, set_temp=25.0, actual_temp=25.0),
        schemas.TemperaturePointCreate(time_minute=15, set_temp=25.0, actual_temp=24.9),
        schemas.TemperaturePointCreate(time_minute=20, set_temp=25.0, actual_temp=25.2),
        schemas.TemperaturePointCreate(time_minute=30, set_temp=25.0, actual_temp=25.0),
    ],
    weighing_records=[
        schemas.WeighingRecordCreate(
            reagent_name="氯化钠", theoretical_mass=8.0567, actual_mass=8.0610,
            tolerance_pct=0.5,
        ),
        schemas.WeighingRecordCreate(
            reagent_name="磷酸二氢钾", theoretical_mass=0.3715, actual_mass=0.3702,
            tolerance_pct=0.5,
        ),
        schemas.WeighingRecordCreate(
            reagent_name="磷酸氢二钠", theoretical_mass=1.4340, actual_mass=1.4320,
            tolerance_pct=0.5,
        ),
        schemas.WeighingRecordCreate(
            reagent_name="氯化钾", theoretical_mass=0.2024, actual_mass=0.2031,
            tolerance_pct=0.5,
        ),
    ],
)

SAMPLE_BATCH_2 = schemas.BufferRecordCreate(
    batch_no="BUF-2026-002",
    record_date="2026-06-05",
    buffer_name="Tris-HCl缓冲液 pH 8.0",
    target_ph=8.0,
    target_volume=0.5,
    actual_ph=8.02,
    actual_volume=0.5,
    operator="王工",
    reviewer=None,
    status=RecordStatus.CONFIRMED,
    remark="用于蛋白纯化，已复核通过",
    precision_pass=True,
    temp_curve_pass=True,
    components=[
        schemas.BufferComponentCreate(
            reagent_name="三羟甲基氨基甲烷", formula="Tris", molar_mass=121.14,
            target_concentration=0.05, actual_concentration=0.05, purity=0.998,
        ),
        schemas.BufferComponentCreate(
            reagent_name="盐酸", formula="HCl", molar_mass=36.46,
            target_concentration=0.025, actual_concentration=0.025,
        ),
    ],
    temperature_points=[
        schemas.TemperaturePointCreate(time_minute=0, set_temp=4.0, actual_temp=4.2),
        schemas.TemperaturePointCreate(time_minute=10, set_temp=4.0, actual_temp=4.0),
        schemas.TemperaturePointCreate(time_minute=20, set_temp=4.0, actual_temp=3.9),
        schemas.TemperaturePointCreate(time_minute=30, set_temp=4.0, actual_temp=4.1),
    ],
    weighing_records=[
        schemas.WeighingRecordCreate(
            reagent_name="Tris", theoretical_mass=3.0335, actual_mass=3.0350,
            tolerance_pct=0.5,
        ),
    ],
)

SAMPLE_BATCH_3 = schemas.BufferRecordCreate(
    batch_no="BUF-2026-003",
    record_date="2026-06-08",
    buffer_name="醋酸-醋酸钠缓冲液 pH 5.0",
    target_ph=5.0,
    target_volume=2.0,
    actual_ph=None,
    actual_volume=None,
    operator="赵工",
    reviewer=None,
    status=RecordStatus.DRAFT,
    remark="草稿，待补全称量与温度数据",
    components=[
        schemas.BufferComponentCreate(
            reagent_name="醋酸钠", formula="CH3COONa", molar_mass=82.03,
            target_concentration=0.1, purity=0.99,
        ),
        schemas.BufferComponentCreate(
            reagent_name="冰醋酸", formula="CH3COOH", molar_mass=60.05,
            target_concentration=0.05,
        ),
    ],
    temperature_points=[],
    weighing_records=[],
)


def init_sample_data(db: Session) -> int:
    count = 0
    samples = [SAMPLE_BATCH_1, SAMPLE_BATCH_2, SAMPLE_BATCH_3]
    for s in samples:
        if services.find_duplicate_record(db, s.batch_no, s.record_date):
            continue
        try:
            services.create_buffer_record(db, s, skip_duplicate_check=True)
            count += 1
        except Exception:
            pass
    return count
