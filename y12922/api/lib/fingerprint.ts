import { createHash } from 'crypto';
import type { ImportSampleInput } from '../../shared/types.js';

export function computeFingerprint(samples: ImportSampleInput[]): string {
  const lines = samples.map((s) => {
    const anns = s.annotations
      .map((a) => `${a.annotator}:${a.label}`)
      .sort()
      .join(',');
    return `${s.sampleKey}|${s.content}|${s.splitTag}|${anns}`;
  });
  lines.sort();
  const raw = lines.join('\n');
  const hash = createHash('sha256').update(raw).digest('hex');
  return hash.slice(0, 16);
}
