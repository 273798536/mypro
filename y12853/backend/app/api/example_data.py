from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.seed_service import seed_all_example_data
from app.models import TideRecord, WaterQualityRecord, VesselTrajectory, TideWindowResult

router = APIRouter(prefix="/example", tags=["示例数据"])


@router.post("/seed", summary="首次打开：自动生成示例数据（海事安全员不用先造表）")
def seed_example_data(
    force: bool = Query(False, description="是否强制重建（清空旧数据）"),
    db: Session = Depends(get_db),
):
    """
    首次打开"港口拖轮潮窗 API"时调用，自动生成：
    - 3天潮汐表（30分钟间隔）
    - 水质记录（含负深度样点，用于演示自动剔除+暂缓机制）
    - 船舶轨迹数据（日常入口可清洗）
    - 4条示例潮窗计算（覆盖available/pending/recollect多种状态）
    海事安全员无需先造半天表即可看懂工具。
    """
    result = seed_all_example_data(db, force=force)
    return {
        "message": (
            "示例数据已就绪。请使用："
            "1) 仪表盘 /tide-window/dashboard 查看概览；"
            "2) 结果列表 /tide-window/results 体验状态筛选与分页；"
            "3) 点进单条结果 /tide-window/results/{id}/summary 查看简短说明（可用/暂缓/重采）；"
            "4) 调用 /tide-window/results/{id}/correct 体验人工修正留痕；"
            "5) /tide-window/results/{id}/audit-log 查看前后变化轨迹。"
        ),
        **result,
    }


@router.get("/summary", summary="示例数据概览")
def data_summary(db: Session = Depends(get_db)):
    return {
        "tide_records": db.query(TideRecord).count(),
        "water_quality_records": db.query(WaterQualityRecord).count(),
        "trajectory_records": db.query(VesselTrajectory).count(),
        "tide_window_results": db.query(TideWindowResult).count(),
        "negative_depth_samples": db.query(WaterQualityRecord)
            .filter(WaterQualityRecord.water_depth <= 0).count(),
    }
