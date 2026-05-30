export interface AttitudeFrame {
  timestamp: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  remark?: string;
  axisArrival?: {
    pitch?: boolean;
    yaw?: boolean;
    roll?: boolean;
  };
}

export interface DataQuality {
  hasMissingFields: boolean;
  missingFields: Array<'pitch' | 'yaw' | 'roll'>;
  hasLateAxes: boolean;
  lateAxes: Array<'pitch' | 'yaw' | 'roll'>;
  hasRemarks: boolean;
  remarks: string[];
}

export interface GimbalLockState {
  isLocked: boolean;
  lockAngle: number;
  lockedAxis: 'pitch' | 'yaw' | 'roll';
  severity: number;
}

export type WarningType = 'angle_out_of_range' | 'axis_reversed' | 'trend_reversed' | 'gimbal_lock' | 'missing_data' | 'late_axis';

export interface AttitudeWarning {
  id: string;
  type: WarningType;
  axis?: 'pitch' | 'yaw' | 'roll';
  currentValue?: number;
  expectedRange?: [number, number];
  message: string;
  correctionSteps: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  currentTime: number;
}

export interface SpacecraftModel {
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  remark?: string;
}

export interface AttitudeData {
  frames: AttitudeFrame[];
  spacecraft: SpacecraftModel;
}

export interface EulerAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface KeyframeMarker {
  frameIndex: number;
  type: 'gimbal_lock' | 'warning' | 'note';
  description: string;
}
