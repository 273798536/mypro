import type { Assignment, Annotation } from '../types';
import { db } from '../db';
import { generateId } from '../utils/hashUtils';

export async function getAllAssignments(): Promise<Assignment[]> {
  return (await db.assignments.toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssignmentById(id: string): Promise<Assignment | undefined> {
  return db.assignments.get(id);
}

export async function getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
  return (await db.assignments.where('studentId').equals(studentId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
  return (await db.assignments.where('teacherId').equals(teacherId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssignmentsByStatus(status: string): Promise<Assignment[]> {
  return (await db.assignments.where('status').equals(status).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createAssignment(data: Omit<Assignment, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const assignment: Assignment = {
    ...data,
    id,
    createdAt: now,
  };
  await db.assignments.add(assignment);
  return id;
}

export async function updateAssignmentStatus(
  id: string,
  status: Assignment['status'],
  feedback?: string,
  grade?: string
): Promise<void> {
  const updates: Partial<Assignment> = { status };
  if (feedback !== undefined) updates.feedback = feedback;
  if (grade !== undefined) updates.grade = parseFloat(grade);
  await db.assignments.update(id, updates);
}

export async function addAnnotation(
  assignmentId: string,
  annotation: Omit<Annotation, 'id' | 'createdAt'>
): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const newAnnotation: Annotation = {
    ...annotation,
    id,
    createdAt: now,
  };
  const assignment = await db.assignments.get(assignmentId);
  if (assignment) {
    const annotations = [...(assignment.annotations || []), newAnnotation];
    await db.assignments.update(assignmentId, { annotations });
  }
  return id;
}

export async function resolveAnnotation(annotationId: string): Promise<void> {
  const assignments = await db.assignments.toArray();
  for (const assignment of assignments) {
    const annotations = assignment.annotations || [];
    const annotationIndex = annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex !== -1) {
      annotations[annotationIndex].isResolved = true;
      await db.assignments.update(assignment.id, { annotations });
      break;
    }
  }
}
