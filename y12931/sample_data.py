from typing import List, Dict


def generate_daily_samples() -> List[Dict]:
    samples = []

    samples.append({
        "text_content": "本产品适用于敏感肌肤，温和不刺激，经皮肤科医生测试认证。",
        "language": "zh",
        "label": "安全性说明",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.95,
    })
    samples.append({
        "text_content": "请勿让儿童接触本品，如不慎入眼请立即用大量清水冲洗。",
        "language": "zh",
        "label": "安全警告",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.98,
    })
    samples.append({
        "text_content": "每次使用量约为硬币大小，均匀涂抹于清洁后的面部肌肤。",
        "language": "zh",
        "label": "使用方法",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.88,
    })
    samples.append({
        "text_content": "建议每日早晚各使用一次，连续使用28天可见明显改善。",
        "language": "zh",
        "label": "使用频率",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.90,
    })
    samples.append({
        "text_content": "含烟酰胺、透明质酸、神经酰胺等多种有效护肤成分。",
        "language": "zh",
        "label": "成分说明",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.92,
    })
    samples.append({
        "text_content": "产品保质期为开封后12个月，未开封36个月。请置于阴凉干燥处保存。",
        "language": "zh",
        "label": "储存条件",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.85,
    })
    samples.append({
        "text_content": "This lightweight serum absorbs quickly without leaving a greasy residue.",
        "language": "en",
        "label": "使用感受",
        "source": "海外站-用户评价导出",
        "confidence": 0.91,
    })
    samples.append({
        "text_content": "Suitable for all skin types including sensitive and acne-prone skin.",
        "language": "en",
        "label": "适用肤质",
        "source": "海外站-用户评价导出",
        "confidence": 0.94,
    })
    samples.append({
        "text_content": "Apply a small amount to fingertips and gently pat onto face until fully absorbed.",
        "language": "en",
        "label": "使用方法",
        "source": "海外站-产品详情页",
        "confidence": 0.96,
    })
    samples.append({
        "text_content": "For external use only. Avoid direct contact with eyes. Keep out of reach of children.",
        "language": "en",
        "label": "安全警告",
        "source": "海外站-产品详情页",
        "confidence": 0.99,
    })
    samples.append({
        "text_content": "敏感肌の方でも安心してお使いいただける低刺激処方です。",
        "language": "ja",
        "label": "安全性说明",
        "source": "日本代理店-提供资料",
        "confidence": 0.89,
    })
    samples.append({
        "text_content": "お肌に異常が生じていないかよく注意して使用してください。",
        "language": "ja",
        "label": "注意事项",
        "source": "日本代理店-提供资料",
        "confidence": 0.93,
    })
    samples.append({
        "text_content": "화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름, 가려움증 등의 이상 증상이나 부작용이 있는 경우 전문의 등과 상담할 것.",
        "language": "ko",
        "label": "安全警告",
        "source": "韩国备案-合规文本",
        "confidence": 0.97,
    })
    samples.append({
        "text_content": "유아, 어린이의 손이 닿지 않는 곳에 보관할 것. 직사광선을 피해 서늘하고 건조한 곳에 보관할 것.",
        "language": "ko",
        "label": "储存条件",
        "source": "韩国备案-合规文本",
        "confidence": 0.95,
    })
    samples.append({
        "text_content": "Hidrata profundamente y deja la piel suave y flexible durante todo el día.",
        "language": "es",
        "label": "产品功效",
        "source": "西班牙站-营销文案",
        "confidence": 0.87,
    })
    samples.append({
        "text_content": "Apto para pieles sensibles. Testado dermatológicamente.",
        "language": "es",
        "label": "安全性说明",
        "source": "西班牙站-营销文案",
        "confidence": 0.90,
    })
    samples.append({
        "text_content": "连续使用两周后，我脸上的细纹明显减少了，肤色也更均匀，推荐！",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.93,
    })
    samples.append({
        "text_content": "真的太好用了！之前用别的牌子都过敏，这个完全没问题，回购第三次了。",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.96,
    })
    samples.append({
        "text_content": "用了三天，脸上起了好多小红疹，联系客服也不给退，差评！",
        "language": "zh",
        "label": "用户差评",
        "source": "电商平台-差评采集",
        "confidence": 0.94,
    })
    samples.append({
        "text_content": "味道不太喜欢，质地有点厚重，夏天用感觉闷痘，可能更适合冬天。",
        "language": "zh",
        "label": "用户差评",
        "source": "电商平台-差评采集",
        "confidence": 0.89,
    })
    samples.append({
        "text_content": "补水效果不错，其他一般吧，性价比还行，不会回购也不会踩雷的那种。",
        "language": "zh",
        "label": "中性评价",
        "source": "电商平台-中评采集",
        "confidence": 0.85,
    })
    samples.append({
        "text_content": "用了一周没什么感觉，可能需要长期坚持才能看到效果。",
        "language": "zh",
        "label": "中性评价",
        "source": "电商平台-中评采集",
        "confidence": 0.82,
    })
    samples.append({
        "text_content": "净含量50ml，主要成分：水、甘油、烟酰胺...（完整成分见包装）",
        "language": "zh",
        "label": "成分说明",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.80,
    })

    samples.append({
        "text_content": "本产品经过严格质量检测，符合国家安全标准，请放心使用。",
        "language": "zh",
        "label": "安全性说明",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.97,
    })
    samples.append({
        "text_content": "使用前请先在耳后做皮肤测试，24小时无不良反应再使用。",
        "language": "zh",
        "label": "注意事项",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.91,
    })

    samples.append({
        "text_content": "My skin feels so much smoother after just one week of use! Definitely repurchasing.",
        "language": "en",
        "label": "用户好评",
        "source": "海外站-用户评价导出",
        "confidence": 0.95,
    })
    samples.append({
        "text_content": "Didn't notice any difference after a month. Disappointing for the price.",
        "language": "en",
        "label": "用户差评",
        "source": "海外站-用户评价导出",
        "confidence": 0.88,
    })

    samples.append({
        "text_content": "使用方法：洁面爽肤后，取适量本品均匀涂抹于面部及颈部，轻轻按摩至完全吸收。",
        "language": "zh",
        "label": "使用方法",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.94,
    })
    samples.append({
        "text_content": "配合同系列面霜使用效果更佳，建议整套购买更划算。",
        "language": "zh",
        "label": "搭配推荐",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.86,
    })

    samples.append({
        "text_content": "朝は洗顔後、夜はクレンジング・洗顔後のスキンケアの最後に適量をお使いください。",
        "language": "ja",
        "label": "使用方法",
        "source": "日本代理店-提供资料",
        "confidence": 0.92,
    })
    samples.append({
        "text_content": " 하루 아침, 저녁 2회 사용을 권장하며 세안 후 기초 화장품 단계에서 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라 흡수시켜 주십시오.",
        "language": "ko",
        "label": "使用方法",
        "source": "韩国备案-合规文本",
        "confidence": 0.94,
    })

    samples.append({
        "text_content": "Aplicar mañana y noche sobre la piel limpia del rostro y cuello, masajeando suavemente hasta su completa absorción.",
        "language": "es",
        "label": "使用方法",
        "source": "西班牙站-营销文案",
        "confidence": 0.91,
    })
    samples.append({
        "text_content": "Combínalo con tu crema hidratante habitual para potenciar sus efectos.",
        "language": "es",
        "label": "搭配推荐",
        "source": "西班牙站-营销文案",
        "confidence": 0.85,
    })

    samples.append({
        "text_content": "这款眼霜真的绝了！我眼周的干纹用了半个月就淡了好多，姐妹们冲！",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.95,
    })
    samples.append({
        "text_content": "和之前专柜买的不太一样，味道淡了很多，不知道是不是正品，用着忐忑。",
        "language": "zh",
        "label": "用户差评",
        "source": "电商平台-差评采集",
        "confidence": 0.90,
    })
    samples.append({
        "text_content": "物流很快，包装也很严实，用了两次暂时没什么特别的感觉，后续再追评。",
        "language": "zh",
        "label": "中性评价",
        "source": "电商平台-中评采集",
        "confidence": 0.83,
    })
    samples.append({
        "text_content": "精华液质地很清爽，吸收特别快，油皮夏天用也完全不油腻！",
        "language": "zh",
        "label": "使用感受",
        "source": "电商平台-好评采集",
        "confidence": 0.92,
    })
    samples.append({
        "text_content": "包装太简陋了，连个塑封都没有，不知道是不是被人打开过，体验很差。",
        "language": "zh",
        "label": "用户差评",
        "source": "电商平台-差评采集",
        "confidence": 0.88,
    })
    samples.append({
        "text_content": "产品还没用，不过赠品挺多的，先给个好评吧，用了再来追加。",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.78,
    })
    samples.append({
        "text_content": "这款面霜适合25岁以上初抗老人群使用，年轻肌肤用可能会长脂肪粒。",
        "language": "zh",
        "label": "适用人群",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.87,
    })
    samples.append({
        "text_content": "孕妇慎用，建议咨询医生后再使用，哺乳期妈妈建议选择母婴专用产品。",
        "language": "zh",
        "label": "禁忌人群",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.96,
    })
    samples.append({
        "text_content": "开封后建议6个月内用完，产品活性成分会随时间逐渐降低。",
        "language": "zh",
        "label": "储存条件",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.90,
    })

    samples.append({
        "text_content": "早上洗完脸用爽肤水后涂抹，再用乳液锁水就可以了。",
        "language": "zh",
        "label": "使用方法",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.84,
    })
    samples.append({
        "text_content": "这款防晒霜SPF50+ PA++++，日常通勤和户外活动都够用。",
        "language": "zh",
        "label": "产品功效",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.93,
    })
    samples.append({
        "text_content": "洁面产品建议每天使用不超过两次，过度清洁会破坏皮肤屏障。",
        "language": "zh",
        "label": "注意事项",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.91,
    })

    # ============================================================
    # 以下是混入的"坏数据"——都是日常材料里真实会出现的小麻烦
    # 每条坏数据都要真的改变平衡结果
    # ============================================================

    # ---- 坏数据1：标签漏填（空标签，必填字段没填）----
    # 场景：实习生录入时太忙跳过了，这类真的会混进来
    samples.append({
        "text_content": "去角质产品每周使用1-2次即可，敏感肌建议一周一次。",
        "language": "zh",
        "label": "",  # <-- 标签空了
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.80,
    })

    # ---- 坏数据2：文本太短（复制粘贴时漏选了内容）----
    # 场景：从旧PDF里复制表格时，只粘到了半个字
    samples.append({
        "text_content": "好",  # <-- 只有一个字，实际是"好评"二字复制漏了
        "language": "zh",
        "label": "用户好评",
        "source": "旧表-2023产品手册V2.xlsx",
        "confidence": 0.99,
    })

    # ---- 坏数据3a：标签冲突（语义基本一致但标了不同类）——真的改变结果 ----
    # 场景：A标注员录"敏感肌肤也可以使用..."，B标注员录"敏感肌也可以用..."，
    # 两句话意思一样、字也几乎一样，但A归到"安全性说明"，B归到"适用肤质"
    samples.append({
        "text_content": "敏感肌肤也可以使用，不含酒精和香料，温和配方。",
        "language": "zh",
        "label": "安全性说明",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.86,
    })
    # ---- 坏数据3b：标签冲突（与上一条内容高度相似，但标签不同）——真的改变结果 ----
    samples.append({
        "text_content": "敏感肌也可以用，不含酒精和香料，温和配方。",  # 和上面几乎一样，只差几个字
        "language": "zh",
        "label": "适用肤质",  # <-- 却标成了不同的标签！
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.88,
    })

    # ---- 坏数据4：完全重复（两份材料各自导入了同一段）----
    # 场景："旧表"和"补录备注"里各录了一次相同的安全警告
    samples.append({
        "text_content": "请勿让儿童接触本品，如不慎入眼请立即用大量清水冲洗。",  # 完全重复第2条
        "language": "zh",
        "label": "安全警告",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.98,
    })

    # ---- 坏数据5：语言漏填（批量导入时来源表的语言列是空的）----
    samples.append({
        "text_content": "本品含有天然植物提取物，可能引起极少数人过敏，如有不适请停止使用。",
        "language": None,  # <-- 没填语言
        "label": "注意事项",
        "source": "漏填单位-原料部临时表",
        "confidence": 0.85,
    })

    # ---- 坏数据6：置信度过低（标注时不太确定，选了"大概是吧"）----
    samples.append({
        "text_content": "反正涂完脸挺舒服的，别的也说不上来...",
        "language": "zh",
        "label": "中性评价",  # 标注员其实不太确定，这条比较模棱两可
        "source": "电商平台-中评采集",
        "confidence": 0.25,  # <-- 置信度只有0.25
    })

    # ---- 坏数据7：语言占比倾斜（故意多加几条中文让比例失衡）----
    samples.append({
        "text_content": "老顾客了，他家东西一直用着放心，这款新品也没让我失望，吸收快不油腻。",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.94,
    })
    samples.append({
        "text_content": "朋友推荐来的，果然没踩雷，已经安利给身边好几个闺蜜了。",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.92,
    })
    samples.append({
        "text_content": "双十一囤了三瓶，算下来比平时便宜快一半，非常划算，够用大半年了。",
        "language": "zh",
        "label": "中性评价",
        "source": "电商平台-中评采集",
        "confidence": 0.86,
    })
    samples.append({
        "text_content": "生产日期是三个月前的，还比较新鲜，保质期到明年年底，没问题。",
        "language": "zh",
        "label": "中性评价",
        "source": "电商平台-中评采集",
        "confidence": 0.84,
    })

    # ---- 坏数据8a：标签冲突（另一个真实场景）——语义接近但标签不同 ----
    # 场景：关于"储存"的内容，两条几乎一样（只差字序），一条标"储存条件"一条标"注意事项"
    samples.append({
        "text_content": "夏天建议放冰箱冷藏保存，冬天常温即可，避免阳光直射。",
        "language": "zh",
        "label": "储存条件",
        "source": "补录备注-客服聊天记录整理",
        "confidence": 0.89,
    })
    samples.append({
        "text_content": "夏天建议放冰箱冷藏，冬天常温保存即可，避免阳光直射。",  # 和上面几乎一样，字序微调
        "language": "zh",
        "label": "注意事项",  # <-- 又标成不同标签了！
        "source": "漏填单位-原料部临时表",
        "confidence": 0.87,
    })

    # ---- 坏数据9：来源太集中（电商好评占了太多）----
    samples.append({
        "text_content": "整体满意，会继续回购支持国货品牌！",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.88,
    })
    samples.append({
        "text_content": "送给妈妈的生日礼物，她用了说挺好的，皮肤比以前滋润多了。",
        "language": "zh",
        "label": "用户好评",
        "source": "电商平台-好评采集",
        "confidence": 0.93,
    })

    # ---- 坏数据10：标签又漏填一个（实习生批量处理时的遗漏）----
    samples.append({
        "text_content": "含有视黄醇成分，建议夜间使用，白天需配合防晒。",
        "language": "zh",
        "label": None,  # <-- 又一个空标签
        "source": "漏填单位-原料部临时表",
        "confidence": 0.91,
    })

    # ---- 英文补齐，让数据稍微更真实 ----
    samples.append({
        "text_content": "Store in a cool, dry place away from direct sunlight and heat.",
        "language": "en",
        "label": "储存条件",
        "source": "海外站-产品详情页",
        "confidence": 0.95,
    })
    samples.append({
        "text_content": "For best results, use consistently for at least 4 weeks. Individual results may vary.",
        "language": "en",
        "label": "注意事项",
        "source": "海外站-产品详情页",
        "confidence": 0.92,
    })
    samples.append({
        "text_content": "This product changed my skincare routine! My skin has never been this glowing.",
        "language": "en",
        "label": "用户好评",
        "source": "海外站-用户评价导出",
        "confidence": 0.94,
    })

    # ---- 日文再补两条 ----
    samples.append({
        "text_content": "1本で約2ヶ月分使用できます。コスパも良くてリピート買いしています。",
        "language": "ja",
        "label": "用户好评",
        "source": "日本代理店-提供资料",
        "confidence": 0.90,
    })

    return samples


def _sample_identifier(s: Dict) -> str:
    src = s.get("source", "")
    text = s.get("text_content", "")[:15]
    return f"[{src}] {text}..."


def describe_bad_data_intent() -> Dict[str, str]:
    return {
        "EMPTY_LABEL": (
            "实习生忙不过来，漏填了标签列。这种在旧表转录、加班赶工时最常见。"
            "没标签的样本会被安全规则拦截，必须人工补上。"
        ),
        "TEXT_TOO_SHORT": (
            "从PDF旧手册里复制粘贴时，表格单元格里只选到了半个字。"
            "检查时看到'好'一个字的样本，就要翻原始PDF找完整内容。"
        ),
        "LABEL_CONFLICT_SENSITIVE": (
            "A标注员录「敏感肌肤也可以使用…」，B标注员录「敏感肌也可以用…」，"
            "两句话意思一样、字也几乎一样，但A归到「安全性说明」、B归到「适用肤质」，两人各录各的。"
            "不处理的话模型学到的分类边界就乱了。"
        ),
        "LABEL_CONFLICT_STORAGE": (
            "「夏天建议放冰箱冷藏…」一条标「储存条件」，另一条几乎一样的（只差字序）却标「注意事项」，"
            "标注细则里没写清楚这种交叉场景归哪边。"
            "统一标准后两边的标签结果都会变。"
        ),
        "DUPLICATE_TEXT": (
            "2023旧表和客服补录里各录了一次同一条安全警告，"
            "导入时两边都保留了。重复数据会让那类的权重凭空翻倍。"
        ),
        "EMPTY_LANGUAGE": (
            "原料部临时表是同事随手做的Excel，没加语言列就交上来了。"
            "内容本身没问题，但多语言平衡时这类会被拎出来单独问。"
        ),
        "LOW_CONFIDENCE": (
            "标注员对一条模棱两可的中评拿不准，但还是硬选了一个标签，"
            "置信度打了0.25。这类数据要么二次复核，要么直接剔除。"
        ),
        "SOURCE_IMBALANCE": (
            "电商好评采集那个来源占比太高，接近6成样本都来自同一个渠道。"
            "模型训练出来后换微博、小红书评论就识别不好了。"
        ),
        "LANGUAGE_IMBALANCE": (
            "为了凑数临时加了好几条中文好评，中文占比一下冲上去了。"
            "日文韩文英文的样本反而不够，多语言模型会偏科。"
        ),
    }
