export const sampleFaultCardCSV = `# 物理社团故障卡 - 2024春季学期
# 格式: id,x,y,fault_type,severity,source
F001,2,3,wire_damage,high,故障卡A
F002,5,7,connection_loss,medium,故障卡A

F003,3,5,overload,low,故障卡B
F004,6,2,insulation_failure,high,故障卡B
# 以下是备用故障点
F005,4,4,wire_damage,medium,故障卡A
F006,7,6,connection_loss,low,故障卡B
F007,1,4,overload,high,故障卡C`;

export const samplePowerMeterCSV = `node_id,timestamp,power_voltage,power_current,consumption,source
P001,0,12.0,0.5,6.0,电量表1
P001,10,11.8,0.48,5.66,电量表1
P001,20,11.5,0.45,5.18,电量表1
P001,30,11.2,0.42,4.70,电量表1

P002,0,12.0,0.6,7.2,电量表2
P002,10,11.9,0.58,6.90,电量表2
P002,20,11.7,0.55,6.44,电量表2
# 设备维护记录
P003,0,12.0,0.4,4.8,电量表3
P003,15,11.6,0.41,4.76,电量表3`;

export const sampleBadRowCSV = `id,x,y,fault_type,severity,source
F001,2,3,wire_damage,high,故障卡A

# 这是备注行
F002,5,7
F003,3,5,overload,low
F004,invalid,6,insulation_failure,high,故障卡B
F005,7,8,overload,low,故障卡B`;
