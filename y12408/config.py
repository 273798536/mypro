import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'verification.db')
EXPORT_DIR = os.path.join(DATA_DIR, 'exports')

DATABASE_URL = f'sqlite:///{DB_PATH}'

ROOM_STATUS = {
    'CONTRACTED': '合同锁定',
    'CHECKED_IN': '已入住',
    'RESCHEDULED': '已改期',
    'CANCELLED': '已取消',
    'NO_SHOW': '晚到未住',
    'SELF_BOOKED': '自营补房',
    'VERIFIED': '已核销',
    'DISPUTE': '有争议'
}

VERIFICATION_CATEGORY = {
    'NORMAL': '正常入住',
    'RESCHEDULE': '改期核销',
    'CANCEL_NO_SHOW': '取消/晚到',
    'SELF_COMPENSATE': '自营补房',
    'REVISED': '修正后'
}

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
