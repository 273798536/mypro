import Dexie, { Table } from 'dexie'
import {
  FittingSession,
  DataSource,
  FittingParameter,
  Alert,
  CorrectionTrace,
} from '../shared/types'

export class BatteryFittingDB extends Dexie {
  sessions!: Table<FittingSession, string>
  dataSources!: Table<DataSource, string>
  parameters!: Table<FittingParameter, string>
  alerts!: Table<Alert, string>
  corrections!: Table<CorrectionTrace, string>

  constructor() {
    super('BatteryFittingDB')
    this.version(1).stores({
      sessions: 'id, createdAt, updatedAt, status',
      dataSources: 'id, sessionId, type, timestamp',
      parameters: 'id, sessionId, name, iteration',
      alerts: 'id, sessionId, category, severity, timestamp, resolved',
      corrections: 'id, sessionId, field, timestamp',
    })
  }

  async saveSession(
    session: FittingSession,
    dataSources?: DataSource[],
    parameters?: FittingParameter[],
    alerts?: Alert[],
    corrections?: CorrectionTrace[]
  ): Promise<string> {
    const now = Date.now()
    const sessionToSave = {
      ...session,
      updatedAt: now,
    }

    await this.transaction(
      'rw',
      [this.sessions, this.dataSources, this.parameters, this.alerts, this.corrections],
      async () => {
        await this.sessions.put(sessionToSave)

        if (dataSources && dataSources.length > 0) {
          await this.dataSources.bulkPut(dataSources)
        }
        if (parameters && parameters.length > 0) {
          await this.parameters.bulkPut(parameters)
        }
        if (alerts && alerts.length > 0) {
          await this.alerts.bulkPut(alerts)
        }
        if (corrections && corrections.length > 0) {
          await this.corrections.bulkPut(corrections)
        }
      }
    )

    return sessionToSave.id
  }

  async getSessionWithRelations(sessionId: string): Promise<{
    session: FittingSession | undefined
    dataSources: DataSource[]
    parameters: FittingParameter[]
    alerts: Alert[]
    corrections: CorrectionTrace[]
  }> {
    const session = await this.sessions.get(sessionId)
    const [dataSources, parameters, alerts, corrections] = await Promise.all([
      this.dataSources.where('sessionId').equals(sessionId).toArray(),
      this.parameters.where('sessionId').equals(sessionId).toArray(),
      this.alerts.where('sessionId').equals(sessionId).toArray(),
      this.corrections.where('sessionId').equals(sessionId).toArray(),
    ])

    return { session, dataSources, parameters, alerts, corrections }
  }

  async getAllSessions(): Promise<FittingSession[]> {
    return this.sessions.orderBy('createdAt').reverse().toArray()
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.transaction(
      'rw',
      [this.sessions, this.dataSources, this.parameters, this.alerts, this.corrections],
      async () => {
        await this.sessions.delete(sessionId)
        await this.dataSources.where('sessionId').equals(sessionId).delete()
        await this.parameters.where('sessionId').equals(sessionId).delete()
        await this.alerts.where('sessionId').equals(sessionId).delete()
        await this.corrections.where('sessionId').equals(sessionId).delete()
      }
    )
  }
}

export const db = new BatteryFittingDB()
