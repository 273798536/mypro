import type { TrackSwitch, TimedEvent, BeatNote } from '@/types';

let evtCounter = 0;

export function processSwitchDeliveries(
  switches: TrackSwitch[],
  currentTime: number
): { delivered: TrackSwitch[]; events: TimedEvent[] } {
  const delivered: TrackSwitch[] = [];
  const events: TimedEvent[] = [];

  for (const sw of switches) {
    if (!sw.isDelivered && currentTime >= sw.triggerTime + sw.arrivalDelay) {
      sw.isDelivered = true;
      delivered.push(sw);
      events.push({
        id: `sw_evt_${++evtCounter}`,
        timestamp: currentTime,
        type: 'switch_delay',
        description: `换轨器延迟${sw.arrivalDelay}ms后到达: 轨道${sw.fromTrack}→${sw.toTrack}`,
        order: 0,
      });
    }
  }

  return { delivered, events };
}

export function applySwitchToNotes(
  notes: BeatNote[],
  sw: TrackSwitch
): { modifiedNotes: string[]; deduction: boolean } {
  const modified: string[] = [];
  let deduction = false;

  for (const note of notes) {
    if (
      !note.judged &&
      note.trackIndex === sw.fromTrack &&
      note.targetTime > sw.triggerTime
    ) {
      note.trackIndex = sw.toTrack;
      note.sourceTrain.actualTrack = sw.toTrack;
      modified.push(note.id);

      if (sw.arrivalDelay > 400) {
        deduction = true;
      }
    }
  }

  return { modifiedNotes: modified, deduction };
}

export function createSwitchDelayEvent(
  sw: TrackSwitch,
  noteId: string
): TimedEvent {
  return {
    id: `sw_delay_evt_${++evtCounter}`,
    timestamp: sw.triggerTime + sw.arrivalDelay,
    type: 'switch_delay',
    description: `换轨器延迟${sw.arrivalDelay}ms: 影响${noteId}`,
    relatedJudgmentId: noteId,
    order: 0,
  };
}
