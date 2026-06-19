from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User, UserRole, OperationGuide
from .auth import hash_password


def init_default_data():
    db = SessionLocal()
    try:
        _init_users(db)
        _init_operation_guides(db)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"初始化数据失败: {e}")
    finally:
        db.close()


def _init_users(db: Session):
    default_users = [
        {
            "username": "admin",
            "full_name": "系统管理员",
            "email": "admin@example.com",
            "password": "admin123",
            "role": UserRole.ADMIN
        },
        {
            "username": "xiaomeng",
            "full_name": "小孟（评测同事）",
            "email": "xiaomeng@example.com",
            "password": "123456",
            "role": UserRole.REVIEWER
        },
        {
            "username": "scheduler",
            "full_name": "排班同事",
            "email": "scheduler@example.com",
            "password": "123456",
            "role": UserRole.SCHEDULER
        }
    ]
    
    for user_data in default_users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            user = User(
                username=user_data["username"],
                full_name=user_data["full_name"],
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"]
            )
            db.add(user)


def _init_operation_guides(db: Session):
    guides = [
        {
            "section_key": "upload_materials",
            "title": "📁 材料上传区",
            "content": "此处上传待审查的代码样本、审查结果原始数据。支持JSON、CSV格式。上传前请确认数据脱敏处理，不含敏感信息。",
            "position_hint": "sidebar_top",
            "icon": "folder-upload",
            "sort_order": 1
        },
        {
            "section_key": "view_anomalies",
            "title": "⚠️ 异常查看区",
            "content": "此处查看系统检测到的所有异常，包括：样本泄漏警告、误判标记、数据不一致等。点击异常条目可查看详情和影响范围。样本泄漏会标红置顶。",
            "position_hint": "main_top",
            "icon": "alert-triangle",
            "sort_order": 2
        },
        {
            "section_key": "manual_correction",
            "title": "✏️ 人工修正区",
            "content": "此处处理需要人工干预的误判。每条修正必须填写改变了哪些判断（original → new）。修正会永久保留，新结果不会覆盖历史修正记录。",
            "position_hint": "main_middle",
            "icon": "edit",
            "sort_order": 3
        },
        {
            "section_key": "export_report",
            "title": "📤 报告导出区",
            "content": "此处导出灰度报告。报告可拆分查看：样本变化、阈值变化、人工改判。支持Excel、PDF格式导出。导出前请确认所有修正已处理完毕。",
            "position_hint": "sidebar_bottom",
            "icon": "download",
            "sort_order": 4
        },
        {
            "section_key": "status_tracking",
            "title": "📊 状态跟踪区",
            "content": "此处查看当前会话的处理状态、历史备注、页面摘要。服务重启后状态自动恢复。排班同事可直接查看上次处理进度。",
            "position_hint": "main_right",
            "icon": "activity",
            "sort_order": 5
        }
    ]
    
    for guide_data in guides:
        existing = db.query(OperationGuide).filter(
            OperationGuide.section_key == guide_data["section_key"]
        ).first()
        if not existing:
            guide = OperationGuide(**guide_data)
            db.add(guide)
