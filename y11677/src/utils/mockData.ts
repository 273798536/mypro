import type { GyroFrame } from '../types';
import { normalizeQuaternion, createIdentityQuaternion, integrateAngularVelocity } from './quaternion';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const generateMockGyroData = (frameCount: number = 300): GyroFrame[] => {
  const frames: GyroFrame[] = [];
  let currentQuaternion = createIdentityQuaternion();
  const startTime = Date.now() - frameCount * 50;

  for (let i = 0; i < frameCount; i++) {
    const timestamp = startTime + i * 50;
    const t = i / frameCount;

    const baseAngularVelocity: [number, number, number] = [
      Math.sin(t * Math.PI * 4) * 0.5,
      Math.cos(t * Math.PI * 2) * 0.3,
      Math.sin(t * Math.PI * 3) * 0.4,
    ];

    let angularVelocity: [number, number, number] = [
      baseAngularVelocity[0] + (Math.random() - 0.5) * 0.02,
      baseAngularVelocity[1] + (Math.random() - 0.5) * 0.02,
      baseAngularVelocity[2] + (Math.random() - 0.5) * 0.02,
    ];

    if (i > 80 && i < 120) {
      angularVelocity[0] += 0.8;
    }
    if (i > 180 && i < 220) {
      angularVelocity[1] -= 0.6;
    }

    const dt = 0.05;
    currentQuaternion = integrateAngularVelocity(currentQuaternion, angularVelocity, dt);

    let quaternion: [number, number, number, number] = [...currentQuaternion];

    if (i === 45 || i === 150 || i === 250) {
      quaternion = [
        quaternion[0] * 1.05,
        quaternion[1] * 1.05,
        quaternion[2] * 1.05,
        quaternion[3] * 1.05,
      ];
    }

    if (i === 200) {
      quaternion = [
        quaternion[0] * 1.2,
        quaternion[1] * 1.2,
        quaternion[2] * 1.2,
        quaternion[3] * 1.2,
      ];
    }

    if (i === 100) {
      const tmp = frames[99];
      frames[99] = {
        ...frames[99],
        timestamp: tmp.timestamp + 200,
      };
    }

    let signalQuality = 95 - Math.abs(t - 0.5) * 30;
    if (i > 160 && i < 190) {
      signalQuality = 50 + Math.random() * 20;
    }
    if (i === 175) {
      signalQuality = 35;
    }

    const sensorStatus = {
      temperature: 25 + Math.sin(t * Math.PI) * 10 + (Math.random() - 0.5) * 2,
      voltage: 4.8 - t * 0.8 + (Math.random() - 0.5) * 0.1,
      signalQuality: Math.max(0, Math.min(100, signalQuality)),
      isCalibrated: i >= 50,
    };

    let calibrationNote: string | undefined;
    if (i === 50) {
      calibrationNote = '初始校准完成，偏置误差修正';
    }
    if (i === 150) {
      calibrationNote = '温度漂移补偿校准';
    }

    frames.push({
      timestamp,
      quaternion,
      angularVelocity,
      sensorStatus,
      calibrationNote,
      source: `模拟传感器_${generateId()}`,
    });
  }

  return frames;
};

export const generateCalibratedData = (frames: GyroFrame[]): GyroFrame[] => {
  return frames.map((frame) => ({
    ...frame,
    quaternion: normalizeQuaternion(frame.quaternion),
    sensorStatus: {
      ...frame.sensorStatus,
      isCalibrated: true,
    },
    calibrationNote: frame.calibrationNote || '自动校准: 四元数归一化',
  }));
};
