from typing import List, Dict
from models import MultimodalSample


def create_demo_samples() -> List[MultimodalSample]:
    samples = []

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_001",
            text_content="这是一只可爱的金毛犬，正坐在草地上晒太阳。",
            image_paths=["/images/dog/golden_retriever_001.jpg"],
            category="动物-犬类",
            source="公开数据集A",
            created_at="2026-06-15T10:30:00",
            manual_note=None,
            metadata={"quality_score": 95},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_002",
            text_content="这是一张城市夜景照片，高楼大厦灯火通明。",
            image_paths=[],
            category="风景-城市",
            source="业务方提交",
            created_at="2026-06-15T11:00:00",
            manual_note="运营同学说这张图之前上传过，可能是路径配置错了，待我查一下后台日志再确认。",
            metadata={"quality_score": 80},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="",
            text_content="",
            image_paths=["/images/broken/xxx.jpg"],
            category="",
            source="",
            created_at="2026-06-15T12:00:00",
            manual_note="这条数据明显有问题，谁导入的脏数据？",
            metadata={"quality_score": 0},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_004",
            text_content="汽车行驶在高速公路上。",
            image_paths=["/images/car/sedan_004.jpg"],
            category="交通工具-汽车",
            source="公开数据集A",
            created_at="2026-06-15T09:00:00",
            manual_note=None,
            metadata={"quality_score": 90},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_005",
            text_content="一只橘猫在窗台上睡觉。",
            image_paths=["/images/cat/orange_005.jpg"],
            category="动物-猫类",
            source="公开数据集A",
            created_at="2026-06-15T09:30:00",
            manual_note=None,
            metadata={"quality_score": 92},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_006",
            text_content="一只哈士奇在雪地里奔跑。",
            image_paths=["/images/dog/husky_006.jpg"],
            category="动物-犬类",
            source="公开数据集B",
            created_at="2026-06-15T10:00:00",
            manual_note=None,
            metadata={"quality_score": 88},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_007",
            text_content="一只边牧在接飞盘。",
            image_paths=["/images/dog/border_collie_007.jpg"],
            category="动物-犬类",
            source="公开数据集A",
            created_at="2026-06-15T10:15:00",
            manual_note=None,
            metadata={"quality_score": 91},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_008",
            text_content="一只柴犬在公园里散步。",
            image_paths=["/images/dog/shiba_008.jpg"],
            category="动物-犬类",
            source="业务方提交",
            created_at="2026-06-15T10:45:00",
            manual_note=None,
            metadata={"quality_score": 87},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_009",
            text_content="一只德牧在执行任务。",
            image_paths=["/images/dog/german_shepherd_009.jpg"],
            category="动物-犬类",
            source="公开数据集B",
            created_at="2026-06-15T11:30:00",
            manual_note=None,
            metadata={"quality_score": 93},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_010",
            text_content="一辆公交车在站台停靠。",
            image_paths=["/images/car/bus_010.jpg"],
            category="交通工具-汽车",
            source="公开数据集A",
            created_at="2026-06-15T11:45:00",
            manual_note=None,
            metadata={"quality_score": 89},
        )
    )

    return samples


def create_supplementary_samples() -> List[MultimodalSample]:
    samples = []

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_011",
            text_content="上海外滩的夜景非常漂亮。",
            image_paths=["/images/city/shanghai_bund_011.jpg"],
            category="风景-城市",
            source="公开数据集C",
            created_at="2026-06-16T09:00:00",
            manual_note=None,
            metadata={"quality_score": 94},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_012",
            text_content="北京故宫的雪景。",
            image_paths=["/images/city/beijing_forbidden_city_012.jpg"],
            category="风景-城市",
            source="公开数据集C",
            created_at="2026-06-16T09:30:00",
            manual_note=None,
            metadata={"quality_score": 96},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_013",
            text_content="一只布偶猫在沙发上打盹。",
            image_paths=["/images/cat/ragdoll_013.jpg"],
            category="动物-猫类",
            source="公开数据集C",
            created_at="2026-06-16T10:00:00",
            manual_note=None,
            metadata={"quality_score": 90},
        )
    )

    samples.append(
        MultimodalSample(
            sample_id="SAMPLE_002_V2",
            text_content="这是一张城市夜景照片，高楼大厦灯火通明。",
            image_paths=["/images/city/city_night_002.jpg"],
            category="风景-城市",
            source="业务方提交",
            created_at="2026-06-15T11:00:00",
            manual_note="运营同学说这张图之前上传过，可能是路径配置错了，待我查一下后台日志再确认。",
            metadata={"quality_score": 80, "updated": True},
        )
    )

    return samples


def samples_to_dict(
    samples: List[MultimodalSample],
) -> Dict[str, MultimodalSample]:
    return {s.sample_id: s for s in samples if s.sample_id}
