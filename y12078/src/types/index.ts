export type Laterality = 'left' | 'right' | 'bilateral' | 'universal'

export interface PatientCase {
  id: string
  name: string
  patientId: string
  laterality: Laterality
  surgeryDate: string
}

export interface Implant {
  id: string
  modelNumber: string
  name: string
  size: string
  length_mm: number
  width_mm: number
  thickness_mm: number
  laterality: Laterality
  position: [number, number, number]
  rotation: [number, number, number]
  material: string
  manufacturer: string
  source: string
}

export interface CTAnnotation {
  id: string
  ctScanId: string
  label: string
  position: [number, number, number]
  type: 'landmark' | 'tumor' | 'nerve' | 'vessel' | 'forbidden_zone'
  radius_mm: number
  description: string
  source: string
}

export interface DoctorNote {
  id: string
  author: string
  timestamp: string
  content: string
  relatedImplantId: string | null
  relatedAnnotationId: string | null
  source: string
}

export type IssueType = 'size_out_of_bound' | 'side_mismatch' | 'forbidden_zone_collision'
export type IssueSeverity = 'warning' | 'critical'

export interface CollisionIssue {
  id: string
  type: IssueType
  severity: IssueSeverity
  implantId: string
  annotationId: string | null
  description: string
  explanation: string
}

export interface SavedView {
  id: string
  name: string
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  createdAt: string
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export type RenderMode = 'solid' | 'wireframe' | 'xray'

export interface FilterState {
  sizeRange: [number, number]
  laterality: 'all' | 'left' | 'right'
  issueTypes: IssueType[]
}
