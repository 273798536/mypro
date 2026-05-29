from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
import uuid
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)


def create_sample_data():
    db = SessionLocal()
    
    try:
        print("正在创建样例数据...")
        
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        expired_date = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        accounts_data = [
            {
                "account_no": "RZ001",
                "customer_name": "张三",
                "total_assets": 1500000,
                "total_debt": 1000000,
                "available_cash": 100000,
                "margin_line": 130.0,
                "warning_line": 150.0,
                "risk_level": "warning"
            },
            {
                "account_no": "RZ002",
                "customer_name": "李四",
                "total_assets": 2000000,
                "total_debt": 800000,
                "available_cash": 200000,
                "margin_line": 130.0,
                "warning_line": 150.0,
                "risk_level": "normal"
            },
            {
                "account_no": "RZ003",
                "customer_name": "王五",
                "total_assets": 1200000,
                "total_debt": 1000000,
                "available_cash": 50000,
                "margin_line": 130.0,
                "warning_line": 150.0,
                "risk_level": "danger"
            },
            {
                "account_no": "RZ004",
                "customer_name": "赵六",
                "total_assets": 1800000,
                "total_debt": 1200000,
                "available_cash": 80000,
                "margin_line": 130.0,
                "warning_line": 150.0,
                "risk_level": "warning"
            },
            {
                "account_no": "RZ005",
                "customer_name": "钱七",
                "total_assets": 3000000,
                "total_debt": 1500000,
                "available_cash": 300000,
                "margin_line": 130.0,
                "warning_line": 150.0,
                "risk_level": "normal"
            }
        ]
        
        account_ids = {}
        for acc_data in accounts_data:
            acc_id = str(uuid.uuid4())
            account = models.Account(id=acc_id, **acc_data)
            db.add(account)
            account_ids[acc_data["account_no"]] = acc_id
            print(f"  创建账户: {acc_data['account_no']} - {acc_data['customer_name']}")
        
        db.commit()
        
        margin_rates_data = [
            {"stock_code": "600519", "stock_name": "贵州茅台", "collateral_rate": 0.70, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "000001", "stock_name": "平安银行", "collateral_rate": 0.65, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "601318", "stock_name": "中国平安", "collateral_rate": 0.65, "effective_date": "2024-01-01", "expiry_date": expired_date},
            {"stock_code": "000858", "stock_name": "五粮液", "collateral_rate": 0.70, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "600036", "stock_name": "招商银行", "collateral_rate": 0.65, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "300750", "stock_name": "宁德时代", "collateral_rate": 0.60, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "601899", "stock_name": "紫金矿业", "collateral_rate": 0.55, "effective_date": "2024-01-01", "expiry_date": future_date},
            {"stock_code": "002594", "stock_name": "比亚迪", "collateral_rate": 0.60, "effective_date": "2024-01-01", "expiry_date": future_date}
        ]
        
        for rate_data in margin_rates_data:
            rate_id = str(uuid.uuid4())
            rate = models.MarginRate(id=rate_id, **rate_data)
            db.add(rate)
            print(f"  创建折算率: {rate_data['stock_code']} - {rate_data['stock_name']}")
        
        db.commit()
        
        positions_data = [
            {"account_no": "RZ001", "stock_code": "600519", "stock_name": "贵州茅台", "quantity": 200, "market_value": 340000, "cost_price": 1600},
            {"account_no": "RZ001", "stock_code": "000001", "stock_name": "平安银行", "quantity": 50000, "market_value": 550000, "cost_price": 10.5},
            {"account_no": "RZ001", "stock_code": "601318", "stock_name": "中国平安", "quantity": 10000, "market_value": 450000, "cost_price": 42},
            {"account_no": "RZ002", "stock_code": "000858", "stock_name": "五粮液", "quantity": 3000, "market_value": 480000, "cost_price": 150},
            {"account_no": "RZ002", "stock_code": "600036", "stock_name": "招商银行", "quantity": 20000, "market_value": 680000, "cost_price": 32},
            {"account_no": "RZ003", "stock_code": "300750", "stock_name": "宁德时代", "quantity": 3000, "market_value": 600000, "cost_price": 180},
            {"account_no": "RZ003", "stock_code": "601899", "stock_name": "紫金矿业", "quantity": 100000, "market_value": 1500000, "cost_price": 14, "is_suspended": True, "suspended_price": 15},
            {"account_no": "RZ004", "stock_code": "601318", "stock_name": "中国平安", "quantity": 15000, "market_value": 675000, "cost_price": 45},
            {"account_no": "RZ004", "stock_code": "002594", "stock_name": "比亚迪", "quantity": 2000, "market_value": 500000, "cost_price": 240},
            {"account_no": "RZ005", "stock_code": "600519", "stock_name": "贵州茅台", "quantity": 500, "market_value": 850000, "cost_price": 1650},
            {"account_no": "RZ005", "stock_code": "000858", "stock_name": "五粮液", "quantity": 5000, "market_value": 800000, "cost_price": 155}
        ]
        
        for pos_data in positions_data:
            pos_id = str(uuid.uuid4())
            account_no = pos_data.pop("account_no")
            account_id = account_ids.get(account_no)
            if account_id:
                position = models.Position(id=pos_id, account_id=account_id, **pos_data)
                db.add(position)
                print(f"  创建持仓: {account_no} - {pos_data['stock_code']}")
        
        db.commit()
        
        quotes_data = [
            {"stock_code": "600519", "stock_name": "贵州茅台", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 1700, "pre_close_price": 1690, "high_price": 1720, "low_price": 1680},
            {"stock_code": "000001", "stock_name": "平安银行", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 11.2, "pre_close_price": 11.0, "high_price": 11.3, "low_price": 10.9},
            {"stock_code": "601318", "stock_name": "中国平安", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 45.5, "pre_close_price": 45.0, "high_price": 46.0, "low_price": 44.8},
            {"stock_code": "000858", "stock_name": "五粮液", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 162, "pre_close_price": 160, "high_price": 164, "low_price": 159},
            {"stock_code": "600036", "stock_name": "招商银行", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 34.5, "pre_close_price": 34.0, "high_price": 34.8, "low_price": 33.9},
            {"stock_code": "300750", "stock_name": "宁德时代", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 205, "pre_close_price": 200, "high_price": 208, "low_price": 198},
            {"stock_code": "601899", "stock_name": "紫金矿业", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 15, "pre_close_price": 15.2, "high_price": 15.3, "low_price": 14.9, "is_suspended": True},
            {"stock_code": "002594", "stock_name": "比亚迪", "snapshot_date": today, "snapshot_time": "15:00:00", "current_price": 255, "pre_close_price": 250, "high_price": 258, "low_price": 248}
        ]
        
        for quote_data in quotes_data:
            quote_id = str(uuid.uuid4())
            quote = models.QuoteSnapshot(id=quote_id, **quote_data)
            db.add(quote)
            print(f"  创建行情: {quote_data['stock_code']} - {quote_data['snapshot_date']}")
        
        db.commit()
        
        print("\n样例数据创建完成!")
        print(f"\n数据概览:")
        print(f"  - 客户账户: {len(accounts_data)} 个")
        print(f"  - 折算率记录: {len(margin_rates_data)} 条")
        print(f"  - 证券持仓: {len(positions_data)} 条")
        print(f"  - 行情快照: {len(quotes_data)} 条")
        print(f"\n注意: 中国平安(601318)的折算率已过期，紫金矿业(601899)已停牌")
        print(f"      可用于测试折算率过期和停牌价格的处理逻辑")
        
        return account_ids
        
    except Exception as e:
        print(f"创建样例数据时出错: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
