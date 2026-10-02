// scripts/test-auditor-m4-forensics.js
// Independent forensic verification script for Milestone M4
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

async function runForensics() {
  console.log('Starting M4 Forensic Integrity Audit...');
  const failures = [];

  // Check 1: Static Code Inspection for Hardcoded Test Fixtures
  console.log('Check 1: Static code inspection for test fixtures...');
  const sidebarJsPath = path.join(__dirname, '..', 'renderer', 'sidebar.js');
  const sidebarHtmlPath = path.join(__dirname, '..', 'renderer', 'sidebar.html');
  const sidebarCssPath = path.join(__dirname, '..', 'renderer', 'sidebar.css');

  const jsContent = fs.readFileSync(sidebarJsPath, 'utf8');
  const htmlContent = fs.readFileSync(sidebarHtmlPath, 'utf8');
  const cssContent = fs.readFileSync(sidebarCssPath, 'utf8');

  if (jsContent.includes('proj_test_ssot')) {
    failures.push('Found hardcoded fixture "proj_test_ssot" in renderer/sidebar.js');
  }
  if (htmlContent.includes('proj_test_ssot')) {
    failures.push('Found hardcoded fixture "proj_test_ssot" in renderer/sidebar.html');
  }

  // Check 2: Dynamic Execution in Real Headless Window
  console.log('Check 2: Dynamic execution and stress testing in Headless Electron...');
  let warRoomToggledCount = 0;
  ipcMain.on('toggle-war-room', () => {
    warRoomToggledCount++;
  });

  const win = new BrowserWindow({
    width: 400,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(sidebarHtmlPath);

  // Stress-test test cases for updateCausalBreadcrumbs across all 5 phases and arbitrary clarity
  const testScenarios = [
    { phase: 0, phaseName: '现象', clarity: 15, expectedActiveIndex: 0, expectedActiveText: '现象', expectedCompletedCount: 0 },
    { phase: 1, phaseName: '疑问', clarity: 35, expectedActiveIndex: 1, expectedActiveText: '疑问', expectedCompletedCount: 1 },
    { phase: 2, phaseName: '假说', clarity: 50, expectedActiveIndex: 2, expectedActiveText: '假说', expectedCompletedCount: 2 },
    { phase: 3, phaseName: '证据', clarity: 80, expectedActiveIndex: 3, expectedActiveText: '证据', expectedCompletedCount: 3 },
    { phase: 4, phaseName: '突破', clarity: 100, expectedActiveIndex: 4, expectedActiveText: '突破', expectedCompletedCount: 4 },
    // String representations
    { phase: '1', phaseName: null, clarity: 42, expectedActiveIndex: 1, expectedActiveText: '疑问', expectedCompletedCount: 1 },
    { phase: null, phaseName: '证据', clarity: 88, expectedActiveIndex: 3, expectedActiveText: '证据', expectedCompletedCount: 3 },
    // Out of bounds clamping
    { phase: 99, phaseName: null, clarity: 99, expectedActiveIndex: 4, expectedActiveText: '突破', expectedCompletedCount: 4 },
    { phase: -5, phaseName: null, clarity: 5, expectedActiveIndex: 0, expectedActiveText: '现象', expectedCompletedCount: 0 }
  ];

  for (let i = 0; i < testScenarios.length; i++) {
    const sc = testScenarios[i];
    const updatePayload = {
      activeProjectId: `proj_dynamic_audit_${i}`,
      causalPhase: sc.phase,
      causalPhaseName: sc.phaseName,
      deltaQt: sc.clarity
    };

    win.webContents.send('state-updated', updatePayload);
    await new Promise(r => setTimeout(r, 60));

    const result = await win.webContents.executeJavaScript(`
      (() => {
        const container = document.getElementById('causalBreadcrumbs') || document.querySelector('.causal-breadcrumbs');
        if (!container) return { error: 'No container' };

        const nodes = Array.from(container.querySelectorAll('.crumb-item, .phase-node, .breadcrumb-stage'));
        const activeNode = container.querySelector('.active, [data-active="true"], .current-phase');
        const activeIndex = nodes.indexOf(activeNode);
        const completedNodes = Array.from(container.querySelectorAll('.completed'));
        const clarityBadge = container.querySelector('.clarity-badge, .delta-qt, .clarity-score');

        return {
          containerWidth: container.offsetWidth,
          containerScrollWidth: container.scrollWidth,
          activeIndex,
          activeText: activeNode ? activeNode.innerText.trim() : null,
          completedCount: completedNodes.length,
          clarityText: clarityBadge ? clarityBadge.innerText.trim() : null
        };
      })()
    `);

    if (result.activeIndex !== sc.expectedActiveIndex) {
      failures.push(`Scenario ${i} (${sc.phase}, ${sc.phaseName}): expected active index ${sc.expectedActiveIndex}, got ${result.activeIndex}`);
    }
    if (!result.activeText || !result.activeText.includes(sc.expectedActiveText)) {
      failures.push(`Scenario ${i}: expected active text "${sc.expectedActiveText}", got "${result.activeText}"`);
    }
    if (result.completedCount !== sc.expectedCompletedCount) {
      failures.push(`Scenario ${i}: expected completed count ${sc.expectedCompletedCount}, got ${result.completedCount}`);
    }
    if (!result.clarityText || !result.clarityText.includes(`${sc.clarity}%`)) {
      failures.push(`Scenario ${i}: expected clarity "ΔQt: ${sc.clarity}%", got "${result.clarityText}"`);
    }
    if (result.containerScrollWidth > result.containerWidth + 5) {
      failures.push(`Scenario ${i}: horizontal overflow detected! width=${result.containerWidth}, scrollWidth=${result.containerScrollWidth}`);
    }
  }

  // Check 3: Real IPC War Room button trigger
  console.log('Check 3: Testing Real IPC toggle-war-room invocation...');
  const clicked = await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.getElementById('btnToggleWarRoom');
      if (!btn) return false;
      btn.click();
      return true;
    })()
  `);
  if (!clicked) {
    failures.push('btnToggleWarRoom element not found or not clickable');
  }
  await new Promise(r => setTimeout(r, 60));
  if (warRoomToggledCount < 1) {
    failures.push('Clicking btnToggleWarRoom did not trigger toggle-war-room IPC in main process');
  }

  win.destroy();

  console.log('====================================');
  if (failures.length === 0) {
    console.log('FORENSIC AUDIT RESULT: CLEAN');
    console.log('All empirical forensic checks PASSED.');
    app.exit(0);
  } else {
    console.error('FORENSIC AUDIT RESULT: INTEGRITY VIOLATION');
    failures.forEach(f => console.error('  - ' + f));
    app.exit(1);
  }
}

app.whenReady().then(runForensics).catch(err => {
  console.error('Fatal audit script error:', err);
  process.exit(1);
});
