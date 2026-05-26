export class FEMSolver {
  constructor() {
    this.elasticModulus = 30e9
    this.density = 2500
    this.poissonRatio = 0.2
    
    this.nodes = []
    this.supports = []
    this.loads = []
    this.section = null
    
    this.K = null
    this.M = null
    this.F = null
    
    this.reducedK = null
    this.reducedM = null
    this.reducedF = null
    
    this.freeDOFs = []
    this.fixedDOFs = []
    
    this.eigenvalues = []
    this.eigenvectors = []
    this.frequencies = []
    this.modes = []
    
    this.staticDeformation = null
    
    this.numDOFs = 0
  }

  setElasticModulus(E) { this.elasticModulus = E }
  setDensity(rho) { this.density = rho }
  setPoissonRatio(nu) { this.poissonRatio = nu }

  setGeometry(nodes, section) {
    this.nodes = nodes.map(n => ({ ...n }))
    this.section = { ...section }
    this.numDOFs = this.nodes.length * 2
  }

  setSupports(supports) {
    this.supports = supports.map(s => ({ ...s }))
  }

  setLoads(loads) {
    this.loads = loads.map(l => ({ ...l }))
  }

  solve() {
    try {
      if (this.nodes.length < 2) {
        return { success: false, error: '至少需要2个节点' }
      }
      
      this.assembleMatrices()
      this.applyBoundaryConditions()
      
      if (this.freeDOFs.length === 0) {
        return { success: false, error: '没有有效的自由度，请检查支点设置' }
      }
      
      this.solveStatic()
      this.solveEigenvalue()
      
      this.modes = this.reconstructModes()
      
      return {
        success: true,
        modes: this.modes,
        frequencies: this.frequencies,
        staticDeformation: this.staticDeformation
      }
    } catch (e) {
      console.error('求解失败:', e)
      return { success: false, error: e.message }
    }
  }

  assembleMatrices() {
    const n = this.numDOFs
    this.K = this.zeros(n, n)
    this.M = this.zeros(n, n)
    this.F = this.zeros(n, 1)
    
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const L = Math.abs(this.nodes[i + 1].x - this.nodes[i].x)
      if (L < 1e-10) continue
      
      const kElem = this.beamStiffness(this.elasticModulus, this.section.inertia, L)
      const mElem = this.beamMass(this.density, this.section.area, L)
      
      const dofs = [i * 2, i * 2 + 1, (i + 1) * 2, (i + 1) * 2 + 1]
      
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          this.K[dofs[a]][dofs[b]] += kElem[a][b]
          this.M[dofs[a]][dofs[b]] += mElem[a][b]
        }
      }
    }
    
    for (const load of this.loads) {
      const idx = load.index
      if (idx >= 0 && idx < this.nodes.length) {
        this.F[idx * 2 + 1][0] += load.magnitude
      }
    }
  }

  beamStiffness(E, I, L) {
    const k = E * I / (L * L * L)
    return [
      [12, 6 * L, -12, 6 * L],
      [6 * L, 4 * L * L, -6 * L, 2 * L * L],
      [-12, -6 * L, 12, -6 * L],
      [6 * L, 2 * L * L, -6 * L, 4 * L * L]
    ].map(r => r.map(v => v * k))
  }

  beamMass(rho, A, L) {
    const m = rho * A * L / 420
    return [
      [156, 22 * L, 54, -13 * L],
      [22 * L, 4 * L * L, 13 * L, -3 * L * L],
      [54, 13 * L, 156, -22 * L],
      [-13 * L, -3 * L * L, -22 * L, 4 * L * L]
    ].map(r => r.map(v => v * m))
  }

  applyBoundaryConditions() {
    this.fixedDOFs = []
    
    for (const s of this.supports) {
      if (s.index < 0 || s.index >= this.nodes.length) continue
      const base = s.index * 2
      
      if (s.type === 'pin') {
        this.fixedDOFs.push(base + 1)
        this.fixedDOFs.push(base)
      } else if (s.type === 'roller') {
        this.fixedDOFs.push(base + 1)
      } else if (s.type === 'fixed') {
        this.fixedDOFs.push(base, base + 1)
      }
    }
    
    this.fixedDOFs = [...new Set(this.fixedDOFs)]
    
    this.freeDOFs = []
    for (let i = 0; i < this.numDOFs; i++) {
      if (!this.fixedDOFs.includes(i)) this.freeDOFs.push(i)
    }
    
    const n = this.freeDOFs.length
    this.reducedK = this.zeros(n, n)
    this.reducedM = this.zeros(n, n)
    this.reducedF = this.zeros(n, 1)
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        this.reducedK[i][j] = this.K[this.freeDOFs[i]][this.freeDOFs[j]]
        this.reducedM[i][j] = this.M[this.freeDOFs[i]][this.freeDOFs[j]]
      }
      this.reducedF[i][0] = this.F[this.freeDOFs[i]][0]
    }
    
    const regularization = 1e-8
    for (let i = 0; i < n; i++) {
      this.reducedK[i][i] += regularization
    }
  }

  solveStatic() {
    const n = this.freeDOFs.length
    if (n === 0) {
      this.staticDeformation = this.zeros(this.numDOFs, 1)
      return
    }
    
    try {
      const U = this.solveLinear(this.reducedK, this.reducedF)
      
      this.staticDeformation = this.zeros(this.numDOFs, 1)
      for (let i = 0; i < n; i++) {
        this.staticDeformation[this.freeDOFs[i]][0] = U[i][0]
      }
    } catch (e) {
      console.error('静力求解失败:', e)
      this.staticDeformation = this.zeros(this.numDOFs, 1)
    }
  }

  solveEigenvalue() {
    const n = this.freeDOFs.length
    if (n === 0) {
      this.eigenvalues = []
      this.eigenvectors = []
      this.frequencies = []
      return
    }
    
    try {
      const numModes = Math.min(10, n)
      const result = this.powerIterationModes(this.reducedK, this.reducedM, numModes)
      
      this.eigenvalues = result.values
      this.eigenvectors = result.vectors
      
      const freqs = []
      for (const lambda of this.eigenvalues) {
        if (lambda > 1e-12) freqs.push(Math.sqrt(lambda) / (2 * Math.PI))
      }
      this.frequencies = freqs.sort((a, b) => a - b)
    } catch (e) {
      console.error('特征值求解失败:', e)
      this.eigenvalues = []
      this.eigenvectors = []
      this.frequencies = []
    }
  }

  powerIterationModes(K, M, numModes) {
    const n = K.length
    const values = []
    const vectors = []
    
    let Kremaining = this.copy(K)
    let Mremaining = this.copy(M)
    
    for (let mode = 0; mode < numModes; mode++) {
      let v = this.randomVec(n)
      let lambda = 0
      
      for (let iter = 0; iter < 200; iter++) {
        v = this.normalize(v)
        
        const Mv = this.matVec(Mremaining, v)
        const Kv = this.matVec(Kremaining, v)
        
        const num = this.dot(v, Kv)
        const den = this.dot(v, Mv)
        
        if (Math.abs(den) < 1e-20) break
        const newLambda = num / den
        
        if (Math.abs(newLambda - lambda) < 1e-12) {
          lambda = newLambda
          break
        }
        lambda = newLambda
        
        const KinvMv = this.solveLinear(Kremaining, this.toColumn(Mv))
        v = this.normalize(this.toVector(KinvMv))
      }
      
      if (lambda > 1e-12 && isFinite(lambda)) {
        values.push(lambda)
        vectors.push(v)
        
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            Kremaining[i][j] -= lambda * M[i][j] * v[i] * v[j]
          }
        }
      }
    }
    
    return { values, vectors }
  }

  reconstructModes() {
    if (!this.eigenvectors || this.eigenvectors.length === 0) return []
    
    const modes = []
    
    for (const reducedMode of this.eigenvectors) {
      const fullMode = new Array(this.numDOFs).fill(0)
      
      for (let i = 0; i < this.freeDOFs.length && i < reducedMode.length; i++) {
        fullMode[this.freeDOFs[i]] = reducedMode[i]
      }
      
      let maxDisp = 0
      for (let i = 0; i < this.nodes.length; i++) {
        maxDisp = Math.max(maxDisp, Math.abs(fullMode[i * 2 + 1] || 0))
      }
      
      if (maxDisp > 1e-15) {
        for (let i = 0; i < fullMode.length; i++) {
          fullMode[i] /= maxDisp
        }
      }
      
      modes.push(fullMode)
    }
    
    return modes
  }

  solveLinear(A, b) {
    const n = A.length
    
    const aug = this.zeros(n, n + 1)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) aug[i][j] = A[i][j]
      aug[i][n] = b[i][0]
    }
    
    for (let col = 0; col < n; col++) {
      let maxRow = col
      let maxVal = Math.abs(aug[col][col])
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col])
          maxRow = row
        }
      }
      
      if (maxVal < 1e-15) throw new Error('矩阵奇异')
      
      if (maxRow !== col) {
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
      }
      
      const pivot = aug[col][col]
      for (let j = col; j <= n; j++) aug[col][j] /= pivot
      
      for (let row = 0; row < n; row++) {
        if (row !== col && aug[row][col] !== 0) {
          const factor = aug[row][col]
          for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j]
        }
      }
    }
    
    const result = this.zeros(n, 1)
    for (let i = 0; i < n; i++) result[i][0] = aug[i][n]
    return result
  }

  zeros(rows, cols) {
    return Array.from({ length: rows }, () => new Array(cols).fill(0))
  }

  copy(A) {
    return A.map(r => [...r])
  }

  matVec(A, v) {
    const n = A.length
    const r = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) r[i] += A[i][j] * v[j]
    }
    return r
  }

  dot(a, b) {
    let s = 0
    for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i]
    return s
  }

  normalize(v) {
    const norm = Math.sqrt(this.dot(v, v))
    if (norm < 1e-20) return v
    return v.map(x => x / norm)
  }

  randomVec(n) {
    const v = new Array(n)
    for (let i = 0; i < n; i++) v[i] = Math.random()
    return this.normalize(v)
  }

  toColumn(v) {
    return v.map(x => [x])
  }

  toVector(m) {
    return m.map(r => r[0])
  }

  getMaxDisplacement() {
    if (!this.staticDeformation) return 0
    let max = 0
    for (let i = 0; i < this.staticDeformation.length; i++) {
      max = Math.max(max, Math.abs(this.staticDeformation[i][0] || 0))
    }
    return max
  }

  getMaxMoment() {
    let maxM = 0
    
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const L = Math.abs(this.nodes[i + 1].x - this.nodes[i].x)
      if (L < 1e-10) continue
      
      const u = [
        this.staticDeformation ? this.staticDeformation[i * 2][0] : 0,
        this.staticDeformation ? this.staticDeformation[i * 2 + 1][0] : 0,
        this.staticDeformation ? this.staticDeformation[(i + 1) * 2][0] : 0,
        this.staticDeformation ? this.staticDeformation[(i + 1) * 2 + 1][0] : 0
      ]
      
      const k = this.beamStiffness(this.elasticModulus, this.section.inertia, L)
      
      let m1 = 0, m2 = 0
      for (let j = 0; j < 4; j++) {
        m1 += k[0][j] * u[j]
        m2 += k[2][j] * u[j]
      }
      
      maxM = Math.max(maxM, Math.abs(m1), Math.abs(m2))
    }
    
    return maxM
  }

  getMaxStress(beamHeight) {
    const M = this.getMaxMoment()
    const y = beamHeight / 2
    return Math.abs(M * y / (this.section.inertia || 1e-10))
  }

  getState() {
    return {
      elasticModulus: this.elasticModulus,
      density: this.density,
      poissonRatio: this.poissonRatio
    }
  }

  restoreState(state) {
    this.elasticModulus = state.elasticModulus
    this.density = state.density
    this.poissonRatio = state.poissonRatio
  }
}
