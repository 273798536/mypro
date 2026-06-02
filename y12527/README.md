# 傅里叶噪声清洗CLI

## 启动方式

### 安装依赖
```bash
pip install -e .
```

### 基本命令

查看帮助：
```bash
fnc --help
```

清洗音频：
```bash
fnc clean input.wav -o output.wav
```

带报告导出的清洗：
```bash
fnc clean input.wav -r -p
```

仅分析不清洗：
```bash
fnc analyze input.wav
```

生成多参数预览：
```bash
fnc preview input.wav -o preview_output/
```

列出频段标注：
```bash
fnc list-bands
```

生成测试样例：
```bash
fnc generate-samples -o samples/
```

## 样例位置

运行 `fnc generate-samples` 后，样例文件位于：
- 默认: `./samples/`
- 指定目录: `-o` 参数指定的目录

### 样例文件清单

| 文件名 | 类型 | 说明 |
|--------|------|------|
| clean_tone_44100Hz.wav | 音频 | 纯净音调信号 |
| noisy_tone_44100Hz.wav | 音频 | 带噪声的音调信号 |
| low_samplerate_8000Hz.wav | 音频 | 低采样率音频（8000Hz） |
| mismatched_segments.wav | 音频 | 不同采样率拼接的音频 |
| potential_aliasing.wav | 音频 | 含高频成分的音频 |
| cleaning_report_sample.json | 报告 | 清洗报告JSON样例 |
| cleaning_log.csv | 日志 | 清洗日志（含缺字段、晚补、备注修改） |
| samplerate_guide.json | 配置 | 采样率配置和错误触发指南 |

## 采样率错误触发方法

### 1. 混合不同采样率源

**触发方法：**
- 准备两段音频，分别以44100Hz和22050Hz录制
- 将两段音频拼接成一个文件
- 使用工具分析拼接后的音频

**检测结果：**
- `segment_mismatch` 检测器识别频谱质心突变
- 异常标注来源："拼接材料 - 第N段"

### 2. 采样率不足录制高频信号

**触发方法：**
- 使用8000Hz采样率录制包含5kHz以上频率的信号
- 或使用22050Hz采样率录制包含12kHz以上频率的信号

**检测结果：**
- `nyquist_violation` 检测到奈奎斯特频率附近能量过高
- `mirror_frequencies` 检测到频谱对称性异常
- 异常标注来源："原始录制材料 - 采样率不足"

### 3. 错误的重采样操作

**触发方法：**
- 取一段低采样率音频（如8000Hz）
- 强制重采样到高频（如44100Hz），不进行抗混叠滤波
- 分析重采样后的音频

**检测结果：**
- `resample_artifact` 检测到重采样伪影
- 异常标注来源："重采样过程 (原始: XHz)"

### 4. 过度滤波触发

**触发方法：**
- 运行清洗时设置高阈值（如 `--threshold 0.5`）
- 或设置过宽的频段范围

**检测结果：**
- 能量保留率低于30%时触发过度滤波警告
- 报告中包含对后续处理的影响说明

## 命令参数说明

### clean 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `input_file` | 输入音频文件 | 必填 |
| `--output, -o` | 输出文件路径 | 自动生成 |
| `--sample-rate, -sr` | 指定采样率 | 自动检测 |
| `--threshold, -t` | 噪声阈值 (0.0-1.0) | 0.1 |
| `--band-start` | 起始频段 (Hz) | 0 |
| `--band-end` | 结束频段 (Hz) | 奈奎斯特频率 |
| `--export-report, -r` | 导出分析报告 | 否 |
| `--export-params, -p` | 导出参数历史 | 否 |

### analyze 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `input_file` | 输入音频文件 | 必填 |
| `--sample-rate, -sr` | 指定采样率 | 自动检测 |
| `--export, -e` | 导出分析结果 | 不导出 |

### preview 命令

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `input_file` | 输入音频文件 | 必填 |
| `--output, -o` | 输出目录 | 必填 |
| `--threshold-min` | 最小阈值 | 0.05 |
| `--threshold-max` | 最大阈值 | 0.3 |
| `--steps` | 预览步数 | 5 |

## 异常溯源说明

每个检测到的异常都会标注来源材料：

- **重采样过程**: 采样率转换引入的伪影
- **原始录制材料**: 录制时采样率不足导致
- **拼接材料 - 第N段**: 多材料拼接时的不匹配
- **录制设备**: 硬件时钟不稳定
- **频段边界**: 频段划分模糊导致
- **清洗过程**: 清洗参数设置不当
