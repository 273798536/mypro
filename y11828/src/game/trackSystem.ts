import type { TrackNode, TrackSegment } from '../types/game';

export class TrackSystem {
  nodes: Map<string, TrackNode>;
  segments: Map<string, TrackSegment>;
  switchStates: Map<string, string>;

  constructor(nodes: TrackNode[], segments: TrackSegment[]) {
    this.nodes = new Map();
    this.segments = new Map();
    this.switchStates = new Map();

    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      if (node.isSwitch && node.switchState) {
        this.switchStates.set(node.id, node.switchState);
      }
    });

    segments.forEach(segment => {
      this.segments.set(segment.id, segment);
    });
  }

  getNode(id: string): TrackNode | undefined {
    return this.nodes.get(id);
  }

  getSegment(id: string): TrackSegment | undefined {
    return this.segments.get(id);
  }

  getSegmentsForNode(nodeId: string): TrackSegment[] {
    return Array.from(this.segments.values()).filter(
      s => s.startNode === nodeId || s.endNode === nodeId
    );
  }

  getSwitchState(nodeId: string): string | null {
    return this.switchStates.get(nodeId) || null;
  }

  toggleSwitch(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node?.isSwitch || node.connections.length < 2) return false;

    const currentState = this.switchStates.get(nodeId) || node.connections[0];
    const currentIndex = node.connections.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % node.connections.length;
    this.switchStates.set(nodeId, node.connections[nextIndex]);
    return true;
  }

  getNextNode(fromNodeId: string, toNodeId: string): string {
    const fromNode = this.nodes.get(fromNodeId);
    if (!fromNode) return toNodeId;

    if (fromNode.isSwitch) {
      const switchState = this.switchStates.get(fromNodeId);
      if (switchState) return switchState;
    }

    const otherConnections = fromNode.connections.filter(c => c !== toNodeId);
    return otherConnections[0] || toNodeId;
  }

  getSegmentPosition(segmentId: string, progress: number): {
    x: number;
    y: number;
    angle: number;
  } {
    const segment = this.segments.get(segmentId);
    if (!segment) return { x: 0, y: 0, angle: 0 };

    const startNode = this.nodes.get(segment.startNode);
    const endNode = this.nodes.get(segment.endNode);
    if (!startNode || !endNode) return { x: 0, y: 0, angle: 0 };

    const clampedProgress = Math.max(0, Math.min(1, progress));
    const x = startNode.x + (endNode.x - startNode.x) * clampedProgress;
    const y = startNode.y + (endNode.y - startNode.y) * clampedProgress;
    const angle = Math.atan2(endNode.y - startNode.y, endNode.x - startNode.x);

    return { x, y, angle };
  }

  getSegmentLength(segmentId: string): number {
    const segment = this.segments.get(segmentId);
    if (!segment) return 0;

    const startNode = this.nodes.get(segment.startNode);
    const endNode = this.nodes.get(segment.endNode);
    if (!startNode || !endNode) return 0;

    return Math.hypot(
      endNode.x - startNode.x,
      endNode.y - startNode.y
    );
  }

  getNextSegment(currentSegmentId: string, progress: number): {
    segmentId: string;
    newProgress: number;
    reachedSwitch: string | null;
  } | null {
    const currentSegment = this.segments.get(currentSegmentId);
    if (!currentSegment) return null;

    if (progress < 1) {
      return { segmentId: currentSegmentId, newProgress: progress, reachedSwitch: null };
    }

    const endNode = this.nodes.get(currentSegment.endNode);
    if (!endNode) return null;

    const nextNodeId = this.getNextNode(
      currentSegment.endNode,
      currentSegment.startNode
    );

    const nextSegment = Array.from(this.segments.values()).find(
      s =>
        (s.startNode === currentSegment.endNode && s.endNode === nextNodeId) ||
        (s.endNode === currentSegment.endNode && s.startNode === nextNodeId)
    );

    if (!nextSegment) return null;

    const reachedSwitch = endNode.isSwitch ? currentSegment.endNode : null;

    return {
      segmentId: nextSegment.id,
      newProgress: progress - 1,
      reachedSwitch
    };
  }

  checkPointNearSegment(
    x: number,
    y: number,
    segmentId: string,
    threshold: number
  ): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) return false;

    const startNode = this.nodes.get(segment.startNode);
    const endNode = this.nodes.get(segment.endNode);
    if (!startNode || !endNode) return false;

    const A = x - startNode.x;
    const B = y - startNode.y;
    const C = endNode.x - startNode.x;
    const D = endNode.y - startNode.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = startNode.x;
      yy = startNode.y;
    } else if (param > 1) {
      xx = endNode.x;
      yy = endNode.y;
    } else {
      xx = startNode.x + param * C;
      yy = startNode.y + param * D;
    }

    const distance = Math.hypot(x - xx, y - yy);
    return distance <= threshold;
  }
}
