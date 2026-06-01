export type Vec3 = [number, number, number]

export type CorridorNodeType = 'pipe' | 'junction' | 'valve' | 'elbow'

export interface CorridorNode {
  id: string
  position: Vec3
  type: CorridorNodeType
  label?: string
}

export interface CorridorConnection {
  id: string
  from: string
  to: string
  path: Vec3[]
}

export interface CorridorModel {
  id: string
  version: string
  name: string
  nodes: CorridorNode[]
  connections: CorridorConnection[]
  remark: string
  createdAt: string
  updatedAt: string
  workOrderId?: string
}
