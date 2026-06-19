from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import SessionComment, User
from ..schemas import SessionCommentCreate, SessionCommentResponse
from ..auth import get_current_any_role, get_current_reviewer

router = APIRouter()


def _enrich_comment_response(comment: SessionComment, db: Session) -> SessionCommentResponse:
    author = db.query(User).filter(User.id == comment.author_id).first()
    response = SessionCommentResponse.model_validate(comment)
    response.author_name = author.full_name if author else None
    return response


@router.get("/session/{session_id}", response_model=list[SessionCommentResponse])
def list_comments(
    session_id: int,
    comment_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(SessionComment).filter(SessionComment.session_id == session_id)
    if comment_type:
        query = query.filter(SessionComment.comment_type == comment_type)
    
    comments = query.order_by(SessionComment.created_at.asc()).all()
    return [_enrich_comment_response(c, db) for c in comments]


@router.post("", response_model=SessionCommentResponse)
def create_comment(
    comment_data: SessionCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    comment = SessionComment(
        **comment_data.model_dump(),
        author_id=current_user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _enrich_comment_response(comment, db)


@router.put("/{comment_id}", response_model=SessionCommentResponse)
def update_comment(
    comment_id: int,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    comment = db.query(SessionComment).filter(SessionComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评论不存在"
        )
    
    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能修改自己的评论"
        )
    
    if comment.comment_type == "system":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="系统生成的评论无法修改"
        )
    
    comment.content = content
    comment.updated_at = func.now()
    db.commit()
    db.refresh(comment)
    return _enrich_comment_response(comment, db)


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    comment = db.query(SessionComment).filter(SessionComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评论不存在"
        )
    
    if comment.comment_type == "system":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="系统生成的评论无法删除"
        )
    
    db.delete(comment)
    db.commit()
    return {"message": "评论已删除"}
