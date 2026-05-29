import type { Partition, AnswerComparison } from '../types';
import { normalizePartitionString } from './deduplication';

export function compareAnswers(
  studentAnswers: string[],
  correctPartitions: Partition[]
): AnswerComparison {
  const correctKeys = new Set(
    correctPartitions.map(p => p.numbers.join(','))
  );

  const correctAnswers: string[] = [];
  const wrongAnswers: string[] = [];
  const duplicateAnswers: string[] = [];
  const seenStudentKeys = new Set<string>();

  for (const answer of studentAnswers) {
    const normalized = normalizePartitionString(answer);
    
    if (!normalized) {
      wrongAnswers.push(answer);
      continue;
    }

    if (seenStudentKeys.has(normalized)) {
      duplicateAnswers.push(answer);
      continue;
    }
    seenStudentKeys.add(normalized);

    if (correctKeys.has(normalized)) {
      correctAnswers.push(answer);
    } else {
      wrongAnswers.push(answer);
    }
  }

  const studentKeys = new Set(
    studentAnswers
      .map(a => normalizePartitionString(a))
      .filter(k => k)
  );
  const missedAnswers: string[] = [];
  
  for (const p of correctPartitions) {
    const key = p.numbers.join(',');
    if (!studentKeys.has(key)) {
      missedAnswers.push(p.numbers.join('+'));
    }
  }

  return {
    correctAnswers,
    wrongAnswers,
    missedAnswers,
    duplicateAnswers
  };
}
