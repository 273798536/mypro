from datetime import datetime
from .sample_processor import SampleStore, WeakSample
from .config import SAMPLE_STATUS


LONG_TEXT = (
    "这是一段非常非常长的用户反馈文本，我们需要把它完整地记录下来，"
    "因为里面包含了用户从安装、登录、使用到最终报错的全部过程描述。"
    "用户先说他在MacBook Pro上安装了最新版本，然后在登录时遇到了验证码的问题，"
    "接着他尝试了三次不同的网络环境，分别是家里的WiFi、公司的VPN和手机热点，"
    "结果都一样，都是在点击登录按钮后卡住大约30秒然后提示'网络异常请稍后重试'。"
    "但是用户同时补充说，他的浏览器打开其他网站完全正常，下载速度也能达到每秒5MB，"
    "所以他怀疑不是自己这边的问题，而是服务端的登录接口存在某种超时或者限流机制。"
    "另外他还提到，他的同事在同一栋楼里用同样的网络也遇到了一模一样的问题，"
    "而且问题是昨天下午3点左右突然出现的，之前一直都好好的，没有改过任何配置。"
    "用户最后希望我们尽快排查一下，因为这影响了他们团队整个下午的工作进度，"
    "如果需要更多日志或者抓包信息他可以配合提供，联系方式已经在工单系统里留了。"
    "哦对了，还有一个细节他补充说，在问题出现之前他刚刚更新过系统的安全补丁，"
    "不知道是不是这个原因导致的，但他觉得概率不大，因为同事没更补丁也一样挂了。"
    "另外用户还截图了三张错误页面，分别是登录页、验证码加载失败页、以及最终报错页，"
    "截图里可以看到浏览器控制台有若干跨域相关的红色报错信息，但用户说他不太懂技术，"
    "所以只是把能看到的都截下来了，具体哪条报错是关键他也分不清楚，让我们自己鉴别。"
    "还有就是这个问题只在Chrome浏览器上复现，Safari和Firefox他都试过了，暂时没遇到，"
    "他的Chrome版本是最新的138.x系列，操作系统是macOS Sonoma 14.5，这些信息都写在工单附录里。"
)

BAD_TEXT = (
    "这是一条垃圾数据，里面有违规赌博色情广告和大量乱七八糟的内容，"
    "联系方式加微信xxxxxxx，保证赢钱之类的，明显就是坏样本。"
)

GOOD_TEXT = (
    "用户反馈：在搜索框输入带特殊字符的查询词时，结果页排序出现异常，"
    "期望按相关度降序但实际按时间升序显示，已复现。"
)


def seed_samples(store: SampleStore) -> None:
    if store.list_all():
        return

    samples = [
        WeakSample(
            sample_id="SMPL-20260617-001",
            text=GOOD_TEXT,
            source="internal_tagging",
            human_note="业务侧确认这确实是搜索排序的弱项，上周对客会刚提过，优先级高",
            status=SAMPLE_STATUS["PENDING"],
            created_at=datetime(2026, 6, 17, 10, 15, 0).isoformat(),
        ),
        WeakSample(
            sample_id="SMPL-20260617-002",
            text=LONG_TEXT,
            source="user_feedback_portal",
            human_note="这个用户写得巨啰嗦但每句都有用，千万别给我截断了，"
                       "我上次吃过大亏，截断后后半段那个同事也遇到的关键信息直接没了",
            status=SAMPLE_STATUS["PENDING"],
            created_at=datetime(2026, 6, 17, 11, 32, 0).isoformat(),
        ),
        WeakSample(
            sample_id="SMPL-20260617-003",
            text=BAD_TEXT,
            source="unknown_crawler",
            human_note="这条一看就是广告垃圾，别浪费人工时间直接丢掉吧",
            status=SAMPLE_STATUS["PENDING"],
            created_at=datetime(2026, 6, 17, 12, 5, 0).isoformat(),
        ),
    ]
    for s in samples:
        store.add(s)
