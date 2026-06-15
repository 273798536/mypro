#!/usr/bin/env python3
"""
海水浴场风险播报系统 - 测试数据创建脚本
用于验证追溯链路：异常 → 巡检照片 → 处理意见
"""

import sys
import os
import json
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import (
    BeachInfo, InspectionRecord, BuoyData,
    ProcessingRecord, AnomalyRecord, DataGap
)
from sqlalchemy.orm import Session

def create_test_data():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("开始创建测试数据...")
        print("=" * 60)
        
        beach1 = BeachInfo(
            name="第一海水浴场",
            code="BH001",
            latitude=36.0500,
            longitude=120.3800,
            safe_zone_radius=500,
            no_navigation_zone="[[36.0600,120.3700;36.0600,120.3900;36.0400,120.3900;36.0400,120.3700",
            status="active"
        )
        beach2 = BeachInfo(
            name="第二海水浴场",
            code="BH002",
            latitude=36.0700,
            longitude=120.4000,
            safe_zone_radius=600,
            no_navigation_zone="[[36.0800,120.3900;36.0800,120.4100;36.0600,120.4100;36.0600,120.3900",
            status="active"
        )
        db.add_all([beach1, beach2])
        db.flush()
        print(f"✓ 创建浴场数据: {}, {}".format(beach1.name, beach2.name))

        inspection1 = InspectionRecord(
            inspection_no="INSP20250615001",
            beach_id=beach1.id,
            inspector="张三",
            inspection_time=datetime.now() - timedelta(hours=2),
            weather="晴",
            water_temperature=23.5,
            wind_level=3,
            wave_height=0.8,
            abnormal_situation="正常",
            photo_path="photos/insp_001.jpg",
            remark="日常巡检"
        )
        inspection2 = InspectionRecord(
            inspection_no="INSP20250615002",
            beach_id=beach1.id,
            inspector="李四",
            inspection_time=datetime.now() - timedelta(hours=1),
            weather="多云",
            water_temperature=24.0,
            wind_level=4,
            wave_height=1.2,
            abnormal_situation="发现轨迹漂移异常",
            photo_path="photos/insp_002.jpg",
            remark="疑似浮标位置偏移约680米，超出安全范围"
        )
        inspection3 = InspectionRecord(
            inspection_no="INSP20250615003",
            beach_id=beach2.id,
            inspector="王五",
            inspection_time=datetime.now() - timedelta(minutes=30),
            weather="阴",
            water_temperature=22.8,
            wind_level=5,
            wave_height=1.5,
            abnormal_situation="水质异常",
            photo_path="photos/insp_003.jpg",
            remark="水质浑浊，能见度低"
        )
        db.add_all([inspection1, inspection2, inspection3])
        db.flush()
        print(f"✓ 创建巡检记录: {}, {}, {}".format(
            inspection1.inspection_no,
            inspection2.inspection_no,
            inspection3.inspection_no
        ))

        buoy1 = BuoyData(
            buoy_no="BUOY001",
            beach_id=beach1.id,
            record_time=datetime.now() - timedelta(hours=2),
            latitude=36.0510,
            longitude=120.3810,
            water_temperature=23.5,
            ph_value=7.8,
            dissolved_oxygen=6.5,
            turbidity=15.0,
            salinity=32.5
        )
        buoy2 = BuoyData(
            buoy_no="BUOY001",
            beach_id=beach1.id,
            record_time=datetime.now() - timedelta(hours=1),
            latitude=36.0560,
            longitude=120.3880,
            water_temperature=None,
            ph_value=7.6,
            dissolved_oxygen=5.8,
            turbidity=25.0,
            salinity=None
        )
        buoy3 = BuoyData(
            buoy_no="BUOY002",
            beach_id=beach2.id,
            record_time=datetime.now() - timedelta(minutes=30),
            latitude=36.0710,
            longitude=120.4010,
            water_temperature=22.8,
            ph_value=8.2,
            dissolved_oxygen=4.2,
            turbidity=45.0,
            salinity=31.8
        )
        db.add_all([buoy1, buoy2, buoy3])
        db.flush()
        print(f"✓ 创建浮标数据: {}, {}, {}".format(buoy1.buoy_no, buoy2.buoy_no, buoy3.buoy_no))

        processing1 = ProcessingRecord(
            record_no="PROC20250615001",
            beach_id=beach1.id,
            inspection_id=inspection1.id,
            buoy_id=buoy1.id,
            process_time=datetime.now() - timedelta(hours=1, minutes=50),
            trajectory_drift=150.5,
            is_drift_abnormal=False,
            water_quality_score=85,
            water_quality_level="良",
            is_water_abnormal=False,
            risk_score=15,
            risk_level="正常",
            no_navigation_violation=False,
            processing_opinion="数据正常，符合安全标准",
            processed_by="系统自动处理",
            review_status="reviewed",
            review_time=datetime.now() - timedelta(hours=1, minutes=45),
            reviewer="系统"
        )
        db.add(processing1)
        db.flush()

        processing2 = ProcessingRecord(
            record_no="PROC20250615002",
            beach_id=beach1.id,
            inspection_id=inspection2.id,
            buoy_id=buoy2.id,
            process_time=datetime.now() - timedelta(minutes=25),
            trajectory_drift=680.3,
            is_drift_abnormal=True,
            water_quality_score=72,
            water_quality_level="轻度污染",
            is_water_abnormal=True,
            risk_score=75,
            risk_level="高风险",
            no_navigation_violation=True,
            processing_opinion="轨迹漂移680米，超出安全范围500米，存在禁航区越界风险",
            processed_by="系统自动处理",
            review_status="pending",
            review_time=None,
            reviewer=None
        )
        db.add(processing2)
        db.flush()

        processing3 = ProcessingRecord(
            record_no="PROC20250615003",
            beach_id=beach2.id,
            inspection_id=inspection3.id,
            buoy_id=buoy3.id,
            process_time=datetime.now() - timedelta(minutes=10),
            trajectory_drift=120.0,
            is_drift_abnormal=False,
            water_quality_score=45,
            water_quality_level="中度污染",
            is_water_abnormal=True,
            risk_score=60,
            risk_level="中风险",
            no_navigation_violation=False,
            processing_opinion="水质异常，溶解氧偏低，浊度偏高",
            processed_by="系统自动处理",
            review_status="pending",
            review_time=None,
            reviewer=None
        )
        db.add(processing3)
        db.flush()
        print(f"✓ 创建处理记录: {}, {}, {}".format(
            processing1.record_no,
            processing2.record_no,
            processing3.record_no
        ))

        anomaly1 = AnomalyRecord(
            anomaly_no="ANOM20250615001",
            processing_id=processing2.id,
            beach_id=beach1.id,
            anomaly_type="trajectory_drift",
            anomaly_level="high",
            description="浮标轨迹漂移680.3米，超出安全范围500米",
            detected_time=datetime.now() - timedelta(minutes=25),
            status="pending",
            handler_opinion=None
        )
        anomaly2 = AnomalyRecord(
            anomaly_no="ANOM20250615002",
            processing_id=processing2.id,
            beach_id=beach1.id,
            anomaly_type="no_navigation_violation",
            anomaly_level="high",
            description="浮标位置疑似进入禁航区",
            detected_time=datetime.now() - timedelta(minutes=25),
            status="pending",
            handler_opinion=None
        )
        anomaly3 = AnomalyRecord(
            anomaly_no="ANOM20250615003",
            processing_id=processing3.id,
            beach_id=beach2.id,
            anomaly_type="water_quality",
            anomaly_level="medium",
            description="水质综合指数45，属于中度污染",
            detected_time=datetime.now() - timedelta(minutes=10),
            status="pending",
            handler_opinion="建议加强水质监测，必要时关闭浴场"
        )
        db.add_all([anomaly1, anomaly2, anomaly3])
        db.flush()
        print(f"✓ 创建异常记录: {}, {}, {}".format(
            anomaly1.anomaly_no,
            anomaly2.anomaly_no,
            anomaly3.anomaly_no
        ))

        gap1 = DataGap(
            gap_no="GAP20250615001",
            processing_id=processing2.id,
            beach_id=beach1.id,
            field_name="water_temperature",
            field_type="buoy",
            expected_value="22-25",
            status="pending",
            remark="浮标水温数据缺失"
        )
        gap2 = DataGap(
            gap_no="GAP20250615002",
            processing_id=processing2.id,
            beach_id=beach1.id,
            field_name="salinity",
            field_type="buoy",
            expected_value="30-35",
            status="pending",
            remark="浮标盐度数据缺失"
        )
        db.add_all([gap1, gap2])
        db.flush()
        print(f"✓ 创建数据缺口: {}, {}".format(gap1.gap_no, gap2.gap_no))

        db.commit()

        print("")
        print("=" * 60)
        print("测试数据创建完成！")
        print("=" * 60)
        print("")
        print("追溯链路测试 (异常 -> 巡检照片 -> 处理意见):")
        print("")
        print(f"  异常编号: {}".format(anomaly1.anomaly_no))
        print(f"    ↓")
        print(f"  处理记录: {}".format(processing2.record_no))
        print(f"    ↓")
        print(f"  巡检记录: {} (照片: {})".format(inspection2.inspection_no, inspection2.photo_path))
        print(f"    ↓")
        print(f"  处理意见: {}".format(processing2.processing_opinion))
        print("")
        print(f"  API测试: GET /api/trace/anomaly/{anomaly1.anomaly_no}")
        print(f"  链路检查: GET /api/trace/check-chain/{anomaly1.anomaly_no}")
        print("")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"✗ 创建测试数据失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
