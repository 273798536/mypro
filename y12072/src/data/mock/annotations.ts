import type { FingerAnnotation } from '../../types';
import { FINGER_TYPES } from '../../types';

const rightHandFingers = ['托', '擘', '抹', '挑', '勾', '剔', '打', '摘'];
const leftHandFingers = ['大指', '食指', '中指', '名指'];

export const mockAnnotations: FingerAnnotation[] = [];

let annotationId = 0;
for (let segIdx = 0; segIdx < 8; segIdx++) {
  const annotationsInSegment = 4 + Math.floor(Math.random() * 3);
  for (let j = 0; j < annotationsInSegment; j++) {
    const fingerType = FINGER_TYPES[Math.floor(Math.random() * FINGER_TYPES.length)];
    const isMisaligned = segIdx === 3 && Math.random() > 0.5;
    
    mockAnnotations.push({
      id: `ann-${annotationId}`,
      segmentId: `seg-${segIdx + 1}`,
      time: (j / annotationsInSegment) * 10 + Math.random() * 2,
      fingerType,
      fingerPosition: Math.floor(Math.random() * 13) + 1,
      rightHand: rightHandFingers[Math.floor(Math.random() * rightHandFingers.length)],
      leftHand: leftHandFingers[Math.floor(Math.random() * leftHandFingers.length)],
      confidence: isMisaligned ? 0.4 + Math.random() * 0.3 : 0.7 + Math.random() * 0.3,
      isMisaligned,
      verified: !isMisaligned
    });
    annotationId++;
  }
}
