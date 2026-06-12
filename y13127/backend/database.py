from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, Boolean,
    Text, ForeignKey, JSON, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "bayesian_prior.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TrialCalculation(Base):
    """贝叶斯先验参数试算主表"""
    __tablename__ = "trial_calculations"

    id = Column(Integer, primary_key=True, index=True)
    trial_no = Column(String(64), unique=True, index=True, nullable=False,
                      comment="试算编号，系统自动生成")
    project_name = Column(String(256), nullable=False, comment="项目名称")
    parameter_name = Column(String(256), nullable=False, comment="参数名称")
    description = Column(Text, nullable=True, comment="试算说明")

    prior_alpha = Column(Float, nullable=False, comment="先验Alpha参数(α)")
    prior_beta = Column(Float, nullable=False, comment="先验Beta参数(β)")
    prior_mean = Column(Float, nullable=True, comment="先验均值 α/(α+β)")
    weight = Column(Float, nullable=False, default=1.0, comment="权重(可修改)")

    sample_success = Column(Integer, nullable=False, default=0, comment="样本成功数")
    sample_total = Column(Integer, nullable=False, default=0, comment="样本总数")
    sample_fail = Column(Integer, nullable=True, comment="样本失败数(冗余)")

    posterior_alpha = Column(Float, nullable=True, comment="后验Alpha")
    posterior_beta = Column(Float, nullable=True, comment="后验Beta")
    posterior_mean = Column(Float, nullable=True, comment="后验均值")

    status = Column(String(32), nullable=False, default="draft", index=True,
                    comment="状态:draft草稿/pending待审核/approved已确认/rejected已驳回/exported已导出")
    status_remark = Column(String(512), nullable=True, comment="状态变更说明")

    is_duplicate = Column(Boolean, nullable=False, default=False, index=True,
                          comment="是否重复样本")
    duplicate_reason = Column(String(512), nullable=True,
                              comment="重复判定理由(相似试算ID/关键字段匹配)")
    duplicate_of_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=True,
                             comment="关联到的主样本ID")

    source_batch_no = Column(String(128), nullable=True, index=True,
                             comment="来源批次号(项目经理导入批次)")
    source_filename = Column(String(256), nullable=True, comment="来源文件名")
    source_uploader = Column(String(128), nullable=True, comment="上传人/提交人")
    source_import_time = Column(DateTime, nullable=True, comment="原始导入时间")

    field_mapping_snapshot = Column(JSON, nullable=True,
                                     comment="原始字段名→标准字段名映射快照，保留来源")
    raw_data_snapshot = Column(JSON, nullable=True,
                                comment="导入时的原始数据快照(字段名可能前后不一)")

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(128), nullable=True, comment="创建人")
    updated_by = Column(String(128), nullable=True, comment="最后更新人")

    weight_changes = relationship("WeightChangeLog", back_populates="trial",
                                  cascade="all, delete-orphan")
    status_changes = relationship("StatusChangeLog", back_populates="trial",
                                  cascade="all, delete-orphan")
    historical_answers = relationship("HistoricalAnswer", back_populates="trial",
                                      cascade="all, delete-orphan")
    trace_records = relationship("TraceRecord", back_populates="trial",
                                 cascade="all, delete-orphan")
    export_records = relationship("ExportRecord", back_populates="trial",
                                  cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_project_param", "project_name", "parameter_name"),
        Index("idx_status_dup", "status", "is_duplicate"),
    )


class WeightChangeLog(Base):
    """权重修改记录表 - 记录每次权重改动与历史答案的关系"""
    __tablename__ = "weight_change_logs"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=False, index=True)

    old_weight = Column(Float, nullable=False, comment="修改前权重")
    new_weight = Column(Float, nullable=False, comment="修改后权重")

    historical_answer_id = Column(Integer, ForeignKey("historical_answers.id"), nullable=True,
                                   index=True, comment="关联的历史答案(根据哪个历史答案改的)")
    reference_answer_value = Column(Float, nullable=True,
                                     comment="参考的历史答案取值(快照)")
    reason = Column(String(512), nullable=True, comment="修改理由")

    changed_by = Column(String(128), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, index=True)

    trial = relationship("TrialCalculation", back_populates="weight_changes")
    historical_answer = relationship("HistoricalAnswer", back_populates="weight_changes")


class StatusChangeLog(Base):
    """状态变更日志 - 保证接口状态与导出截图说明一致"""
    __tablename__ = "status_change_logs"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=False, index=True)

    old_status = Column(String(32), nullable=False)
    new_status = Column(String(32), nullable=False)
    remark = Column(String(512), nullable=True, comment="状态变更说明(会出现在截图说明里)")

    changed_by = Column(String(128), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, index=True)

    trial = relationship("TrialCalculation", back_populates="status_changes")


STATUS_CHOICES = {
    "draft": "草稿",
    "pending": "待审核",
    "approved": "已确认",
    "rejected": "已驳回",
    "exported": "已导出",
}

STATUS_EXPORT_DESCRIPTIONS = {
    "draft": "当前处于草稿阶段，参数未经过审核确认，仅供参考",
    "pending": "当前待审核，参数已提交项目经理审核，最终结果以审核通过为准",
    "approved": "参数已审核确认，用于正式分析与报告输出",
    "rejected": "参数已驳回，请根据驳回意见调整后重新提交",
    "exported": "参数已导出归档，如需调整请创建新版本",
}


class HistoricalAnswer(Base):
    """历史答案表 - 保留项目经理交来的历史答案，字段名可能前后不一"""
    __tablename__ = "historical_answers"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=False, index=True)

    answer_source = Column(String(256), nullable=False, index=True,
                           comment="来源: 项目经理姓名/历史项目编号/文件名")
    answer_batch = Column(String(128), nullable=True, index=True, comment="答案批次")

    original_field_names = Column(JSON, nullable=True,
                                   comment="原始字段名清单(可能前后不一)")
    standardized_field_map = Column(JSON, nullable=True,
                                     comment="标准化映射: 标准字段名→原始值")
    answer_value = Column(Float, nullable=False, comment="提取出的标准答案值")
    answer_confidence = Column(Float, nullable=True, comment="答案可信度(0-1)")

    processing_status = Column(String(32), nullable=False, default="pending",
                                index=True,
                                comment="处理状态: pending待处理/mapped已映射/adopted已采用/ignored已忽略")
    processing_remark = Column(String(512), nullable=True, comment="处理说明")

    raw_answer_payload = Column(JSON, nullable=True,
                                 comment="原始答案完整载荷(保住来源，字段名前后不一也没关系)")

    created_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    adopted_at = Column(DateTime, nullable=True, comment="被采纳时间")

    trial = relationship("TrialCalculation", back_populates="historical_answers")
    weight_changes = relationship("WeightChangeLog", back_populates="historical_answer")


PROCESSING_STATUS_CHOICES = {
    "pending": "待处理",
    "mapped": "已映射",
    "adopted": "已采用",
    "ignored": "已忽略",
}


class TraceRecord(Base):
    """数据追溯线索 - 数字从哪来要有线索，给不看代码的人讲故事用"""
    __tablename__ = "trace_records"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=False, index=True)

    trace_stage = Column(String(64), nullable=False, index=True,
                         comment="追溯阶段: material材料接收/preprocess预处理/calculation计算/adjust调整/finalize定稿")
    field_name = Column(String(128), nullable=True, comment="涉及字段")
    field_value_before = Column(String(512), nullable=True, comment="变更前")
    field_value_after = Column(String(512), nullable=True, comment="变更后")

    narrative = Column(Text, nullable=False,
                        comment="人话描述(彩排讲给不看代码的人听)")
    evidence_ref = Column(String(512), nullable=True,
                           comment="证据引用: 文件名/单元格/消息链接/会议纪要")
    evidence_snapshot = Column(JSON, nullable=True, comment="证据数据快照")

    operator = Column(String(128), nullable=True)
    operated_at = Column(DateTime, default=datetime.utcnow, index=True)

    trial = relationship("TrialCalculation", back_populates="trace_records")


TRACE_STAGE_CHOICES = {
    "material": "材料接收",
    "preprocess": "数据预处理",
    "calculation": "贝叶斯计算",
    "adjust": "人工调整",
    "finalize": "结果定稿",
}


class ExportRecord(Base):
    """导出记录 - 保证页面看到的状态和文件里的说法一致"""
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(Integer, ForeignKey("trial_calculations.id"), nullable=False, index=True)

    export_type = Column(String(32), nullable=False, default="screenshot",
                          comment="导出类型: screenshot截图说明/excel数据表/report报告")
    export_filename = Column(String(512), nullable=False)
    export_status_label = Column(String(128), nullable=False,
                                  comment="导出时的状态文字(与说明一致)")
    export_status_description = Column(Text, nullable=True,
                                        comment="导出时的状态详细说明(截图里的文字)")
    status_at_export = Column(String(32), nullable=False, comment="导出瞬间的状态code")

    is_duplicate_at_export = Column(Boolean, nullable=False, default=False,
                                     comment="导出时是否为重复样本")
    weight_at_export = Column(Float, nullable=False, comment="导出时的权重快照")
    parameters_snapshot = Column(JSON, nullable=True, comment="参数快照")

    export_screenshot_caption = Column(Text, nullable=True,
                                        comment="截图说明文字(与页面状态一致)")

    exported_by = Column(String(128), nullable=True)
    exported_at = Column(DateTime, default=datetime.utcnow, index=True)

    trial = relationship("TrialCalculation", back_populates="export_records")


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)
