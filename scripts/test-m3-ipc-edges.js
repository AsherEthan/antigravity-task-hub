// scripts/test-m3-ipc-edges.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  require('../main.js');
  await new Promise(r => setTimeout(r, 200));

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true
    }
  });
  await win.loadURL('data:text/html,<html><body>EdgeM3Test</body></html>');

  console.log('Testing M3 IPC edge cases via sidebarAPI in preload:');

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const log = [];
      const api = window.sidebarAPI;

      // 1. locateArtifact with empty payload
      const r1 = await api.locateArtifact({});
      log.push({ test: 'locateArtifact({})', res: r1 });

      // 2. locateArtifact with non-existent artifactId
      const r2 = await api.locateArtifact({ artifactId: 'non_existent_123' });
      log.push({ test: 'locateArtifact(non_existent)', res: r2 });

      // 3. locateArtifact with non-existent filePath
      const r3 = await api.locateArtifact({ filePath: 'C:/totally/non/existent/path.md' });
      log.push({ test: 'locateArtifact(bad_path)', res: r3 });

      // 4. openArtifact with empty payload
      const r4 = await api.openArtifact({});
      log.push({ test: 'openArtifact({})', res: r4 });

      // 5. openArtifact with non-existent artifactId
      const r5 = await api.openArtifact({ artifactId: 'non_existent_123' });
      log.push({ test: 'openArtifact(non_existent)', res: r5 });

      // 6. showItemInFolder with null / empty / bad path
      const r6 = await api.showItemInFolder('');
      log.push({ test: 'showItemInFolder("")', res: r6 });

      const r7 = await api.showItemInFolder('bad/path/not/exist');
      log.push({ test: 'showItemInFolder(bad)', res: r7 });

      // 7. openPath with empty / bad path
      const r8 = await api.openPath('');
      log.push({ test: 'openPath("")', res: r8 });

      const r9 = await api.openPath('bad/path/not/exist');
      log.push({ test: 'openPath(bad)', res: r9 });

      return log;
    })()
  `);

  let allPassed = true;
  for (const item of results) {
    console.log(`  Case: ${item.test} -> `, item.res);
    if (item.res && item.res.success === false) {
      // Expected failure handled gracefully with success: false
    } else {
      console.error(`Unexpected result for ${item.test}:`, item.res);
      allPassed = false;
    }
  }

  win.destroy();
  if (allPassed) {
    console.log('\n✓ ALL M3 IPC EDGE CASES RETURNED CONTROLLED GRACEFUL ERROR RESPONSES (NO UNCAUGHT ERRORS)');
    app.exit(0);
  } else {
    console.error('\n✗ SOME EDGE CASES DID NOT BEHAVE AS EXPECTED');
    app.exit(1);
  }
});
