import { create } from 'zustand';
import type { GameState, Patient, Room, GameEvent, GameRecord, Priority } from '@/types';
import { generateMockRooms, generateMockPatients } from '@/utils/mockData';
import { PRIORITY_CONFIG } from '@/types';

interface GameActions {
  startGame: (patients?: Patient[]) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => GameRecord;
  update: (deltaTime: number) => void;
  assignPatientToRoom: (patientId: string, roomId: string) => boolean;
  reorderPatients: (fromIndex: number, toIndex: number) => void;
  triggerReEvaluate: (patientId: string, newPriority: Priority, reason: string) => void;
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp' | 'read'>) => void;
  markEventAsRead: (eventId: string) => void;
  setSpeed: (speed: number) => void;
  setPatients: (patients: Patient[]) => void;
  getWaitingPatients: () => Patient[];
  getCompletedPatients: () => Patient[];
}

const initialState: GameState = {
  status: 'idle',
  startTime: 0,
  elapsedTime: 0,
  totalTime: 600,
  score: 0,
  maxScore: 0,
  patients: [],
  rooms: generateMockRooms(),
  events: [],
  currentPatientIndex: 0,
  speed: 1,
};

let pendingPatients: Patient[] = [];
let patientSpawnTimer: number = 0;

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startGame: (patients?: Patient[]) => {
    const rooms = generateMockRooms();
    const initialPatients = patients || generateMockPatients(15);
    
    pendingPatients = initialPatients.map((p, idx) => ({
      ...p,
      arrivalDelay: idx * 15,
      waitTime: 0,
      status: 'waiting' as const,
    }));
    
    let maxScore = 0;
    initialPatients.forEach(p => {
      maxScore += PRIORITY_CONFIG[p.initialPriority].points;
    });

    const firstBatch = pendingPatients.slice(0, 3);

    set({
      status: 'playing',
      startTime: Date.now(),
      elapsedTime: 0,
      score: 0,
      maxScore,
      patients: firstBatch,
      rooms,
      events: firstBatch.map(p => ({
        id: `event-init-${p.id}`,
        type: 'patient_arrive' as const,
        timestamp: Date.now(),
        message: `新患者 ${p.name} 到达`,
        patientId: p.id,
        pointsChange: 0,
        read: false,
      })),
      currentPatientIndex: 3,
    });
    patientSpawnTimer = 0;
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  restartGame: () => {
    get().startGame();
  },

  endGame: (): GameRecord => {
    const state = get();
    const waitingPatients = state.patients.filter(p => p.status === 'waiting');
    const completedPatients = state.patients.filter(p => p.status === 'completed');
    
    waitingPatients.forEach(p => {
      get().addEvent({
        type: 'timeout',
        message: `游戏结束时 ${p.name} 仍在等待`,
        patientId: p.id,
        pointsChange: -30,
        details: { waitTime: p.waitTime },
      });
    });

    const finalState = get();
    const criticalMissCount = finalState.events.filter(e => e.type === 'critical_miss').length;
    const timeoutCount = finalState.events.filter(e => e.type === 'timeout').length;
    const reEvaluateCount = finalState.events.filter(e => e.type === 're_evaluate').length;
    
    const accuracy = finalState.maxScore > 0 
      ? Math.max(0, (finalState.score / finalState.maxScore) * 100)
      : 0;

    const record: GameRecord = {
      id: `record-${Date.now()}`,
      startTime: state.startTime,
      endTime: Date.now(),
      totalScore: finalState.score,
      maxScore: finalState.maxScore,
      accuracy: Math.round(accuracy * 10) / 10,
      criticalMissCount,
      timeoutCount,
      reEvaluateCount,
      events: finalState.events,
      patientSnapshots: JSON.parse(JSON.stringify(finalState.patients)),
    };

    set({ status: 'ended' });

    const records = JSON.parse(localStorage.getItem('triage_game_records') || '[]');
    records.unshift(record);
    localStorage.setItem('triage_game_records', JSON.stringify(records.slice(0, 50)));

    return record;
  },

  update: (deltaTime: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const adjustedDelta = deltaTime * state.speed;
    const newElapsedTime = state.elapsedTime + adjustedDelta;
    
    set({ elapsedTime: newElapsedTime });

    const newArrivals = pendingPatients.filter(p => 
      p.arrivalDelay !== undefined &&
      p.arrivalDelay <= newElapsedTime &&
      !state.patients.find(ep => ep.id === p.id)
    );

    if (newArrivals.length > 0) {
      newArrivals.forEach(p => {
        get().addEvent({
          type: 'patient_arrive',
          message: `新患者 ${p.name} 到达`,
          patientId: p.id,
          pointsChange: 0,
          details: { priority: p.currentPriority, symptoms: p.symptoms },
        });
      });
      set(s => ({ patients: [...s.patients, ...newArrivals.map(p => ({ ...p, arrivalTime: Date.now() }))] }));
    }

    set(s => ({
      patients: s.patients.map(p => {
        if (p.status !== 'waiting') return p;
        const newWaitTime = p.waitTime + adjustedDelta;
        
        if (newWaitTime >= p.maxWaitTime && p.waitTime < p.maxWaitTime) {
          if (p.currentPriority === 'critical') {
            get().addEvent({
              type: 'critical_miss',
              message: `危重患者 ${p.name} 等待超时！`,
              patientId: p.id,
              pointsChange: -200,
              details: { waitTime: Math.round(newWaitTime), maxWait: p.maxWaitTime },
            });
          } else {
            get().addEvent({
              type: 'timeout',
              message: `患者 ${p.name} 等待超时`,
              patientId: p.id,
              pointsChange: -50,
              details: { waitTime: Math.round(newWaitTime), maxWait: p.maxWaitTime },
            });
          }
        }
        
        return { ...p, waitTime: newWaitTime };
      }),
    }));

    set(s => ({
      rooms: s.rooms.map(room => {
        if (room.status !== 'occupied' || !room.currentPatientId) {
          if (room.status === 'idle') {
            const newIdleTime = room.idleTime + adjustedDelta;
            if (newIdleTime >= 30 && room.idleTime < 30) {
              get().addEvent({
                type: 'idle_room',
                message: `${room.name} 空闲超过30秒`,
                roomId: room.id,
                pointsChange: -20,
                details: { idleTime: Math.round(newIdleTime) },
              });
            }
            return { ...room, idleTime: newIdleTime };
          }
          return room;
        }
        
        const newRemaining = room.remainingTime - adjustedDelta;
        
        if (newRemaining <= 0) {
          const patient = s.patients.find(p => p.id === room.currentPatientId);
          if (patient) {
            const priorityOrder: Priority[] = ['critical', 'urgent', 'normal', 'low'];
            const patientPriorityIndex = priorityOrder.indexOf(patient.currentPriority);
            
            const waitingPatients = s.patients.filter(p => p.status === 'waiting');
            const higherPriorityWaiting = waitingPatients.filter(p => 
              priorityOrder.indexOf(p.currentPriority) < patientPriorityIndex
            );
            
            if (higherPriorityWaiting.length > 0 && patient.currentPriority !== 'critical') {
              get().addEvent({
                type: 'critical_miss',
                message: `${patient.name} 诊疗时存在更高优先级患者等待`,
                patientId: patient.id,
                pointsChange: -100,
                details: { higherPriorityCount: higherPriorityWaiting.length },
              });
            } else {
              get().addEvent({
                type: 'room_complete',
                message: `${patient.name} 在 ${room.name} 诊疗完成`,
                patientId: patient.id,
                roomId: room.id,
                pointsChange: PRIORITY_CONFIG[patient.currentPriority].points,
                details: { waitTime: Math.round(patient.waitTime), treatmentTime: room.totalTime },
              });
              set(gs => ({ score: gs.score + PRIORITY_CONFIG[patient.currentPriority].points }));
            }
          }
          
          set(ps => ({
            patients: ps.patients.map(p => 
              p.id === room.currentPatientId ? { ...p, status: 'completed' } : p
            ),
          }));
          
          return {
            ...room,
            status: 'idle' as const,
            currentPatientId: undefined,
            remainingTime: 0,
            totalTime: 0,
            idleTime: 0,
          };
        }
        
        return { ...room, remainingTime: newRemaining };
      }),
    }));

    if (Math.random() < 0.002 * adjustedDelta) {
      const waitingPatients = get().getWaitingPatients();
      if (waitingPatients.length > 0) {
        const patient = waitingPatients[Math.floor(Math.random() * waitingPatients.length)];
        const priorityOrder: Priority[] = ['critical', 'urgent', 'normal', 'low'];
        const currentIndex = priorityOrder.indexOf(patient.currentPriority);
        const possibleNewPriorities = priorityOrder.filter((_, i) => Math.abs(i - currentIndex) <= 1 && i !== currentIndex);
        
        if (possibleNewPriorities.length > 0) {
          const newPriority = possibleNewPriorities[Math.floor(Math.random() * possibleNewPriorities.length)];
          get().triggerReEvaluate(patient.id, newPriority, '病情变化复评');
        }
      }
    }
  },

  assignPatientToRoom: (patientId: string, roomId: string): boolean => {
    const state = get();
    const patient = state.patients.find(p => p.id === patientId);
    const room = state.rooms.find(r => r.id === roomId);

    if (!patient || !room || patient.status !== 'waiting' || room.status !== 'idle') {
      return false;
    }

    get().addEvent({
      type: 'room_assign',
      message: `${patient.name} 分配到 ${room.name}`,
      patientId,
      roomId,
      pointsChange: 0,
      details: { priority: patient.currentPriority, waitTime: Math.round(patient.waitTime) },
    });

    set(s => ({
      patients: s.patients.map(p => 
        p.id === patientId ? { ...p, status: 'in_room', roomId } : p
      ),
      rooms: s.rooms.map(r => 
        r.id === roomId ? {
          ...r,
          status: 'occupied' as const,
          currentPatientId: patientId,
          remainingTime: patient.treatmentTime,
          totalTime: patient.treatmentTime,
          idleTime: 0,
        } : r
      ),
    }));

    return true;
  },

  reorderPatients: (fromIndex: number, toIndex: number) => {
    set(s => {
      const waitingPatients = s.patients.filter(p => p.status === 'waiting');
      const otherPatients = s.patients.filter(p => p.status !== 'waiting');
      
      const [removed] = waitingPatients.splice(fromIndex, 1);
      waitingPatients.splice(toIndex, 0, removed);
      
      return { patients: [...waitingPatients, ...otherPatients] };
    });
  },

  triggerReEvaluate: (patientId: string, newPriority: Priority, reason: string) => {
    const state = get();
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    const oldPriority = patient.currentPriority;
    const priorityOrder: Priority[] = ['critical', 'urgent', 'normal', 'low'];
    const oldIndex = priorityOrder.indexOf(oldPriority);
    const newIndex = priorityOrder.indexOf(newPriority);
    
    const waitingPatients = state.getWaitingPatients();
    const currentPosition = waitingPatients.findIndex(p => p.id === patientId);
    
    let correctPosition = 0;
    for (let i = 0; i < waitingPatients.length; i++) {
      const p = waitingPatients[i];
      if (p.id === patientId) continue;
      const pPriorityIndex = priorityOrder.indexOf(p.currentPriority);
      if (pPriorityIndex <= newIndex) {
        correctPosition++;
      } else {
        break;
      }
    }

    get().addEvent({
      type: 're_evaluate',
      message: `${patient.name} 复评：${PRIORITY_CONFIG[oldPriority].label} → ${PRIORITY_CONFIG[newPriority].label}`,
      patientId,
      pointsChange: 0,
      details: { oldPriority, newPriority, reason, suggestedPosition: correctPosition, currentPosition },
    });

    if (newIndex < oldIndex && correctPosition < currentPosition) {
      setTimeout(() => {
        get().addEvent({
          type: 'priority_change',
          message: `提示：${patient.name} 优先级提升，建议调整队列位置`,
          patientId,
          pointsChange: 0,
          details: { suggestedPosition: correctPosition + 1 },
        });
      }, 500);
    }

    set(s => ({
      patients: s.patients.map(p => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          currentPriority: newPriority,
          reEvaluateCount: p.reEvaluateCount + 1,
          history: [
            ...p.history,
            {
              timestamp: Date.now(),
              oldPriority,
              newPriority,
              reason,
            },
          ],
        };
      }),
    }));
  },

  addEvent: (event) => {
    const newEvent: GameEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    set(s => ({ events: [newEvent, ...s.events].slice(0, 100) }));
    
    if (event.pointsChange !== 0) {
      set(s => ({ score: Math.max(0, s.score + event.pointsChange) }));
    }
  },

  markEventAsRead: (eventId: string) => {
    set(s => ({
      events: s.events.map(e => e.id === eventId ? { ...e, read: true } : e),
    }));
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  setPatients: (patients: Patient[]) => {
    set({ patients });
  },

  getWaitingPatients: () => {
    return get().patients.filter(p => p.status === 'waiting');
  },

  getCompletedPatients: () => {
    return get().patients.filter(p => p.status === 'completed');
  },
}));
