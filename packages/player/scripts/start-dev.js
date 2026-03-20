#!/usr/bin/env node
// Starts electron-vite dev with correct environment.
// Needed because Claude Code sets ELECTRON_RUN_AS_NODE=1 which breaks Electron.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const playerDir = path.join(__dirname, '..');

// Get electron binary path (works even with ELECTRON_RUN_AS_NODE=1)
function getElectronPath() {
  const electronDir = path.join(playerDir, 'node_modules', 'electron');
  const pathFile = path.join(electronDir, 'path.txt');
  if (fs.existsSync(pathFile)) {
    return path.join(electronDir, 'dist', fs.readFileSync(pathFile, 'utf-8').trim());
  }
  // Resolve real path through symlink
  const realDir = fs.realpathSync(electronDir);
  const realPathFile = path.join(realDir, 'path.txt');
  if (fs.existsSync(realPathFile)) {
    return path.join(realDir, 'dist', fs.readFileSync(realPathFile, 'utf-8').trim());
  }
  throw new Error('Electron binary not found. Run: cd node_modules/electron && node install.js');
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_PATH = path.join(playerDir, 'node_modules');

try {
  env.ELECTRON_EXEC_PATH = getElectronPath();
} catch (e) {
  console.warn('Warning:', e.message);
}

// Find electron-vite bin directly
const evBin = path.join(playerDir, 'node_modules', '.bin', 'electron-vite');

const result = spawnSync(evBin, ['dev'], {
  stdio: 'inherit',
  env,
  cwd: playerDir,
  shell: process.platform === 'win32',
});
process.exit(result.status || 0);
