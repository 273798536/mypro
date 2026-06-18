import process from 'process';

console.log('PID:', process.pid);
console.log('CWD:', process.cwd());
console.log('Node version:', process.version);

setTimeout(() => {
  console.log('Timeout hit - server would still be running');
}, 10000);

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  console.error(err.stack);
});
