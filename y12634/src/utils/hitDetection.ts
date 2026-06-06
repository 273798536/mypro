import { BeatNode, HitDetectionResult } from '@/types';

const ALLOWED_COLOR_MIN = 0x80c8a0;
const ALLOWED_COLOR_MAX = 0xfcc04a;

function hexToRgb(hex: string): number {
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

export function detectColorOutOfBounds(colorHex: string): boolean {
  try {
    const value = hexToRgb(colorHex);
    return value < ALLOWED_COLOR_MIN || value > ALLOWED_COLOR_MAX;
  } catch {
    return true;
  }
}

export function runHitDetection(node: BeatNode): HitDetectionResult {
  if (node.colorOutOfBounds) {
    return 'failed';
  }
  if (node.anomalyType === 'need_material' && !node.hasScreenshot) {
    return 'pending';
  }
  if (node.anomalyType === 'need_caliber') {
    return 'failed';
  }
  if (node.anomalyType === 'need_material' && node.hasScreenshot) {
    return 'passed';
  }
  return 'passed';
}

export function rerunAllHitDetection(nodes: BeatNode[]): BeatNode[] {
  return nodes.map((node) => ({
    ...node,
    hitDetectionResult: runHitDetection(node),
  }));
}
