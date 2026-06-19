from typing import List
from .task import SampleSpec


def build_demo_samples() -> List[SampleSpec]:
    """构建贴近现场的演示数据，刻意保留不太干净的一组：
    - 正常命中/未命中
    - 1 条边界样本（分值贴近阈值）
    - 1 条验证集污染样本（训练集泄漏）
    - 部分样本附带人工判断，用于验证阈值变化不覆盖人工
    - 保留 source_file / source_row / raw_object，方便指认原始行
    """
    source_csv = "现场评测数据_2026Q2_batch07.csv"
    samples = [
        SampleSpec(
            sample_id="VI-2026-0001",
            query_text="如何配置向量索引的 HNSW efSearch 参数",
            expected_result="向量索引 HNSW efSearch 参数配置指南",
            actual_result="向量索引 HNSW efSearch 参数配置指南",
            score_old=0.92, score_new=0.95,
            true_label=1,
            is_boundary=False,
            source_file=source_csv, source_row=3,
            raw_object={
                "doc_id": "DOC-10231",
                "section": "索引调优/HNSW参数",
                "token_len": 186,
                "topk_rank": 1
            }
        ),
        SampleSpec(
            sample_id="VI-2026-0002",
            query_text="磁盘索引在冷热分层中的迁移策略",
            expected_result="向量索引冷热分层迁移流程",
            actual_result="向量索引冷热分层迁移流程",
            score_old=0.87, score_new=0.89,
            true_label=1,
            is_boundary=False,
            source_file=source_csv, source_row=8,
            raw_object={
                "doc_id": "DOC-20455",
                "section": "存储分层/迁移策略",
                "token_len": 254,
                "topk_rank": 1
            }
        ),
        # 边界样本：分值贴近阈值，旧版刚好在阈值下，新版阈值下调后刚好过
        SampleSpec(
            sample_id="VI-2026-0003",
            query_text="向量索引召回率 95% 下延迟 p99 应该控制在多少",
            expected_result="向量索引 SLA 与召回率权衡表",
            actual_result="向量索引 SLA 与召回率权衡表",
            score_old=0.48, score_new=0.51,
            true_label=1,
            is_boundary=True,
            source_file=source_csv, source_row=15,
            raw_object={
                "doc_id": "DOC-30988",
                "section": "性能指标/SLA基准",
                "token_len": 98,
                "topk_rank": 3,
                "note": "关键词命中不足，语义接近但表述差异大"
            },
            manual_label=1,
            manual_reason="虽然分低，但检索到了 SLA 权衡表，含 p99 延迟与召回率对应关系，应为正例",
            manual_judge="小许"
        ),
        SampleSpec(
            sample_id="VI-2026-0004",
            query_text="IVF PQ 压缩率和召回率如何取舍",
            expected_result="IVF PQ 压缩参数选择建议",
            actual_result="IVF PQ 压缩参数选择建议",
            score_old=0.60, score_new=0.62,
            true_label=1,
            is_boundary=False,
            source_file=source_csv, source_row=22,
            raw_object={
                "doc_id": "DOC-17762",
                "section": "索引类型/IVFPQ",
                "token_len": 301,
                "topk_rank": 2
            }
        ),
        SampleSpec(
            sample_id="VI-2026-0005",
            query_text="Elasticsearch 数据节点扩容步骤",
            expected_result="Elasticsearch 集群扩容操作手册",
            actual_result="Elasticsearch 集群扩容操作手册",
            score_old=0.11, score_new=0.13,
            true_label=0,
            is_boundary=False,
            source_file=source_csv, source_row=31,
            raw_object={
                "doc_id": "DOC-55012",
                "section": "搜索引擎/ES运维",
                "token_len": 412,
                "topk_rank": 1,
                "note": "非向量索引域，负样本"
            }
        ),
        # 验证集污染：训练集中出现过的样本，分值虚高，应单独拎出
        SampleSpec(
            sample_id="VI-2026-0006",
            query_text="向量索引构建时内存 OOM 怎么排查",
            expected_result="向量索引构建 OOM 排查清单",
            actual_result="向量索引构建 OOM 排查清单",
            score_old=0.98, score_new=0.99,
            true_label=1,
            is_boundary=False,
            source_file=source_csv, source_row=44,
            raw_object={
                "doc_id": "DOC-00099",
                "section": "故障排查/构建OOM",
                "token_len": 142,
                "topk_rank": 1,
                "train_set_overlap": True,
                "note": "训练集 item_id=TR-7721 原文搬运"
            },
            is_contaminated=True,
            contamination_type="验证集泄漏/训练集混入",
            contamination_desc="该 query 与 doc 组合在训练集 TR-7721 中出现过，分值明显虚高，需从主指标中剔除",
            manual_label=1,
            manual_reason="语义命中但样本已污染，标记污染并从主评估中剔除，不修改标签本身",
            manual_judge="现场老师"
        ),
        SampleSpec(
            sample_id="VI-2026-0007",
            query_text="Milvus 和 Faiss 在亿级向量规模下对比",
            expected_result="Milvus vs Faiss 亿级数据性能对比报告",
            actual_result="Milvus vs Faiss 亿级数据性能对比报告",
            score_old=0.78, score_new=0.80,
            true_label=1,
            is_boundary=False,
            source_file=source_csv, source_row=56,
            raw_object={
                "doc_id": "DOC-44520",
                "section": "方案选型/对比评测",
                "token_len": 512,
                "topk_rank": 1
            }
        ),
        SampleSpec(
            sample_id="VI-2026-0008",
            query_text="Python 装饰器实现原理",
            expected_result="Python 语法手册 - 装饰器章节",
            actual_result="Python 语法手册 - 装饰器章节",
            score_old=0.05, score_new=0.06,
            true_label=0,
            is_boundary=False,
            source_file=source_csv, source_row=63,
            raw_object={
                "doc_id": "DOC-88910",
                "section": "语言基础/Python",
                "token_len": 200,
                "topk_rank": 1,
                "note": "非向量索引域，负样本"
            }
        ),
        # 边界+误报：旧版模型误判
        SampleSpec(
            sample_id="VI-2026-0009",
            query_text="图数据库 Neo4j 索引建立方法",
            expected_result="Neo4j 索引配置手册",
            actual_result="向量索引构建参数说明（误召回）",
            score_old=0.52, score_new=0.42,
            true_label=0,
            is_boundary=True,
            source_file=source_csv, source_row=72,
            raw_object={
                "doc_id": "DOC-33210",
                "section": "索引构建/通用参数",
                "token_len": 176,
                "topk_rank": 2,
                "note": "关键词「索引」命中导致误召回，语义应属图数据库域"
            },
            manual_label=0,
            manual_reason="用户问的是 Neo4j 图数据库索引，返回向量索引文档属于误召回，应为负例",
            manual_judge="小许"
        ),
    ]
    return samples
