import type { Track, RuleSet, ValidationResult, TrackDurationBreakdown, ValidationError } from '@/types';

export function calculateDuration(tracks: Track[], rules: RuleSet): ValidationResult {
  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order);

  let mainDuration = 0;
  let encoreDuration = 0;
  let transitionDuration = 0;
  const breakdown: TrackDurationBreakdown[] = [];

  sortedTracks.forEach((track, index) => {
    const version = track.versions.find(v => v.id === track.selectedVersionId) ?? track.versions[0];
    const duration = version ? version.duration : 0;

    const transition = track.transitionTime !== null && track.transitionTime !== undefined
      ? track.transitionTime
      : rules.defaultTransitionTime;

    if (track.isEncore) {
      encoreDuration += duration;
    } else {
      mainDuration += duration;
    }

    if (index < sortedTracks.length - 1) {
      transitionDuration += transition;
    }

    breakdown.push({
      trackId: track.id,
      trackName: track.name,
      versionName: version?.name || '未知版本',
      duration,
      transitionTime: transition,
      isEncore: track.isEncore
    });
  });

  return {
    totalDuration: mainDuration + encoreDuration + transitionDuration,
    mainDuration,
    encoreDuration,
    transitionDuration,
    errors: [],
    trackBreakdown: breakdown
  };
}

export function validateRules(
  result: ValidationResult,
  tracks: Track[],
  rules: RuleSet
): ValidationError[] {
  const errors: ValidationError[] = [];

  tracks.forEach(track => {
    const selected = track.versions.find(v => v.id === track.selectedVersionId);
    const defaultV = track.versions.find(v => v.isDefault);
    if (selected && defaultV && selected.id !== defaultV.id) {
      const diff = Math.abs(selected.duration - defaultV.duration) / defaultV.duration;
      if (diff > rules.versionErrorThreshold) {
        errors.push({
          id: `version-${track.id}`,
          type: 'VERSION_MISMATCH',
          severity: 'warning',
          trackId: track.id,
          message: `曲目「${track.name}」时长版本差异${(diff * 100).toFixed(1)}%`,
          details: {
            defaultDuration: defaultV.duration,
            selectedDuration: selected.duration,
            diffPercent: diff
          },
          suggestion: `建议确认使用默认版本「${defaultV.name}」(${defaultV.duration}秒)，或记录当前版本「${selected.name}」(${selected.duration}秒)的使用原因`
        });
      }
    }
  });

  const encoreTracks = tracks.filter(t => t.isEncore);
  if (encoreTracks.length > rules.encore.maxEncoreTracks) {
    errors.push({
      id: 'encore-overlimit',
      type: 'ENCORE_OVERLIMIT',
      severity: 'error',
      message: `返场超限：${encoreTracks.length}首/${rules.encore.maxEncoreTracks}首`,
      details: {
        trackCount: encoreTracks.length,
        maxTracks: rules.encore.maxEncoreTracks,
        duration: result.encoreDuration,
        maxDuration: rules.encore.maxEncoreDuration
      },
      suggestion: '减少返场曲目数量或时长'
    });
  }

  if (result.encoreDuration > rules.encore.maxEncoreDuration) {
    errors.push({
      id: 'encore-duration-overlimit',
      type: 'ENCORE_OVERLIMIT',
      severity: 'error',
      message: `返场时长超限：${result.encoreDuration}秒/${rules.encore.maxEncoreDuration}秒`,
      details: {
        trackCount: encoreTracks.length,
        maxTracks: rules.encore.maxEncoreTracks,
        duration: result.encoreDuration,
        maxDuration: rules.encore.maxEncoreDuration
      },
      suggestion: '减少返场曲目数量或时长'
    });
  }

  const sorted = [...tracks].sort((a, b) => a.order - b.order);
  const missingTransitions: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].transitionTime === null || sorted[i].transitionTime === undefined) {
      missingTransitions.push(sorted[i].id);
    }
  }

  if (missingTransitions.length > 0) {
    errors.push({
      id: 'transition-missing',
      type: 'TRANSITION_MISSING',
      severity: 'warning',
      message: `${missingTransitions.length}处换场时间未设置`,
      details: { missingCount: missingTransitions.length, trackIds: missingTransitions },
      suggestion: '为每首曲目设置换场时间，或使用默认换场时间'
    });
  }

  return errors;
}

export function calculateAndValidate(tracks: Track[], rules: RuleSet): ValidationResult {
  const result = calculateDuration(tracks, rules);
  const errors = validateRules(result, tracks, rules);
  return { ...result, errors };
}
