import type {
  Volunteer,
  Position,
  Shift,
  Skill,
  LeaveRecord,
  Assignment,
  Anomaly,
  AnomalyType,
  ConstraintNode,
  AssignmentResult,
  AlgorithmMode,
} from '@/types';

interface Edge {
  to: number;
  rev: number;
  capacity: number;
  cost: number;
}

class MinCostMaxFlow {
  private n: number;
  private graph: Edge[][];
  private prevV: number[];
  private prevE: number[];

  constructor(n: number) {
    this.n = n;
    this.graph = Array.from({ length: n }, () => []);
    this.prevV = new Array(n).fill(-1);
    this.prevE = new Array(n).fill(-1);
  }

  addEdge(from: number, to: number, capacity: number, cost: number) {
    this.graph[from].push({ to, rev: this.graph[to].length, capacity, cost });
    this.graph[to].push({ to: from, rev: this.graph[from].length - 1, capacity: 0, cost: -cost });
  }

  private bellmanFord(s: number, t: number): boolean {
    const dist = new Array(this.n).fill(Infinity);
    const inQueue = new Array(this.n).fill(false);
    dist[s] = 0;
    const queue: number[] = [s];
    inQueue[s] = true;

    while (queue.length > 0) {
      const v = queue.shift()!;
      inQueue[v] = false;
      for (let i = 0; i < this.graph[v].length; i++) {
        const e = this.graph[v][i];
        if (e.capacity > 0 && dist[e.to] > dist[v] + e.cost) {
          dist[e.to] = dist[v] + e.cost;
          this.prevV[e.to] = v;
          this.prevE[e.to] = i;
          if (!inQueue[e.to]) {
            queue.push(e.to);
            inQueue[e.to] = true;
          }
        }
      }
    }
    return dist[t] !== Infinity;
  }

  solve(s: number, t: number): { maxFlow: number; minCost: number; flowEdges: { from: number; to: number; flow: number }[] } {
    let maxFlow = 0;
    let minCost = 0;
    const flowEdges: { from: number; to: number; flow: number }[] = [];

    while (this.bellmanFord(s, t)) {
      let flow = Infinity;
      for (let v = t; v !== s; v = this.prevV[v]) {
        const e = this.graph[this.prevV[v]][this.prevE[v]];
        flow = Math.min(flow, e.capacity);
      }
      for (let v = t; v !== s; v = this.prevV[v]) {
        const e = this.graph[this.prevV[v]][this.prevE[v]];
        e.capacity -= flow;
        this.graph[v][e.rev].capacity += flow;
      }
      maxFlow += flow;
      minCost += flow * 0;

      for (let v = t; v !== s; v = this.prevV[v]) {
        flowEdges.push({ from: this.prevV[v], to: v, flow });
      }
    }
    return { maxFlow, minCost, flowEdges };
  }

  getFlowOnEdge(from: number, to: number): number {
    for (const e of this.graph[from]) {
      if (e.to === to) {
        const originalCapacity = e.capacity + this.graph[to][e.rev].capacity;
        return originalCapacity - e.capacity;
      }
    }
    return 0;
  }
}

export function runAssignment(
  volunteers: Volunteer[],
  positions: Position[],
  shifts: Shift[],
  skills: Skill[],
  leaveRecords: LeaveRecord[],
  mode: AlgorithmMode
): AssignmentResult {
  const anomalies: Anomaly[] = [];
  const constraintMap: Record<string, ConstraintNode> = {};
  const assignments: Assignment[] = [];

  const skillMap = new Map(skills.map(s => [s.id, s]));
  const positionMap = new Map(positions.map(p => [p.id, p]));
  const leaveMap = new Map<string, Set<string>>();
  for (const lr of leaveRecords) {
    if (!leaveMap.has(lr.volunteerId)) leaveMap.set(lr.volunteerId, new Set());
    leaveMap.get(lr.volunteerId)!.add(lr.timeSlot);
  }

  const volunteerSlots: { volId: string; timeSlot: string }[] = [];
  for (const v of volunteers) {
    for (const ts of ['sat_am', 'sat_pm', 'sun_am', 'sun_pm']) {
      if (!(leaveMap.get(v.id)?.has(ts))) {
        volunteerSlots.push({ volId: v.id, timeSlot: ts });
      }
    }
  }

  const nodeCount = 1 + volunteerSlots.length + shifts.length + 1;
  const source = 0;
  const sink = nodeCount - 1;

  const mcmf = new MinCostMaxFlow(nodeCount);

  const volSlotIndex = new Map<string, number>();
  volunteerSlots.forEach((vs, i) => {
    const nodeIdx = 1 + i;
    volSlotIndex.set(`${vs.volId}_${vs.timeSlot}`, nodeIdx);
    mcmf.addEdge(source, nodeIdx, 1, 0);
  });

  const shiftIndex = new Map<string, number>();
  shifts.forEach((sh, i) => {
    const nodeIdx = 1 + volunteerSlots.length + i;
    shiftIndex.set(sh.id, nodeIdx);
    mcmf.addEdge(nodeIdx, sink, sh.requiredCount, 0);
  });

  for (const vs of volunteerSlots) {
    const vol = volunteers.find(v => v.id === vs.volId)!;
    const fromNode = volSlotIndex.get(`${vs.volId}_${vs.timeSlot}`)!;

    for (const sh of shifts) {
      if (sh.timeSlot !== vs.timeSlot) continue;

      const pos = positionMap.get(sh.positionId)!;
      const hasRequiredSkill = pos.requiredSkillIds.some(rs => vol.skillIds.includes(rs));
      const cost = hasRequiredSkill ? 0 : 100;

      const toNode = shiftIndex.get(sh.id)!;
      mcmf.addEdge(fromNode, toNode, 1, cost);
    }
  }

  const result = mcmf.solve(source, sink);

  for (const vs of volunteerSlots) {
    const vol = volunteers.find(v => v.id === vs.volId)!;
    const fromNode = volSlotIndex.get(`${vs.volId}_${vs.timeSlot}`)!;

    for (const sh of shifts) {
      if (sh.timeSlot !== vs.timeSlot) continue;

      const toNode = shiftIndex.get(sh.id)!;
      const flow = mcmf.getFlowOnEdge(fromNode, toNode);

      if (flow > 0) {
        const pos = positionMap.get(sh.positionId)!;
        const hasRequiredSkill = pos.requiredSkillIds.some(rs => vol.skillIds.includes(rs));
        const isAnomaly = !hasRequiredSkill;

        const assignmentId = `asg_${vol.id}_${sh.id}`;
        const volSkills = vol.skillIds.map(sid => skillMap.get(sid)?.name || sid).join('、');
        const posSkills = pos.requiredSkillIds.map(sid => skillMap.get(sid)?.name || sid).join('、');

        let explanation = '';
        let anomalyType: AnomalyType | undefined;

        if (hasRequiredSkill) {
          explanation = `${vol.name} 具备 ${posSkills} 技能（持有 ${volSkills}），时间 ${sh.timeSlot} 可用，匹配成功。`;
        } else {
          anomalyType = 'skill_mismatch';
          explanation = `${vol.name} 仅持有 ${volSkills}，但 ${pos.name} 需要 ${posSkills}，技能不匹配。因人员不足被强制分配。`;
        }

        const assignment: Assignment = {
          id: assignmentId,
          volunteerId: vol.id,
          shiftId: sh.id,
          constraintExplanation: explanation,
          isAnomaly,
          anomalyType,
        };

        assignments.push(assignment);

        constraintMap[assignmentId] = {
          label: `${vol.name} → ${pos.name}（${sh.timeSlot}）`,
          detail: explanation,
          children: [
            {
              label: '技能检查',
              detail: hasRequiredSkill
                ? `✓ 持有匹配技能：${volSkills}`
                : `✗ 技能不匹配：持有 ${volSkills}，需要 ${posSkills}`,
              children: [],
            },
            {
              label: '时间检查',
              detail: leaveMap.get(vol.id)?.has(sh.timeSlot)
                ? `✗ 该时段已请假`
                : `✓ 该时段可用`,
              children: [],
            },
            {
              label: '冲突检查',
              detail: assignments.filter(
                a => a.volunteerId === vol.id && a.id !== assignmentId && shifts.find(s => s.id === a.shiftId)?.timeSlot === sh.timeSlot
              ).length > 0
                ? `✗ 存在同时段其他分配`
                : `✓ 无班次冲突`,
              children: [],
            },
          ],
        };

        if (isAnomaly && anomalyType) {
          anomalies.push({
            id: `anm_${assignmentId}`,
            type: anomalyType,
            description: `${vol.name} 被分配到 ${pos.name}（${sh.timeSlot}），但技能不匹配`,
            volunteerId: vol.id,
            shiftId: sh.id,
          });
        }
      }
    }
  }

  for (const sh of shifts) {
    const assignedCount = assignments.filter(a => a.shiftId === sh.id).length;
    if (assignedCount < sh.requiredCount) {
      const pos = positionMap.get(sh.positionId)!;
      anomalies.push({
        id: `anm_vacancy_${sh.id}`,
        type: 'vacancy',
        description: `${pos.name}（${sh.timeSlot}）缺人：需 ${sh.requiredCount} 人，仅分配 ${assignedCount} 人`,
        volunteerId: null,
        shiftId: sh.id,
      });
    }
  }

  for (const vol of volunteers) {
    const volAssignments = assignments.filter(a => a.volunteerId === vol.id);
    const timeSlotCount: Record<string, string[]> = {};
    for (const a of volAssignments) {
      const ts = shifts.find(s => s.id === a.shiftId)?.timeSlot;
      if (ts) {
        if (!timeSlotCount[ts]) timeSlotCount[ts] = [];
        timeSlotCount[ts].push(a.shiftId);
      }
    }
    for (const [ts, shiftIds] of Object.entries(timeSlotCount)) {
      if (shiftIds.length > 1) {
        const posNames = shiftIds.map(sid => {
          const sh = shifts.find(s => s.id === sid)!;
          return positionMap.get(sh.positionId)!.name;
        }).join('、');
        anomalies.push({
          id: `anm_conflict_${vol.id}_${ts}`,
          type: 'shift_conflict',
          description: `${vol.name} 在 ${ts} 同时被分配到 ${posNames}，班次冲突`,
          volunteerId: vol.id,
          shiftId: null,
        });
      }
    }
  }

  for (const lr of leaveRecords) {
    const volAssignments = assignments.filter(a => {
      if (a.volunteerId !== lr.volunteerId) return false;
      const ts = shifts.find(s => s.id === a.shiftId)?.timeSlot;
      return ts === lr.timeSlot;
    });
    for (const a of volAssignments) {
      const vol = volunteers.find(v => v.id === lr.volunteerId)!;
      const sh = shifts.find(s => s.id === a.shiftId)!;
      const pos = positionMap.get(sh.positionId)!;
      const existingAnomaly = anomalies.find(
        an => an.type === 'leave_conflict' && an.volunteerId === lr.volunteerId && an.description.includes(lr.timeSlot)
      );
      if (!existingAnomaly) {
        anomalies.push({
          id: `anm_leave_${lr.volunteerId}_${lr.timeSlot}`,
          type: 'leave_conflict',
          description: `${vol.name} 已请假（${lr.reason}），但仍被分配到 ${pos.name}（${lr.timeSlot}）`,
          volunteerId: lr.volunteerId,
          shiftId: sh.id,
        });
      }
    }
  }

  const assignedVolIds = new Set(assignments.map(a => a.volunteerId));
  const filledShiftIds = new Set(
    shifts.filter(sh => assignments.filter(a => a.shiftId === sh.id).length >= sh.requiredCount).map(sh => sh.id)
  );

  return {
    assignments,
    anomalies,
    constraintMap,
    stats: {
      totalVolunteers: volunteers.length,
      assignedVolunteers: assignedVolIds.size,
      totalShifts: shifts.length,
      filledShifts: filledShiftIds.size,
      anomalyCount: anomalies.length,
      vacancyCount: anomalies.filter(a => a.type === 'vacancy').length,
      mismatchCount: anomalies.filter(a => a.type === 'skill_mismatch').length,
      conflictCount: anomalies.filter(a => a.type === 'shift_conflict' || a.type === 'leave_conflict').length,
    },
  };
}
