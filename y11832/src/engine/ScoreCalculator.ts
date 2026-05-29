import { GameState, GameResult, Grade, Penalty, Broadcast } from '../types';
import { calculateCongestionLevel } from '../utils/locationUtils';

export const calculateScore = (gameState: GameState): number => {
  const baseScore = 1000;

  const evacuationScore = calculateEvacuationScore(gameState);
  const congestionScore = calculateCongestionScore(gameState);
  const broadcastScore = calculateBroadcastScore(gameState);
  const safetyScore = calculateSafetyScore(gameState);

  const totalPenalty = gameState.penalties.reduce(
    (sum, p) => sum + p.penaltyPoints,
    0
  );

  return Math.max(
    0,
    baseScore + evacuationScore + congestionScore + broadcastScore + safetyScore - totalPenalty
  );
};

const calculateEvacuationScore = (gameState: GameState): number => {
  const { passengers, currentTime } = gameState;
  const evacuatedPassengers = passengers.filter((p) => p.status === 'exited').length;
  const totalPassengers = passengers.length;

  if (totalPassengers === 0) return 0;

  const evacuationRate = evacuatedPassengers / totalPassengers;
  const timeBonus = Math.max(0, 1 - currentTime / 180);

  return Math.round(evacuationRate * 400 * (0.5 + timeBonus * 0.5));
};

const calculateCongestionScore = (gameState: GameState): number => {
  const { exits, passengers, gates } = gameState;
  let totalCongestion = 0;
  let maxCongestion = 0;

  for (const exit of exits) {
    totalCongestion += exit.congestionLevel;
    maxCongestion = Math.max(maxCongestion, exit.congestionLevel);
  }

  for (const gate of gates) {
    if (gate.status === 'normal') {
      const congestion = calculateCongestionLevel(
        {
          x: gate.position.x + gate.width / 2,
          y: gate.position.y + gate.height / 2,
        },
        passengers
      );
      totalCongestion += congestion;
      maxCongestion = Math.max(maxCongestion, congestion);
    }
  }

  const avgCongestion = totalCongestion / (exits.length + gates.length);
  const congestionPenalty = avgCongestion * 200 + maxCongestion * 100;

  return Math.round(300 - congestionPenalty);
};

const calculateBroadcastScore = (gameState: GameState): number => {
  const { broadcastLogs, penalties } = gameState;

  const totalBroadcasts = broadcastLogs.length;
  const missedPenalties = penalties.filter((p) => p.category === 'missed_broadcast').length;
  const cooldownPenalties = penalties.filter((p) => p.category === 'cooldown_violation').length;

  const baseScore = Math.min(200, totalBroadcasts * 15);
  const missedPenalty = missedPenalties * 30;
  const cooldownPenalty = cooldownPenalties * 15;

  return Math.max(0, baseScore - missedPenalty - cooldownPenalty);
};

const calculateSafetyScore = (gameState: GameState): number => {
  const { penalties, gates, lockdownAreas } = gameState;

  const safetyPenalties = penalties.filter((p) => p.category === 'safety_risk');
  const wrongDiversionPenalties = penalties.filter((p) => p.category === 'wrong_diversion');

  const faultyGates = gates.filter((g) => g.isFaulty);
  const lockedDownFaultyGates = faultyGates.filter((gate) =>
    lockdownAreas.some(
      (area) =>
        gate.position.x >= area.x &&
        gate.position.x + gate.width <= area.x + area.width &&
        gate.position.y >= area.y &&
        gate.position.y + gate.height <= area.y + area.height
    )
  );

  const lockdownBonus = lockedDownFaultyGates.length * 30;
  const safetyPenalty = safetyPenalties.reduce((sum, p) => sum + p.penaltyPoints, 0);
  const diversionPenalty = wrongDiversionPenalties.reduce((sum, p) => sum + p.penaltyPoints, 0);

  return Math.max(0, 100 + lockdownBonus - safetyPenalty - diversionPenalty);
};

export const calculateGrade = (score: number, maxScore: number): Grade => {
  const percentage = score / maxScore;

  if (percentage >= 0.95) return 'S';
  if (percentage >= 0.85) return 'A';
  if (percentage >= 0.75) return 'B';
  if (percentage >= 0.60) return 'C';
  if (percentage >= 0.40) return 'D';
  return 'F';
};

export const generateSimulationSummary = (gameState: GameState) => {
  const { passengers, exits, gates, penalties, broadcastLogs } = gameState;

  const totalPassengers = passengers.length;
  const evacuatedPassengers = passengers.filter((p) => p.status === 'exited').length;

  const evacuationTimes = passengers
    .filter((p) => p.exitedAt !== undefined)
    .map((p) => (p.exitedAt as number) - p.enteredAt);

  const avgEvacuationTime =
    evacuationTimes.length > 0
      ? evacuationTimes.reduce((sum, t) => sum + t, 0) / evacuationTimes.length
      : 0;

  let maxCongestionLevel = 0;
  const congestionHotspots: Array<{ locationId: string; maxLevel: number; duration: number }> = [];

  for (const exit of exits) {
    if (exit.congestionLevel > maxCongestionLevel) {
      maxCongestionLevel = exit.congestionLevel;
    }
    if (exit.congestionLevel > 0.5) {
      const relatedPenalties = penalties.filter(
        (p) => p.locationRef === exit.id && p.category === 'congestion'
      );
      congestionHotspots.push({
        locationId: exit.id,
        maxLevel: exit.congestionLevel,
        duration: relatedPenalties.length * 5,
      });
    }
  }

  const gateUtilization: Record<string, number> = {};
  for (const gate of gates) {
    const passengersNearGate = passengers.filter((p) => {
      if (p.status === 'exited') return false;
      const dx = p.position.x - (gate.position.x + gate.width / 2);
      const dy = p.position.y - (gate.position.y + gate.height / 2);
      return Math.sqrt(dx * dx + dy * dy) < 60;
    }).length;
    gateUtilization[gate.id] = passengersNearGate / gate.capacity;
  }

  const missedBroadcasts: Array<{ broadcastId: string; count: number }> = [];
  const missedBroadcastIds = new Set<string>();
  for (const penalty of penalties) {
    if (penalty.category === 'missed_broadcast') {
      missedBroadcastIds.add(penalty.locationRef);
    }
  }
  for (const broadcastId of missedBroadcastIds) {
    const count = broadcastLogs.filter((l) => l.broadcastId === broadcastId).length;
    missedBroadcasts.push({ broadcastId, count });
  }

  return {
    totalPassengers,
    evacuatedPassengers,
    avgEvacuationTime,
    maxCongestionLevel,
    gateUtilization,
    congestionHotspots,
    missedBroadcasts,
  };
};

export const generateGameResult = (
  gameState: GameState,
  gateSnapshot: typeof gameState.gates,
  exitSnapshot: typeof gameState.exits,
  broadcastSnapshot: Broadcast[]
): GameResult => {
  const totalScore = calculateScore(gameState);
  const maxPossibleScore = 1000;
  const grade = calculateGrade(totalScore, maxPossibleScore);
  const simulationSummary = generateSimulationSummary(gameState);

  return {
    id: `result-${Date.now()}`,
    gameId: gameState.id,
    totalScore,
    maxPossibleScore,
    grade,
    penalties: [...gameState.penalties],
    simulationSummary,
    createdAt: Date.now(),
    gateConfigSnapshot: gateSnapshot,
    exitConfigSnapshot: exitSnapshot,
    broadcastSnapshot,
  };
};

export const getPenaltyBreakdown = (penalties: Penalty[]) => {
  const categories = [
    'congestion',
    'missed_broadcast',
    'wrong_diversion',
    'safety_risk',
    'cooldown_violation',
  ] as const;

  return categories.map((category) => {
    const categoryPenalties = penalties.filter((p) => p.category === category);
    const totalPoints = categoryPenalties.reduce((sum, p) => sum + p.penaltyPoints, 0);
    return {
      category,
      count: categoryPenalties.length,
      totalPoints,
      penalties: categoryPenalties,
    };
  });
};
