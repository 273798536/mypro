const initDatabase = require('./init')

let dbInstance = null
let initPromise = null

async function getDb() {
  if (dbInstance) return dbInstance
  if (!initPromise) {
    initPromise = initDatabase().then(db => { dbInstance = db; return db })
  }
  return initPromise
}

module.exports = { getDb }
