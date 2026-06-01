from game.engine import RECTILINEAR, DIAGONAL, BASIS_SYMBOLS


BASIS_CN = {RECTILINEAR: "直线基 (+)", DIAGONAL: "对角基 (×)"}


class BasisConfusionItem:
    def __init__(self, event, role):
        self.photon_index = event.index
        self.role = role
        self.correct_basis = event.alice_basis
        self.used_basis = event.eve_basis if role == "eve" else event.bob_basis
        self.alice_bit = event.alice_bit
        self.result_bit = event.eve_bit_after if role == "eve" else event.bob_bit
        self.bit_flipped = (self.alice_bit != self.result_bit)

    def explain(self):
        correct_cn = BASIS_CN.get(self.correct_basis, self.correct_basis)
        used_cn = BASIS_CN.get(self.used_basis, self.used_basis)
        flip_hint = ""
        if self.bit_flipped:
            flip_hint = f"，比特从 {self.alice_bit} 翻转为 {self.result_bit}"
        role_cn = "拦截者(你)" if self.role == "eve" else "接收者(Bob)"
        return (
            f"光子 #{self.photon_index}：{role_cn}用了{used_cn}测量，"
            f"而发送方(Alice)用的是{correct_cn}{flip_hint}。"
            f"基不匹配时，测量结果有 50% 概率翻转，这是量子力学的基本性质。"
        )

    def to_dict(self):
        return {
            "photon_index": self.photon_index,
            "role": self.role,
            "correct_basis": self.correct_basis,
            "used_basis": self.used_basis,
            "alice_bit": self.alice_bit,
            "result_bit": self.result_bit,
            "bit_flipped": self.bit_flipped,
            "explanation": self.explain(),
        }


class BerExceededItem:
    def __init__(self, test_events, ber, threshold):
        self.test_events = test_events
        self.ber = ber
        self.threshold = threshold
        self.error_events = [e for e in test_events if not e.test_bit_match]
        self.match_events = [e for e in test_events if e.test_bit_match]

    def explain(self):
        lines = [
            f"测试样本共 {len(self.test_events)} 位，其中 {len(self.error_events)} 位不一致。",
            f"误码率 (QBER) = {self.ber:.2%}，阈值 = {self.threshold:.2%}。",
        ]
        if self.ber > self.threshold:
            lines.append(
                "误码率超过阈值！这强烈暗示信道中存在窃听。"
                "在真实 QKD 系统中，双方会放弃本次密钥。"
            )
        else:
            lines.append("误码率在安全范围内，信道可信。")
        if self.error_events:
            indices = ", ".join(f"#{e.index}" for e in self.error_events)
            lines.append(f"出错的光子：{indices}。")
        return "\n".join(lines)

    def to_dict(self):
        return {
            "test_total": len(self.test_events),
            "error_count": len(self.error_events),
            "match_count": len(self.match_events),
            "ber": self.ber,
            "threshold": self.threshold,
            "exceeded": self.ber > self.threshold,
            "error_indices": [e.index for e in self.error_events],
            "explanation": self.explain(),
        }


class RepeatItem:
    def __init__(self, event):
        self.photon_index = event.index
        self.original_index = event.repeat_of
        self.alice_bit = event.alice_bit
        self.alice_basis = event.alice_basis
        self.photon_state = event.photon_state

    def explain(self):
        return (
            f"光子 #{self.photon_index} 与 #{self.original_index} 编码完全相同"
            f"（比特={self.alice_bit}，基={BASIS_CN.get(self.alice_basis, self.alice_basis)}，"
            f"态={self.photon_state}）。"
            f"重复传输可能被窃听者利用做重放攻击，在真实系统中需要用序列号或时间戳标记。"
        )

    def to_dict(self):
        return {
            "photon_index": self.photon_index,
            "original_index": self.original_index,
            "alice_bit": self.alice_bit,
            "alice_basis": self.alice_basis,
            "photon_state": self.photon_state,
            "explanation": self.explain(),
        }


class CategorizedAnalysis:
    def __init__(self, events, results):
        self.events = events
        self.results = results

    def analyze(self):
        basis_confusion = self._analyze_basis_confusion()
        ber_analysis = self._analyze_ber()
        repeat_analysis = self._analyze_repeats()
        return {
            "basis_confusion": basis_confusion,
            "ber_analysis": ber_analysis,
            "repeat_analysis": repeat_analysis,
            "summary": self._make_summary(basis_confusion, ber_analysis, repeat_analysis),
        }

    def _analyze_basis_confusion(self):
        items = []
        for event in self.events:
            if event.eve_active and event.eve_basis_mismatch:
                items.append(BasisConfusionItem(event, "eve").to_dict())
            if event.bob_basis_mismatch and not event.eve_active:
                items.append(BasisConfusionItem(event, "bob").to_dict())
        return {
            "category": "测量基混淆",
            "count": len(items),
            "detail": items,
            "general_explanation": (
                "当测量基与编码基不一致时，量子态被投影到错误的基上，"
                "测量结果有 50% 概率与原始比特不同。"
                "这是 BB84 协议检测窃听的核心原理：窃听者不知道发送方的基，"
                "随机选基测量时会引入可检测的误码。"
            ),
        }

    def _analyze_ber(self):
        test_events = [e for e in self.events if e.sifted and e.in_test_sample]
        ber = self.results.get("ber", 0)
        threshold = self.results.get("ber_threshold", 0.11)
        item = BerExceededItem(test_events, ber, threshold)
        return {
            "category": "误码超限",
            "detail": item.to_dict(),
            "general_explanation": (
                "Alice 和 Bob 公开比较一部分筛选后的密钥来估算误码率 (QBER)。"
                f"BB84 协议的安全阈值通常设为约 11%。"
                f"超过阈值意味着信道中可能存在窃听者，"
                f"因为窃听者的随机测量会引入约 25% 的额外误码。"
            ),
        }

    def _analyze_repeats(self):
        items = []
        for event in self.events:
            if event.repeated:
                items.append(RepeatItem(event).to_dict())
        return {
            "category": "重复传输",
            "count": len(items),
            "detail": items,
            "general_explanation": (
                "如果两个光子的编码完全相同（比特、基、量子态），"
                "可能被窃听者截获一个、放行一个，实现无干扰窃听。"
                "实际 QKD 系统中会用随机序列号和时间戳标记每个光子，"
                "接收方检测到重复时会触发警报。"
            ),
        }

    def _make_summary(self, basis_confusion, ber_analysis, repeat_analysis):
        parts = []
        bc_count = basis_confusion["count"]
        if bc_count > 0:
            parts.append(f"测量基混淆 {bc_count} 次")
        else:
            parts.append("无测量基混淆")

        ber_detail = ber_analysis["detail"]
        if ber_detail["exceeded"]:
            parts.append(f"误码率 {ber_detail['ber']:.2%} 超过阈值 {ber_detail['threshold']:.2%}")
        else:
            parts.append(f"误码率 {ber_detail['ber']:.2%} 在安全范围内")

        rep_count = repeat_analysis["count"]
        if rep_count > 0:
            parts.append(f"重复传输 {rep_count} 对")
        else:
            parts.append("无重复传输")

        return "；".join(parts) + "。"
