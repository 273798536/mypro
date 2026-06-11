import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ROLLUP_DIR = join(ROOT, 'node_modules', 'rollup');
const WASM_PKG_NAME = '@rollup/wasm-node';
const CACHE_DIR = join(ROOT, 'node_modules', '.cache', 'rollup-wasm');

async function main() {
  if (!existsSync(ROLLUP_DIR)) {
    console.log('[patch-rollup] rollup not found, skip patching');
    return;
  }

  let version;
  try {
    const wasmPkgJson = join(ROOT, 'node_modules', WASM_PKG_NAME, 'package.json');
    version = JSON.parse(readFileSync(wasmPkgJson, 'utf-8')).version;
  } catch (_) {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    version = (pkg.devDependencies?.[WASM_PKG_NAME] || '4.61.1').replace(/[~^]/, '');
  }

  const extractedDir = join(CACHE_DIR, `v${version}`);

  if (!existsSync(join(extractedDir, 'dist', 'native.js'))) {
    console.log(`[patch-rollup] caching @rollup/wasm-node@${version}...`);
    shell('mkdir', ['-p', CACHE_DIR]);

    const existingTgz = findTgz(CACHE_DIR, version);
    if (!existingTgz) {
      const tried = [];
      const npmCli = join(ROOT, '.npm-pkg', 'bin', 'npm-cli.js');
      if (existsSync(npmCli)) {
        tried.push('local');
        const r = spawnSync(process.execPath, [npmCli, 'pack', `${WASM_PKG_NAME}@${version}`], {
          cwd: CACHE_DIR,
          stdio: 'inherit',
        });
        if (r.status === 0) {
          // continue
        }
      }
      if (!findTgz(CACHE_DIR, version)) {
        tried.push('global');
        const r2 = spawnSync('npm', ['pack', `${WASM_PKG_NAME}@${version}`], {
          cwd: CACHE_DIR,
          stdio: 'inherit',
        });
        if (r2.status !== 0) {
          throw new Error(`npm pack ${WASM_PKG_NAME}@${version} failed (tried: ${tried.join(',')})`);
        }
      }
    }

    const tgz = findTgz(CACHE_DIR, version);
    if (!tgz) {
      throw new Error(`tgz not found in ${CACHE_DIR} after pack`);
    }

    shell('mkdir', ['-p', extractedDir]);
    shell('tar', ['-xzf', tgz, '-C', extractedDir, '--strip-components=1']);
  }

  console.log('[patch-rollup] replacing node_modules/rollup with wasm build...');
  rmSync(ROLLUP_DIR, { recursive: true, force: true });
  shell('cp', ['-R', extractedDir + '/', ROLLUP_DIR]);

  console.log('[patch-rollup] done ✓');
}

function shell(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
  }
}

function findTgz(dir, ver) {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
  return entries
    .map((f) => join(dir, f))
    .find((f) => f.includes(ver)) || entries
    .map((f) => join(dir, f))[0] || null;
}

main().catch((e) => {
  console.error('[patch-rollup] error:', e.message || e);
  process.exit(1);
});
