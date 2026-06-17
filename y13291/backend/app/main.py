from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import Feedback, MergeRelation, Evidence, OperationLog
from .api import api_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="慢行桥坡道容量复核管理系统",
    description="市政设计居民反馈、复核、归并、溯源一体化平台",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "bridge-review-backend"}


@app.on_event("startup")
def init_sample_data():
    db = SessionLocal()
    try:
        from .services.feedback_service import generate_feedback_no, create_feedback
        from .schemas import FeedbackCreate
        count = db.query(Feedback).count()
        if count == 0:
            samples = [
                {
                    "original_source": "12345热线",
                    "original_location": "XX路与YY路交叉口，慢行桥南坡道",
                    "original_content": "轮椅上坡太陡，老人推不动，旁边没有扶手，上次李阿姨差点摔了。居民希望降低坡度或增加助力装置。",
                    "original_reporter": "李阿姨家属",
                    "original_contact": "138****1234",
                    "original_date": "2026-05-20",
                    "bridge_name": "XX路慢行桥",
                    "status": "reviewing",
                    "review_remark": "已初步核对，坡道坡度实测8.2%，超过规范5%限值。需设计出具整改方案。",
                    "handler": "老曹",
                    "original_raw_row": {"来源": "12345热线", "地点": "XX路与YY路交叉口", "内容": "轮椅上坡太陡"}
                },
                {
                    "original_source": "社区微信群",
                    "original_location": "XX路YY路口桥，南坡",
                    "original_content": "看到有人推婴儿车上桥，坡太陡差点倒滑。这桥老人小孩多，很危险。",
                    "original_reporter": "社区张主任",
                    "original_date": "2026-05-22",
                    "bridge_name": "XX路慢行桥",
                    "status": "pending",
                    "original_raw_row": {"来源": "微信群", "地点": "XX路YY路口桥", "内容": "婴儿车倒滑"}
                },
                {
                    "original_source": "现场巡查",
                    "original_location": "ZZ大道东侧人行天桥，北坡道",
                    "original_content": "下雨时坡道积水严重，表面湿滑，已有两起滑倒投诉。排水口被落叶堵塞。",
                    "original_reporter": "巡查员王师傅",
                    "original_date": "2026-06-01",
                    "bridge_name": "ZZ大道天桥",
                    "impact_scope": "涉及坡道全长约35米，日均通行约500人次，其中老人占30%",
                    "status": "need_evidence",
                    "review_remark": "需要补充：积水深度测量照片、排水口清淤方案、防滑系数检测报告。",
                    "handler": "老曹",
                    "original_raw_row": {"来源": "巡查", "地点": "ZZ大道天桥北坡", "内容": "积水湿滑"}
                },
                {
                    "original_source": "12345热线",
                    "original_location": "ZZ大道天桥北边下坡的地方",
                    "original_content": "上周下雨我老伴儿在那个桥下坡摔了，手上缝了四针。没人管吗？",
                    "original_reporter": "赵大爷",
                    "original_contact": "136****8888",
                    "original_date": "2026-06-03",
                    "bridge_name": "ZZ大道天桥",
                    "status": "pending",
                    "original_raw_row": {"来源": "12345", "地点": "ZZ大道天桥北下坡", "内容": "老伴摔了缝四针"}
                },
                {
                    "original_source": "人大建议转办",
                    "original_location": "AA公园南门跨河慢行桥",
                    "original_content": "桥面宽度不足，高峰期双向行人错不开，坡道过窄，轮椅无法与行人并行。建议拓宽坡道或分道。",
                    "original_reporter": "区人大代表 陈XX",
                    "original_date": "2026-04-15",
                    "bridge_name": "AA公园跨河桥",
                    "impact_scope": "涉及坡道2处，桥面全段，高峰期17:00-19:00",
                    "status": "approved",
                    "review_remark": "已完成测量：坡道宽度1.2m，低于规范1.5m最小值；桥面净宽2.4m，规范要求3.0m。材料齐全。",
                    "capacity_conclusion": "坡道宽度不足30%，桥面通行能力缺口约25%，建议纳入2026年市政改造计划。",
                    "handler": "老曹",
                    "leader_inquiry": "张局6月10日询问：此桥改造是否可与河道整治项目合并实施？",
                    "original_raw_row": {"来源": "人大建议", "地点": "AA公园南门桥", "内容": "桥面窄错不开"}
                }
            ]
            for s in samples:
                no = generate_feedback_no(db)
                data = FeedbackCreate(feedback_no=no, **s)
                create_feedback(db, data)
    finally:
        db.close()
