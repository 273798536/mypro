import { RLCParameters, CalculationResult } from '../types';

export const exportToJSON = (parameters: RLCParameters, result: CalculationResult | null) => {
  const data = {
    exportedAt: new Date().toISOString(),
    parameters,
    result,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rlc-data-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportCalculationResult = (
  parameters: RLCParameters,
  result: CalculationResult
): string => {
  const dampingLabels: Record<string, string> = {
    undamped: '无阻尼',
    underdamped: '欠阻尼',
    critically_damped: '临界阻尼',
    overdamped: '过阻尼',
  };

  return `# RLC 电路暂态响应计算结果

## 参数

| 参数 | 值 | 单位 |
|------|-----|------|
| 电阻 R | ${parameters.resistance.value} | ${parameters.resistance.unit} |
| 电感 L | ${parameters.inductance.value} | ${parameters.inductance.unit} |
| 电容 C | ${parameters.capacitance.value} | ${parameters.capacitance.unit} |

## 输入波形
- 类型: ${parameters.inputWaveform.type}
- 幅值: ${parameters.inputWaveform.amplitude} V
${parameters.inputWaveform.frequency ? `- 频率: ${parameters.inputWaveform.frequency} Hz` : ''}
${parameters.inputWaveform.pulseWidth ? `- 脉宽: ${parameters.inputWaveform.pulseWidth} s` : ''}

## 计算结果

### 阻尼特性
- 阻尼比 ζ: ${result.dampingRatio.toFixed(6)}
- 固有角频率 ω₀: ${result.naturalFrequency.toFixed(4)} rad/s
- 阻尼类型: ${dampingLabels[result.dampingType] || result.dampingType}

### 特征根
- s₁ = ${result.characteristicRoots[0].toExponential(6)}
- s₂ = ${result.characteristicRoots[1].toExponential(6)}

### 时域响应
${result.overshoot.exists ? `- 过冲: ${result.overshoot.percentage.toFixed(2)}%` : '- 过冲: 无'}
- 上升时间: ${isFinite(result.riseTime) ? (result.riseTime * 1000).toFixed(4) + ' ms' : '∞'}
- 调节时间: ${isFinite(result.settlingTime) ? (result.settlingTime * 1000).toFixed(4) + ' ms' : '∞'}
- 稳态值: ${result.steadyStateValue.toFixed(4)} V

## 数据点数
- 采样点数: ${result.response.samplingRate}
- 总时长: ${result.response.totalTime.toFixed(6)} s
`;
};

export const downloadText = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const canvasToPNG = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
};
