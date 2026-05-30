export const ORBIT_DATA_RAW = `# 行星轨道数据
mercury,水星,80,0.048
venus,金星,120,0.035

earth,地球,170,0.030
mars,火星,230,0.024
# 以下为备用数据
jupiter,木星,310,0.013

saturn,土星,400,0.0096
,,,
uranus,天王星,,0.0068
`;

export const FUEL_BAR_RAW = `# 燃料条数据（步骤,燃料量,事件）
0,100,初始
1,85,水星→金星转移
2,70,金星→地球转移

3,55,地球→火星转移
# 中途修正
4,42,火星→木星转移
5,
6,25,木星→土星转移
invalid,20,数据异常
8,10,土星到达
`;

export const MISSION_LOG_RAW = `# 任务日志（步骤,动作,结果）
0,发射,成功
1,水星窗口选择,偏移0.2
2,金星窗口选择,偏移0.5
3,地球窗口选择,偏移0.1

4,火星窗口选择,错过窗口
5,木星窗口选择,燃料不足
6,土星窗口选择,成功
7,到达,
`;

export const PLANET_COLORS: Record<string, string> = {
  mercury: '#b0b0b0',
  venus: '#e8c86a',
  earth: '#4a9eff',
  mars: '#e05544',
  jupiter: '#d4a56a',
  saturn: '#c8b070',
};

export const PLANET_SIZES: Record<string, number> = {
  mercury: 4,
  venus: 6,
  earth: 7,
  mars: 5,
  jupiter: 12,
  saturn: 10,
};

export const INITIAL_FUEL = 100;

export const MISSION_SEQUENCE = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'];

export const TARGET_ORBIT = 'saturn';
