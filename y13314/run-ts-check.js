import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

try {
  const result = execSync('npm run check', {
    cwd: '/Users/mac/pro/solo/workspaces/y13314',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  writeFileSync('/tmp/ts-check-output.txt', result);
  console.log('SUCCESS: No TypeScript errors found.');
  console.log(result);
} catch (error) {
  const output = error.stdout || '';
  const stderr = error.stderr || '';
  const fullOutput = output + '\n' + stderr;
  writeFileSync('/tmp/ts-check-output.txt', fullOutput);
  console.log('TypeScript check completed with output:');
  console.log(fullOutput);
  console.log('Exit code:', error.status || 1);
}
