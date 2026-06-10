from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "curing_system.db"))
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class BatchReport(Base):
    __tablename__ = "batch_reports"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String, unique=True, index=True, nullable=False, comment="树脂生产批号")
    resin_type = Column(String, nullable=False, comment="树脂型号")
    manufacturer = Column(String, comment="生产厂家")
    production_date = Column(String, comment="生产日期")
    nominal_concentration = Column(Float, comment="标称浓度(%)")
    report_file = Column(String, comment="批次报告文件路径")
    created_at = Column(DateTime, default=datetime.now)
    remark = Column(Text, comment="备注")

    experiments = relationship("ExperimentRecord", back_populates="batch_report")


class SpectrumData(Base):
    __tablename__ = "spectrum_data"

    id = Column(Integer, primary_key=True, index=True)
    spectrum_id = Column(String, unique=True, index=True, nullable=False, comment="谱图唯一编号")
    file_name = Column(String, nullable=False, comment="原始文件名")
    spectrum_type = Column(String, comment="谱图类型(FTIR/DSC/Rheology)")
    time_points = Column(JSON, nullable=False, comment="时间点序列[秒]")
    signal_values = Column(JSON, nullable=False, comment="信号值序列")
    temperature = Column(Float, comment="测试温度(℃)")
    measured_at = Column(String, comment="测试时间")
    raw_json = Column(JSON, comment="原始数据JSON")
    created_at = Column(DateTime, default=datetime.now)

    experiment = relationship("ExperimentRecord", back_populates="spectrum", uselist=False)


class ExperimentRecord(Base):
    __tablename__ = "experiment_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String, unique=True, index=True, nullable=False, comment="实验记录编号(批号+序号)")
    batch_no = Column(String, ForeignKey("batch_reports.batch_no"), nullable=False, index=True, comment="关联批号")
    seq_no = Column(Integer, default=1, comment="同批号下的序号")
    spectrum_id = Column(String, ForeignKey("spectrum_data.spectrum_id"), index=True, comment="关联谱图编号")
    operator = Column(String, comment="操作人员")
    experiment_date = Column(String, comment="实验日期")
    initial_weight = Column(Float, comment="试样初始重量(g)")
    curing_agent_ratio = Column(Float, comment="固化剂配比(%)")
    actual_concentration = Column(Float, comment="实测浓度(%)")
    remark = Column(Text, comment="人工备注")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    batch_report = relationship("BatchReport", back_populates="experiments")
    spectrum = relationship("SpectrumData", back_populates="experiment")
    curing_result = relationship("CuringTimeResult", back_populates="experiment", uselist=False, cascade="all, delete-orphan")


class CuringTimeResult(Base):
    __tablename__ = "curing_time_results"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String, ForeignKey("experiment_records.record_no"), unique=True, nullable=False, index=True, comment="关联实验记录")
    gel_time = Column(Float, comment="凝胶时间(秒) - 粘度突变点")
    vitrification_time = Column(Float, comment="玻璃化时间(秒) - 固化完成点")
    full_cure_time = Column(Float, comment="完全固化时间(秒) - 信号平台起点")
    curing_degree = Column(Float, comment="固化度(%)")
    peak_signal = Column(Float, comment="特征峰强度")
    peak_area = Column(Float, comment="特征峰面积")
    method_used = Column(String, comment="判定方法(切线法/微分法/平台法)")
    judgment = Column(String, comment="判定结论:PASS/待确认/FAIL")
    confidence = Column(Float, comment="置信度(0-1)")
    chart_summary = Column(JSON, comment="图表数据摘要(供导出一致性)")
    text_summary = Column(Text, comment="文字说明摘要(供导出一致性)")
    calculated_at = Column(DateTime, default=datetime.now)
    recalculation_count = Column(Integer, default=0, comment="重算次数")

    experiment = relationship("ExperimentRecord", back_populates="curing_result")


class ImportAuditLog(Base):
    __tablename__ = "import_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    import_batch_id = Column(String, index=True, nullable=False, comment="本次导入批次号")
    record_no = Column(String, index=True, comment="处理的记录号")
    action = Column(String, comment="动作:CREATED/UPDATED/SKIPPED/FAILED")
    reason = Column(Text, comment="原因")
    suggestion = Column(Text, comment="可操作建议")
    detail = Column(JSON, comment="详细信息")
    operator = Column(String, comment="操作人")
    created_at = Column(DateTime, default=datetime.now)


Base.metadata.create_all(bind=engine)
