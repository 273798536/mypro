import {
  calculateVelocityFromFrequency,
  calculateFrequencyFromVelocity
} from './dopplerEngine';

describe('多普勒公式双向验证', () => {
  const SPEED_OF_SOUND = 343;

  describe('calculateVelocityFromFrequency - 频率反推速度', () => {
    test('远离场景：发射1000Hz，接收900Hz，应得约38.11m/s', () => {
      const result = calculateVelocityFromFrequency(
        1000,
        900,
        'receding',
        SPEED_OF_SOUND
      );
      expect(result).toBeCloseTo(38.11, 1);
      expect(result).toBeLessThan(SPEED_OF_SOUND);
    });

    test('靠近场景：发射1000Hz，接收1100Hz，应得约31.18m/s', () => {
      const result = calculateVelocityFromFrequency(
        1000,
        1100,
        'approaching',
        SPEED_OF_SOUND
      );
      expect(result).toBeCloseTo(31.18, 1);
      expect(result).toBeLessThan(SPEED_OF_SOUND);
    });

    test('无频移时速度应为0', () => {
      const resultApproaching = calculateVelocityFromFrequency(
        1000,
        1000,
        'approaching',
        SPEED_OF_SOUND
      );
      const resultReceding = calculateVelocityFromFrequency(
        1000,
        1000,
        'receding',
        SPEED_OF_SOUND
      );
      expect(resultApproaching).toBe(0);
      expect(resultReceding).toBe(0);
    });

    test('方向为null时返回null', () => {
      const result = calculateVelocityFromFrequency(1000, 900, null, SPEED_OF_SOUND);
      expect(result).toBeNull();
    });

    test('接收频率为0时返回null', () => {
      const result = calculateVelocityFromFrequency(1000, 0, 'receding', SPEED_OF_SOUND);
      expect(result).toBeNull();
    });
  });

  describe('calculateFrequencyFromVelocity - 速度反推频率', () => {
    test('远离场景：发射1000Hz，速度38.11m/s，应得约900Hz', () => {
      const result = calculateFrequencyFromVelocity(
        1000,
        38.11,
        'receding',
        SPEED_OF_SOUND
      );
      expect(result).toBeCloseTo(900, 0);
    });

    test('靠近场景：发射1000Hz，速度31.18m/s，应得约1100Hz', () => {
      const result = calculateFrequencyFromVelocity(
        1000,
        31.18,
        'approaching',
        SPEED_OF_SOUND
      );
      expect(result).toBeCloseTo(1100, 0);
    });
  });

  describe('双向一致性验证', () => {
    test('频率→速度→频率 闭环验证（靠近）', () => {
      const emitted = 1000;
      const received = 1100;
      
      const velocity = calculateVelocityFromFrequency(
        emitted,
        received,
        'approaching',
        SPEED_OF_SOUND
      )!;
      
      const reconstructed = calculateFrequencyFromVelocity(
        emitted,
        velocity,
        'approaching',
        SPEED_OF_SOUND
      );
      
      expect(reconstructed).toBeCloseTo(received, 0);
    });

    test('频率→速度→频率 闭环验证（远离）', () => {
      const emitted = 1000;
      const received = 900;
      
      const velocity = calculateVelocityFromFrequency(
        emitted,
        received,
        'receding',
        SPEED_OF_SOUND
      )!;
      
      const reconstructed = calculateFrequencyFromVelocity(
        emitted,
        velocity,
        'receding',
        SPEED_OF_SOUND
      );
      
      expect(reconstructed).toBeCloseTo(received, 0);
    });
  });
});
