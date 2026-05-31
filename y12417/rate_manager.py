from datetime import date, timedelta
from typing import Optional, List, Dict
from dataclasses import dataclass

from models import FeeRate, FeeRateVersion


@dataclass
class RateLookupResult:
    found: bool
    rate: Optional[float] = None
    version_id: Optional[str] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_expired: bool = False
    message: str = ""


class RateManager:
    def __init__(self):
        self.rates: Dict[str, FeeRate] = {}

    def add_rate(self, rate: FeeRate) -> None:
        if rate.security_code in self.rates:
            existing = self.rates[rate.security_code]
            for version in rate.versions:
                if not any(v.version_id == version.version_id for v in existing.versions):
                    existing.versions.append(version)
            existing.versions.sort(key=lambda v: v.effective_date, reverse=True)
        else:
            self.rates[rate.security_code] = rate
            self.rates[rate.security_code].versions.sort(key=lambda v: v.effective_date, reverse=True)

    def add_rate_version(self, security_code: str, version: FeeRateVersion) -> None:
        if security_code not in self.rates:
            self.rates[security_code] = FeeRate(
                security_code=security_code,
                security_name=security_code,
                versions=[]
            )
        if not any(v.version_id == version.version_id for v in self.rates[security_code].versions):
            self.rates[security_code].versions.append(version)
            self.rates[security_code].versions.sort(key=lambda v: v.effective_date, reverse=True)

    def get_rate_for_date(self, security_code: str, lookup_date: date) -> RateLookupResult:
        if security_code not in self.rates:
            return RateLookupResult(
                found=False,
                message=f"未找到证券 [{security_code}] 的费率配置"
            )
        
        fee_rate = self.rates[security_code]
        
        matching_versions = []
        for version in fee_rate.versions:
            if version.effective_date <= lookup_date:
                if version.expiry_date is None or version.expiry_date >= lookup_date:
                    matching_versions.append(version)
        
        if matching_versions:
            matching_versions.sort(key=lambda v: v.effective_date, reverse=True)
            best_match = matching_versions[0]
            return RateLookupResult(
                found=True,
                rate=best_match.rate,
                version_id=best_match.version_id,
                effective_date=best_match.effective_date,
                expiry_date=best_match.expiry_date,
                is_expired=False,
                message=f"使用费率版本 {best_match.version_id} (生效日: {best_match.effective_date})"
            )
        
        expired_versions = []
        for version in fee_rate.versions:
            if version.expiry_date and version.expiry_date < lookup_date:
                expired_versions.append(version)
        
        if expired_versions:
            expired_versions.sort(key=lambda v: v.expiry_date, reverse=True)
            latest_expired = expired_versions[0]
            return RateLookupResult(
                found=False,
                rate=latest_expired.rate,
                version_id=latest_expired.version_id,
                effective_date=latest_expired.effective_date,
                expiry_date=latest_expired.expiry_date,
                is_expired=True,
                message=f"证券 [{security_code}] 的费率已于 {latest_expired.expiry_date} 过期，无有效费率"
            )
        
        future_versions = []
        for version in fee_rate.versions:
            if version.effective_date > lookup_date:
                future_versions.append(version)
        
        if future_versions:
            future_versions.sort(key=lambda v: v.effective_date)
            earliest_future = future_versions[0]
            return RateLookupResult(
                found=False,
                rate=None,
                version_id=None,
                effective_date=None,
                expiry_date=None,
                is_expired=False,
                message=f"证券 [{security_code}] 在 {lookup_date} 尚无有效费率，下一版本费率将于 {earliest_future.effective_date} 生效"
            )
        
        return RateLookupResult(
            found=False,
            message=f"证券 [{security_code}] 无任何费率配置"
        )

    def get_all_versions(self, security_code: str) -> List[FeeRateVersion]:
        if security_code not in self.rates:
            return []
        return sorted(self.rates[security_code].versions, key=lambda v: v.effective_date, reverse=True)

    def get_rate_history(self, security_code: str) -> List[Dict]:
        if security_code not in self.rates:
            return []
        
        history = []
        for version in sorted(self.rates[security_code].versions, key=lambda v: v.effective_date):
            history.append({
                "version_id": version.version_id,
                "rate": version.rate,
                "effective_date": version.effective_date,
                "expiry_date": version.expiry_date,
                "is_active": version.is_active,
                "created_at": version.created_at,
                "created_by": version.created_by
            })
        return history

    def get_version_by_id(self, version_id: str) -> Optional[FeeRateVersion]:
        for fee_rate in self.rates.values():
            for version in fee_rate.versions:
                if version.version_id == version_id:
                    return version
        return None

    def list_all_securities(self) -> List[str]:
        return list(self.rates.keys())

    def get_security_name(self, security_code: str) -> Optional[str]:
        if security_code in self.rates:
            return self.rates[security_code].security_name
        return None

    def check_rate_expiry(self, check_date: date, days_warning: int = 7) -> List[Dict]:
        expiring_rates = []
        
        for security_code, fee_rate in self.rates.items():
            for version in fee_rate.versions:
                if version.expiry_date and version.is_active:
                    days_to_expiry = (version.expiry_date - check_date).days
                    if 0 <= days_to_expiry <= days_warning:
                        expiring_rates.append({
                            "security_code": security_code,
                            "security_name": fee_rate.security_name,
                            "version_id": version.version_id,
                            "rate": version.rate,
                            "expiry_date": version.expiry_date,
                            "days_to_expiry": days_to_expiry
                        })
        
        return expiring_rates

    def get_rate_for_period(self, security_code: str, start_date: date, end_date: date) -> List[Dict]:
        periods = []
        current_date = start_date
        
        while current_date <= end_date:
            result = self.get_rate_for_date(security_code, current_date)
            
            if result.found and result.effective_date:
                period_end = result.expiry_date or end_date
                if period_end > end_date:
                    period_end = end_date
                
                actual_end = min(period_end, end_date)
                days = (actual_end - current_date).days + 1
                
                periods.append({
                    "start_date": current_date,
                    "end_date": actual_end,
                    "days": days,
                    "rate": result.rate,
                    "version_id": result.version_id,
                    "is_expired": result.is_expired
                })
                
                current_date = actual_end + timedelta(days=1)
            else:
                periods.append({
                    "start_date": current_date,
                    "end_date": current_date,
                    "days": 1,
                    "rate": None,
                    "version_id": None,
                    "is_expired": result.is_expired,
                    "message": result.message
                })
                current_date += timedelta(days=1)
        
        return periods
