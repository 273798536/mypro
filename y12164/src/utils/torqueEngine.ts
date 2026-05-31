import type {
  RobotConfig,
  RobotJoint,
  RobotLink,
  AngleDataPoint,
  LoadDataPoint,
  TorqueResult,
  TorquePoint,
} from '../types';

export interface JointState {
  angle: number;
  angularVelocity: number;
  angularAcceleration: number;
}

export class TorqueCalculator {
  private robotConfig: RobotConfig;

  constructor(robotConfig: RobotConfig) {
    this.robotConfig = robotConfig;
  }

  public calculateJointTorque(
    jointId: string,
    angleData: AngleDataPoint[],
    loadData: LoadDataPoint[]
  ): TorqueResult {
    const joint = this.robotConfig.joints.find((j) => j.id === jointId);
    if (!joint) {
      throw new Error(`Joint ${jointId} not found`);
    }

    const curve: TorquePoint[] = [];
    const overLimitPoints: number[] = [];

    const jointAngleData = angleData.filter((d) => d.jointId === jointId);
    const timestamps = [...new Set([...jointAngleData.map((d) => d.timestamp)])].sort((a, b) => a - b);

    timestamps.forEach((timestamp) => {
      const anglePoint = jointAngleData.find((d) => d.timestamp === timestamp);
      const angle = anglePoint?.angle || 0;

      const loadsAtTime = loadData.filter((d) => d.timestamp === timestamp);
      const totalLoad = loadsAtTime.reduce((sum, d) => sum + d.mass, 0);

      const gravityTorque = this.calculateGravityTorque(joint, angle, loadsAtTime);
      const inertiaTorque = this.calculateInertiaTorque(joint, loadsAtTime);
      const frictionTorque = this.calculateFrictionTorque(joint, angle);

      const totalTorque = gravityTorque + inertiaTorque + frictionTorque;

      if (Math.abs(totalTorque) > joint.maxTorque) {
        overLimitPoints.push(timestamp);
      }

      curve.push({
        timestamp,
        value: Math.abs(totalTorque),
        angle,
        load: totalLoad,
      });
    });

    const maxTorque = Math.max(...curve.map((p) => p.value));
    const minTorque = Math.min(...curve.map((p) => p.value));

    return {
      jointId,
      jointName: joint.name,
      curve,
      maxTorque,
      minTorque,
      threshold: joint.maxTorque,
      isOverLimit: overLimitPoints.length > 0,
      overLimitPoints,
    };
  }

  private calculateGravityTorque(
    joint: RobotJoint,
    angle: number,
    loads: LoadDataPoint[]
  ): number {
    const g = 9.81;
    let totalTorque = 0;

    const downstreamLinks = this.getDownstreamLinks(joint.id);

    downstreamLinks.forEach((link) => {
      const linkLoad = loads.find((l) => l.linkId === link.id);
      const mass = linkLoad?.mass || link.mass;
      const distance = this.calculateMomentArm(joint, link, angle);
      totalTorque += mass * g * distance;
    });

    return totalTorque;
  }

  private calculateInertiaTorque(
    joint: RobotJoint,
    loads: LoadDataPoint[]
  ): number {
    let totalInertia = 0;
    const angularAcceleration = 1;

    const downstreamLinks = this.getDownstreamLinks(joint.id);

    downstreamLinks.forEach((link) => {
      const linkLoad = loads.find((l) => l.linkId === link.id);
      const mass = linkLoad?.mass || link.mass;
      const r = link.length / 2;
      const inertia = (1 / 3) * mass * r * r;
      totalInertia += inertia;
    });

    return totalInertia * angularAcceleration;
  }

  private calculateFrictionTorque(joint: RobotJoint, angle: number): number {
    const frictionCoefficient = 0.05;
    const baseFriction = 10;
    const velocity = Math.abs(angle) * 0.1;
    return baseFriction + frictionCoefficient * velocity;
  }

  private getDownstreamLinks(jointId: string): RobotLink[] {
    const result: RobotLink[] = [];
    const jointIndex = this.robotConfig.joints.findIndex((j) => j.id === jointId);

    if (jointIndex === -1) return result;

    for (let i = jointIndex; i < this.robotConfig.links.length; i++) {
      result.push(this.robotConfig.links[i]);
    }

    return result;
  }

  private calculateMomentArm(
    joint: RobotJoint,
    link: RobotLink,
    angle: number
  ): number {
    const jointIndex = this.robotConfig.joints.findIndex((j) => j.id === joint.id);
    const linkIndex = this.robotConfig.links.findIndex((l) => l.id === link.id);

    if (jointIndex === -1 || linkIndex === -1) return 0;

    let distance = 0;
    const angleRad = (angle * Math.PI) / 180;

    for (let i = jointIndex; i <= linkIndex; i++) {
      if (i < this.robotConfig.links.length) {
        distance += this.robotConfig.links[i].length;
      }
    }

    return Math.abs(distance * Math.sin(angleRad));
  }

  public calculateAllJoints(
    angleData: AngleDataPoint[],
    loadData: LoadDataPoint[]
  ): TorqueResult[] {
    return this.robotConfig.joints.map((joint) =>
      this.calculateJointTorque(joint.id, angleData, loadData)
    );
  }
}

export const formatTorqueValue = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kN·m`;
  }
  return `${value.toFixed(2)} N·m`;
};

export const formatAngleValue = (value: number): string => {
  return `${value.toFixed(1)}°`;
};

export const getIssueTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    missing_load: '负载缺失',
    angle_out_of_range: '角度越界',
    fixture_misuse: '夹具混用',
    torque_over_limit: '扭矩超限',
  };
  return labels[type] || type;
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    warning: 'text-warning-500',
    error: 'text-danger-500',
    critical: 'text-danger-500 font-bold',
  };
  return colors[severity] || 'text-industrial-300';
};

export const getSeverityBgColor = (severity: string): string => {
  const colors: Record<string, string> = {
    warning: 'bg-warning-500/20 border-warning-500',
    error: 'bg-danger-500/20 border-danger-500',
    critical: 'bg-danger-500/30 border-danger-500 animate-pulse',
  };
  return colors[severity] || 'bg-industrial-500/20 border-industrial-500';
};
