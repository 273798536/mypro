import type { Volunteer, Position, TimeSlot, ScheduleEntry, ValidationResult } from '../types';
import { detectAllConflictsForAssignment } from './conflictDetector';
import { generateId } from './mockData';

export const suggestVolunteers = (
  position: Position, volunteers: Volunteer[], entries: ScheduleEntry[], timeSlots: TimeSlot[]): Volunteer[] => {
  const timeSlot = timeSlots.find(t => t.id === position.timeSlotId);
  if (!timeSlot) return [];

  const scoredVolunteers = volunteers
    .filter(v => v.status === 'active')
    .map(volunteer => {
      const conflicts = detectAllConflictsForAssignment(
        volunteer, position, timeSlot, entries, timeSlots
      );
      const errorCount = conflicts.filter(c => c.severity === 'error').length;
      const warningCount = conflicts.filter(c => c.severity === 'warning').length;
      const skillMatch = position.requiredSkills.filter(s => volunteer.skills.includes(s)).length;

      return {
        volunteer,
        score: skillMatch * 10 - errorCount * 5 - warningCount * 2,
        conflicts
      };
    })
    .sort((a, b) => b.score - a.score);

  return scoredVolunteers.map(sv => sv.volunteer);
};

export const validateAssignment = (
  volunteer: Volunteer,
  position: Position,
  timeSlot: TimeSlot,
  allEntries: ScheduleEntry[],
  allTimeSlots: TimeSlot[]
): ValidationResult => {
  const conflicts = detectAllConflictsForAssignment(
    volunteer, position, timeSlot, allEntries, allTimeSlots
  );

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');

  return {
    valid: errors.length === 0,
    conflicts,
    warnings: warnings.map(w => w.message)
  };
};

export const createScheduleEntry = (
  volunteerId: string,
  positionId: string,
  timeSlotId: string,
  stageId: string,
  volunteers: Volunteer[],
  positions: Position[],
  timeSlots: TimeSlot[],
  entries: ScheduleEntry[]
): ScheduleEntry | null => {
  const volunteer = volunteers.find(v => v.id === volunteerId);
  const position = positions.find(p => p.id === positionId);
  const timeSlot = timeSlots.find(t => t.id === timeSlotId);

  if (!volunteer || !position || !timeSlot) return null;

  const conflicts = detectAllConflictsForAssignment(
    volunteer, position, timeSlot, entries, timeSlots
  );

  return {
    id: generateId(),
    volunteerId,
    positionId,
    timeSlotId,
    stageId,
    status: 'scheduled',
    conflicts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const autoAssign = (
  volunteers: Volunteer[], positions: Position[], timeSlots: TimeSlot[]
): ScheduleEntry[] => {
  const entries: ScheduleEntry[] = [];
  const assignedVolunteers = new Set<string>();

  positions.forEach(position => {
    const timeSlot = timeSlots.find(t => t.id === position.timeSlotId);
    if (!timeSlot) return;

    const availableVolunteers = volunteers.filter(
      v => v.status === 'active' && !assignedVolunteers.has(v.id)
    );

    const suggested = suggestVolunteers(position, availableVolunteers, entries, timeSlots);

    for (let i = 0; i < Math.min(position.headcount, suggested.length); i++) {
      const volunteer = suggested[i];
      const validation = validateAssignment(volunteer, position, timeSlot, entries, timeSlots);

      if (validation.valid || validation.conflicts.every(c => c.severity === 'warning')) {
        const entry = createScheduleEntry(
          volunteer.id, position.id, timeSlot.id, position.stageId,
          volunteers, positions, timeSlots, entries
        );
        if (entry) {
          entries.push(entry);
          assignedVolunteers.add(volunteer.id);
        }
      }
    }
  });

  return entries;
};
