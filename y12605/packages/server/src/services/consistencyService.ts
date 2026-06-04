import { ReviewTask, ReviewNote, ScoreSheet, Conclusion, ValidationError } from '@puzzle/shared';

export function checkNoteScoreConsistency(task: ReviewTask): ValidationError | null {
  const affectingNotes = task.notes.filter(n => n.affectsScoreSheet);
  
  if (affectingNotes.length > 0 && !task.scoreSheet.synchronizedWithNotes) {
    const latestNote = affectingNotes.reduce((latest, note) => 
      new Date(note.updatedAt) > new Date(latest.updatedAt) ? note : latest
    );
    
    if (new Date(latestNote.updatedAt) > new Date(task.scoreSheet.updatedAt)) {
      return {
        field: 'scoreSheet',
        message: `备注"${latestNote.content.substring(0, 20)}..."已修改，评分表需要同步更新`,
        suggestion: '请打开评分表，根据备注内容调整评分，然后点击"标记为已同步"'
      };
    }
  }
  
  return null;
}

export function checkScoreConclusionConsistency(task: ReviewTask): ValidationError | null {
  if (!task.conclusion) return null;
  
  if (!task.conclusion.synchronizedWithScoreSheet) {
    if (new Date(task.scoreSheet.updatedAt) > new Date(task.conclusion.updatedAt)) {
      return {
        field: 'conclusion',
        message: '评分表已修改，结论需要同步更新',
        suggestion: '请检查结论是否与当前评分一致，如一致请点击"标记为已同步"'
      };
    }
  }
  
  const scorePercentage = task.scoreSheet.totalScore / task.scoreSheet.maxTotalScore;
  
  if (scorePercentage >= 0.8 && task.conclusion.status !== 'pass') {
    return {
      field: 'conclusion.status',
      message: `评分${(scorePercentage * 100).toFixed(0)}分达到通过标准，但结论状态为"${task.conclusion.status}"`,
      suggestion: '建议将结论状态更新为"通过"'
    };
  }
  
  if (scorePercentage < 0.6 && task.conclusion.status === 'pass') {
    return {
      field: 'conclusion.status',
      message: `评分${(scorePercentage * 100).toFixed(0)}分未达到通过标准，但结论状态为"通过"`,
      suggestion: '建议将结论状态更新为"不通过"或"需确认"'
    };
  }
  
  return null;
}

export function checkAllConsistencies(task: ReviewTask): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const noteScoreError = checkNoteScoreConsistency(task);
  if (noteScoreError) errors.push(noteScoreError);
  
  const scoreConclusionError = checkScoreConclusionConsistency(task);
  if (scoreConclusionError) errors.push(scoreConclusionError);
  
  return errors;
}

export function markScoreAsSynced(task: ReviewTask): ScoreSheet {
  return {
    ...task.scoreSheet,
    synchronizedWithNotes: true,
    updatedAt: new Date().toISOString()
  };
}

export function markConclusionAsSynced(task: ReviewTask): Conclusion | undefined {
  if (!task.conclusion) return undefined;
  return {
    ...task.conclusion,
    synchronizedWithScoreSheet: true,
    updatedAt: new Date().toISOString()
  };
}

export function onNoteUpdate(task: ReviewTask, note: ReviewNote): void {
  if (note.affectsScoreSheet) {
    task.scoreSheet.synchronizedWithNotes = false;
  }
  if (note.affectsConclusion && task.conclusion) {
    task.conclusion.synchronizedWithScoreSheet = false;
  }
}

export function onScoreUpdate(task: ReviewTask): void {
  task.scoreSheet.synchronizedWithNotes = true;
  if (task.conclusion) {
    task.conclusion.synchronizedWithScoreSheet = false;
  }
}

export function determineUsability(task: ReviewTask): 'direct_use' | 'needs_trainer_review' | 'rejected' {
  const consistencyErrors = checkAllConsistencies(task);
  if (consistencyErrors.length > 0) {
    return 'needs_trainer_review';
  }
  
  if (!task.conclusion) {
    return 'needs_trainer_review';
  }
  
  if (task.conclusion.status === 'fail') {
    return 'rejected';
  }
  
  if (task.conclusion.status === 'needs_confirmation') {
    return 'needs_trainer_review';
  }
  
  const scorePercentage = task.scoreSheet.totalScore / task.scoreSheet.maxTotalScore;
  if (scorePercentage >= 0.9 && task.annotations.every(a => a.type !== 'error')) {
    return 'direct_use';
  }
  
  if (scorePercentage >= 0.7 && task.conclusion.status === 'pass') {
    return 'direct_use';
  }
  
  return 'needs_trainer_review';
}
