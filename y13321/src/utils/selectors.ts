import type { FilterCriteria, Sample, SummaryCounts } from '@/data/types'
import { detectDrift, getEvent } from './drift'

export function filterSamples(samples: Sample[], criteria: FilterCriteria): Sample[] {
  return samples.filter((s) => {
    if (criteria.source !== 'all' && s.source !== criteria.source) return false
    if (criteria.changeStatus !== 'all' && s.changeStatus !== criteria.changeStatus) return false
    if (criteria.processingStatus !== 'all' && s.processingStatus !== criteria.processingStatus) return false
    if (criteria.gradeLevel !== 'all' && s.gradeLevel !== criteria.gradeLevel) return false
    if (criteria.band !== 'all') {
      const newEvent = getEvent(s, 'new')
      if (!newEvent || newEvent.band !== criteria.band) return false
    }
    return true
  })
}

export function summarize(samples: Sample[]): SummaryCounts {
  let change = 0
  let consistent = 0
  let drift = 0
  let pending = 0
  for (const s of samples) {
    if (s.processingStatus === '待处理') {
      pending++
      continue
    }
    if (s.changeStatus === '漂移待确认' || detectDrift(s).detected) {
      drift++
    } else if (s.changeStatus === '改判') {
      change++
    } else {
      consistent++
    }
  }
  return { total: samples.length, change, consistent, drift, pending }
}

export function uniqueSources(samples: Sample[]): string[] {
  return Array.from(new Set(samples.map((s) => s.source)))
}

export function uniqueGrades(samples: Sample[]): string[] {
  return Array.from(new Set(samples.map((s) => s.gradeLevel)))
}
