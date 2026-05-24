interface Lock {
  receiptId: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
}

export class LockService {
  private locks: Map<string, Lock> = new Map()
  private readonly DEFAULT_TIMEOUT = 30000

  acquireLock(receiptId: string, operatorId: string, timeout: number = this.DEFAULT_TIMEOUT): boolean {
    const existingLock = this.locks.get(receiptId)
    
    if (existingLock) {
      if (existingLock.expiresAt > new Date()) {
        return false
      }
      this.locks.delete(receiptId)
    }

    const now = new Date()
    this.locks.set(receiptId, {
      receiptId,
      lockedBy: operatorId,
      lockedAt: now,
      expiresAt: new Date(now.getTime() + timeout)
    })

    return true
  }

  releaseLock(receiptId: string, operatorId: string): boolean {
    const lock = this.locks.get(receiptId)
    
    if (!lock) return true
    
    if (lock.lockedBy !== operatorId) {
      return false
    }

    this.locks.delete(receiptId)
    return true
  }

  isLocked(receiptId: string): boolean {
    const lock = this.locks.get(receiptId)
    if (!lock) return false
    
    if (lock.expiresAt <= new Date()) {
      this.locks.delete(receiptId)
      return false
    }
    
    return true
  }

  getLockInfo(receiptId: string): Lock | null {
    const lock = this.locks.get(receiptId)
    if (!lock) return null
    
    if (lock.expiresAt <= new Date()) {
      this.locks.delete(receiptId)
      return null
    }
    
    return lock
  }

  cleanupExpiredLocks(): void {
    const now = new Date()
    for (const [receiptId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(receiptId)
      }
    }
  }
}

export const lockService = new LockService()

setInterval(() => {
  lockService.cleanupExpiredLocks()
}, 60000)
