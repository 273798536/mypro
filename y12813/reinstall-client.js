const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const clientDir = path.join(__dirname, 'client')
const nmDir = path.join(clientDir, 'node_modules')
const lockFile = path.join(clientDir, 'package-lock.json')

console.log('Cleaning up client directory...')
if (fs.existsSync(nmDir)) {
  fs.rmSync(nmDir, { recursive: true, force: true })
  console.log('  Removed node_modules')
}
if (fs.existsSync(lockFile)) {
  fs.rmSync(lockFile)
  console.log('  Removed package-lock.json')
}

console.log('Setting npm mirror...')
execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'inherit' })

console.log('Installing client dependencies...')
execSync('npm install vite@^5.4.10 @vitejs/plugin-react@^4.3.1 --save-dev', {
  cwd: clientDir, stdio: 'inherit', timeout: 300000
})
execSync('npm install react@^18.3.1 react-dom@^18.3.1 react-router-dom@^6.26.2 axios@^1.7.7 dayjs@^1.11.13 antd@^5.21.0 @ant-design/icons@^5.5.1 --save', {
  cwd: clientDir, stdio: 'inherit', timeout: 300000
})

console.log('✅ Client dependencies installed successfully!')
