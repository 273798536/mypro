const { CELL_TYPES } = require('./constants')

class Board {
  constructor(width = 20, height = 15) {
    this.width = width
    this.height = height
    this.grid = this.createEmptyGrid()
    this.exits = []
    this.equipments = []
  }

  createEmptyGrid() {
    const grid = []
    for (let y = 0; y < this.height; y++) {
      const row = []
      for (let x = 0; x < this.width; x++) {
        row.push({ type: CELL_TYPES.SEAT, audience: null })
      }
      grid.push(row)
    }
    return grid
  }

  setupStandardLayout() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].type = CELL_TYPES.SEAT
      }
    }

    for (let y = 0; y < this.height; y++) {
      this.grid[y][Math.floor(this.width / 2)].type = CELL_TYPES.AISLE
      this.grid[y][Math.floor(this.width / 4)].type = CELL_TYPES.AISLE
      this.grid[y][Math.floor(this.width * 3 / 4)].type = CELL_TYPES.AISLE
    }

    for (let x = 0; x < this.width; x++) {
      this.grid[Math.floor(this.height / 3)][x].type = CELL_TYPES.AISLE
      this.grid[Math.floor(this.height * 2 / 3)][x].type = CELL_TYPES.AISLE
    }

    for (let x = 0; x < this.width; x++) {
      this.grid[0][x].type = CELL_TYPES.STAGE
    }

    this.addExit(this.height - 1, 0)
    this.addExit(this.height - 1, this.width - 1)
    this.addExit(this.height - 1, Math.floor(this.width / 2))
    this.addExit(Math.floor(this.height / 2), 0)
    this.addExit(Math.floor(this.height / 2), this.width - 1)

    return this
  }

  addExit(y, x) {
    if (this.isValidPosition(y, x)) {
      this.grid[y][x].type = CELL_TYPES.EXIT
      this.exits.push({ y, x })
    }
    return this
  }

  addEquipment(y, x, equipmentType = 'default') {
    if (this.isValidPosition(y, x)) {
      this.grid[y][x].type = CELL_TYPES.EQUIPMENT
      this.equipments.push({ y, x, type: equipmentType })
    }
    return this
  }

  addWall(y, x) {
    if (this.isValidPosition(y, x)) {
      this.grid[y][x].type = CELL_TYPES.WALL
    }
    return this
  }

  isValidPosition(y, x) {
    return y >= 0 && y < this.height && x >= 0 && x < this.width
  }

  isPassable(y, x) {
    if (!this.isValidPosition(y, x)) return false
    const cellType = this.grid[y][x].type
    return cellType === CELL_TYPES.AISLE || 
           cellType === CELL_TYPES.EXIT ||
           cellType === CELL_TYPES.SEAT
  }

  getCell(y, x) {
    if (this.isValidPosition(y, x)) {
      return this.grid[y][x]
    }
    return null
  }

  getNeighbors(y, x) {
    const directions = [
      { dy: -1, dx: 0 },
      { dy: 1, dx: 0 },
      { dy: 0, dx: -1 },
      { dy: 0, dx: 1 }
    ]
    return directions
      .map(d => ({ y: y + d.dy, x: x + d.dx }))
      .filter(pos => this.isValidPosition(pos.y, pos.x))
  }

  getPassableNeighbors(y, x) {
    return this.getNeighbors(y, x).filter(pos => this.isPassable(pos.y, pos.x))
  }

  findPath(startY, startX, targetType = CELL_TYPES.EXIT) {
    const visited = new Set()
    const queue = [{ y: startY, x: startX, path: [] }]
    
    while (queue.length > 0) {
      const current = queue.shift()
      const key = `${current.y},${current.x}`
      
      if (visited.has(key)) continue
      visited.add(key)

      if (this.grid[current.y][current.x].type === targetType) {
        return [...current.path, { y: current.y, x: current.x }]
      }

      const neighbors = this.getPassableNeighbors(current.y, current.x)
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.y},${neighbor.x}`
        if (!visited.has(neighborKey)) {
          queue.push({
            y: neighbor.y,
            x: neighbor.x,
            path: [...current.path, { y: current.y, x: current.x }]
          })
        }
      }
    }
    
    return null
  }

  getExitDensity() {
    const densityMap = new Map()
    for (const exit of this.exits) {
      let count = 0
      const radius = 3
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = exit.y + dy
          const nx = exit.x + dx
          if (this.isValidPosition(ny, nx) && this.grid[ny][nx].audience) {
            count++
          }
        }
      }
      densityMap.set(`${exit.y},${exit.x}`, count)
    }
    return densityMap
  }

  print() {
    let output = ''
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x]
        if (cell.audience) {
          output += '👤'
        } else {
          switch (cell.type) {
            case CELL_TYPES.SEAT: output += '💺'; break
            case CELL_TYPES.AISLE: output += '⬜'; break
            case CELL_TYPES.EXIT: output += '🚪'; break
            case CELL_TYPES.STAGE: output += '🎭'; break
            case CELL_TYPES.EQUIPMENT: output += '📦'; break
            case CELL_TYPES.WALL: output += '🧱'; break
            default: output += '?'; break
          }
        }
      }
      output += '\n'
    }
    console.log(output)
  }
}

module.exports = Board
