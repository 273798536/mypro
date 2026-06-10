const { execSync } = require('child_process')
const path = require('path')

const clientDir = path.join(__dirname, 'client')
console.log('Fixing esbuild compatibility in:', clientDir)

try {
  execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'inherit' })
  execSync('npm install esbuild@0.21.5 --save-dev', {
    cwd: clientDir,
    stdio: 'inherit',
    timeout: 180000
  })
  console.log('esbuild install completed')
} catch (e) {
  console.error('Failed:', e.message)
  process.exit(1)
}
