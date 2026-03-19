#!/usr/bin/env node
/**
 * Launches a second Electron player instance that reuses the already-running
 * Vite dev server (started by start-dev-totem.js or start-dev.js).
 *
 * Usage:  node scripts/start-second-player.js --profile=pedraza
 *         node scripts/start-second-player.js --profile=magna
 *
 * The renderer URL defaults to http://localhost:5173 (electron-vite default).
 * If electron-vite chose a different port, pass: --renderer-url=http://localhost:5174
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const playerDir = path.join(__dirname, '..');

// Parse args
const profileArg = process.argv.find(a => a.startsWith('--profile=')) || '--profile=second';
const rendererUrlArg = process.argv.find(a => a.startsWith('--renderer-url='));
const rendererUrl = rendererUrlArg ? rendererUrlArg.split('=').slice(1).join('=') : 'http://localhost:5173';

function getElectronPath() {
  const electronDir = path.join(playerDir, 'node_modules', 'electron');
  const pathFile = path.join(electronDir, 'path.txt');
  if (fs.existsSync(pathFile)) {
    return path.join(electronDir, 'dist', fs.readFileSync(pathFile, 'utf-8').trim());
  }
  const realDir = fs.realpathSync(electronDir);
  const realPathFile = path.join(realDir, 'path.txt');
  if (fs.existsSync(realPathFile)) {
    return path.join(realDir, 'dist', fs.readFileSync(realPathFile, 'utf-8').trim());
  }
  throw new Error('Electron binary not found.');
}

const electronPath = getElectronPath();
const mainEntry = path.join(playerDir, 'out', 'main', 'index.js');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = 'development';
env.ELECTRON_RENDERER_URL = rendererUrl;
env.NODE_PATH = path.join(playerDir, 'node_modules');

console.log(`Launching player with ${profileArg} → ${rendererUrl}`);

const child = spawn(electronPath, [mainEntry, profileArg], {
  stdio: 'inherit',
  env,
  cwd: playerDir,
});

child.on('exit', (code) => process.exit(code || 0));
