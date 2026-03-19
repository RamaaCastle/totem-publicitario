#!/usr/bin/env node
/**
 * Windows-compatible build script for the Electron player.
 * Replaces the `unset ELECTRON_RUN_AS_NODE` in package.json build script.
 * Usage: node scripts/build-win.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const playerDir = path.join(__dirname, '..');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_PATH = path.join(playerDir, 'node_modules');

const evBin = path.join(playerDir, 'node_modules', '.bin', 'electron-vite');
const builderBin = path.join(playerDir, 'node_modules', '.bin', 'electron-builder');

console.log('▶ Building with electron-vite...');
const buildResult = spawnSync(evBin, ['build'], {
  stdio: 'inherit',
  env,
  cwd: playerDir,
  shell: true,
});

if (buildResult.status !== 0) {
  console.error('✗ electron-vite build failed');
  process.exit(buildResult.status || 1);
}

console.log('▶ Packaging with electron-builder...');
const packageResult = spawnSync(builderBin, ['--win'], {
  stdio: 'inherit',
  env,
  cwd: playerDir,
  shell: true,
});

if (packageResult.status !== 0) {
  console.error('✗ electron-builder failed');
  process.exit(packageResult.status || 1);
}

console.log('✓ Build complete! Installer is in packages/player/release/');
