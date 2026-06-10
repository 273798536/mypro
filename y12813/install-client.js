const { execSync } = require('child_process')
const path = require('path')

const clientDir = path.join(__dirname, 'client')
console.log('Installing client dependencies in:', clientDir)
console.log('Using npm mirror: https://registry.npmmirror.com')

try {
  execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'inherit' })
  const result = execSync('npm install', {
    cwd: clientDir,
    stdio: 'inherit',
    timeout: 300000
  })
  console.log('npm install completed successfully')
} catch (e) {
  console.error('npm install failed:', e.message)
  process.exit(1)
}
