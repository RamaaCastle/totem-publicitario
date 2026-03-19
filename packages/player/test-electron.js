const e = require('electron');
console.log('TYPE:', typeof e);
if (typeof e === 'string') {
  console.log('GOT PATH:', e);
} else {
  console.log('GOT MODULE, app:', typeof e.app);
}
if (e && e.app) {
  e.app.whenReady().then(() => { console.log('READY'); e.app.quit(); });
} else {
  process.exit(0);
}
