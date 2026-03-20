#!/usr/bin/env node
/**
 * Build de producción.
 * Compila backend y admin, ensambla todo en dist/:
 *
 *   dist/
 *   ├── backend/          ← NestJS compilado
 *   │   └── public/       ← Admin panel (Next.js static export)
 *   ├── logs/
 *   └── ecosystem.config.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const backendDest = path.join(distDir, 'backend');

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || root });
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

// ── 1. Limpiar dist/ ─────────────────────────────────────────────────────────
console.log('\n🧹 Limpiando dist/...');
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'logs'), { recursive: true });

// ── 2. Build admin (Next.js static export → packages/admin/out/) ─────────────
console.log('\n📦 Building admin panel...');
run('pnpm --filter admin build');

// ── 3. Build backend (NestJS → packages/backend/dist/) ───────────────────────
console.log('\n📦 Building backend...');
run('pnpm --filter backend build');

// ── 4. Copiar backend compilado ───────────────────────────────────────────────
console.log('\n📂 Copiando backend → dist/backend/...');
copyDir(path.join(root, 'packages/backend/dist'), backendDest);
fs.copyFileSync(
  path.join(root, 'packages/backend/package.json'),
  path.join(backendDest, 'package.json'),
);

// ── 5. Copiar admin (out/) → dist/backend/public/ ────────────────────────────
console.log('\n📂 Copiando admin → dist/backend/public/...');
const adminOut = path.join(root, 'packages/admin/out');
if (!fs.existsSync(adminOut)) {
  console.error('❌ No se encontró packages/admin/out/ — ¿el build de admin falló?');
  process.exit(1);
}
copyDir(adminOut, path.join(backendDest, 'public'));

// ── 6. Copiar ecosystem.config.js ────────────────────────────────────────────
console.log('\n📂 Copiando ecosystem.config.js → dist/...');
fs.copyFileSync(
  path.join(root, 'ecosystem.config.js'),
  path.join(distDir, 'ecosystem.config.js'),
);

console.log('\n✅ Build listo en dist/');
console.log('   dist/backend/         → NestJS API');
console.log('   dist/backend/public/  → Admin Panel (estático)');
console.log('   dist/ecosystem.config.js → PM2');
console.log('\nEn el servidor:');
console.log('   cd dist/backend && npm install --omit=dev');
console.log('   cd .. && pm2 start ecosystem.config.js --env production');
