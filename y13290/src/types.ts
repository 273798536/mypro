export interface Entry {
  id: number
  name: string
  latitude: number
  longitude: number
  opinion: string
  source: string
  group_id: number | null
  created_at: string
  updated_at: string
}

export interface MergeGroup {
  id: number
  merged_name: string
  merged_latitude: number
  merged_longitude: number
  remark: string
  created_at: string
  updated_at: string
  entries: Entry[]
}

export interface EntryInput {
  name: string
  latitude: number
  longitude: number
  opinion: string
  source: string
}
