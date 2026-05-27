export function tempToColor(temp: number, minTemp: number, maxTemp: number): [number, number, number] {
  if (maxTemp === minTemp) {
    return [0.4, 0.8, 0.9];
  }

  const ratio = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));

  if (ratio < 0.25) {
    const t = ratio / 0.25;
    return [
      0.09 + t * (0.12 - 0.09),
      0.39 + t * (0.69 - 0.39),
      0.72 + t * (0.95 - 0.72),
    ];
  } else if (ratio < 0.5) {
    const t = (ratio - 0.25) / 0.25;
    return [
      0.12 + t * (0.06 - 0.12),
      0.69 + t * (0.73 - 0.69),
      0.95 + t * (0.51 - 0.95),
    ];
  } else if (ratio < 0.75) {
    const t = (ratio - 0.5) / 0.25;
    return [
      0.06 + t * (0.96 - 0.06),
      0.73 + t * (0.62 - 0.73),
      0.51 + t * (0.04 - 0.51),
    ];
  } else {
    const t = (ratio - 0.75) / 0.25;
    return [
      0.96 + t * (0.94 - 0.96),
      0.62 + t * (0.27 - 0.62),
      0.04 + t * (0.27 - 0.04),
    ];
  }
}

export function tempToColorHex(temp: number, minTemp: number, maxTemp: number): string {
  const [r, g, b] = tempToColor(temp, minTemp, maxTemp);
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
