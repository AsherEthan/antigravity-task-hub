// scripts/test-ipc-adversarial-edges.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  require('../main.js');
  await new Promise(r => setTimeout(r, 100));

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'test-ipc-preload.js'),
      contextIsolation: true
    }
  });
  await win.loadURL('data:text/html,<html><body>EdgeTest</body></html>');

  const testCases = [
    { channel: 'parse-context-mentions', payload: null, desc: 'parse-context-mentions with null' },
    { channel: 'parse-context-mentions', payload: 12345, desc: 'parse-context-mentions with number' },
    { channel: 'parse-context-mentions', payload: '', desc: 'parse-context-mentions with empty string' },
    { channel: 'parse-context-mentions', payload: true, desc: 'parse-context-mentions with boolean' },
    { channel: 'build-context-envelope', payload: {}, desc: 'build-context-envelope with empty object' },
    { channel: 'build-context-envelope', payload: null, desc: 'build-context-envelope with null' },
    { channel: 'build-context-envelope', payload: { rawPrompt: 12345 }, desc: 'build-context-envelope with number rawPrompt' },
    { channel: 'build-context-envelope', payload: { command: 123 }, desc: 'build-context-envelope with number command' },
    { channel: 'read-clipboard-context', payload: undefined, desc: 'read-clipboard-context with undefined' }
  ];

  console.log('Testing adversarial payloads over Electron IPC:');
  for (const tc of testCases) {
    try {
      const res = await win.webContents.executeJavaScript(`
        window.ipcBridge.invoke(${JSON.stringify(tc.channel)}, ${JSON.stringify(tc.payload)})
      `);
      console.log(`[RESOLVED] ${tc.desc} -> Result:`, typeof res === 'object' && res ? Object.keys(res) : res);
    } catch (err) {
      console.log(`[REJECTED] ${tc.desc} -> Error:`, err.message);
    }
  }

  win.destroy();
  app.exit(0);
});
