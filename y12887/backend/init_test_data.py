#!/usr/bin/env python3
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import (
    BeachInfo, InspectionRecord, BuoyData,
    ProcessingRecord, AnomalyRecord, DataGap
)

def init_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("开始创建测试数据...")
        
        if db.query(BeachInfo).count() > 0:
            print("数据已存在，跳过创建")
            return
        
        beach1 = BeachInfo(
            name="第一海水浴场",
            code="BH001",
            latitude=36.0500,
            longitude=120.3800,
            safe_zone_radius=500.0,
            no_navigation_coords='[[36.0600,120.3700],[36.0600,120.3900],[36.0400,120.3900],[36.0400,120.3700]]',
            description="青岛第一海水浴场"
        )
        beach2 = BeachInfo(
            name="第二海水浴场",
            code="BH002",
            latitude=36.0700,
            longitude=120.4000,
            safe_zone_radius=600.0,
            no_navigation_coords='[[36.0800,120.3900],[36.0800,120.4100],[36.0600,120.4100],[36.0600,120.3900]]',
            description="青岛第二海水浴场"
        )
        db.add_all([beach1, beach2])
        db.flush()
        print(f"✓ 浴场: {beach1.name}, {beach2.name}")

        insp1 = InspectionRecord(
            record_no="INSP20250615001",
            beach_id=beach1.id,
            inspection_time=datetime.now() - timedelta(hours=2),
            inspector="张三",
            weather="晴",
            temperature=26.5,
            wind_direction="南风",
            wind_level="3级",
            wave_height=0.8,
            tide_level="中潮",
            photo_path="photos/insp_001.jpg",
            photo_name="日常巡检照片.jpg",
            remark="一切正常"
        )
        insp2 = InspectionRecord(
            record_no="INSP20250615002",
            beach_id=beach1.id,
            inspection_time=datetime.now() - timedelta(hours=1),
            inspector="李四",
            weather="多云",
            temperature=25.0,
            wind_direction="东南风",
            wind_level="4级",
            wave_height=1.2,
            tide_level="涨潮",
            photo_path="photos/insp_002.jpg",
            photo_name="轨迹漂移异常.jpg",
            remark="发现浮标位置异常，疑似漂移"
        )
        insp3 = InspectionRecord(
            record_no="INSP20250615003",
            beach_id=beach2.id,
            inspection_time=datetime.now() - timedelta(minutes=30),
            inspector="王五",
            weather="阴",
            temperature=24.0,
            wind_direction="东风",
            wind_level="5级",
            wave_height=1.5,
            tide_level="高潮",
            photo_path="photos/insp_003.jpg",
            photo_name="水质异常.jpg",
            remark="水质浑浊，能见度低"
        )
        db.add_all([insp1, insp2, insp3])
        db.flush()
        print(f"✓ 巡检: {insp1.record_no}, {insp2.record_no}, {insp3.record_no}")

        buoy1 = BuoyData(
            buoy_id="BUOY001",
            beach_id=beach1.id,
            record_time=datetime.now() - timedelta(hours=2),
            latitude=36.0510,
            longitude=120.3810,
            water_temperature=23.5,
            ph_value=7.8,
            dissolved_oxygen=6.5,
            turbidity=15.0,
            salinity=32.5,
            is_missing=False
        )
        buoy2 = BuoyData(
            buoy_id="BUOY001",
            beach_id=beach1.id,
            record_time=datetime.now() - timedelta(hours=1),
            latitude=36.0560,
            longitude=120.3880,
            water_temperature=None,
            ph_value=7.6,
            dissolved_oxygen=5.8,
            turbidity=25.0,
            salinity=None,
            is_missing=True,
            missing_fields='["water_temperature","salinity"]'
        )
        buoy3 = BuoyData(
            buoy_id="BUOY002",
            beach_id=beach2.id,
            record_time=datetime.now() - timedelta(minutes=30),
            latitude=36.0710,
            longitude=120.4010,
            water_temperature=22.8,
            ph_value=8.2,
            dissolved_oxygen=4.2,
            turbidity=45.0,
            salinity=31.8,
            is_missing=False
        )
        db.add_all([buoy1, buoy2, buoy3])
        db.flush()
        print(f"✓ 浮标: {buoy1.buoy_id}, {buoy2.buoy_id}, {buoy3.buoy_id}")

        proc1 = ProcessingRecord(
            batch_no="BATCH20250615001",
            beach_id=beach1.id,
            inspection_id=insp1.id,
            buoy_data_id=buoy1.id,
            trajectory_drift=150.5,
            is_drift_abnormal=False,
            drift_calculation_note="正常范围内",
            water_quality_level="良",
            water_quality_score=85.0,
            is_water_abnormal=False,
            water_calculation_note="水质良好",
            risk_level="正常",
            risk_score=15.0,
            has_processed=True,
            processing_opinion="数据正常，符合安全标准",
            processed_by="系统自动处理",
            processed_at=datetime.now() - timedelta(hours=1, minutes=50),
            is_reviewed=True,
            review_opinion="复核通过",
            reviewed_by="系统",
            reviewed_at=datetime.now() - timedelta(hours=1, minutes=45),
            calculation_status="success"
        )
        proc2 = ProcessingRecord(
            batch_no="BATCH20250615002",
            beach_id=beach1.id,
            inspection_id=insp2.id,
            buoy_data_id=buoy2.id,
            trajectory_drift=680.3,
            is_drift_abnormal=True,
            drift_calculation_note="超出安全半径500米",
            water_quality_level="轻度污染",
            water_quality_score=72.0,
            is_water_abnormal=True,
            water_calculation_note="浊度偏高",
            risk_level="高风险",
            risk_score=75.0,
            has_processed=True,
            processing_opinion="轨迹漂移680米，超出安全范围，存在禁航区越界风险。建议立即核查浮标位置，必要时发布预警。",
            processed_by="系统自动处理",
            processed_at=datetime.now() - timedelta(minutes=25),
            is_reviewed=False,
            calculation_status="partial",
            failure_reason="部分浮标数据缺失(水温、盐度)"
        )
        proc3 = ProcessingRecord(
            batch_no="BATCH20250615003",
            beach_id=beach2.id,
            inspection_id=insp3.id,
            buoy_data_id=buoy3.id,
            trajectory_drift=120.0,
            is_drift_abnormal=False,
            drift_calculation_note="正常范围内",
            water_quality_level="中度污染",
            water_quality_score=45.0,
            is_water_abnormal=True,
            water_calculation_note="溶解氧偏低，浊度偏高",
            risk_level="中风险",
            risk_score=60.0,
            has_processed=True,
            processing_opinion="水质异常，溶解氧4.2mg/L低于标准值5mg/L，浊度45NTU偏高。建议加强监测，必要时关闭浴场。",
            processed_by="系统自动处理",
            processed_at=datetime.now() - timedelta(minutes=10),
            is_reviewed=False,
            calculation_status="success"
        )
        db.add_all([proc1, proc2, proc3])
        db.flush()
        print(f"✓ 处理: {proc1.batch_no}, {proc2.batch_no}, {proc3.batch_no}")

        anom1 = AnomalyRecord(
            anomaly_no="ANOM20250615001",
            processing_record_id=proc2.id,
            beach_id=beach1.id,
            anomaly_type="trajectory_drift",
            anomaly_level="严重",
            description="浮标轨迹漂移680.3米，超出安全范围500米",
            anomaly_value=680.3,
            threshold=500.0,
            unit="米",
            formula="Haversine公式计算两点球面距离",
            occurrence_time=datetime.now() - timedelta(minutes=25)
        )
        anom2 = AnomalyRecord(
            anomaly_no="ANOM20250615002",
            processing_record_id=proc2.id,
            beach_id=beach1.id,
            anomaly_type="no_navigation_violation",
            anomaly_level="严重",
            description="浮标位置疑似进入禁航区",
            anomaly_value=1.0,
            threshold=0.0,
            unit="次",
            formula="射线法判断点是否在多边形内",
            occurrence_time=datetime.now() - timedelta(minutes=25)
        )
        anom3 = AnomalyRecord(
            anomaly_no="ANOM20250615003",
            processing_record_id=proc3.id,
            beach_id=beach2.id,
            anomaly_type="water_quality",
            anomaly_level="一般",
            description="水质综合指数45，属于中度污染",
            anomaly_value=45.0,
            threshold=60.0,
            unit="分",
            formula="加权平均法计算水质综合指数",
            occurrence_time=datetime.now() - timedelta(minutes=10),
            is_resolved=True,
            resolution_note="已发布预警，建议加强监测",
            resolved_at=datetime.now() - timedelta(minutes=5)
        )
        db.add_all([anom1, anom2, anom3])
        db.flush()
        print(f"✓ 异常: {anom1.anomaly_no}, {anom2.anomaly_no}, {anom3.anomaly_no}")

        gap1 = DataGap(
            batch_no=proc2.batch_no,
            beach_id=beach1.id,
            gap_type="buoy_missing",
            description="浮标水温数据缺失",
            missing_data_time=buoy2.record_time,
            missing_fields='["water_temperature"]',
            is_filled=False
        )
        gap2 = DataGap(
            batch_no=proc2.batch_no,
            beach_id=beach1.id,
            gap_type="buoy_missing",
            description="浮标盐度数据缺失",
            missing_data_time=buoy2.record_time,
            missing_fields='["salinity"]',
            is_filled=False
        )
        db.add_all([gap1, gap2])
        db.flush()
        print(f"✓ 缺口: {gap1.id}, {gap2.id}")

        db.commit()
        
        print("\n" + "="*60)
        print("测试数据创建完成！")
        print("="*60)
        print("\n追溯链路测试 (验收标准):")
        print(f"  异常: {anom1.anomaly_no}")
        print(f"    ↓ 处理记录: {proc2.batch_no}")
        print(f"    ↓ 巡检照片: {insp2.photo_path}")
        print(f"    ↓ 处理意见: {proc2.processing_opinion[:30]}...")
        print("\n测试API:")
        print(f"  GET /api/trace/anomaly/{anom1.anomaly_no}")
        print(f"  GET /api/trace/check-chain/{anom1.anomaly_no}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_data()
