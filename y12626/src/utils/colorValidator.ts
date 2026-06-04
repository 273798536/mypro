export interface ColorValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
  hex: string;
  hsv: { h: number; s: number; v: number };
}

const ALLOWED_COLORS = [
  '#2E5EAA',
  '#1A1A1A',
  '#8B4513',
  '#C41E3A',
  '#E6A817',
  '#4CAF50',
  '#9C27B0',
  '#00BCD4',
];

const MIN_BRIGHTNESS = 0.15;
const MAX_BRIGHTNESS = 0.9;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

export function normalizeColor(color: string): string {
  if (!color) return '';

  let normalized = color.trim().toUpperCase();

  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }

  if (normalized.length === 4) {
    normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
  }

  return normalized;
}

export function validateColor(color: string): ColorValidationResult {
  const hex = normalizeColor(color);

  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    return {
      isValid: false,
      error: '颜色格式不正确，应为六位十六进制值',
      details: `输入值：${hex}，格式：#RRGGBB`,
      hex,
      hsv: { h: 0, s: 0, v: 0 }
    };
  }

  const hsv = hexToHsv(hex);
  if (!hsv) {
    return {
      isValid: false,
      error: '无法解析颜色值',
      details: `输入值：${hex}`,
      hex,
      hsv: { h: 0, s: 0, v: 0 }
    };
  }

  const brightness = hsv.v / 100;
  if (brightness < MIN_BRIGHTNESS) {
    return {
      isValid: false,
      error: `颜色过暗，亮度值 ${hsv.v} 低于最低要求 ${Math.round(MIN_BRIGHTNESS * 100)}`,
      details: `色相：${hsv.h}°，饱和度：${hsv.s}%，亮度：${hsv.v}%`,
      hex,
      hsv
    };
  }

  if (brightness > MAX_BRIGHTNESS) {
    return {
      isValid: false,
      error: `颜色过亮，亮度值 ${hsv.v} 超过最高要求 ${Math.round(MAX_BRIGHTNESS * 100)}`,
      details: `色相：${hsv.h}°，饱和度：${hsv.s}%，亮度：${hsv.v}%`,
      hex,
      hsv
    };
  }

  const isInAllowed = ALLOWED_COLORS.some(allowed => {
    const allowedHsv = hexToHsv(allowed);
    if (!allowedHsv) return false;
    const hueDiff = Math.abs(hsv.h - allowedHsv.h);
    return hueDiff < 30 || hueDiff > 330;
  });

  if (!isInAllowed && hsv.s > 20) {
    return {
      isValid: false,
      error: `颜色色相 ${hsv.h}° 不在允许范围内，请使用标准色卡颜色`,
      details: `色相：${hsv.h}°，饱和度：${hsv.s}%，亮度：${hsv.v}%`,
      hex,
      hsv
    };
  }

  return {
    isValid: true,
    details: `色相：${hsv.h}°，饱和度：${hsv.s}%，亮度：${hsv.v}%`,
    hex,
    hsv
  };
}

export function getColorName(hex: string): string {
  const normalized = normalizeColor(hex);
  const colorMap: { [key: string]: string } = {
    '#2E5EAA': '石青蓝',
    '#1A1A1A': '墨黑色',
    '#8B4513': '赭石色',
    '#C41E3A': '朱砂红',
    '#E6A817': '藤黄色',
    '#4CAF50': '草绿色',
    '#9C27B0': '紫红色',
    '#00BCD4': '天蓝色',
  };

  const hsv = hexToHsv(normalized);
  if (!hsv) return '未知颜色';

  for (const [colorHex, name] of Object.entries(colorMap)) {
    const allowedHsv = hexToHsv(colorHex);
    if (!allowedHsv) continue;
    const hueDiff = Math.abs(hsv.h - allowedHsv.h);
    if ((hueDiff < 30 || hueDiff > 330) && Math.abs(hsv.s - allowedHsv.s) < 40) {
      return name;
    }
  }

  if (hsv.v < 20) return '近黑色';
  if (hsv.s < 15 && hsv.v > 80) return '近白色';
  if (hsv.s < 15) return '灰色系';

  if (hsv.h < 30 || hsv.h > 330) return '红色系';
  if (hsv.h < 60) return '黄色系';
  if (hsv.h < 120) return '绿色系';
  if (hsv.h < 180) return '青色系';
  if (hsv.h < 240) return '蓝色系';
  if (hsv.h < 300) return '紫色系';

  return '其他颜色';
}

export function getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'normal': '#2E5EAA',
    'out-of-bounds': '#C41E3A',
    'color-invalid': '#9C27B0',
    'missing-unit': '#E6A817',
    'supplementary': '#E6A817',
  };
  return colorMap[status] || '#1A1A1A';
}

export function getStatusLabel(status: string): string {
  const labelMap: { [key: string]: string } = {
    'normal': '正常',
    'out-of-bounds': '越界',
    'color-invalid': '颜色异常',
    'missing-unit': '缺项',
    'supplementary': '补录',
  };
  return labelMap[status] || status;
}
