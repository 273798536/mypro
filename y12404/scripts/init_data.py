import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime
from decimal import Decimal
from app.models.database import SessionLocal, Producer, Track, ExchangeRate, Currency, Platform

def init_data():
    db = SessionLocal()
    try:
        print("初始化基础数据...")

        producers = [
            Producer(name="音乐工作室A", contact="张三", email="a@music.com", tax_id="TAX001", split_ratio=1.0),
            Producer(name="音乐工作室B", contact="李四", email="b@music.com", tax_id="TAX002", split_ratio=0.8),
            Producer(name="独立音乐人C", contact="王五", email="c@music.com", tax_id="TAX003", split_ratio=1.0),
        ]
        for p in producers:
            existing = db.query(Producer).filter(Producer.name == p.name).first()
            if not existing:
                db.add(p)
        db.commit()

        saved_producers = db.query(Producer).all()
        producer_map = {p.name: p.id for p in saved_producers}

        tracks = [
            Track(isrc="CN1234567890", title="夜空中最亮的星", artist="逃跑计划", album="世界", producer_id=producer_map.get("音乐工作室A")),
            Track(isrc="CN1234567891", title="追光者", artist="岑宁儿", album="夏至未至", producer_id=producer_map.get("音乐工作室B")),
            Track(isrc="CN1234567892", title="晴天", artist="周杰伦", album="叶惠美", producer_id=producer_map.get("独立音乐人C")),
            Track(isrc="CN1234567893", title="稻香", artist="周杰伦", album="魔杰座", producer_id=producer_map.get("独立音乐人C")),
            Track(isrc="CN1234567894", title="七里香", artist="周杰伦", album="七里香", producer_id=producer_map.get("独立音乐人C")),
        ]
        for t in tracks:
            existing = db.query(Track).filter(Track.isrc == t.isrc).first()
            if not existing:
                db.add(t)
        db.commit()

        rates = [
            ExchangeRate(from_currency=Currency.USD, to_currency=Currency.CNY, rate=Decimal("7.245600"), rate_date=date(2024, 4, 1), source="央行中间价"),
            ExchangeRate(from_currency=Currency.EUR, to_currency=Currency.CNY, rate=Decimal("7.823400"), rate_date=date(2024, 4, 1), source="央行中间价"),
            ExchangeRate(from_currency=Currency.GBP, to_currency=Currency.CNY, rate=Decimal("9.156700"), rate_date=date(2024, 4, 1), source="央行中间价"),
            ExchangeRate(from_currency=Currency.JPY, to_currency=Currency.CNY, rate=Decimal("0.048200"), rate_date=date(2024, 4, 1), source="央行中间价"),
        ]
        for r in rates:
            existing = db.query(ExchangeRate).filter(
                ExchangeRate.from_currency == r.from_currency,
                ExchangeRate.rate_date == r.rate_date
            ).first()
            if not existing:
                db.add(r)
        db.commit()

        print("数据初始化完成!")
        print(f"制作人: {db.query(Producer).count()} 条")
        print(f"曲目: {db.query(Track).count()} 条")
        print(f"汇率: {db.query(ExchangeRate).count()} 条")

    except Exception as e:
        print(f"初始化失败: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_data()
