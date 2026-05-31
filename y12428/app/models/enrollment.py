from __future__ import annotations
from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EnrollmentStatus(str, Enum):
    ENROLLED = "enrolled"
    DROPPED = "dropped"
    PENDING = "pending"


class Enrollment(BaseModel):
    id: str = Field(description="选课记录唯一ID")
    student_id: str = Field(description="学生学号")
    student_name: str = Field(description="学生姓名")
    home_school_id: str = Field(description="学籍所在学校ID")
    host_school_id: str = Field(description="开课学校ID")
    course_id: str = Field(description="课程ID")
    course_name: str = Field(description="课程名称")
    credits: float = Field(description="学分")
    status: EnrollmentStatus = Field(default=EnrollmentStatus.PENDING)
    enrolled_at: datetime = Field(description="选课时间")
    dropped_at: Optional[datetime] = Field(default=None, description="退课时间")
    agreement_id: Optional[str] = Field(default=None, description="关联协议ID")
    agreement_version: Optional[int] = Field(default=None, description="选课时协议版本号")


class EnrollmentCreate(BaseModel):
    student_id: str
    student_name: str
    home_school_id: str
    host_school_id: str
    course_id: str
    course_name: str
    credits: float
