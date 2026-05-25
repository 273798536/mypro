from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import User
from app.config import settings

class AuthService:
    @staticmethod
    def init_default_users(db: Session):
        existing = db.query(User).first()
        if existing:
            return
        
        for user_data in User.get_default_users():
            user = User(**user_data)
            db.add(user)
        db.commit()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.user_id == user_id).first()
    
    @staticmethod
    def get_user_role(db: Session, user_id: str) -> Optional[str]:
        user = AuthService.get_user_by_id(db, user_id)
        return user.role if user else None
    
    @staticmethod
    def check_permission(db: Session, user_id: str, required_roles: List[str], operation: str) -> dict:
        user = AuthService.get_user_by_id(db, user_id)
        
        if not user:
            return {
                "passed": False,
                "intercepted": True,
                "user_id": user_id,
                "user_role": None,
                "required_roles": required_roles,
                "operation": operation,
                "message": f"用户 {user_id} 不存在",
            }
        
        has_permission = user.role in required_roles
        
        return {
            "passed": has_permission,
            "intercepted": not has_permission,
            "user_id": user_id,
            "username": user.username,
            "user_role": user.role,
            "required_roles": required_roles,
            "operation": operation,
            "message": "权限校验通过" if has_permission else f"用户 {user.username}({user.role}) 权限不足，需要角色: {', '.join(required_roles)}",
        }
    
    @staticmethod
    def require_permission(db: Session, user_id: str, required_roles: List[str], operation: str) -> dict:
        result = AuthService.check_permission(db, user_id, required_roles, operation)
        
        if not result["passed"]:
            from app.services.automation_check_service import AutomationCheckService
            AutomationCheckService.create_check(
                db,
                "permission_intercept",
                f"权限拦截-{operation}",
                target_entity="user",
                target_id=user_id,
            )
        
        return result
