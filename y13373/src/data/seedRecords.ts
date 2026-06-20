import type { QueueRecord } from "@/types"

const now = new Date().toISOString()

export const seedRecords: QueueRecord[] = [
  {
    id: "rec-001",
    taskId: "T-20260618-0042",
    taskName: "LLaMA-7B-预训练-批次A",
    type: "failure",
    status: "pending",
    isContaminated: false,
    failureLog: `[2026-06-18 03:12:07] CUDA out of memory. Tried to allocate 2.34 GiB (GPU 0; 23.69 GiB total capacity; 18.12 GiB already allocated; 892.56 MiB free; 2.19 GiB reserved in total by PyTorch)\n[2026-06-18 03:12:07] If reserved memory is big enough, try setting max_split_size_mb to avoid fragmentation.\n[2026-06-18 03:12:08] RuntimeError: CUDA out of memory\n[2026-06-18 03:12:08] Traceback (most recent call last):\n  File "/opt/train/entrypoint.py", line 142, in <module>\n    trainer.train()\n  File "/opt/lib/transformers/trainer.py", line 1641, in train\n    return inner_training_loop(...)`,
    gpuCost: 34.7,
    duration: 1847,
    model: "LLaMA-7B",
    dataset: "pretrain-batch-A-v2",
    createdAt: "2026-06-18T03:12:07Z",
    updatedAt: "2026-06-18T03:12:07Z",
    statusHistory: []
  },
  {
    id: "rec-002",
    taskId: "T-20260618-0051",
    taskName: "GPT2-微调-情感分类",
    type: "failure",
    status: "pending",
    isContaminated: true,
    failureLog: `[2026-06-18 06:45:22] Epoch 3/5 val_loss=0.0821 val_acc=0.9987\n[2026-06-18 06:45:22] WARNING: Validation accuracy abnormally high (0.9987 > 0.95 threshold)\n[2026-06-18 06:45:22] WARNING: Possible data leakage detected — val set overlap with train set\n[2026-06-18 06:45:23] AssertionError: Validation set contamination check failed\n[2026-06-18 06:45:23] Detected 4128 overlapping samples between train/val splits (8.3% of val set)\n[2026-06-18 06:45:23] Training halted by data integrity guard`,
    gpuCost: 12.4,
    duration: 923,
    model: "GPT2-base",
    dataset: "sentiment-sst2-merged",
    createdAt: "2026-06-18T06:45:22Z",
    updatedAt: "2026-06-18T06:45:22Z",
    statusHistory: []
  },
  {
    id: "rec-003",
    taskId: "T-20260618-0058",
    taskName: "BERT-意图识别-客服场景",
    type: "normal",
    status: "confirmed",
    isContaminated: false,
    failureLog: "",
    gpuCost: 8.2,
    duration: 412,
    model: "BERT-base-chinese",
    dataset: "intent-cs-v3",
    createdAt: "2026-06-18T08:30:15Z",
    updatedAt: "2026-06-18T09:15:00Z",
    statusHistory: [
      { from: "pending", to: "confirmed", timestamp: "2026-06-18T09:15:00Z", note: "训练完成，指标正常" }
    ]
  },
  {
    id: "rec-004",
    taskId: "T-20260619-0012",
    taskName: "Qwen-14B-RLHF-奖励模型",
    type: "failure",
    status: "pending",
    isContaminated: true,
    failureLog: `[2026-06-19 01:22:31] Epoch 2/3 train_loss=0.3421 val_loss=2.8917\n[2026-06-19 01:22:31] WARNING: val_loss diverged significantly from train_loss (gap=2.55)\n[2026-06-19 01:22:32] Data contamination probe: found 2376 samples from val split present in reward model training data\n[2026-06-19 01:22:32] Reward hacking detected — model scoring distribution collapsed\n[2026-06-19 01:22:33] RuntimeError: Training aborted — reward model integrity compromised\n[2026-06-19 01:22:33] Recommendation: Re-split dataset with strict dedup before retraining`,
    gpuCost: 67.8,
    duration: 3602,
    model: "Qwen-14B",
    dataset: "rlhf-reward-pair-v1",
    createdAt: "2026-06-19T01:22:31Z",
    updatedAt: "2026-06-19T01:22:31Z",
    statusHistory: []
  },
  {
    id: "rec-005",
    taskId: "T-20260619-0025",
    taskName: "Whisper-large-语音识别-方言",
    type: "failure",
    status: "withdrawn",
    isContaminated: false,
    failureLog: `[2026-06-19 04:55:10] DataLoader worker (pid=28451) is killed by signal: Killed.\n[2026-06-19 04:55:10] OSError: [Errno 28] No space left on device: '/tmp/train_cache/audio_184273.wav'\n[2026-06-19 04:55:11] RuntimeError: DataLoader worker exited unexpectedly\n[2026-06-19 04:55:11] Disk usage: /tmp at 100% (49.9G/50.0G)\n[2026-06-19 04:55:11] Suggestion: Increase tmpfs size or set TORCH_HOME to larger volume`,
    gpuCost: 22.1,
    duration: 1534,
    model: "Whisper-large-v3",
    dataset: "dialect-speech-v2",
    createdAt: "2026-06-19T04:55:10Z",
    updatedAt: "2026-06-19T10:30:00Z",
    statusHistory: [
      { from: "pending", to: "confirmed", timestamp: "2026-06-19T08:00:00Z", note: "磁盘问题已清理" },
      { from: "confirmed", to: "withdrawn", timestamp: "2026-06-19T10:30:00Z", note: "复发，需补证据" }
    ]
  },
  {
    id: "rec-006",
    taskId: "T-20260619-0033",
    taskName: "ResNet50-图像分类-缺陷检测",
    type: "failure",
    status: "pending",
    isContaminated: false,
    failureLog: `[2026-06-19 07:18:44] Epoch 4/10 loss=nan\n[2026-06-19 07:18:44] Overflow detected in gradient computation\n[2026-06-19 07:18:45] Parameter norm: weight.max()=inf weight.min()=-inf\n[2026-06-19 07:18:45] Last stable loss at epoch 3: 0.8234\n[2026-06-19 07:18:46] RuntimeError: FloatingPointError: Loss became NaN\n[2026-06-19 07:18:46] Possible cause: learning rate too high (1e-2) or input data contains NaN/Inf values\n[2026-06-19 07:18:46] Recommendation: Reduce LR to 1e-4 and add gradient clipping`,
    gpuCost: 15.6,
    duration: 723,
    model: "ResNet50",
    dataset: "defect-img-v4",
    createdAt: "2026-06-19T07:18:44Z",
    updatedAt: "2026-06-19T07:18:44Z",
    statusHistory: []
  }
]
