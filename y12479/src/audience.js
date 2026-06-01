const { AUDIENCE_STATE, CELL_TYPES } = require('./constants')

class Audience {
  constructor(id, startY, startX, priority = 'normal') {
    this.id = id
    this.y = startY
    this.x = startX
    this.state = AUDIENCE_STATE.WAITING
    this.priority = priority
    this.path = []
    this.pathIndex = 0
    this.exitTime = null
    this.stuckTime = 0
    this.moveSpeed = priority === 'special' ? 0.5 : 1
    this.trace = []
  }

  setPath(path) {
    this.path = path
    this.pathIndex = 0
  }

  move(board, timeStep) {
    if (this.state === AUDIENCE_STATE.EXITED || this.state === AUDIENCE_STATE.STUCK) {
      return false
    }

    this.trace.push({ y: this.y, x: this.x, time: timeStep })

    if (this.path.length === 0) {
      const path = board.findPath(this.y, this.x, CELL_TYPES.EXIT)
      if (path && path.length > 1) {
        this.path = path
        this.pathIndex = 1
      } else {
        this.stuckTime++
        if (this.stuckTime > 5) {
          this.state = AUDIENCE_STATE.STUCK
        }
        return false
      }
    }

    if (this.pathIndex < this.path.length) {
      const nextPos = this.path[this.pathIndex]
      const nextCell = board.getCell(nextPos.y, nextPos.x)
      
      if (nextCell && !nextCell.audience) {
        const currentCell = board.getCell(this.y, this.x)
        if (currentCell) {
          currentCell.audience = null
        }

        this.y = nextPos.y
        this.x = nextPos.x
        nextCell.audience = this
        this.pathIndex++
        this.state = AUDIENCE_STATE.MOVING

        if (nextCell.type === CELL_TYPES.EXIT) {
          this.state = AUDIENCE_STATE.EXITED
          this.exitTime = timeStep
          this.trace.push({ y: nextPos.y, x: nextPos.x, time: timeStep })
          nextCell.audience = null
          return true
        }
        return true
      } else {
        this.stuckTime++
        if (this.stuckTime > 10) {
          this.findAlternativePath(board)
        }
      }
    }
    return false
  }

  findAlternativePath(board) {
    this.stuckTime = 0
    const newPath = board.findPath(this.y, this.x, CELL_TYPES.EXIT)
    if (newPath && newPath.length > 1) {
      this.path = newPath
      this.pathIndex = 1
    }
  }

  reset() {
    this.state = AUDIENCE_STATE.WAITING
    this.path = []
    this.pathIndex = 0
    this.exitTime = null
    this.stuckTime = 0
    this.trace = []
  }
}

module.exports = Audience
