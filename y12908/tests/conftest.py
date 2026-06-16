import os
import sys
import tempfile
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_test_data():
    return {
        "batch_name": "测试批次_2024Q1",
        "samples": [
            {
                "content": {
                    "turns": [
                        {"user": "你好，我想了解一下产品定价", "assistant": "您好！我们产品的基础版是99元/月。"},
                        {"user": "那高级版呢？", "assistant": "高级版是199元/月，包含更多功能。"},
                        {"user": "好的，谢谢", "assistant": "不客气，还有其他问题吗？"}
                    ]
                },
                "conversation_id": "conv_001",
                "user_id": "user_001",
                "split_type": "train",
                "source_dataset": "客服对话"
            },
            {
                "content": {
                    "turns": [
                        {"user": "如何重置密码？", "assistant": "点击忘记密码，按提示操作即可。"},
                        {"user": "还是不行", "assistant": "请提供注册邮箱，我们发重置链接给您。"}
                    ]
                },
                "conversation_id": "conv_002",
                "user_id": "user_002",
                "split_type": "val",
                "source_dataset": "客服对话"
            }
        ]
    }


@pytest.fixture
def eval_test_data():
    return {
        "bank_name": "产品课评测题_第1期",
        "questions": [
            {
                "content": {
                    "question": "请解释产品的定价策略",
                    "answer": "我们采用分层定价策略，基础版99元/月，高级版199元/月。"
                },
                "question_id": "q_001"
            },
            {
                "content": {
                    "question": "如何处理用户的密码重置请求？",
                    "answer": "首先引导用户点击忘记密码，如仍有问题则通过邮箱发送重置链接。"
                },
                "question_id": "q_002"
            }
        ]
    }
