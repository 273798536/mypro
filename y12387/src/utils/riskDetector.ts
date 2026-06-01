import { Sample, Track, License, RiskAlert } from '@/types';
import { isExpired, isExpiringSoon } from './dateUtils';

export const detectRisks = (
  samples: Sample[],
  tracks: Track[],
  licenses: License[]
): RiskAlert[] => {
  const alerts: RiskAlert[] = [];

  licenses.forEach((license) => {
    if (isExpired(license.endDate)) {
      alerts.push({
        id: 'risk_exp_' + license.id,
        type: 'expired',
        severity: 'high',
        message: `授权 "${license.name}" 已过期，影响曲目：${license.trackIds
          .map((tid) => tracks.find((t) => t.id === tid)?.name)
          .join(', ')}`,
        relatedObjectId: license.id,
        relatedObjectType: 'license',
      });
    } else if (isExpiringSoon(license.endDate)) {
      alerts.push({
        id: 'risk_expsoon_' + license.id,
        type: 'expired',
        severity: 'medium',
        message: `授权 "${license.name}" 即将到期，请及时续签`,
        relatedObjectId: license.id,
        relatedObjectType: 'license',
      });
    }
  });

  const sampleNames = new Map<string, string[]>();
  samples.forEach((sample) => {
    if (!sampleNames.has(sample.name)) {
      sampleNames.set(sample.name, []);
    }
    sampleNames.get(sample.name)!.push(sample.id);
  });

  sampleNames.forEach((ids, name) => {
    if (ids.length > 1) {
      alerts.push({
        id: 'risk_dup_' + name,
        type: 'duplicate',
        severity: 'medium',
        message: `素材名称冲突："${name}" 被 ${ids.length} 个不同素材使用 (IDs: ${ids.join(', ')})`,
        relatedObjectId: ids[0],
        relatedObjectType: 'sample',
      });
    }
  });

  tracks.forEach((track) => {
    const hasLicense = licenses.some((l) => l.trackIds.includes(track.id));
    if (!hasLicense) {
      alerts.push({
        id: 'risk_miss_' + track.id,
        type: 'missing_license',
        severity: 'high',
        message: `曲目 "${track.name}" 未关联任何授权报告`,
        relatedObjectId: track.id,
        relatedObjectType: 'track',
      });
    }
  });

  return alerts;
};

export const getRiskCountByType = (alerts: RiskAlert[]) => {
  return {
    expired: alerts.filter((a) => a.type === 'expired').length,
    duplicate: alerts.filter((a) => a.type === 'duplicate').length,
    missingLicense: alerts.filter((a) => a.type === 'missing_license').length,
  };
};
