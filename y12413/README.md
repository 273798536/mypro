# 合同能源收益分成管理工具

用于管理节能改造项目的收益分成计算，支持电表补录、设备检修剔除、版本控制和审计追踪。

## 主要功能

- **项目合同管理**：记录合同基本信息、分成比例、基准电量
- **电表读数管理**：支持分月录入、补录历史数据
- **检修记录管理**：记录设备检修期间，自动剔除异常数据
- **收益分成计算**：按实际节电量计算分成，支持多版本比例
- **审计追踪**：记录所有修改历史，可追溯变更原因和影响
- **分阶段提醒**：合同期、数据缺失、检修剔除等关键节点提醒

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 查看帮助
python -m energy_sharing --help

# 创建新项目
python -m energy_sharing project create --help

# 录入电表读数
python -m energy_sharing meter add --help

# 计算收益分成
python -m energy_sharing calculate --help
```
