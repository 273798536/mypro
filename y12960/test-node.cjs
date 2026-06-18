console.log('=== Node.js Test ===');
console.log('Process ID:', process.pid);
console.log('Node version:', process.version);
console.log('CWD:', process.cwd());
console.log('Argv:', process.argv);

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

setTimeout(() => {
  console.log('Timeout callback executed');
  process.exit(0);
}, 2000);

console.log('Test script loaded');
