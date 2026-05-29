from datetime import datetime
from sqlalchemy.orm import Session
from models import Account, Position, QuoteSnapshot, MarginRate, MarginCall, MarginCallDetail
import uuid


def is_rate_expired(expiry_date: str, check_date: str) -> bool:
    if not expiry_date:
        return False
    try:
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        check = datetime.strptime(check_date, "%Y-%m-%d").date()
        return check > expiry
    except:
        return False


def get_margin_rate(db: Session, stock_code: str, check_date: str):
    rate = db.query(MarginRate).filter(
        MarginRate.stock_code == stock_code,
        MarginRate.is_active == True
    ).first()
    
    if rate:
        expired = is_rate_expired(rate.expiry_date, check_date)
        return {
            "rate": rate.collateral_rate if not expired else 0.0,
            "expired": expired,
            "original_rate": rate.collateral_rate
        }
    return {"rate": 0.65, "expired": False, "original_rate": 0.65}


def get_current_price(db: Session, stock_code: str, snapshot_date: str = None):
    if snapshot_date:
        quote = db.query(QuoteSnapshot).filter(
            QuoteSnapshot.stock_code == stock_code,
            QuoteSnapshot.snapshot_date == snapshot_date
        ).first()
        if quote:
            return quote.current_price, quote.is_suspended
    return None, False


def calculate_margin_ratio(db: Session, account_id: str, call_date: str, snapshot_date: str = None):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return None
    
    positions = db.query(Position).filter(Position.account_id == account_id).all()
    
    total_collateral_value = account.available_cash
    total_debt = account.total_debt
    has_expired_rate = False
    has_suspended_stock = False
    details = []
    
    for pos in positions:
        current_price, is_suspended = get_current_price(db, pos.stock_code, snapshot_date)
        
        if pos.is_suspended or is_suspended:
            has_suspended_stock = True
            used_price = pos.suspended_price if pos.suspended_price else (current_price if current_price else pos.cost_price)
            market_value = pos.quantity * used_price
            is_suspended_flag = True
        else:
            used_price = current_price if current_price else (pos.market_value / pos.quantity if pos.quantity > 0 else pos.cost_price)
            market_value = pos.quantity * used_price
            is_suspended_flag = False
        
        rate_info = get_margin_rate(db, pos.stock_code, call_date)
        collateral_rate = rate_info["rate"]
        
        if rate_info["expired"]:
            has_expired_rate = True
        
        collateral_value = market_value * collateral_rate
        total_collateral_value += collateral_value
        
        details.append({
            "stock_code": pos.stock_code,
            "stock_name": pos.stock_name,
            "quantity": pos.quantity,
            "market_value": market_value,
            "collateral_rate": collateral_rate,
            "collateral_value": collateral_value,
            "is_suspended": is_suspended_flag,
            "is_rate_expired": rate_info["expired"],
            "original_collateral_rate": rate_info["original_rate"]
        })
    
    if total_debt > 0:
        margin_ratio = (total_collateral_value / total_debt) * 100
    else:
        margin_ratio = 999.0
    
    risk_level = "normal"
    if margin_ratio <= account.margin_line:
        risk_level = "danger"
    elif margin_ratio <= account.warning_line:
        risk_level = "warning"
    
    required_deposit = 0.0
    if margin_ratio < account.margin_line:
        required_collateral = total_debt * (account.margin_line / 100)
        required_deposit = max(0, required_collateral - total_collateral_value)
    
    return {
        "account_id": account_id,
        "margin_ratio": round(margin_ratio, 2),
        "total_collateral_value": round(total_collateral_value, 2),
        "total_debt": round(total_debt, 2),
        "risk_level": risk_level,
        "required_deposit": round(required_deposit, 2),
        "has_expired_rate": has_expired_rate,
        "has_suspended_stock": has_suspended_stock,
        "details": details
    }


def create_margin_call(db: Session, account_id: str, call_date: str, snapshot_date: str = None):
    calc_result = calculate_margin_ratio(db, account_id, call_date, snapshot_date)
    if not calc_result:
        return None
    
    account = db.query(Account).filter(Account.id == account_id).first()
    
    existing_call = db.query(MarginCall).filter(
        MarginCall.account_id == account_id,
        MarginCall.call_date == call_date
    ).first()
    
    if existing_call:
        db.query(MarginCallDetail).filter(
            MarginCallDetail.margin_call_id == existing_call.id
        ).delete()
        margin_call = existing_call
    else:
        margin_call_id = str(uuid.uuid4())
        margin_call = MarginCall(
            id=margin_call_id,
            account_id=account_id,
            call_date=call_date,
            margin_ratio=calc_result["margin_ratio"],
            required_deposit=calc_result["required_deposit"],
            deadline=call_date,
            status="pending",
            risk_level=calc_result["risk_level"],
            notification_status="pending",
            is_duplicate=existing_call is not None,
            has_expired_rate=calc_result["has_expired_rate"],
            has_suspended_stock=calc_result["has_suspended_stock"]
        )
        db.add(margin_call)
    
    margin_call.margin_ratio = calc_result["margin_ratio"]
    margin_call.required_deposit = calc_result["required_deposit"]
    margin_call.risk_level = calc_result["risk_level"]
    margin_call.has_expired_rate = calc_result["has_expired_rate"]
    margin_call.has_suspended_stock = calc_result["has_suspended_stock"]
    
    next_actions = []
    if calc_result["has_expired_rate"]:
        next_actions.append("折算率过期，请联系风控部确认最新折算率")
    if calc_result["has_suspended_stock"]:
        next_actions.append("含停牌股票，请核实停牌价格沿用是否正确")
    if margin_call.is_duplicate:
        next_actions.append("当日已发送追保通知，请确认是否重复发送")
    
    if next_actions:
        margin_call.next_action = "；".join(next_actions)
        margin_call.status = "pending_confirm"
    
    for detail_data in calc_result["details"]:
        detail_id = str(uuid.uuid4())
        detail = MarginCallDetail(
            id=detail_id,
            margin_call_id=margin_call.id,
            **detail_data
        )
        db.add(detail)
    
    account.current_margin_ratio = calc_result["margin_ratio"]
    account.risk_level = calc_result["risk_level"]
    
    db.commit()
    db.refresh(margin_call)
    
    return margin_call
